import { db } from "../db";
import { eq, and, sql, desc } from "drizzle-orm";
import * as schema from "@shared/schema";

export interface ThreadInfo {
  threadId: string;
  normalizedSubject: string;
  messageIdHeader?: string;
  referencesHeader?: string;
  inReplyToHeader?: string;
}

export interface ThreadMemberInfo {
  communicationId: string;
  threadPosition: number;
  isInclusive: boolean;
  hasUniqueContent: boolean;
}

export class EmailThreadingService {
  private static RE_FWD_PATTERN = /^(re|fwd|fw|aw|sv|antw):\s*/gi;
  
  static normalizeSubject(subject: string): string {
    let normalized = subject.trim();
    
    while (this.RE_FWD_PATTERN.test(normalized)) {
      normalized = normalized.replace(this.RE_FWD_PATTERN, "").trim();
      this.RE_FWD_PATTERN.lastIndex = 0;
    }
    
    return normalized.toLowerCase();
  }

  static extractMessageId(headers: Record<string, string> | null): string | undefined {
    if (!headers) return undefined;
    return headers["message-id"] || headers["Message-ID"] || headers["Message-Id"];
  }

  static extractReferences(headers: Record<string, string> | null): string | undefined {
    if (!headers) return undefined;
    return headers["references"] || headers["References"];
  }

  static extractInReplyTo(headers: Record<string, string> | null): string | undefined {
    if (!headers) return undefined;
    return headers["in-reply-to"] || headers["In-Reply-To"];
  }

  static generateThreadId(
    messageId?: string,
    references?: string,
    inReplyTo?: string,
    normalizedSubject?: string
  ): string {
    if (inReplyTo) {
      return inReplyTo.replace(/[<>]/g, "").split("@")[0] || inReplyTo;
    }
    
    if (references) {
      const refs = references.split(/\s+/);
      const firstRef = refs[0];
      if (firstRef) {
        return firstRef.replace(/[<>]/g, "").split("@")[0] || firstRef;
      }
    }
    
    if (normalizedSubject) {
      return `subject:${normalizedSubject.substring(0, 100)}`;
    }
    
    if (messageId) {
      return messageId.replace(/[<>]/g, "").split("@")[0] || messageId;
    }
    
    return `standalone:${Date.now()}`;
  }

  static async getOrCreateThread(
    caseId: string,
    threadInfo: ThreadInfo
  ): Promise<string> {
    const [existing] = await db
      .select()
      .from(schema.emailThreads)
      .where(
        and(
          eq(schema.emailThreads.caseId, caseId),
          eq(schema.emailThreads.threadId, threadInfo.threadId)
        )
      )
      .limit(1);

    if (existing) {
      return existing.id;
    }

    const [newThread] = await db
      .insert(schema.emailThreads)
      .values({
        caseId,
        threadId: threadInfo.threadId,
        normalizedSubject: threadInfo.normalizedSubject,
        originalSubject: threadInfo.normalizedSubject,
        participantCount: 0,
        messageCount: 0,
      })
      .returning();

    return newThread.id;
  }

  static async addMessageToThread(
    threadId: string,
    communicationId: string,
    threadInfo: ThreadInfo,
    emailTimestamp: Date
  ): Promise<ThreadMemberInfo> {
    const existingMembers = await db
      .select()
      .from(schema.emailThreadMembers)
      .where(eq(schema.emailThreadMembers.threadId, threadId))
      .orderBy(desc(schema.emailThreadMembers.threadPosition));

    const threadPosition = existingMembers.length + 1;
    
    const hasUniqueContent = true;

    await db.insert(schema.emailThreadMembers).values({
      threadId,
      communicationId,
      isInclusive: false,
      threadPosition,
      hasUniqueContent,
      referencesHeader: threadInfo.referencesHeader,
      inReplyToHeader: threadInfo.inReplyToHeader,
      messageIdHeader: threadInfo.messageIdHeader,
    });

    await db
      .update(schema.emailThreads)
      .set({
        messageCount: sql`${schema.emailThreads.messageCount} + 1`,
        dateEnd: emailTimestamp,
        updatedAt: new Date(),
      })
      .where(eq(schema.emailThreads.id, threadId));

    const [thread] = await db
      .select()
      .from(schema.emailThreads)
      .where(eq(schema.emailThreads.id, threadId));

    if (!thread.dateStart || emailTimestamp < thread.dateStart) {
      await db
        .update(schema.emailThreads)
        .set({ dateStart: emailTimestamp })
        .where(eq(schema.emailThreads.id, threadId));
    }

    return {
      communicationId,
      threadPosition,
      isInclusive: false,
      hasUniqueContent,
    };
  }

  static async determineInclusiveEmails(threadId: string): Promise<void> {
    await db
      .update(schema.emailThreadMembers)
      .set({ isInclusive: false })
      .where(eq(schema.emailThreadMembers.threadId, threadId));

    const members = await db
      .select({
        id: schema.emailThreadMembers.id,
        communicationId: schema.emailThreadMembers.communicationId,
        threadPosition: schema.emailThreadMembers.threadPosition,
      })
      .from(schema.emailThreadMembers)
      .where(eq(schema.emailThreadMembers.threadId, threadId))
      .orderBy(desc(schema.emailThreadMembers.threadPosition));

    if (members.length > 0) {
      const lastMember = members[0];
      
      await db
        .update(schema.emailThreadMembers)
        .set({ isInclusive: true })
        .where(eq(schema.emailThreadMembers.id, lastMember.id));

      await db
        .update(schema.emailThreads)
        .set({
          inclusiveMessageId: lastMember.communicationId,
          updatedAt: new Date(),
        })
        .where(eq(schema.emailThreads.id, threadId));
    }
  }

  static async processEmail(
    communicationId: string,
    caseId: string,
    subject: string,
    headers: Record<string, string> | null,
    timestamp: Date
  ): Promise<{ threadId: string; memberInfo: ThreadMemberInfo }> {
    const normalizedSubject = this.normalizeSubject(subject);
    const messageId = this.extractMessageId(headers);
    const references = this.extractReferences(headers);
    const inReplyTo = this.extractInReplyTo(headers);

    const threadIdStr = this.generateThreadId(
      messageId,
      references,
      inReplyTo,
      normalizedSubject
    );

    const threadInfo: ThreadInfo = {
      threadId: threadIdStr,
      normalizedSubject,
      messageIdHeader: messageId,
      referencesHeader: references,
      inReplyToHeader: inReplyTo,
    };

    const threadDbId = await this.getOrCreateThread(caseId, threadInfo);

    const memberInfo = await this.addMessageToThread(
      threadDbId,
      communicationId,
      threadInfo,
      timestamp
    );

    await db
      .update(schema.communications)
      .set({ emailThreadId: threadIdStr })
      .where(eq(schema.communications.id, communicationId));

    await this.determineInclusiveEmails(threadDbId);

    return { threadId: threadDbId, memberInfo };
  }

  static async getThreadsForCase(caseId: string): Promise<{
    threads: schema.EmailThread[];
    memberCounts: Map<string, number>;
  }> {
    const threads = await db
      .select()
      .from(schema.emailThreads)
      .where(eq(schema.emailThreads.caseId, caseId))
      .orderBy(desc(schema.emailThreads.messageCount));

    const memberCounts = new Map<string, number>();
    
    for (const thread of threads) {
      memberCounts.set(thread.id, thread.messageCount);
    }

    return { threads, memberCounts };
  }

  static async getThreadMembers(threadId: string): Promise<{
    thread: schema.EmailThread | null;
    members: (schema.EmailThreadMember & { communication?: schema.Communication })[];
  }> {
    const [thread] = await db
      .select()
      .from(schema.emailThreads)
      .where(eq(schema.emailThreads.id, threadId));

    if (!thread) {
      return { thread: null, members: [] };
    }

    const members = await db
      .select()
      .from(schema.emailThreadMembers)
      .where(eq(schema.emailThreadMembers.threadId, threadId))
      .orderBy(schema.emailThreadMembers.threadPosition);

    const membersWithCommunications = await Promise.all(
      members.map(async (member) => {
        const [communication] = await db
          .select()
          .from(schema.communications)
          .where(eq(schema.communications.id, member.communicationId));
        
        return { ...member, communication };
      })
    );

    return { thread, members: membersWithCommunications };
  }

  static async getInclusiveEmailsOnly(caseId: string): Promise<string[]> {
    const inclusiveMembers = await db
      .select({ communicationId: schema.emailThreadMembers.communicationId })
      .from(schema.emailThreadMembers)
      .innerJoin(
        schema.emailThreads,
        eq(schema.emailThreadMembers.threadId, schema.emailThreads.id)
      )
      .where(
        and(
          eq(schema.emailThreads.caseId, caseId),
          eq(schema.emailThreadMembers.isInclusive, true)
        )
      );

    return inclusiveMembers.map((m) => m.communicationId);
  }

  static async runCaseThreading(
    caseId: string,
    onProgress?: (processed: number, total: number) => void
  ): Promise<{
    totalEmails: number;
    threadsCreated: number;
    inclusiveEmails: number;
  }> {
    const communications = await db
      .select()
      .from(schema.communications)
      .where(
        and(
          eq(schema.communications.caseId, caseId),
          eq(schema.communications.communicationType, "email")
        )
      );

    const total = communications.length;
    let processed = 0;
    const threadIds = new Set<string>();

    for (const comm of communications) {
      const headers = comm.sourceMetadata as Record<string, string> | null;
      const timestamp = comm.timestamp || new Date();

      const result = await this.processEmail(
        comm.id,
        caseId,
        comm.subject,
        headers,
        timestamp
      );

      threadIds.add(result.threadId);

      processed++;
      if (onProgress) {
        onProgress(processed, total);
      }
    }

    const inclusiveEmails = await this.getInclusiveEmailsOnly(caseId);

    return {
      totalEmails: total,
      threadsCreated: threadIds.size,
      inclusiveEmails: inclusiveEmails.length,
    };
  }

  static async updateThreadParticipants(threadId: string): Promise<void> {
    const members = await db
      .select({ communicationId: schema.emailThreadMembers.communicationId })
      .from(schema.emailThreadMembers)
      .where(eq(schema.emailThreadMembers.threadId, threadId));

    const participants = new Set<string>();

    for (const member of members) {
      const [comm] = await db
        .select({ sender: schema.communications.sender, recipients: schema.communications.recipients })
        .from(schema.communications)
        .where(eq(schema.communications.id, member.communicationId));

      if (comm) {
        participants.add(comm.sender);
        if (Array.isArray(comm.recipients)) {
          for (const recipient of comm.recipients as string[]) {
            participants.add(recipient);
          }
        }
      }
    }

    await db
      .update(schema.emailThreads)
      .set({
        participantCount: participants.size,
        participants: Array.from(participants),
        updatedAt: new Date(),
      })
      .where(eq(schema.emailThreads.id, threadId));
  }
}

export default EmailThreadingService;
