import { GoogleGenAI } from "@google/genai";
import { db } from "../db";
import * as schema from "@shared/schema";
import { eq } from "drizzle-orm";
import { storage } from "../storage";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });

type PartyRole = (typeof schema.closingPartyRoleEnum.enumValues)[number];
type LineItemCategory = (typeof schema.closingLineItemCategoryEnum.enumValues)[number];
type LineItemSide = (typeof schema.closingLineItemSideEnum.enumValues)[number];
type TransactionType = (typeof schema.closingTransactionTypeEnum.enumValues)[number];

const VALID_PARTY_ROLES = new Set<string>(schema.closingPartyRoleEnum.enumValues);

const PARTY_ROLE_MAP: Record<string, PartyRole> = {
  borrower: "buyer",
  settlement_agent: "escrow_agent",
  attorney: "closing_attorney",
  broker: "broker_buyer",
  agent: "broker_buyer",
  notary: "other",
  trustee: "other",
};

const VALID_CATEGORIES = new Set<string>(schema.closingLineItemCategoryEnum.enumValues);

const CATEGORY_MAP: Record<string, LineItemCategory> = {
  deposit: "earnest_money",
  closing_cost: "escrow_fee",
  closing_costs: "escrow_fee",
  title_fee: "title_insurance",
  tax: "transfer_tax",
  proration: "property_tax_proration",
  interest: "prepaid_interest",
  origination: "loan_origination",
  discount: "loan_discount",
  payoff: "payoff_first_mortgage",
  credit: "buyer_credit",
};

const VALID_SIDES = new Set<string>(schema.closingLineItemSideEnum.enumValues);

const VALID_TRANSACTION_TYPES = new Set<string>(schema.closingTransactionTypeEnum.enumValues);

function normalizePartyRole(role: string): PartyRole {
  const lower = role.toLowerCase().replace(/[\s-]/g, "_");
  if (VALID_PARTY_ROLES.has(lower)) return lower as PartyRole;
  if (PARTY_ROLE_MAP[lower]) return PARTY_ROLE_MAP[lower];
  return "other";
}

function normalizeCategory(category: string): LineItemCategory {
  const lower = category.toLowerCase().replace(/[\s-]/g, "_");
  if (VALID_CATEGORIES.has(lower)) return lower as LineItemCategory;
  if (CATEGORY_MAP[lower]) return CATEGORY_MAP[lower];
  return "other";
}

function normalizeSide(side: string): LineItemSide {
  const lower = side.toLowerCase().replace(/[\s-]/g, "_");
  if (VALID_SIDES.has(lower)) return lower as LineItemSide;
  if (lower === "buyer" || lower === "debit") return "buyer_debit";
  if (lower === "seller") return "seller_debit";
  return "use";
}

function normalizeTransactionType(type: string): TransactionType {
  const lower = type.toLowerCase().replace(/[\s-]/g, "_");
  if (VALID_TRANSACTION_TYPES.has(lower)) return lower as TransactionType;
  return "closing_disclosure";
}

interface ExtractedClosingData {
  statementType: string;
  title?: string;
  propertyAddress?: string;
  purchasePrice?: string;
  loanAmount?: string;
  earnestMoney?: string;
  closingDate?: string;
  fileNumber?: string;
  parties: Array<{
    name: string;
    role: string;
    company?: string;
    address?: string;
    phone?: string;
    email?: string;
  }>;
  lineItems: Array<{
    description: string;
    amount: string;
    side: string;
    category?: string;
    hudSection?: string;
    altaCategory?: string;
    cdSection?: string;
    lineNumber?: string;
  }>;
  prorations: Array<{
    itemName: string;
    annualAmount?: string;
    dailyRate?: string;
    method?: string;
    buyerCredit?: string;
    sellerCredit?: string;
  }>;
  payoffs: Array<{
    lender: string;
    lienType?: string;
    accountNumber?: string;
    currentBalance?: string;
    perDiemInterest?: string;
    totalPayoff?: string;
  }>;
}

interface ValidationIssue {
  severity: "error" | "warning" | "info";
  field: string;
  message: string;
  suggestion?: string;
}

interface ExtractionResult {
  success: boolean;
  data?: ExtractedClosingData;
  validation: ValidationIssue[];
  confidence: number;
  rawText?: string;
}

const EXTRACTION_PROMPT = `You are an expert real estate closing document analyzer. Extract structured data from the uploaded closing statement document.

Identify the statement type from these options:
- closing_disclosure (CFPB Closing Disclosure form)
- seller_closing_disclosure
- hud1 (HUD-1 Settlement Statement)
- hud1a (HUD-1A Refinance)
- cash_settlement
- alta_combined, alta_buyer, alta_seller (ALTA Settlement Statements)
- sources_and_uses
- construction_sources_uses
- construction_draw
- cmbs_funding_memo
- capital_stack
- investor_waterfall
- ground_lease_closing
- master_closing
- reit_contribution
- lender_funding
- funds_flow
- portfolio_settlement

Extract ALL of the following into a JSON object:

{
  "statementType": "the detected type from list above",
  "title": "document title if visible",
  "propertyAddress": "full property address",
  "purchasePrice": "numeric string e.g. 500000.00",
  "loanAmount": "numeric string",
  "earnestMoney": "numeric string",
  "closingDate": "YYYY-MM-DD format",
  "fileNumber": "file/case number",
  "parties": [
    {
      "name": "full name",
      "role": "buyer|seller|borrower|lender|title_company|settlement_agent|escrow_agent|attorney|broker",
      "company": "company name if applicable",
      "address": "address if shown",
      "phone": "phone if shown",
      "email": "email if shown"
    }
  ],
  "lineItems": [
    {
      "description": "line item description",
      "amount": "numeric string (always positive)",
      "side": "source|use|buyer_credit|buyer_debit|seller_credit|seller_debit",
      "category": "purchase_price|deposit|loan_amount|closing_cost|title_insurance|recording_fee|transfer_tax|commission|property_tax_proration|insurance_proration|hoa_proration|rent_proration|adjustment|escrow|payoff|holdback|reserve|other",
      "hudSection": "HUD section number if applicable (100,200,300,400,500,600,700,800,900,1000,1100,1200,1300) or category key for specialized forms (hard_costs, soft_costs, draw, senior_tranche, etc.)",
      "altaCategory": "ALTA category if applicable (financial, prorations, commissions, title, taxes, payoffs, escrows, other)",
      "cdSection": "CD section if applicable (loan_terms, projected_payments, closing_costs, cash_to_close, summaries)",
      "lineNumber": "line number from the document if shown"
    }
  ],
  "prorations": [
    {
      "itemName": "property taxes, insurance, HOA, rent, etc.",
      "annualAmount": "numeric string",
      "dailyRate": "numeric string",
      "method": "calendar_day|banker_day",
      "buyerCredit": "numeric string",
      "sellerCredit": "numeric string"
    }
  ],
  "payoffs": [
    {
      "lender": "payoff lender name",
      "lienType": "mortgage|heloc|judgment|tax_lien|mechanic_lien|other",
      "accountNumber": "account number",
      "currentBalance": "numeric string",
      "perDiemInterest": "numeric string",
      "totalPayoff": "numeric string"
    }
  ]
}

Rules:
- All monetary amounts must be plain numeric strings without $ or commas (e.g. "150000.00" not "$150,000.00")
- For the "side" field, determine if each item is a source/credit or use/debit from context
- For HUD-1 documents, use the section numbers (100-1300) in hudSection
- For ALTA documents, categorize items into altaCategory
- For CD documents, categorize items into cdSection
- For construction/CMBS/capital stack forms, use appropriate hudSection keys
- Extract ALL line items visible in the document
- If a field is not present in the document, omit it from the output
- Return ONLY valid JSON, no markdown formatting`;

export async function extractClosingFromDocument(
  documentBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<ExtractionResult> {
  try {
    const isImage = mimeType.startsWith("image/");
    const isPdf = mimeType === "application/pdf";

    if (!isImage && !isPdf) {
      return {
        success: false,
        validation: [{ severity: "error", field: "file", message: "Only PDF and image files are supported for extraction" }],
        confidence: 0,
      };
    }

    const base64Data = documentBuffer.toString("base64");
    const geminiMime = isPdf ? "application/pdf" : mimeType;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType: geminiMime, data: base64Data } },
            { text: EXTRACTION_PROMPT },
          ],
        },
      ],
    });

    const responseText = response?.text || "";
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        success: false,
        validation: [{ severity: "error", field: "parsing", message: "Could not extract structured data from document" }],
        confidence: 0,
        rawText: responseText,
      };
    }

    const extracted: ExtractedClosingData = JSON.parse(jsonMatch[0]);
    const validation = validateExtractedData(extracted);
    const confidence = computeConfidence(extracted, validation);

    return {
      success: true,
      data: extracted,
      validation,
      confidence,
    };
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("[ClosingExtraction] Error:", errMsg);
    return {
      success: false,
      validation: [{ severity: "error", field: "extraction", message: `Extraction failed: ${errMsg}` }],
      confidence: 0,
    };
  }
}

function validateExtractedData(data: ExtractedClosingData): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!data.statementType) {
    issues.push({ severity: "error", field: "statementType", message: "Could not determine statement type" });
  }

  if (!data.propertyAddress) {
    issues.push({ severity: "warning", field: "propertyAddress", message: "No property address found", suggestion: "Enter the property address manually" });
  }

  if (!data.closingDate) {
    issues.push({ severity: "warning", field: "closingDate", message: "No closing date found", suggestion: "Enter the closing date manually" });
  }

  if (!data.parties || data.parties.length === 0) {
    issues.push({ severity: "warning", field: "parties", message: "No parties identified", suggestion: "Add parties manually" });
  }

  if (!data.lineItems || data.lineItems.length === 0) {
    issues.push({ severity: "warning", field: "lineItems", message: "No line items found", suggestion: "The document may not contain readable line items" });
  }

  if (data.lineItems && data.lineItems.length > 0) {
    const sources = data.lineItems.filter(li =>
      li.side === "source" || li.side === "buyer_credit" || li.side === "seller_credit"
    );
    const uses = data.lineItems.filter(li =>
      li.side === "use" || li.side === "buyer_debit" || li.side === "seller_debit"
    );

    const totalSources = sources.reduce((s, li) => s + parseFloat(li.amount || "0"), 0);
    const totalUses = uses.reduce((s, li) => s + parseFloat(li.amount || "0"), 0);

    if (totalSources > 0 && totalUses > 0) {
      const diff = Math.abs(totalSources - totalUses);
      if (diff > 0.01 && diff / Math.max(totalSources, totalUses) > 0.001) {
        issues.push({
          severity: "warning",
          field: "balance",
          message: `Sources ($${totalSources.toFixed(2)}) and Uses ($${totalUses.toFixed(2)}) don't balance. Difference: $${diff.toFixed(2)}`,
          suggestion: "Review extracted amounts for accuracy",
        });
      }
    }

    for (let i = 0; i < data.lineItems.length; i++) {
      const item = data.lineItems[i];
      if (!item.amount || parseFloat(item.amount) === 0) {
        issues.push({
          severity: "info",
          field: `lineItems[${i}]`,
          message: `Line item "${item.description}" has zero or missing amount`,
        });
      }
      if (!item.side) {
        issues.push({
          severity: "warning",
          field: `lineItems[${i}].side`,
          message: `Line item "${item.description}" has no side classification`,
          suggestion: "Classify as source or use",
        });
      }
    }
  }

  if (data.purchasePrice && data.loanAmount) {
    const pp = parseFloat(data.purchasePrice);
    const la = parseFloat(data.loanAmount);
    if (la > pp && pp > 0) {
      issues.push({
        severity: "warning",
        field: "loanAmount",
        message: `Loan amount ($${la.toFixed(2)}) exceeds purchase price ($${pp.toFixed(2)})`,
        suggestion: "Verify the loan amount is correct (may be valid for construction loans)",
      });
    }
  }

  if (data.prorations && data.prorations.length > 0) {
    for (const p of data.prorations) {
      if (p.buyerCredit && p.sellerCredit) {
        const bc = parseFloat(p.buyerCredit);
        const sc = parseFloat(p.sellerCredit);
        if (bc > 0 && sc > 0) {
          issues.push({
            severity: "info",
            field: "prorations",
            message: `Proration "${p.itemName}" has both buyer credit ($${bc.toFixed(2)}) and seller credit ($${sc.toFixed(2)})`,
          });
        }
      }
    }
  }

  return issues;
}

function computeConfidence(data: ExtractedClosingData, issues: ValidationIssue[]): number {
  let score = 100;

  const errors = issues.filter(i => i.severity === "error").length;
  const warnings = issues.filter(i => i.severity === "warning").length;
  score -= errors * 25;
  score -= warnings * 5;

  if (!data.statementType) score -= 20;
  if (!data.propertyAddress) score -= 5;
  if (!data.closingDate) score -= 5;
  if (!data.lineItems || data.lineItems.length === 0) score -= 30;
  if (!data.parties || data.parties.length === 0) score -= 10;

  if (data.lineItems && data.lineItems.length > 0) {
    const withAmount = data.lineItems.filter(li => li.amount && parseFloat(li.amount) !== 0).length;
    const completeness = withAmount / data.lineItems.length;
    if (completeness < 0.5) score -= 15;
  }

  return Math.max(0, Math.min(100, score));
}

export async function extractAndCreateClosing(
  documentId: string,
  dealId: string,
  userId: string
): Promise<{
  closingId?: string;
  extraction: ExtractionResult;
}> {
  const [document] = await db.select().from(schema.dataRoomDocuments)
    .where(eq(schema.dataRoomDocuments.id, documentId));

  if (!document) {
    return {
      extraction: {
        success: false,
        validation: [{ severity: "error", field: "document", message: "Document not found" }],
        confidence: 0,
      },
    };
  }

  let fileBuffer: Buffer;
  try {
    const { ObjectStorageService } = await import("../objectStorage");
    const objectStorage = new ObjectStorageService();
    fileBuffer = await objectStorage.downloadAsBuffer(document.storagePath!);
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return {
      extraction: {
        success: false,
        validation: [{ severity: "error", field: "file", message: `Could not read document file: ${errMsg}` }],
        confidence: 0,
      },
    };
  }

  const extraction = await extractClosingFromDocument(
    fileBuffer,
    document.fileName,
    document.fileType || "application/pdf"
  );

  if (!extraction.success || !extraction.data) {
    return { extraction };
  }

  const data = extraction.data;

  const [closing] = await db.insert(schema.closingTransactions).values({
    dealId,
    transactionType: normalizeTransactionType(data.statementType),
    title: data.title || `Extracted: ${document.fileName}`,
    propertyAddress: data.propertyAddress || null,
    purchasePrice: data.purchasePrice || null,
    loanAmount: data.loanAmount || null,
    earnestMoney: data.earnestMoney || null,
    closingDate: data.closingDate || null,
    fileNumber: data.fileNumber || null,
    status: "draft",
    totalSources: "0",
    totalUses: "0",
    balanceValid: false,
    createdBy: userId,
  }).returning();

  if (data.parties && data.parties.length > 0) {
    for (const party of data.parties) {
      await db.insert(schema.closingParties).values({
        closingId: closing.id,
        name: party.name,
        role: normalizePartyRole(party.role),
        entityType: party.company || null,
        address: party.address || null,
        phone: party.phone || null,
        email: party.email || null,
      });
    }
  }

  let totalSources = 0;
  let totalUses = 0;
  if (data.lineItems && data.lineItems.length > 0) {
    for (let i = 0; i < data.lineItems.length; i++) {
      const li = data.lineItems[i];
      const amt = parseFloat(li.amount || "0");
      const normalizedSide = normalizeSide(li.side || "use");
      if (normalizedSide === "source" || normalizedSide === "buyer_credit" || normalizedSide === "seller_credit") {
        totalSources += amt;
      } else {
        totalUses += amt;
      }
      await db.insert(schema.closingLineItems).values({
        closingId: closing.id,
        description: li.description,
        amount: li.amount || "0",
        side: normalizedSide,
        category: normalizeCategory(li.category || "other"),
        hudSection: li.hudSection || null,
        altaCategory: li.altaCategory || null,
        cdSection: li.cdSection || null,
        lineNumber: li.lineNumber || `${i + 1}`,
        sortOrder: i + 1,
      });
    }
  }

  if (data.prorations && data.prorations.length > 0) {
    for (const p of data.prorations) {
      await db.insert(schema.closingProrations).values({
        closingId: closing.id,
        itemName: p.itemName,
        annualAmount: p.annualAmount || "0",
        dailyRate: p.dailyRate || null,
        method: p.method || "calendar_day",
        buyerCredit: p.buyerCredit || "0",
        sellerCredit: p.sellerCredit || "0",
      });
    }
  }

  if (data.payoffs && data.payoffs.length > 0) {
    for (const po of data.payoffs) {
      await db.insert(schema.closingPayoffs).values({
        closingId: closing.id,
        lender: po.lender,
        lienType: po.lienType || null,
        accountNumber: po.accountNumber || null,
        currentBalance: po.currentBalance || "0",
        perDiemInterest: po.perDiemInterest || null,
        totalPayoff: po.totalPayoff || "0",
      });
    }
  }

  const diff = totalSources - totalUses;
  await db.update(schema.closingTransactions)
    .set({
      totalSources: totalSources.toFixed(2),
      totalUses: totalUses.toFixed(2),
      balanceValid: Math.abs(diff) < 0.01,
    })
    .where(eq(schema.closingTransactions.id, closing.id));

  return {
    closingId: closing.id,
    extraction,
  };
}
