import { db } from "../db";
import * as schema from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { openai } from "../ai";

export interface ExtractedEntity {
  name: string;
  type: "person" | "organization";
  confidence: number;
  mentionCount: number;
  context?: string;
}

export interface ExtractionProgress {
  caseId: string;
  totalDocuments: number;
  processedDocuments: number;
  entitiesFound: number;
  status: "pending" | "processing" | "completed" | "error";
  startTime: Date;
  error?: string;
}

const extractionProgress: Map<string, ExtractionProgress> = new Map();

export function getExtractionProgress(caseId: string): ExtractionProgress | null {
  return extractionProgress.get(caseId) || null;
}

export async function extractEntitiesFromCase(
  caseId: string,
  onProgress?: (progress: ExtractionProgress) => void
): Promise<{ success: boolean; entitiesFound: number; error?: string }> {
  const progress: ExtractionProgress = {
    caseId,
    totalDocuments: 0,
    processedDocuments: 0,
    entitiesFound: 0,
    status: "pending",
    startTime: new Date(),
  };
  extractionProgress.set(caseId, progress);

  try {
    const communications = await db
      .select({
        id: schema.communications.id,
        body: schema.communications.body,
        subject: schema.communications.subject,
        sender: schema.communications.sender,
      })
      .from(schema.communications)
      .where(eq(schema.communications.caseId, caseId));

    progress.totalDocuments = communications.length;
    progress.status = "processing";
    onProgress?.(progress);

    console.log(`[EntityExtraction] Starting extraction for case ${caseId} with ${communications.length} documents`);

    const batchSize = 10;
    let totalEntitiesFound = 0;

    for (let i = 0; i < communications.length; i += batchSize) {
      const batch = communications.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (comm) => {
        if (!comm.body || comm.body.length < 50) {
          return [];
        }

        const contentToAnalyze = comm.body.substring(0, 8000);
        
        try {
          const entities = await extractEntitiesFromContent(contentToAnalyze, comm.subject || "");
          
          const entityRecords = entities.map((entity) => ({
            caseId,
            communicationId: comm.id,
            entityName: entity.name,
            entityType: entity.type,
            sourceType: "body" as const,
            confidence: entity.confidence,
            mentionCount: entity.mentionCount,
            context: entity.context,
          }));

          if (entityRecords.length > 0) {
            await db.insert(schema.communicationEntities).values(entityRecords);
          }

          return entities;
        } catch (err) {
          console.error(`[EntityExtraction] Error processing comm ${comm.id}:`, err);
          return [];
        }
      });

      const batchResults = await Promise.all(batchPromises);
      const batchEntities = batchResults.flat();
      totalEntitiesFound += batchEntities.length;

      progress.processedDocuments = Math.min(i + batchSize, communications.length);
      progress.entitiesFound = totalEntitiesFound;
      onProgress?.(progress);

      console.log(`[EntityExtraction] Processed ${progress.processedDocuments}/${progress.totalDocuments} docs, found ${totalEntitiesFound} entities`);

      if (i + batchSize < communications.length) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    progress.status = "completed";
    onProgress?.(progress);

    console.log(`[EntityExtraction] Completed extraction for case ${caseId}: ${totalEntitiesFound} entities found`);

    return { success: true, entitiesFound: totalEntitiesFound };
  } catch (error: any) {
    console.error(`[EntityExtraction] Error extracting entities:`, error);
    progress.status = "error";
    progress.error = error.message;
    onProgress?.(progress);
    return { success: false, entitiesFound: 0, error: error.message };
  }
}

async function extractEntitiesFromContent(
  content: string,
  subject: string
): Promise<ExtractedEntity[]> {
  const combinedText = subject ? `Subject: ${subject}\n\n${content}` : content;
  
  const prompt = `Analyze this document and extract all person names mentioned. Return ONLY a JSON array of objects with this exact structure:
{
  "entities": [
    {
      "name": "Full Person Name",
      "type": "person",
      "confidence": 95,
      "mentionCount": 3,
      "context": "Brief context about who this person is if apparent"
    }
  ]
}

Rules:
1. Only extract REAL PERSON NAMES (first and last name when available)
2. Do NOT include generic terms like "Document Upload", "System", email addresses, or company names
3. Confidence should be 50-100 based on how certain you are it's a real person name
4. If no person names are found, return {"entities": []}
5. Merge duplicate names and sum their mentionCount
6. Exclude common false positives like "Re:", "From:", "To:", etc.

Document content:
${combinedText}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an expert at extracting person names from documents. You return only valid JSON with no markdown formatting.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 2000,
    });

    const responseText = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(responseText);
    
    if (!parsed.entities || !Array.isArray(parsed.entities)) {
      return [];
    }

    return parsed.entities
      .filter((e: any) => 
        e.name && 
        typeof e.name === "string" && 
        e.name.length > 2 &&
        !e.name.toLowerCase().includes("document upload") &&
        !e.name.toLowerCase().includes("system") &&
        !e.name.includes("@")
      )
      .map((e: any) => ({
        name: e.name.trim(),
        type: "person" as const,
        confidence: Math.min(100, Math.max(0, e.confidence || 80)),
        mentionCount: e.mentionCount || 1,
        context: e.context || undefined,
      }));
  } catch (error: any) {
    console.error("[EntityExtraction] OpenAI API error:", error.message);
    return [];
  }
}

export async function getExtractedEntitiesForCase(caseId: string): Promise<{
  entities: Array<{
    name: string;
    email?: string;
    sourceType: "metadata" | "body";
    totalMentions: number;
    documentCount: number;
    confidence: number;
    contexts: string[];
  }>;
  totalUnique: number;
}> {
  try {
    const results = await db
      .select({
        entityName: schema.communicationEntities.entityName,
        email: schema.communicationEntities.email,
        sourceType: schema.communicationEntities.sourceType,
        mentionCount: schema.communicationEntities.mentionCount,
        confidence: schema.communicationEntities.confidence,
        context: schema.communicationEntities.context,
      })
      .from(schema.communicationEntities)
      .where(eq(schema.communicationEntities.caseId, caseId));
    
    if (!results || results.length === 0) {
      return { entities: [], totalUnique: 0 };
    }

    const entityMap = new Map<string, {
      name: string;
      email?: string;
      sourceType: "metadata" | "body";
      totalMentions: number;
      documentCount: number;
      confidenceSum: number;
      contexts: string[];
    }>();

    for (const row of results) {
      const key = row.entityName.toLowerCase();
      const existing = entityMap.get(key);
      
      if (existing) {
        existing.totalMentions += row.mentionCount || 1;
        existing.documentCount += 1;
        existing.confidenceSum += row.confidence || 80;
        if (row.context && !existing.contexts.includes(row.context)) {
          existing.contexts.push(row.context);
        }
        if (row.email && !existing.email) {
          existing.email = row.email;
        }
      } else {
        entityMap.set(key, {
          name: row.entityName,
          email: row.email || undefined,
          sourceType: row.sourceType as "metadata" | "body",
          totalMentions: row.mentionCount || 1,
          documentCount: 1,
          confidenceSum: row.confidence || 80,
          contexts: row.context ? [row.context] : [],
        });
      }
    }

    const entities = Array.from(entityMap.values())
      .map((e) => ({
        name: e.name,
        email: e.email,
        sourceType: e.sourceType,
        totalMentions: e.totalMentions,
        documentCount: e.documentCount,
        confidence: Math.round(e.confidenceSum / e.documentCount),
        contexts: e.contexts.slice(0, 3),
      }))
      .sort((a, b) => b.totalMentions - a.totalMentions);

    return {
      entities,
      totalUnique: entities.length,
    };
  } catch (error: any) {
    console.error("[EntityExtraction] Error getting extracted entities for case:", caseId);
    console.error("[EntityExtraction] Error details:", error?.message || error);
    if (error?.stack) {
      console.error("[EntityExtraction] Stack:", error.stack);
    }
    return { entities: [], totalUnique: 0 };
  }
}

export async function clearExtractedEntities(caseId: string): Promise<number> {
  const result = await db
    .delete(schema.communicationEntities)
    .where(eq(schema.communicationEntities.caseId, caseId));
  
  return (result as any).rowCount || 0;
}
