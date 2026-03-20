import type { Express } from "express";
import { db } from "../db";
import * as schema from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { insertTitleCommitmentSchema, insertTitleExceptionSchema, insertTitleSearchVendorSchema } from "@shared/schema";
import { z } from "zod";

const commitmentUpdateSchema = insertTitleCommitmentSchema.partial().omit({ transactionId: true, commitmentNumber: true });
const exceptionUpdateSchema = insertTitleExceptionSchema.partial().omit({ commitmentId: true });
const vendorUpdateSchema = insertTitleSearchVendorSchema.partial().omit({ commitmentId: true });

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
}
