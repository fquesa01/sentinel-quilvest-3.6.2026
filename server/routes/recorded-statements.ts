import { Router, Request, Response } from "express";
import multer from "multer";
import { db } from "../db";
import * as schema from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";
import { isAuthenticated, requireRole } from "../replitAuth";
import { ObjectStorageService, objectStorageClient } from "../objectStorage";
import { processUploadedStatement, extractTextFromPDF, extractTextFromStoredPDF } from "../services/recorded-statements-service";
import { GoogleGenAI } from "@google/genai";
import PDFDocument from "pdfkit";
import AdmZip from "adm-zip";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 },
});

const ALLOWED_ROLES = ["admin", "compliance_officer", "attorney", "external_counsel"];

router.get("/", isAuthenticated, requireRole(...ALLOWED_ROLES), async (req: any, res: Response) => {
  try {
    const { caseId, speakerName, statementType } = req.query;
    
    let query = db
      .select()
      .from(schema.recordedStatements)
      .orderBy(desc(schema.recordedStatements.createdAt));

    if (caseId) {
      query = query.where(eq(schema.recordedStatements.caseId, caseId as string)) as any;
    }

    const statements = await query.limit(100);
    res.json(statements);
  } catch (error: any) {
    console.error("Error fetching recorded statements:", error);
    res.status(500).json({ message: error.message });
  }
});

router.get("/:id", isAuthenticated, requireRole(...ALLOWED_ROLES), async (req: any, res: Response) => {
  try {
    const [statement] = await db
      .select()
      .from(schema.recordedStatements)
      .where(eq(schema.recordedStatements.id, req.params.id))
      .limit(1);

    if (!statement) {
      return res.status(404).json({ message: "Statement not found" });
    }

    res.json(statement);
  } catch (error: any) {
    console.error("Error fetching recorded statement:", error);
    res.status(500).json({ message: error.message });
  }
});

router.post("/", isAuthenticated, requireRole(...ALLOWED_ROLES), upload.single("file"), async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const {
      caseId,
      title,
      statementType,
      otherTypeDetail,
      description,
      statementDate,
      location,
      speakerName,
      speakerRole,
      speakerPartyId,
      interviewerName,
      additionalParticipants,
      transcriptText,
      isPrivileged,
      privilegeNotes,
      tags,
    } = req.body;

    if (!caseId) {
      return res.status(400).json({ message: "caseId is required" });
    }

    const file = req.file;

    // Handle zip file extraction
    const isZipFile = file && (
      file.mimetype === "application/zip" || 
      file.mimetype === "application/x-zip-compressed" ||
      file.originalname.toLowerCase().endsWith(".zip")
    );

    if (isZipFile) {
      console.log(`[RecordedStatements] Processing zip file: ${file.originalname}`);
      
      try {
        const zip = new AdmZip(file.buffer);
        const zipEntries = zip.getEntries();
        
        // Filter for PDF files only (ignore directories and non-PDF files)
        const pdfEntries = zipEntries.filter(entry => 
          !entry.isDirectory && 
          entry.entryName.toLowerCase().endsWith(".pdf") &&
          !entry.entryName.startsWith("__MACOSX") && // Ignore macOS metadata
          !entry.entryName.includes("/.") // Ignore hidden files
        );

        if (pdfEntries.length === 0) {
          return res.status(400).json({ 
            message: "No PDF files found in the zip archive. Please upload a zip containing PDF documents." 
          });
        }

        console.log(`[RecordedStatements] Found ${pdfEntries.length} PDF files in zip`);
        
        const createdStatements: any[] = [];
        const storageService = new ObjectStorageService();
        
        for (const entry of pdfEntries) {
          try {
            const pdfBuffer = entry.getData();
            // Extract filename without path and extension for title
            const entryName = entry.entryName.split("/").pop() || entry.entryName;
            const pdfTitle = entryName.replace(/\.pdf$/i, "");
            
            console.log(`[RecordedStatements] Processing PDF: ${pdfTitle} (${pdfBuffer.length} bytes)`);
            
            // Upload the PDF to storage
            const storagePath = `.private/recorded-statements/${caseId}/${Date.now()}-${entryName}`;
            const uploadedUrl = await storageService.uploadBuffer(
              storagePath,
              pdfBuffer,
              "application/pdf"
            );
            
            // Create the statement entry
            const [statement] = await db
              .insert(schema.recordedStatements)
              .values({
                caseId,
                title: pdfTitle,
                statementType: statementType || "interview",
                otherTypeDetail: otherTypeDetail || null,
                description: description || null,
                statementDate: statementDate ? new Date(statementDate) : null,
                location: location || null,
                speakerName: speakerName || "Unknown",
                speakerRole: speakerRole || null,
                speakerPartyId: speakerPartyId || null,
                interviewerName: interviewerName || null,
                additionalParticipants: additionalParticipants ? JSON.parse(additionalParticipants) : null,
                videoUrl: null,
                audioUrl: null,
                transcriptUrl: uploadedUrl,
                fileType: "transcript",
                fileName: entryName,
                fileSizeBytes: pdfBuffer.length,
                mimeType: "application/pdf",
                transcriptText: null,
                transcriptionStatus: "pending",
                isPrivileged: isPrivileged === "true" || isPrivileged === true,
                privilegeNotes: privilegeNotes || null,
                tags: tags ? JSON.parse(tags) : null,
                uploadedBy: userId,
              })
              .returning();
            
            createdStatements.push(statement);
            
            // Process PDF for text extraction in background
            (async () => {
              try {
                console.log(`[RecordedStatements] Extracting text from PDF: ${pdfTitle}`);
                const extractedText = await extractTextFromPDF(pdfBuffer);
                if (extractedText && extractedText.length > 50) {
                  await processUploadedStatement(statement.id, null, extractedText, {
                    mimeType: "application/pdf",
                    filename: entryName,
                  });
                } else {
                  console.log(`[RecordedStatements] PDF extraction yielded insufficient text (${extractedText?.length || 0} chars) for ${pdfTitle}`);
                }
              } catch (error) {
                console.error(`[RecordedStatements] PDF processing failed for ${pdfTitle}:`, error);
              }
            })();
            
          } catch (entryError: any) {
            console.error(`[RecordedStatements] Failed to process zip entry ${entry.entryName}:`, entryError);
            // Continue processing other files
          }
        }
        
        if (createdStatements.length === 0) {
          return res.status(500).json({ 
            message: "Failed to process any PDF files from the zip archive" 
          });
        }
        
        console.log(`[RecordedStatements] Successfully created ${createdStatements.length} statements from zip`);
        
        return res.status(201).json({
          message: `Successfully extracted and created ${createdStatements.length} statements from zip file`,
          count: createdStatements.length,
          statements: createdStatements,
        });
        
      } catch (zipError: any) {
        console.error("[RecordedStatements] Failed to process zip file:", zipError);
        return res.status(400).json({ 
          message: "Failed to extract zip file. Please ensure it is a valid zip archive.",
          error: zipError.message 
        });
      }
    }
    
    // Auto-generate title from filename if not provided
    let finalTitle = title;
    if (!finalTitle && file) {
      // Remove file extension and use as title
      finalTitle = file.originalname.replace(/\.[^/.]+$/, "");
    }
    if (!finalTitle) {
      finalTitle = `Statement ${new Date().toISOString().split("T")[0]}`;
    }

    // Speaker name is now optional - use placeholder if not provided
    const finalSpeakerName = speakerName || "Unknown";
    let videoUrl: string | null = null;
    let audioUrl: string | null = null;
    let transcriptUrl: string | null = null;
    let fileType: string | null = null;
    let mimeType: string | null = null;
    let fileName: string | null = null;
    let fileSizeBytes: number | null = null;

    if (file) {
      fileName = file.originalname;
      mimeType = file.mimetype;
      fileSizeBytes = file.size;

      const fileMimeType = mimeType || "application/octet-stream";
      const isVideo = fileMimeType.startsWith("video/");
      const isAudio = fileMimeType.startsWith("audio/");
      const isDocument = fileMimeType.includes("pdf") || fileMimeType.includes("document") || fileMimeType.includes("text");

      if (isVideo) fileType = "video";
      else if (isAudio) fileType = "audio";
      else if (isDocument) fileType = "transcript";
      else fileType = "other";

      const storageService = new ObjectStorageService();
      const storagePath = `.private/recorded-statements/${caseId}/${Date.now()}-${fileName}`;
      
      try {
        const uploadedUrl = await storageService.uploadBuffer(
          storagePath,
          file.buffer,
          fileMimeType
        );
        
        if (isVideo) videoUrl = uploadedUrl;
        else if (isAudio) audioUrl = uploadedUrl;
        else if (isDocument) transcriptUrl = uploadedUrl;
      } catch (uploadError: any) {
        console.error("[RecordedStatements] File upload failed:", uploadError);
        return res.status(500).json({ 
          message: "Failed to upload file to storage. Please try again.", 
          error: uploadError.message 
        });
      }
    }

    const [statement] = await db
      .insert(schema.recordedStatements)
      .values({
        caseId,
        title: finalTitle,
        statementType: statementType || "interview",
        otherTypeDetail: otherTypeDetail || null,
        description,
        statementDate: statementDate ? new Date(statementDate) : null,
        location,
        speakerName: finalSpeakerName,
        speakerRole,
        speakerPartyId,
        interviewerName,
        additionalParticipants: additionalParticipants ? JSON.parse(additionalParticipants) : null,
        videoUrl,
        audioUrl,
        transcriptUrl,
        fileType,
        fileName,
        fileSizeBytes,
        mimeType,
        transcriptText: transcriptText || null,
        transcriptionStatus: transcriptText ? "completed" : "pending",
        isPrivileged: isPrivileged === "true" || isPrivileged === true,
        privilegeNotes,
        tags: tags ? JSON.parse(tags) : null,
        uploadedBy: userId,
      })
      .returning();

    if (file && (file.mimetype.startsWith("video/") || file.mimetype.startsWith("audio/"))) {
      processUploadedStatement(statement.id, file.buffer, null, {
        mimeType: file.mimetype,
        filename: file.originalname,
      }).catch((error) => {
        console.error(`[RecordedStatements] Background processing failed for ${statement.id}:`, error);
      });
    } else if (file && file.mimetype.includes("pdf")) {
      (async () => {
        try {
          console.log(`[RecordedStatements] Extracting text from uploaded PDF for statement ${statement.id}`);
          const extractedText = await extractTextFromPDF(file.buffer);
          if (extractedText && extractedText.length > 50) {
            await processUploadedStatement(statement.id, null, extractedText, {
              mimeType: file.mimetype,
              filename: file.originalname,
            });
          } else {
            console.log(`[RecordedStatements] PDF extraction yielded insufficient text (${extractedText?.length || 0} chars) for statement ${statement.id}`);
          }
        } catch (error) {
          console.error(`[RecordedStatements] PDF processing failed for ${statement.id}:`, error);
        }
      })();
    } else if (transcriptText) {
      processUploadedStatement(statement.id, null, transcriptText, {}).catch((error) => {
        console.error(`[RecordedStatements] Background processing failed for ${statement.id}:`, error);
      });
    }

    res.status(201).json(statement);
  } catch (error: any) {
    console.error("Error creating recorded statement:", error);
    res.status(500).json({ message: error.message });
  }
});

router.patch("/:id", isAuthenticated, requireRole(...ALLOWED_ROLES), async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    delete updateData.id;
    delete updateData.createdAt;
    delete updateData.uploadedBy;
    
    updateData.updatedAt = new Date();

    if (updateData.statementDate) {
      updateData.statementDate = new Date(updateData.statementDate);
    }
    if (updateData.additionalParticipants && typeof updateData.additionalParticipants === "string") {
      updateData.additionalParticipants = JSON.parse(updateData.additionalParticipants);
    }
    if (updateData.tags && typeof updateData.tags === "string") {
      updateData.tags = JSON.parse(updateData.tags);
    }

    const [statement] = await db
      .update(schema.recordedStatements)
      .set(updateData)
      .where(eq(schema.recordedStatements.id, id))
      .returning();

    if (!statement) {
      return res.status(404).json({ message: "Statement not found" });
    }

    res.json(statement);
  } catch (error: any) {
    console.error("Error updating recorded statement:", error);
    res.status(500).json({ message: error.message });
  }
});

router.delete("/:id", isAuthenticated, requireRole(...ALLOWED_ROLES), async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const [deleted] = await db
      .delete(schema.recordedStatements)
      .where(eq(schema.recordedStatements.id, id))
      .returning();

    if (!deleted) {
      return res.status(404).json({ message: "Statement not found" });
    }

    res.json({ message: "Statement deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting recorded statement:", error);
    res.status(500).json({ message: error.message });
  }
});

router.post("/:id/reprocess", isAuthenticated, requireRole(...ALLOWED_ROLES), async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const [statement] = await db
      .select()
      .from(schema.recordedStatements)
      .where(eq(schema.recordedStatements.id, id))
      .limit(1);

    if (!statement) {
      return res.status(404).json({ message: "Statement not found" });
    }

    // If there's already transcript text, just re-run the AI analysis
    if (statement.transcriptText) {
      processUploadedStatement(id, null, statement.transcriptText, {}).catch((error) => {
        console.error(`[RecordedStatements] Reprocessing failed for ${id}:`, error);
      });
      return res.json({ message: "Reprocessing started", statementId: id });
    }
    
    // For PDFs without transcript text, extract text from the file
    const fileUrl = statement.transcriptUrl || statement.videoUrl || statement.audioUrl;
    
    if (!fileUrl) {
      return res.status(400).json({ message: "No file attached to this statement" });
    }

    const isPdf = statement.mimeType?.includes("pdf") || fileUrl.endsWith(".pdf");
    
    if (!isPdf) {
      return res.status(400).json({ 
        message: "Reprocessing is only supported for PDF documents. Audio/video files use automatic transcription." 
      });
    }

    // Set status to processing immediately
    await db
      .update(schema.recordedStatements)
      .set({ 
        transcriptionStatus: "processing",
        updatedAt: new Date() 
      })
      .where(eq(schema.recordedStatements.id, id));

    res.json({ 
      message: "Reprocessing started. Text extraction and AI analysis in progress.",
      statementId: id 
    });

    // Process in background
    (async () => {
      try {
        let objectPath = fileUrl;
        if (fileUrl.includes("/objects/")) {
          objectPath = "/objects/" + fileUrl.split("/objects/")[1];
        }

        console.log(`[RecordedStatements] Reprocessing PDF for statement ${id} from ${objectPath}`);
        
        const extractedText = await extractTextFromStoredPDF(objectPath);
        
        if (extractedText && extractedText.length > 50) {
          console.log(`[RecordedStatements] Extracted ${extractedText.length} chars, running AI analysis for ${id}`);
          await processUploadedStatement(id, null, extractedText, {
            mimeType: statement.mimeType || "application/pdf",
            filename: statement.fileName || "document.pdf",
          });
        } else {
          console.log(`[RecordedStatements] PDF extraction yielded insufficient text for ${id}`);
          await db
            .update(schema.recordedStatements)
            .set({ 
              transcriptionStatus: "failed",
              updatedAt: new Date() 
            })
            .where(eq(schema.recordedStatements.id, id));
        }
      } catch (error) {
        console.error(`[RecordedStatements] Reprocessing failed for ${id}:`, error);
        await db
          .update(schema.recordedStatements)
          .set({ 
            transcriptionStatus: "failed",
            updatedAt: new Date() 
          })
          .where(eq(schema.recordedStatements.id, id));
      }
    })();
  } catch (error: any) {
    console.error("Error reprocessing recorded statement:", error);
    res.status(500).json({ message: error.message });
  }
});

router.get("/:id/annotations", isAuthenticated, requireRole(...ALLOWED_ROLES), async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const annotations = await db
      .select()
      .from(schema.recordedStatementAnnotations)
      .where(eq(schema.recordedStatementAnnotations.statementId, id))
      .orderBy(schema.recordedStatementAnnotations.timestampSeconds);

    res.json(annotations);
  } catch (error: any) {
    console.error("Error fetching annotations:", error);
    res.status(500).json({ message: error.message });
  }
});

router.post("/:id/annotations", isAuthenticated, requireRole(...ALLOWED_ROLES), async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const { id } = req.params;
    const { timestampSeconds, endTimestampSeconds, annotationType, content, tags } = req.body;

    if (!timestampSeconds || !content) {
      return res.status(400).json({ message: "timestampSeconds and content are required" });
    }

    const [annotation] = await db
      .insert(schema.recordedStatementAnnotations)
      .values({
        statementId: id,
        userId,
        timestampSeconds,
        endTimestampSeconds,
        annotationType: annotationType || "note",
        content,
        tags: tags || null,
      })
      .returning();

    res.status(201).json(annotation);
  } catch (error: any) {
    console.error("Error creating annotation:", error);
    res.status(500).json({ message: error.message });
  }
});

router.delete("/:statementId/annotations/:annotationId", isAuthenticated, requireRole(...ALLOWED_ROLES), async (req: any, res: Response) => {
  try {
    const { annotationId } = req.params;

    const [deleted] = await db
      .delete(schema.recordedStatementAnnotations)
      .where(eq(schema.recordedStatementAnnotations.id, annotationId))
      .returning();

    if (!deleted) {
      return res.status(404).json({ message: "Annotation not found" });
    }

    res.json({ message: "Annotation deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting annotation:", error);
    res.status(500).json({ message: error.message });
  }
});

// Q&A endpoint for asking questions about the statement
router.post("/:id/ask", isAuthenticated, requireRole(...ALLOWED_ROLES), async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({ message: "Question is required" });
    }

    const [statement] = await db
      .select()
      .from(schema.recordedStatements)
      .where(eq(schema.recordedStatements.id, id))
      .limit(1);

    if (!statement) {
      return res.status(404).json({ message: "Statement not found" });
    }

    if (!statement.transcriptText) {
      return res.status(400).json({ message: "No transcript available for this statement" });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const prompt = `You are an expert legal analyst helping attorneys review recorded statements, depositions, and witness testimonies. You have access to the following statement transcript.

STATEMENT DETAILS:
- Title: ${statement.title}
- Type: ${statement.statementType}
- Speaker: ${statement.speakerName}${statement.speakerRole ? ` (${statement.speakerRole})` : ""}
${statement.interviewerName ? `- Interviewer: ${statement.interviewerName}` : ""}
${statement.statementDate ? `- Date: ${new Date(statement.statementDate).toLocaleDateString()}` : ""}
${statement.location ? `- Location: ${statement.location}` : ""}

TRANSCRIPT:
${statement.transcriptText.substring(0, 100000)}

${statement.aiSummary ? `\nAI SUMMARY:\n${statement.aiSummary}` : ""}

Instructions:
- Answer questions based on the transcript content
- Cite specific quotes when relevant
- Identify inconsistencies if asked
- Be precise and factual
- If something is not in the transcript, say so clearly

USER QUESTION: ${question}`;

    const response = await ai.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    for await (const chunk of response) {
      const text = (chunk as any).text || "";
      if (text) {
        res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (error: any) {
    console.error("Error in statement Q&A:", error);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});

// Download original file endpoint - downloads the actual uploaded file from storage
router.get("/:id/download", isAuthenticated, requireRole(...ALLOWED_ROLES), async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const [statement] = await db
      .select()
      .from(schema.recordedStatements)
      .where(eq(schema.recordedStatements.id, id))
      .limit(1);

    if (!statement) {
      return res.status(404).json({ message: "Statement not found" });
    }

    // Get the file URL from the statement (priority: transcriptUrl for documents, then video, then audio)
    const fileUrl = statement.transcriptUrl || statement.videoUrl || statement.audioUrl;
    
    if (!fileUrl) {
      return res.status(404).json({ message: "No file attached to this statement" });
    }

    // Extract the object path from the URL
    // URLs are typically in format: /objects/{bucketId}/{path} or full storage URLs
    let objectPath = fileUrl;
    if (fileUrl.includes("/objects/")) {
      objectPath = "/objects/" + fileUrl.split("/objects/")[1];
    }

    const storageService = new ObjectStorageService();
    
    try {
      const fileBuffer = await storageService.downloadAsBuffer(objectPath);
      
      const contentType = statement.mimeType || "application/octet-stream";
      const rawFileName = statement.fileName || "download";
      
      // Sanitize filename to prevent header injection attacks
      // Remove CR/LF, encode non-ASCII characters, and strip control characters
      const sanitizedFileName = rawFileName
        .replace(/[\r\n\0]/g, "") // Remove CR, LF, null bytes
        .replace(/[^\x20-\x7E]/g, "_") // Replace non-printable ASCII with underscore
        .replace(/"/g, "'"); // Replace quotes to prevent breaking header
      
      // Use RFC 5987 encoding for filename* parameter for better Unicode support
      const encodedFileName = encodeURIComponent(rawFileName).replace(/['()]/g, escape);
      
      res.setHeader("Content-Type", contentType);
      res.setHeader(
        "Content-Disposition", 
        `attachment; filename="${sanitizedFileName}"; filename*=UTF-8''${encodedFileName}`
      );
      res.setHeader("Content-Length", fileBuffer.length);
      res.send(fileBuffer);
    } catch (downloadError: any) {
      console.error("[RecordedStatements] Error downloading file from storage:", downloadError);
      return res.status(404).json({ message: "File not found in storage" });
    }
  } catch (error: any) {
    console.error("Error downloading statement file:", error);
    res.status(500).json({ message: error.message });
  }
});

// PDF summary export endpoint - generates a summary PDF with metadata and analysis
router.get("/:id/pdf", isAuthenticated, requireRole(...ALLOWED_ROLES), async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const [statement] = await db
      .select()
      .from(schema.recordedStatements)
      .where(eq(schema.recordedStatements.id, id))
      .limit(1);

    if (!statement) {
      return res.status(404).json({ message: "Statement not found" });
    }

    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => {
      const pdfBuffer = Buffer.concat(chunks);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${statement.title.replace(/[^a-zA-Z0-9\s-]/g, "")}.pdf"`);
      res.send(pdfBuffer);
    });

    // Title
    doc.fontSize(20).font("Helvetica-Bold").text(statement.title, { align: "center" });
    doc.moveDown(0.5);

    // Type badge
    doc.fontSize(12).font("Helvetica")
      .text(`Statement Type: ${statement.statementType.charAt(0).toUpperCase() + statement.statementType.slice(1).replace(/_/g, " ")}`, { align: "center" });
    doc.moveDown();

    // Privileged warning
    if (statement.isPrivileged) {
      doc.fontSize(10).font("Helvetica-Bold").fillColor("red")
        .text("PRIVILEGED AND CONFIDENTIAL - ATTORNEY-CLIENT PRIVILEGE", { align: "center" });
      doc.fillColor("black").moveDown();
    }

    // Metadata section
    doc.fontSize(14).font("Helvetica-Bold").text("Statement Details");
    doc.moveDown(0.3);
    doc.fontSize(10).font("Helvetica");

    const addField = (label: string, value: string | null | undefined) => {
      if (value) {
        doc.font("Helvetica-Bold").text(`${label}: `, { continued: true });
        doc.font("Helvetica").text(value);
      }
    };

    addField("Speaker", statement.speakerName);
    addField("Role", statement.speakerRole);
    addField("Interviewer", statement.interviewerName);
    if (statement.statementDate) {
      addField("Date", new Date(statement.statementDate).toLocaleDateString());
    }
    addField("Location", statement.location);
    addField("File", statement.fileName);
    if (statement.additionalParticipants?.length) {
      addField("Additional Participants", statement.additionalParticipants.join(", "));
    }
    doc.moveDown();

    // AI Summary
    if (statement.aiSummary) {
      doc.fontSize(14).font("Helvetica-Bold").text("AI Summary");
      doc.moveDown(0.3);
      doc.fontSize(10).font("Helvetica").text(statement.aiSummary);
      doc.moveDown();
    }

    // Credibility Analysis
    if (statement.credibilityScore !== null) {
      doc.fontSize(14).font("Helvetica-Bold").text(`Credibility Analysis (Score: ${statement.credibilityScore}/100)`);
      doc.moveDown(0.3);
      if (statement.credibilityAnalysis && typeof statement.credibilityAnalysis === "object") {
        const analysis = statement.credibilityAnalysis as Record<string, any>;
        if (analysis.overall_assessment) {
          doc.fontSize(10).font("Helvetica").text(analysis.overall_assessment);
        }
      }
      doc.moveDown();
    }

    // Transcript
    if (statement.transcriptText) {
      doc.addPage();
      doc.fontSize(14).font("Helvetica-Bold").text("Transcript");
      doc.moveDown(0.3);
      doc.fontSize(10).font("Helvetica").text(statement.transcriptText, {
        align: "left",
        lineGap: 2,
      });
    }

    // Footer
    doc.moveDown(2);
    doc.fontSize(8).font("Helvetica").fillColor("gray")
      .text(`Generated: ${new Date().toLocaleString()} | Sentinel Counsel LLP`, { align: "center" });

    doc.end();
  } catch (error: any) {
    console.error("Error generating PDF:", error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
