import { GoogleGenAI } from "@google/genai";
import { db } from "../db";
import { documentBulletSummaries, communications } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });

export type BulletPoint = {
  text: string;
  category?: string;
};

export type DocumentBulletSummaryResult = {
  sourceType: "communication" | "data_room_document" | "court_pleading" | "case_document";
  sourceId: string;
  bullets: BulletPoint[];
  generatedAt: Date;
};

function generateContentHash(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex").substring(0, 64);
}

export async function generateBulletSummary(
  content: string,
  documentType: string = "document",
  maxBullets: number = 5
): Promise<BulletPoint[]> {
  if (!content || content.trim().length < 50) {
    return [];
  }

  const truncatedContent = content.substring(0, 8000);

  const prompt = `You are a legal document analyst. Extract the most important points from this ${documentType}.

CONTENT:
"""
${truncatedContent}
"""

Generate ${maxBullets} concise bullet points that capture the key information. Each bullet should be:
- 1-2 sentences maximum
- Actionable or informative
- Specific (include names, dates, amounts when available)

Return a JSON array with this exact structure:
[
  {"text": "Key point 1", "category": "action|finding|date|person|amount|risk|decision"},
  {"text": "Key point 2", "category": "action|finding|date|person|amount|risk|decision"}
]

Categories:
- "action": Action items or next steps
- "finding": Key findings or facts
- "date": Important dates or deadlines
- "person": Key people mentioned
- "amount": Financial figures or quantities
- "risk": Risks or concerns
- "decision": Decisions made or pending

Return valid JSON only. If the content is not meaningful, return an empty array [].`;

  try {
    const model = ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        maxOutputTokens: 1024,
        temperature: 0.3,
      },
    });

    const response = await model;
    const responseText = response.text || "";
    
    const cleanedText = responseText.replace(/```json\n?|\n?```/g, "").trim();
    
    try {
      const parsed = JSON.parse(cleanedText);
      if (Array.isArray(parsed)) {
        return parsed.slice(0, maxBullets).map((item: any) => ({
          text: String(item.text || ""),
          category: item.category,
        })).filter((b: BulletPoint) => b.text.length > 0);
      }
    } catch (parseError) {
      console.error("[BulletSummary] Failed to parse AI response:", parseError);
    }
    
    return [];
  } catch (error) {
    console.error("[BulletSummary] AI generation failed:", error);
    return [];
  }
}

export async function getCachedBulletSummary(
  sourceType: "communication" | "data_room_document" | "court_pleading" | "case_document",
  sourceId: string
): Promise<BulletPoint[] | null> {
  try {
    const cached = await db
      .select()
      .from(documentBulletSummaries)
      .where(
        and(
          eq(documentBulletSummaries.sourceType, sourceType),
          eq(documentBulletSummaries.sourceId, sourceId)
        )
      )
      .limit(1);

    if (cached.length > 0) {
      const summary = cached[0];
      if (summary.expiresAt && new Date(summary.expiresAt) < new Date()) {
        return null;
      }
      return summary.bullets as BulletPoint[];
    }
    
    return null;
  } catch (error) {
    console.error("[BulletSummary] Cache lookup failed:", error);
    return null;
  }
}

export async function saveBulletSummary(
  sourceType: "communication" | "data_room_document" | "court_pleading" | "case_document",
  sourceId: string,
  bullets: BulletPoint[],
  contentHash?: string
): Promise<void> {
  try {
    const existing = await db
      .select({ id: documentBulletSummaries.id })
      .from(documentBulletSummaries)
      .where(
        and(
          eq(documentBulletSummaries.sourceType, sourceType),
          eq(documentBulletSummaries.sourceId, sourceId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(documentBulletSummaries)
        .set({
          bullets,
          contentHash,
          generatedAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        })
        .where(eq(documentBulletSummaries.id, existing[0].id));
    } else {
      await db.insert(documentBulletSummaries).values({
        sourceType,
        sourceId,
        bullets,
        contentHash,
        generatedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
    }
  } catch (error) {
    console.error("[BulletSummary] Failed to save:", error);
  }
}

export async function getOrGenerateBulletSummary(
  sourceType: "communication" | "data_room_document" | "court_pleading" | "case_document",
  sourceId: string,
  content: string,
  documentType: string = "document"
): Promise<BulletPoint[]> {
  const cached = await getCachedBulletSummary(sourceType, sourceId);
  if (cached) {
    return cached;
  }

  const contentHash = generateContentHash(content);
  const bullets = await generateBulletSummary(content, documentType);
  
  if (bullets.length > 0) {
    await saveBulletSummary(sourceType, sourceId, bullets, contentHash);
  }
  
  return bullets;
}

export async function generateBulletSummariesForCommunications(
  communicationIds: string[]
): Promise<Map<string, BulletPoint[]>> {
  const results = new Map<string, BulletPoint[]>();
  
  for (const id of communicationIds) {
    const cached = await getCachedBulletSummary("communication", id);
    if (cached) {
      results.set(id, cached);
      continue;
    }

    try {
      const comm = await db
        .select({
          id: communications.id,
          subject: communications.subject,
          body: communications.body,
          sender: communications.sender,
          messageType: communications.messageType,
        })
        .from(communications)
        .where(eq(communications.id, id))
        .limit(1);

      if (comm.length > 0) {
        const content = `Subject: ${comm[0].subject || "No subject"}\nFrom: ${comm[0].sender || "Unknown"}\n\n${comm[0].body || ""}`;
        const bullets = await generateBulletSummary(content, comm[0].messageType || "email");
        
        if (bullets.length > 0) {
          await saveBulletSummary("communication", id, bullets, generateContentHash(content));
          results.set(id, bullets);
        }
      }
    } catch (error) {
      console.error(`[BulletSummary] Failed to generate for communication ${id}:`, error);
    }
  }
  
  return results;
}

export async function getBulletSummariesBatch(
  items: Array<{ sourceType: "communication" | "data_room_document" | "court_pleading" | "case_document"; sourceId: string }>
): Promise<Map<string, BulletPoint[]>> {
  const results = new Map<string, BulletPoint[]>();
  
  for (const item of items) {
    const cached = await getCachedBulletSummary(item.sourceType, item.sourceId);
    if (cached) {
      results.set(`${item.sourceType}:${item.sourceId}`, cached);
    }
  }
  
  return results;
}
