import { Express, Request, Response } from "express";
import { isAuthenticated } from "../replitAuth";
import { db } from "../db";
import {
  searchTermSets,
  searchTermItems,
  documentSearchTags,
  courtPleadings,
} from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";
import multer from "multer";
import { RFPParserService } from "../services/rfp-parser-service";
import { ComplaintParserService } from "../services/complaint-parser-service";
import { PrivilegeDetectionService } from "../services/privilege-detection-service";
import { BooleanSearchService, SearchTerm } from "../services/boolean-search-service";
import { extractPdfTextWithFallback } from "../services/pdf-extraction-service";
import mammoth from "mammoth";
import { nanoid } from "nanoid";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

export function registerSearchTermsRoutes(app: Express) {
  console.log("[SearchTerms] Routes registered");

  // GET /api/cases/:caseId/search-term-sets - List all search term sets for a case
  app.get("/api/cases/:caseId/search-term-sets", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { caseId } = req.params;
      const { sourceType } = req.query;

      let query = db.select().from(searchTermSets).where(eq(searchTermSets.caseId, caseId));

      if (sourceType) {
        query = db
          .select()
          .from(searchTermSets)
          .where(
            and(
              eq(searchTermSets.caseId, caseId),
              eq(searchTermSets.sourceType, sourceType as any)
            )
          );
      }

      const sets = await query.orderBy(desc(searchTermSets.createdAt));
      res.json({ success: true, data: sets });
    } catch (error) {
      console.error("[SearchTerms] Error fetching sets:", error);
      res.status(500).json({ success: false, error: "Failed to fetch search term sets" });
    }
  });

  // GET /api/cases/:caseId/search-term-sets/:setId - Get a specific search term set
  app.get("/api/cases/:caseId/search-term-sets/:setId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { setId } = req.params;

      const [set] = await db
        .select()
        .from(searchTermSets)
        .where(eq(searchTermSets.id, setId));

      if (!set) {
        return res.status(404).json({ success: false, error: "Search term set not found" });
      }

      res.json({ success: true, data: set });
    } catch (error) {
      console.error("[SearchTerms] Error fetching set:", error);
      res.status(500).json({ success: false, error: "Failed to fetch search term set" });
    }
  });

  // POST /api/cases/:caseId/search-term-sets/upload-rfp - Upload and parse RFP document
  app.post(
    "/api/cases/:caseId/search-term-sets/upload-rfp",
    isAuthenticated,
    upload.single("file"),
    async (req: Request, res: Response) => {
      try {
        const { caseId } = req.params;
        const { name, description } = req.body;
        const file = req.file;
        const userId = (req as any).user?.claims?.sub;

        if (!file) {
          return res.status(400).json({ success: false, error: "No file uploaded" });
        }

        // Create the search term set
        const [set] = await db
          .insert(searchTermSets)
          .values({
            id: nanoid(),
            caseId,
            sourceType: "rfp",
            sourceDocumentName: file.originalname,
            name: name || `RFP Analysis - ${file.originalname}`,
            description,
            generationStatus: "processing",
            generationProgress: 0,
            createdBy: userId,
          })
          .returning();

        // Extract text from the document
        let documentText = "";
        const mimeType = file.mimetype;

        try {
          if (mimeType === "application/pdf") {
            documentText = await extractPdfTextWithFallback(file.buffer);
          } else if (
            mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
            mimeType === "application/msword"
          ) {
            const result = await mammoth.extractRawText({ buffer: file.buffer });
            documentText = result.value;
          } else if (mimeType === "text/plain") {
            documentText = file.buffer.toString("utf-8");
          }
        } catch (extractError) {
          console.error("[SearchTerms] Error extracting text:", extractError);
        }

        if (!documentText || documentText.length < 50) {
          await db
            .update(searchTermSets)
            .set({
              generationStatus: "failed",
              generationError: "Could not extract text from document",
            })
            .where(eq(searchTermSets.id, set.id));
          return res.status(400).json({ success: false, error: "Could not extract text from document" });
        }

        // Process asynchronously
        processRFPDocument(set.id, documentText).catch((err) => {
          console.error("[SearchTerms] Async RFP processing failed:", err);
        });

        res.json({ success: true, data: set });
      } catch (error) {
        console.error("[SearchTerms] Error uploading RFP:", error);
        res.status(500).json({ success: false, error: "Failed to upload RFP" });
      }
    }
  );

  // POST /api/cases/:caseId/search-term-sets/upload-complaint - Upload and parse complaint
  app.post(
    "/api/cases/:caseId/search-term-sets/upload-complaint",
    isAuthenticated,
    upload.single("file"),
    async (req: Request, res: Response) => {
      try {
        const { caseId } = req.params;
        const { name, description } = req.body;
        const file = req.file;
        const userId = (req as any).user?.claims?.sub;

        if (!file) {
          return res.status(400).json({ success: false, error: "No file uploaded" });
        }

        // Create the search term set
        const [set] = await db
          .insert(searchTermSets)
          .values({
            id: nanoid(),
            caseId,
            sourceType: "complaint",
            sourceDocumentName: file.originalname,
            name: name || `Complaint Analysis - ${file.originalname}`,
            description,
            generationStatus: "processing",
            generationProgress: 0,
            createdBy: userId,
          })
          .returning();

        // Extract text from the document
        let documentText = "";
        const mimeType = file.mimetype;

        try {
          if (mimeType === "application/pdf") {
            documentText = await extractPdfTextWithFallback(file.buffer);
          } else if (
            mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
            mimeType === "application/msword"
          ) {
            const result = await mammoth.extractRawText({ buffer: file.buffer });
            documentText = result.value;
          } else if (mimeType === "text/plain") {
            documentText = file.buffer.toString("utf-8");
          }
        } catch (extractError) {
          console.error("[SearchTerms] Error extracting text:", extractError);
        }

        if (!documentText || documentText.length < 50) {
          await db
            .update(searchTermSets)
            .set({
              generationStatus: "failed",
              generationError: "Could not extract text from document",
            })
            .where(eq(searchTermSets.id, set.id));
          return res.status(400).json({ success: false, error: "Could not extract text from document" });
        }

        // Process asynchronously
        processComplaintDocument(set.id, documentText).catch((err) => {
          console.error("[SearchTerms] Async complaint processing failed:", err);
        });

        res.json({ success: true, data: set });
      } catch (error) {
        console.error("[SearchTerms] Error uploading complaint:", error);
        res.status(500).json({ success: false, error: "Failed to upload complaint" });
      }
    }
  );

  // POST /api/cases/:caseId/search-term-sets/analyze-pleading - Analyze an existing court pleading
  app.post(
    "/api/cases/:caseId/search-term-sets/analyze-pleading",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const { caseId } = req.params;
        const { pleadingId, name, description } = req.body;
        const userId = (req as any).user?.claims?.sub;

        if (!pleadingId) {
          return res.status(400).json({ success: false, error: "No pleading ID provided" });
        }

        // Fetch the court pleading
        const [pleading] = await db
          .select()
          .from(courtPleadings)
          .where(and(eq(courtPleadings.id, pleadingId), eq(courtPleadings.caseId, caseId)));

        if (!pleading) {
          return res.status(404).json({ success: false, error: "Court pleading not found" });
        }

        const documentText = pleading.extractedText;

        if (!documentText || documentText.length < 50) {
          return res.status(400).json({ 
            success: false, 
            error: "No extracted text available for this document. Please try re-extracting the text first." 
          });
        }

        // Create the search term set
        const [set] = await db
          .insert(searchTermSets)
          .values({
            id: nanoid(),
            caseId,
            sourceType: "complaint",
            sourceDocumentName: pleading.title || pleading.fileName,
            name: name || `Complaint Analysis - ${pleading.title || pleading.fileName}`,
            description,
            generationStatus: "processing",
            generationProgress: 0,
            createdBy: userId,
          })
          .returning();

        // Process asynchronously using the already extracted text
        processComplaintDocument(set.id, documentText).catch((err) => {
          console.error("[SearchTerms] Async complaint processing failed:", err);
        });

        res.json({ success: true, data: set });
      } catch (error) {
        console.error("[SearchTerms] Error analyzing pleading:", error);
        res.status(500).json({ success: false, error: "Failed to analyze pleading" });
      }
    }
  );

  // GET /api/cases/:caseId/search-term-sets/:setId/items - Get items for a search term set
  app.get("/api/cases/:caseId/search-term-sets/:setId/items", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { setId } = req.params;

      const items = await db
        .select()
        .from(searchTermItems)
        .where(eq(searchTermItems.searchTermSetId, setId))
        .orderBy(searchTermItems.itemNumber);

      res.json({ success: true, data: items });
    } catch (error) {
      console.error("[SearchTerms] Error fetching items:", error);
      res.status(500).json({ success: false, error: "Failed to fetch items" });
    }
  });

  // PATCH /api/cases/:caseId/search-term-sets/:setId/items/:itemId - Update a search term item
  app.patch(
    "/api/cases/:caseId/search-term-sets/:setId/items/:itemId",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const { itemId } = req.params;
        const { searchTerms, combinedBooleanString } = req.body;

        const [item] = await db
          .update(searchTermItems)
          .set({
            searchTerms,
            combinedBooleanString,
            updatedAt: new Date(),
          })
          .where(eq(searchTermItems.id, itemId))
          .returning();

        res.json({ success: true, data: item });
      } catch (error) {
        console.error("[SearchTerms] Error updating item:", error);
        res.status(500).json({ success: false, error: "Failed to update item" });
      }
    }
  );

  // POST /api/cases/:caseId/search-term-sets/:setId/items/:itemId/execute - Execute search for an item
  app.post(
    "/api/cases/:caseId/search-term-sets/:setId/items/:itemId/execute",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const { caseId, itemId } = req.params;

        // Get the search term item
        const [item] = await db
          .select()
          .from(searchTermItems)
          .where(eq(searchTermItems.id, itemId));

        if (!item) {
          return res.status(404).json({ success: false, error: "Item not found" });
        }

        // Update status to running
        await db
          .update(searchTermItems)
          .set({ executionStatus: "running" })
          .where(eq(searchTermItems.id, itemId));

        // Execute search
        const searchService = new BooleanSearchService();
        const tagColor = item.isPrivilegeCategory ? "#EF4444" : "#3B82F6";
        const tagCategory = item.isPrivilegeCategory
          ? "privilege"
          : item.itemType === "rfp_request"
          ? "discovery_response"
          : "case_proving";

        const tagName = item.isPrivilegeCategory
          ? item.summary || "Privilege"
          : item.itemType === "rfp_request"
          ? `RFP-${item.itemNumber}`
          : `Claim-${item.itemNumber}`;

        const result = await searchService.executeAndTagDocuments(
          caseId,
          itemId,
          item.searchTerms as SearchTerm[],
          { tagName, tagCategory, tagColor }
        );

        // Update item with results
        await db
          .update(searchTermItems)
          .set({
            executionStatus: "completed",
            lastExecutedAt: new Date(),
            documentsMatched: result.documentsTagged,
            updatedAt: new Date(),
          })
          .where(eq(searchTermItems.id, itemId));

        res.json({ success: true, data: result });
      } catch (error) {
        console.error("[SearchTerms] Error executing search:", error);
        res.status(500).json({ success: false, error: "Failed to execute search" });
      }
    }
  );

  // POST /api/cases/:caseId/search-term-sets/:setId/execute-all - Execute all searches in a set
  app.post(
    "/api/cases/:caseId/search-term-sets/:setId/execute-all",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const { caseId, setId } = req.params;

        // Get all items in this set
        const items = await db
          .select()
          .from(searchTermItems)
          .where(eq(searchTermItems.searchTermSetId, setId));

        const searchService = new BooleanSearchService();
        const results = [];

        for (const item of items) {
          const tagColor = item.isPrivilegeCategory ? "#EF4444" : "#3B82F6";
          const tagCategory = item.isPrivilegeCategory
            ? "privilege"
            : item.itemType === "rfp_request"
            ? "discovery_response"
            : "case_proving";

          const tagName = item.isPrivilegeCategory
            ? item.summary || "Privilege"
            : item.itemType === "rfp_request"
            ? `RFP-${item.itemNumber}`
            : `Claim-${item.itemNumber}`;

          const result = await searchService.executeAndTagDocuments(
            caseId,
            item.id,
            item.searchTerms as SearchTerm[],
            { tagName, tagCategory, tagColor }
          );

          await db
            .update(searchTermItems)
            .set({
              executionStatus: "completed",
              lastExecutedAt: new Date(),
              documentsMatched: result.documentsTagged,
            })
            .where(eq(searchTermItems.id, item.id));

          results.push({ itemId: item.id, ...result });
        }

        // Update set stats
        const totalTagged = results.reduce((sum, r) => sum + r.documentsTagged, 0);
        await db
          .update(searchTermSets)
          .set({
            lastExecutedAt: new Date(),
            documentsTagged: totalTagged,
            updatedAt: new Date(),
          })
          .where(eq(searchTermSets.id, setId));

        res.json({ success: true, data: results });
      } catch (error) {
        console.error("[SearchTerms] Error executing all:", error);
        res.status(500).json({ success: false, error: "Failed to execute all searches" });
      }
    }
  );

  // DELETE /api/cases/:caseId/search-term-sets/:setId - Delete a search term set
  app.delete(
    "/api/cases/:caseId/search-term-sets/:setId",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const { setId } = req.params;

        await db.delete(searchTermSets).where(eq(searchTermSets.id, setId));

        res.json({ success: true });
      } catch (error) {
        console.error("[SearchTerms] Error deleting set:", error);
        res.status(500).json({ success: false, error: "Failed to delete search term set" });
      }
    }
  );

  // GET /api/cases/:caseId/document-tags - Get all document tags for a case
  app.get("/api/cases/:caseId/document-tags", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { caseId } = req.params;
      const { category } = req.query;

      let query = db.select().from(documentSearchTags).where(eq(documentSearchTags.caseId, caseId));

      if (category) {
        query = db
          .select()
          .from(documentSearchTags)
          .where(
            and(
              eq(documentSearchTags.caseId, caseId),
              eq(documentSearchTags.tagCategory, category as string)
            )
          );
      }

      const tags = await query;
      res.json({ success: true, data: tags });
    } catch (error) {
      console.error("[SearchTerms] Error fetching tags:", error);
      res.status(500).json({ success: false, error: "Failed to fetch document tags" });
    }
  });
}

// Helper function to update progress
async function updateProgress(setId: string, progress: number) {
  await db
    .update(searchTermSets)
    .set({ generationProgress: progress, updatedAt: new Date() })
    .where(eq(searchTermSets.id, setId));
}

// Async processing functions
async function processRFPDocument(setId: string, documentText: string) {
  const rfpService = new RFPParserService();
  const privilegeService = new PrivilegeDetectionService();

  try {
    console.log(`[SearchTerms] Processing RFP document for set ${setId}`);

    // Stage 1: Starting AI analysis (10%)
    await updateProgress(setId, 10);

    // Parse the RFP (10-70%)
    await updateProgress(setId, 20);
    const parsedRFPs = await rfpService.parseRFPDocument(documentText);
    await updateProgress(setId, 70);
    
    // Log warning if no RFP requests were parsed - this indicates a parsing failure
    if (parsedRFPs.length === 0) {
      console.warn(`[SearchTerms] WARNING: 0 RFP requests parsed for set ${setId}. Only privilege categories will be added.`);
    } else {
      console.log(`[SearchTerms] Successfully parsed ${parsedRFPs.length} RFP requests for set ${setId}`);
    }

    // Stage 3: Saving parsed results (70-90%)
    await updateProgress(setId, 75);
    
    // Create search term items for each RFP request
    for (const rfp of parsedRFPs) {
      await db.insert(searchTermItems).values({
        id: nanoid(),
        searchTermSetId: setId,
        itemNumber: rfp.requestNumber,
        itemType: "rfp_request",
        fullText: rfp.fullText,
        summary: rfp.summary,
        searchTerms: rfp.searchTerms,
        combinedBooleanString: rfp.combinedBoolean,
      });
    }

    await updateProgress(setId, 85);

    // Also add privilege search terms
    const privilegeTerms = privilegeService.generatePrivilegeSearchTerms();
    for (let i = 0; i < privilegeTerms.categories.length; i++) {
      const category = privilegeTerms.categories[i];
      await db.insert(searchTermItems).values({
        id: nanoid(),
        searchTermSetId: setId,
        itemNumber: 900 + i,
        itemType: "privilege_category",
        fullText: category.description,
        summary: category.categoryName,
        searchTerms: category.searchTerms,
        combinedBooleanString: category.combinedBoolean,
        isPrivilegeCategory: true,
      });
    }

    // Stage 4: Completing (90-100%)
    await updateProgress(setId, 95);

    // Update set status
    await db
      .update(searchTermSets)
      .set({
        generationStatus: "completed",
        generationProgress: 100,
        totalRequests: parsedRFPs.length + privilegeTerms.categories.length,
        updatedAt: new Date(),
      })
      .where(eq(searchTermSets.id, setId));

    console.log(`[SearchTerms] RFP processing complete for set ${setId}`);
  } catch (error: any) {
    console.error(`[SearchTerms] RFP processing failed for set ${setId}:`, error);
    await db
      .update(searchTermSets)
      .set({
        generationStatus: "failed",
        generationError: error.message,
        updatedAt: new Date(),
      })
      .where(eq(searchTermSets.id, setId));
  }
}

async function processComplaintDocument(setId: string, documentText: string) {
  const complaintService = new ComplaintParserService();
  const privilegeService = new PrivilegeDetectionService();

  try {
    console.log(`[SearchTerms] Processing complaint document for set ${setId}`);

    // Stage 1: Starting AI analysis (10%)
    await updateProgress(setId, 10);

    // Parse the complaint (10-70%)
    await updateProgress(setId, 20);
    const parsedClaims = await complaintService.parseComplaint(documentText);
    await updateProgress(setId, 70);

    // Stage 3: Saving parsed results (70-90%)
    await updateProgress(setId, 75);

    // Create search term items for each claim
    for (const claim of parsedClaims) {
      // Build fullText from factual allegations if not provided directly
      const fullText = claim.fullText || 
        (claim.factualAllegations && claim.factualAllegations.length > 0 
          ? claim.factualAllegations.map(a => `${a.paragraphRef}: ${a.allegation}`).join('\n')
          : `${claim.claimTitle || claim.causeOfAction} - Claim ${claim.claimNumber}`);
      
      // Use claimTitle or causeOfAction as summary
      const summary = claim.summary || claim.claimTitle || claim.causeOfAction || `Claim ${claim.claimNumber}`;

      await db.insert(searchTermItems).values({
        id: nanoid(),
        searchTermSetId: setId,
        itemNumber: claim.claimNumber,
        itemType: "complaint_claim",
        fullText: fullText,
        summary: summary,
        causeOfAction: claim.causeOfAction,
        legalElements: claim.legalElements,
        searchTerms: claim.searchTerms,
        combinedBooleanString: claim.combinedBoolean || "",
      });
    }

    await updateProgress(setId, 85);

    // Also add privilege search terms
    const privilegeTerms = privilegeService.generatePrivilegeSearchTerms();
    for (let i = 0; i < privilegeTerms.categories.length; i++) {
      const category = privilegeTerms.categories[i];
      await db.insert(searchTermItems).values({
        id: nanoid(),
        searchTermSetId: setId,
        itemNumber: 900 + i,
        itemType: "privilege_category",
        fullText: category.description,
        summary: category.categoryName,
        searchTerms: category.searchTerms,
        combinedBooleanString: category.combinedBoolean,
        isPrivilegeCategory: true,
      });
    }

    // Stage 4: Completing (90-100%)
    await updateProgress(setId, 95);

    // Update set status
    await db
      .update(searchTermSets)
      .set({
        generationStatus: "completed",
        generationProgress: 100,
        totalRequests: parsedClaims.length + privilegeTerms.categories.length,
        updatedAt: new Date(),
      })
      .where(eq(searchTermSets.id, setId));

    console.log(`[SearchTerms] Complaint processing complete for set ${setId}`);
  } catch (error: any) {
    console.error(`[SearchTerms] Complaint processing failed for set ${setId}:`, error);
    await db
      .update(searchTermSets)
      .set({
        generationStatus: "failed",
        generationProgress: 0,
        generationError: error.message,
        updatedAt: new Date(),
      })
      .where(eq(searchTermSets.id, setId));
  }
}
