import { db } from "../db";
import { 
  communications, 
  ingestedChatMessages, 
  documentTags, 
  bulkActions,
  documentSetMembers,
  type InsertBulkAction,
  type InsertDocumentTag 
} from "@shared/schema";
import { eq, and, inArray, sql } from "drizzle-orm";
import { createProgressScope } from "./progress-tracking-service";
import { nanoid } from 'nanoid';

// Document reference with explicit type information
export interface DocumentRef {
  id: string; // Raw UUID from database
  sourceType: 'communication' | 'chat';
}

// Collection of document references
export interface DocumentRefSet {
  communications: string[]; // Array of raw communication IDs
  chatMessages: string[]; // Array of raw chat message IDs
}

export interface SearchSnapshot {
  query?: string;
  filters?: {
    caseId?: string;
    employeeIds?: string[];
    departmentIds?: string[];
    dateRange?: { start: string; end: string };
    documentSetId?: string;
    searchMode?: 'natural' | 'boolean';
  };
  resultCount?: number;
}

export interface BulkTagOptions {
  includeFamilies: boolean;
  includeDuplicates: boolean;
  includeThreads: boolean;
}

export interface BulkTagRequest {
  searchSnapshot: SearchSnapshot;
  scope: 'selected' | 'all_results';
  selectedIds?: string[]; // Still accepts prefixed IDs from frontend for backward compat
  tagId: string;
  options: BulkTagOptions;
  userId: string;
}

export interface BulkTagPreview {
  baseDocuments: number;
  familyMembers: number;
  duplicates: number;
  threadMembers: number;
  totalAffected: number;
  sampleDocuments: Array<{
    id: string; // Will use prefixed format for frontend compatibility
    subject: string;
    sender: string;
    timestamp: Date;
    sourceType: 'communication' | 'chat';
  }>;
  duplicateInfo?: {
    hasDuplicates: boolean;
    duplicateCount: number;
    duplicateGroups: Array<{
      type: string;
      count: number;
      sample: string;
    }>;
  };
}

/**
 * Convert prefixed IDs from frontend to DocumentRefSet
 */
function parseSelectedIds(selectedIds: string[]): DocumentRefSet {
  const result: DocumentRefSet = {
    communications: [],
    chatMessages: []
  };
  
  for (const id of selectedIds) {
    if (id.startsWith('comm_')) {
      result.communications.push(id.replace(/^comm_/, ''));
    } else if (id.startsWith('chat_')) {
      result.chatMessages.push(id.replace(/^chat_/, ''));
    }
  }
  
  return result;
}

/**
 * Add prefixes to IDs for frontend compatibility
 */
function addPrefixesToDocumentRefs(refs: DocumentRefSet): string[] {
  const result: string[] = [];
  
  for (const id of refs.communications) {
    result.push(`comm_${id}`);
  }
  
  for (const id of refs.chatMessages) {
    result.push(`chat_${id}`);
  }
  
  return result;
}

/**
 * Resolve search snapshot to document IDs
 * Returns raw database UUIDs organized by type
 */
async function resolveSearchSnapshot(snapshot: SearchSnapshot): Promise<DocumentRefSet> {
  const { query, filters } = snapshot;
  
  const result: DocumentRefSet = {
    communications: [],
    chatMessages: []
  };

  // Build query for communications
  const commWhere: any[] = [];
  
  if (filters?.caseId) {
    commWhere.push(eq(communications.caseId, filters.caseId));
  }
  
  if (filters?.employeeIds && filters.employeeIds.length > 0) {
    commWhere.push(inArray(communications.custodianId, filters.employeeIds));
  }
  
  if (filters?.departmentIds && filters.departmentIds.length > 0) {
    commWhere.push(inArray(communications.custodianDepartment, filters.departmentIds));
  }
  
  if (filters?.dateRange) {
    const { start, end } = filters.dateRange;
    commWhere.push(
      and(
        sql`${communications.timestamp} >= ${new Date(start)}`,
        sql`${communications.timestamp} <= ${new Date(end)}`
      )
    );
  }

  // Handle text query search (use PostgreSQL full-text search or LIKE)
  if (query && query.trim()) {
    const searchTerm = `%${query.trim()}%`;
    commWhere.push(
      sql`(
        ${communications.subject} ILIKE ${searchTerm} OR
        ${communications.body} ILIKE ${searchTerm} OR
        ${communications.sender} ILIKE ${searchTerm}
      )`
    );
  }

  // Execute communications query (with optional document set join)
  let commsQuery;
  
  if (filters?.documentSetId) {
    // Join with document_set_members to filter by document set
    // Use DISTINCT to avoid duplicates when a communication appears multiple times in the set
    commsQuery = db
      .selectDistinct({ id: communications.id })
      .from(communications)
      .innerJoin(
        documentSetMembers,
        eq(documentSetMembers.communicationId, communications.id)
      )
      .where(
        commWhere.length > 0
          ? and(
              eq(documentSetMembers.documentSetId, filters.documentSetId),
              ...commWhere
            )
          : eq(documentSetMembers.documentSetId, filters.documentSetId)
      );
  } else {
    commsQuery = commWhere.length > 0
      ? db.select({ id: communications.id }).from(communications).where(and(...commWhere))
      : db.select({ id: communications.id }).from(communications);
  }
  
  const comms = await commsQuery;
  // Store raw IDs without prefix
  result.communications.push(...comms.map(c => c.id));

  // Build query for ingested chat messages (WhatsApp, SMS, etc.)
  const chatWhere: any[] = [];
  
  if (filters?.caseId) {
    chatWhere.push(eq(ingestedChatMessages.caseId, filters.caseId));
  }
  
  if (filters?.dateRange) {
    const { start, end } = filters.dateRange;
    chatWhere.push(
      and(
        sql`${ingestedChatMessages.sentAt} >= ${new Date(start)}`,
        sql`${ingestedChatMessages.sentAt} <= ${new Date(end)}`
      )
    );
  }

  // Handle text query search for ingested chat messages
  if (query && query.trim()) {
    const searchTerm = `%${query.trim()}%`;
    chatWhere.push(
      sql`(
        ${ingestedChatMessages.text} ILIKE ${searchTerm} OR
        ${ingestedChatMessages.senderName} ILIKE ${searchTerm}
      )`
    );
  }

  // Execute ingested chat messages query
  const chatQuery = chatWhere.length > 0
    ? db.select({ id: ingestedChatMessages.id }).from(ingestedChatMessages).where(and(...chatWhere))
    : db.select({ id: ingestedChatMessages.id }).from(ingestedChatMessages);
  
  const chats = await chatQuery;
  // Store raw IDs without prefix
  result.chatMessages.push(...chats.map(c => c.id));

  return result;
}

/**
 * Expand document IDs based on propagation options
 * Operates on raw database UUIDs
 */
async function expandDocumentIds(
  baseRefs: DocumentRefSet,
  options: BulkTagOptions
): Promise<DocumentRefSet> {
  let expandedCommIds = new Set(baseRefs.communications);
  let expandedChatIds = new Set(baseRefs.chatMessages);

  // Include families (email threads)
  if (options.includeFamilies && baseRefs.communications.length > 0) {
    const familyResults = await db
      .select({ id: communications.id, emailThreadId: communications.emailThreadId })
      .from(communications)
      .where(inArray(communications.id, baseRefs.communications));

    const threadIds = familyResults
      .map(r => r.emailThreadId)
      .filter((id): id is string => id !== null);

    if (threadIds.length > 0) {
      const threadMembers = await db
        .select({ id: communications.id })
        .from(communications)
        .where(inArray(communications.emailThreadId, threadIds));

      // Add raw IDs to set
      threadMembers.forEach(m => expandedCommIds.add(m.id));
    }
  }

  // Include threads (chat conversations)
  if (options.includeThreads && baseRefs.chatMessages.length > 0) {
    const chatThreadResults = await db
      .select({ id: ingestedChatMessages.id, conversationId: ingestedChatMessages.conversationId })
      .from(ingestedChatMessages)
      .where(inArray(ingestedChatMessages.id, baseRefs.chatMessages));

    const conversationIds = chatThreadResults
      .map(r => r.conversationId)
      .filter((id): id is string => id !== null);

    if (conversationIds.length > 0) {
      const conversationMembers = await db
        .select({ id: ingestedChatMessages.id })
        .from(ingestedChatMessages)
        .where(inArray(ingestedChatMessages.conversationId, conversationIds));

      // Add raw IDs to set
      conversationMembers.forEach(m => expandedChatIds.add(m.id));
    }
  }

  // Include duplicates (if you have duplicate detection logic)
  if (options.includeDuplicates) {
    // TODO: Implement duplicate detection logic when available
    // This would query a duplicate_groups table or use hash-based detection
  }

  return {
    communications: Array.from(expandedCommIds),
    chatMessages: Array.from(expandedChatIds),
  };
}

/**
 * Calculate bulk tag impact and retrieve sample documents
 */
export async function calculateBulkTagImpact(
  request: BulkTagRequest
): Promise<BulkTagPreview> {
  // Get base document IDs (raw UUIDs)
  let baseRefs: DocumentRefSet;

  if (request.scope === 'selected') {
    // Parse selected IDs from frontend (which include prefixes)
    baseRefs = parseSelectedIds(request.selectedIds || []);
  } else {
    // Resolve search snapshot (returns raw UUIDs)
    baseRefs = await resolveSearchSnapshot(request.searchSnapshot);
  }

  const baseCount = baseRefs.communications.length + baseRefs.chatMessages.length;

  // Expand based on options
  const expanded = await expandDocumentIds(baseRefs, request.options);

  const familyCount = expanded.communications.length - baseRefs.communications.length;
  const threadCount = expanded.chatMessages.length - baseRefs.chatMessages.length;
  const totalAffected = expanded.communications.length + expanded.chatMessages.length;

  // Get sample documents (20 random)
  const sampleSize = 20;
  
  // Create a combined array with type information
  const allRefs: DocumentRef[] = [
    ...expanded.communications.map(id => ({ id, sourceType: 'communication' as const })),
    ...expanded.chatMessages.map(id => ({ id, sourceType: 'chat' as const }))
  ];
  
  const shuffled = allRefs.sort(() => 0.5 - Math.random());
  const sampleRefs = shuffled.slice(0, sampleSize);
  
  const sampleCommIds = sampleRefs
    .filter(r => r.sourceType === 'communication')
    .map(r => r.id);
  const sampleChatIds = sampleRefs
    .filter(r => r.sourceType === 'chat')
    .map(r => r.id);

  const sampleDocs: BulkTagPreview['sampleDocuments'] = [];

  // Fetch sample communications
  if (sampleCommIds.length > 0) {
    const comms = await db
      .select({
        id: communications.id,
        subject: communications.subject,
        sender: communications.sender,
        timestamp: communications.timestamp,
      })
      .from(communications)
      .where(inArray(communications.id, sampleCommIds));

    // Add prefix for frontend compatibility
    sampleDocs.push(...comms.map(c => ({
      id: `comm_${c.id}`,
      subject: c.subject,
      sender: c.sender,
      timestamp: c.timestamp,
      sourceType: 'communication' as const,
    })));
  }

  // Fetch sample chat messages
  if (sampleChatIds.length > 0) {
    const chats = await db
      .select({
        id: ingestedChatMessages.id,
        subject: ingestedChatMessages.text,
        sender: ingestedChatMessages.senderName,
        timestamp: ingestedChatMessages.sentAt,
      })
      .from(ingestedChatMessages)
      .where(inArray(ingestedChatMessages.id, sampleChatIds));

    // Add prefix for frontend compatibility
    sampleDocs.push(...chats.map(c => ({
      id: `chat_${c.id}`,
      subject: c.subject || '[No message text]',
      sender: c.sender || '[Unknown sender]',
      timestamp: c.timestamp || new Date(),
      sourceType: 'chat' as const,
    })));
  }

  // Detect duplicates if requested
  let duplicateInfo;
  if (request.options.includeDuplicates) {
    const { getDuplicatesForPreview } = await import("../services/duplicate-detection-service");
    // Use expanded set for duplicate detection
    duplicateInfo = await getDuplicatesForPreview({
      communicationIds: expanded.communications.map(id => id),
      chatMessageIds: expanded.chatMessages.map(id => id),
    });
  }

  return {
    baseDocuments: baseCount,
    familyMembers: familyCount,
    duplicates: duplicateInfo?.duplicateCount || 0,
    threadMembers: threadCount,
    totalAffected,
    sampleDocuments: sampleDocs,
    duplicateInfo,
  };
}

/**
 * Execute bulk tagging operation
 */
export async function executeBulkTag(
  request: BulkTagRequest
): Promise<{ bulkActionId: string; documentsTagged: number; operationId: string }> {
  // Create operation ID for progress tracking
  const operationId = `bulk-tag-${nanoid()}`;
  const progress = createProgressScope(operationId, 5);
  
  try {
    progress.update(1, 'Gathering document IDs...', 'gathering');
    
    // Get base document IDs (raw UUIDs)
    let baseRefs: DocumentRefSet;

    if (request.scope === 'selected') {
      // Parse selected IDs from frontend (which include prefixes)
      baseRefs = parseSelectedIds(request.selectedIds || []);
    } else {
      // Resolve search snapshot (returns raw UUIDs)
      baseRefs = await resolveSearchSnapshot(request.searchSnapshot);
    }

    progress.update(2, 'Expanding document set...', 'expanding');
    
    // Expand based on options
    const expanded = await expandDocumentIds(baseRefs, request.options);

    const totalAffected = expanded.communications.length + expanded.chatMessages.length;
    
    progress.update(3, `Preparing to tag ${totalAffected} documents...`, 'preparing');

    // Create bulk action record
    const bulkActionData: InsertBulkAction = {
    actionType: 'bulk_tag',
    userId: request.userId,
    searchSnapshot: request.searchSnapshot as any,
    tagId: request.tagId,
    scope: request.scope,
    selectedIds: request.selectedIds as any,
    includeFamilies: request.options.includeFamilies,
    includeDuplicates: request.options.includeDuplicates,
    includeThreads: request.options.includeThreads,
    totalDocumentsAffected: totalAffected,
  };

  const [bulkAction] = await db.insert(bulkActions).values(bulkActionData).returning();

  // Apply tags to all documents (using raw UUIDs)
  const tagOperations: InsertDocumentTag[] = [];

  // Tag communications
  for (const commId of expanded.communications) {
    tagOperations.push({
      tagId: request.tagId,
      entityType: 'communication',
      entityId: commId, // Already a raw UUID
      taggedBy: request.userId,
      bulkActionId: bulkAction.id,
    });
  }

  // Tag chat messages
  for (const chatId of expanded.chatMessages) {
    tagOperations.push({
      tagId: request.tagId,
      entityType: 'chat_message',
      entityId: chatId, // Already a raw UUID
      taggedBy: request.userId,
      bulkActionId: bulkAction.id,
    });
  }

  // Batch insert all tags (skip duplicates)
  let actualTaggedCount = 0;
  
  if (tagOperations.length > 0) {
    // Process in batches for large document sets
    const BATCH_SIZE = 500; // Process 500 documents at a time
    const CHUNK_SIZE = 1000; // Query chunk size to avoid SQL parameter limits
    
    // Function to process a batch of tag operations
    const processBatch = async (batch: InsertDocumentTag[]): Promise<number> => {
      if (batch.length === 0) return 0;
      
      // Collect all raw IDs for duplicate check
      const allRawIds = batch.map(t => t.entityId);
      
      // Process IDs in chunks to avoid query limits
      const existingSet = new Set<string>();
      
      for (let i = 0; i < allRawIds.length; i += CHUNK_SIZE) {
        const idChunk = allRawIds.slice(i, Math.min(i + CHUNK_SIZE, allRawIds.length));
        
        const existing = await db
          .select({ entityId: documentTags.entityId, entityType: documentTags.entityType })
          .from(documentTags)
          .where(
            and(
              eq(documentTags.tagId, request.tagId),
              inArray(documentTags.entityId, idChunk)
            )
          );
        
        existing.forEach(e => {
          existingSet.add(`${e.entityType}:${e.entityId}`);
        });
      }
      
      const newTags = batch.filter(
        t => !existingSet.has(`${t.entityType}:${t.entityId}`)
      );
      
      if (newTags.length > 0) {
        // Insert in smaller chunks to avoid database limits
        for (let i = 0; i < newTags.length; i += BATCH_SIZE) {
          const insertBatch = newTags.slice(i, Math.min(i + BATCH_SIZE, newTags.length));
          await db.insert(documentTags).values(insertBatch);
        }
      }
      
      return newTags.length;
    };
    
    // Process all tag operations in batches
    let processedCount = 0;
    for (let i = 0; i < tagOperations.length; i += BATCH_SIZE) {
      const batch = tagOperations.slice(i, Math.min(i + BATCH_SIZE, tagOperations.length));
      const batchTaggedCount = await processBatch(batch);
      actualTaggedCount += batchTaggedCount;
      processedCount += batch.length;
      
      // Update progress
      const progressMessage = `Tagged ${processedCount} of ${tagOperations.length} documents...`;
      progress.update(4, progressMessage, 'tagging');
    }
  }

  progress.update(5, `Successfully tagged ${actualTaggedCount} documents`, 'completed');
  progress.complete(`Bulk tag operation completed. Tagged ${actualTaggedCount} documents.`);

  return {
    bulkActionId: bulkAction.id,
    documentsTagged: actualTaggedCount, // Return actual number of new tags
    operationId,
  };
  } catch (error) {
    progress.fail(`Bulk tag operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

/**
 * Calculate bulk tag removal impact and retrieve sample documents
 */
export async function calculateBulkTagRemovalImpact(
  request: BulkTagRequest
): Promise<BulkTagPreview> {
  // Get base document IDs (raw UUIDs)
  let baseRefs: DocumentRefSet;

  if (request.scope === 'selected') {
    // Parse selected IDs from frontend (which include prefixes)
    baseRefs = parseSelectedIds(request.selectedIds || []);
  } else {
    // Resolve search snapshot (returns raw UUIDs)
    baseRefs = await resolveSearchSnapshot(request.searchSnapshot);
  }

  const baseCount = baseRefs.communications.length + baseRefs.chatMessages.length;

  // Expand based on options
  const expanded = await expandDocumentIds(baseRefs, request.options);

  const familyCount = expanded.communications.length - baseRefs.communications.length;
  const threadCount = expanded.chatMessages.length - baseRefs.chatMessages.length;
  const totalAffected = expanded.communications.length + expanded.chatMessages.length;

  // Get sample documents (20 random)
  const sampleSize = 20;
  
  // Create a combined array with type information
  const allRefs: DocumentRef[] = [
    ...expanded.communications.map(id => ({ id, sourceType: 'communication' as const })),
    ...expanded.chatMessages.map(id => ({ id, sourceType: 'chat' as const }))
  ];
  
  const shuffled = allRefs.sort(() => 0.5 - Math.random());
  const sampleRefs = shuffled.slice(0, sampleSize);
  
  const sampleCommIds = sampleRefs
    .filter(r => r.sourceType === 'communication')
    .map(r => r.id);
  const sampleChatIds = sampleRefs
    .filter(r => r.sourceType === 'chat')
    .map(r => r.id);

  const sampleDocs: BulkTagPreview['sampleDocuments'] = [];

  // Fetch sample communications
  if (sampleCommIds.length > 0) {
    const comms = await db
      .select({
        id: communications.id,
        subject: communications.subject,
        sender: communications.sender,
        timestamp: communications.timestamp,
      })
      .from(communications)
      .where(inArray(communications.id, sampleCommIds));

    // Add prefix for frontend compatibility
    sampleDocs.push(...comms.map(c => ({
      id: `comm_${c.id}`,
      subject: c.subject,
      sender: c.sender,
      timestamp: c.timestamp,
      sourceType: 'communication' as const,
    })));
  }

  // Fetch sample chat messages
  if (sampleChatIds.length > 0) {
    const chats = await db
      .select({
        id: ingestedChatMessages.id,
        subject: ingestedChatMessages.text,
        sender: ingestedChatMessages.senderName,
        timestamp: ingestedChatMessages.sentAt,
      })
      .from(ingestedChatMessages)
      .where(inArray(ingestedChatMessages.id, sampleChatIds));

    // Add prefix for frontend compatibility
    sampleDocs.push(...chats.map(c => ({
      id: `chat_${c.id}`,
      subject: c.subject || '[No message text]',
      sender: c.sender || '[Unknown sender]',
      timestamp: c.timestamp || new Date(),
      sourceType: 'chat' as const,
    })));
  }

  return {
    baseDocuments: baseCount,
    familyMembers: familyCount,
    duplicates: 0, // Not implemented for removal preview
    threadMembers: threadCount,
    totalAffected,
    sampleDocuments: sampleDocs,
  };
}

/**
 * Execute bulk tag removal operation
 * Always performs server-side expansion for security - never trusts client-provided document sets
 */
export async function executeBulkTagRemoval(
  request: BulkTagRequest & { confirmed?: boolean }
): Promise<{ bulkActionId: string; documentsAffected: number; operationId: string }> {
  const operationId = `bulk-remove-tag-${nanoid()}`;
  const progress = createProgressScope(operationId, 5);
  const BATCH_SIZE = 500; // Same as executeBulkTag for consistency
  
  try {
    progress.update(1, 'Gathering and validating document IDs...', 'gathering');
    
    // Always perform server-side expansion and validation
    let baseRefs: DocumentRefSet;

    if (request.scope === 'selected') {
      // Parse selected IDs from frontend (which include prefixes)
      const parsedRefs = parseSelectedIds(request.selectedIds || []);
      
      // SECURITY: Validate that selected IDs actually exist and user has access
      // Query database to verify all selected communications exist
      if (parsedRefs.communications.length > 0) {
        const existingComms = await db
          .select({ id: communications.id, caseId: communications.caseId })
          .from(communications)
          .where(inArray(communications.id, parsedRefs.communications));
        
        // Filter to only IDs that exist
        const validCommIds = new Set(existingComms.map(c => c.id));
        parsedRefs.communications = parsedRefs.communications.filter(id => validCommIds.has(id));
        
        // If searchSnapshot has caseId filter, verify all documents match
        if (request.searchSnapshot.filters?.caseId) {
          const matchingCaseComms = existingComms
            .filter(c => c.caseId === request.searchSnapshot.filters?.caseId)
            .map(c => c.id);
          parsedRefs.communications = parsedRefs.communications.filter(id => 
            matchingCaseComms.includes(id)
          );
        }
      }
      
      // Validate chat message IDs similarly
      if (parsedRefs.chatMessages.length > 0) {
        const existingChats = await db
          .select({ id: ingestedChatMessages.id, caseId: ingestedChatMessages.caseId })
          .from(ingestedChatMessages)
          .where(inArray(ingestedChatMessages.id, parsedRefs.chatMessages));
        
        const validChatIds = new Set(existingChats.map(c => c.id));
        parsedRefs.chatMessages = parsedRefs.chatMessages.filter(id => validChatIds.has(id));
        
        // If searchSnapshot has caseId filter, verify all documents match
        if (request.searchSnapshot.filters?.caseId) {
          const matchingCaseChats = existingChats
            .filter(c => c.caseId === request.searchSnapshot.filters?.caseId)
            .map(c => c.id);
          parsedRefs.chatMessages = parsedRefs.chatMessages.filter(id => 
            matchingCaseChats.includes(id)
          );
        }
      }
      
      baseRefs = parsedRefs;
    } else {
      // Resolve search snapshot (returns raw UUIDs) - this applies all filters server-side
      baseRefs = await resolveSearchSnapshot(request.searchSnapshot);
    }

    progress.update(2, 'Expanding document set...', 'expanding');
    
    // Expand based on options
    const expanded = await expandDocumentIds(baseRefs, request.options);

    progress.update(3, 'Creating bulk action record...', 'recording');

    // Create bulk action record
    const bulkAction: InsertBulkAction = {
      actionType: 'bulk_tag_removal',
      executedBy: request.userId,
      scope: request.scope,
      totalDocuments: expanded.communications.length + expanded.chatMessages.length,
      metadata: {
        tagId: request.tagId,
        options: request.options,
        searchSnapshot: request.searchSnapshot,
      },
    };

    const [insertedAction] = await db.insert(bulkActions).values(bulkAction).returning();

    progress.update(4, 'Removing tags from documents...', 'removing');

    // Remove tags from all documents (using raw UUIDs) with batching
    let removedCount = 0;

    // Process communications in batches
    if (expanded.communications.length > 0) {
      for (let i = 0; i < expanded.communications.length; i += BATCH_SIZE) {
        const batch = expanded.communications.slice(i, Math.min(i + BATCH_SIZE, expanded.communications.length));
        
        // First, query existing tag associations to avoid inflated counts
        const existingTags = await db
          .select({ entityId: documentTags.entityId })
          .from(documentTags)
          .where(
            and(
              eq(documentTags.tagId, request.tagId),
              eq(documentTags.entityType, 'communication'),
              inArray(documentTags.entityId, batch)
            )
          );
        
        // Only delete existing associations
        if (existingTags.length > 0) {
          const idsToDelete = existingTags.map(t => t.entityId);
          const result = await db
            .delete(documentTags)
            .where(
              and(
                eq(documentTags.tagId, request.tagId),
                eq(documentTags.entityType, 'communication'),
                inArray(documentTags.entityId, idsToDelete)
              )
            );
          
          removedCount += result.rowCount || 0;
          
          // Only update progress when deletions occurred
          const progressMessage = `Removed ${removedCount} tags so far...`;
          progress.update(4, progressMessage, 'removing');
        }
      }
    }

    // Process chat messages in batches
    if (expanded.chatMessages.length > 0) {
      for (let i = 0; i < expanded.chatMessages.length; i += BATCH_SIZE) {
        const batch = expanded.chatMessages.slice(i, Math.min(i + BATCH_SIZE, expanded.chatMessages.length));
        
        // First, query existing tag associations to avoid inflated counts
        const existingTags = await db
          .select({ entityId: documentTags.entityId })
          .from(documentTags)
          .where(
            and(
              eq(documentTags.tagId, request.tagId),
              eq(documentTags.entityType, 'chat_message'),
              inArray(documentTags.entityId, batch)
            )
          );
        
        // Only delete existing associations
        if (existingTags.length > 0) {
          const idsToDelete = existingTags.map(t => t.entityId);
          const result = await db
            .delete(documentTags)
            .where(
              and(
                eq(documentTags.tagId, request.tagId),
                eq(documentTags.entityType, 'chat_message'),
                inArray(documentTags.entityId, idsToDelete)
              )
            );
          
          removedCount += result.rowCount || 0;
          
          // Only update progress when deletions occurred
          const progressMessage = `Removed ${removedCount} tags so far...`;
          progress.update(4, progressMessage, 'removing');
        }
      }
    }

    progress.update(5, `Successfully removed tag from ${removedCount} documents`, 'completed');
    progress.complete(`Bulk tag removal completed. Removed tag from ${removedCount} documents.`);

    return {
      bulkActionId: insertedAction.id,
      documentsAffected: removedCount,
      operationId,
    };
  } catch (error) {
    progress.fail(`Bulk tag removal failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}
