import Anthropic from "@anthropic-ai/sdk";
import { db } from "../db";
import { peDealDocuments } from "@shared/schema";
import { eq } from "drizzle-orm";

const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

export interface ClassifiedDocument {
  documentId: string;
  filename: string;
  category: string;
  subcategory: string;
  confidence: number;
  summary: string;
  keyDataPoints: string[];
  hasFinancialData: boolean;
  hasTechInfo: boolean;
  relevantMemoSections: string[];
}

const CLASSIFICATION_SCHEMA = {
  type: "object" as const,
  properties: {
    documents: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          documentId: { type: "string" as const },
          category: {
            type: "string" as const,
            enum: [
              "financial_statements", "tax_returns", "quality_of_earnings",
              "contracts_customer", "contracts_vendor", "contracts_employment", "contracts_other",
              "corporate_docs", "ip_documents", "real_estate",
              "market_research", "pitch_materials", "management_presentation",
              "operational_data", "technology_documentation", "regulatory_filings",
              "insurance", "environmental", "other",
            ],
          },
          subcategory: { type: "string" as const },
          confidence: { type: "number" as const },
          summary: { type: "string" as const },
          keyDataPoints: { type: "array" as const, items: { type: "string" as const } },
          hasFinancialData: { type: "boolean" as const },
          hasTechInfo: { type: "boolean" as const },
          relevantMemoSections: {
            type: "array" as const,
            items: { type: "string" as const },
          },
        },
        required: [
          "documentId", "category", "subcategory", "confidence",
          "summary", "keyDataPoints", "hasFinancialData", "hasTechInfo", "relevantMemoSections",
        ],
      },
    },
  },
  required: ["documents"],
};

export async function classifyDocuments(
  documents: Array<{ id: string; filename: string; extractedText: string | null }>,
  dealContext: { dealName: string; sector: string; dealType: string }
): Promise<ClassifiedDocument[]> {
  if (documents.length === 0) return [];

  const BATCH_SIZE = 10;
  const results: ClassifiedDocument[] = [];

  for (let i = 0; i < documents.length; i += BATCH_SIZE) {
    const batch = documents.slice(i, i + BATCH_SIZE);
    const batchResults = await classifyBatch(batch, dealContext);
    results.push(...batchResults);
  }

  return results;
}

async function classifyBatch(
  documents: Array<{ id: string; filename: string; extractedText: string | null }>,
  dealContext: { dealName: string; sector: string; dealType: string }
): Promise<ClassifiedDocument[]> {
  const docSummaries = documents.map((doc) => ({
    id: doc.id,
    filename: doc.filename,
    textPreview: doc.extractedText?.slice(0, 3000) || "[No text extracted]",
  }));

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 8000,
    system: `You are a PE due diligence document classification specialist. Classify deal documents for an investor memo pipeline.

Deal context:
- Target: ${dealContext.dealName}
- Sector: ${dealContext.sector}
- Deal type: ${dealContext.dealType}

For each document, determine its category, identify key data points relevant to an investor memo, and flag whether it contains financial data or technology information.`,
    messages: [
      {
        role: "user",
        content: `Classify these ${documents.length} documents:\n\n${JSON.stringify(docSummaries, null, 2)}`,
      },
    ],
    tools: [
      {
        name: "classify_documents",
        description: "Classify a batch of deal documents",
        input_schema: CLASSIFICATION_SCHEMA,
      },
    ],
    tool_choice: { type: "tool", name: "classify_documents" },
  });

  const toolUseBlock = response.content.find((b) => b.type === "tool_use");
  if (!toolUseBlock || toolUseBlock.type !== "tool_use") {
    console.error("[DocClassifier] No tool use in response");
    return documents.map((doc) => ({
      documentId: doc.id,
      filename: doc.filename,
      category: "other",
      subcategory: "unclassified",
      confidence: 0,
      summary: "Classification failed",
      keyDataPoints: [],
      hasFinancialData: false,
      hasTechInfo: false,
      relevantMemoSections: [],
    }));
  }

  const input = toolUseBlock.input as { documents: ClassifiedDocument[] };
  return input.documents.map((classified) => ({
    ...classified,
    filename: documents.find((d) => d.id === classified.documentId)?.filename || "",
  }));
}

export async function updateDocumentCategories(
  classifications: ClassifiedDocument[]
): Promise<void> {
  for (const doc of classifications) {
    try {
      await db.update(peDealDocuments)
        .set({
          category: doc.category as any,
          subcategory: doc.subcategory,
          summary: doc.summary,
          keyEntities: {
            keyDataPoints: doc.keyDataPoints,
            hasFinancialData: doc.hasFinancialData,
            hasTechInfo: doc.hasTechInfo,
            relevantMemoSections: doc.relevantMemoSections,
          },
        })
        .where(eq(peDealDocuments.id, doc.documentId));
    } catch (err) {
      console.error(`[DocClassifier] Failed to update ${doc.documentId}:`, err);
    }
  }
}
