import type { Express, RequestHandler } from "express";
import { db } from "../db";
import { dealInterestProfiles, insertDealInterestProfileSchema } from "@shared/schema";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

// Accept the same shape Drizzle expects for an insert, but strip user_id (we
// always source it from the authenticated session) and make all the array
// fields optional so the client can send a partial payload.
const profilePayloadSchema = insertDealInterestProfileSchema
  .omit({ userId: true })
  .extend({
    industries: z.array(z.string()).optional(),
    geographies: z.array(z.string()).optional(),
    states: z.array(z.string()).optional(),
    dealTypes: z.array(z.string()).optional(),
    keywords: z.array(z.string()).optional(),
    excludedTerms: z.array(z.string()).optional(),
  });

const profileUpdateSchema = profilePayloadSchema.partial();

export function registerDealInterestProfileRoutes(app: Express, isAuthenticated: RequestHandler) {
  // ------- LIST -------
  app.get("/api/deal-interest-profiles", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const rows = await db
        .select()
        .from(dealInterestProfiles)
        .where(eq(dealInterestProfiles.userId, userId))
        .orderBy(desc(dealInterestProfiles.isActive), dealInterestProfiles.priority, desc(dealInterestProfiles.updatedAt));
      res.json({ data: rows });
    } catch (error: any) {
      console.error("[DIP] list error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // ------- GET ONE -------
  app.get("/api/deal-interest-profiles/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const [row] = await db
        .select()
        .from(dealInterestProfiles)
        .where(and(eq(dealInterestProfiles.id, req.params.id), eq(dealInterestProfiles.userId, userId)));
      if (!row) return res.status(404).json({ message: "Profile not found" });
      res.json({ data: row });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ------- CREATE -------
  app.post("/api/deal-interest-profiles", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const parsed = profilePayloadSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid payload", errors: parsed.error.flatten() });
      }

      const [row] = await db
        .insert(dealInterestProfiles)
        .values({ ...parsed.data, userId })
        .returning();
      res.status(201).json({ data: row });
    } catch (error: any) {
      // Unique violation on (user_id, name)
      if (error?.code === "23505") {
        return res.status(409).json({ message: "A profile with that name already exists" });
      }
      console.error("[DIP] create error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // ------- UPDATE -------
  app.patch("/api/deal-interest-profiles/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const parsed = profileUpdateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid payload", errors: parsed.error.flatten() });
      }

      const [updated] = await db
        .update(dealInterestProfiles)
        .set({ ...parsed.data, updatedAt: new Date() })
        .where(and(eq(dealInterestProfiles.id, req.params.id), eq(dealInterestProfiles.userId, userId)))
        .returning();

      if (!updated) return res.status(404).json({ message: "Profile not found" });
      res.json({ data: updated });
    } catch (error: any) {
      if (error?.code === "23505") {
        return res.status(409).json({ message: "A profile with that name already exists" });
      }
      console.error("[DIP] update error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // ------- DELETE (hard delete; soft-delete via is_active=false is what the UI
  // uses for snoozing, so a real DELETE removes the profile entirely) -------
  app.delete("/api/deal-interest-profiles/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const [deleted] = await db
        .delete(dealInterestProfiles)
        .where(and(eq(dealInterestProfiles.id, req.params.id), eq(dealInterestProfiles.userId, userId)))
        .returning();
      if (!deleted) return res.status(404).json({ message: "Profile not found" });
      res.json({ data: deleted });
    } catch (error: any) {
      console.error("[DIP] delete error:", error);
      res.status(500).json({ message: error.message });
    }
  });
}
