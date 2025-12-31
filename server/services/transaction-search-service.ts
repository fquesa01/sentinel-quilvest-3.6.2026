import { db } from "../db";
import * as schema from "@shared/schema";
import { eq, inArray, sql, ilike, or, and, isNotNull, isNull } from "drizzle-orm";
import * as fileSearchService from "./file-search-service";
import { openai } from "../ai";
import { ObjectStorageService } from "../objectStorage";

// Queue for document indexing
let geminiIndexQueue: string[] = [];
let isGeminiIndexProcessing = false;

// Queue documents for Gemini indexing
export function queueDocumentsForGeminiIndexing(documentIds: string[]): void {
  geminiIndexQueue.push(...documentIds);
  console.log(`[GeminiIndex] Queued ${documentIds.length} documents for indexing. Queue size: ${geminiIndexQueue.length}`);
  processGeminiIndexQueue();
}

// Process the Gemini index queue
async function processGeminiIndexQueue(): Promise<void> {
  if (isGeminiIndexProcessing || geminiIndexQueue.length === 0) {
    return;
  }

  isGeminiIndexProcessing = true;

  while (geminiIndexQueue.length > 0) {
    const documentId = geminiIndexQueue.shift();
    if (!documentId) continue;

    try {
      await indexDocumentToGemini(documentId);
      // Rate limiting - wait 500ms between documents
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error: any) {
      console.error(`[GeminiIndex] Error indexing document ${documentId}:`, error.message);
    }
  }

  isGeminiIndexProcessing = false;
}

// Index a single document to Gemini
async function indexDocumentToGemini(documentId: string): Promise<void> {
  // Get document details
  const [doc] = await db
    .select()
    .from(schema.dataRoomDocuments)
    .where(eq(schema.dataRoomDocuments.id, documentId));

  if (!doc) {
    console.log(`[GeminiIndex] Document ${documentId} not found`);
    return;
  }

  // Get the data room to find the deal
  const [dataRoom] = await db
    .select()
    .from(schema.dataRooms)
    .where(eq(schema.dataRooms.id, doc.dataRoomId));

  if (!dataRoom || !dataRoom.dealId) {
    console.log(`[GeminiIndex] Document ${documentId} has no associated deal - skipping Gemini indexing`);
    return;
  }

  // Check if already indexed
  if (doc.indexStatus === "indexed") {
    console.log(`[GeminiIndex] Document ${documentId} already indexed`);
    return;
  }

  // Download the file from object storage
  const objectStorageService = new ObjectStorageService();
  
  try {
    const fileBuffer = await objectStorageService.downloadAsBuffer(doc.storagePath);
    
    // Upload and index to Gemini
    await uploadAndIndexDocument(
      documentId,
      fileBuffer,
      doc.fileName,
      dataRoom.dealId,
      {
        category: dataRoom.name,
        documentType: doc.fileType || undefined,
      }
    );
    
    // Mark as indexed
    await db
      .update(schema.dataRoomDocuments)
      .set({
        indexStatus: "indexed",
        updatedAt: new Date(),
      })
      .where(eq(schema.dataRoomDocuments.id, documentId));
    
    console.log(`[GeminiIndex] Successfully indexed document: ${doc.fileName}`);
  } catch (error: any) {
    console.error(`[GeminiIndex] Failed to index document ${doc.fileName}:`, error.message);
    
    // Mark as failed
    await db
      .update(schema.dataRoomDocuments)
      .set({
        indexStatus: "failed",
        updatedAt: new Date(),
      })
      .where(eq(schema.dataRoomDocuments.id, documentId));
  }
}

// Process pending documents on startup
export async function processPendingGeminiIndexing(): Promise<void> {
  console.log("[GeminiIndex] Checking for pending documents to index...");

  // Find all documents that need indexing (pending status and have a deal)
  const pendingDocs = await db
    .select({
      id: schema.dataRoomDocuments.id,
      fileName: schema.dataRoomDocuments.fileName,
      dealId: schema.dataRooms.dealId,
    })
    .from(schema.dataRoomDocuments)
    .innerJoin(schema.dataRooms, eq(schema.dataRoomDocuments.dataRoomId, schema.dataRooms.id))
    .where(
      and(
        eq(schema.dataRoomDocuments.indexStatus, "pending"),
        isNotNull(schema.dataRooms.dealId)
      )
    );

  if (pendingDocs.length === 0) {
    console.log("[GeminiIndex] No pending documents to index");
    return;
  }

  console.log(`[GeminiIndex] Found ${pendingDocs.length} pending documents to index`);
  queueDocumentsForGeminiIndexing(pendingDocs.map(d => d.id));
}

// Search for documents by name across all deals and standalone data rooms
export async function findDocumentByName(
  searchQuery: string,
  dealName?: string
): Promise<{
  document: any;
  dataRoom: any;
  deal: any | null;
} | null> {
  // Create search pattern - handle common variations
  const searchPattern = `%${searchQuery.replace(/\s+/g, '%')}%`;
  
  // If dealName is provided, search only within deals
  if (dealName) {
    const dealPattern = `%${dealName.replace(/\s+/g, '%')}%`;
    const results = await db
      .select({
        document: schema.dataRoomDocuments,
        dataRoom: schema.dataRooms,
        deal: schema.deals,
      })
      .from(schema.dataRoomDocuments)
      .innerJoin(schema.dataRooms, eq(schema.dataRoomDocuments.dataRoomId, schema.dataRooms.id))
      .innerJoin(schema.deals, eq(schema.dataRooms.dealId, schema.deals.id))
      .where(
        and(
          ilike(schema.dataRoomDocuments.fileName, searchPattern),
          ilike(schema.deals.title, dealPattern)
        )
      )
      .limit(1);
    
    if (results.length > 0) {
      return results[0];
    }
    return null;
  }
  
  // Search across all documents (including standalone data rooms)
  // First try with deals
  const resultsWithDeal = await db
    .select({
      document: schema.dataRoomDocuments,
      dataRoom: schema.dataRooms,
      deal: schema.deals,
    })
    .from(schema.dataRoomDocuments)
    .innerJoin(schema.dataRooms, eq(schema.dataRoomDocuments.dataRoomId, schema.dataRooms.id))
    .innerJoin(schema.deals, eq(schema.dataRooms.dealId, schema.deals.id))
    .where(ilike(schema.dataRoomDocuments.fileName, searchPattern))
    .limit(1);
  
  if (resultsWithDeal.length > 0) {
    return resultsWithDeal[0];
  }
  
  // Then try standalone data rooms (no deal)
  const standaloneResults = await db
    .select({
      document: schema.dataRoomDocuments,
      dataRoom: schema.dataRooms,
    })
    .from(schema.dataRoomDocuments)
    .innerJoin(schema.dataRooms, eq(schema.dataRoomDocuments.dataRoomId, schema.dataRooms.id))
    .where(
      and(
        ilike(schema.dataRoomDocuments.fileName, searchPattern),
        isNull(schema.dataRooms.dealId)
      )
    )
    .limit(1);
  
  if (standaloneResults.length > 0) {
    return {
      ...standaloneResults[0],
      deal: null,
    };
  }

  return null;
}

// Search all documents across all deals for a query
export async function searchDocumentsGlobally(
  searchQuery: string,
  dealName?: string
): Promise<{
  documents: Array<{
    document: any;
    dataRoom: any;
    deal: any;
  }>;
}> {
  const searchPattern = `%${searchQuery.replace(/\s+/g, '%')}%`;
  
  let query = db
    .select({
      document: schema.dataRoomDocuments,
      dataRoom: schema.dataRooms,
      deal: schema.deals,
    })
    .from(schema.dataRoomDocuments)
    .innerJoin(schema.dataRooms, eq(schema.dataRoomDocuments.dataRoomId, schema.dataRooms.id))
    .innerJoin(schema.deals, eq(schema.dataRooms.dealId, schema.deals.id));

  let results;
  if (dealName) {
    const dealPattern = `%${dealName.replace(/\s+/g, '%')}%`;
    results = await query.where(
      and(
        or(
          ilike(schema.dataRoomDocuments.fileName, searchPattern),
          ilike(schema.dataRoomDocuments.aiSummary, searchPattern),
          ilike(schema.dataRoomDocuments.extractedText, searchPattern)
        ),
        ilike(schema.deals.title, dealPattern)
      )
    ).limit(10);
  } else {
    results = await query.where(
      or(
        ilike(schema.dataRoomDocuments.fileName, searchPattern),
        ilike(schema.dataRoomDocuments.aiSummary, searchPattern),
        ilike(schema.dataRoomDocuments.extractedText, searchPattern)
      )
    ).limit(10);
  }

  return { documents: results };
}

// Get or create a file search store for a deal
export async function getOrCreateDealFileSearchStore(dealId: string): Promise<{ id: string; storeName: string }> {
  // Check if store already exists
  const [existingStore] = await db
    .select()
    .from(schema.fileSearchStores)
    .where(eq(schema.fileSearchStores.dealId, dealId));

  if (existingStore) {
    return {
      id: existingStore.id,
      storeName: existingStore.storeName,
    };
  }

  // Get deal info for display name
  const [deal] = await db
    .select()
    .from(schema.deals)
    .where(eq(schema.deals.id, dealId));

  if (!deal) {
    throw new Error("Deal not found");
  }

  // Create new Gemini File Search store using the existing service pattern
  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });

  const geminiStore = await ai.fileSearchStores.create({
    config: {
      displayName: `Transaction: ${deal.title}`,
    },
  });

  // Save to database - use raw SQL insert to avoid TypeScript issues with the schema
  const result = await db.execute(sql`
    INSERT INTO file_search_stores (deal_id, store_name, display_name)
    VALUES (${dealId}, ${geminiStore.name}, ${`Transaction: ${deal.title}`})
    RETURNING id, store_name as "storeName"
  `);
  
  const dbStore = (result as any).rows?.[0] || (result as any)[0];

  return {
    id: dbStore?.id,
    storeName: dbStore?.storeName || geminiStore.name,
  };
}

// Get file search store for a deal
export async function getDealFileSearchStore(dealId: string) {
  const [store] = await db
    .select()
    .from(schema.fileSearchStores)
    .where(eq(schema.fileSearchStores.dealId, dealId));
  return store || null;
}

// Upload and index a document for a deal
export async function uploadAndIndexDocument(
  documentId: string,
  fileBuffer: Buffer,
  fileName: string,
  dealId: string,
  metadata?: { category?: string; documentType?: string; parties?: string[] }
): Promise<void> {
  // Get or create the file search store
  const store = await getOrCreateDealFileSearchStore(dealId);

  // Update document status to indexing
  await db
    .update(schema.dataRoomDocuments)
    .set({ 
      indexStatus: "indexing",
      updatedAt: new Date(),
    })
    .where(eq(schema.dataRoomDocuments.id, documentId));

  try {
    // Convert metadata to the format expected by the SDK
    const customMetadata = metadata ? [
      ...(metadata.category ? [{ key: "document_category", value: { stringValue: metadata.category } }] : []),
      ...(metadata.documentType ? [{ key: "document_type", value: { stringValue: metadata.documentType } }] : []),
      ...(metadata.parties ? [{ key: "parties", value: { stringValue: metadata.parties.join(", ") } }] : []),
      { key: "deal_id", value: { stringValue: dealId } },
      { key: "upload_date", value: { stringValue: new Date().toISOString() } },
    ] : undefined;

    // Use the existing file search service to upload
    await fileSearchService.uploadDocumentToStore({
      fileSearchStoreName: store.storeName,
      file: fileBuffer,
      fileName,
      displayName: fileName,
      customMetadata,
    });

    // Update document status to indexed
    await db
      .update(schema.dataRoomDocuments)
      .set({
        indexStatus: "indexed",
        indexedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.dataRoomDocuments.id, documentId));

    console.log(`[TransactionSearch] Indexed document: ${fileName} for deal ${dealId}`);
  } catch (error: any) {
    console.error(`[TransactionSearch] Failed to index document:`, error);
    
    // Update document status to failed
    await db
      .update(schema.dataRoomDocuments)
      .set({
        indexStatus: "failed",
        updatedAt: new Date(),
      })
      .where(eq(schema.dataRoomDocuments.id, documentId));

    throw error;
  }
}

// Search documents within a specific deal
export async function searchDealDocuments(
  dealId: string,
  query: string,
  filters?: {
    documentCategory?: string;
    dateRange?: { start: string; end: string };
    documentType?: string;
  }
): Promise<{
  answer: string;
  citations: any[];
  documents: any[];
}> {
  // Get the file search store for this deal
  const store = await getDealFileSearchStore(dealId);

  if (!store) {
    return {
      answer: "No documents have been indexed for this transaction yet. Please upload documents to the data room first.",
      citations: [],
      documents: [],
    };
  }

  // Build query filters
  const queryFilters: fileSearchService.QueryFilters = {};
  if (filters?.dateRange) {
    queryFilters.dateRange = filters.dateRange;
  }
  if (filters?.documentType) {
    queryFilters.documentType = filters.documentType;
  }

  // Use the existing file search service to query
  const result = await fileSearchService.queryWithFilters(
    [store.storeName],
    query,
    Object.keys(queryFilters).length > 0 ? queryFilters : undefined
  );

  // Get the related documents from our database
  const documents = await db
    .select()
    .from(schema.dataRoomDocuments)
    .innerJoin(schema.dataRooms, eq(schema.dataRoomDocuments.dataRoomId, schema.dataRooms.id))
    .where(eq(schema.dataRooms.dealId, dealId))
    .limit(10);

  return {
    answer: result.text,
    citations: result.citations || [],
    documents: documents.map(d => d.data_room_documents),
  };
}

// Search documents across multiple deals (enterprise-wide search)
export async function searchAllTransactionDocuments(
  query: string,
  dealIds?: string[]
): Promise<{
  answer: string;
  citations: any[];
  dealResults: { dealId: string; dealTitle: string }[];
}> {
  // Get all file search stores for the specified deals (or all deals)
  let stores;
  if (dealIds && dealIds.length > 0) {
    stores = await db
      .select({
        store: schema.fileSearchStores,
        deal: schema.deals,
      })
      .from(schema.fileSearchStores)
      .innerJoin(schema.deals, eq(schema.fileSearchStores.dealId, schema.deals.id))
      .where(inArray(schema.fileSearchStores.dealId, dealIds));
  } else {
    stores = await db
      .select({
        store: schema.fileSearchStores,
        deal: schema.deals,
      })
      .from(schema.fileSearchStores)
      .innerJoin(schema.deals, eq(schema.fileSearchStores.dealId, schema.deals.id));
  }

  if (stores.length === 0) {
    return {
      answer: "No transaction documents have been indexed yet.",
      citations: [],
      dealResults: [],
    };
  }

  const storeNames = stores.map(s => s.store.storeName);

  // Query across all stores using the existing service
  const result = await fileSearchService.queryFileSearchStore({
    fileSearchStoreNames: storeNames,
    query,
  });

  return {
    answer: result.text,
    citations: result.citations || [],
    dealResults: stores.map(s => ({
      dealId: s.deal.id,
      dealTitle: s.deal.title,
    })),
  };
}

// Summarize a document
export async function summarizeDocument(documentId: string): Promise<string> {
  const [doc] = await db
    .select()
    .from(schema.dataRoomDocuments)
    .where(eq(schema.dataRoomDocuments.id, documentId));

  if (!doc) {
    throw new Error("Document not found");
  }

  // If we have extracted text, use it
  const textToSummarize = doc.extractedText || "";

  if (!textToSummarize) {
    // Try to get summary from the RAG system instead
    const [room] = await db
      .select()
      .from(schema.dataRooms)
      .where(eq(schema.dataRooms.id, doc.dataRoomId));
    
    if (room?.dealId) {
      const searchResult = await searchDealDocuments(
        room.dealId,
        `Please provide a comprehensive summary of the document named "${doc.fileName}". Include: document type, key parties, important terms, critical dates, financial terms if applicable, and key obligations.`
      );
      return searchResult.answer || "Unable to summarize - document may not be fully indexed.";
    }
    return "Unable to summarize - document text has not been extracted yet.";
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are a legal document analyst specializing in corporate transactions. Provide a concise but comprehensive summary of the document, highlighting:
1. Document type and purpose
2. Key parties involved
3. Important terms and conditions
4. Critical dates and deadlines
5. Financial terms (if applicable)
6. Key obligations and responsibilities
7. Notable risks or concerns`,
      },
      {
        role: "user",
        content: `Please summarize this document:\n\n${textToSummarize.substring(0, 50000)}`,
      },
    ],
    temperature: 0.3,
    max_tokens: 2000,
  });

  return response.choices[0]?.message?.content || "Unable to generate summary.";
}

// Compare two documents
export async function compareDocuments(
  documentId1: string,
  documentId2: string
): Promise<{
  similarities: string[];
  differences: string[];
  summary: string;
}> {
  const docs = await db
    .select()
    .from(schema.dataRoomDocuments)
    .where(inArray(schema.dataRoomDocuments.id, [documentId1, documentId2]));

  if (docs.length !== 2) {
    throw new Error("Both documents must exist");
  }

  const doc1 = docs.find(d => d.id === documentId1)!;
  const doc2 = docs.find(d => d.id === documentId2)!;

  const text1 = doc1.extractedText || "";
  const text2 = doc2.extractedText || "";

  if (!text1 || !text2) {
    return {
      similarities: [],
      differences: [],
      summary: "Unable to compare - document text has not been extracted for one or both documents.",
    };
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are a legal document analyst specializing in corporate transactions. Compare the two documents and provide:
1. A list of key similarities
2. A list of key differences
3. An overall summary of the comparison

Focus on legally significant terms, financial provisions, and material obligations.
Format your response as JSON with keys: similarities (array), differences (array), summary (string)`,
      },
      {
        role: "user",
        content: `Document 1 (${doc1.fileName}):\n${text1.substring(0, 25000)}\n\n---\n\nDocument 2 (${doc2.fileName}):\n${text2.substring(0, 25000)}`,
      },
    ],
    temperature: 0.3,
    max_tokens: 3000,
    response_format: { type: "json_object" },
  });

  try {
    const result = JSON.parse(response.choices[0]?.message?.content || "{}");
    return {
      similarities: result.similarities || [],
      differences: result.differences || [],
      summary: result.summary || "Comparison completed.",
    };
  } catch {
    return {
      similarities: [],
      differences: [],
      summary: response.choices[0]?.message?.content || "Unable to parse comparison results.",
    };
  }
}

// Analyze financial metrics from a deal's documents
export async function analyzeFinancials(dealId: string): Promise<{
  metrics: Record<string, any>;
  insights: string[];
  recommendations: string[];
}> {
  // Get the file search store
  const store = await getDealFileSearchStore(dealId);

  if (!store) {
    return {
      metrics: {},
      insights: ["No documents indexed for financial analysis."],
      recommendations: [],
    };
  }

  // Query for financial information using RAG
  const ragResult = await fileSearchService.queryFileSearchStore({
    fileSearchStoreNames: [store.storeName],
    query: "Extract all financial metrics, valuations, revenue figures, EBITDA, debt levels, and other key financial data from the transaction documents.",
  });

  const financialData = ragResult.text;

  // Process with GPT-4 for structured analysis
  const analysisResponse = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are a financial analyst specializing in M&A and corporate transactions. Based on the financial data extracted, provide:
1. Key financial metrics (as structured data)
2. Key insights about the financial health and valuation
3. Recommendations for the transaction

Format as JSON with keys: metrics (object), insights (array of strings), recommendations (array of strings)`,
      },
      {
        role: "user",
        content: `Financial data from transaction documents:\n\n${financialData}`,
      },
    ],
    temperature: 0.3,
    max_tokens: 2000,
    response_format: { type: "json_object" },
  });

  try {
    const analysis = JSON.parse(analysisResponse.choices[0]?.message?.content || "{}");
    return {
      metrics: analysis.metrics || {},
      insights: analysis.insights || [],
      recommendations: analysis.recommendations || [],
    };
  } catch {
    return {
      metrics: {},
      insights: [financialData || "Unable to extract financial data."],
      recommendations: [],
    };
  }
}

// Extract key terms from a contract
export async function extractContractTerms(documentId: string): Promise<{
  parties: string[];
  effectiveDate: string | null;
  termLength: string | null;
  keyTerms: { term: string; description: string }[];
  obligations: { party: string; obligation: string }[];
  terminationClauses: string[];
}> {
  const [doc] = await db
    .select()
    .from(schema.dataRoomDocuments)
    .where(eq(schema.dataRoomDocuments.id, documentId));

  if (!doc) {
    throw new Error("Document not found");
  }
  
  // Try to use extracted text first
  let textToAnalyze = doc.extractedText;
  
  // If no extracted text, try RAG
  if (!textToAnalyze) {
    const [room] = await db
      .select()
      .from(schema.dataRooms)
      .where(eq(schema.dataRooms.id, doc.dataRoomId));
    
    if (room?.dealId) {
      const result = await searchDealDocuments(
        room.dealId,
        `Extract all contract terms from the document "${doc.fileName}": parties, effective date, term length, key terms, obligations, and termination clauses.`
      );
      textToAnalyze = result.answer;
    }
  }

  if (!textToAnalyze) {
    return {
      parties: [],
      effectiveDate: null,
      termLength: null,
      keyTerms: [],
      obligations: [],
      terminationClauses: [],
    };
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are a legal document analyst. Extract key contract terms and structure them as JSON with the following keys:
- parties: array of party names
- effectiveDate: the effective date of the contract (or null)
- termLength: the term/duration of the contract (or null)
- keyTerms: array of {term: string, description: string}
- obligations: array of {party: string, obligation: string}
- terminationClauses: array of termination conditions`,
      },
      {
        role: "user",
        content: `Extract key terms from this contract:\n\n${textToAnalyze.substring(0, 50000)}`,
      },
    ],
    temperature: 0.2,
    max_tokens: 3000,
    response_format: { type: "json_object" },
  });

  try {
    return JSON.parse(response.choices[0]?.message?.content || "{}");
  } catch {
    return {
      parties: [],
      effectiveDate: null,
      termLength: null,
      keyTerms: [],
      obligations: [],
      terminationClauses: [],
    };
  }
}
