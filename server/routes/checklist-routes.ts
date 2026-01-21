import { Express, Request, Response } from "express";
import { isAuthenticated } from "../replitAuth";
import { CauseOfActionChecklistService } from "../services/cause-of-action-checklist-service";
import { db } from "../db";
import { causesOfAction, caseElements, elementEvidence, communications, courtPleadings } from "@shared/schema";
import { eq } from "drizzle-orm";

export function registerChecklistRoutes(app: Express) {
  const checklistService = new CauseOfActionChecklistService();

  // GET /api/cases/:caseId/checklist - Get all causes of action with elements for a case
  app.get("/api/cases/:caseId/checklist", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { caseId } = req.params;
      const checklists = await checklistService.getCausesOfActionForCase(caseId);
      // Return array directly for frontend compatibility
      res.json(checklists || []);
    } catch (error) {
      console.error("[Checklist] Error getting checklist:", error);
      res.status(500).json([]);
    }
  });

  // GET /api/cases/:caseId/checklist/summary - Get summary of case strength
  app.get("/api/cases/:caseId/checklist/summary", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { caseId } = req.params;
      const summary = await checklistService.getChecklistSummary(caseId);
      res.json({ success: true, ...summary });
    } catch (error) {
      console.error("[Checklist] Error getting summary:", error);
      res.status(500).json({ success: false, error: "Failed to get summary" });
    }
  });

  // POST /api/cases/:caseId/checklist/generate - Generate checklist from complaint document
  app.post("/api/cases/:caseId/checklist/generate", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { caseId } = req.params;
      const { sourceDocumentId, sourceDocumentType, searchTermSetId } = req.body;
      const userId = (req.user as any)?.id;

      // Support both modes: document-based or search term set based
      if (sourceDocumentId && sourceDocumentType === "court_filing") {
        // Generate directly from complaint document
        const result = await checklistService.generateChecklistFromDocument(
          caseId,
          sourceDocumentId,
          sourceDocumentType,
          userId
        );

        if (!result.success) {
          return res.status(400).json({ success: false, error: result.error });
        }

        // Return consistent format for both generation modes
        return res.json({ 
          success: true, 
          causesOfAction: result.causesOfAction,
          elementsCreated: result.elements.length,
        });
      }

      if (!searchTermSetId) {
        return res.status(400).json({ success: false, error: "sourceDocumentId or searchTermSetId is required" });
      }

      const result = await checklistService.generateChecklistFromSearchTermSet(
        caseId,
        searchTermSetId,
        userId
      );

      if (!result.success) {
        return res.status(400).json({ success: false, error: result.error });
      }

      res.json({ 
        success: true, 
        causesOfAction: result.causesOfAction,
        elementsCreated: result.elements.length,
      });
    } catch (error) {
      console.error("[Checklist] Error generating checklist:", error);
      res.status(500).json({ success: false, error: "Failed to generate checklist" });
    }
  });

  // GET /api/cases/:caseId/causes-of-action/:coaId - Get single cause of action with elements
  app.get("/api/cases/:caseId/causes-of-action/:coaId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { coaId } = req.params;
      const checklist = await checklistService.getCauseOfActionWithElements(coaId);
      
      if (!checklist) {
        return res.status(404).json({ success: false, error: "Cause of action not found" });
      }

      res.json({ success: true, causeOfAction: checklist });
    } catch (error) {
      console.error("[Checklist] Error getting cause of action:", error);
      res.status(500).json({ success: false, error: "Failed to get cause of action" });
    }
  });

  // PATCH /api/cases/:caseId/elements/:elementId - Update element assessment
  app.patch("/api/cases/:caseId/elements/:elementId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { elementId } = req.params;
      const { strengthAssessment, attorneyNotes, elementName, elementDescription } = req.body;

      const updated = await checklistService.updateElement(elementId, {
        strengthAssessment,
        attorneyNotes,
        elementName,
        elementDescription,
      });

      if (!updated) {
        return res.status(404).json({ success: false, error: "Element not found" });
      }

      res.json({ success: true, element: updated });
    } catch (error) {
      console.error("[Checklist] Error updating element:", error);
      res.status(500).json({ success: false, error: "Failed to update element" });
    }
  });

  // POST /api/cases/:caseId/elements/:elementId/evidence - Add evidence to element
  app.post("/api/cases/:caseId/elements/:elementId/evidence", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { elementId } = req.params;
      const userId = (req.user as any)?.id;
      const {
        documentType,
        documentId,
        externalReference,
        documentTitle,
        documentDate,
        evidenceClassification,
        excerpt,
        excerptLocation,
        attorneyNotes,
        isKeyEvidence,
      } = req.body;

      if (!documentType || !evidenceClassification) {
        return res.status(400).json({ 
          success: false, 
          error: "documentType and evidenceClassification are required" 
        });
      }

      const evidence = await checklistService.addEvidenceToElement(
        elementId,
        {
          documentType,
          documentId,
          externalReference,
          documentTitle,
          documentDate: documentDate ? new Date(documentDate) : undefined,
          evidenceClassification,
          excerpt,
          excerptLocation,
          attorneyNotes,
          isKeyEvidence,
        },
        userId
      );

      res.json({ success: true, evidence });
    } catch (error) {
      console.error("[Checklist] Error adding evidence:", error);
      res.status(500).json({ success: false, error: "Failed to add evidence" });
    }
  });

  // PATCH /api/cases/:caseId/elements/:elementId/evidence/:evidenceId - Update evidence
  app.patch("/api/cases/:caseId/elements/:elementId/evidence/:evidenceId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { evidenceId } = req.params;
      const userId = (req.user as any)?.id;
      const { evidenceClassification, attorneyNotes, isKeyEvidence, isVerified } = req.body;

      const updated = await checklistService.updateEvidence(
        evidenceId,
        { evidenceClassification, attorneyNotes, isKeyEvidence, isVerified },
        userId
      );

      if (!updated) {
        return res.status(404).json({ success: false, error: "Evidence not found" });
      }

      res.json({ success: true, evidence: updated });
    } catch (error) {
      console.error("[Checklist] Error updating evidence:", error);
      res.status(500).json({ success: false, error: "Failed to update evidence" });
    }
  });

  // DELETE /api/cases/:caseId/elements/:elementId/evidence/:evidenceId - Remove evidence
  app.delete("/api/cases/:caseId/elements/:elementId/evidence/:evidenceId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { evidenceId } = req.params;
      await checklistService.removeEvidence(evidenceId);
      res.json({ success: true });
    } catch (error) {
      console.error("[Checklist] Error removing evidence:", error);
      res.status(500).json({ success: false, error: "Failed to remove evidence" });
    }
  });

  // POST /api/cases/:caseId/elements/:elementId/find-related - Find related documents
  app.post("/api/cases/:caseId/elements/:elementId/find-related", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { caseId, elementId } = req.params;
      const suggestions = await checklistService.findRelatedDocuments(caseId, elementId);
      res.json({ success: true, suggestions });
    } catch (error) {
      console.error("[Checklist] Error finding related documents:", error);
      res.status(500).json({ success: false, error: "Failed to find related documents" });
    }
  });

  // POST /api/cases/:caseId/elements/:elementId/analyze-document - Analyze document for element
  app.post("/api/cases/:caseId/elements/:elementId/analyze-document", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { elementId } = req.params;
      const { documentId, documentType, documentText } = req.body;

      if (!documentId || !documentType || !documentText) {
        return res.status(400).json({ 
          success: false, 
          error: "documentId, documentType, and documentText are required" 
        });
      }

      const analysis = await checklistService.analyzeDocumentForElement(
        elementId,
        documentId,
        documentType,
        documentText
      );

      res.json({ success: true, analysis });
    } catch (error) {
      console.error("[Checklist] Error analyzing document:", error);
      res.status(500).json({ success: false, error: "Failed to analyze document" });
    }
  });

  // GET /api/cases/:caseId/elements/:elementId/evidence - Get all evidence for an element
  app.get("/api/cases/:caseId/elements/:elementId/evidence", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { elementId } = req.params;
      const { classification, verified, keyOnly } = req.query;

      let query = db
        .select()
        .from(elementEvidence)
        .where(eq(elementEvidence.elementId, elementId));

      const evidence = await query;

      let filtered = evidence;
      if (classification) {
        filtered = filtered.filter(e => e.evidenceClassification === classification);
      }
      if (verified === "true") {
        filtered = filtered.filter(e => e.isVerified);
      }
      if (keyOnly === "true") {
        filtered = filtered.filter(e => e.isKeyEvidence);
      }

      res.json({ success: true, evidence: filtered });
    } catch (error) {
      console.error("[Checklist] Error getting evidence:", error);
      res.status(500).json({ success: false, error: "Failed to get evidence" });
    }
  });

  // POST /api/cases/:caseId/elements/:elementId/add-suggestion - Add suggested evidence
  app.post("/api/cases/:caseId/elements/:elementId/add-suggestion", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { elementId } = req.params;
      const userId = (req.user as any)?.id;
      const { suggestion, classification } = req.body;

      if (!suggestion) {
        return res.status(400).json({ success: false, error: "suggestion is required" });
      }

      const evidence = await checklistService.addEvidenceToElement(
        elementId,
        {
          documentType: suggestion.documentType,
          documentId: suggestion.documentId,
          documentTitle: suggestion.documentTitle,
          documentDate: suggestion.documentDate ? new Date(suggestion.documentDate) : undefined,
          evidenceClassification: classification || suggestion.classification || "neutral",
          excerpt: suggestion.excerpt,
          attorneyNotes: undefined,
          isKeyEvidence: false,
        },
        userId
      );

      if (evidence) {
        await db
          .update(elementEvidence)
          .set({
            aiSuggested: true,
            aiConfidence: suggestion.confidence,
            aiReasoning: suggestion.reasoning,
          })
          .where(eq(elementEvidence.id, evidence.id));
      }

      res.json({ success: true, evidence });
    } catch (error) {
      console.error("[Checklist] Error adding suggestion:", error);
      res.status(500).json({ success: false, error: "Failed to add suggestion" });
    }
  });

  // ========== FRONTEND-COMPATIBLE ROUTES ==========
  // These routes match what the frontend expects

  // PATCH /api/checklist/elements/:elementId/strength - Update element strength (frontend format)
  app.patch("/api/checklist/elements/:elementId/strength", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { elementId } = req.params;
      const { strengthAssessment } = req.body;

      const updated = await checklistService.updateElement(elementId, { strengthAssessment });

      if (!updated) {
        return res.status(404).json({ error: "Element not found" });
      }

      res.json(updated);
    } catch (error) {
      console.error("[Checklist] Error updating element strength:", error);
      res.status(500).json({ error: "Failed to update element strength" });
    }
  });

  // POST /api/checklist/elements/:elementId/evidence - Add evidence (frontend format)
  app.post("/api/checklist/elements/:elementId/evidence", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { elementId } = req.params;
      const userId = (req.user as any)?.id;
      const { documentId, documentType, documentTitle, evidenceClassification, excerpt, attorneyNotes, confidenceScore, aiGenerated } = req.body;

      const evidence = await checklistService.addEvidenceToElement(
        elementId,
        {
          documentType,
          documentId,
          documentTitle: documentTitle || "Document",
          evidenceClassification: evidenceClassification || "neutral",
          excerpt,
          attorneyNotes,
          isKeyEvidence: false,
        },
        userId
      );

      // Update with AI-specific fields if provided
      if (evidence && (confidenceScore !== undefined || aiGenerated !== undefined)) {
        await db
          .update(elementEvidence)
          .set({
            confidenceScore,
            aiGenerated: aiGenerated || false,
          })
          .where(eq(elementEvidence.id, evidence.id));
      }

      res.json(evidence);
    } catch (error) {
      console.error("[Checklist] Error adding evidence:", error);
      res.status(500).json({ error: "Failed to add evidence" });
    }
  });

  // DELETE /api/checklist/evidence/:evidenceId - Remove evidence (frontend format)
  app.delete("/api/checklist/evidence/:evidenceId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { evidenceId } = req.params;
      await checklistService.removeEvidence(evidenceId);
      res.json({ success: true });
    } catch (error) {
      console.error("[Checklist] Error removing evidence:", error);
      res.status(500).json({ error: "Failed to remove evidence" });
    }
  });

  // GET /api/checklist/elements/:elementId/suggestions - Get document suggestions (frontend format)
  app.get("/api/checklist/elements/:elementId/suggestions", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { elementId } = req.params;
      const { caseId } = req.query;

      if (!caseId) {
        return res.status(400).json({ error: "caseId query parameter is required" });
      }

      const suggestions = await checklistService.findRelatedDocuments(caseId as string, elementId);
      res.json(suggestions);
    } catch (error) {
      console.error("[Checklist] Error getting suggestions:", error);
      res.status(500).json([]);
    }
  });

  console.log("[Checklist] Routes registered");
}
