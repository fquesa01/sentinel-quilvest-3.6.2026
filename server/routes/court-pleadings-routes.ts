import { Express, Request, Response } from "express";
import { db } from "../db";
import { courtPleadings } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import multer from "multer";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import { indexDocument } from "../services/document-indexing-service";
import { ObjectStorageService } from "../objectStorage";
import { nanoid } from "nanoid";
import { z } from "zod";

const upload = multer({ storage: multer.memoryStorage() });

const validPleadingTypes = ["complaint", "answer", "motion", "brief", "court_order", "discovery", "subpoena", "settlement", "judgment", "other"] as const;

const updatePleadingSchema = z.object({
  title: z.string().min(1).optional(),
  pleadingType: z.enum(validPleadingTypes).optional(),
  filingDate: z.string().nullable().optional(),
  filedBy: z.string().nullable().optional(),
});

export function registerCourtPleadingsRoutes(app: Express, isAuthenticated: any) {
  // Get all court pleadings for a case
  app.get("/api/cases/:caseId/court-pleadings", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { caseId } = req.params;
      
      const pleadings = await db
        .select()
        .from(courtPleadings)
        .where(eq(courtPleadings.caseId, caseId))
        .orderBy(desc(courtPleadings.createdAt));
      
      res.json(pleadings);
    } catch (error) {
      console.error("[CourtPleadings] Error fetching pleadings:", error);
      res.status(500).json({ message: "Failed to fetch court pleadings" });
    }
  });

  // Upload a court pleading
  app.post("/api/cases/:caseId/court-pleadings", isAuthenticated, upload.single("file"), async (req: any, res: Response) => {
    try {
      const { caseId } = req.params;
      const file = req.file;
      const userId = req.userId;
      
      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const { title, pleadingType, filingDate, filedBy } = req.body;
      
      if (!title || typeof title !== "string" || title.trim().length === 0) {
        return res.status(400).json({ message: "Title is required" });
      }
      
      const validatedType = validPleadingTypes.includes(pleadingType) ? pleadingType : "other";
      
      // Extract text from the document
      let extractedText = "";
      const mimeType = file.mimetype;
      
      try {
        if (mimeType === "application/pdf") {
          const pdfData = await pdfParse(file.buffer);
          extractedText = pdfData.text;
        } else if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || 
                   mimeType === "application/msword") {
          const result = await mammoth.extractRawText({ buffer: file.buffer });
          extractedText = result.value;
        } else if (mimeType === "text/plain") {
          extractedText = file.buffer.toString("utf-8");
        }
      } catch (extractError) {
        console.error("[CourtPleadings] Error extracting text:", extractError);
      }
      
      // Upload file to object storage
      let storagePath: string | null = null;
      try {
        const objectStorage = new ObjectStorageService();
        const fileExtension = file.originalname.split('.').pop() || 'bin';
        const filePath = `court-pleadings/${caseId}/${nanoid()}.${fileExtension}`;
        storagePath = await objectStorage.uploadBuffer(filePath, file.buffer, mimeType);
        console.log(`[CourtPleadings] File uploaded to: ${storagePath}`);
      } catch (storageError) {
        console.error("[CourtPleadings] Error uploading to storage:", storageError);
      }
      
      // Create the pleading record
      const [pleading] = await db.insert(courtPleadings).values({
        caseId,
        title: title.trim(),
        pleadingType: validatedType,
        filingDate: filingDate ? new Date(filingDate) : null,
        filedBy: filedBy || null,
        fileName: file.originalname,
        fileType: mimeType,
        fileSize: file.size,
        storagePath,
        extractedText,
        uploadedBy: userId,
      }).returning();
      
      // Index the document for RAG if we have extracted text
      if (extractedText && extractedText.length > 100) {
        try {
          await indexDocument({
            documentId: `court-pleading-${pleading.id}`,
            caseId,
            fileName: `${title}.txt`,
            displayName: title,
            content: extractedText,
            metadata: {
              documentType: `court_pleading_${validatedType}`,
              subject: title,
              date: filingDate || new Date().toISOString(),
            }
          });
          
          // Update indexing status
          await db.update(courtPleadings)
            .set({ 
              isIndexed: true, 
              indexedAt: new Date() 
            })
            .where(eq(courtPleadings.id, pleading.id));
            
          console.log(`[CourtPleadings] Indexed pleading ${pleading.id} for RAG`);
        } catch (indexError) {
          console.error("[CourtPleadings] Error indexing document:", indexError);
        }
      }
      
      res.status(201).json(pleading);
    } catch (error) {
      console.error("[CourtPleadings] Error uploading pleading:", error);
      res.status(500).json({ message: "Failed to upload court pleading" });
    }
  });

  // Download a court pleading
  app.get("/api/court-pleadings/:id/download", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const [pleading] = await db
        .select()
        .from(courtPleadings)
        .where(eq(courtPleadings.id, id))
        .limit(1);
      
      if (!pleading) {
        return res.status(404).json({ message: "Court pleading not found" });
      }
      
      if (!pleading.storagePath) {
        return res.status(404).json({ message: "File not available for download" });
      }
      
      const objectStorage = new ObjectStorageService();
      const fileBuffer = await objectStorage.downloadAsBuffer(pleading.storagePath);
      
      res.setHeader("Content-Type", pleading.fileType || "application/octet-stream");
      res.setHeader("Content-Disposition", `attachment; filename="${pleading.fileName}"`);
      res.send(fileBuffer);
    } catch (error) {
      console.error("[CourtPleadings] Error downloading pleading:", error);
      res.status(500).json({ message: "Failed to download court pleading" });
    }
  });

  // Delete a court pleading
  app.delete("/api/court-pleadings/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      await db.delete(courtPleadings).where(eq(courtPleadings.id, id));
      
      res.json({ message: "Court pleading deleted" });
    } catch (error) {
      console.error("[CourtPleadings] Error deleting pleading:", error);
      res.status(500).json({ message: "Failed to delete court pleading" });
    }
  });

  // Update a court pleading
  app.patch("/api/court-pleadings/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const validation = updatePleadingSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Invalid data", 
          errors: validation.error.flatten() 
        });
      }
      
      const { title, pleadingType, filingDate, filedBy } = validation.data;
      
      const updateData: Record<string, any> = {
        updatedAt: new Date(),
      };
      
      if (title !== undefined) updateData.title = title;
      if (pleadingType !== undefined) updateData.pleadingType = pleadingType;
      if (filingDate !== undefined) updateData.filingDate = filingDate ? new Date(filingDate) : null;
      if (filedBy !== undefined) updateData.filedBy = filedBy;
      
      const [updated] = await db.update(courtPleadings)
        .set(updateData)
        .where(eq(courtPleadings.id, id))
        .returning();
      
      if (!updated) {
        return res.status(404).json({ message: "Court pleading not found" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("[CourtPleadings] Error updating pleading:", error);
      res.status(500).json({ message: "Failed to update court pleading" });
    }
  });

  console.log("[CourtPleadings] Routes registered");
}
