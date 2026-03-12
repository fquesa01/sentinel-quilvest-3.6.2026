import { GoogleGenAI } from "@google/genai";
import { db } from "../db";
import {
  closingDocuments, closingDocumentVersions, deals, dealTerms,
} from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || "" });

const DOCUMENT_TEMPLATES_BY_TYPE: Record<string, { types: string[]; forRole?: string }[]> = {
  real_estate: [
    { types: ["closing_disclosure", "deed", "bill_of_sale", "settlement_statement", "title_affidavit", "transfer_tax_declaration"] },
    { types: ["buyers_closing_certificate"], forRole: "buyer" },
    { types: ["sellers_closing_certificate", "sellers_affidavit"], forRole: "seller" },
  ],
  residential_financed: [
    { types: ["closing_disclosure", "deed", "promissory_note", "mortgage", "title_affidavit", "transfer_tax_declaration"] },
    { types: ["buyers_closing_certificate"], forRole: "buyer" },
    { types: ["sellers_closing_certificate"], forRole: "seller" },
  ],
  residential_cash: [
    { types: ["closing_disclosure", "deed", "bill_of_sale", "settlement_statement", "title_affidavit"] },
    { types: ["buyers_closing_certificate"], forRole: "buyer" },
    { types: ["sellers_closing_certificate"], forRole: "seller" },
  ],
  debt: [
    { types: ["promissory_note", "mortgage", "security_agreement", "ucc_financing_statement", "loan_agreement", "guaranty_agreement"] },
    { types: ["borrowers_certificate"], forRole: "borrower" },
    { types: ["lenders_closing_certificate"], forRole: "lender" },
  ],
  investment: [
    { types: ["subscription_agreement", "investor_rights_agreement", "stock_purchase_agreement", "board_resolution", "officers_certificate"] },
  ],
  equity: [
    { types: ["subscription_agreement", "investor_rights_agreement", "stock_purchase_agreement", "board_resolution", "officers_certificate"] },
  ],
};

export const DOCUMENT_DISPLAY_NAMES: Record<string, string> = {
  closing_disclosure: "Closing Disclosure (HUD-1)",
  deed: "Warranty Deed",
  bill_of_sale: "Bill of Sale",
  settlement_statement: "Settlement Statement (ALTA)",
  title_affidavit: "Title Affidavit",
  transfer_tax_declaration: "Transfer Tax Declaration",
  buyers_closing_certificate: "Buyer's Closing Certificate",
  sellers_closing_certificate: "Seller's Closing Certificate",
  sellers_affidavit: "Seller's Affidavit",
  promissory_note: "Promissory Note",
  mortgage: "Mortgage / Deed of Trust",
  security_agreement: "Security Agreement",
  ucc_financing_statement: "UCC-1 Financing Statement",
  loan_agreement: "Loan Agreement",
  guaranty_agreement: "Guaranty Agreement",
  borrowers_certificate: "Borrower's Certificate",
  lenders_closing_certificate: "Lender's Closing Certificate",
  subscription_agreement: "Subscription Agreement",
  investor_rights_agreement: "Investor Rights Agreement",
  stock_purchase_agreement: "Stock / Unit Purchase Agreement",
  board_resolution: "Board Resolution",
  officers_certificate: "Officer's Certificate",
};

export function getDocumentTypesForDeal(dealType: string, role?: string): string[] {
  const normalizedType = dealType?.replace(/-/g, "_") || "real_estate";
  const configs = DOCUMENT_TEMPLATES_BY_TYPE[normalizedType] || DOCUMENT_TEMPLATES_BY_TYPE["real_estate"];
  const types: string[] = [];
  for (const config of configs) {
    if (!config.forRole || config.forRole === role) {
      types.push(...config.types);
    }
  }
  return types;
}

function markdownToHtml(md: string): string {
  if (!md) return "";
  if (md.trim().startsWith("<")) return md;
  let html = md
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/^---$/gm, "<hr>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");

  const lines = html.split("\n");
  const result: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("<h") || trimmed.startsWith("<hr")) {
      result.push(trimmed);
    } else {
      result.push(`<p>${trimmed}</p>`);
    }
  }
  return result.join("\n");
}

async function findExistingTemplate(docType: string): Promise<string | null> {
  try {
    const existing = await db.select({
      content: closingDocuments.content,
      status: closingDocuments.status,
      updatedAt: closingDocuments.updatedAt,
    })
      .from(closingDocuments)
      .where(eq(closingDocuments.documentType, docType))
      .orderBy(
        desc(sql`CASE WHEN ${closingDocuments.status} = 'executed' THEN 4 WHEN ${closingDocuments.status} = 'approved' THEN 3 WHEN ${closingDocuments.status} = 'review' THEN 2 ELSE 1 END`),
        desc(closingDocuments.updatedAt)
      )
      .limit(1);

    if (existing.length > 0 && existing[0].content && existing[0].content.trim().length > 100) {
      console.log(`[ClosingDocs] Found existing ${docType} template (status: ${existing[0].status}) to use as reference`);
      return existing[0].content;
    }
  } catch (err: any) {
    console.log(`[ClosingDocs] Could not search for existing templates: ${err.message}`);
  }
  return null;
}

export async function autoGenerateClosingDocuments(
  dealId: string,
  userId?: string
): Promise<{ documents: any[]; errors: string[] }> {
  const [deal] = await db.select().from(deals).where(eq(deals.id, dealId));
  if (!deal) throw new Error("Deal not found");

  const [terms] = await db.select().from(dealTerms).where(eq(dealTerms.dealId, dealId));

  const existing = await db.select({ documentType: closingDocuments.documentType })
    .from(closingDocuments)
    .where(eq(closingDocuments.dealId, dealId));
  const existingTypes = new Set(existing.map(d => d.documentType));

  const docTypes = getDocumentTypesForDeal(deal.dealType || "real_estate", deal.representationRole || undefined);
  const toGenerate = docTypes.filter(t => !existingTypes.has(t));

  if (toGenerate.length === 0) {
    return { documents: [], errors: ["All closing documents already generated for this deal."] };
  }

  const termsContext = buildTermsContext(deal, terms);
  const results: any[] = [];
  const errors: string[] = [];

  for (const docType of toGenerate) {
    try {
      const title = DOCUMENT_DISPLAY_NAMES[docType] || docType.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());

      const existingTemplate = await findExistingTemplate(docType);
      const content = await generateDocumentContent(docType, title, termsContext, deal, existingTemplate);

      const [doc] = await db.insert(closingDocuments).values({
        dealId,
        documentType: docType,
        title,
        content,
        status: "draft",
        representationRole: deal.representationRole,
        generatedFromTerms: true,
        currentVersion: 1,
        createdBy: userId,
      }).returning();

      await db.insert(closingDocumentVersions).values({
        closingDocumentId: doc.id,
        versionNumber: 1,
        content,
        changeDescription: existingTemplate ? "Generated from firm template (adapted from prior transaction)" : "Initial AI-generated draft",
        changedBy: userId,
        source: "ai_generated",
      });

      results.push(doc);
      console.log(`[ClosingDocs] Generated "${title}" for deal ${dealId}${existingTemplate ? " (from existing template)" : ""}`);
    } catch (err: any) {
      console.error(`[ClosingDocs] Error generating ${docType}:`, err.message);
      errors.push(`Failed to generate ${DOCUMENT_DISPLAY_NAMES[docType] || docType}: ${err.message}`);
    }
  }

  return { documents: results, errors };
}

function buildTermsContext(deal: any, terms: any): string {
  const parts: string[] = [];
  parts.push(`Deal Title: ${deal.title}`);
  parts.push(`Deal Type: ${deal.dealType || "Not specified"}`);
  parts.push(`Representation Role: ${deal.representationRole || "Not specified"}`);
  if (deal.dealValue) parts.push(`Deal Value: $${Number(deal.dealValue).toLocaleString()}`);
  if (deal.closingTargetDate) parts.push(`Target Closing Date: ${new Date(deal.closingTargetDate).toLocaleDateString()}`);

  if (terms) {
    if (terms.buyerName) parts.push(`Buyer: ${terms.buyerName}`);
    if (terms.buyerEntityType) parts.push(`Buyer Entity Type: ${terms.buyerEntityType}`);
    if (terms.buyerAddress) parts.push(`Buyer Address: ${terms.buyerAddress}`);
    if (terms.buyerStateOfFormation) parts.push(`Buyer State of Formation: ${terms.buyerStateOfFormation}`);
    if (terms.buyerSignerName) parts.push(`Buyer Signer: ${terms.buyerSignerName}, ${terms.buyerSignerTitle || ""}`);
    if (terms.sellerName) parts.push(`Seller: ${terms.sellerName}`);
    if (terms.sellerEntityType) parts.push(`Seller Entity Type: ${terms.sellerEntityType}`);
    if (terms.sellerAddress) parts.push(`Seller Address: ${terms.sellerAddress}`);
    if (terms.sellerStateOfFormation) parts.push(`Seller State of Formation: ${terms.sellerStateOfFormation}`);
    if (terms.sellerSignerName) parts.push(`Seller Signer: ${terms.sellerSignerName}, ${terms.sellerSignerTitle || ""}`);
    if (terms.propertyName) parts.push(`Property: ${terms.propertyName}`);
    if (terms.propertyAddress) parts.push(`Property Address: ${terms.propertyAddress}`);
    if (terms.propertyCity) parts.push(`City: ${terms.propertyCity}`);
    if (terms.propertyState) parts.push(`State: ${terms.propertyState}`);
    if (terms.propertyZip) parts.push(`Zip: ${terms.propertyZip}`);
    if (terms.propertyCounty) parts.push(`County: ${terms.propertyCounty}`);
    if (terms.legalDescription) parts.push(`Legal Description: ${terms.legalDescription}`);
    if (terms.parcelId) parts.push(`Parcel ID: ${terms.parcelId}`);
    if (terms.purchasePrice) parts.push(`Purchase Price: $${Number(terms.purchasePrice).toLocaleString()}`);
    if (terms.initialDeposit) parts.push(`Initial Deposit: $${Number(terms.initialDeposit).toLocaleString()}`);
    if (terms.effectiveDate) parts.push(`Effective Date: ${new Date(terms.effectiveDate).toLocaleDateString()}`);
    if (terms.closingDate) parts.push(`Closing Date: ${new Date(terms.closingDate).toLocaleDateString()}`);
    if (terms.dueDiligencePeriodDays) parts.push(`Due Diligence Period: ${terms.dueDiligencePeriodDays} days`);
    if (terms.escrowAgentName) parts.push(`Escrow Agent: ${terms.escrowAgentName}`);
    if (terms.escrowAgentAddress) parts.push(`Escrow Agent Address: ${terms.escrowAgentAddress}`);
    if (terms.titleInsuranceAmount) parts.push(`Title Insurance Amount: $${Number(terms.titleInsuranceAmount).toLocaleString()}`);
  }

  return parts.join("\n");
}

async function generateDocumentContent(
  docType: string,
  title: string,
  termsContext: string,
  deal: any,
  existingTemplate?: string | null
): Promise<string> {
  let templateSection = "";
  if (existingTemplate) {
    const truncated = existingTemplate.length > 8000 ? existingTemplate.substring(0, 8000) + "\n[... truncated for context ...]" : existingTemplate;
    templateSection = `
REFERENCE TEMPLATE (from a prior transaction at this firm — the user prefers this style and structure):
${truncated}

IMPORTANT: Use the reference template above as your starting point. Preserve its structure, clause ordering, legal language style, and formatting. Adapt it to the current deal's specific terms, names, dates, and amounts shown below. Do NOT generate a completely new document — adapt the template.
`;
  }

  const prompt = `You are a legal document drafting assistant. Generate a complete, professional legal document draft.

DOCUMENT TYPE: ${title}
TRANSACTION TYPE: ${deal.dealType || "Real Estate"}
REPRESENTING: ${deal.representationRole || "Not specified"}
${templateSection}
DEAL INFORMATION:
${termsContext}

INSTRUCTIONS:
1. Generate a complete, properly formatted legal document
2. Use all available deal information to populate specific names, addresses, amounts, and dates
3. Where information is missing, use clear placeholder brackets like [BUYER NAME] or [PROPERTY ADDRESS]
4. Include all standard sections, clauses, and legal language appropriate for this document type
5. Use proper legal numbering (Article I, Section 1.1, etc.)
6. Include signature blocks at the end
7. Include standard legal boilerplate (governing law, severability, notices, etc.)
8. Format using clean HTML with proper semantic tags: <h1> for the document title, <h2> for articles/major sections, <h3> for subsections, <p> for paragraphs, <strong> for bold text, <em> for emphasis, <ul>/<ol>/<li> for lists, <hr> for horizontal rules
9. Do NOT use Markdown formatting — output valid HTML only
10. Make the document as complete and production-ready as possible
11. Include appropriate recitals and definitions section
12. Do NOT wrap the output in \`\`\`html code fences — return raw HTML only

Generate the full document now:`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  let text = response.text || `<h1>${title}</h1><p>[Document generation pending - please try again]</p>`;
  text = text.replace(/^```html\s*/i, "").replace(/\s*```$/, "").trim();
  return text;
}

export async function aiEditDocument(
  docId: string,
  instruction: string,
  userId?: string,
  source: "manual_edit" | "voice_edit" = "manual_edit"
): Promise<any> {
  const [doc] = await db.select().from(closingDocuments).where(eq(closingDocuments.id, docId));
  if (!doc) throw new Error("Document not found");

  const prompt = `You are a legal document editor. Below is an existing legal document in HTML format. Apply the user's requested changes and return the COMPLETE updated document with all changes incorporated.

CURRENT DOCUMENT:
${doc.content}

USER'S EDIT INSTRUCTION:
${instruction}

RULES:
1. Return the COMPLETE document with the changes applied, not just the changed parts
2. Preserve all existing HTML formatting (headings, paragraphs, lists, etc.)
3. Only modify what the user explicitly requested
4. If adding new clauses, place them in the appropriate section
5. Maintain professional legal language throughout
6. Output valid HTML only — do NOT use Markdown
7. Do NOT wrap the output in \`\`\`html code fences — return raw HTML only

Return the complete updated document:`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  let newContent = response.text || doc.content;
  newContent = newContent.replace(/^```html\s*/i, "").replace(/\s*```$/, "").trim();
  const newVersion = doc.currentVersion + 1;

  await db.insert(closingDocumentVersions).values({
    closingDocumentId: docId,
    versionNumber: newVersion,
    content: newContent,
    changeDescription: instruction,
    changedBy: userId,
    source,
  });

  const [updated] = await db.update(closingDocuments)
    .set({
      content: newContent,
      currentVersion: newVersion,
      updatedAt: new Date(),
    })
    .where(eq(closingDocuments.id, docId))
    .returning();

  return updated;
}

export async function updateDocumentContent(
  docId: string,
  content: string,
  userId?: string,
  source: "manual_edit" | "uploaded" | "restored" = "manual_edit",
  changeDescription?: string
): Promise<any> {
  const [doc] = await db.select().from(closingDocuments).where(eq(closingDocuments.id, docId));
  if (!doc) throw new Error("Document not found");

  const newVersion = doc.currentVersion + 1;

  await db.insert(closingDocumentVersions).values({
    closingDocumentId: docId,
    versionNumber: newVersion,
    content,
    changeDescription: changeDescription || `${source === "uploaded" ? "Uploaded revision" : source === "restored" ? "Restored from previous version" : "Manual edit"}`,
    changedBy: userId,
    source,
  });

  const [updated] = await db.update(closingDocuments)
    .set({
      content,
      currentVersion: newVersion,
      updatedAt: new Date(),
    })
    .where(eq(closingDocuments.id, docId))
    .returning();

  return updated;
}

export async function getDocumentVersions(docId: string) {
  return db.select()
    .from(closingDocumentVersions)
    .where(eq(closingDocumentVersions.closingDocumentId, docId))
    .orderBy(desc(closingDocumentVersions.versionNumber));
}

function stripHtmlToText(html: string): string {
  return html
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, "$1\n")
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, "$1\n")
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, "$1\n")
    .replace(/<p[^>]*>(.*?)<\/p>/gi, "$1\n")
    .replace(/<li[^>]*>(.*?)<\/li>/gi, "$1\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<hr[^>]*\/?>/gi, "---\n")
    .replace(/<strong>(.*?)<\/strong>/gi, "$1")
    .replace(/<em>(.*?)<\/em>/gi, "$1")
    .replace(/<u>(.*?)<\/u>/gi, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

interface HtmlNode {
  tag: string;
  text: string;
  children: HtmlNode[];
  attrs: Record<string, string>;
}

function parseSimpleHtml(html: string): HtmlNode[] {
  const nodes: HtmlNode[] = [];
  const regex = /<(h[1-3]|p|ul|ol|li|hr|br|strong|em|u)([^>]*)(?:\/>|>([\s\S]*?)<\/\1>)|([^<]+)/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    if (match[4]) {
      const text = match[4].trim();
      if (text) nodes.push({ tag: "text", text, children: [], attrs: {} });
    } else if (match[1]) {
      nodes.push({
        tag: match[1].toLowerCase(),
        text: match[3] || "",
        children: [],
        attrs: {},
      });
    }
  }
  return nodes;
}

export async function exportDocumentToDocx(docId: string): Promise<Buffer> {
  const [doc] = await db.select().from(closingDocuments).where(eq(closingDocuments.id, docId));
  if (!doc) throw new Error("Document not found");

  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, LevelFormat, convertInchesToTwip, TabStopPosition, TabStopType, BorderStyle, NumberFormat } = await import("docx");

  const content = doc.content || "";
  const isHtml = content.trim().startsWith("<");

  const FONT = "Times New Roman";
  const BODY_SIZE = 24;
  const H1_SIZE = 32;
  const H2_SIZE = 28;
  const H3_SIZE = 26;

  function extractAlignment(tagStr: string, AlignType: any): any | undefined {
    const styleMatch = tagStr.match(/style="([^"]*)"/i);
    if (!styleMatch) return undefined;
    const alignMatch = styleMatch[1].match(/text-align:\s*(left|center|right|justify)/i);
    if (!alignMatch) return undefined;
    const map: Record<string, any> = {
      left: AlignType.LEFT,
      center: AlignType.CENTER,
      right: AlignType.RIGHT,
      justify: AlignType.JUSTIFIED,
    };
    return map[alignMatch[1].toLowerCase()];
  }

  function buildRuns(html: string, defaults: { size?: number; bold?: boolean; italics?: boolean; underline?: boolean; font?: string } = {}): any[] {
    const runs: any[] = [];
    const baseFont = defaults.font || FONT;
    const baseSize = defaults.size || BODY_SIZE;

    function processSegment(segment: string, inherited: { bold?: boolean; italics?: boolean; underline?: boolean }) {
      const regex = /<(strong|b|em|i|u)>([\s\S]*?)<\/\1>|([^<]+)/gi;
      let m;
      while ((m = regex.exec(segment)) !== null) {
        if (m[3]) {
          const text = decodeHtmlEntities(m[3]);
          if (text.trim() || text.includes(" ")) {
            runs.push(new TextRun({
              text,
              font: baseFont,
              size: baseSize,
              bold: inherited.bold || defaults.bold,
              italics: inherited.italics || defaults.italics,
              underline: (inherited.underline || defaults.underline) ? {} : undefined,
            }));
          }
        } else if (m[1] && m[2]) {
          const tag = m[1].toLowerCase();
          const innerHtml = m[2];
          const newInherited = { ...inherited };
          if (tag === "strong" || tag === "b") newInherited.bold = true;
          if (tag === "em" || tag === "i") newInherited.italics = true;
          if (tag === "u") newInherited.underline = true;
          processSegment(innerHtml, newInherited);
        }
      }
    }

    const cleaned = html.replace(/<br\s*\/?>/gi, "\n");
    processSegment(cleaned, {
      bold: defaults.bold,
      italics: defaults.italics,
      underline: defaults.underline,
    });

    if (runs.length === 0) {
      const plainText = stripAllTags(html).trim();
      if (plainText) {
        runs.push(new TextRun({
          text: plainText,
          font: baseFont,
          size: baseSize,
          bold: defaults.bold,
          italics: defaults.italics,
          underline: defaults.underline ? {} : undefined,
        }));
      }
    }
    return runs;
  }

  const paragraphs: any[] = [];

  if (isHtml) {
    const parts = content.split(/(?=<h[1-3][^>]*>)|(?=<p[^>]*>)|(?=<hr[^>]*\/?>)|(?=<ul[^>]*>)|(?=<ol[^>]*>)/gi);

    let listCounter = 0;

    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;

      const h1Match = trimmed.match(/^<h1([^>]*)>([\s\S]*?)<\/h1>/i);
      const h2Match = trimmed.match(/^<h2([^>]*)>([\s\S]*?)<\/h2>/i);
      const h3Match = trimmed.match(/^<h3([^>]*)>([\s\S]*?)<\/h3>/i);
      const pMatch = trimmed.match(/^<p([^>]*)>([\s\S]*?)<\/p>/i);
      const hrMatch = trimmed.match(/^<hr[^>]*\/?>/i);
      const ulMatch = trimmed.match(/^<ul([^>]*)>([\s\S]*?)<\/ul>/i);
      const olMatch = trimmed.match(/^<ol([^>]*)>([\s\S]*?)<\/ol>/i);

      if (h1Match) {
        const align = extractAlignment(h1Match[1], AlignmentType) || AlignmentType.CENTER;
        paragraphs.push(new Paragraph({
          children: buildRuns(h1Match[2], { size: H1_SIZE, bold: true }),
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 480, after: 240 },
          alignment: align,
        }));
      } else if (h2Match) {
        const align = extractAlignment(h2Match[1], AlignmentType);
        paragraphs.push(new Paragraph({
          children: buildRuns(h2Match[2], { size: H2_SIZE, bold: true }),
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 360, after: 120 },
          alignment: align || AlignmentType.LEFT,
        }));
      } else if (h3Match) {
        const align = extractAlignment(h3Match[1], AlignmentType);
        paragraphs.push(new Paragraph({
          children: buildRuns(h3Match[2], { size: H3_SIZE, bold: true }),
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 240, after: 120 },
          alignment: align || AlignmentType.LEFT,
        }));
      } else if (hrMatch) {
        paragraphs.push(new Paragraph({
          text: "",
          spacing: { before: 240, after: 240 },
          border: { bottom: { color: "999999", space: 1, style: "single" as any, size: 4 } },
        }));
      } else if (ulMatch) {
        const items = ulMatch[2].match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
        for (const item of items) {
          const itemContent = item.replace(/<\/?li[^>]*>/gi, "").trim();
          paragraphs.push(new Paragraph({
            children: [
              new TextRun({ text: "\u2022  ", font: FONT, size: BODY_SIZE }),
              ...buildRuns(itemContent),
            ],
            spacing: { after: 80, line: 276 },
            indent: { left: 720, hanging: 360 },
          }));
        }
      } else if (olMatch) {
        const items = olMatch[2].match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
        listCounter = 0;
        for (const item of items) {
          listCounter++;
          const itemContent = item.replace(/<\/?li[^>]*>/gi, "").trim();
          paragraphs.push(new Paragraph({
            children: [
              new TextRun({ text: `${listCounter}.  `, font: FONT, size: BODY_SIZE }),
              ...buildRuns(itemContent),
            ],
            spacing: { after: 80, line: 276 },
            indent: { left: 720, hanging: 360 },
          }));
        }
      } else if (pMatch) {
        const pContent = pMatch[2].trim();
        const align = extractAlignment(pMatch[1], AlignmentType);
        if (!pContent) {
          paragraphs.push(new Paragraph({
            text: "",
            spacing: { before: 120 },
          }));
        } else {
          paragraphs.push(new Paragraph({
            children: buildRuns(pContent),
            spacing: { after: 120, line: 276 },
            alignment: align || AlignmentType.JUSTIFIED,
          }));
        }
      }
    }
  } else {
    const lines = content.split("\n");
    for (const line of lines) {
      if (line.startsWith("### ")) {
        paragraphs.push(new Paragraph({
          children: [new TextRun({ text: line.replace("### ", ""), font: FONT, size: H3_SIZE, bold: true })],
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 240, after: 120 },
        }));
      } else if (line.startsWith("## ")) {
        paragraphs.push(new Paragraph({
          children: [new TextRun({ text: line.replace("## ", ""), font: FONT, size: H2_SIZE, bold: true })],
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 360, after: 120 },
        }));
      } else if (line.startsWith("# ")) {
        paragraphs.push(new Paragraph({
          children: [new TextRun({ text: line.replace("# ", ""), font: FONT, size: H1_SIZE, bold: true })],
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 480, after: 240 },
          alignment: AlignmentType.CENTER,
        }));
      } else if (line.startsWith("---")) {
        paragraphs.push(new Paragraph({
          text: "",
          spacing: { before: 240, after: 240 },
          border: { bottom: { color: "999999", space: 1, style: "single" as any, size: 4 } },
        }));
      } else if (line.trim() === "") {
        paragraphs.push(new Paragraph({ text: "", spacing: { before: 120 } }));
      } else {
        const runs: any[] = [];
        const boldRegex = /\*\*(.*?)\*\*/g;
        let lastIndex = 0;
        let bm;
        while ((bm = boldRegex.exec(line)) !== null) {
          if (bm.index > lastIndex) runs.push(new TextRun({ text: line.slice(lastIndex, bm.index), font: FONT, size: BODY_SIZE }));
          runs.push(new TextRun({ text: bm[1], bold: true, font: FONT, size: BODY_SIZE }));
          lastIndex = bm.index + bm[0].length;
        }
        if (lastIndex < line.length) runs.push(new TextRun({ text: line.slice(lastIndex), font: FONT, size: BODY_SIZE }));
        if (runs.length === 0) runs.push(new TextRun({ text: line, font: FONT, size: BODY_SIZE }));
        paragraphs.push(new Paragraph({ children: runs, spacing: { after: 120, line: 276 }, alignment: AlignmentType.JUSTIFIED }));
      }
    }
  }

  if (paragraphs.length === 0) {
    paragraphs.push(new Paragraph({ children: [new TextRun({ text: "[Empty document]", font: FONT, size: BODY_SIZE })] }));
  }

  const document = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: FONT,
            size: BODY_SIZE,
          },
        },
        heading1: {
          run: {
            font: FONT,
            size: H1_SIZE,
            bold: true,
          },
          paragraph: {
            spacing: { before: 480, after: 240 },
          },
        },
        heading2: {
          run: {
            font: FONT,
            size: H2_SIZE,
            bold: true,
          },
          paragraph: {
            spacing: { before: 360, after: 120 },
          },
        },
        heading3: {
          run: {
            font: FONT,
            size: H3_SIZE,
            bold: true,
          },
          paragraph: {
            spacing: { before: 240, after: 120 },
          },
        },
      },
    },
    sections: [{
      properties: {
        page: {
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      children: paragraphs,
    }],
  });

  const buffer = await Packer.toBuffer(document);
  return buffer as Buffer;
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function stripAllTags(s: string): string {
  return decodeHtmlEntities(s.replace(/<[^>]+>/g, ""));
}

export async function importDocxContent(fileBuffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.convertToHtml({ buffer: fileBuffer });
  return result.value || "";
}

export { markdownToHtml };
