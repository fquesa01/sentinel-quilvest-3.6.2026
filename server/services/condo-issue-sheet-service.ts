import Anthropic from "@anthropic-ai/sdk";
import { db } from "../db";
import {
  condoIssueSheets, dataRoomDocuments, dataRooms, deals,
} from "@shared/schema";
import { eq, and, inArray } from "drizzle-orm";

const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

const CONDO_KEYWORDS = [
  "declaration of condominium",
  "condominium association",
  "condominium unit",
  "bylaws",
  "covenants, conditions",
  "cc&r",
  "homeowners association",
  "hoa",
  "common elements",
  "limited common elements",
  "unit owner",
  "assessment",
  "special assessment",
  "association rules",
  "rules and regulations",
  "architectural review",
  "board of directors",
  "amendment to declaration",
  "first amendment",
  "second amendment",
  "third amendment",
  "condo docs",
  "condominium declaration",
  "right of first refusal",
  "transfer fee",
  "pet policy",
  "rental restriction",
  "maintenance responsibility",
  "reserve fund",
  "quorum",
];

export interface CondoIssueSheetData {
  categories: CondoCategory[];
  summary: string;
  documentCount: number;
  generatedAt: string;
}

export interface CondoCategory {
  name: string;
  slug: string;
  items: CondoIssueItem[];
}

export interface CondoIssueItem {
  title: string;
  description: string;
  sourceDocument: string;
  sourceSection: string;
  severity?: "info" | "warning" | "critical";
}

export function isCondoDocument(fileName: string, extractedText: string): boolean {
  const lowerName = fileName.toLowerCase();
  const lowerText = (extractedText || "").toLowerCase().slice(0, 15000);

  const nameKeywords = [
    "declaration", "condominium", "condo", "bylaws", "bylaw",
    "cc&r", "ccr", "covenants", "hoa", "association rules",
    "rules and regulations", "amendment",
  ];

  const nameMatch = nameKeywords.some(kw => lowerName.includes(kw));
  if (nameMatch) return true;

  let matchCount = 0;
  for (const keyword of CONDO_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      matchCount++;
    }
  }

  return matchCount >= 3;
}

export async function detectCondoDocuments(dealId: string): Promise<typeof dataRoomDocuments.$inferSelect[]> {
  const rooms = await db.select({ id: dataRooms.id })
    .from(dataRooms)
    .where(eq(dataRooms.dealId, dealId));

  if (rooms.length === 0) return [];

  const roomIds = rooms.map(r => r.id);
  const docs = await db.select()
    .from(dataRoomDocuments)
    .where(
      and(
        inArray(dataRoomDocuments.dataRoomId, roomIds),
        eq(dataRoomDocuments.ocrStatus, "completed")
      )
    );

  return docs.filter(doc =>
    doc.extractedText && doc.extractedText.length > 100 &&
    isCondoDocument(doc.fileName, doc.extractedText)
  );
}

export interface GenerateResult {
  data: CondoIssueSheetData | null;
  reason: "success" | "no_condo_docs" | "generation_failed";
  error?: string;
}

export async function generateCondoIssueSheet(dealId: string): Promise<GenerateResult> {
  const condoDocs = await detectCondoDocuments(dealId);
  if (condoDocs.length === 0) {
    console.log(`[CondoIssueSheet] No condo documents found for deal ${dealId}`);
    return { data: null, reason: "no_condo_docs" };
  }

  console.log(`[CondoIssueSheet] Found ${condoDocs.length} condo documents for deal ${dealId}`);

  const existingSheet = await db.select()
    .from(condoIssueSheets)
    .where(eq(condoIssueSheets.dealId, dealId))
    .limit(1);

  if (existingSheet[0]) {
    await db.update(condoIssueSheets)
      .set({ status: "processing", updatedAt: new Date() })
      .where(eq(condoIssueSheets.id, existingSheet[0].id));
  } else {
    await db.insert(condoIssueSheets)
      .values({
        dealId,
        status: "processing",
        sourceDocumentIds: condoDocs.map(d => d.id),
      });
  }

  try {
    const perDoc = Math.min(8000, Math.floor(40000 / condoDocs.length));
    const combinedText = condoDocs
      .map(d => `=== DOCUMENT: "${d.fileName}" (ID: ${d.id}) ===\n${(d.extractedText || "").slice(0, perDoc)}`)
      .join("\n\n---\n\n");

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 6000,
      messages: [{
        role: "user",
        content: `You are a real estate attorney analyzing condominium documents. Extract key provisions and generate a structured Condo Issue Sheet for a buyer's review.

Analyze the following condominium documents and extract provisions into these categories:

1. **Assessment & Fees** — Monthly/quarterly assessments, special assessments, transfer fees, reserves
2. **Use Restrictions** — Rental restrictions, pet policies, commercial use, Airbnb/short-term rental rules, age restrictions
3. **Alteration & Modification Rules** — What owners can/cannot modify, approval requirements, architectural review
4. **Parking & Storage** — Assigned spaces, guest parking, storage units, EV charging rules
5. **Insurance Requirements** — Owner vs. association coverage, HO-6 requirements, liability minimums
6. **Governance** — Board structure, voting rights, quorum requirements, amendment procedures
7. **Maintenance Responsibilities** — Association vs. unit owner obligations, limited common elements, exclusive use areas
8. **Dispute Resolution** — Arbitration/mediation requirements, lien rights, enforcement procedures
9. **Right of First Refusal / Transfer Restrictions** — Association approval requirements for sales/transfers
10. **Key Dates & Deadlines** — Developer turnover date, warranty periods, reserve study schedule
11. **Flagged Concerns** — Any unusual, atypical, or potentially problematic provisions

For each item found, include:
- A clear title
- A description of the provision
- Which document it was found in (use exact document name)
- Which section/article of the document it was found in (be specific)
- Severity: "info" for standard provisions, "warning" for provisions that buyers should pay attention to, "critical" for unusual or potentially problematic provisions

Return ONLY a JSON object in this format:
{
  "summary": "2-3 sentence overview of the condo documents analyzed",
  "categories": [
    {
      "name": "Assessment & Fees",
      "slug": "assessment_fees",
      "items": [
        {
          "title": "Monthly Assessment",
          "description": "Monthly assessment of $X covers...",
          "sourceDocument": "exact document filename",
          "sourceSection": "Article IV, Section 4.2",
          "severity": "info"
        }
      ]
    }
  ]
}

Use these slugs for each category:
- assessment_fees
- use_restrictions
- alteration_rules
- parking_storage
- insurance_requirements
- governance
- maintenance_responsibilities
- dispute_resolution
- transfer_restrictions
- key_dates
- flagged_concerns

Only include categories that have at least one item. Be specific and cite exact provisions.

Documents:
${combinedText.slice(0, 45000)}`
      }],
    });

    const text = response.content[0]?.type === "text" ? response.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to parse AI response for condo issue sheet");
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const issueSheetData: CondoIssueSheetData = {
      summary: parsed.summary || "Condo document analysis complete.",
      categories: (parsed.categories || []).map((cat: any) => ({
        name: cat.name || "",
        slug: cat.slug || "",
        items: (cat.items || []).map((item: any) => ({
          title: item.title || "",
          description: item.description || "",
          sourceDocument: item.sourceDocument || "",
          sourceSection: item.sourceSection || "",
          severity: ["info", "warning", "critical"].includes(item.severity) ? item.severity : "info",
        })),
      })),
      documentCount: condoDocs.length,
      generatedAt: new Date().toISOString(),
    };

    await db.update(condoIssueSheets)
      .set({
        status: "completed",
        issueSheet: issueSheetData as any,
        sourceDocumentIds: condoDocs.map(d => d.id),
        generatedAt: new Date(),
        error: null,
        updatedAt: new Date(),
      })
      .where(eq(condoIssueSheets.dealId, dealId));

    console.log(`[CondoIssueSheet] Generated issue sheet for deal ${dealId} with ${issueSheetData.categories.length} categories`);
    return { data: issueSheetData, reason: "success" };

  } catch (error: any) {
    console.error(`[CondoIssueSheet] Error generating issue sheet for deal ${dealId}:`, error.message);

    await db.update(condoIssueSheets)
      .set({
        status: "failed",
        error: error.message,
        updatedAt: new Date(),
      })
      .where(eq(condoIssueSheets.dealId, dealId));

    return { data: null, reason: "generation_failed", error: error.message };
  }
}

export async function getCondoIssueSheet(dealId: string): Promise<typeof condoIssueSheets.$inferSelect | null> {
  const [sheet] = await db.select()
    .from(condoIssueSheets)
    .where(eq(condoIssueSheets.dealId, dealId))
    .limit(1);
  return sheet || null;
}

export async function checkAndTriggerCondoAnalysis(dealId: string, documentId: string): Promise<void> {
  try {
    const [doc] = await db.select()
      .from(dataRoomDocuments)
      .where(eq(dataRoomDocuments.id, documentId));

    if (!doc || !doc.extractedText) return;

    if (!isCondoDocument(doc.fileName, doc.extractedText)) return;

    console.log(`[CondoIssueSheet] Condo document detected: "${doc.fileName}" for deal ${dealId}`);

    const existing = await db.select()
      .from(condoIssueSheets)
      .where(eq(condoIssueSheets.dealId, dealId))
      .limit(1);

    if (existing.length > 0) {
      const currentSourceIds = (existing[0].sourceDocumentIds || []) as string[];
      if (currentSourceIds.includes(documentId)) {
        console.log(`[CondoIssueSheet] Document already included in issue sheet, skipping`);
        return;
      }
    }

    await generateCondoIssueSheet(dealId);
  } catch (error: any) {
    console.error(`[CondoIssueSheet] Error in checkAndTriggerCondoAnalysis:`, error.message);
  }
}
