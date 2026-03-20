import type { Express, Request, Response } from "express";
import { authenticateApiKey, requireScopes } from "../middleware/api-key-auth";
import { storage } from "../storage";
import { z } from "zod";
import { db } from "../db";
import * as schema from "@shared/schema";
import { eq, desc, and, sql, ilike } from "drizzle-orm";

const createDealSchema = z.object({
  firmId: z.string().min(1),
  dealName: z.string().min(1),
  companyName: z.string().min(1),
  status: z.string().optional(),
  dealType: z.string().optional(),
  sector: z.string().optional(),
  targetSize: z.string().optional(),
  description: z.string().optional(),
  leadPartner: z.string().optional(),
});

const updateDealSchema = z.object({
  dealName: z.string().min(1).optional(),
  companyName: z.string().min(1).optional(),
  status: z.string().optional(),
  dealType: z.string().optional(),
  sector: z.string().optional(),
  targetSize: z.string().optional(),
  description: z.string().optional(),
  leadPartner: z.string().optional(),
});

export function registerExternalApiRoutes(app: Express) {
  app.get("/api/v1/external/deals", authenticateApiKey, requireScopes("deals:read"), async (req: Request, res: Response) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
      const offset = (page - 1) * limit;

      const [countResult] = await db.select({ count: sql<number>`count(*)::int` }).from(schema.peDeals);
      const total = countResult?.count ?? 0;

      const deals = await db.select().from(schema.peDeals)
        .orderBy(desc(schema.peDeals.createdAt))
        .limit(limit)
        .offset(offset);

      res.json({
        data: deals,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      console.error("[External API] Error listing deals:", error);
      res.status(500).json({ error: "Failed to list deals." });
    }
  });

  app.get("/api/v1/external/deals/:id", authenticateApiKey, requireScopes("deals:read"), async (req: Request, res: Response) => {
    try {
      const [deal] = await db.select().from(schema.peDeals).where(eq(schema.peDeals.id, req.params.id));
      if (!deal) return res.status(404).json({ error: "Deal not found." });
      res.json({ data: deal });
    } catch (error) {
      console.error("[External API] Error getting deal:", error);
      res.status(500).json({ error: "Failed to get deal." });
    }
  });

  app.post("/api/v1/external/deals", authenticateApiKey, requireScopes("deals:write"), async (req: Request, res: Response) => {
    try {
      const parsed = createDealSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request.", details: parsed.error.flatten() });
      }
      const { firmId, dealName, companyName, status, dealType, sector, targetSize, description, leadPartner } = parsed.data;
      const [created] = await db.insert(schema.peDeals).values({
        firmId, dealName, companyName,
        status: status || "screening",
        dealType, sector, targetSize, description, leadPartner,
      }).returning();
      res.status(201).json({ data: created });
    } catch (error) {
      console.error("[External API] Error creating deal:", error);
      res.status(500).json({ error: "Failed to create deal." });
    }
  });

  app.patch("/api/v1/external/deals/:id", authenticateApiKey, requireScopes("deals:write"), async (req: Request, res: Response) => {
    try {
      const parsed = updateDealSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request.", details: parsed.error.flatten() });
      }
      const [existing] = await db.select().from(schema.peDeals).where(eq(schema.peDeals.id, req.params.id));
      if (!existing) return res.status(404).json({ error: "Deal not found." });

      const [updated] = await db.update(schema.peDeals)
        .set({ ...parsed.data, updatedAt: new Date() })
        .where(eq(schema.peDeals.id, req.params.id))
        .returning();
      res.json({ data: updated });
    } catch (error) {
      console.error("[External API] Error updating deal:", error);
      res.status(500).json({ error: "Failed to update deal." });
    }
  });

  app.get("/api/v1/external/cases", authenticateApiKey, requireScopes("cases:read"), async (req: Request, res: Response) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
      const offset = (page - 1) * limit;
      const search = req.query.search as string | undefined;

      const conditions = [];
      if (search) {
        conditions.push(ilike(schema.cases.title, `%${search}%`));
      }

      const baseQuery = db.select({ count: sql<number>`count(*)::int` }).from(schema.cases);
      const countQuery = conditions.length > 0 ? baseQuery.where(and(...conditions)) : baseQuery;
      const [countResult] = await countQuery;
      const total = countResult?.count ?? 0;

      const dataQuery = db.select().from(schema.cases);
      const filteredQuery = conditions.length > 0 ? dataQuery.where(and(...conditions)) : dataQuery;
      const cases = await filteredQuery.orderBy(desc(schema.cases.createdAt)).limit(limit).offset(offset);

      res.json({
        data: cases,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      console.error("[External API] Error listing cases:", error);
      res.status(500).json({ error: "Failed to list cases." });
    }
  });

  app.get("/api/v1/external/cases/:id", authenticateApiKey, requireScopes("cases:read"), async (req: Request, res: Response) => {
    try {
      const caseData = await storage.getCase(req.params.id);
      if (!caseData) return res.status(404).json({ error: "Case not found." });
      res.json({ data: caseData });
    } catch (error) {
      console.error("[External API] Error getting case:", error);
      res.status(500).json({ error: "Failed to get case." });
    }
  });

  app.get("/api/v1/external/documents", authenticateApiKey, requireScopes("documents:read"), async (req: Request, res: Response) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
      const offset = (page - 1) * limit;
      const caseId = req.query.caseId as string | undefined;

      const conditions = [];
      if (caseId) {
        conditions.push(eq(schema.communications.caseId, caseId));
      }

      const baseQuery = db.select({ count: sql<number>`count(*)::int` }).from(schema.communications);
      const countQuery = conditions.length > 0 ? baseQuery.where(and(...conditions)) : baseQuery;
      const [countResult] = await countQuery;
      const total = countResult?.count ?? 0;

      const dataQuery = db.select().from(schema.communications);
      const filteredQuery = conditions.length > 0 ? dataQuery.where(and(...conditions)) : dataQuery;
      const documents = await filteredQuery.orderBy(desc(schema.communications.dateReceived)).limit(limit).offset(offset);

      res.json({
        data: documents,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      console.error("[External API] Error listing documents:", error);
      res.status(500).json({ error: "Failed to list documents." });
    }
  });

  app.get("/api/v1/external/documents/:id", authenticateApiKey, requireScopes("documents:read"), async (req: Request, res: Response) => {
    try {
      const doc = await storage.getCommunication(req.params.id);
      if (!doc) return res.status(404).json({ error: "Document not found." });
      res.json({ data: doc });
    } catch (error) {
      console.error("[External API] Error getting document:", error);
      res.status(500).json({ error: "Failed to get document." });
    }
  });

  app.get("/api/v1/external/communications", authenticateApiKey, requireScopes("communications:read"), async (req: Request, res: Response) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
      const offset = (page - 1) * limit;

      const [countResult] = await db.select({ count: sql<number>`count(*)::int` }).from(schema.communications);
      const total = countResult?.count ?? 0;

      const comms = await db.select().from(schema.communications)
        .orderBy(desc(schema.communications.dateReceived))
        .limit(limit)
        .offset(offset);

      res.json({
        data: comms,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      console.error("[External API] Error listing communications:", error);
      res.status(500).json({ error: "Failed to list communications." });
    }
  });

  app.get("/api/v1/external/cases/:caseId/analysis", authenticateApiKey, requireScopes("cases:read"), async (req: Request, res: Response) => {
    try {
      const analyses = await db.select().from(schema.caseAIAnalysis)
        .where(eq(schema.caseAIAnalysis.caseId, req.params.caseId))
        .orderBy(desc(schema.caseAIAnalysis.createdAt));
      res.json({ data: analyses });
    } catch (error) {
      console.error("[External API] Error getting case analysis:", error);
      res.status(500).json({ error: "Failed to get case analysis." });
    }
  });

  app.post("/api/v1/external/cases/:caseId/analysis", authenticateApiKey, requireScopes("analysis:trigger"), async (req: Request, res: Response) => {
    try {
      const caseData = await storage.getCase(req.params.caseId);
      if (!caseData) return res.status(404).json({ error: "Case not found." });

      const [analysis] = await db.insert(schema.caseAIAnalysis).values({
        caseId: req.params.caseId,
        analysisType: req.body.analysisType || "general",
        status: "pending",
        requestedBy: (req as any).apiKeyUser?.id,
      }).returning();

      res.status(202).json({
        data: analysis,
        message: "Analysis triggered. Check status at GET /api/v1/external/cases/:caseId/analysis",
      });
    } catch (error) {
      console.error("[External API] Error triggering analysis:", error);
      res.status(500).json({ error: "Failed to trigger analysis." });
    }
  });

  app.get("/api/v1/external/health", authenticateApiKey, async (_req: Request, res: Response) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
    });
  });
}
