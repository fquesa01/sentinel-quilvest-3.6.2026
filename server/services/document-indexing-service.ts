import { 
  getOrCreateFileSearchStore, 
  uploadDocumentToStore 
} from "./file-search-service";
import { db } from "../db";
import { communications, ingestedChatMessages, documentIndexStatus } from "@shared/schema";
import { eq, and, or, isNull, inArray, ne } from "drizzle-orm";
import crypto from "crypto";

/**
 * Document Indexing Service
 * Automatically indexes documents into Gemini File Search stores for RAG-powered search
 * 
 * Features:
 * - Incremental indexing (skip already-indexed documents)
 * - Content deduplication via SHA-256 hashing
 * - Status tracking and error recovery
 * - Retry logic for failed indexing
 */

// Current index version - increment when schema changes to force re-indexing
const CURRENT_INDEX_VERSION = 1;

export interface IndexDocumentConfig {
  caseId: string;
  documentId: string;
  content: Buffer | string;
  fileName: string;
  displayName?: string;
  metadata?: {
    documentType?: string;
    subject?: string;
    from?: string;
    to?: string;
    date?: string;
    [key: string]: string | undefined;
  };
}

/**
 * Generate SHA-256 content hash for deduplication
 */
function generateContentHash(content: string): string {
  return crypto.createHash('sha256').update(content.toLowerCase().trim()).digest('hex');
}

/**
 * Smart content extraction - removes noise and reduces token count
 * Removes: email signatures, quoted replies, excessive whitespace
 * Truncates: extremely long documents to prevent memory issues
 * FIX: More conservative signature removal to preserve legal disclaimers
 */
function extractRelevantContent(text: string): string {
  if (!text) return '';
  
  let content = text;
  
  // Remove mobile device signatures (very specific patterns only)
  content = content.replace(/\n\s*Sent from my (iPhone|iPad|Android|BlackBerry)\s*$/gi, '');
  content = content.replace(/\n\s*Get Outlook for (iOS|Android)\s*$/gi, '');
  
  // Remove common email client footers (but NOT general "-- " signatures which may contain disclaimers)
  content = content.replace(/\n\s*Sent via .+\s*$/gi, '');
  content = content.replace(/\n\s*Enviado desde mi .+\s*$/gi, ''); // Spanish mobile signatures
  
  // Remove quoted reply chains (lines starting with > or |)
  const lines = content.split('\n');
  const relevantLines = lines.filter(line => {
    const trimmed = line.trim();
    return !trimmed.startsWith('>') && !trimmed.startsWith('|');
  });
  content = relevantLines.join('\n');
  
  // Remove "On [date], [person] wrote:" headers (multiple patterns)
  content = content.replace(/^On .+ wrote:\s*$/gm, '');
  content = content.replace(/^From:[\s\S]+?Sent:[\s\S]+?To:[\s\S]+?Subject:[\s\S]+?$/gm, ''); // Outlook forwarded headers
  content = content.replace(/^-{2,} Forwarded message -{2,}[\s\S]*?^Subject:.+$/gm, ''); // Gmail forwarded
  
  // Remove excessive whitespace but preserve paragraph breaks
  content = content.replace(/[ \t]+/g, ' '); // Multiple spaces/tabs to single space
  content = content.replace(/\n{3,}/g, '\n\n'); // Max 2 consecutive newlines
  
  // Trim
  content = content.trim();
  
  // Truncate extremely long documents (keep first 10,000 chars)
  const MAX_LENGTH = 10000;
  if (content.length > MAX_LENGTH) {
    content = content.substring(0, MAX_LENGTH) + "\n\n[Content truncated for indexing - original message was " + content.length + " characters]";
  }
  
  return content;
}

/**
 * Strip HTML tags and extract text content
 */
function stripHtmlTags(html: string): string {
  if (!html) return '';
  
  // Remove script and style tags completely
  let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ');
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ');
  
  // Remove all HTML tags
  text = text.replace(/<[^>]*>/g, ' ');
  
  // Decode HTML entities
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  
  // Clean up whitespace
  text = text.replace(/\s+/g, ' ').trim();
  
  return text;
}

/**
 * Track start of indexing operation
 * FIX: Simplified upsert with WHERE clause to prevent concurrent indexing
 * Allows retries for failed/stale records while blocking duplicate work
 */
async function trackIndexingStart(documentId: string, caseId: string, contentHash: string): Promise<boolean> {
  const RECENT_INDEXING_WINDOW_SECONDS = 300; // 5 minutes
  
  // Use conditional upsert: only proceed if no recent 'indexing' record exists
  const result = await db.execute<{ id: string }>(sql`
    INSERT INTO document_indexing_status (
      id, document_id, case_id, status, content_hash, index_version, created_at, updated_at, retry_count
    )
    VALUES (
      gen_random_uuid(),
      ${documentId},
      ${caseId},
      'indexing',
      ${contentHash},
      ${CURRENT_INDEX_VERSION},
      NOW(),
      NOW(),
      0
    )
    ON CONFLICT (case_id, content_hash, index_version) 
    DO UPDATE SET
      document_id = EXCLUDED.document_id,
      status = 'indexing',
      updated_at = NOW(),
      retry_count = CASE
        WHEN document_indexing_status.status = 'failed' 
        THEN document_indexing_status.retry_count + 1
        ELSE 0
      END
    WHERE 
      -- Only allow update if NOT currently being indexed by someone else
      document_indexing_status.status != 'indexing'
      OR document_indexing_status.updated_at < NOW() - INTERVAL '${sql.raw(String(RECENT_INDEXING_WINDOW_SECONDS))} seconds'
    RETURNING id
  `);
  
  // If no rows returned, another batch is currently indexing this hash (recent 'indexing' status)
  if (result.rows.length === 0) {
    console.log(`[IndexingService] Concurrent indexing detected for hash ${contentHash.substring(0, 8)}... - skipping`);
    return false;
  }
  
  return true; // Successfully claimed the lock (inserted or updated to 'indexing')
}

/**
 * Track successful indexing
 */
async function trackIndexingSuccess(documentId: string): Promise<void> {
  await db
    .update(documentIndexStatus)
    .set({
      status: 'indexed',
      indexedAt: new Date(),
      errorMessage: null,
      updatedAt: new Date(),
    })
    .where(eq(documentIndexStatus.documentId, documentId));
}

/**
 * Track failed indexing with error message
 */
async function trackIndexingFailure(documentId: string, errorMessage: string): Promise<void> {
  // Get current retry count
  const [current] = await db
    .select()
    .from(documentIndexStatus)
    .where(eq(documentIndexStatus.documentId, documentId))
    .limit(1);
  
  const newRetryCount = current ? (current.retryCount || 0) + 1 : 1;
  
  await db
    .update(documentIndexStatus)
    .set({
      status: 'failed',
      errorMessage: errorMessage.substring(0, 500), // Limit error message length
      retryCount: newRetryCount,
      updatedAt: new Date(),
    })
    .where(eq(documentIndexStatus.documentId, documentId));
}

/**
 * Check if document is already indexed (and check for duplicates by content hash)
 * FIX: Now includes stale-lock recovery for crashed workers
 */
async function isAlreadyIndexed(documentId: string, contentHash: string, caseId: string): Promise<{ skip: boolean; reason?: string }> {
  const STALE_INDEXING_TIMEOUT_MINUTES = 30; // Reset stuck 'indexing' records after 30 minutes
  
  // Check if this exact document is already indexed or currently being indexed
  const [status] = await db
    .select()
    .from(documentIndexStatus)
    .where(
      and(
        eq(documentIndexStatus.documentId, documentId),
        eq(documentIndexStatus.indexVersion, CURRENT_INDEX_VERSION)
      )
    )
    .limit(1);

  if (status) {
    // If indexed, skip
    if (status.status === 'indexed') {
      return { skip: true, reason: 'already_indexed' };
    }
    
    // If indexing, check if stale (worker crashed)
    if (status.status === 'indexing') {
      const staleCutoff = new Date(Date.now() - STALE_INDEXING_TIMEOUT_MINUTES * 60 * 1000);
      if (status.updatedAt < staleCutoff) {
        console.log(`[IndexingService] Resetting stale 'indexing' record for ${documentId} (last updated ${status.updatedAt})`);
        // Reset to pending so it can be retried
        await db
          .update(documentIndexStatus)
          .set({ status: 'pending', updatedAt: new Date() })
          .where(eq(documentIndexStatus.documentId, documentId));
        return { skip: false }; // Allow retry
      }
      return { skip: true, reason: 'currently_indexing' };
    }
  }

  // Check for duplicate content (different document ID, same content hash)
  const [duplicate] = await db
    .select()
    .from(documentIndexStatus)
    .where(
      and(
        eq(documentIndexStatus.contentHash, contentHash),
        eq(documentIndexStatus.caseId, caseId),
        eq(documentIndexStatus.indexVersion, CURRENT_INDEX_VERSION),
        or(
          eq(documentIndexStatus.status, 'indexed'),
          eq(documentIndexStatus.status, 'indexing')
        )
      )
    )
    .limit(1);

  if (duplicate && duplicate.documentId !== documentId) {
    // Also check if duplicate 'indexing' record is stale
    if (duplicate.status === 'indexing') {
      const staleCutoff = new Date(Date.now() - STALE_INDEXING_TIMEOUT_MINUTES * 60 * 1000);
      if (duplicate.updatedAt < staleCutoff) {
        console.log(`[IndexingService] Stale duplicate 'indexing' record found - allowing retry`);
        return { skip: false };
      }
    }
    return { skip: true, reason: `duplicate_of_${duplicate.documentId}` };
  }

  return { skip: false };
}

/**
 * Index a single document into the File Search store for a case
 * Creates store automatically if it doesn't exist
 * Now with deduplication, status tracking, and error recovery
 */
export async function indexDocument(config: IndexDocumentConfig): Promise<void> {
  const contentString = typeof config.content === 'string' 
    ? config.content 
    : config.content.toString('utf-8');
  
  // Generate content hash for deduplication
  const contentHash = generateContentHash(contentString);
  
  try {
    // Check if already indexed or duplicate
    const { skip, reason } = await isAlreadyIndexed(config.documentId, contentHash, config.caseId);
    if (skip) {
      console.log(`[IndexingService] Skipping ${config.documentId}: ${reason}`);
      return;
    }

    console.log(`[IndexingService] Indexing document ${config.documentId} for case ${config.caseId}`);

    // Track indexing start - if returns false, another batch is indexing this hash
    const shouldProceed = await trackIndexingStart(config.documentId, config.caseId, contentHash);
    if (!shouldProceed) {
      console.log(`[IndexingService] Skipping ${config.documentId} - concurrent indexing in progress`);
      return;
    }

    // FIX: Wrap work in try/finally to ensure status is always updated
    try {
      // Get or create File Search store for this case
      const store = await getOrCreateFileSearchStore(config.caseId);

      // Convert content to Buffer if needed
      const contentBuffer = typeof config.content === 'string' 
        ? Buffer.from(config.content, 'utf-8')
        : config.content;

      // Prepare custom metadata for Gemini
      const customMetadata: Array<{ key: string; value: { stringValue?: string; numericValue?: number } }> = [
        { key: "document_id", value: { stringValue: config.documentId } },
        { key: "case_id", value: { stringValue: config.caseId } },
      ];

      // Add optional metadata
      if (config.metadata) {
        if (config.metadata.documentType) {
          customMetadata.push({ key: "document_type", value: { stringValue: config.metadata.documentType } });
        }
        if (config.metadata.subject) {
          customMetadata.push({ key: "subject", value: { stringValue: config.metadata.subject } });
        }
        if (config.metadata.from) {
          customMetadata.push({ key: "from", value: { stringValue: config.metadata.from } });
        }
        if (config.metadata.to) {
          customMetadata.push({ key: "to", value: { stringValue: config.metadata.to } });
        }
        if (config.metadata.date) {
          customMetadata.push({ key: "date", value: { stringValue: config.metadata.date } });
        }
      }

      // Upload to File Search store
      await uploadDocumentToStore({
        fileSearchStoreName: store.storeName,
        file: contentBuffer,
        fileName: config.fileName,
        displayName: config.displayName || config.fileName,
        customMetadata,
      });

      // Track successful indexing
      await trackIndexingSuccess(config.documentId);
      console.log(`[IndexingService] Successfully indexed document ${config.documentId}`);
    } catch (uploadError: any) {
      // Track failure to ensure status is updated even on crash
      console.error(`[IndexingService] Upload failed for ${config.documentId}:`, uploadError.message);
      await trackIndexingFailure(config.documentId, uploadError.message);
      throw uploadError; // Re-throw to outer catch
    }
  } catch (error: any) {
    console.error(`[IndexingService] Failed to index document ${config.documentId}:`, error.message);
    
    // Track failure
    await trackIndexingFailure(config.documentId, error.message);
    
    // Don't throw - indexing failures shouldn't break the main workflow
    // Documents will still be saved and accessible, just not searchable via RAG
  }
}

/**
 * Index a communication (email or chat message) from the database
 */
export async function indexCommunication(communicationId: string, caseId: string): Promise<void> {
  try {
    // Get communication from database
    const [comm] = await db
      .select()
      .from(communications)
      .where(eq(communications.id, communicationId));

    if (!comm) {
      console.error(`[IndexingService] Communication ${communicationId} not found`);
      return;
    }

    // Build searchable text content
    const contentParts: string[] = [];
    
    if (comm.subject) {
      contentParts.push(`Subject: ${comm.subject}`);
    }
    
    if (comm.from) {
      contentParts.push(`From: ${comm.from}`);
    }
    
    if (comm.to && comm.to.length > 0) {
      contentParts.push(`To: ${comm.to.join(", ")}`);
    }
    
    if (comm.cc && comm.cc.length > 0) {
      contentParts.push(`CC: ${comm.cc.join(", ")}`);
    }
    
    // Extract and clean body content
    let bodyContent = '';
    if (comm.bodyText) {
      bodyContent = extractRelevantContent(comm.bodyText);
    } else if (comm.bodyHtml) {
      const textContent = stripHtmlTags(comm.bodyHtml);
      bodyContent = extractRelevantContent(textContent);
    }
    
    if (bodyContent) {
      contentParts.push(`\n${bodyContent}`);
    }

    const fullContent = contentParts.join('\n');
    
    // Generate filename
    const fileName = `${comm.id}.txt`;
    const displayName = comm.subject || `Communication ${comm.id.substring(0, 8)}`;

    // Index the document
    await indexDocument({
      caseId,
      documentId: comm.id,
      content: fullContent,
      fileName,
      displayName,
      metadata: {
        documentType: comm.type || 'email',
        subject: comm.subject || undefined,
        from: comm.from || undefined,
        to: comm.to?.join(", ") || undefined,
        date: comm.sentAt?.toISOString() || undefined,
      },
    });
  } catch (error: any) {
    console.error(`[IndexingService] Failed to index communication ${communicationId}:`, error.message);
  }
}

/**
 * Get list of unindexed documents for a case (incremental indexing)
 * Returns document IDs that need indexing (never indexed, failed, or old version)
 */
export async function getUnindexedCommunications(caseId: string): Promise<string[]> {
  const comms = await db
    .select({ id: communications.id })
    .from(communications)
    .leftJoin(documentIndexStatus, eq(communications.id, documentIndexStatus.documentId))
    .where(
      and(
        eq(communications.caseId, caseId),
        or(
          // Never indexed
          isNull(documentIndexStatus.status),
          // Failed previously (retry)
          eq(documentIndexStatus.status, 'failed'),
          // Old index version (re-index after schema changes)
          and(
            eq(documentIndexStatus.status, 'indexed'),
            ne(documentIndexStatus.indexVersion, CURRENT_INDEX_VERSION)
          )
        )
      )
    );
  
  return comms.map(c => c.id);
}

/**
 * Get list of unindexed chat messages for a case
 */
export async function getUnindexedChatMessages(caseId: string): Promise<string[]> {
  const msgs = await db
    .select({ id: ingestedChatMessages.id })
    .from(ingestedChatMessages)
    .leftJoin(documentIndexStatus, eq(ingestedChatMessages.id, documentIndexStatus.documentId))
    .where(
      and(
        eq(ingestedChatMessages.caseId, caseId),
        or(
          isNull(documentIndexStatus.status),
          eq(documentIndexStatus.status, 'failed'),
          and(
            eq(documentIndexStatus.status, 'indexed'),
            ne(documentIndexStatus.indexVersion, CURRENT_INDEX_VERSION)
          )
        )
      )
    );
  
  return msgs.map(m => m.id);
}

/**
 * Index only new/unindexed documents for a case (incremental indexing)
 */
export async function indexNewDocumentsOnly(caseId: string): Promise<{ communicationsIndexed: number; chatMessagesIndexed: number }> {
  console.log(`[IndexingService] Starting incremental indexing for case ${caseId}`);
  
  // Get unindexed documents
  const unindexedComms = await getUnindexedCommunications(caseId);
  const unindexedChats = await getUnindexedChatMessages(caseId);
  
  console.log(`[IndexingService] Found ${unindexedComms.length} unindexed communications and ${unindexedChats.length} unindexed chat messages`);
  
  // Index them
  if (unindexedComms.length > 0) {
    await indexCommunicationsBatch(unindexedComms, caseId);
  }
  
  if (unindexedChats.length > 0) {
    await indexChatMessagesBatch(unindexedChats, caseId);
  }
  
  return {
    communicationsIndexed: unindexedComms.length,
    chatMessagesIndexed: unindexedChats.length,
  };
}

/**
 * Index documents with priority queue - high-priority documents indexed first
 * Allows users to search important documents within minutes, not hours
 * Priority order: 1) Flagged/important, 2) Has attachments, 3) Most recent
 */
export async function indexWithPriority(
  communicationIds: string[],
  caseId: string,
  options?: { highPriorityLimit?: number; onProgress?: (current: number, total: number) => void }
): Promise<{ highPriorityIndexed: number; lowPriorityIndexed: number }> {
  const HIGH_PRIORITY_LIMIT = options?.highPriorityLimit || 1000; // Index first 1000 high-priority docs immediately
  
  console.log(`[IndexingService] Priority-based indexing for ${communicationIds.length} communications`);
  
  // Get full communication records to sort by priority
  const comms = await db
    .select()
    .from(communications)
    .where(inArray(communications.id, communicationIds));
  
  // Sort by priority
  comms.sort((a, b) => {
    // Priority 1: Flagged/important
    const aImportant = a.importance === 'high' ? 1 : 0;
    const bImportant = b.importance === 'high' ? 1 : 0;
    if (aImportant !== bImportant) return bImportant - aImportant;
    
    // Priority 2: Has attachments
    const aHasAttach = a.hasAttachments ? 1 : 0;
    const bHasAttach = b.hasAttachments ? 1 : 0;
    if (aHasAttach !== bHasAttach) return bHasAttach - aHasAttach;
    
    // Priority 3: Most recent
    const aTime = a.sentAt?.getTime() || 0;
    const bTime = b.sentAt?.getTime() || 0;
    return bTime - aTime;
  });
  
  // Split into high and low priority
  const highPriority = comms.slice(0, HIGH_PRIORITY_LIMIT).map(c => c.id);
  const lowPriority = comms.slice(HIGH_PRIORITY_LIMIT).map(c => c.id);
  
  console.log(`[IndexingService] High-priority: ${highPriority.length}, Low-priority: ${lowPriority.length}`);
  
  // Index high-priority immediately
  if (highPriority.length > 0) {
    console.log(`[IndexingService] Indexing high-priority documents first...`);
    await indexCommunicationsBatch(highPriority, caseId, { onProgress: options?.onProgress });
    console.log(`[IndexingService] High-priority indexing complete - search is now available!`);
  }
  
  // Index low-priority in background (fire-and-forget)
  if (lowPriority.length > 0) {
    console.log(`[IndexingService] Starting background indexing of low-priority documents...`);
    indexCommunicationsBatch(lowPriority, caseId).catch(err => {
      console.error(`[IndexingService] Low-priority background indexing failed:`, err.message);
    });
  }
  
  return {
    highPriorityIndexed: highPriority.length,
    lowPriorityIndexed: lowPriority.length,
  };
}

/**
 * Batch index multiple communications with parallel processing
 * Configurable batch size and concurrency for optimal performance
 */
export async function indexCommunicationsBatch(
  communicationIds: string[], 
  caseId: string,
  options?: { batchSize?: number; concurrentBatches?: number; onProgress?: (current: number, total: number) => void }
): Promise<void> {
  const BATCH_SIZE = options?.batchSize || 50; // Process 50 docs per batch
  const CONCURRENT_BATCHES = options?.concurrentBatches || 5; // 5 batches in parallel
  const onProgress = options?.onProgress;
  
  console.log(`[IndexingService] Batch indexing ${communicationIds.length} communications for case ${caseId}`);
  console.log(`[IndexingService] Using batch size: ${BATCH_SIZE}, concurrent batches: ${CONCURRENT_BATCHES}`);
  
  // Split into chunks
  const chunks: string[][] = [];
  for (let i = 0; i < communicationIds.length; i += BATCH_SIZE) {
    chunks.push(communicationIds.slice(i, i + BATCH_SIZE));
  }
  
  let processedCount = 0;
  
  // Process chunks in parallel batches
  for (let i = 0; i < chunks.length; i += CONCURRENT_BATCHES) {
    const batchChunks = chunks.slice(i, i + CONCURRENT_BATCHES);
    
    // Process this set of chunks in parallel
    await Promise.all(
      batchChunks.map(async (chunk) => {
        for (const commId of chunk) {
          await indexCommunication(commId, caseId);
          processedCount++;
        }
      })
    );
    
    // Report progress
    if (onProgress) {
      onProgress(processedCount, communicationIds.length);
    }
    console.log(`[IndexingService] Progress: ${processedCount}/${communicationIds.length} communications indexed`);
  }
  
  console.log(`[IndexingService] Completed batch indexing for case ${caseId}`);
}

/**
 * Index a chat message from the ingested_chat_messages table
 */
export async function indexChatMessage(chatMessageId: string, caseId: string): Promise<void> {
  try {
    // Get chat message from database
    const [chatMsg] = await db
      .select()
      .from(ingestedChatMessages)
      .where(eq(ingestedChatMessages.id, chatMessageId));

    if (!chatMsg) {
      console.error(`[IndexingService] Chat message ${chatMessageId} not found`);
      return;
    }

    // Build searchable text content
    const contentParts: string[] = [];
    
    contentParts.push(`Chat Platform: ${chatMsg.sourceType}`);
    contentParts.push(`Conversation: ${chatMsg.conversationId}`);
    
    if (chatMsg.isGroup) {
      contentParts.push(`Group Chat: Yes`);
    }
    
    if (chatMsg.senderName) {
      contentParts.push(`From: ${chatMsg.senderName}`);
    } else if (chatMsg.senderPhone) {
      contentParts.push(`From: ${chatMsg.senderPhone}`);
    }
    
    if (chatMsg.participants) {
      const participantList = Array.isArray(chatMsg.participants) 
        ? chatMsg.participants.map((p: any) => p.display_name || p.phone || p.id).join(", ")
        : "Multiple participants";
      contentParts.push(`Participants: ${participantList}`);
    }
    
    if (chatMsg.sentAt) {
      contentParts.push(`Sent: ${chatMsg.sentAt.toISOString()}`);
    }
    
    // Extract and clean message text
    if (chatMsg.text) {
      const cleanedText = extractRelevantContent(chatMsg.text);
      contentParts.push(`\nMessage:\n${cleanedText}`);
    }
    
    if (chatMsg.mediaAttachments) {
      const mediaList = Array.isArray(chatMsg.mediaAttachments)
        ? chatMsg.mediaAttachments.map((m: any) => m.file_name || m.mime_type).join(", ")
        : "Media attached";
      contentParts.push(`\nAttachments: ${mediaList}`);
    }

    const fullContent = contentParts.join('\n');
    
    // Generate filename
    const fileName = `${chatMsg.id}.txt`;
    const displayName = chatMsg.text?.substring(0, 50) || `Chat ${chatMsg.id.substring(0, 8)}`;

    // Index the document
    await indexDocument({
      caseId,
      documentId: chatMsg.id,
      content: fullContent,
      fileName,
      displayName,
      metadata: {
        documentType: `chat_${chatMsg.sourceType}`,
        subject: chatMsg.conversationId || undefined,
        from: chatMsg.senderName || chatMsg.senderPhone || undefined,
        to: chatMsg.isGroup ? "Group Chat" : undefined,
        date: chatMsg.sentAt?.toISOString() || undefined,
      },
    });
  } catch (error: any) {
    console.error(`[IndexingService] Failed to index chat message ${chatMessageId}:`, error.message);
  }
}

/**
 * Batch index multiple chat messages with parallel processing
 */
export async function indexChatMessagesBatch(
  chatMessageIds: string[], 
  caseId: string,
  options?: { batchSize?: number; concurrentBatches?: number; onProgress?: (current: number, total: number) => void }
): Promise<void> {
  const BATCH_SIZE = options?.batchSize || 50;
  const CONCURRENT_BATCHES = options?.concurrentBatches || 5;
  const onProgress = options?.onProgress;
  
  console.log(`[IndexingService] Batch indexing ${chatMessageIds.length} chat messages for case ${caseId}`);
  console.log(`[IndexingService] Using batch size: ${BATCH_SIZE}, concurrent batches: ${CONCURRENT_BATCHES}`);
  
  // Split into chunks
  const chunks: string[][] = [];
  for (let i = 0; i < chatMessageIds.length; i += BATCH_SIZE) {
    chunks.push(chatMessageIds.slice(i, i + BATCH_SIZE));
  }
  
  let processedCount = 0;
  
  // Process chunks in parallel batches
  for (let i = 0; i < chunks.length; i += CONCURRENT_BATCHES) {
    const batchChunks = chunks.slice(i, i + CONCURRENT_BATCHES);
    
    await Promise.all(
      batchChunks.map(async (chunk) => {
        for (const msgId of chunk) {
          await indexChatMessage(msgId, caseId);
          processedCount++;
        }
      })
    );
    
    if (onProgress) {
      onProgress(processedCount, chatMessageIds.length);
    }
    console.log(`[IndexingService] Progress: ${processedCount}/${chatMessageIds.length} chat messages indexed`);
  }
  
  console.log(`[IndexingService] Completed chat message batch indexing for case ${caseId}`);
}
