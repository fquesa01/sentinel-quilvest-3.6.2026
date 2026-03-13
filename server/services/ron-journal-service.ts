import crypto from "crypto";
import { db } from "../db";
import { eq, and, desc, asc, sql } from "drizzle-orm";
import { ronJournalEntries } from "@shared/schema";

function computeHash(data: string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

export async function createJournalEntry(params: {
  transactionId: string;
  sessionId?: string;
  notaryId?: string;
  eventType: string;
  actorType: string;
  actorId?: string;
  actorName?: string;
  description: string;
  eventData?: any;
  documentId?: string;
  signerId?: string;
  ipAddress?: string;
  metadata?: any;
}) {
  const result = await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${params.transactionId}))`);

    const lastEntry = await tx
      .select({ entryHash: ronJournalEntries.entryHash, sequenceNumber: ronJournalEntries.sequenceNumber })
      .from(ronJournalEntries)
      .where(eq(ronJournalEntries.transactionId, params.transactionId))
      .orderBy(desc(ronJournalEntries.sequenceNumber))
      .limit(1);

    const previousHash = lastEntry.length > 0 ? lastEntry[0].entryHash : null;
    const sequenceNumber = lastEntry.length > 0 ? lastEntry[0].sequenceNumber + 1 : 1;
    const timestamp = new Date();

    const hashPayload = JSON.stringify({
      transactionId: params.transactionId,
      sequenceNumber,
      eventType: params.eventType,
      actorId: params.actorId,
      description: params.description,
      eventData: params.eventData || {},
      documentId: params.documentId,
      signerId: params.signerId,
      previousHash: previousHash || "GENESIS",
      timestamp: timestamp.toISOString(),
    });

    const entryHash = computeHash(hashPayload);

    const [entry] = await tx
      .insert(ronJournalEntries)
      .values({
        transactionId: params.transactionId,
        sessionId: params.sessionId,
        notaryId: params.notaryId,
        sequenceNumber,
        eventType: params.eventType as any,
        actorType: params.actorType,
        actorId: params.actorId,
        actorName: params.actorName,
        description: params.description,
        eventData: params.eventData || {},
        documentId: params.documentId,
        signerId: params.signerId,
        previousHash: previousHash || "GENESIS",
        entryHash,
        timestamp,
        ipAddress: params.ipAddress,
        metadata: params.metadata || {},
      })
      .returning();

    return entry;
  });

  return result;
}

export async function getJournalEntries(transactionId: string) {
  return db
    .select()
    .from(ronJournalEntries)
    .where(eq(ronJournalEntries.transactionId, transactionId))
    .orderBy(asc(ronJournalEntries.sequenceNumber));
}

export async function verifyJournalChain(transactionId: string): Promise<{
  valid: boolean;
  totalEntries: number;
  brokenAt?: number;
  details?: string;
}> {
  const entries = await getJournalEntries(transactionId);
  if (entries.length === 0) {
    return { valid: true, totalEntries: 0 };
  }

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];

    if (i === 0 && entry.previousHash !== "GENESIS") {
      return {
        valid: false,
        totalEntries: entries.length,
        brokenAt: 1,
        details: "First entry does not have GENESIS as previous hash",
      };
    }

    if (i > 0 && entry.previousHash !== entries[i - 1].entryHash) {
      return {
        valid: false,
        totalEntries: entries.length,
        brokenAt: entry.sequenceNumber,
        details: `Entry ${entry.sequenceNumber} has mismatched previous hash`,
      };
    }

    const hashPayload = JSON.stringify({
      transactionId: entry.transactionId,
      sequenceNumber: entry.sequenceNumber,
      eventType: entry.eventType,
      actorId: entry.actorId,
      description: entry.description,
      eventData: entry.eventData || {},
      documentId: entry.documentId,
      signerId: entry.signerId,
      previousHash: entry.previousHash || "GENESIS",
      timestamp: entry.timestamp.toISOString(),
    });

    const recomputedHash = computeHash(hashPayload);
    if (recomputedHash !== entry.entryHash) {
      return {
        valid: false,
        totalEntries: entries.length,
        brokenAt: entry.sequenceNumber,
        details: `Entry ${entry.sequenceNumber} has been tampered with (hash mismatch)`,
      };
    }
  }

  return { valid: true, totalEntries: entries.length };
}
