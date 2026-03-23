import type { Express, RequestHandler } from "express";
import { getZoningAnalysis, generateZoningAnalysis } from "../services/zoning-analysis-service";
import { checkDealVisibility } from "./visibility-helper";

export function registerZoningAnalysisRoutes(app: Express, isAuthenticated: RequestHandler) {
  app.get("/api/deals/:dealId/zoning", isAuthenticated, async (req, res) => {
    try {
      const { dealId } = req.params;
      const canAccess = await checkDealVisibility(req, dealId);
      if (!canAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      const analysis = await getZoningAnalysis(dealId);
      res.json(analysis);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to fetch zoning analysis";
      console.error("[Zoning] Error fetching analysis:", message);
      res.status(500).json({ message });
    }
  });

  app.post("/api/deals/:dealId/zoning/analyze", isAuthenticated, async (req, res) => {
    try {
      const { dealId } = req.params;
      const canAccess = await checkDealVisibility(req, dealId);
      if (!canAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      const analysis = await generateZoningAnalysis(dealId);
      res.json(analysis);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("[Zoning] Error generating analysis:", message);
      if (message.includes("not found")) {
        return res.status(404).json({ message });
      }
      if (message.includes("required") || message.includes("populate")) {
        return res.status(400).json({ message });
      }
      if (message.includes("parse") || message.includes("Failed to parse")) {
        return res.status(422).json({ message: "AI analysis could not be parsed. Please try again." });
      }
      res.status(500).json({ message: "Failed to generate zoning analysis. Please try again." });
    }
  });
}
