import { GoogleGenAI } from "@google/genai";
import { db } from "../db";
import {
  closingDocuments, closingDocumentVersions, deals, dealTerms, firmFormTemplates,
} from "@shared/schema";
import { eq, and, desc, sql, isNull } from "drizzle-orm";

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

export const REQUIRES_NOTARIZATION = new Set([
  "deed",
  "mortgage",
  "title_affidavit",
  "sellers_affidavit",
  "promissory_note",
  "transfer_tax_declaration",
]);

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

async function findFirmFormTemplate(docType: string, dealType?: string | null): Promise<string | null> {
  try {
    let firmTemplates;
    if (dealType) {
      firmTemplates = await db.select({
        content: firmFormTemplates.content,
        name: firmFormTemplates.name,
        isDefault: firmFormTemplates.isDefault,
      })
        .from(firmFormTemplates)
        .where(and(
          eq(firmFormTemplates.documentType, docType),
          eq(firmFormTemplates.dealType, dealType)
        ))
        .orderBy(desc(firmFormTemplates.isDefault), desc(firmFormTemplates.updatedAt))
        .limit(1);
    }

    if (!firmTemplates || firmTemplates.length === 0) {
      firmTemplates = await db.select({
        content: firmFormTemplates.content,
        name: firmFormTemplates.name,
        isDefault: firmFormTemplates.isDefault,
      })
        .from(firmFormTemplates)
        .where(and(
          eq(firmFormTemplates.documentType, docType),
          isNull(firmFormTemplates.dealType)
        ))
        .orderBy(desc(firmFormTemplates.isDefault), desc(firmFormTemplates.updatedAt))
        .limit(1);
    }

    if (firmTemplates.length > 0 && firmTemplates[0].content && firmTemplates[0].content.trim().length > 50) {
      console.log(`[ClosingDocs] Using firm preferred template "${firmTemplates[0].name}" for ${docType}`);
      return firmTemplates[0].content;
    }
  } catch (err: any) {
    console.log(`[ClosingDocs] Could not search firm templates: ${err.message}`);
  }
  return null;
}

async function findExistingTemplate(docType: string, dealType?: string | null): Promise<string | null> {
  const firmTemplate = await findFirmFormTemplate(docType, dealType);
  if (firmTemplate) return firmTemplate;

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

      const existingTemplate = await findExistingTemplate(docType, deal.dealType);
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
        changeDescription: existingTemplate ? "Generated using firm preferred template" : "Initial AI-generated draft",
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

export function buildTermsContext(deal: any, terms: any): string {
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

export async function generateDocumentContent(
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

  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, LevelFormat, convertInchesToTwip, TabStopPosition, TabStopType, BorderStyle, NumberFormat, Footer, PageNumber } = await import("docx");

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
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 0, after: 0 },
              children: [
                new TextRun({
                  children: [
                    doc.title || "Closing Document",
                    "  |  Page ",
                    PageNumber.CURRENT,
                    " of ",
                    PageNumber.TOTAL_PAGES,
                  ],
                  font: FONT,
                  size: 16,
                  color: "999999",
                }),
              ],
            }),
          ],
        }),
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

export async function exportDocumentToPdf(docId: string, includeSignature = true): Promise<Buffer> {
  const [doc] = await db.select().from(closingDocuments).where(eq(closingDocuments.id, docId));
  if (!doc) throw new Error("Document not found");

  const PDFDocument = (await import("pdfkit")).default;
  const { format } = await import("date-fns");

  const pdfDoc = new PDFDocument({
    size: "LETTER",
    margins: { top: 60, bottom: 60, left: 60, right: 60 },
    bufferPages: true,
    info: {
      Title: doc.title,
      Author: "Sentinel Counsel LLP",
      Subject: doc.title,
    },
  });

  const chunks: Buffer[] = [];
  pdfDoc.on("data", (chunk: Buffer) => chunks.push(chunk));

  const FONT = "Times-Roman";
  const FONT_BOLD = "Times-Bold";
  const FONT_ITALIC = "Times-Italic";
  const BODY_SIZE = 11;
  const H1_SIZE = 16;
  const H2_SIZE = 14;
  const H3_SIZE = 12;
  const pageWidth = pdfDoc.page.width - 120;

  pdfDoc.fontSize(H1_SIZE).font(FONT_BOLD).text(doc.title.toUpperCase(), { align: "center" });
  pdfDoc.moveDown(0.5);
  pdfDoc.fontSize(8).font(FONT).fillColor("#666666").text(`Document Type: ${DOCUMENT_DISPLAY_NAMES[doc.documentType] || doc.documentType}`, { align: "center" });
  pdfDoc.fillColor("#000000");
  pdfDoc.moveDown(0.3);
  pdfDoc.moveTo(60, pdfDoc.y).lineTo(pdfDoc.page.width - 60, pdfDoc.y).strokeColor("#cccccc").lineWidth(0.5).stroke();
  pdfDoc.moveDown(1);

  const content = doc.content || "";

  interface TextSegment {
    text: string;
    bold: boolean;
    italic: boolean;
  }

  function decodeEntities(text: string): string {
    return text
      .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
      .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)));
  }

  function extractInlineSegments(html: string): TextSegment[] {
    const segments: TextSegment[] = [];
    let bold = false;
    let italic = false;
    const tokenRegex = /<(\/?)(\w+)[^>]*>|([^<]+)/g;
    let m;
    while ((m = tokenRegex.exec(html)) !== null) {
      if (m[3]) {
        const decoded = decodeEntities(m[3]);
        if (decoded.trim() || decoded.includes(" ")) {
          segments.push({ text: decoded, bold, italic });
        }
      } else {
        const isClose = m[1] === "/";
        const t = m[2].toLowerCase();
        if (t === "strong" || t === "b") bold = !isClose;
        if (t === "em" || t === "i") italic = !isClose;
        if (t === "br" && !isClose) segments.push({ text: "\n", bold: false, italic: false });
      }
    }
    return segments;
  }

  function renderSegments(segments: TextSegment[], opts: { width: number; lineGap?: number; indent?: number }) {
    if (segments.length === 0) return;
    const last = segments.length - 1;
    for (let i = 0; i <= last; i++) {
      const seg = segments[i];
      if (seg.text === "\n") {
        pdfDoc.text("", { width: opts.width, continued: false });
        continue;
      }
      let font = FONT;
      if (seg.bold && seg.italic) font = FONT_BOLD;
      else if (seg.bold) font = FONT_BOLD;
      else if (seg.italic) font = FONT_ITALIC;
      pdfDoc.font(font);
      const isLast = i === last;
      const textOpts: any = { width: opts.width, continued: !isLast, lineGap: opts.lineGap || 2 };
      if (i === 0 && opts.indent) textOpts.indent = opts.indent;
      pdfDoc.text(seg.text, textOpts);
    }
  }

  function extractBlockInnerHtml(html: string, tag: string): string {
    const openRegex = new RegExp(`<${tag}[^>]*>`, "i");
    const closeTag = `</${tag}>`;
    const openMatch = openRegex.exec(html);
    if (!openMatch) return html;
    const afterOpen = html.substring(openMatch.index + openMatch[0].length);
    const closeIdx = afterOpen.toLowerCase().indexOf(closeTag.toLowerCase());
    if (closeIdx === -1) return afterOpen;
    return afterOpen.substring(0, closeIdx);
  }

  function renderHtmlBlockToPdf(html: string) {
    const blockRegex = /<(h[1-3]|p|ul|ol|li|hr|br|div|blockquote|table|tr|td|th|thead|tbody)([^>]*)>([\s\S]*?)<\/\1>|<(hr|br)\s*\/?>|([^<]+)/gi;
    let blockMatch;
    let olCounter = 0;

    while ((blockMatch = blockRegex.exec(html)) !== null) {
      if (pdfDoc.y > pdfDoc.page.height - 80) pdfDoc.addPage();

      if (blockMatch[5]) {
        const raw = decodeEntities(blockMatch[5]).trim();
        if (raw) {
          pdfDoc.fontSize(BODY_SIZE).font(FONT).text(raw, { width: pageWidth, lineGap: 2 });
        }
        continue;
      }

      if (blockMatch[4]) {
        const selfTag = blockMatch[4].toLowerCase();
        if (selfTag === "hr") {
          pdfDoc.moveDown(0.3);
          pdfDoc.moveTo(60, pdfDoc.y).lineTo(pdfDoc.page.width - 60, pdfDoc.y).strokeColor("#cccccc").lineWidth(0.5).stroke();
          pdfDoc.moveDown(0.3);
        } else if (selfTag === "br") {
          pdfDoc.moveDown(0.2);
        }
        continue;
      }

      const blockTag = blockMatch[1].toLowerCase();
      const innerContent = blockMatch[3] || "";

      switch (blockTag) {
        case "h1":
          pdfDoc.moveDown(0.5);
          pdfDoc.fontSize(H1_SIZE).font(FONT_BOLD);
          renderSegments(extractInlineSegments(innerContent), { width: pageWidth });
          pdfDoc.fontSize(BODY_SIZE).font(FONT);
          pdfDoc.moveDown(0.4);
          break;
        case "h2":
          pdfDoc.moveDown(0.5);
          pdfDoc.fontSize(H2_SIZE).font(FONT_BOLD);
          renderSegments(extractInlineSegments(innerContent), { width: pageWidth });
          pdfDoc.fontSize(BODY_SIZE).font(FONT);
          pdfDoc.moveDown(0.3);
          break;
        case "h3":
          pdfDoc.moveDown(0.3);
          pdfDoc.fontSize(H3_SIZE).font(FONT_BOLD);
          renderSegments(extractInlineSegments(innerContent), { width: pageWidth });
          pdfDoc.fontSize(BODY_SIZE).font(FONT);
          pdfDoc.moveDown(0.2);
          break;
        case "p":
        case "div":
        case "blockquote":
          pdfDoc.fontSize(BODY_SIZE).font(FONT);
          renderSegments(extractInlineSegments(innerContent), { width: pageWidth, lineGap: 2 });
          pdfDoc.moveDown(0.3);
          break;
        case "ul": {
          const liMatches = innerContent.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
          for (const liHtml of liMatches) {
            if (pdfDoc.y > pdfDoc.page.height - 80) pdfDoc.addPage();
            const liInner = extractBlockInnerHtml(liHtml, "li");
            pdfDoc.fontSize(BODY_SIZE).font(FONT);
            const segments = extractInlineSegments(liInner);
            segments.unshift({ text: "\u2022  ", bold: false, italic: false });
            renderSegments(segments, { width: pageWidth - 20, indent: 20 });
            pdfDoc.moveDown(0.1);
          }
          pdfDoc.moveDown(0.2);
          break;
        }
        case "ol": {
          olCounter = 0;
          const liMatches = innerContent.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
          for (const liHtml of liMatches) {
            if (pdfDoc.y > pdfDoc.page.height - 80) pdfDoc.addPage();
            olCounter++;
            const liInner = extractBlockInnerHtml(liHtml, "li");
            pdfDoc.fontSize(BODY_SIZE).font(FONT);
            const segments = extractInlineSegments(liInner);
            segments.unshift({ text: `${olCounter}. `, bold: false, italic: false });
            renderSegments(segments, { width: pageWidth - 20, indent: 20 });
            pdfDoc.moveDown(0.1);
          }
          pdfDoc.moveDown(0.2);
          break;
        }
        case "li": {
          pdfDoc.fontSize(BODY_SIZE).font(FONT);
          const segments = extractInlineSegments(innerContent);
          segments.unshift({ text: "\u2022  ", bold: false, italic: false });
          renderSegments(segments, { width: pageWidth - 20, indent: 20 });
          pdfDoc.moveDown(0.1);
          break;
        }
        case "table":
        case "tr":
        case "td":
        case "th":
        case "thead":
        case "tbody": {
          const tableText = decodeEntities(innerContent.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
          if (tableText) {
            pdfDoc.fontSize(BODY_SIZE).font(FONT).text(tableText, { width: pageWidth, lineGap: 2 });
            pdfDoc.moveDown(0.2);
          }
          break;
        }
      }
    }
  }

  if (content.trim().startsWith("<")) {
    renderHtmlBlockToPdf(content);
  } else {
    const textContent = stripHtmlToText(content);
    const lines = textContent.split("\n");
    for (const line of lines) {
      if (!line.trim()) { pdfDoc.moveDown(0.3); continue; }
      if (pdfDoc.y > pdfDoc.page.height - 80) { pdfDoc.addPage(); }
      const trimmed = line.trim();
      if (trimmed.startsWith("ARTICLE ") || trimmed.startsWith("Article ") || /^[IVX]+\./.test(trimmed)) {
        pdfDoc.moveDown(0.5);
        pdfDoc.fontSize(H2_SIZE).font(FONT_BOLD).text(trimmed, { width: pageWidth });
        pdfDoc.moveDown(0.3);
      } else if (/^Section \d/.test(trimmed) || /^\d+\.\d+/.test(trimmed)) {
        pdfDoc.moveDown(0.3);
        pdfDoc.fontSize(H3_SIZE).font(FONT_BOLD).text(trimmed, { width: pageWidth });
        pdfDoc.moveDown(0.2);
      } else if (trimmed === "---") {
        pdfDoc.moveDown(0.3);
        pdfDoc.moveTo(60, pdfDoc.y).lineTo(pdfDoc.page.width - 60, pdfDoc.y).strokeColor("#cccccc").lineWidth(0.5).stroke();
        pdfDoc.moveDown(0.3);
      } else {
        pdfDoc.fontSize(BODY_SIZE).font(FONT).text(trimmed, { width: pageWidth, lineGap: 2 });
      }
    }
  }

  if (includeSignature && doc.signatureImage && doc.signedAt) {
    if (pdfDoc.y > pdfDoc.page.height - 200) {
      pdfDoc.addPage();
    }
    pdfDoc.moveDown(2);
    pdfDoc.moveTo(60, pdfDoc.y).lineTo(pdfDoc.page.width - 60, pdfDoc.y).strokeColor("#cccccc").lineWidth(0.5).stroke();
    pdfDoc.moveDown(1);
    pdfDoc.fontSize(H3_SIZE).font(FONT_BOLD).text("SIGNATURE", { width: pageWidth });
    pdfDoc.moveDown(0.5);

    try {
      const sigData = doc.signatureImage.replace(/^data:image\/\w+;base64,/, "");
      const sigBuffer = Buffer.from(sigData, "base64");
      pdfDoc.image(sigBuffer, 60, pdfDoc.y, { width: 200, height: 75 });
      pdfDoc.y += 80;
    } catch (e) {
      pdfDoc.fontSize(BODY_SIZE).font(FONT_ITALIC).text("[Signature on file]", { width: pageWidth });
    }

    pdfDoc.moveTo(60, pdfDoc.y).lineTo(260, pdfDoc.y).strokeColor("#000000").lineWidth(0.5).stroke();
    pdfDoc.moveDown(0.3);
    if (doc.signedBy) {
      pdfDoc.fontSize(BODY_SIZE).font(FONT).text(doc.signedBy, { width: pageWidth });
    }
    pdfDoc.fontSize(9).font(FONT).fillColor("#666666").text(`Signed electronically on ${format(new Date(doc.signedAt), "MMMM d, yyyy 'at' h:mm a")}`, { width: pageWidth });
    pdfDoc.fillColor("#000000");
  } else if (!doc.signatureImage) {
    if (pdfDoc.y > pdfDoc.page.height - 200) {
      pdfDoc.addPage();
    }
    pdfDoc.moveDown(3);
    pdfDoc.fontSize(H3_SIZE).font(FONT_BOLD).text("SIGNATURE", { width: pageWidth });
    pdfDoc.moveDown(2);
    pdfDoc.moveTo(60, pdfDoc.y).lineTo(260, pdfDoc.y).strokeColor("#000000").lineWidth(0.5).stroke();
    pdfDoc.moveDown(0.3);
    pdfDoc.fontSize(BODY_SIZE).font(FONT).text("Name: ___________________________________", { width: pageWidth });
    pdfDoc.moveDown(0.5);
    pdfDoc.text("Date: ___________________________________", { width: pageWidth });
  }

  pdfDoc.moveDown(2);
  pdfDoc.fontSize(7).font(FONT).fillColor("#999999").text(`Generated by Sentinel Counsel LLP on ${format(new Date(), "MM/dd/yyyy")}`, { align: "center", width: pageWidth });
  pdfDoc.fillColor("#000000");

  const pageRange = pdfDoc.bufferedPageRange();
  const totalPages = pageRange.count;
  for (let i = pageRange.start; i < pageRange.start + totalPages; i++) {
    pdfDoc.switchToPage(i);
    pdfDoc.fontSize(7).font(FONT).fillColor("#999999")
      .text(`Page ${i - pageRange.start + 1} of ${totalPages}`, 60, pdfDoc.page.height - 40, { align: "center", width: pageWidth });
  }
  pdfDoc.fillColor("#000000");

  pdfDoc.end();

  return new Promise((resolve, reject) => {
    pdfDoc.on("end", () => resolve(Buffer.concat(chunks)));
    pdfDoc.on("error", reject);
  });
}

export async function signDocument(
  docId: string,
  signatureImage: string,
  signerName: string,
  userId?: string
): Promise<any> {
  const [doc] = await db.select().from(closingDocuments).where(eq(closingDocuments.id, docId));
  if (!doc) throw new Error("Document not found");

  if (doc.status === "executed" && doc.signatureImage) {
    throw new Error("Document has already been signed");
  }

  const now = new Date();
  const newVersion = doc.currentVersion + 1;

  await db.insert(closingDocumentVersions).values({
    closingDocumentId: docId,
    versionNumber: newVersion,
    content: doc.content,
    changeDescription: `Document signed by ${signerName}`,
    changedBy: userId,
    source: "manual_edit",
  });

  const [updated] = await db.update(closingDocuments)
    .set({
      signatureImage,
      signedAt: now,
      signedBy: signerName,
      status: "executed",
      currentVersion: newVersion,
      updatedAt: now,
    })
    .where(eq(closingDocuments.id, docId))
    .returning();

  return updated;
}
