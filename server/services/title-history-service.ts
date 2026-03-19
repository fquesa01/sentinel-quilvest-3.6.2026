import { GoogleGenAI } from "@google/genai";
import { db } from "../db";
import { dealTitleEvents, dataRoomDocuments, dataRooms, deals } from "@shared/schema";
import { eq, inArray } from "drizzle-orm";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });

const VALID_EVENT_TYPES = [
  "deed_transfer", "mortgage", "lien_filed", "lien_released",
  "easement", "title_commitment", "satisfaction", "lis_pendens",
  "judgment", "tax_lien", "hoa_lien", "assignment", "subordination", "other",
];

const TITLE_RELATED_KEYWORDS = [
  "deed", "title", "lien", "mortgage", "easement", "encumbrance",
  "warranty deed", "quitclaim", "special warranty", "title commitment",
  "title report", "title search", "chain of title", "abstract of title",
  "lis pendens", "satisfaction", "subordination", "assignment",
  "recording", "conveyance", "grantor", "grantee", "instrument",
  "book", "page", "tax lien", "hoa lien", "mechanic", "judgment",
  "deed of trust", "title insurance", "title policy", "survey",
  "property transfer", "ownership", "vesting", "plat",
];

const TITLE_RELATED_CATEGORIES = [
  "title", "deed", "lien", "mortgage", "encumbrance", "recording",
  "title_report", "title_search", "title_commitment", "survey",
];

function isTitleRelatedDocument(doc: typeof dataRoomDocuments.$inferSelect): boolean {
  const fileName = (doc.fileName || "").toLowerCase();
  const category = (doc.documentCategory || "").toLowerCase();
  const tags = (doc.tags || []).map((t: string) => t.toLowerCase());
  const textSample = (doc.extractedText || "").toLowerCase().slice(0, 3000);

  if (TITLE_RELATED_CATEGORIES.some(c => category.includes(c))) {
    return true;
  }

  if (tags.some(tag => TITLE_RELATED_KEYWORDS.some(kw => tag.includes(kw)))) {
    return true;
  }

  const fileNameMatches = TITLE_RELATED_KEYWORDS.filter(kw => fileName.includes(kw));
  if (fileNameMatches.length >= 1) {
    return true;
  }

  let keywordHits = 0;
  for (const kw of TITLE_RELATED_KEYWORDS) {
    if (textSample.includes(kw)) {
      keywordHits++;
      if (keywordHits >= 3) return true;
    }
  }

  return false;
}

export async function extractTitleHistory(dealId: string): Promise<{
  eventsAdded: number;
  eventsList: Array<{ eventType: string; grantor?: string; grantee?: string; eventDate?: string }>;
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
  const allDocs = await db.select()
    .from(dataRoomDocuments)
    .where(inArray(dataRoomDocuments.dataRoomId, roomIds));

  const docsWithText = allDocs.filter(d => d.extractedText && d.extractedText.length > 100);
  if (docsWithText.length === 0) {
    throw new Error("No documents with extracted text found. Upload and process documents first.");
  }

  let titleDocs = docsWithText.filter(isTitleRelatedDocument);
  if (titleDocs.length === 0) {
    console.log("[TitleHistory] No title-specific documents found, falling back to all documents");
    titleDocs = docsWithText;
  }

  console.log(`[TitleHistory] Processing ${titleDocs.length} title-related documents (out of ${docsWithText.length} total) for deal "${deal.title}"`);

  const perDoc = Math.max(500, Math.min(6000, Math.floor(18000 / titleDocs.length)));
  const combinedText = titleDocs
    .map(d => `--- Document: ${d.fileName} (ID: ${d.id}) ---\n${(d.extractedText || "").slice(0, perDoc)}`)
    .join("\n\n");

  const existingEvents = await db.select()
    .from(dealTitleEvents)
    .where(eq(dealTitleEvents.dealId, dealId));

  const existingKeys = new Set(
    existingEvents.map(e =>
      `${e.eventType}|${(e.grantor || "").toLowerCase().trim()}|${(e.grantee || "").toLowerCase().trim()}|${e.eventDate ? new Date(e.eventDate).toISOString().slice(0, 10) : "nodate"}`
    )
  );

  const prompt = `Analyze these real estate transaction documents for the deal "${deal.title}" and extract a chronological title history — the chain of ownership, liens, encumbrances, and related title events.

Return ONLY a JSON array of title event objects. Each event must have:
- "eventDate": ISO date string (YYYY-MM-DD) if a date is found, otherwise null
- "eventType": one of ${JSON.stringify(VALID_EVENT_TYPES)}
- "grantor": the party transferring/granting (e.g., seller, mortgagor, lien holder) or null
- "grantee": the party receiving (e.g., buyer, mortgagee, lien beneficiary) or null
- "description": brief description of the event
- "recordingInfo": book/page number, instrument number, or recording reference if available, otherwise null
- "sourceDocumentId": the document ID from which this event was extracted (shown in the document headers as "ID: xxx"), or null

Event type guide:
- "deed_transfer": property ownership transfers (warranty deed, quitclaim deed, special warranty deed)
- "mortgage": new mortgage or deed of trust recorded
- "lien_filed": mechanic's lien, judgment lien, or other lien filed
- "lien_released": lien release or discharge recorded
- "easement": easement granted or recorded
- "title_commitment": title commitment or title insurance binder issued
- "satisfaction": mortgage satisfaction or payoff recorded
- "lis_pendens": notice of lis pendens filed
- "judgment": court judgment affecting title
- "tax_lien": tax lien filed (federal, state, or local)
- "hoa_lien": HOA or condo association lien
- "assignment": assignment of mortgage or other interest
- "subordination": subordination agreement recorded
- "other": any other title-related event

Only include events you can identify from the documents. Do NOT invent events or dates.

Return format: [{"eventDate": "YYYY-MM-DD or null", "eventType": "...", "grantor": "...", "grantee": "...", "description": "...", "recordingInfo": "...", "sourceDocumentId": "..."}]

Documents:
${combinedText.slice(0, 20000)}`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      temperature: 0.1,
      responseMimeType: "application/json",
    },
  });

  let responseText = "";
  if ((response as any).text) {
    responseText = (response as any).text;
  } else if ((response as any).candidates?.length) {
    for (const candidate of (response as any).candidates) {
      if (candidate.content?.parts) {
        for (const part of candidate.content.parts) {
          if (part.text) responseText += part.text;
        }
      }
    }
  }

  let parsed: any[];
  try {
    parsed = JSON.parse(responseText);
    if (!Array.isArray(parsed)) {
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        console.log("[TitleHistory] No title events JSON array found in AI response");
        return { eventsAdded: 0, eventsList: [] };
      }
    }
  } catch {
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error("[TitleHistory] Failed to parse title events JSON");
      return { eventsAdded: 0, eventsList: [] };
    }
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      console.error("[TitleHistory] Failed to parse extracted title events JSON");
      return { eventsAdded: 0, eventsList: [] };
    }
  }

  if (!Array.isArray(parsed)) {
    return { eventsAdded: 0, eventsList: [] };
  }

  const validDocIds = new Set(titleDocs.map(d => d.id));
  const eventsList: Array<{ eventType: string; grantor?: string; grantee?: string; eventDate?: string }> = [];
  let eventsAdded = 0;

  for (const item of parsed) {
    const eventType = VALID_EVENT_TYPES.includes(item.eventType) ? item.eventType : "other";
    const grantor = item.grantor?.trim() || null;
    const grantee = item.grantee?.trim() || null;

    let eventDate: Date | null = null;
    if (item.eventDate) {
      const d = new Date(item.eventDate);
      if (!Number.isNaN(d.getTime())) {
        eventDate = d;
      }
    }

    const dedupeKey = `${eventType}|${(grantor || "").toLowerCase().trim()}|${(grantee || "").toLowerCase().trim()}|${eventDate ? eventDate.toISOString().slice(0, 10) : "nodate"}`;

    if (existingKeys.has(dedupeKey)) {
      const existing = existingEvents.find(e => {
        const eKey = `${e.eventType}|${(e.grantor || "").toLowerCase().trim()}|${(e.grantee || "").toLowerCase().trim()}|${e.eventDate ? new Date(e.eventDate).toISOString().slice(0, 10) : "nodate"}`;
        return eKey === dedupeKey;
      });
      if (existing) {
        const updates: Record<string, any> = {};
        if (item.description && (!existing.description || item.description.length > existing.description.length)) {
          updates.description = item.description;
        }
        if (item.recordingInfo && !existing.recordingInfo) {
          updates.recordingInfo = item.recordingInfo;
        }
        const sourceDocId = item.sourceDocumentId && validDocIds.has(item.sourceDocumentId) ? item.sourceDocumentId : null;
        if (sourceDocId && !existing.sourceDocumentId) {
          updates.sourceDocumentId = sourceDocId;
        }
        if (Object.keys(updates).length > 0) {
          await db.update(dealTitleEvents)
            .set({ ...updates, updatedAt: new Date() })
            .where(eq(dealTitleEvents.id, existing.id));
        }
      }
      continue;
    }

    const sourceDocumentId = item.sourceDocumentId && validDocIds.has(item.sourceDocumentId) ? item.sourceDocumentId : null;

    await db.insert(dealTitleEvents).values({
      dealId,
      eventDate,
      eventType,
      grantor,
      grantee,
      description: item.description || null,
      recordingInfo: item.recordingInfo || null,
      sourceDocumentId,
    });

    existingKeys.add(dedupeKey);
    eventsList.push({
      eventType,
      grantor: grantor || undefined,
      grantee: grantee || undefined,
      eventDate: item.eventDate || undefined,
    });
    eventsAdded++;
  }

  console.log(`[TitleHistory] Extracted ${eventsAdded} title events for deal "${deal.title}"`);
  return { eventsAdded, eventsList };
}
