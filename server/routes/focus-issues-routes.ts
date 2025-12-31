import { Express, Request, Response } from "express";
import { db } from "../db";
import * as schema from "@shared/schema";
import { eq, and, asc, desc, sql } from "drizzle-orm";

export function registerFocusIssueRoutes(app: Express, isAuthenticated: any) {
  // GET /api/focus-issues - Get all focus issues for a session or meeting
  app.get("/api/focus-issues", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { sessionId, meetingId, caseId } = req.query;
      
      let issues: schema.FocusIssue[] = [];
      
      if (sessionId) {
        issues = await db.select().from(schema.focusIssues)
          .where(eq(schema.focusIssues.sessionId, sessionId as string))
          .orderBy(asc(schema.focusIssues.displayOrder));
      } else if (meetingId) {
        issues = await db.select().from(schema.focusIssues)
          .where(eq(schema.focusIssues.meetingId, meetingId as string))
          .orderBy(asc(schema.focusIssues.displayOrder));
      } else if (caseId) {
        issues = await db.select().from(schema.focusIssues)
          .where(eq(schema.focusIssues.caseId, caseId as string))
          .orderBy(asc(schema.focusIssues.displayOrder));
      } else {
        issues = [];
      }
      
      res.json(issues);
    } catch (error: any) {
      console.error("[FocusIssues] Error fetching:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // POST /api/focus-issues - Create a new focus issue
  app.post("/api/focus-issues", isAuthenticated, async (req: any, res: Response) => {
    try {
      const { sessionId, meetingId, caseId, title, shortName, keywords, pinnedDocumentIds } = req.body;
      
      if (!title) {
        return res.status(400).json({ message: "Title is required" });
      }
      
      const generatedShortName = shortName || title.slice(0, 40) + (title.length > 40 ? '...' : '');
      
      let maxOrder = 0;
      if (sessionId) {
        const [existing] = await db.select({ maxOrder: sql<number>`COALESCE(MAX(display_order), 0)` })
          .from(schema.focusIssues)
          .where(eq(schema.focusIssues.sessionId, sessionId));
        maxOrder = existing?.maxOrder || 0;
      } else if (meetingId) {
        const [existing] = await db.select({ maxOrder: sql<number>`COALESCE(MAX(display_order), 0)` })
          .from(schema.focusIssues)
          .where(eq(schema.focusIssues.meetingId, meetingId));
        maxOrder = existing?.maxOrder || 0;
      }
      
      const [issue] = await db.insert(schema.focusIssues).values({
        sessionId: sessionId || null,
        meetingId: meetingId || null,
        caseId: caseId || null,
        title,
        shortName: generatedShortName,
        keywords: keywords || [],
        pinnedDocumentIds: pinnedDocumentIds || [],
        displayOrder: maxOrder + 1,
        active: true,
        createdBy: req.user?.id || null,
      }).returning();
      
      console.log("[FocusIssues] Created:", issue.id, "-", title.slice(0, 50));
      res.json(issue);
    } catch (error: any) {
      console.error("[FocusIssues] Error creating:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // PATCH /api/focus-issues/:id - Update a focus issue
  app.patch("/api/focus-issues/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { title, shortName, active, keywords, pinnedDocumentIds, displayOrder } = req.body;
      
      const updateData: any = { updatedAt: new Date() };
      if (title !== undefined) updateData.title = title;
      if (shortName !== undefined) updateData.shortName = shortName;
      if (active !== undefined) updateData.active = active;
      if (keywords !== undefined) updateData.keywords = keywords;
      if (pinnedDocumentIds !== undefined) updateData.pinnedDocumentIds = pinnedDocumentIds;
      if (displayOrder !== undefined) updateData.displayOrder = displayOrder;
      
      const [issue] = await db.update(schema.focusIssues)
        .set(updateData)
        .where(eq(schema.focusIssues.id, req.params.id))
        .returning();
      
      if (!issue) {
        return res.status(404).json({ message: "Focus issue not found" });
      }
      
      console.log("[FocusIssues] Updated:", issue.id);
      res.json(issue);
    } catch (error: any) {
      console.error("[FocusIssues] Error updating:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // DELETE /api/focus-issues/:id - Delete a focus issue
  app.delete("/api/focus-issues/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const [deleted] = await db.delete(schema.focusIssues)
        .where(eq(schema.focusIssues.id, req.params.id))
        .returning();
      
      if (!deleted) {
        return res.status(404).json({ message: "Focus issue not found" });
      }
      
      console.log("[FocusIssues] Deleted:", req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("[FocusIssues] Error deleting:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // POST /api/focus-issues/suggest - AI-suggest focus issues from case documents
  app.post("/api/focus-issues/suggest", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { caseId, context } = req.body;
      
      if (!caseId) {
        return res.status(400).json({ message: "Case ID is required" });
      }
      
      const { suggestFocusIssuesFromCase } = await import("../services/ambient-ai-service");
      const suggestions = await suggestFocusIssuesFromCase(caseId, context || "");
      
      res.json({ suggestions });
    } catch (error: any) {
      console.error("[FocusIssues] Error suggesting:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // POST /api/focus-issues/:id/search - Run focused search for a specific issue
  app.post("/api/focus-issues/:id/search", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { transcriptText, caseId } = req.body;
      
      const [issue] = await db.select().from(schema.focusIssues)
        .where(eq(schema.focusIssues.id, req.params.id));
      
      if (!issue) {
        return res.status(404).json({ message: "Focus issue not found" });
      }
      
      const targetCaseId = caseId || issue.caseId;
      if (!targetCaseId) {
        return res.status(400).json({ message: "Case ID is required" });
      }
      
      const { searchForFocusIssue } = await import("../services/ambient-ai-service");
      const results = await searchForFocusIssue(issue, targetCaseId, transcriptText || "");
      
      res.json(results);
    } catch (error: any) {
      console.error("[FocusIssues] Error searching:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // POST /api/focus-issues/search-all - Run focused search for all active issues
  app.post("/api/focus-issues/search-all", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { sessionId, meetingId, caseId, transcriptText } = req.body;
      
      if (!caseId) {
        return res.status(400).json({ message: "Case ID is required" });
      }
      
      let issues;
      if (sessionId) {
        issues = await db.select().from(schema.focusIssues)
          .where(and(
            eq(schema.focusIssues.sessionId, sessionId),
            eq(schema.focusIssues.active, true)
          ))
          .orderBy(asc(schema.focusIssues.displayOrder));
      } else if (meetingId) {
        issues = await db.select().from(schema.focusIssues)
          .where(and(
            eq(schema.focusIssues.meetingId, meetingId),
            eq(schema.focusIssues.active, true)
          ))
          .orderBy(asc(schema.focusIssues.displayOrder));
      } else {
        return res.json({ results: [] });
      }
      
      if (issues.length === 0) {
        return res.json({ results: [] });
      }
      
      const { searchAllFocusIssues } = await import("../services/ambient-ai-service");
      const results = await searchAllFocusIssues(issues, caseId, transcriptText || "");
      
      res.json({ results });
    } catch (error: any) {
      console.error("[FocusIssues] Error searching all:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // GET /api/focus-issues/:id/results - Get saved results for a focus issue
  app.get("/api/focus-issues/:id/results", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const results = await db.select().from(schema.focusIssueResults)
        .where(eq(schema.focusIssueResults.focusIssueId, req.params.id))
        .orderBy(desc(schema.focusIssueResults.createdAt));
      
      res.json(results);
    } catch (error: any) {
      console.error("[FocusIssues] Error fetching results:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // POST /api/focus-issues/extract-from-text - Extract allegations from pasted text
  app.post("/api/focus-issues/extract-from-text", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { text, side } = req.body;
      
      if (!text) {
        return res.status(400).json({ message: "Text is required" });
      }
      
      const { extractAllegationsFromText } = await import("../services/ambient-ai-service");
      const allegations = await extractAllegationsFromText(text, side || "plaintiff");
      
      res.json({ allegations });
    } catch (error: any) {
      console.error("[FocusIssues] Error extracting from text:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // POST /api/focus-issues/extract-from-file - Extract allegations from uploaded file
  app.post("/api/focus-issues/extract-from-file", isAuthenticated, async (req: any, res: Response) => {
    try {
      const multer = (await import("multer")).default;
      const upload = multer({ storage: multer.memoryStorage() });
      
      upload.single('file')(req, res, async (err: any) => {
        if (err) {
          return res.status(400).json({ message: "File upload failed" });
        }
        
        if (!req.file) {
          return res.status(400).json({ message: "No file uploaded" });
        }
        
        const side = req.body.side || "plaintiff";
        let text = "";
        
        const filename = req.file.originalname.toLowerCase();
        
        if (filename.endsWith('.txt')) {
          text = req.file.buffer.toString('utf-8');
        } else if (filename.endsWith('.docx') || filename.endsWith('.doc')) {
          try {
            const mammoth = await import("mammoth");
            const result = await mammoth.extractRawText({ buffer: req.file.buffer });
            text = result.value;
          } catch (e) {
            return res.status(400).json({ message: "Failed to parse Word document" });
          }
        } else if (filename.endsWith('.pdf')) {
          try {
            const pdfParse = (await import("pdf-parse")).default;
            const result = await pdfParse(req.file.buffer);
            text = result.text;
          } catch (e) {
            return res.status(400).json({ message: "Failed to parse PDF document" });
          }
        } else {
          return res.status(400).json({ message: "Unsupported file type. Use PDF, Word, or text files." });
        }
        
        if (!text.trim()) {
          return res.status(400).json({ message: "Could not extract text from file" });
        }
        
        const { extractAllegationsFromText } = await import("../services/ambient-ai-service");
        const allegations = await extractAllegationsFromText(text, side);
        
        res.json({ allegations });
      });
    } catch (error: any) {
      console.error("[FocusIssues] Error extracting from file:", error);
      res.status(500).json({ message: error.message });
    }
  });

  console.log("[FocusIssues] Routes registered");
}
