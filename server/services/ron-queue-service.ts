import { db } from "../db";
import { eq, and, inArray, isNull, asc, desc, sql } from "drizzle-orm";
import { ronTransactions, ronNotaries, ronSessions } from "@shared/schema";
import type { RonTransaction, RonNotary } from "@shared/schema";
import { createNotification } from "./notification-service";

export interface QueueStats {
  unassigned: number;
  queued: number;
  claimed: number;
  assigned: number;
  inProgress: number;
}

export async function getQueueStats(): Promise<QueueStats> {
  const transactions = await db.select().from(ronTransactions)
    .where(
      inArray(ronTransactions.status, ["draft", "pending_idv", "ready", "in_progress", "on_hold"])
    );

  const stats: QueueStats = { unassigned: 0, queued: 0, claimed: 0, assigned: 0, inProgress: 0 };
  for (const txn of transactions) {
    const qs = (txn.queueStatus as string) || "unassigned";
    if (qs === "unassigned") stats.unassigned++;
    else if (qs === "queued") stats.queued++;
    else if (qs === "claimed") stats.claimed++;
    else if (qs === "assigned") stats.assigned++;
    if (txn.status === "in_progress") stats.inProgress++;
  }
  return stats;
}

export async function getQueuedTransactions(): Promise<RonTransaction[]> {
  return db.select().from(ronTransactions)
    .where(
      and(
        inArray(ronTransactions.queueStatus, ["unassigned", "queued"]),
        inArray(ronTransactions.status, ["draft", "pending_idv", "ready", "in_progress", "on_hold"])
      )
    )
    .orderBy(desc(ronTransactions.queuePriority), asc(ronTransactions.scheduledDate), asc(ronTransactions.createdAt));
}

export async function getEligibleTransactionsForNotary(notaryId: string): Promise<RonTransaction[]> {
  const notary = await db.select().from(ronNotaries).where(eq(ronNotaries.id, notaryId));
  if (!notary[0]) return [];
  const n = notary[0];

  if (n.status !== "active") return [];
  if (n.commissionExpiration && new Date(n.commissionExpiration) < new Date()) return [];

  const queued = await getQueuedTransactions();
  return queued.filter(txn => {
    if (!txn.jurisdiction) return true;
    return txn.jurisdiction.toUpperCase() === n.commissionState.toUpperCase();
  });
}

export async function claimTransaction(transactionId: string, notaryId: string): Promise<RonTransaction | null> {
  const [txn] = await db.select().from(ronTransactions).where(eq(ronTransactions.id, transactionId));
  if (!txn) return null;

  if (txn.queueStatus !== "unassigned" && txn.queueStatus !== "queued") {
    return null;
  }

  const [notary] = await db.select().from(ronNotaries).where(eq(ronNotaries.id, notaryId));
  if (!notary || notary.status !== "active") return null;

  if (notary.availabilityStatus === "offline") return null;

  if (notary.commissionExpiration && new Date(notary.commissionExpiration) < new Date()) return null;

  if (txn.jurisdiction && txn.jurisdiction.toUpperCase() !== notary.commissionState.toUpperCase()) {
    return null;
  }

  const activeSessions = await db.select().from(ronSessions)
    .where(
      and(
        eq(ronSessions.notaryId, notaryId),
        inArray(ronSessions.status, ["scheduled", "in_progress"])
      )
    );
  const maxSessions = notary.maxConcurrentSessions ?? 3;
  if (activeSessions.length >= maxSessions) return null;

  const [updated] = await db.update(ronTransactions)
    .set({
      queueStatus: "claimed",
      claimedBy: notaryId,
      claimedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(ronTransactions.id, transactionId),
        inArray(ronTransactions.queueStatus, ["unassigned", "queued"])
      )
    )
    .returning();

  if (updated && txn.createdBy) {
    await createNotification(
      txn.createdBy,
      "system",
      "Transaction Claimed",
      `"${txn.title}" has been claimed by notary ${notary.firstName} ${notary.lastName}.`,
      `/ron/transactions/${txn.id}`,
      { transactionId: txn.id, notaryId, action: "claimed" }
    );
  }

  return updated || null;
}

export async function releaseClaimedTransaction(transactionId: string, notaryId: string): Promise<RonTransaction | null> {
  const [updated] = await db.update(ronTransactions)
    .set({
      queueStatus: "queued",
      claimedBy: null,
      claimedAt: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(ronTransactions.id, transactionId),
        eq(ronTransactions.queueStatus, "claimed"),
        eq(ronTransactions.claimedBy, notaryId)
      )
    )
    .returning();

  return updated || null;
}

export async function forceAssignTransaction(transactionId: string, notaryId: string, assignedByUserId?: string): Promise<RonTransaction | null> {
  const [notary] = await db.select().from(ronNotaries).where(eq(ronNotaries.id, notaryId));
  if (!notary) return null;

  const [txn] = await db.select().from(ronTransactions).where(eq(ronTransactions.id, transactionId));
  if (!txn) return null;

  const [updated] = await db.update(ronTransactions)
    .set({
      queueStatus: "assigned",
      assignedNotaryId: notaryId,
      claimedBy: null,
      claimedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(ronTransactions.id, transactionId))
    .returning();

  if (updated && notary.userId) {
    await createNotification(
      notary.userId,
      "system",
      "Transaction Assigned",
      `You have been assigned to transaction "${txn.title}".`,
      `/ron/transactions/${txn.id}`,
      { transactionId: txn.id, notaryId, action: "assigned" }
    );
  }

  return updated || null;
}

export async function pushToQueue(transactionId: string, priority?: number): Promise<RonTransaction | null> {
  const [updated] = await db.update(ronTransactions)
    .set({
      queueStatus: "queued",
      queuePriority: priority ?? 0,
      claimedBy: null,
      claimedAt: null,
      assignedNotaryId: null,
      updatedAt: new Date(),
    })
    .where(eq(ronTransactions.id, transactionId))
    .returning();

  return updated || null;
}

interface NotaryScore {
  notary: RonNotary;
  score: number;
  activeSessionCount: number;
}

async function scoreNotaries(jurisdiction: string): Promise<NotaryScore[]> {
  const conditions = [
    eq(ronNotaries.status, "active"),
    eq(ronNotaries.availabilityStatus, "available"),
  ];

  const notaries = await db.select().from(ronNotaries)
    .where(and(...conditions));

  const eligible = notaries.filter(n => {
    if (n.commissionExpiration && new Date(n.commissionExpiration) < new Date()) return false;
    if (n.bondExpiration && new Date(n.bondExpiration) < new Date()) return false;
    if (jurisdiction && n.commissionState.toUpperCase() !== jurisdiction.toUpperCase()) return false;
    return true;
  });

  const scored: NotaryScore[] = [];
  for (const notary of eligible) {
    const activeSessions = await db.select().from(ronSessions)
      .where(
        and(
          eq(ronSessions.notaryId, notary.id),
          inArray(ronSessions.status, ["scheduled", "in_progress"])
        )
      );

    const activeSessionCount = activeSessions.length;
    const maxSessions = notary.maxConcurrentSessions || 3;
    if (activeSessionCount >= maxSessions) continue;

    let score = 100;
    score -= activeSessionCount * 20;
    score += (notary.complianceScore || 100) * 0.1;
    if (notary.avgSessionDuration && notary.avgSessionDuration < 30) score += 10;

    scored.push({ notary, score, activeSessionCount });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored;
}

export async function autoAssignTransaction(transactionId: string): Promise<{ transaction: RonTransaction; notary: RonNotary } | null> {
  const [txn] = await db.select().from(ronTransactions).where(eq(ronTransactions.id, transactionId));
  if (!txn) return null;

  const jurisdiction = txn.jurisdiction || "";
  const scoredNotaries = await scoreNotaries(jurisdiction);

  if (scoredNotaries.length === 0) return null;

  const best = scoredNotaries[0];
  const updated = await forceAssignTransaction(transactionId, best.notary.id);
  if (!updated) return null;

  return { transaction: updated, notary: best.notary };
}

export async function updateNotaryAvailability(
  notaryId: string,
  availabilityStatus: "available" | "busy" | "offline"
): Promise<RonNotary | null> {
  const [updated] = await db.update(ronNotaries)
    .set({
      availabilityStatus,
      availabilityUpdatedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(ronNotaries.id, notaryId))
    .returning();

  return updated || null;
}

export async function getNotaryWorkload(notaryId: string): Promise<{
  activeSessions: number;
  claimedTransactions: number;
  assignedTransactions: number;
  maxConcurrentSessions: number;
}> {
  const [notary] = await db.select().from(ronNotaries).where(eq(ronNotaries.id, notaryId));
  if (!notary) return { activeSessions: 0, claimedTransactions: 0, assignedTransactions: 0, maxConcurrentSessions: 3 };

  const activeSessions = await db.select().from(ronSessions)
    .where(
      and(
        eq(ronSessions.notaryId, notaryId),
        inArray(ronSessions.status, ["scheduled", "in_progress"])
      )
    );

  const claimed = await db.select().from(ronTransactions)
    .where(
      and(
        eq(ronTransactions.claimedBy, notaryId),
        eq(ronTransactions.queueStatus, "claimed")
      )
    );

  const assigned = await db.select().from(ronTransactions)
    .where(
      and(
        eq(ronTransactions.assignedNotaryId, notaryId),
        eq(ronTransactions.queueStatus, "assigned")
      )
    );

  return {
    activeSessions: activeSessions.length,
    claimedTransactions: claimed.length,
    assignedTransactions: assigned.length,
    maxConcurrentSessions: notary.maxConcurrentSessions || 3,
  };
}
