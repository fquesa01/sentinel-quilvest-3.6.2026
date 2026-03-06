import Anthropic from "@anthropic-ai/sdk";
import { db } from "../db";
import { 
  dataRoomDocuments, dataRooms, deals, dealTemplates, 
  dealChecklists, dealChecklistItems, templateItems, 
  checklistItemDocuments, templateCategories,
  investorMemos,
} from "@shared/schema";
import { eq, and, sql, inArray } from "drizzle-orm";

const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

const DEAL_TYPE_MAP: Record<string, string> = {
  debt: "debt",
  equity: "investment",
  real_estate: "real_estate",
};

const TEMPLATE_SLUG_MAP: Record<string, string> = {
  debt: "debt",
  equity: "equity",
  real_estate: "real_estate",
};

export async function processDealDocumentIntelligence(documentId: string): Promise<void> {
  try {
    const [doc] = await db.select().from(dataRoomDocuments).where(eq(dataRoomDocuments.id, documentId));
    if (!doc || !doc.extractedText) {
      console.log(`[DealIntel] Document ${documentId} has no extracted text, skipping`);
      return;
    }

    const [room] = await db.select().from(dataRooms).where(eq(dataRooms.id, doc.dataRoomId));
    if (!room?.dealId) {
      console.log(`[DealIntel] Document ${documentId} not in a deal data room, skipping`);
      return;
    }

    const [deal] = await db.select().from(deals).where(eq(deals.id, room.dealId));
    if (!deal) {
      console.log(`[DealIntel] Deal not found for data room ${room.id}`);
      return;
    }

    console.log(`[DealIntel] Processing document "${doc.fileName}" for deal "${deal.title}" (${deal.id})`);

    await classifyDealType(deal, doc);
    await autoCompleteChecklistItems(deal, doc);
    await triggerMemoGeneration(deal);

    console.log(`[DealIntel] Completed intelligence processing for document "${doc.fileName}"`);
  } catch (error: any) {
    console.error(`[DealIntel] Error processing document ${documentId}:`, error.message);
  }
}

async function classifyDealType(
  deal: typeof deals.$inferSelect, 
  doc: typeof dataRoomDocuments.$inferSelect
): Promise<void> {
  try {
    const settings = (deal.settings || {}) as Record<string, any>;
    if (settings.dealTypeConfirmed) {
      return;
    }

    const textSnippet = (doc.extractedText || "").slice(0, 8000);
    
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      messages: [{
        role: "user",
        content: `Analyze this document and classify the type of business transaction it relates to. Choose exactly one:
- "debt" — loan agreements, credit facilities, promissory notes, debt financing, senior secured loans, mezzanine financing, bond offerings
- "equity" — stock purchase agreements, subscription agreements, equity investments, PE buyouts, growth equity, venture capital, share purchase, cap table
- "real_estate" — purchase and sale agreements for real property, commercial/residential real estate transactions, lease agreements, title documents, property transfers
- "unknown" — if the document doesn't clearly indicate any of the above

Return ONLY a JSON object with these fields:
{
  "dealType": "debt" | "equity" | "real_estate" | "unknown",
  "confidence": 0.0 to 1.0,
  "reason": "brief explanation"
}

Document text (first 8000 chars):
${textSnippet}`
      }],
    });

    const text = response.content[0]?.type === "text" ? response.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return;

    const classification = JSON.parse(jsonMatch[0]);
    if (classification.dealType === "unknown" || classification.confidence < 0.5) {
      console.log(`[DealIntel] Deal type classification uncertain: ${classification.dealType} (${classification.confidence})`);
      return;
    }

    const existingDetected = settings.detectedDealType;
    if (existingDetected && settings.detectedConfidence >= classification.confidence) {
      return;
    }

    const updatedSettings = {
      ...settings,
      detectedDealType: classification.dealType,
      detectedConfidence: classification.confidence,
      detectedReason: classification.reason,
      detectedAt: new Date().toISOString(),
      detectedFromDocument: doc.fileName,
    };

    await db.update(deals)
      .set({ settings: updatedSettings, updatedAt: new Date() })
      .where(eq(deals.id, deal.id));

    console.log(`[DealIntel] Classified deal "${deal.title}" as ${classification.dealType} (confidence: ${classification.confidence})`);
  } catch (error: any) {
    console.error(`[DealIntel] Classification error:`, error.message);
  }
}

async function autoCompleteChecklistItems(
  deal: typeof deals.$inferSelect,
  doc: typeof dataRoomDocuments.$inferSelect
): Promise<void> {
  try {
    const checklists = await db.select()
      .from(dealChecklists)
      .where(eq(dealChecklists.dealId, deal.id));

    if (checklists.length === 0) {
      console.log(`[DealIntel] No checklists found for deal ${deal.id}, skipping auto-complete`);
      return;
    }

    for (const checklist of checklists) {
      const items = await db.select({
        item: dealChecklistItems,
        templateItem: templateItems,
      })
        .from(dealChecklistItems)
        .innerJoin(templateItems, eq(dealChecklistItems.templateItemId, templateItems.id))
        .where(
          and(
            eq(dealChecklistItems.dealChecklistId, checklist.id),
            eq(dealChecklistItems.status, "pending")
          )
        );

      if (items.length === 0) continue;

      const docText = (doc.extractedText || "").toLowerCase();
      const docName = doc.fileName.toLowerCase();
      let matchedCount = 0;

      for (const { item, templateItem } of items) {
        const keywords = (templateItem.documentKeywords as string[]) || [];
        if (keywords.length === 0) continue;

        let score = 0;
        let matchedKeywords: string[] = [];

        for (const keyword of keywords) {
          const kw = keyword.toLowerCase();
          const escapedKw = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const regex = new RegExp(`\\b${escapedKw}\\b`, "i");
          
          if (regex.test(docName)) {
            score += 30;
            matchedKeywords.push(keyword);
          }
          if (regex.test(docText.slice(0, 10000))) {
            score += 15;
            if (!matchedKeywords.includes(keyword)) matchedKeywords.push(keyword);
          }
        }

        const confidence = Math.min(score, 100);
        if (confidence >= 40 && matchedKeywords.length >= 1) {
          const existingLink = await db.select({ id: checklistItemDocuments.id })
            .from(checklistItemDocuments)
            .where(
              and(
                eq(checklistItemDocuments.checklistItemId, item.id),
                eq(checklistItemDocuments.documentId, doc.id)
              )
            );

          if (existingLink.length > 0) continue;

          await db.insert(checklistItemDocuments).values({
            checklistItemId: item.id,
            documentId: doc.id,
            autoMatched: true,
            confidence: confidence / 100,
            matchedKeywords: matchedKeywords,
          });

          if (confidence >= 60) {
            await db.update(dealChecklistItems)
              .set({
                status: "complete",
                satisfactionMethod: "document",
                satisfiedAt: new Date(),
                notes: `Auto-completed: Document "${doc.fileName}" matched keywords: ${matchedKeywords.join(", ")} (confidence: ${confidence}%)`,
                updatedAt: new Date(),
              })
              .where(eq(dealChecklistItems.id, item.id));
            matchedCount++;
          }
        }
      }

      if (matchedCount > 0) {
        const allItems = await db.select({ status: dealChecklistItems.status })
          .from(dealChecklistItems)
          .where(eq(dealChecklistItems.dealChecklistId, checklist.id));
        
        const completed = allItems.filter(i => 
          i.status === "complete" || i.status === "na" || i.status === "waived"
        ).length;

        await db.update(dealChecklists)
          .set({
            completedItems: completed,
            percentComplete: allItems.length > 0 ? (completed / allItems.length) * 100 : 0,
          })
          .where(eq(dealChecklists.id, checklist.id));

        console.log(`[DealIntel] Auto-completed ${matchedCount} checklist items for deal "${deal.title}"`);
      }
    }
  } catch (error: any) {
    console.error(`[DealIntel] Auto-complete error:`, error.message);
  }
}

async function triggerMemoGeneration(deal: typeof deals.$inferSelect): Promise<void> {
  try {
    const existingMemos = await db.select({ id: investorMemos.id, status: investorMemos.status })
      .from(investorMemos)
      .where(eq(investorMemos.dealId, deal.id));

    const settings = (deal.settings || {}) as Record<string, any>;

    if (existingMemos.length > 0) {
      await db.update(deals)
        .set({
          settings: {
            ...settings,
            memoStatus: "update_available",
            memoUpdateAvailableAt: new Date().toISOString(),
          },
          updatedAt: new Date(),
        })
        .where(eq(deals.id, deal.id));
      console.log(`[DealIntel] Memo update flagged for deal "${deal.title}"`);
    } else {
      const allDocs = await db.select({ id: dataRoomDocuments.id })
        .from(dataRoomDocuments)
        .innerJoin(dataRooms, eq(dataRoomDocuments.dataRoomId, dataRooms.id))
        .where(
          and(
            eq(dataRooms.dealId, deal.id),
            eq(dataRoomDocuments.ocrStatus, "completed")
          )
        );

      if (allDocs.length >= 1) {
        await db.update(deals)
          .set({
            settings: {
              ...settings,
              memoStatus: "ready_to_generate",
              memoReadyAt: new Date().toISOString(),
              documentsProcessed: allDocs.length,
            },
            updatedAt: new Date(),
          })
          .where(eq(deals.id, deal.id));
        console.log(`[DealIntel] Deal "${deal.title}" ready for memo generation (${allDocs.length} documents processed)`);
      }
    }
  } catch (error: any) {
    console.error(`[DealIntel] Memo trigger error:`, error.message);
  }
}

export async function applyDetectedDealType(dealId: string): Promise<{ success: boolean; message: string; templateApplied?: boolean }> {
  const [deal] = await db.select().from(deals).where(eq(deals.id, dealId));
  if (!deal) throw new Error("Deal not found");

  const settings = (deal.settings || {}) as Record<string, any>;
  if (!settings.detectedDealType) {
    throw new Error("No detected deal type to apply");
  }

  const mappedType = DEAL_TYPE_MAP[settings.detectedDealType];
  if (!mappedType) {
    throw new Error(`Unknown deal type: ${settings.detectedDealType}`);
  }

  await db.update(deals)
    .set({
      dealType: mappedType as any,
      settings: {
        ...settings,
        dealTypeConfirmed: true,
        dealTypeConfirmedAt: new Date().toISOString(),
      },
      updatedAt: new Date(),
    })
    .where(eq(deals.id, dealId));

  let templateApplied = false;
  const existingChecklists = await db.select({ id: dealChecklists.id })
    .from(dealChecklists)
    .where(eq(dealChecklists.dealId, dealId));

  if (existingChecklists.length === 0) {
    const templateSlug = TEMPLATE_SLUG_MAP[settings.detectedDealType];
    if (templateSlug) {
      const [template] = await db.select()
        .from(dealTemplates)
        .where(eq(dealTemplates.slug, templateSlug));

      if (template) {
        const categories = await db.select()
          .from(templateCategories)
          .where(eq(templateCategories.templateId, template.id));

        const tItems = await db.select()
          .from(templateItems)
          .where(eq(templateItems.templateId, template.id));

        const [newChecklist] = await db.insert(dealChecklists)
          .values({
            dealId: dealId,
            templateId: template.id,
            totalItems: tItems.length,
            completedItems: 0,
            percentComplete: 0,
          })
          .returning();

        if (tItems.length > 0) {
          await db.insert(dealChecklistItems)
            .values(tItems.map(ti => ({
              dealChecklistId: newChecklist.id,
              templateItemId: ti.id,
              dealId: dealId,
              status: "pending" as const,
            })));
        }

        await db.update(dealTemplates)
          .set({ usageCount: sql`${dealTemplates.usageCount} + 1` })
          .where(eq(dealTemplates.id, template.id));

        templateApplied = true;
        console.log(`[DealIntel] Applied template "${template.name}" to deal ${dealId}`);
      }
    }
  }

  return {
    success: true,
    message: `Deal type updated to ${settings.detectedDealType}${templateApplied ? " and checklist template applied" : ""}`,
    templateApplied,
  };
}
