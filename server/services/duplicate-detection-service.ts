import { db } from "../db";
import { communications, ingestedChatMessages, documentTags } from "@shared/schema";
import { eq, inArray, and, or, sql } from "drizzle-orm";
import { createHash } from "crypto";

export interface DuplicateGroup {
  groupId: string;
  type: 'exact' | 'near' | 'thread';
  masterDocumentId: string;
  duplicateCount: number;
  documents: Array<{
    id: string;
    sourceType: 'communication' | 'chat';
    subject: string | null;
    sender: string | null;
    timestamp: Date | null;
    contentHash?: string;
    tags?: Array<{ id: string; name: string }>;
  }>;
  similarityScore?: number; // For near duplicates
}

export interface DuplicateDetectionResult {
  totalDocuments: number;
  totalDuplicates: number;
  duplicateGroups: DuplicateGroup[];
}

/**
 * Normalize content for hashing to detect exact duplicates
 */
function normalizeContent(text: string | null): string {
  if (!text) return '';
  // Remove whitespace, lowercase, remove punctuation for better matching
  return text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .trim();
}

/**
 * Calculate SHA-256 hash of content
 */
function calculateContentHash(
  subject: string | null,
  body: string | null,
  sender: string | null
): string {
  const normalized = normalizeContent(`${subject || ''} ${body || ''} ${sender || ''}`);
  return createHash('sha256').update(normalized).digest('hex');
}

/**
 * Calculate similarity score between two strings (0-1)
 * Using Jaccard similarity coefficient
 */
function calculateSimilarity(str1: string, str2: string): number {
  const set1 = new Set(str1.toLowerCase().split(/\s+/));
  const set2 = new Set(str2.toLowerCase().split(/\s+/));
  
  if (set1.size === 0 && set2.size === 0) return 1;
  if (set1.size === 0 || set2.size === 0) return 0;
  
  const intersection = new Set(Array.from(set1).filter(x => set2.has(x)));
  const union = new Set([...Array.from(set1), ...Array.from(set2)]);
  
  return intersection.size / union.size;
}

// Type definitions for internal use
type CommunicationRecord = {
  id: string;
  subject: string | null;
  body: string | null;
  sender: string | null;
  recipients: string[] | null;
  timestamp: Date | null;
  messageId: string | null;
  inReplyTo: string | null;
  references: string[] | null;
};

type ChatMessageRecord = {
  id: string;
  text: string | null;
  senderName: string | null;
  sentAt: Date | null;
  conversationId: string | null;
};

/**
 * Detect duplicates in a set of communication IDs
 */
export async function detectCommunicationDuplicates(
  communicationIds: string[],
  threshold: number = 0.85 // Similarity threshold for near duplicates
): Promise<DuplicateGroup[]> {
  if (communicationIds.length === 0) return [];

  // Fetch all communications with their content
  const comms: CommunicationRecord[] = await db
    .select({
      id: communications.id,
      subject: communications.subject,
      body: communications.body,
      sender: communications.sender,
      recipients: communications.recipients,
      timestamp: communications.timestamp,
      messageId: communications.messageId,
      inReplyTo: communications.inReplyTo,
      references: communications.references,
    })
    .from(communications)
    .where(inArray(communications.id, communicationIds));

  // Calculate content hashes for exact duplicate detection
  const hashMap = new Map<string, CommunicationRecord[]>();
  const threadMap = new Map<string, CommunicationRecord[]>();
  
  for (const comm of comms) {
    // Calculate hash for exact duplicate detection
    const hash = calculateContentHash(comm.subject, comm.body, comm.sender);
    if (!hashMap.has(hash)) {
      hashMap.set(hash, []);
    }
    hashMap.get(hash)!.push(comm);

    // Group by thread (using references or inReplyTo)
    const threadId = comm.references?.[0] || comm.inReplyTo || comm.messageId;
    if (threadId) {
      if (!threadMap.has(threadId)) {
        threadMap.set(threadId, []);
      }
      threadMap.get(threadId)!.push(comm);
    }
  }

  const duplicateGroups: DuplicateGroup[] = [];
  const processedIds = new Set<string>();

  // Process exact duplicates
  for (const [hash, duplicates] of Array.from(hashMap.entries())) {
    if (duplicates.length > 1) {
      const master = duplicates[0];
      duplicateGroups.push({
        groupId: `exact_${hash.substring(0, 8)}`,
        type: 'exact',
        masterDocumentId: `comm_${master.id}`,
        duplicateCount: duplicates.length - 1,
        documents: duplicates.map((d: CommunicationRecord) => ({
          id: `comm_${d.id}`,
          sourceType: 'communication' as const,
          subject: d.subject,
          sender: d.sender,
          timestamp: d.timestamp,
          contentHash: hash,
        })),
      });
      duplicates.forEach((d: CommunicationRecord) => processedIds.add(d.id));
    }
  }

  // Process thread duplicates (not already marked as exact duplicates)
  for (const [threadId, threadDocs] of Array.from(threadMap.entries())) {
    const unprocessedThread = threadDocs.filter((d: CommunicationRecord) => !processedIds.has(d.id));
    if (unprocessedThread.length > 1) {
      const master = unprocessedThread[0];
      duplicateGroups.push({
        groupId: `thread_${threadId.substring(0, 8)}`,
        type: 'thread',
        masterDocumentId: `comm_${master.id}`,
        duplicateCount: unprocessedThread.length - 1,
        documents: unprocessedThread.map((d: CommunicationRecord) => ({
          id: `comm_${d.id}`,
          sourceType: 'communication' as const,
          subject: d.subject,
          sender: d.sender,
          timestamp: d.timestamp,
        })),
      });
      unprocessedThread.forEach((d: CommunicationRecord) => processedIds.add(d.id));
    }
  }

  // Process near duplicates (using similarity scoring)
  const unprocessedComms = comms.filter((c: CommunicationRecord) => !processedIds.has(c.id));
  const nearDuplicateGroups: DuplicateGroup[] = [];

  for (let i = 0; i < unprocessedComms.length; i++) {
    if (processedIds.has(unprocessedComms[i].id)) continue;

    const group: typeof comms = [unprocessedComms[i]];
    const masterContent = `${unprocessedComms[i].subject || ''} ${unprocessedComms[i].body || ''}`;

    for (let j = i + 1; j < unprocessedComms.length; j++) {
      if (processedIds.has(unprocessedComms[j].id)) continue;

      const compareContent = `${unprocessedComms[j].subject || ''} ${unprocessedComms[j].body || ''}`;
      const similarity = calculateSimilarity(masterContent, compareContent);

      if (similarity >= threshold) {
        group.push(unprocessedComms[j]);
      }
    }

    if (group.length > 1) {
      const master = group[0];
      nearDuplicateGroups.push({
        groupId: `near_${master.id.substring(0, 8)}`,
        type: 'near',
        masterDocumentId: `comm_${master.id}`,
        duplicateCount: group.length - 1,
        documents: group.map((d: CommunicationRecord) => ({
          id: `comm_${d.id}`,
          sourceType: 'communication' as const,
          subject: d.subject,
          sender: d.sender,
          timestamp: d.timestamp,
        })),
        similarityScore: threshold,
      });
      group.forEach((d: CommunicationRecord) => processedIds.add(d.id));
    }
  }

  return [...duplicateGroups, ...nearDuplicateGroups];
}

/**
 * Detect duplicates in chat messages
 */
export async function detectChatDuplicates(
  chatMessageIds: string[],
  threshold: number = 0.85
): Promise<DuplicateGroup[]> {
  if (chatMessageIds.length === 0) return [];

  // Fetch all chat messages
  const chats: ChatMessageRecord[] = await db
    .select({
      id: ingestedChatMessages.id,
      text: ingestedChatMessages.text,
      senderName: ingestedChatMessages.senderName,
      sentAt: ingestedChatMessages.sentAt,
      conversationId: ingestedChatMessages.conversationId,
    })
    .from(ingestedChatMessages)
    .where(inArray(ingestedChatMessages.id, chatMessageIds));

  const hashMap = new Map<string, ChatMessageRecord[]>();
  const conversationMap = new Map<string, ChatMessageRecord[]>();

  for (const chat of chats) {
    // Calculate hash for exact duplicate detection
    const hash = calculateContentHash(null, chat.text, chat.senderName);
    if (!hashMap.has(hash)) {
      hashMap.set(hash, []);
    }
    hashMap.get(hash)!.push(chat);

    // Group by conversation
    if (chat.conversationId) {
      if (!conversationMap.has(chat.conversationId)) {
        conversationMap.set(chat.conversationId, []);
      }
      conversationMap.get(chat.conversationId)!.push(chat);
    }
  }

  const duplicateGroups: DuplicateGroup[] = [];
  const processedIds = new Set<string>();

  // Process exact duplicates
  for (const [hash, duplicates] of Array.from(hashMap.entries())) {
    if (duplicates.length > 1) {
      const master = duplicates[0];
      duplicateGroups.push({
        groupId: `exact_chat_${hash.substring(0, 8)}`,
        type: 'exact',
        masterDocumentId: `chat_${master.id}`,
        duplicateCount: duplicates.length - 1,
        documents: duplicates.map((d: ChatMessageRecord) => ({
          id: `chat_${d.id}`,
          sourceType: 'chat' as const,
          subject: d.text,
          sender: d.senderName,
          timestamp: d.sentAt,
          contentHash: hash,
        })),
      });
      duplicates.forEach((d: ChatMessageRecord) => processedIds.add(d.id));
    }
  }

  // Process conversation thread duplicates
  for (const [convId, convDocs] of Array.from(conversationMap.entries())) {
    const unprocessedConv = convDocs.filter((d: ChatMessageRecord) => !processedIds.has(d.id));
    if (unprocessedConv.length > 1) {
      const master = unprocessedConv[0];
      duplicateGroups.push({
        groupId: `thread_chat_${convId.substring(0, 8)}`,
        type: 'thread',
        masterDocumentId: `chat_${master.id}`,
        duplicateCount: unprocessedConv.length - 1,
        documents: unprocessedConv.map((d: ChatMessageRecord) => ({
          id: `chat_${d.id}`,
          sourceType: 'chat' as const,
          subject: d.text,
          sender: d.senderName,
          timestamp: d.sentAt,
        })),
      });
      unprocessedConv.forEach((d: ChatMessageRecord) => processedIds.add(d.id));
    }
  }

  return duplicateGroups;
}

/**
 * Main duplicate detection function combining communications and chat messages
 */
export async function detectDuplicates(
  documentIds: {
    communicationIds: string[];
    chatMessageIds: string[];
  },
  options: {
    similarityThreshold?: number;
    includeNearDuplicates?: boolean;
    includeThreadDuplicates?: boolean;
  } = {}
): Promise<DuplicateDetectionResult> {
  const {
    similarityThreshold = 0.85,
    includeNearDuplicates = true,
    includeThreadDuplicates = true,
  } = options;

  const [commDuplicates, chatDuplicates] = await Promise.all([
    detectCommunicationDuplicates(documentIds.communicationIds, similarityThreshold),
    detectChatDuplicates(documentIds.chatMessageIds, similarityThreshold),
  ]);

  // Filter based on options
  let allGroups = [...commDuplicates, ...chatDuplicates];
  
  if (!includeNearDuplicates) {
    allGroups = allGroups.filter(g => g.type !== 'near');
  }
  
  if (!includeThreadDuplicates) {
    allGroups = allGroups.filter(g => g.type !== 'thread');
  }

  // Calculate totals
  const totalDocuments = documentIds.communicationIds.length + documentIds.chatMessageIds.length;
  const totalDuplicates = allGroups.reduce((sum, group) => sum + group.duplicateCount, 0);

  return {
    totalDocuments,
    totalDuplicates,
    duplicateGroups: allGroups,
  };
}

/**
 * Get duplicate groups for a specific set of document IDs
 * This is used by the bulk tagging preview to show duplicates
 */
export async function getDuplicatesForPreview(
  documentIds: {
    communicationIds: string[];
    chatMessageIds: string[];
  }
): Promise<{
  hasDuplicates: boolean;
  duplicateCount: number;
  duplicateGroups: Array<{
    type: string;
    count: number;
    sample: string;
  }>;
}> {
  const result = await detectDuplicates(documentIds, {
    includeNearDuplicates: true,
    includeThreadDuplicates: true,
  });

  if (result.totalDuplicates === 0) {
    return {
      hasDuplicates: false,
      duplicateCount: 0,
      duplicateGroups: [],
    };
  }

  // Summarize by type
  const typeGroups = result.duplicateGroups.reduce((acc, group) => {
    if (!acc[group.type]) {
      acc[group.type] = { count: 0, samples: [] };
    }
    acc[group.type].count += group.duplicateCount;
    if (acc[group.type].samples.length < 3) {
      acc[group.type].samples.push(
        group.documents[0].subject || group.documents[0].sender || 'Unknown'
      );
    }
    return acc;
  }, {} as Record<string, { count: number; samples: string[] }>);

  return {
    hasDuplicates: true,
    duplicateCount: result.totalDuplicates,
    duplicateGroups: Object.entries(typeGroups).map(([type, data]) => ({
      type,
      count: data.count,
      sample: data.samples.join(', '),
    })),
  };
}