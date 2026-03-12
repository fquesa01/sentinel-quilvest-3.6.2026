import { Router } from "express";
import { db } from "../db";
import { eq, and, desc } from "drizzle-orm";
import * as schema from "@shared/schema";
import { isAuthenticated, requireRole } from "../replitAuth";
import {
  autoGenerateClosingDocuments,
  aiEditDocument,
  updateDocumentContent,
  getDocumentVersions,
  exportDocumentToDocx,
  importDocxContent,
  getDocumentTypesForDeal,
  DOCUMENT_DISPLAY_NAMES,
  markdownToHtml,
} from "../services/closing-document-service";
import multer from "multer";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const VALID_STATUSES = ["draft", "review", "approved", "executed", "superseded"];

async function getDocForDeal(docId: string, dealId: string) {
  const [doc] = await db.select()
    .from(schema.closingDocuments)
    .where(and(
      eq(schema.closingDocuments.id, docId),
      eq(schema.closingDocuments.dealId, dealId)
    ));
  return doc || null;
}

router.get("/api/deals/:dealId/closing-documents", isAuthenticated, async (req: any, res) => {
  try {
    const { dealId } = req.params;
    const docs = await db.select()
      .from(schema.closingDocuments)
      .where(eq(schema.closingDocuments.dealId, dealId))
      .orderBy(schema.closingDocuments.title);

    const docsWithVersionCount = await Promise.all(docs.map(async (doc) => {
      const versions = await db.select()
        .from(schema.closingDocumentVersions)
        .where(eq(schema.closingDocumentVersions.closingDocumentId, doc.id));
      return { ...doc, versionCount: versions.length };
    }));

    res.json(docsWithVersionCount);
  } catch (error: any) {
    console.error("Error fetching closing documents:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/api/deals/:dealId/closing-documents/expected-types", isAuthenticated, async (req: any, res) => {
  try {
    const { dealId } = req.params;
    const [deal] = await db.select().from(schema.deals).where(eq(schema.deals.id, dealId));
    if (!deal) return res.status(404).json({ error: "Deal not found" });

    const dealType = deal.dealType || "real_estate";
    const role = deal.representationRole || undefined;
    const docTypes = getDocumentTypesForDeal(dealType, role);

    const expectedTypes = docTypes.map(dt => ({
      documentType: dt,
      title: DOCUMENT_DISPLAY_NAMES[dt] || dt.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
    }));

    res.json({ expectedTypes, dealType, representationRole: role || null });
  } catch (error: any) {
    console.error("Error fetching expected types:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/deals/:dealId/closing-documents/upload-new", isAuthenticated, upload.single("file"), async (req: any, res) => {
  try {
    const { dealId } = req.params;
    const userId = req.user?.claims?.sub;
    const documentType = req.body?.documentType;
    const versionType = req.body?.versionType || "draft";

    if (!documentType) return res.status(400).json({ error: "documentType is required" });
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const originalName = req.file.originalname || "";
    if (!originalName.toLowerCase().endsWith(".docx")) {
      return res.status(400).json({ error: "Only .docx files are accepted" });
    }

    const [deal] = await db.select().from(schema.deals).where(eq(schema.deals.id, dealId));
    if (!deal) return res.status(404).json({ error: "Deal not found" });

    const expectedTypes = getDocumentTypesForDeal(deal.dealType || "", deal.representationRole || null);
    const validTypes = expectedTypes.map(et => et.documentType);
    if (!validTypes.includes(documentType)) {
      return res.status(400).json({ error: "Invalid document type for this deal" });
    }

    const existingDoc = await db.select().from(schema.closingDocuments)
      .where(and(eq(schema.closingDocuments.dealId, dealId), eq(schema.closingDocuments.documentType, documentType)));
    if (existingDoc.length > 0) {
      return res.status(400).json({ error: "Document of this type already exists. Use the existing document's upload." });
    }

    const content = await importDocxContent(req.file.buffer);
    const title = DOCUMENT_DISPLAY_NAMES[documentType] || documentType.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase());
    const status = versionType === "final" ? "executed" : "draft";

    const [doc] = await db.insert(schema.closingDocuments).values({
      dealId,
      documentType,
      title,
      content,
      status,
      representationRole: deal.representationRole,
      generatedFromTerms: false,
      currentVersion: 1,
      createdBy: userId,
    }).returning();

    await db.insert(schema.closingDocumentVersions).values({
      closingDocumentId: doc.id,
      versionNumber: 1,
      content,
      changeDescription: versionType === "final" ? "Uploaded final version" : "Uploaded initial draft",
      changedBy: userId,
      source: "uploaded",
    });

    res.json(doc);
  } catch (error: any) {
    console.error("Error uploading new document:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/deals/:dealId/closing-documents/auto-generate", isAuthenticated, async (req: any, res) => {
  try {
    const { dealId } = req.params;
    const userId = req.user?.claims?.sub;
    const result = await autoGenerateClosingDocuments(dealId, userId);
    res.json(result);
  } catch (error: any) {
    console.error("Error auto-generating closing documents:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/api/deals/:dealId/closing-documents/:docId", isAuthenticated, async (req: any, res) => {
  try {
    const { docId, dealId } = req.params;
    const doc = await getDocForDeal(docId, dealId);
    if (!doc) return res.status(404).json({ error: "Document not found" });
    if (doc.content && !doc.content.trim().startsWith("<")) {
      doc.content = markdownToHtml(doc.content);
    }
    res.json(doc);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/api/deals/:dealId/closing-documents/:docId", isAuthenticated, async (req: any, res) => {
  try {
    const { docId, dealId } = req.params;
    const { content, status } = req.body;
    const userId = req.user?.claims?.sub;

    const doc = await getDocForDeal(docId, dealId);
    if (!doc) return res.status(404).json({ error: "Document not found" });

    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` });
    }

    if (content !== undefined) {
      if (typeof content !== "string") return res.status(400).json({ error: "Content must be a string" });
      const updated = await updateDocumentContent(docId, content, userId, "manual_edit", "Manual edit");
      if (status) {
        await db.update(schema.closingDocuments)
          .set({ status })
          .where(and(eq(schema.closingDocuments.id, docId), eq(schema.closingDocuments.dealId, dealId)));
      }
      return res.json(updated);
    }

    if (status) {
      const [updated] = await db.update(schema.closingDocuments)
        .set({ status, updatedAt: new Date() })
        .where(and(eq(schema.closingDocuments.id, docId), eq(schema.closingDocuments.dealId, dealId)))
        .returning();
      return res.json(updated);
    }

    res.status(400).json({ error: "No changes provided" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/deals/:dealId/closing-documents/:docId/ai-edit", isAuthenticated, async (req: any, res) => {
  try {
    const { docId, dealId } = req.params;
    const { instruction, source } = req.body;
    const userId = req.user?.claims?.sub;

    const doc = await getDocForDeal(docId, dealId);
    if (!doc) return res.status(404).json({ error: "Document not found" });

    if (!instruction || typeof instruction !== "string" || instruction.trim().length === 0) {
      return res.status(400).json({ error: "Instruction is required" });
    }
    if (instruction.length > 2000) {
      return res.status(400).json({ error: "Instruction too long (max 2000 characters)" });
    }

    const updated = await aiEditDocument(docId, instruction, userId, source === "voice_edit" ? "voice_edit" : "manual_edit");
    res.json(updated);
  } catch (error: any) {
    console.error("Error AI editing document:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/api/deals/:dealId/closing-documents/:docId/versions", isAuthenticated, async (req: any, res) => {
  try {
    const { docId, dealId } = req.params;
    const doc = await getDocForDeal(docId, dealId);
    if (!doc) return res.status(404).json({ error: "Document not found" });

    const versions = await getDocumentVersions(docId);
    res.json(versions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/deals/:dealId/closing-documents/:docId/restore/:versionId", isAuthenticated, async (req: any, res) => {
  try {
    const { docId, dealId, versionId } = req.params;
    const userId = req.user?.claims?.sub;

    const doc = await getDocForDeal(docId, dealId);
    if (!doc) return res.status(404).json({ error: "Document not found" });

    const [version] = await db.select()
      .from(schema.closingDocumentVersions)
      .where(and(
        eq(schema.closingDocumentVersions.id, versionId),
        eq(schema.closingDocumentVersions.closingDocumentId, docId)
      ));
    if (!version) return res.status(404).json({ error: "Version not found" });

    const updated = await updateDocumentContent(
      docId, version.content, userId, "restored",
      `Restored from version ${version.versionNumber}`
    );
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/api/deals/:dealId/closing-documents/:docId/download", isAuthenticated, async (req: any, res) => {
  try {
    const { docId, dealId } = req.params;
    const doc = await getDocForDeal(docId, dealId);
    if (!doc) return res.status(404).json({ error: "Document not found" });

    const buffer = await exportDocumentToDocx(docId);
    const filename = `${doc.title.replace(/[^a-zA-Z0-9\s-]/g, "").replace(/\s+/g, "_")}.docx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error: any) {
    console.error("Error downloading document:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/deals/:dealId/closing-documents/:docId/upload", isAuthenticated, upload.single("file"), async (req: any, res) => {
  try {
    const { docId, dealId } = req.params;
    const userId = req.user?.claims?.sub;
    const versionType = req.body?.versionType || "draft";

    const doc = await getDocForDeal(docId, dealId);
    if (!doc) return res.status(404).json({ error: "Document not found" });

    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const originalName = req.file.originalname || "";
    if (!originalName.toLowerCase().endsWith(".docx")) {
      return res.status(400).json({ error: "Only .docx files are accepted" });
    }

    const content = await importDocxContent(req.file.buffer);
    const description = versionType === "final" ? "Uploaded final version" : "Uploaded draft revision";
    const updated = await updateDocumentContent(docId, content, userId, "uploaded", description);

    if (versionType === "final") {
      await db.update(schema.closingDocuments)
        .set({ status: "executed", updatedAt: new Date() })
        .where(and(eq(schema.closingDocuments.id, docId), eq(schema.closingDocuments.dealId, dealId)));
    }

    const [refreshed] = await db.select().from(schema.closingDocuments)
      .where(and(eq(schema.closingDocuments.id, docId), eq(schema.closingDocuments.dealId, dealId)));
    res.json(refreshed || updated);
  } catch (error: any) {
    console.error("Error uploading document:", error);
    res.status(500).json({ error: error.message });
  }
});

router.delete("/api/deals/:dealId/closing-documents/:docId", isAuthenticated, async (req: any, res) => {
  try {
    const { docId, dealId } = req.params;
    const doc = await getDocForDeal(docId, dealId);
    if (!doc) return res.status(404).json({ error: "Document not found" });

    await db.delete(schema.closingDocuments)
      .where(and(eq(schema.closingDocuments.id, docId), eq(schema.closingDocuments.dealId, dealId)));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export function registerClosingDocumentsRoutes(app: any) {
  app.use(router);
}
