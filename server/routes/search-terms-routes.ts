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
import ExcelJS from "exceljs";

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
        const { pleadingId, name, description, sourceType = "complaint" } = req.body;
        const userId = (req as any).user?.claims?.sub;

        if (!pleadingId) {
          return res.status(400).json({ success: false, error: "No pleading ID provided" });
        }

        // Validate sourceType
        if (sourceType !== "complaint" && sourceType !== "rfp") {
          return res.status(400).json({ success: false, error: "Invalid source type. Must be 'complaint' or 'rfp'" });
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

        // Generate appropriate name based on source type
        const defaultName = sourceType === "rfp" 
          ? `RFP Analysis - ${pleading.title || pleading.fileName}`
          : `Complaint Analysis - ${pleading.title || pleading.fileName}`;

        // Create the search term set
        const [set] = await db
          .insert(searchTermSets)
          .values({
            id: nanoid(),
            caseId,
            sourceType,
            sourceDocumentName: pleading.title || pleading.fileName,
            name: name || defaultName,
            description,
            generationStatus: "processing",
            generationProgress: 0,
            createdBy: userId,
          })
          .returning();

        // Process asynchronously using the already extracted text based on source type
        if (sourceType === "rfp") {
          processRFPDocument(set.id, documentText).catch((err) => {
            console.error("[SearchTerms] Async RFP processing failed:", err);
          });
        } else {
          processComplaintDocument(set.id, documentText).catch((err) => {
            console.error("[SearchTerms] Async complaint processing failed:", err);
          });
        }

        res.json({ success: true, data: set });
      } catch (error) {
        console.error("[SearchTerms] Error analyzing pleading:", error);
        res.status(500).json({ success: false, error: "Failed to analyze pleading" });
      }
    }
  );

  // POST /api/cases/:caseId/search-term-sets/create-custom - Create custom search from description
  app.post(
    "/api/cases/:caseId/search-term-sets/create-custom",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const { caseId } = req.params;
        const { title, description, searchObjective } = req.body;
        const userId = (req as any).user?.claims?.sub;

        if (!title || !searchObjective) {
          return res.status(400).json({ 
            success: false, 
            error: "Title and search objective are required" 
          });
        }

        // Create the search term set
        const [set] = await db
          .insert(searchTermSets)
          .values({
            id: nanoid(),
            caseId,
            sourceType: "custom" as any,
            sourceDocumentName: null,
            name: title,
            description: description || searchObjective,
            generationStatus: "processing",
            generationProgress: 0,
            createdBy: userId,
          })
          .returning();

        // Process asynchronously
        processCustomSearch(set.id, title, searchObjective).catch((err) => {
          console.error("[SearchTerms] Async custom search processing failed:", err);
        });

        res.json({ success: true, data: set });
      } catch (error) {
        console.error("[SearchTerms] Error creating custom search:", error);
        res.status(500).json({ success: false, error: "Failed to create custom search" });
      }
    }
  );

  // POST /api/cases/:caseId/search-term-sets/upload-reference - Upload document to find related materials
  app.post(
    "/api/cases/:caseId/search-term-sets/upload-reference",
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
            sourceType: "custom" as any,
            sourceDocumentName: file.originalname,
            name: name || `Find Related - ${file.originalname}`,
            description: description || "Find documents related to uploaded reference",
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
        processReferenceDocument(set.id, documentText, file.originalname).catch((err) => {
          console.error("[SearchTerms] Async reference document processing failed:", err);
        });

        res.json({ success: true, data: set });
      } catch (error) {
        console.error("[SearchTerms] Error uploading reference document:", error);
        res.status(500).json({ success: false, error: "Failed to upload reference document" });
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

  // GET /api/cases/:caseId/search-term-sets/:setId/export - Export search terms to Excel
  app.get("/api/cases/:caseId/search-term-sets/:setId/export", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { caseId, setId } = req.params;

      // Get the search term set
      const [set] = await db
        .select()
        .from(searchTermSets)
        .where(and(eq(searchTermSets.id, setId), eq(searchTermSets.caseId, caseId)));

      if (!set) {
        return res.status(404).json({ success: false, error: "Search term set not found" });
      }

      // Get all items for this set
      const items = await db
        .select()
        .from(searchTermItems)
        .where(eq(searchTermItems.searchTermSetId, setId))
        .orderBy(searchTermItems.itemNumber);

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Search Terms");

      // Define columns based on source type
      const isRFP = set.sourceType === "rfp";
      worksheet.columns = [
        { header: isRFP ? "RFP Number" : "Claim Number", key: "number", width: 15 },
        { header: isRFP ? "RFP Request" : "Cause of Action", key: "text", width: 60 },
        { header: "Search Terms", key: "searchTerms", width: 80 },
      ];

      // Style header row
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1E3A5F" }, // Dark blue header
      };
      worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

      // Add rows
      items.forEach((item) => {
        const searchTermsArray = (item.searchTerms as any[]) || [];
        const enabledTerms = searchTermsArray.filter((t: any) => t.enabled !== false);
        const termsText = enabledTerms.map((t: any) => t.term).join("\n");

        worksheet.addRow({
          number: isRFP ? `Request ${item.itemNumber}` : `Claim ${item.itemNumber}`,
          // For RFP: use fullText (original request), for complaints: use causeOfAction or summary
          text: isRFP ? item.fullText : (item.causeOfAction || item.summary || item.fullText),
          searchTerms: termsText || item.combinedBooleanString || "",
        });
      });

      // Apply text wrapping and borders
      worksheet.eachRow((row: any, rowNumber: number) => {
        row.eachCell((cell: any) => {
          cell.alignment = { wrapText: true, vertical: "top" };
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
        });
        if (rowNumber > 1) {
          row.height = 50; // Give space for wrapped text
        }
      });

      // Set response headers
      const fileName = `search-terms-${set.name.replace(/[^a-zA-Z0-9]/g, "-")}.xlsx`;
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error("[SearchTerms] Error exporting search terms:", error);
      res.status(500).json({ success: false, error: "Failed to export search terms" });
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

// Process custom search from user description
async function processCustomSearch(setId: string, title: string, searchObjective: string) {
  try {
    console.log(`[SearchTerms] Processing custom search for set ${setId}`);
    await updateProgress(setId, 10);

    // Use Google Gemini to generate search terms from the user's description
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error("GOOGLE_API_KEY not configured");
    }

    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });

    await updateProgress(setId, 30);

    const prompt = `You are a legal discovery expert. Generate comprehensive Boolean search terms for the following search objective.

SEARCH TITLE: ${title}

SEARCH OBJECTIVE:
${searchObjective}

Generate search terms that will help find relevant documents, communications, and materials related to this objective.

Return your response as a JSON object with this structure:
{
  "searchItems": [
    {
      "itemNumber": 1,
      "focus": "Brief description of what this search focuses on",
      "searchTerms": [
        {
          "term": "Boolean search string using AND, OR, NOT operators and quotes for phrases",
          "type": "boolean",
          "rationale": "Why this term helps find relevant documents"
        }
      ],
      "combinedBoolean": "Combined query joining all terms with OR"
    }
  ]
}

Create 2-4 search items covering different aspects of the objective. Each should have 3-5 search terms.
Return ONLY valid JSON, no explanation or markdown.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { maxOutputTokens: 4096 },
    });

    await updateProgress(setId, 60);

    const responseText = (response as any).text?.trim() || "";
    let jsonStr = responseText;
    if (jsonStr.startsWith("```json")) jsonStr = jsonStr.slice(7);
    else if (jsonStr.startsWith("```")) jsonStr = jsonStr.slice(3);
    if (jsonStr.endsWith("```")) jsonStr = jsonStr.slice(0, -3);
    jsonStr = jsonStr.trim();

    const parsed = JSON.parse(jsonStr);
    const searchItems = parsed.searchItems || [];

    await updateProgress(setId, 75);

    // Create search term items
    for (const item of searchItems) {
      const formattedTerms = (item.searchTerms || []).map((t: any, idx: number) => ({
        id: nanoid(8),
        term: t.term,
        type: t.type || "boolean",
        enabled: true,
        aiGenerated: true,
        rationale: t.rationale,
      }));

      await db.insert(searchTermItems).values({
        id: nanoid(),
        searchTermSetId: setId,
        itemNumber: item.itemNumber,
        itemType: "custom_search",
        fullText: searchObjective,
        summary: item.focus,
        searchTerms: formattedTerms,
        combinedBooleanString: item.combinedBoolean,
      });
    }

    await updateProgress(setId, 95);

    await db
      .update(searchTermSets)
      .set({
        generationStatus: "completed",
        generationProgress: 100,
        totalRequests: searchItems.length,
        updatedAt: new Date(),
      })
      .where(eq(searchTermSets.id, setId));

    console.log(`[SearchTerms] Custom search processing complete for set ${setId}`);
  } catch (error: any) {
    console.error(`[SearchTerms] Custom search processing failed for set ${setId}:`, error);
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

// Process reference document to find related materials
async function processReferenceDocument(setId: string, documentText: string, fileName: string) {
  try {
    console.log(`[SearchTerms] Processing reference document for set ${setId}`);
    await updateProgress(setId, 10);

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error("GOOGLE_API_KEY not configured");
    }

    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });

    await updateProgress(setId, 20);

    // First, analyze the document to extract key entities
    const analysisPrompt = `Analyze this document and extract key entities that would help find related documents.

DOCUMENT: ${fileName}
CONTENT (first 8000 chars):
${documentText.slice(0, 8000)}

Extract and return a JSON object:
{
  "documentType": "contract/agreement/memo/letter/email/report/other",
  "documentTitle": "Title or subject of the document",
  "parties": ["Names of people or companies mentioned"],
  "keyDates": ["Important dates mentioned"],
  "keyTopics": ["Main topics or subjects discussed"],
  "references": ["Other documents or agreements referenced"],
  "keyTerms": ["Important defined terms or concepts"]
}

Return ONLY valid JSON.`;

    const analysisResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: analysisPrompt }] }],
      config: { maxOutputTokens: 2048 },
    });

    await updateProgress(setId, 40);

    let analysisText = (analysisResponse as any).text?.trim() || "{}";
    if (analysisText.startsWith("```json")) analysisText = analysisText.slice(7);
    else if (analysisText.startsWith("```")) analysisText = analysisText.slice(3);
    if (analysisText.endsWith("```")) analysisText = analysisText.slice(0, -3);
    
    const analysis = JSON.parse(analysisText.trim());

    await updateProgress(setId, 50);

    // Now generate search terms based on the analysis
    const searchPrompt = `Generate Boolean search terms to find documents related to this document.

DOCUMENT ANALYSIS:
- Type: ${analysis.documentType || "unknown"}
- Title: ${analysis.documentTitle || fileName}
- Parties: ${(analysis.parties || []).join(", ") || "N/A"}
- Key Topics: ${(analysis.keyTopics || []).join(", ") || "N/A"}
- Referenced Documents: ${(analysis.references || []).join(", ") || "N/A"}
- Key Terms: ${(analysis.keyTerms || []).join(", ") || "N/A"}

Generate search terms in these categories:
1. Direct References - Find mentions of this specific document
2. Related Communications - Find emails/messages discussing this document or its parties
3. Related Documents - Find similar or connected documents
4. Follow-up Materials - Find documents that may have been created as a result

Return JSON:
{
  "searchItems": [
    {
      "itemNumber": 1,
      "category": "category name",
      "focus": "What this search looks for",
      "searchTerms": [
        {
          "term": "Boolean search string",
          "type": "boolean",
          "rationale": "Why this helps"
        }
      ],
      "combinedBoolean": "Combined query"
    }
  ]
}

Return ONLY valid JSON.`;

    const searchResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: searchPrompt }] }],
      config: { maxOutputTokens: 4096 },
    });

    await updateProgress(setId, 70);

    let searchText = (searchResponse as any).text?.trim() || "";
    if (searchText.startsWith("```json")) searchText = searchText.slice(7);
    else if (searchText.startsWith("```")) searchText = searchText.slice(3);
    if (searchText.endsWith("```")) searchText = searchText.slice(0, -3);

    const searchData = JSON.parse(searchText.trim());
    const searchItems = searchData.searchItems || [];

    await updateProgress(setId, 85);

    // Create search term items
    for (const item of searchItems) {
      const formattedTerms = (item.searchTerms || []).map((t: any) => ({
        id: nanoid(8),
        term: t.term,
        type: t.type || "boolean",
        enabled: true,
        aiGenerated: true,
        rationale: t.rationale,
      }));

      await db.insert(searchTermItems).values({
        id: nanoid(),
        searchTermSetId: setId,
        itemNumber: item.itemNumber,
        itemType: "reference_search",
        fullText: `Find documents related to: ${analysis.documentTitle || fileName}`,
        summary: `${item.category}: ${item.focus}`,
        searchTerms: formattedTerms,
        combinedBooleanString: item.combinedBoolean,
      });
    }

    await updateProgress(setId, 95);

    await db
      .update(searchTermSets)
      .set({
        generationStatus: "completed",
        generationProgress: 100,
        totalRequests: searchItems.length,
        updatedAt: new Date(),
      })
      .where(eq(searchTermSets.id, setId));

    console.log(`[SearchTerms] Reference document processing complete for set ${setId}`);
  } catch (error: any) {
    console.error(`[SearchTerms] Reference document processing failed for set ${setId}:`, error);
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
