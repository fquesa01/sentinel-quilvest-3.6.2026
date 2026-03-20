import type { Express } from "express";
import { db } from "../db";
import * as schema from "@shared/schema";
import { eq, and, desc, sql, count, sum, inArray } from "drizzle-orm";
import { insertTitleCommitmentSchema, insertTitleExceptionSchema, insertTitleSearchVendorSchema, insertTitleClaimSchema, insertClaimActivityLogSchema } from "@shared/schema";
import { z } from "zod";

const commitmentUpdateSchema = insertTitleCommitmentSchema.partial().omit({ transactionId: true, commitmentNumber: true });
const exceptionUpdateSchema = insertTitleExceptionSchema.partial().omit({ commitmentId: true });
const vendorUpdateSchema = insertTitleSearchVendorSchema.partial().omit({ commitmentId: true });
const claimUpdateSchema = insertTitleClaimSchema.partial().omit({ claimNumber: true, commitmentId: true });

const validClaimTransitions: Record<string, string[]> = {
  filed: ["acknowledged"],
  acknowledged: ["investigating"],
  investigating: ["negotiating", "litigating"],
  negotiating: ["resolved", "litigating"],
  litigating: ["resolved"],
  resolved: ["closed"],
  closed: [],
};

const validExceptionTransitions: Record<string, string[]> = {
  open: ["cleared", "waived", "partially_cleared"],
  partially_cleared: ["cleared", "waived"],
  cleared: [],
  waived: [],
};

async function verifyCommitmentOwnership(commitmentId: string, dealId: string) {
  const [commitment] = await db
    .select({ id: schema.titleCommitments.id })
    .from(schema.titleCommitments)
    .where(and(
      eq(schema.titleCommitments.id, commitmentId),
      eq(schema.titleCommitments.transactionId, dealId)
    ))
    .limit(1);
  return commitment;
}

async function getCommitmentDealId(commitmentId: string): Promise<string | null> {
  const [commitment] = await db
    .select({ transactionId: schema.titleCommitments.transactionId })
    .from(schema.titleCommitments)
    .where(eq(schema.titleCommitments.id, commitmentId))
    .limit(1);
  return commitment?.transactionId ?? null;
}

export function registerTitleInsuranceRoutes(app: Express, isAuthenticated: any) {

  app.get("/api/deals/:dealId/title/commitments", isAuthenticated, async (req: any, res: any) => {
    try {
      const { dealId } = req.params;
      const commitments = await db
        .select()
        .from(schema.titleCommitments)
        .where(eq(schema.titleCommitments.transactionId, dealId))
        .orderBy(desc(schema.titleCommitments.createdAt));
      res.json(commitments);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      console.error("Error fetching title commitments:", msg);
      res.status(500).json({ message: msg });
    }
  });

  app.get("/api/deals/:dealId/title/commitments/:commitmentId", isAuthenticated, async (req: any, res: any) => {
    try {
      const { dealId, commitmentId } = req.params;
      const [commitment] = await db
        .select()
        .from(schema.titleCommitments)
        .where(and(
          eq(schema.titleCommitments.id, commitmentId),
          eq(schema.titleCommitments.transactionId, dealId)
        ))
        .limit(1);
      if (!commitment) return res.status(404).json({ message: "Commitment not found" });
      res.json(commitment);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      console.error("Error fetching title commitment:", msg);
      res.status(500).json({ message: msg });
    }
  });

  app.post("/api/deals/:dealId/title/commitments", isAuthenticated, async (req: any, res: any) => {
    try {
      const { dealId } = req.params;
      const year = new Date().getFullYear();
      const countResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.titleCommitments);
      const nextNum = (countResult[0]?.count || 0) + 1;
      const commitmentNumber = `TC-${year}-${String(nextNum).padStart(3, "0")}`;

      const parsed = insertTitleCommitmentSchema.parse({
        ...req.body,
        transactionId: dealId,
        commitmentNumber,
      });

      const [created] = await db.insert(schema.titleCommitments).values(parsed).returning();
      res.status(201).json(created);
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      const msg = error instanceof Error ? error.message : "Unknown error";
      console.error("Error creating title commitment:", msg);
      res.status(500).json({ message: msg });
    }
  });

  app.patch("/api/deals/:dealId/title/commitments/:commitmentId", isAuthenticated, async (req: any, res: any) => {
    try {
      const { dealId, commitmentId } = req.params;
      const ownership = await verifyCommitmentOwnership(commitmentId, dealId);
      if (!ownership) return res.status(404).json({ message: "Commitment not found" });

      const parsed = commitmentUpdateSchema.parse(req.body);

      const [updated] = await db
        .update(schema.titleCommitments)
        .set({ ...parsed, updatedAt: new Date() })
        .where(and(
          eq(schema.titleCommitments.id, commitmentId),
          eq(schema.titleCommitments.transactionId, dealId)
        ))
        .returning();
      if (!updated) return res.status(404).json({ message: "Commitment not found" });
      res.json(updated);
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      const msg = error instanceof Error ? error.message : "Unknown error";
      console.error("Error updating title commitment:", msg);
      res.status(500).json({ message: msg });
    }
  });

  app.delete("/api/deals/:dealId/title/commitments/:commitmentId", isAuthenticated, async (req: any, res: any) => {
    try {
      const { dealId, commitmentId } = req.params;
      const ownership = await verifyCommitmentOwnership(commitmentId, dealId);
      if (!ownership) return res.status(404).json({ message: "Commitment not found" });

      await db.delete(schema.titleCommitments).where(and(
        eq(schema.titleCommitments.id, commitmentId),
        eq(schema.titleCommitments.transactionId, dealId)
      ));
      res.json({ success: true });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      console.error("Error deleting title commitment:", msg);
      res.status(500).json({ message: msg });
    }
  });

  app.get("/api/deals/:dealId/title/exceptions", isAuthenticated, async (req: any, res: any) => {
    try {
      const { dealId } = req.params;
      const { status, type } = req.query;

      const dealCommitments = await db
        .select({ id: schema.titleCommitments.id })
        .from(schema.titleCommitments)
        .where(eq(schema.titleCommitments.transactionId, dealId));

      if (dealCommitments.length === 0) return res.json([]);

      const commitmentIds = dealCommitments.map((c) => c.id);

      let allExceptions = await db
        .select()
        .from(schema.titleExceptions)
        .where(sql`${schema.titleExceptions.commitmentId} = ANY(${commitmentIds})`)
        .orderBy(schema.titleExceptions.scheduleItem);

      if (status && status !== "all") {
        allExceptions = allExceptions.filter((e) => e.status === status);
      }
      if (type && type !== "all") {
        allExceptions = allExceptions.filter((e) => e.exceptionType === type);
      }

      res.json(allExceptions);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      console.error("Error fetching deal exceptions:", msg);
      res.status(500).json({ message: msg });
    }
  });

  app.get("/api/deals/:dealId/title/commitments/:commitmentId/exceptions", isAuthenticated, async (req: any, res: any) => {
    try {
      const { dealId, commitmentId } = req.params;
      const ownership = await verifyCommitmentOwnership(commitmentId, dealId);
      if (!ownership) return res.status(404).json({ message: "Commitment not found" });

      const exceptions = await db
        .select()
        .from(schema.titleExceptions)
        .where(eq(schema.titleExceptions.commitmentId, commitmentId))
        .orderBy(schema.titleExceptions.scheduleItem);
      res.json(exceptions);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      console.error("Error fetching title exceptions:", msg);
      res.status(500).json({ message: msg });
    }
  });

  app.post("/api/deals/:dealId/title/commitments/:commitmentId/exceptions", isAuthenticated, async (req: any, res: any) => {
    try {
      const { dealId, commitmentId } = req.params;
      const ownership = await verifyCommitmentOwnership(commitmentId, dealId);
      if (!ownership) return res.status(404).json({ message: "Commitment not found" });

      const parsed = insertTitleExceptionSchema.parse({
        ...req.body,
        commitmentId,
      });

      const [created] = await db.insert(schema.titleExceptions).values(parsed).returning();
      res.status(201).json(created);
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      const msg = error instanceof Error ? error.message : "Unknown error";
      console.error("Error creating title exception:", msg);
      res.status(500).json({ message: msg });
    }
  });

  app.patch("/api/deals/:dealId/title/exceptions/:exceptionId", isAuthenticated, async (req: any, res: any) => {
    try {
      const { dealId, exceptionId } = req.params;
      const userId = req.user?.id;

      const [exception] = await db
        .select({
          commitmentId: schema.titleExceptions.commitmentId,
          status: schema.titleExceptions.status,
        })
        .from(schema.titleExceptions)
        .where(eq(schema.titleExceptions.id, exceptionId))
        .limit(1);
      if (!exception) return res.status(404).json({ message: "Exception not found" });

      const ownerDealId = await getCommitmentDealId(exception.commitmentId);
      if (ownerDealId !== dealId) return res.status(404).json({ message: "Exception not found" });

      const parsed = exceptionUpdateSchema.parse(req.body);

      if (parsed.status && parsed.status !== exception.status) {
        const allowed = validExceptionTransitions[exception.status] || [];
        if (!allowed.includes(parsed.status)) {
          return res.status(400).json({
            message: `Invalid status transition from '${exception.status}' to '${parsed.status}'`,
          });
        }
      }

      const updates: Record<string, unknown> = { ...parsed, updatedAt: new Date() };

      if (parsed.status === "cleared") {
        updates.clearedDate = new Date().toISOString().split("T")[0];
        updates.clearedBy = userId;
      }

      const [updated] = await db
        .update(schema.titleExceptions)
        .set(updates)
        .where(eq(schema.titleExceptions.id, exceptionId))
        .returning();
      if (!updated) return res.status(404).json({ message: "Exception not found" });
      res.json(updated);
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      const msg = error instanceof Error ? error.message : "Unknown error";
      console.error("Error updating title exception:", msg);
      res.status(500).json({ message: msg });
    }
  });

  app.delete("/api/deals/:dealId/title/exceptions/:exceptionId", isAuthenticated, async (req: any, res: any) => {
    try {
      const { dealId, exceptionId } = req.params;

      const [exception] = await db
        .select({ commitmentId: schema.titleExceptions.commitmentId })
        .from(schema.titleExceptions)
        .where(eq(schema.titleExceptions.id, exceptionId))
        .limit(1);
      if (!exception) return res.status(404).json({ message: "Exception not found" });

      const ownerDealId = await getCommitmentDealId(exception.commitmentId);
      if (ownerDealId !== dealId) return res.status(404).json({ message: "Exception not found" });

      await db.delete(schema.titleExceptions).where(eq(schema.titleExceptions.id, exceptionId));
      res.json({ success: true });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      console.error("Error deleting title exception:", msg);
      res.status(500).json({ message: msg });
    }
  });

  app.get("/api/deals/:dealId/title/vendors", isAuthenticated, async (req: any, res: any) => {
    try {
      const { dealId } = req.params;

      const dealCommitments = await db
        .select({ id: schema.titleCommitments.id })
        .from(schema.titleCommitments)
        .where(eq(schema.titleCommitments.transactionId, dealId));

      if (dealCommitments.length === 0) return res.json([]);

      const commitmentIds = dealCommitments.map((c) => c.id);

      const allVendors = await db
        .select()
        .from(schema.titleSearchVendors)
        .where(sql`${schema.titleSearchVendors.commitmentId} = ANY(${commitmentIds})`)
        .orderBy(desc(schema.titleSearchVendors.createdAt));

      res.json(allVendors);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      console.error("Error fetching deal vendors:", msg);
      res.status(500).json({ message: msg });
    }
  });

  app.get("/api/deals/:dealId/title/commitments/:commitmentId/vendors", isAuthenticated, async (req: any, res: any) => {
    try {
      const { dealId, commitmentId } = req.params;
      const ownership = await verifyCommitmentOwnership(commitmentId, dealId);
      if (!ownership) return res.status(404).json({ message: "Commitment not found" });

      const vendors = await db
        .select()
        .from(schema.titleSearchVendors)
        .where(eq(schema.titleSearchVendors.commitmentId, commitmentId))
        .orderBy(desc(schema.titleSearchVendors.createdAt));
      res.json(vendors);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      console.error("Error fetching title vendors:", msg);
      res.status(500).json({ message: msg });
    }
  });

  app.post("/api/deals/:dealId/title/commitments/:commitmentId/vendors", isAuthenticated, async (req: any, res: any) => {
    try {
      const { dealId, commitmentId } = req.params;
      const ownership = await verifyCommitmentOwnership(commitmentId, dealId);
      if (!ownership) return res.status(404).json({ message: "Commitment not found" });

      const parsed = insertTitleSearchVendorSchema.parse({
        ...req.body,
        commitmentId,
      });

      const [created] = await db.insert(schema.titleSearchVendors).values(parsed).returning();
      res.status(201).json(created);
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      const msg = error instanceof Error ? error.message : "Unknown error";
      console.error("Error creating title vendor:", msg);
      res.status(500).json({ message: msg });
    }
  });

  app.patch("/api/deals/:dealId/title/vendors/:vendorId", isAuthenticated, async (req: any, res: any) => {
    try {
      const { dealId, vendorId } = req.params;

      const [vendor] = await db
        .select({ commitmentId: schema.titleSearchVendors.commitmentId })
        .from(schema.titleSearchVendors)
        .where(eq(schema.titleSearchVendors.id, vendorId))
        .limit(1);
      if (!vendor) return res.status(404).json({ message: "Vendor not found" });

      const ownerDealId = await getCommitmentDealId(vendor.commitmentId);
      if (ownerDealId !== dealId) return res.status(404).json({ message: "Vendor not found" });

      const parsed = vendorUpdateSchema.parse(req.body);

      const [updated] = await db
        .update(schema.titleSearchVendors)
        .set({ ...parsed, updatedAt: new Date() })
        .where(eq(schema.titleSearchVendors.id, vendorId))
        .returning();
      if (!updated) return res.status(404).json({ message: "Vendor not found" });
      res.json(updated);
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      const msg = error instanceof Error ? error.message : "Unknown error";
      console.error("Error updating title vendor:", msg);
      res.status(500).json({ message: msg });
    }
  });

  app.delete("/api/deals/:dealId/title/vendors/:vendorId", isAuthenticated, async (req: any, res: any) => {
    try {
      const { dealId, vendorId } = req.params;

      const [vendor] = await db
        .select({ commitmentId: schema.titleSearchVendors.commitmentId })
        .from(schema.titleSearchVendors)
        .where(eq(schema.titleSearchVendors.id, vendorId))
        .limit(1);
      if (!vendor) return res.status(404).json({ message: "Vendor not found" });

      const ownerDealId = await getCommitmentDealId(vendor.commitmentId);
      if (ownerDealId !== dealId) return res.status(404).json({ message: "Vendor not found" });

      await db.delete(schema.titleSearchVendors).where(eq(schema.titleSearchVendors.id, vendorId));
      res.json({ success: true });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      console.error("Error deleting title vendor:", msg);
      res.status(500).json({ message: msg });
    }
  });

  // ─── Claims CRUD ────────────────────────────────────────────────

  app.get("/api/deals/:dealId/title/claims", isAuthenticated, async (req: any, res: any) => {
    try {
      const { dealId } = req.params;
      const dealCommitments = await db
        .select({ id: schema.titleCommitments.id })
        .from(schema.titleCommitments)
        .where(eq(schema.titleCommitments.transactionId, dealId));

      if (dealCommitments.length === 0) return res.json([]);
      const commitmentIds = dealCommitments.map((c) => c.id);

      const claims = await db
        .select()
        .from(schema.titleClaims)
        .where(sql`${schema.titleClaims.commitmentId} = ANY(${commitmentIds})`)
        .orderBy(desc(schema.titleClaims.createdAt));
      res.json(claims);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      console.error("Error fetching deal claims:", msg);
      res.status(500).json({ message: msg });
    }
  });

  app.get("/api/title/claims", isAuthenticated, async (_req: any, res: any) => {
    try {
      const claims = await db
        .select()
        .from(schema.titleClaims)
        .orderBy(desc(schema.titleClaims.createdAt));
      res.json(claims);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      console.error("Error fetching all claims:", msg);
      res.status(500).json({ message: msg });
    }
  });

  app.post("/api/deals/:dealId/title/claims", isAuthenticated, async (req: any, res: any) => {
    try {
      const { dealId } = req.params;
      const { commitmentId } = req.body;
      if (!commitmentId) return res.status(400).json({ message: "commitmentId is required" });

      const ownership = await verifyCommitmentOwnership(commitmentId, dealId);
      if (!ownership) return res.status(400).json({ message: "Commitment does not belong to this deal" });

      const year = new Date().getFullYear();
      const prefix = `CLM-${year}-`;
      const maxResult = await db
        .select({ maxNum: sql<number>`COALESCE(MAX(CAST(SUBSTRING(${schema.titleClaims.claimNumber} FROM ${prefix.length + 1}) AS INT)), 0)` })
        .from(schema.titleClaims)
        .where(sql`${schema.titleClaims.claimNumber} LIKE ${prefix + '%'}`);
      const nextNum = (maxResult[0]?.maxNum || 0) + 1;
      const claimNumber = `${prefix}${String(nextNum).padStart(3, "0")}`;

      const parsed = insertTitleClaimSchema.parse({
        ...req.body,
        claimNumber,
      });

      const [created] = await db.insert(schema.titleClaims).values(parsed).returning();

      await db.insert(schema.claimActivityLog).values({
        claimId: created.id,
        action: "Claim filed",
        details: `Claim ${claimNumber} filed`,
        performedBy: req.user?.id || null,
      });

      res.status(201).json(created);
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      const msg = error instanceof Error ? error.message : "Unknown error";
      console.error("Error creating claim:", msg);
      res.status(500).json({ message: msg });
    }
  });

  app.patch("/api/deals/:dealId/title/claims/:claimId", isAuthenticated, async (req: any, res: any) => {
    try {
      const { dealId, claimId } = req.params;

      const [claim] = await db
        .select()
        .from(schema.titleClaims)
        .where(eq(schema.titleClaims.id, claimId))
        .limit(1);
      if (!claim) return res.status(404).json({ message: "Claim not found" });

      if (!claim.commitmentId) return res.status(404).json({ message: "Claim has no commitment link" });
      const ownerDealId = await getCommitmentDealId(claim.commitmentId);
      if (ownerDealId !== dealId) return res.status(404).json({ message: "Claim not found for this deal" });

      const parsed = claimUpdateSchema.parse(req.body);

      if (parsed.status && parsed.status !== claim.status) {
        const allowed = validClaimTransitions[claim.status] || [];
        if (!allowed.includes(parsed.status)) {
          return res.status(400).json({
            message: `Invalid status transition from '${claim.status}' to '${parsed.status}'`,
          });
        }
      }

      const updates: Record<string, unknown> = { ...parsed, updatedAt: new Date() };

      if (parsed.status === "acknowledged" && !claim.acknowledgedDate) {
        updates.acknowledgedDate = new Date().toISOString().split("T")[0];
      }
      if (parsed.status === "resolved" && !claim.resolvedDate) {
        updates.resolvedDate = new Date().toISOString().split("T")[0];
      }
      if (parsed.status === "closed" && !claim.closedDate) {
        updates.closedDate = new Date().toISOString().split("T")[0];
      }

      const [updated] = await db
        .update(schema.titleClaims)
        .set(updates)
        .where(eq(schema.titleClaims.id, claimId))
        .returning();
      if (!updated) return res.status(404).json({ message: "Claim not found" });

      const activityDetails: string[] = [];
      if (parsed.status && parsed.status !== claim.status) {
        activityDetails.push(`Status changed from ${claim.status} to ${parsed.status}`);
      }
      if (parsed.paidAmount && parsed.paidAmount !== claim.paidAmount) {
        activityDetails.push(`Payment updated to $${parsed.paidAmount}`);
      }
      if (activityDetails.length > 0) {
        await db.insert(schema.claimActivityLog).values({
          claimId,
          action: parsed.status && parsed.status !== claim.status ? `Status: ${parsed.status}` : "Updated",
          details: activityDetails.join("; "),
          performedBy: req.user?.id || null,
        });
      }

      res.json(updated);
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      const msg = error instanceof Error ? error.message : "Unknown error";
      console.error("Error updating claim:", msg);
      res.status(500).json({ message: msg });
    }
  });

  app.delete("/api/deals/:dealId/title/claims/:claimId", isAuthenticated, async (req: any, res: any) => {
    try {
      const { dealId, claimId } = req.params;

      const [claim] = await db
        .select({ commitmentId: schema.titleClaims.commitmentId })
        .from(schema.titleClaims)
        .where(eq(schema.titleClaims.id, claimId))
        .limit(1);
      if (!claim) return res.status(404).json({ message: "Claim not found" });

      if (!claim.commitmentId) return res.status(404).json({ message: "Claim has no commitment link" });
      const ownerDealId = await getCommitmentDealId(claim.commitmentId);
      if (ownerDealId !== dealId) return res.status(404).json({ message: "Claim not found" });

      await db.delete(schema.titleClaims).where(eq(schema.titleClaims.id, claimId));
      res.json({ success: true });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      console.error("Error deleting claim:", msg);
      res.status(500).json({ message: msg });
    }
  });

  // ─── Claim Activity Log (deal-scoped) ──────────────────────────

  app.get("/api/deals/:dealId/title/claims/:claimId/activity", isAuthenticated, async (req: any, res: any) => {
    try {
      const { dealId, claimId } = req.params;
      const [claim] = await db
        .select({ commitmentId: schema.titleClaims.commitmentId })
        .from(schema.titleClaims)
        .where(eq(schema.titleClaims.id, claimId))
        .limit(1);
      if (!claim?.commitmentId) return res.status(404).json({ message: "Claim not found" });
      const ownerDealId = await getCommitmentDealId(claim.commitmentId);
      if (ownerDealId !== dealId) return res.status(404).json({ message: "Claim not found for this deal" });

      const activity = await db
        .select()
        .from(schema.claimActivityLog)
        .where(eq(schema.claimActivityLog.claimId, claimId))
        .orderBy(desc(schema.claimActivityLog.createdAt));
      res.json(activity);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      console.error("Error fetching claim activity:", msg);
      res.status(500).json({ message: msg });
    }
  });

  app.post("/api/deals/:dealId/title/claims/:claimId/activity", isAuthenticated, async (req: any, res: any) => {
    try {
      const { dealId, claimId } = req.params;

      const [claim] = await db
        .select({ commitmentId: schema.titleClaims.commitmentId })
        .from(schema.titleClaims)
        .where(eq(schema.titleClaims.id, claimId))
        .limit(1);
      if (!claim?.commitmentId) return res.status(404).json({ message: "Claim not found" });
      const claimOwnerDealId = await getCommitmentDealId(claim.commitmentId);
      if (claimOwnerDealId !== dealId) return res.status(404).json({ message: "Claim not found for this deal" });

      const parsed = insertClaimActivityLogSchema.parse({
        ...req.body,
        claimId,
        performedBy: req.user?.id || null,
      });

      const [created] = await db.insert(schema.claimActivityLog).values(parsed).returning();
      res.status(201).json(created);
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      const msg = error instanceof Error ? error.message : "Unknown error";
      console.error("Error creating claim activity:", msg);
      res.status(500).json({ message: msg });
    }
  });

  // ─── Underwriter Dashboard ──────────────────────────────────────

  app.get("/api/title/dashboard", isAuthenticated, async (_req: any, res: any) => {
    try {
      const allCommitments = await db.select().from(schema.titleCommitments);
      const allClaims = await db.select().from(schema.titleClaims);
      const allExceptions = await db.select().from(schema.titleExceptions);

      const activePolicies = allCommitments.filter((c) =>
        c.status === "issued" || c.status === "final"
      ).length;

      const currentYear = new Date().getFullYear();
      const ytdCommitments = allCommitments.filter((c) => {
        const d = c.createdAt ? new Date(c.createdAt) : null;
        return d && d.getFullYear() === currentYear;
      });
      const premiumVolumeYTD = ytdCommitments.reduce(
        (sum, c) => sum + (c.premium ? parseFloat(String(c.premium)) : 0), 0
      );

      const openClaims = allClaims.filter((c) =>
        c.status !== "closed" && c.status !== "resolved"
      ).length;

      const totalClaimAmount = allClaims.reduce(
        (s, c) => s + (c.claimAmount ? parseFloat(String(c.claimAmount)) : 0), 0
      );
      const totalPolicyAmount = allCommitments.reduce(
        (s, c) => s + (c.policyAmount ? parseFloat(String(c.policyAmount)) : 0), 0
      );
      const lossRatio = totalPolicyAmount > 0
        ? parseFloat(((totalClaimAmount / totalPolicyAmount) * 100).toFixed(2))
        : 0;

      const pipelineCounts: Record<string, number> = {};
      for (const c of allCommitments) {
        pipelineCounts[c.status] = (pipelineCounts[c.status] || 0) + 1;
      }

      const claimsByStatus: Record<string, number> = {};
      for (const c of allClaims) {
        claimsByStatus[c.status] = (claimsByStatus[c.status] || 0) + 1;
      }

      const claimsByType: Record<string, number> = {};
      for (const c of allClaims) {
        const t = c.claimType || "unknown";
        claimsByType[t] = (claimsByType[t] || 0) + 1;
      }

      const exceptionsByStatus: Record<string, number> = {};
      for (const e of allExceptions) {
        exceptionsByStatus[e.status] = (exceptionsByStatus[e.status] || 0) + 1;
      }

      const premiumByUnderwriter: Record<string, number> = {};
      for (const c of allCommitments) {
        const uw = c.underwriter || "Unassigned";
        premiumByUnderwriter[uw] = (premiumByUnderwriter[uw] || 0) +
          (c.premium ? parseFloat(String(c.premium)) : 0);
      }

      const monthlyPolicyVolume: Record<string, number> = {};
      for (const c of allCommitments) {
        const d = c.createdAt ? new Date(c.createdAt) : null;
        if (d) {
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          monthlyPolicyVolume[key] = (monthlyPolicyVolume[key] || 0) + 1;
        }
      }

      const recentClaims = allClaims
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10);

      const totalExceptions = allExceptions.length;
      const clearedExceptions = allExceptions.filter(
        (e) => e.status === "cleared" || e.status === "waived"
      ).length;
      const exceptionClearanceRate = totalExceptions > 0
        ? parseFloat(((clearedExceptions / totalExceptions) * 100).toFixed(1))
        : 0;

      const complianceAlerts: Array<{ id: string; severity: string; title: string; description: string; createdAt: string }> = [];

      const staleExceptions = allExceptions.filter((e) => {
        if (e.status === "cleared" || e.status === "waived") return false;
        const created = new Date(e.createdAt);
        const daysSince = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
        return daysSince > 30;
      });
      if (staleExceptions.length > 0) {
        complianceAlerts.push({
          id: "stale-exceptions",
          severity: staleExceptions.length > 5 ? "high" : "medium",
          title: `${staleExceptions.length} Stale Exception${staleExceptions.length > 1 ? "s" : ""}`,
          description: `${staleExceptions.length} exceptions have been open for more than 30 days without resolution.`,
          createdAt: new Date().toISOString(),
        });
      }

      const staleClaims = allClaims.filter((c) => {
        if (c.status === "closed" || c.status === "resolved") return false;
        const created = new Date(c.createdAt);
        const daysSince = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
        return daysSince > 60;
      });
      if (staleClaims.length > 0) {
        complianceAlerts.push({
          id: "stale-claims",
          severity: "high",
          title: `${staleClaims.length} Aging Claim${staleClaims.length > 1 ? "s" : ""}`,
          description: `${staleClaims.length} claims have been open for more than 60 days.`,
          createdAt: new Date().toISOString(),
        });
      }

      if (lossRatio > 50) {
        complianceAlerts.push({
          id: "high-loss-ratio",
          severity: "critical",
          title: "Elevated Loss Ratio",
          description: `Current loss ratio is ${lossRatio}%, exceeding the 50% threshold.`,
          createdAt: new Date().toISOString(),
        });
      }

      const uncommittedPolicies = allCommitments.filter((c) => c.status === "ordered").length;
      if (uncommittedPolicies > 10) {
        complianceAlerts.push({
          id: "backlog",
          severity: "medium",
          title: "Commitment Backlog",
          description: `${uncommittedPolicies} commitments are still in 'ordered' status.`,
          createdAt: new Date().toISOString(),
        });
      }

      res.json({
        metrics: {
          activePolicies,
          premiumVolumeYTD,
          openClaims,
          lossRatio,
          totalClaims: allClaims.length,
          totalCommitments: allCommitments.length,
        },
        pipelineCounts,
        claimsByStatus,
        claimsByType,
        exceptionsByStatus,
        premiumByUnderwriter,
        monthlyPolicyVolume,
        recentClaims,
        exceptionClearanceRate,
        complianceAlerts,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      console.error("Error fetching dashboard:", msg);
      res.status(500).json({ message: msg });
    }
  });
}
