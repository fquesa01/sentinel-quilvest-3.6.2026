import { Router, Request, Response } from "express";
import { ddBooleanSearchService } from "../services/dd-boolean-search-service";
import { db } from "../db";
import { ddChecklistSections, ddBooleanQueries, ddDealQueries } from "@shared/schema";
import { eq, and } from "drizzle-orm";

const router = Router();

router.get("/sections", async (req: Request, res: Response) => {
  try {
    const sections = await db
      .select()
      .from(ddChecklistSections)
      .where(eq(ddChecklistSections.isActive, true))
      .orderBy(ddChecklistSections.displayOrder);
    
    res.json(sections);
  } catch (error: any) {
    console.error("Error fetching DD sections:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/queries/master", async (req: Request, res: Response) => {
  try {
    const queries = await ddBooleanSearchService.getMasterQueries();
    res.json(queries);
  } catch (error: any) {
    console.error("Error fetching master queries:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/queries/deal/:dealId", async (req: Request, res: Response) => {
  try {
    const { dealId } = req.params;
    const sourceType = (req.query.sourceType as string) || "pe_deal";
    
    await ddBooleanSearchService.initializeDealQueries(dealId, sourceType as any);
    
    const queries = await ddBooleanSearchService.getDealQueries(dealId, sourceType as any);
    res.json(queries);
  } catch (error: any) {
    console.error("Error fetching deal queries:", error);
    res.status(500).json({ error: error.message });
  }
});

router.put("/queries/:queryId", async (req: Request, res: Response) => {
  try {
    const { queryId } = req.params;
    const { queryText } = req.body;
    const userId = (req as any).user?.claims?.sub || "system";
    
    if (!queryText) {
      return res.status(400).json({ error: "queryText is required" });
    }
    
    await ddBooleanSearchService.updateDealQuery(queryId, queryText, userId);
    res.json({ success: true });
  } catch (error: any) {
    console.error("Error updating deal query:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/queries/:dealId/reset", async (req: Request, res: Response) => {
  try {
    const { dealId } = req.params;
    const { sectionId } = req.body;
    const sourceType = (req.query.sourceType as string) || "pe_deal";
    
    const masterQueries = await db
      .select()
      .from(ddBooleanQueries)
      .where(
        and(
          eq(ddBooleanQueries.sectionId, sectionId),
          eq(ddBooleanQueries.isActive, true)
        )
      );
    
    for (const mq of masterQueries) {
      await db
        .update(ddDealQueries)
        .set({
          queryText: mq.queryText,
          isCustomized: false,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(ddDealQueries.dealId, dealId),
            eq(ddDealQueries.sectionId, sectionId),
            eq(ddDealQueries.queryType, mq.queryType),
            eq(ddDealQueries.sourceType, sourceType as any)
          )
        );
    }
    
    res.json({ success: true });
  } catch (error: any) {
    console.error("Error resetting queries:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/search/test", async (req: Request, res: Response) => {
  try {
    const { query, dealId, sourceType } = req.body;
    
    if (!query || !dealId) {
      return res.status(400).json({ error: "query and dealId are required" });
    }
    
    const results = await ddBooleanSearchService.searchDocumentsWithQuery(
      query,
      dealId,
      sourceType || "pe_deal"
    );
    
    res.json({
      query,
      resultsCount: results.length,
      results: results.slice(0, 50)
    });
  } catch (error: any) {
    console.error("Error testing search:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/analysis/run", async (req: Request, res: Response) => {
  try {
    const { dealId, sourceType, targetCompanyName } = req.body;
    const userId = (req as any).user?.claims?.sub || "system";
    
    if (!dealId) {
      return res.status(400).json({ error: "dealId is required" });
    }
    
    const runId = await ddBooleanSearchService.runAnalysis(
      dealId,
      sourceType || "pe_deal",
      userId,
      targetCompanyName
    );
    
    res.json({ runId, status: "processing" });
  } catch (error: any) {
    console.error("Error starting analysis:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/analysis/runs/:dealId", async (req: Request, res: Response) => {
  try {
    const { dealId } = req.params;
    const sourceType = req.query.sourceType as string;
    
    const runs = await ddBooleanSearchService.getAnalysisRuns(dealId, sourceType);
    res.json(runs);
  } catch (error: any) {
    console.error("Error fetching analysis runs:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/analysis/results/:runId", async (req: Request, res: Response) => {
  try {
    const { runId } = req.params;
    
    const results = await ddBooleanSearchService.getAnalysisResults(runId);
    res.json(results);
  } catch (error: any) {
    console.error("Error fetching analysis results:", error);
    res.status(500).json({ error: error.message });
  }
});

router.put("/documents/:matchId/tag", async (req: Request, res: Response) => {
  try {
    const { matchId } = req.params;
    const { tags, notes } = req.body;
    const userId = (req as any).user?.claims?.sub || "system";
    
    await ddBooleanSearchService.tagDocument(matchId, tags || [], notes, userId);
    res.json({ success: true });
  } catch (error: any) {
    console.error("Error tagging document:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
