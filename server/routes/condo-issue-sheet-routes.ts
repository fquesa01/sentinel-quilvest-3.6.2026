import type { Express } from "express";
import { getCondoIssueSheet, generateCondoIssueSheet, detectCondoDocuments } from "../services/condo-issue-sheet-service";

export function registerCondoIssueSheetRoutes(app: Express, isAuthenticated: any) {
  app.get("/api/deals/:dealId/condo-issue-sheet", isAuthenticated, async (req: any, res: any) => {
    try {
      const { dealId } = req.params;
      const sheet = await getCondoIssueSheet(dealId);
      if (!sheet) {
        return res.json(null);
      }
      res.json(sheet);
    } catch (error: any) {
      console.error("Error fetching condo issue sheet:", error.message);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/deals/:dealId/condo-issue-sheet/generate", isAuthenticated, async (req: any, res: any) => {
    try {
      const { dealId } = req.params;
      const result = await generateCondoIssueSheet(dealId);
      if (result.reason === "no_condo_docs") {
        return res.status(404).json({ message: "No condo documents found for this deal. Upload condominium declarations, bylaws, or amendments first." });
      }
      if (result.reason === "generation_failed") {
        return res.status(500).json({ message: result.error || "Failed to generate condo issue sheet" });
      }
      res.json(result.data);
    } catch (error: any) {
      console.error("Error generating condo issue sheet:", error.message);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/deals/:dealId/condo-documents", isAuthenticated, async (req: any, res: any) => {
    try {
      const { dealId } = req.params;
      const docs = await detectCondoDocuments(dealId);
      res.json(docs.map(d => ({
        id: d.id,
        fileName: d.fileName,
        fileSize: d.fileSize,
        uploadedAt: d.uploadedAt,
      })));
    } catch (error: any) {
      console.error("Error detecting condo documents:", error.message);
      res.status(500).json({ message: error.message });
    }
  });
}
