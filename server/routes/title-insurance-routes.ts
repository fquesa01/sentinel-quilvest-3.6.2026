import type { Express } from "express";
import { db } from "../db";
import * as schema from "@shared/schema";
import { eq, and, desc, sql, count, sum, inArray } from "drizzle-orm";
import { insertTitleCommitmentSchema, insertTitleExceptionSchema, insertTitleSearchVendorSchema, insertTitleClaimSchema, insertClaimActivityLogSchema, insertSurveySchema, insertSurveyBoundarySchema, insertSurveyEasementSchema, insertSurveyEncroachmentSchema, insertSurveyImprovementSchema, insertSurveyDiscrepancySchema } from "@shared/schema";
import { z } from "zod";
import { extractSurveyData, analyzeException, detectDiscrepancies } from "../services/title-survey-ai-service";
import multer from "multer";
import pdfParse from "pdf-parse";

const surveyUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

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

  // ===== SURVEY CRUD ROUTES =====

  app.get("/api/deals/:dealId/title/survey", isAuthenticated, async (req: any, res: any) => {
    try {
      const { dealId } = req.params;
      const surveyRows = await db
        .select()
        .from(schema.surveys)
        .where(eq(schema.surveys.transactionId, dealId))
        .orderBy(desc(schema.surveys.createdAt));
      res.json(surveyRows);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ message: msg });
    }
  });

  app.get("/api/deals/:dealId/title/survey/:surveyId", isAuthenticated, async (req: any, res: any) => {
    try {
      const { dealId, surveyId } = req.params;
      const [survey] = await db
        .select()
        .from(schema.surveys)
        .where(and(eq(schema.surveys.id, surveyId), eq(schema.surveys.transactionId, dealId)));
      if (!survey) return res.status(404).json({ message: "Survey not found" });

      const boundaries = await db.select().from(schema.surveyBoundaries).where(eq(schema.surveyBoundaries.surveyId, surveyId)).orderBy(schema.surveyBoundaries.orderIndex);
      const easements = await db.select().from(schema.surveyEasements).where(eq(schema.surveyEasements.surveyId, surveyId));
      const encroachments = await db.select().from(schema.surveyEncroachments).where(eq(schema.surveyEncroachments.surveyId, surveyId));
      const improvements = await db.select().from(schema.surveyImprovements).where(eq(schema.surveyImprovements.surveyId, surveyId));
      const discrepancies = await db.select().from(schema.surveyDiscrepancies).where(eq(schema.surveyDiscrepancies.surveyId, surveyId));

      res.json({ ...survey, boundaries, easements, encroachments, improvements, discrepancies });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ message: msg });
    }
  });

  app.post("/api/deals/:dealId/title/survey", isAuthenticated, async (req: any, res: any) => {
    try {
      const { dealId } = req.params;
      if (req.body.commitmentId) {
        const [commitment] = await db.select({ id: schema.titleCommitments.id })
          .from(schema.titleCommitments)
          .where(and(eq(schema.titleCommitments.id, req.body.commitmentId), eq(schema.titleCommitments.transactionId, dealId)));
        if (!commitment) return res.status(400).json({ message: "Commitment does not belong to this deal" });
      }
      const parsed = insertSurveySchema.parse({ ...req.body, transactionId: dealId });
      const [created] = await db.insert(schema.surveys).values(parsed).returning();
      res.status(201).json(created);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ message: msg });
    }
  });

  app.patch("/api/deals/:dealId/title/survey/:surveyId", isAuthenticated, async (req: any, res: any) => {
    try {
      const { dealId, surveyId } = req.params;
      const [existing] = await db.select().from(schema.surveys).where(and(eq(schema.surveys.id, surveyId), eq(schema.surveys.transactionId, dealId)));
      if (!existing) return res.status(404).json({ message: "Survey not found" });
      if (req.body.commitmentId) {
        const [commitment] = await db.select({ id: schema.titleCommitments.id })
          .from(schema.titleCommitments)
          .where(and(eq(schema.titleCommitments.id, req.body.commitmentId), eq(schema.titleCommitments.transactionId, dealId)));
        if (!commitment) return res.status(400).json({ message: "Commitment does not belong to this deal" });
      }
      const updateSchema = insertSurveySchema.partial().omit({ transactionId: true });
      const parsed = updateSchema.parse(req.body);
      const [updated] = await db.update(schema.surveys).set({ ...parsed, updatedAt: new Date() }).where(eq(schema.surveys.id, surveyId)).returning();
      res.json(updated);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ message: msg });
    }
  });

  app.delete("/api/deals/:dealId/title/survey/:surveyId", isAuthenticated, async (req: any, res: any) => {
    try {
      const { dealId, surveyId } = req.params;
      const [existing] = await db.select().from(schema.surveys).where(and(eq(schema.surveys.id, surveyId), eq(schema.surveys.transactionId, dealId)));
      if (!existing) return res.status(404).json({ message: "Survey not found" });
      await db.delete(schema.surveys).where(eq(schema.surveys.id, surveyId));
      res.json({ success: true });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ message: msg });
    }
  });

  async function verifySurveyOwnership(surveyId: string, dealId: string): Promise<boolean> {
    const [survey] = await db.select({ id: schema.surveys.id })
      .from(schema.surveys)
      .where(and(eq(schema.surveys.id, surveyId), eq(schema.surveys.transactionId, dealId)));
    return !!survey;
  }

  // Survey sub-table CRUD: boundaries (full CRUD with ownership)
  app.get("/api/deals/:dealId/title/survey/:surveyId/boundaries", isAuthenticated, async (req: any, res: any) => {
    try {
      if (!(await verifySurveyOwnership(req.params.surveyId, req.params.dealId))) return res.status(403).json({ message: "Survey does not belong to this deal" });
      const rows = await db.select().from(schema.surveyBoundaries).where(eq(schema.surveyBoundaries.surveyId, req.params.surveyId)).orderBy(schema.surveyBoundaries.orderIndex);
      res.json(rows);
    } catch (error: unknown) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.post("/api/deals/:dealId/title/survey/:surveyId/boundaries", isAuthenticated, async (req: any, res: any) => {
    try {
      if (!(await verifySurveyOwnership(req.params.surveyId, req.params.dealId))) return res.status(403).json({ message: "Survey does not belong to this deal" });
      const parsed = insertSurveyBoundarySchema.parse({ ...req.body, surveyId: req.params.surveyId });
      const [created] = await db.insert(schema.surveyBoundaries).values(parsed).returning();
      res.status(201).json(created);
    } catch (error: unknown) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.patch("/api/deals/:dealId/title/survey/:surveyId/boundaries/:boundaryId", isAuthenticated, async (req: any, res: any) => {
    try {
      if (!(await verifySurveyOwnership(req.params.surveyId, req.params.dealId))) return res.status(403).json({ message: "Survey does not belong to this deal" });
      const updateSchema = insertSurveyBoundarySchema.partial().omit({ surveyId: true });
      const parsed = updateSchema.parse(req.body);
      const [updated] = await db.update(schema.surveyBoundaries).set(parsed).where(and(eq(schema.surveyBoundaries.id, req.params.boundaryId), eq(schema.surveyBoundaries.surveyId, req.params.surveyId))).returning();
      if (!updated) return res.status(404).json({ message: "Boundary not found" });
      res.json(updated);
    } catch (error: unknown) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.delete("/api/deals/:dealId/title/survey/:surveyId/boundaries/:boundaryId", isAuthenticated, async (req: any, res: any) => {
    try {
      if (!(await verifySurveyOwnership(req.params.surveyId, req.params.dealId))) return res.status(403).json({ message: "Survey does not belong to this deal" });
      await db.delete(schema.surveyBoundaries).where(and(eq(schema.surveyBoundaries.id, req.params.boundaryId), eq(schema.surveyBoundaries.surveyId, req.params.surveyId)));
      res.json({ success: true });
    } catch (error: unknown) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Survey sub-table CRUD: easements (full CRUD with ownership)
  app.get("/api/deals/:dealId/title/survey/:surveyId/easements", isAuthenticated, async (req: any, res: any) => {
    try {
      if (!(await verifySurveyOwnership(req.params.surveyId, req.params.dealId))) return res.status(403).json({ message: "Survey does not belong to this deal" });
      const rows = await db.select().from(schema.surveyEasements).where(eq(schema.surveyEasements.surveyId, req.params.surveyId));
      res.json(rows);
    } catch (error: unknown) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.post("/api/deals/:dealId/title/survey/:surveyId/easements", isAuthenticated, async (req: any, res: any) => {
    try {
      if (!(await verifySurveyOwnership(req.params.surveyId, req.params.dealId))) return res.status(403).json({ message: "Survey does not belong to this deal" });
      const parsed = insertSurveyEasementSchema.parse({ ...req.body, surveyId: req.params.surveyId });
      const [created] = await db.insert(schema.surveyEasements).values(parsed).returning();
      res.status(201).json(created);
    } catch (error: unknown) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.patch("/api/deals/:dealId/title/survey/:surveyId/easements/:easementId", isAuthenticated, async (req: any, res: any) => {
    try {
      if (!(await verifySurveyOwnership(req.params.surveyId, req.params.dealId))) return res.status(403).json({ message: "Survey does not belong to this deal" });
      const updateSchema = insertSurveyEasementSchema.partial().omit({ surveyId: true });
      const parsed = updateSchema.parse(req.body);
      const [updated] = await db.update(schema.surveyEasements).set(parsed).where(and(eq(schema.surveyEasements.id, req.params.easementId), eq(schema.surveyEasements.surveyId, req.params.surveyId))).returning();
      if (!updated) return res.status(404).json({ message: "Easement not found" });
      res.json(updated);
    } catch (error: unknown) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.delete("/api/deals/:dealId/title/survey/:surveyId/easements/:easementId", isAuthenticated, async (req: any, res: any) => {
    try {
      if (!(await verifySurveyOwnership(req.params.surveyId, req.params.dealId))) return res.status(403).json({ message: "Survey does not belong to this deal" });
      await db.delete(schema.surveyEasements).where(and(eq(schema.surveyEasements.id, req.params.easementId), eq(schema.surveyEasements.surveyId, req.params.surveyId)));
      res.json({ success: true });
    } catch (error: unknown) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Survey sub-table CRUD: encroachments (full CRUD with ownership)
  app.get("/api/deals/:dealId/title/survey/:surveyId/encroachments", isAuthenticated, async (req: any, res: any) => {
    try {
      if (!(await verifySurveyOwnership(req.params.surveyId, req.params.dealId))) return res.status(403).json({ message: "Survey does not belong to this deal" });
      const rows = await db.select().from(schema.surveyEncroachments).where(eq(schema.surveyEncroachments.surveyId, req.params.surveyId));
      res.json(rows);
    } catch (error: unknown) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.post("/api/deals/:dealId/title/survey/:surveyId/encroachments", isAuthenticated, async (req: any, res: any) => {
    try {
      if (!(await verifySurveyOwnership(req.params.surveyId, req.params.dealId))) return res.status(403).json({ message: "Survey does not belong to this deal" });
      const parsed = insertSurveyEncroachmentSchema.parse({ ...req.body, surveyId: req.params.surveyId });
      const [created] = await db.insert(schema.surveyEncroachments).values(parsed).returning();
      res.status(201).json(created);
    } catch (error: unknown) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.patch("/api/deals/:dealId/title/survey/:surveyId/encroachments/:encroachmentId", isAuthenticated, async (req: any, res: any) => {
    try {
      if (!(await verifySurveyOwnership(req.params.surveyId, req.params.dealId))) return res.status(403).json({ message: "Survey does not belong to this deal" });
      const updateSchema = insertSurveyEncroachmentSchema.partial().omit({ surveyId: true });
      const parsed = updateSchema.parse(req.body);
      const [updated] = await db.update(schema.surveyEncroachments).set(parsed).where(and(eq(schema.surveyEncroachments.id, req.params.encroachmentId), eq(schema.surveyEncroachments.surveyId, req.params.surveyId))).returning();
      if (!updated) return res.status(404).json({ message: "Encroachment not found" });
      res.json(updated);
    } catch (error: unknown) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.delete("/api/deals/:dealId/title/survey/:surveyId/encroachments/:encroachmentId", isAuthenticated, async (req: any, res: any) => {
    try {
      if (!(await verifySurveyOwnership(req.params.surveyId, req.params.dealId))) return res.status(403).json({ message: "Survey does not belong to this deal" });
      await db.delete(schema.surveyEncroachments).where(and(eq(schema.surveyEncroachments.id, req.params.encroachmentId), eq(schema.surveyEncroachments.surveyId, req.params.surveyId)));
      res.json({ success: true });
    } catch (error: unknown) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Survey sub-table CRUD: improvements (full CRUD with ownership)
  app.get("/api/deals/:dealId/title/survey/:surveyId/improvements", isAuthenticated, async (req: any, res: any) => {
    try {
      if (!(await verifySurveyOwnership(req.params.surveyId, req.params.dealId))) return res.status(403).json({ message: "Survey does not belong to this deal" });
      const rows = await db.select().from(schema.surveyImprovements).where(eq(schema.surveyImprovements.surveyId, req.params.surveyId));
      res.json(rows);
    } catch (error: unknown) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.post("/api/deals/:dealId/title/survey/:surveyId/improvements", isAuthenticated, async (req: any, res: any) => {
    try {
      if (!(await verifySurveyOwnership(req.params.surveyId, req.params.dealId))) return res.status(403).json({ message: "Survey does not belong to this deal" });
      const parsed = insertSurveyImprovementSchema.parse({ ...req.body, surveyId: req.params.surveyId });
      const [created] = await db.insert(schema.surveyImprovements).values(parsed).returning();
      res.status(201).json(created);
    } catch (error: unknown) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.patch("/api/deals/:dealId/title/survey/:surveyId/improvements/:improvementId", isAuthenticated, async (req: any, res: any) => {
    try {
      if (!(await verifySurveyOwnership(req.params.surveyId, req.params.dealId))) return res.status(403).json({ message: "Survey does not belong to this deal" });
      const updateSchema = insertSurveyImprovementSchema.partial().omit({ surveyId: true });
      const parsed = updateSchema.parse(req.body);
      const [updated] = await db.update(schema.surveyImprovements).set(parsed).where(and(eq(schema.surveyImprovements.id, req.params.improvementId), eq(schema.surveyImprovements.surveyId, req.params.surveyId))).returning();
      if (!updated) return res.status(404).json({ message: "Improvement not found" });
      res.json(updated);
    } catch (error: unknown) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.delete("/api/deals/:dealId/title/survey/:surveyId/improvements/:improvementId", isAuthenticated, async (req: any, res: any) => {
    try {
      if (!(await verifySurveyOwnership(req.params.surveyId, req.params.dealId))) return res.status(403).json({ message: "Survey does not belong to this deal" });
      await db.delete(schema.surveyImprovements).where(and(eq(schema.surveyImprovements.id, req.params.improvementId), eq(schema.surveyImprovements.surveyId, req.params.surveyId)));
      res.json({ success: true });
    } catch (error: unknown) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Survey sub-table CRUD: discrepancies (full CRUD with ownership)
  app.get("/api/deals/:dealId/title/survey/:surveyId/discrepancies", isAuthenticated, async (req: any, res: any) => {
    try {
      if (!(await verifySurveyOwnership(req.params.surveyId, req.params.dealId))) return res.status(403).json({ message: "Survey does not belong to this deal" });
      const rows = await db.select().from(schema.surveyDiscrepancies).where(eq(schema.surveyDiscrepancies.surveyId, req.params.surveyId));
      res.json(rows);
    } catch (error: unknown) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.post("/api/deals/:dealId/title/survey/:surveyId/discrepancies", isAuthenticated, async (req: any, res: any) => {
    try {
      if (!(await verifySurveyOwnership(req.params.surveyId, req.params.dealId))) return res.status(403).json({ message: "Survey does not belong to this deal" });
      const parsed = insertSurveyDiscrepancySchema.parse({ ...req.body, surveyId: req.params.surveyId });
      const [created] = await db.insert(schema.surveyDiscrepancies).values(parsed).returning();
      res.status(201).json(created);
    } catch (error: unknown) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.patch("/api/deals/:dealId/title/survey/:surveyId/discrepancies/:discrepancyId", isAuthenticated, async (req: any, res: any) => {
    try {
      if (!(await verifySurveyOwnership(req.params.surveyId, req.params.dealId))) return res.status(403).json({ message: "Survey does not belong to this deal" });
      const updateSchema = insertSurveyDiscrepancySchema.partial().omit({ surveyId: true });
      const parsed = updateSchema.parse(req.body);
      const [updated] = await db.update(schema.surveyDiscrepancies).set({ ...parsed, updatedAt: new Date() }).where(and(eq(schema.surveyDiscrepancies.id, req.params.discrepancyId), eq(schema.surveyDiscrepancies.surveyId, req.params.surveyId))).returning();
      if (!updated) return res.status(404).json({ message: "Discrepancy not found" });
      res.json(updated);
    } catch (error: unknown) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.delete("/api/deals/:dealId/title/survey/:surveyId/discrepancies/:discrepancyId", isAuthenticated, async (req: any, res: any) => {
    try {
      if (!(await verifySurveyOwnership(req.params.surveyId, req.params.dealId))) return res.status(403).json({ message: "Survey does not belong to this deal" });
      await db.delete(schema.surveyDiscrepancies).where(and(eq(schema.surveyDiscrepancies.id, req.params.discrepancyId), eq(schema.surveyDiscrepancies.surveyId, req.params.surveyId)));
      res.json({ success: true });
    } catch (error: unknown) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // ===== AI SURVEY ANALYSIS ENDPOINTS =====

  async function runSurveyAnalysis(dealId: string, surveyText: string, commitmentId: string | null) {
    if (commitmentId) {
      const [commitment] = await db.select({ id: schema.titleCommitments.id })
        .from(schema.titleCommitments)
        .where(and(eq(schema.titleCommitments.id, commitmentId), eq(schema.titleCommitments.transactionId, dealId)));
      if (!commitment) throw new Error("Commitment does not belong to this deal");
    }

    const extracted = await extractSurveyData(surveyText);

    const surveyData: Record<string, unknown> = {
      transactionId: dealId,
      commitmentId: commitmentId || null,
      surveyorCompany: extracted.surveyInfo.surveyorCompany || null,
      surveyorName: extracted.surveyInfo.surveyorName || null,
      surveyorLicense: extracted.surveyInfo.surveyorLicense || null,
      certificationDate: extracted.surveyInfo.certificationDate || null,
      propertyAddress: extracted.surveyInfo.propertyAddress || null,
      legalDescription: extracted.surveyInfo.legalDescription || null,
      totalAreaSqft: extracted.surveyInfo.totalAreaSqft?.toString() || null,
      totalAreaAcres: extracted.surveyInfo.totalAreaAcres?.toString() || null,
      floodZone: extracted.surveyInfo.floodZone || null,
      floodMapNumber: extracted.surveyInfo.floodMapNumber || null,
      aiAnalysisSummary: extracted.summary,
      aiAnalysisJson: extracted,
      status: "analyzed",
    };
    const parsed = insertSurveySchema.parse(surveyData);
    const [survey] = await db.insert(schema.surveys).values(parsed).returning();

    if (extracted.boundaries.length > 0) {
      const boundaryRows = extracted.boundaries.map(b => insertSurveyBoundarySchema.parse({
        surveyId: survey.id,
        direction: b.direction || null,
        bearing: b.bearing || null,
        distanceFt: b.distanceFt?.toString() || null,
        adjoinsDescription: b.adjoinsDescription || null,
        monumentType: b.monumentType || null,
        monumentFound: b.monumentFound ?? true,
        orderIndex: b.orderIndex,
      }));
      await db.insert(schema.surveyBoundaries).values(boundaryRows);
    }

    if (extracted.easements.length > 0) {
      const easementRows = extracted.easements.map(e => insertSurveyEasementSchema.parse({
        surveyId: survey.id,
        easementType: e.easementType || null,
        locationDescription: e.locationDescription || null,
        holder: e.holder || null,
        recordingReference: e.recordingReference || null,
        widthFt: e.widthFt?.toString() || null,
        notes: e.notes || null,
      }));
      await db.insert(schema.surveyEasements).values(easementRows).returning();
    }

    if (extracted.encroachments.length > 0) {
      const encroachmentRows = extracted.encroachments.map(e => insertSurveyEncroachmentSchema.parse({
        surveyId: survey.id,
        description: e.description || null,
        severity: e.severity || "minor",
        encroachmentDistanceFt: e.encroachmentDistanceFt?.toString() || null,
        encroachmentDirection: e.encroachmentDirection || null,
        encroachingElement: e.encroachingElement || null,
        affectedBoundary: e.affectedBoundary || null,
        recommendedAction: e.recommendedAction || null,
      }));
      await db.insert(schema.surveyEncroachments).values(encroachmentRows);
    }

    if (extracted.improvements.length > 0) {
      const improvementRows = extracted.improvements.map(i => insertSurveyImprovementSchema.parse({
        surveyId: survey.id,
        improvementType: i.improvementType || null,
        approxSqft: i.approxSqft?.toString() || null,
        setbackFrontFt: i.setbackFrontFt?.toString() || null,
        setbackRearFt: i.setbackRearFt?.toString() || null,
        setbackLeftFt: i.setbackLeftFt?.toString() || null,
        setbackRightFt: i.setbackRightFt?.toString() || null,
        zoningCompliant: i.zoningCompliant ?? null,
        notes: i.notes || null,
      }));
      await db.insert(schema.surveyImprovements).values(improvementRows);
    }

    let discrepancyCount = 0;
    const allEasements = await db.select().from(schema.surveyEasements).where(eq(schema.surveyEasements.surveyId, survey.id));
    const allBoundaries = await db.select().from(schema.surveyBoundaries).where(eq(schema.surveyBoundaries.surveyId, survey.id));
    const allImprovements = await db.select().from(schema.surveyImprovements).where(eq(schema.surveyImprovements.surveyId, survey.id));

    const dealCommitments = await db.select().from(schema.titleCommitments).where(eq(schema.titleCommitments.transactionId, dealId));
    const commitmentIds = dealCommitments.map(c => c.id);

    const allExceptions = commitmentIds.length > 0
      ? await db.select().from(schema.titleExceptions).where(sql`${schema.titleExceptions.commitmentId} = ANY(${commitmentIds})`)
      : [];

    const schedBExceptions = allExceptions.filter(e => e.scheduleSection === "b2_exceptions" || e.scheduleSection === "b1_requirements");
    const typeKeywords: Record<string, string[]> = {
      utility: ["utility", "electric", "power", "gas", "water", "sewer", "telephone"],
      drainage: ["drainage", "storm", "stormwater"],
      access: ["access", "right of way", "right-of-way", "roadway"],
      conservation: ["conservation", "preservation", "environmental"],
      sidewalk: ["sidewalk", "pedestrian"],
      ingress_egress: ["ingress", "egress", "access"],
    };

    for (const easement of allEasements) {
      const holder = (easement.holder || "").toLowerCase();
      const ref = (easement.recordingReference || "").toLowerCase();

      const matchedExc = schedBExceptions.find(exc => {
        const excDesc = (exc.description || "").toLowerCase();
        if (ref && excDesc.includes(ref)) return true;
        if (holder && excDesc.includes(holder)) return true;
        const keywords = typeKeywords[easement.easementType || ""] || [];
        return keywords.some(kw => excDesc.includes(kw));
      });

      if (matchedExc) {
        await db.update(schema.surveyEasements)
          .set({ matchedExceptionId: matchedExc.id, matchStatus: "matched" })
          .where(eq(schema.surveyEasements.id, easement.id));
      } else if (schedBExceptions.length > 0) {
        await db.update(schema.surveyEasements)
          .set({ matchStatus: "unmatched" })
          .where(eq(schema.surveyEasements.id, easement.id));
      }
    }

    const detected = detectDiscrepancies(
      allEasements,
      allExceptions,
      allBoundaries,
      allImprovements.map(imp => ({
        id: imp.id,
        improvementType: imp.improvementType,
        setbackFrontFt: imp.setbackFrontFt,
        setbackRearFt: imp.setbackRearFt,
        setbackLeftFt: imp.setbackLeftFt,
        setbackRightFt: imp.setbackRightFt,
        zoningCompliance: imp.zoningCompliant === true ? "compliant" : imp.zoningCompliant === false ? "non_compliant" : null,
        zoningDistrict: imp.notes,
      })),
      { totalAreaSqft: survey.totalAreaSqft, totalAreaAcres: survey.totalAreaAcres, legalDescription: survey.legalDescription },
    );
    if (detected.length > 0) {
      const discRows = detected.map(d => insertSurveyDiscrepancySchema.parse({
        surveyId: survey.id,
        issueDescription: d.issueDescription,
        severity: d.severity,
        discrepancyType: d.discrepancyType,
        relatedExceptionIds: d.relatedExceptionIds,
        recommendedAction: d.recommendedAction,
      }));
      await db.insert(schema.surveyDiscrepancies).values(discRows);
      discrepancyCount = detected.length;
    }

    return {
      survey,
      counts: {
        boundaries: extracted.boundaries.length,
        easements: extracted.easements.length,
        encroachments: extracted.encroachments.length,
        improvements: extracted.improvements.length,
        discrepancies: discrepancyCount,
      },
      summary: extracted.summary,
    };
  }

  app.post("/api/deals/:dealId/title/survey/upload-analyze", isAuthenticated, surveyUpload.single("surveyPdf"), async (req: any, res: any) => {
    try {
      const { dealId } = req.params;
      const file = req.file;
      if (!file) return res.status(400).json({ message: "surveyPdf file is required" });

      const pdfData = await pdfParse(file.buffer);
      const surveyText = pdfData.text;
      if (!surveyText || surveyText.trim().length < 20) {
        return res.status(422).json({ message: "Could not extract sufficient text from the uploaded PDF" });
      }

      const result = await runSurveyAnalysis(dealId, surveyText, req.body.commitmentId || null);
      res.json(result);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      console.error("Survey PDF upload error:", msg);
      res.status(500).json({ message: msg });
    }
  });

  app.post("/api/deals/:dealId/title/survey/analyze", isAuthenticated, async (req: any, res: any) => {
    try {
      const { dealId } = req.params;
      const { surveyText, commitmentId } = req.body;
      if (!surveyText) return res.status(400).json({ message: "surveyText is required" });

      const result = await runSurveyAnalysis(dealId, surveyText, commitmentId || null);
      res.json(result);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      console.error("Survey analysis error:", msg);
      res.status(500).json({ message: msg });
    }
  });

  app.get("/api/deals/:dealId/data-room-documents-list", isAuthenticated, async (req: any, res: any) => {
    try {
      const { dealId } = req.params;
      const rooms = await db.select({ id: schema.dataRooms.id })
        .from(schema.dataRooms)
        .where(eq(schema.dataRooms.dealId, dealId));

      if (rooms.length === 0) return res.json([]);

      const roomIds = rooms.map(r => r.id);
      const docs = await db.select({
        id: schema.dataRoomDocuments.id,
        fileName: schema.dataRoomDocuments.fileName,
        fileSize: schema.dataRoomDocuments.fileSize,
        hasExtractedText: sql<boolean>`CASE WHEN length(${schema.dataRoomDocuments.extractedText}) > 50 THEN true ELSE false END`,
      })
        .from(schema.dataRoomDocuments)
        .where(inArray(schema.dataRoomDocuments.dataRoomId, roomIds));

      res.json(docs);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      console.error("Data room docs list error:", msg);
      res.status(500).json({ message: msg });
    }
  });

  app.post("/api/deals/:dealId/title/survey/analyze-from-dataroom", isAuthenticated, async (req: any, res: any) => {
    try {
      const { dealId } = req.params;
      const { documentId, commitmentId } = req.body;
      if (!documentId) return res.status(400).json({ message: "documentId is required" });

      const [doc] = await db.select({
        id: schema.dataRoomDocuments.id,
        extractedText: schema.dataRoomDocuments.extractedText,
        fileName: schema.dataRoomDocuments.fileName,
        dataRoomId: schema.dataRoomDocuments.dataRoomId,
      })
        .from(schema.dataRoomDocuments)
        .where(eq(schema.dataRoomDocuments.id, documentId));

      if (!doc) return res.status(404).json({ message: "Document not found" });

      const [room] = await db.select({ dealId: schema.dataRooms.dealId })
        .from(schema.dataRooms)
        .where(eq(schema.dataRooms.id, doc.dataRoomId));

      if (!room || room.dealId !== dealId) {
        return res.status(403).json({ message: "Document does not belong to this deal" });
      }

      const surveyText = doc.extractedText;
      if (!surveyText || surveyText.trim().length < 50) {
        return res.status(422).json({ message: `Document "${doc.fileName}" has not been processed by OCR yet or contains insufficient text. Please wait for OCR processing to complete.` });
      }

      const result = await runSurveyAnalysis(dealId, surveyText, commitmentId || null);
      res.json(result);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      console.error("Survey dataroom analysis error:", msg);
      res.status(500).json({ message: msg });
    }
  });

  // ===== AI EXCEPTION ANALYSIS ENDPOINT =====

  app.post("/api/deals/:dealId/title/exceptions/:exceptionId/ai-analysis", isAuthenticated, async (req: any, res: any) => {
    try {
      const { dealId, exceptionId } = req.params;

      const [exception] = await db.select().from(schema.titleExceptions).where(eq(schema.titleExceptions.id, exceptionId));
      if (!exception) return res.status(404).json({ message: "Exception not found" });
      if (!exception.commitmentId) return res.status(400).json({ message: "Exception has no commitment" });

      const ownerDealId = await getCommitmentDealId(exception.commitmentId);
      if (ownerDealId !== dealId) return res.status(403).json({ message: "Exception does not belong to this deal" });

      let surveyContext;
      const dealSurveys = await db.select().from(schema.surveys).where(eq(schema.surveys.transactionId, dealId));
      if (dealSurveys.length > 0) {
        const surveyId = dealSurveys[0].id;
        const easements = await db.select().from(schema.surveyEasements).where(eq(schema.surveyEasements.surveyId, surveyId));
        const encroachments = await db.select().from(schema.surveyEncroachments).where(eq(schema.surveyEncroachments.surveyId, surveyId));
        const boundaries = await db.select().from(schema.surveyBoundaries).where(eq(schema.surveyBoundaries.surveyId, surveyId));
        surveyContext = { easements, encroachments, boundaries };
      }

      const analysis = await analyzeException(
        {
          type: exception.exceptionType || "unknown",
          scheduleSection: exception.scheduleSection || "unknown",
          description: exception.description || "",
          status: exception.status || "open",
        },
        surveyContext,
      );

      res.json(analysis);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      console.error("Exception AI analysis error:", msg);
      res.status(500).json({ message: msg });
    }
  });
}
