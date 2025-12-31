import { GoogleGenAI } from "@google/genai";
import { db } from "../db";
import { fileSearchStores, cases } from "@shared/schema";
import { eq } from "drizzle-orm";

// DON'T DELETE THIS COMMENT
// Using Google Gemini File Search for RAG-powered document search
// Reference: blueprint:javascript_gemini

// Validate API key is present
if (!process.env.GOOGLE_API_KEY) {
  throw new Error("GOOGLE_API_KEY environment variable is required for File Search RAG features");
}

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

export interface FileSearchStoreConfig {
  caseId: string;
  displayName: string;
}

export interface UploadDocumentConfig {
  fileSearchStoreName: string;
  file: Buffer;
  fileName: string;
  displayName?: string;
  customMetadata?: Array<{ key: string; value: { stringValue?: string; numericValue?: number } }>;
}

export interface QueryConfig {
  fileSearchStoreNames: string[];
  query: string;
  metadataFilter?: string;
}

export interface QueryFilters {
  dateRange?: { start: string; end: string };
  documentType?: string;
  participants?: string[];
  from?: string;
  to?: string;
}

export interface QueryResult {
  text: string;
  citations?: any[];
  groundingMetadata?: any;
}

/**
 * Build metadata filter string from structured filters
 * Reduces search space by 5-20x for faster queries
 */
export function buildMetadataFilter(filters: QueryFilters): string {
  const conditions: string[] = [];
  
  // Date range filter
  if (filters.dateRange) {
    conditions.push(`date >= "${filters.dateRange.start}" AND date <= "${filters.dateRange.end}"`);
  }
  
  // Document type filter
  if (filters.documentType) {
    conditions.push(`document_type = "${filters.documentType}"`);
  }
  
  // Sender filter
  if (filters.from) {
    conditions.push(`from = "${filters.from}"`);
  }
  
  // Recipient filter
  if (filters.to) {
    conditions.push(`to CONTAINS "${filters.to}"`);
  }
  
  // Participants filter (OR condition - any of these people)
  if (filters.participants && filters.participants.length > 0) {
    const participantConditions = filters.participants.map(p => 
      `(from = "${p}" OR to CONTAINS "${p}")`
    ).join(' OR ');
    conditions.push(`(${participantConditions})`);
  }
  
  return conditions.join(' AND ');
}

/**
 * Query with structured filters (convenience wrapper)
 */
export async function queryWithFilters(
  fileSearchStoreNames: string[],
  query: string,
  filters?: QueryFilters
): Promise<QueryResult> {
  const metadataFilter = filters ? buildMetadataFilter(filters) : undefined;
  
  return queryFileSearchStore({
    fileSearchStoreNames,
    query,
    metadataFilter,
  });
}

/**
 * Create a new File Search store for a case
 */
export async function createFileSearchStore(config: FileSearchStoreConfig): Promise<{ id: string; storeName: string }> {
  // Verify case exists
  const [caseExists] = await db.select().from(cases).where(eq(cases.id, config.caseId));
  if (!caseExists) {
    throw new Error("Case not found");
  }

  // Create the File Search store in Gemini
  const geminiStore = await ai.fileSearchStores.create({
    config: {
      displayName: config.displayName,
    },
  });

  // Save to database
  const [dbStore] = await db
    .insert(fileSearchStores)
    .values({
      caseId: config.caseId,
      storeName: geminiStore.name,
      displayName: config.displayName,
    })
    .returning();

  return {
    id: dbStore.id,
    storeName: dbStore.storeName,
  };
}

/**
 * Get File Search store for a case
 */
export async function getFileSearchStoreForCase(caseId: string) {
  const [store] = await db.select().from(fileSearchStores).where(eq(fileSearchStores.caseId, caseId));
  return store || null;
}

/**
 * List all File Search stores
 */
export async function listFileSearchStores(caseId?: string) {
  if (caseId) {
    return await db.select().from(fileSearchStores).where(eq(fileSearchStores.caseId, caseId));
  }
  return await db.select().from(fileSearchStores);
}

/**
 * Delete a File Search store
 */
export async function deleteFileSearchStore(id: string): Promise<void> {
  const [store] = await db.select().from(fileSearchStores).where(eq(fileSearchStores.id, id));
  
  if (!store) {
    throw new Error("File Search store not found");
  }

  // Delete from Gemini
  await ai.fileSearchStores.delete({
    name: store.storeName,
    force: true,
  });

  // Delete from database
  await db.delete(fileSearchStores).where(eq(fileSearchStores.id, id));
}

/**
 * Upload a document to a File Search store
 */
export async function uploadDocumentToStore(config: UploadDocumentConfig): Promise<void> {
  // Create a temporary file to pass to the SDK
  const tempFilePath = `/tmp/${config.fileName}`;
  const fs = await import("fs");
  fs.writeFileSync(tempFilePath, config.file);

  try {
    // Upload and import the file into the File Search store
    const operation = await ai.fileSearchStores.uploadToFileSearchStore({
      file: tempFilePath,
      fileSearchStoreName: config.fileSearchStoreName,
      config: {
        displayName: config.displayName || config.fileName,
        customMetadata: config.customMetadata,
      },
    });

    // Wait for import to complete
    let currentOp = operation;
    while (!currentOp.done) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      if (currentOp.name) {
        currentOp = await ai.operations.get({ name: currentOp.name });
      } else {
        break;
      }
    }

    console.log(`[FileSearchService] Uploaded document: ${config.fileName} to ${config.fileSearchStoreName}`);
  } finally {
    // Clean up temp file
    fs.unlinkSync(tempFilePath);
  }
}

/**
 * Query a File Search store using RAG
 */
export async function queryFileSearchStore(config: QueryConfig): Promise<QueryResult> {
  if (!config.fileSearchStoreNames?.length) {
    throw new Error("At least one File Search store name is required");
  }

  const result = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        role: "user",
        parts: [{ text: config.query }],
      },
    ],
    tools: [{ fileSearch: {} }],
    toolConfig: {
      fileSearch: {
        fileSearchStoreNames: config.fileSearchStoreNames,
        ...(config.metadataFilter && { metadataFilter: config.metadataFilter }),
      },
    },
  });

  const candidates = result.response?.candidates ?? [];
  const textSegments: string[] = [];

  for (const candidate of candidates) {
    const parts = candidate?.content?.parts ?? [];
    for (const part of parts) {
      if (typeof (part as { text?: unknown }).text === "string") {
        textSegments.push((part as { text: string }).text);
      }
    }
  }

  const primaryCandidate = candidates[0];
  const groundingMetadata = primaryCandidate?.groundingMetadata;
  const citations = groundingMetadata?.groundingChunks ?? [];

  return {
    text: textSegments.join("\n").trim(),
    citations,
    groundingMetadata,
  };
}

/**
 * Get or create File Search store for a case (ensures only one store per case)
 */
export async function getOrCreateFileSearchStore(caseId: string): Promise<{ id: string; storeName: string }> {
  // Check if store already exists
  const existing = await getFileSearchStoreForCase(caseId);
  if (existing) {
    return {
      id: existing.id,
      storeName: existing.storeName,
    };
  }

  // Get case details for display name
  const [caseData] = await db.select().from(cases).where(eq(cases.id, caseId));
  if (!caseData) {
    throw new Error("Case not found");
  }

  // Create new store
  return await createFileSearchStore({
    caseId,
    displayName: `${caseData.caseNumber} - ${caseData.title}`,
  });
}
