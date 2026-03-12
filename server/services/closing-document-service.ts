import { GoogleGenAI } from "@google/genai";
import { db } from "../db";
import {
  closingDocuments, closingDocumentVersions, deals, dealTerms,
} from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.AI_INTEGRATIONS_GOOGLE_AI_STUDIO_API_KEY || "" });

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

const DOCUMENT_DISPLAY_NAMES: Record<string, string> = {
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

function getDocumentTypesForDeal(dealType: string, role?: string): string[] {
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
      const content = await generateDocumentContent(docType, title, termsContext, deal);

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
        changeDescription: "Initial AI-generated draft",
        changedBy: userId,
        source: "ai_generated",
      });

      results.push(doc);
      console.log(`[ClosingDocs] Generated "${title}" for deal ${dealId}`);
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
  deal: any
): Promise<string> {
  const prompt = `You are a legal document drafting assistant. Generate a complete, professional legal document draft.

DOCUMENT TYPE: ${title}
TRANSACTION TYPE: ${deal.dealType || "Real Estate"}
REPRESENTING: ${deal.representationRole || "Not specified"}

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
8. Format using Markdown with proper headers (# for titles, ## for articles, ### for sections)
9. Make the document as complete and production-ready as possible
10. Include appropriate recitals and definitions section

Generate the full document now:`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  return response.text || `# ${title}\n\n[Document generation pending - please try again]`;
}

export async function aiEditDocument(
  docId: string,
  instruction: string,
  userId?: string,
  source: "manual_edit" | "voice_edit" = "manual_edit"
): Promise<any> {
  const [doc] = await db.select().from(closingDocuments).where(eq(closingDocuments.id, docId));
  if (!doc) throw new Error("Document not found");

  const prompt = `You are a legal document editor. Below is an existing legal document. Apply the user's requested changes and return the COMPLETE updated document with all changes incorporated.

CURRENT DOCUMENT:
${doc.content}

USER'S EDIT INSTRUCTION:
${instruction}

RULES:
1. Return the COMPLETE document with the changes applied, not just the changed parts
2. Preserve all existing formatting (Markdown headers, numbering, etc.)
3. Only modify what the user explicitly requested
4. If adding new clauses, place them in the appropriate section
5. Maintain professional legal language throughout

Return the complete updated document:`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  const newContent = response.text || doc.content;
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

export async function exportDocumentToDocx(docId: string): Promise<Buffer> {
  const [doc] = await db.select().from(closingDocuments).where(eq(closingDocuments.id, docId));
  if (!doc) throw new Error("Document not found");

  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = await import("docx");

  const paragraphs: any[] = [];
  const lines = doc.content.split("\n");

  for (const line of lines) {
    if (line.startsWith("### ")) {
      paragraphs.push(new Paragraph({
        text: line.replace("### ", ""),
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 200, after: 100 },
      }));
    } else if (line.startsWith("## ")) {
      paragraphs.push(new Paragraph({
        text: line.replace("## ", ""),
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 100 },
      }));
    } else if (line.startsWith("# ")) {
      paragraphs.push(new Paragraph({
        text: line.replace("# ", ""),
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
        alignment: AlignmentType.CENTER,
      }));
    } else if (line.startsWith("---")) {
      paragraphs.push(new Paragraph({
        text: "",
        spacing: { before: 200, after: 200 },
        border: { bottom: { color: "000000", space: 1, style: "single" as any, size: 6 } },
      }));
    } else if (line.trim() === "") {
      paragraphs.push(new Paragraph({ text: "", spacing: { before: 100 } }));
    } else {
      const runs: any[] = [];
      const boldRegex = /\*\*(.*?)\*\*/g;
      let lastIndex = 0;
      let match;
      while ((match = boldRegex.exec(line)) !== null) {
        if (match.index > lastIndex) {
          runs.push(new TextRun({ text: line.slice(lastIndex, match.index), size: 24 }));
        }
        runs.push(new TextRun({ text: match[1], bold: true, size: 24 }));
        lastIndex = match.index + match[0].length;
      }
      if (lastIndex < line.length) {
        runs.push(new TextRun({ text: line.slice(lastIndex), size: 24 }));
      }
      if (runs.length === 0) {
        runs.push(new TextRun({ text: line, size: 24 }));
      }
      paragraphs.push(new Paragraph({ children: runs, spacing: { after: 60 } }));
    }
  }

  const document = new Document({
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

export async function importDocxContent(fileBuffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.convertToHtml({ buffer: fileBuffer });
  const html = result.value;
  let markdown = html
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1\n\n")
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1\n\n")
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, "### $1\n\n")
    .replace(/<strong>(.*?)<\/strong>/gi, "**$1**")
    .replace(/<b>(.*?)<\/b>/gi, "**$1**")
    .replace(/<em>(.*?)<\/em>/gi, "*$1*")
    .replace(/<i>(.*?)<\/i>/gi, "*$1*")
    .replace(/<p[^>]*>(.*?)<\/p>/gi, "$1\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>(.*?)<\/li>/gi, "- $1\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n");

  return markdown.trim();
}
