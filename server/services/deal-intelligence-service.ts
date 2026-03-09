import Anthropic from "@anthropic-ai/sdk";
import { db } from "../db";
import { 
  dataRoomDocuments, dataRooms, deals, dealTerms, dealTemplates, 
  dealChecklists, dealChecklistItems, templateItems, 
  checklistItemDocuments, templateCategories,
  investorMemos, dealMilestones,
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
      model: "claude-sonnet-4-5",
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

export async function extractDealParties(dealId: string): Promise<{
  buyerParties: { name: string }[];
  sellerParties: { name: string }[];
  targetEntities: { name: string }[];
  advisors: { name: string; role?: string }[];
}> {
  const [deal] = await db.select().from(deals).where(eq(deals.id, dealId));
  if (!deal) throw new Error("Deal not found");

  const rooms = await db.select({ id: dataRooms.id })
    .from(dataRooms)
    .where(eq(dataRooms.dealId, dealId));

  if (rooms.length === 0) {
    throw new Error("No data rooms found for this deal");
  }

  const roomIds = rooms.map(r => r.id);
  const docs = await db.select()
    .from(dataRoomDocuments)
    .where(inArray(dataRoomDocuments.dataRoomId, roomIds));

  const docsWithText = docs.filter(d => d.extractedText && d.extractedText.length > 100);
  if (docsWithText.length === 0) {
    throw new Error("No documents with extracted text found. Upload and process documents first.");
  }

  const combinedText = docsWithText
    .map(d => `--- Document: ${d.fileName} ---\n${(d.extractedText || "").slice(0, 6000)}`)
    .join("\n\n")
    .slice(0, 40000);

  console.log(`[DealIntel] Extracting parties from ${docsWithText.length} documents for deal "${deal.title}"`);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 2000,
    messages: [{
      role: "user",
      content: `Analyze these transaction documents and extract all parties involved. Categorize them into the following groups:

1. **Buyer Parties** — the acquiring entity/entities, purchasers, borrowers (in debt deals), investors
2. **Seller Parties** — the selling entity/entities, lenders (in debt deals), existing shareholders selling
3. **Target Entities** — the company/companies being acquired, the target business, the asset being purchased
4. **Advisors** — law firms, financial advisors, accountants, investment banks, consultants involved

For each party, extract the full legal name as it appears in the documents. For advisors, also identify their role (e.g., "Buyer's Counsel", "Financial Advisor", "Seller's Counsel", "Accounting Firm").

Do NOT include generic/placeholder names. Only include parties that are clearly identified in the documents.

Return ONLY a JSON object in this exact format:
{
  "buyerParties": [{"name": "Company A LLC"}],
  "sellerParties": [{"name": "Company B Inc."}],
  "targetEntities": [{"name": "Target Corp"}],
  "advisors": [{"name": "Law Firm LLP", "role": "Buyer's Counsel"}]
}

If a category has no identified parties, return an empty array for that category.

Documents:
${combinedText}`
    }],
  });

  const text = response.content[0]?.type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse AI response for party extraction");
  }

  const extracted = JSON.parse(jsonMatch[0]);

  const normalizeName = (name: string) => name.trim().replace(/\s+/g, " ").toLowerCase();

  const dedupArray = (arr: any[], seen: Set<string>) => {
    const unique: any[] = [];
    for (const item of arr) {
      if (!item.name) continue;
      const key = normalizeName(item.name);
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(item);
      }
    }
    return unique;
  };

  const rawBuyers = Array.isArray(extracted.buyerParties) ? extracted.buyerParties : [];
  const rawSellers = Array.isArray(extracted.sellerParties) ? extracted.sellerParties : [];
  const rawTargets = Array.isArray(extracted.targetEntities) ? extracted.targetEntities : [];
  const rawAdvisors = Array.isArray(extracted.advisors) ? extracted.advisors : [];

  const existingBuyerNames = new Set(((deal.buyerParties || []) as any[]).map((p: any) => normalizeName(typeof p === "string" ? p : p.name || "")));
  const existingSellerNames = new Set(((deal.sellerParties || []) as any[]).map((p: any) => normalizeName(typeof p === "string" ? p : p.name || "")));
  const existingTargetNames = new Set(((deal.targetEntities || []) as any[]).map((p: any) => normalizeName(typeof p === "string" ? p : p.name || "")));
  const existingAdvisorNames = new Set(((deal.advisors || []) as any[]).map((p: any) => normalizeName(typeof p === "string" ? p : p.name || "")));

  const newBuyers = dedupArray(rawBuyers, new Set(existingBuyerNames));
  const newSellers = dedupArray(rawSellers, new Set(existingSellerNames));
  const newTargets = dedupArray(rawTargets, new Set(existingTargetNames));
  const newAdvisors = dedupArray(rawAdvisors, new Set(existingAdvisorNames));

  const mergedBuyers = [...((deal.buyerParties || []) as any[]), ...newBuyers];
  const mergedSellers = [...((deal.sellerParties || []) as any[]), ...newSellers];
  const mergedTargets = [...((deal.targetEntities || []) as any[]), ...newTargets];
  const mergedAdvisors = [...((deal.advisors || []) as any[]), ...newAdvisors];

  await db.update(deals)
    .set({
      buyerParties: mergedBuyers,
      sellerParties: mergedSellers,
      targetEntities: mergedTargets,
      advisors: mergedAdvisors,
      updatedAt: new Date(),
    })
    .where(eq(deals.id, dealId));

  const added = {
    buyerParties: newBuyers.length,
    sellerParties: newSellers.length,
    targetEntities: newTargets.length,
    advisors: newAdvisors.length,
  };
  const totalAdded = newBuyers.length + newSellers.length + newTargets.length + newAdvisors.length;
  const totalFound = rawBuyers.length + rawSellers.length + rawTargets.length + rawAdvisors.length;

  console.log(`[DealIntel] Extracted ${totalAdded} new parties (${totalFound} found total) for deal "${deal.title}"`);

  return {
    buyerParties: newBuyers,
    sellerParties: newSellers,
    targetEntities: newTargets,
    advisors: newAdvisors,
    added,
    totalAdded,
    totalFound,
  };
}

export async function populateDealOverview(dealId: string): Promise<{
  fieldsUpdated: string[];
  totalUpdated: number;
}> {
  const [deal] = await db.select().from(deals).where(eq(deals.id, dealId));
  if (!deal) throw new Error("Deal not found");

  const updateData: Record<string, any> = {};
  const fieldsUpdated: string[] = [];

  const parseDate = (val: string | null | undefined): Date | null => {
    if (!val) return null;
    const d = new Date(val);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const terms = await db.select().from(dealTerms).where(eq(dealTerms.dealId, dealId)).limit(1);
  const term = terms[0] || null;

  if (term) {
    if (!deal.dealValue && term.purchasePrice) {
      updateData.dealValue = term.purchasePrice;
      fieldsUpdated.push("dealValue");
    }
    const closingDate = parseDate(term.closingDate);
    if (!deal.closingTargetDate && closingDate) {
      updateData.closingTargetDate = closingDate;
      fieldsUpdated.push("closingTargetDate");
    }
    const loiDate = parseDate(term.effectiveDate);
    if (!deal.loiDate && loiDate) {
      updateData.loiDate = loiDate;
      fieldsUpdated.push("loiDate");
    }
  }

  const memos = await db.select().from(investorMemos).where(eq(investorMemos.dealId, dealId)).limit(1);
  const memo = memos[0] || null;

  const needsAI = !deal.description || !deal.dealStructure || !deal.subType ||
    (!deal.signingTargetDate && !updateData.signingTargetDate) ||
    (!deal.exclusivityExpiration && !updateData.exclusivityExpiration);

  if (needsAI) {
    const rooms = await db.select({ id: dataRooms.id })
      .from(dataRooms)
      .where(eq(dataRooms.dealId, dealId));

    let docText = "";
    if (rooms.length > 0) {
      const roomIds = rooms.map(r => r.id);
      const docs = await db.select()
        .from(dataRoomDocuments)
        .where(inArray(dataRoomDocuments.dataRoomId, roomIds));
      const docsWithText = docs.filter(d => d.extractedText && d.extractedText.length > 100);
      if (docsWithText.length > 0) {
        const perDoc = Math.min(6000, Math.floor(15000 / docsWithText.length));
        docText = docsWithText
          .map(d => `--- ${d.fileName} ---\n${(d.extractedText || "").slice(0, perDoc)}`)
          .join("\n\n");
      }
    }

    let memoContext = "";
    if (memo) {
      const memoFields = [
        memo.executiveSummary ? `Executive Summary: ${(memo.executiveSummary as string).slice(0, 2000)}` : "",
        memo.companyOverview ? `Company Overview: ${(memo.companyOverview as string).slice(0, 1000)}` : "",
        memo.investmentThesis ? `Investment Thesis: ${(memo.investmentThesis as string).slice(0, 1000)}` : "",
      ].filter(Boolean).join("\n\n");
      memoContext = memoFields;
    }

    const combinedContext = [docText, memoContext].filter(Boolean).join("\n\n---\n\n");

    if (combinedContext.length > 200) {
      const fieldsNeeded: string[] = [];
      if (!deal.description) fieldsNeeded.push('"description": "2-3 sentence deal summary"');
      if (!deal.dealStructure) fieldsNeeded.push('"dealStructure": "description of deal structure (e.g., Asset Purchase, Stock Purchase, Merger, Joint Venture)"');
      if (!deal.subType) fieldsNeeded.push('"subType": "more specific deal sub-type"');
      if (!deal.signingTargetDate && !updateData.signingTargetDate) fieldsNeeded.push('"signingTargetDate": "YYYY-MM-DD or null"');
      if (!deal.exclusivityExpiration && !updateData.exclusivityExpiration) fieldsNeeded.push('"exclusivityExpiration": "YYYY-MM-DD or null"');
      if (!deal.dealValue && !updateData.dealValue) fieldsNeeded.push('"dealValue": "dollar amount as string e.g. 2,500,000"');
      if (!deal.closingTargetDate && !updateData.closingTargetDate) fieldsNeeded.push('"closingTargetDate": "YYYY-MM-DD or null"');
      if (!deal.loiDate && !updateData.loiDate) fieldsNeeded.push('"loiDate": "YYYY-MM-DD or null"');

      if (fieldsNeeded.length > 0) {
        try {
          const response = await anthropic.messages.create({
            model: "claude-sonnet-4-5",
            max_tokens: 1000,
            messages: [{
              role: "user",
              content: `Analyze these transaction documents and extract the following deal overview fields. Only include fields you can identify with reasonable confidence. Do NOT guess or make up values.

Return ONLY a JSON object with these fields (use null for unknown):
{
  ${fieldsNeeded.join(",\n  ")}
}

Deal title: ${deal.title}
Deal type: ${deal.dealType}

Documents and reports:
${combinedContext.slice(0, 18000)}`
            }],
          });

          const text = response.content[0]?.type === "text" ? response.content[0].text : "";
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);

            if (parsed.description && !deal.description) {
              updateData.description = parsed.description;
              fieldsUpdated.push("description");
            }
            if (parsed.dealStructure && !deal.dealStructure) {
              updateData.dealStructure = parsed.dealStructure;
              fieldsUpdated.push("dealStructure");
            }
            if (parsed.subType && !deal.subType) {
              updateData.subType = parsed.subType;
              fieldsUpdated.push("subType");
            }
            if (parsed.dealValue && !deal.dealValue && !updateData.dealValue) {
              updateData.dealValue = parsed.dealValue;
              fieldsUpdated.push("dealValue");
            }
            const signingDate = parseDate(parsed.signingTargetDate);
            if (signingDate && !deal.signingTargetDate) {
              updateData.signingTargetDate = signingDate;
              fieldsUpdated.push("signingTargetDate");
            }
            const exclDate = parseDate(parsed.exclusivityExpiration);
            if (exclDate && !deal.exclusivityExpiration) {
              updateData.exclusivityExpiration = exclDate;
              fieldsUpdated.push("exclusivityExpiration");
            }
            const aiClosing = parseDate(parsed.closingTargetDate);
            if (aiClosing && !deal.closingTargetDate && !updateData.closingTargetDate) {
              updateData.closingTargetDate = aiClosing;
              fieldsUpdated.push("closingTargetDate");
            }
            const aiLoi = parseDate(parsed.loiDate);
            if (aiLoi && !deal.loiDate && !updateData.loiDate) {
              updateData.loiDate = aiLoi;
              fieldsUpdated.push("loiDate");
            }
          }
        } catch (error: any) {
          console.error(`[DealIntel] AI overview extraction error:`, error.message);
        }
      }
    }
  }

  if (Object.keys(updateData).length > 0) {
    updateData.updatedAt = new Date();
    await db.update(deals)
      .set(updateData)
      .where(eq(deals.id, dealId));
  }

  console.log(`[DealIntel] Populated ${fieldsUpdated.length} overview fields for deal "${deal.title}": ${fieldsUpdated.join(", ")}`);

  return {
    fieldsUpdated,
    totalUpdated: fieldsUpdated.length,
  };
}

export async function autoPopulateMilestones(dealId: string): Promise<{
  milestonesAdded: number;
  milestonesList: Array<{ title: string; milestoneType: string; targetDate?: string }>;
}> {
  const [deal] = await db.select().from(deals).where(eq(deals.id, dealId));
  if (!deal) throw new Error("Deal not found");

  const existingMilestones = await db.select({ title: dealMilestones.title })
    .from(dealMilestones)
    .where(eq(dealMilestones.dealId, dealId));
  const existingTitles = new Set(existingMilestones.map(m => m.title.toLowerCase().trim()));

  const rooms = await db.select({ id: dataRooms.id })
    .from(dataRooms)
    .where(eq(dataRooms.dealId, dealId));

  let docText = "";
  if (rooms.length > 0) {
    const roomIds = rooms.map(r => r.id);
    const docs = await db.select()
      .from(dataRoomDocuments)
      .where(inArray(dataRoomDocuments.dataRoomId, roomIds));
    const docsWithText = docs.filter(d => d.extractedText && d.extractedText.length > 100);
    if (docsWithText.length > 0) {
      const perDoc = Math.min(5000, Math.floor(14000 / docsWithText.length));
      docText = docsWithText
        .map(d => `--- ${d.fileName} ---\n${(d.extractedText || "").slice(0, perDoc)}`)
        .join("\n\n");
    }
  }

  const memos = await db.select().from(investorMemos).where(eq(investorMemos.dealId, dealId));
  let memoContext = "";
  if (memos.length > 0) {
    const memo = memos[0];
    const parts = [
      memo.executiveSummary ? `Executive Summary: ${(memo.executiveSummary as string).slice(0, 1500)}` : "",
      memo.companyOverview ? `Company Overview: ${(memo.companyOverview as string).slice(0, 800)}` : "",
      memo.investmentThesis ? `Investment Thesis: ${(memo.investmentThesis as string).slice(0, 800)}` : "",
    ].filter(Boolean);
    memoContext = parts.join("\n\n");
  }

  const terms = await db.select().from(dealTerms).where(eq(dealTerms.dealId, dealId)).limit(1);
  let termsContext = "";
  if (terms.length > 0) {
    const t = terms[0];
    const termParts = [
      t.purchasePrice ? `Purchase Price: ${t.purchasePrice}` : "",
      t.closingDate ? `Closing Date: ${t.closingDate}` : "",
      t.effectiveDate ? `Effective Date: ${t.effectiveDate}` : "",
      t.dueDiligenceDeadline ? `Due Diligence Deadline: ${(t as any).dueDiligenceDeadline}` : "",
      t.closingConditions ? `Closing Conditions: ${t.closingConditions}` : "",
      t.representationsWarranties ? `Representations & Warranties: ${(t.representationsWarranties as string).slice(0, 500)}` : "",
    ].filter(Boolean);
    termsContext = termParts.join("\n");
  }

  const combinedContext = [docText, memoContext, termsContext].filter(Boolean).join("\n\n---\n\n");

  if (combinedContext.length < 100) {
    return { milestonesAdded: 0, milestonesList: [] };
  }

  const validTypes = ["signing", "closing", "regulatory", "financing", "due_diligence", "custom"];

  const existingListStr = existingTitles.size > 0
    ? `\n\nExisting milestones (DO NOT duplicate these): ${Array.from(existingTitles).join(", ")}`
    : "";

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 2000,
    messages: [{
      role: "user",
      content: `Analyze these transaction documents and reports for the deal "${deal.title}" (type: ${deal.dealType}) and extract key milestones with their dates.

Return ONLY a JSON array of milestone objects. Each milestone must have:
- "title": concise milestone name (e.g., "LOI Execution", "Due Diligence Completion", "Regulatory Filing", "Closing")
- "milestoneType": one of ${JSON.stringify(validTypes)}
- "description": brief 1-sentence description
- "targetDate": ISO date string (YYYY-MM-DD) if a date is mentioned or can be reasonably inferred, otherwise null
- "status": "pending" or "completed" based on context

Extract milestones from:
- Key transaction dates (signing, closing, LOI, regulatory deadlines)
- Due diligence phases and deadlines
- Financing milestones (commitment letters, funding dates)
- Regulatory approvals needed
- Conditions precedent deadlines
- Any action items with deadlines from documents

Only include milestones you can identify from the documents. Do NOT invent milestones or dates.${existingListStr}

Return format: [{"title": "...", "milestoneType": "...", "description": "...", "targetDate": "YYYY-MM-DD or null", "status": "pending"}]

Documents and context:
${combinedContext.slice(0, 18000)}`
    }],
  });

  const text = response.content[0]?.type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    console.log("[DealIntel] No milestones JSON found in AI response");
    return { milestonesAdded: 0, milestonesList: [] };
  }

  let parsed: any[];
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    console.error("[DealIntel] Failed to parse milestones JSON");
    return { milestonesAdded: 0, milestonesList: [] };
  }

  if (!Array.isArray(parsed)) {
    return { milestonesAdded: 0, milestonesList: [] };
  }

  const milestonesList: Array<{ title: string; milestoneType: string; targetDate?: string }> = [];
  let milestonesAdded = 0;

  for (const item of parsed) {
    if (!item.title || typeof item.title !== "string") continue;

    const normalizedTitle = item.title.toLowerCase().trim();
    if (existingTitles.has(normalizedTitle)) continue;

    const milestoneType = validTypes.includes(item.milestoneType) ? item.milestoneType : "custom";
    const status = ["pending", "in_progress", "completed", "delayed", "cancelled"].includes(item.status)
      ? item.status : "pending";

    let targetDate: Date | null = null;
    if (item.targetDate) {
      const d = new Date(item.targetDate);
      if (!Number.isNaN(d.getTime())) {
        targetDate = d;
      }
    }

    await db.insert(dealMilestones).values({
      dealId,
      title: item.title,
      description: item.description || null,
      milestoneType,
      status,
      targetDate,
      ...(status === "completed" ? { completedAt: new Date(), actualDate: targetDate || new Date() } : {}),
    });

    existingTitles.add(normalizedTitle);
    milestonesAdded++;
    milestonesList.push({
      title: item.title,
      milestoneType,
      targetDate: item.targetDate || undefined,
    });
  }

  console.log(`[DealIntel] Auto-populated ${milestonesAdded} milestones for deal "${deal.title}"`);

  return { milestonesAdded, milestonesList };
}
