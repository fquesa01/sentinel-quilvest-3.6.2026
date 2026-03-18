import { Router } from "express";
import { db } from "../db";
import { eq, desc, and, sql, isNull } from "drizzle-orm";
import { firmFormTemplates } from "@shared/schema";
import { isAuthenticated } from "../replitAuth";
import multer from "multer";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

router.get("/form-templates", isAuthenticated, async (req: any, res) => {
  try {
    const templates = await db.select().from(firmFormTemplates).orderBy(desc(firmFormTemplates.updatedAt));
    res.json(templates);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/form-templates/:id", isAuthenticated, async (req: any, res) => {
  try {
    const [template] = await db.select().from(firmFormTemplates).where(eq(firmFormTemplates.id, req.params.id));
    if (!template) return res.status(404).json({ error: "Template not found" });
    res.json(template);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/form-templates", isAuthenticated, upload.single("file"), async (req: any, res) => {
  try {
    const { name, description, documentType, dealType, isDefault } = req.body;
    if (!name || !documentType) {
      return res.status(400).json({ error: "Name and document type are required" });
    }

    let content = "";
    let fileName = null;
    let fileSize = null;
    let mimeType = null;

    if (req.file) {
      fileName = req.file.originalname;
      fileSize = req.file.size;
      mimeType = req.file.mimetype;

      if (mimeType === "text/html" || mimeType === "text/plain" || fileName.endsWith(".html") || fileName.endsWith(".txt")) {
        content = req.file.buffer.toString("utf-8");
      } else if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || fileName.endsWith(".docx")) {
        try {
          const mammoth = await import("mammoth");
          const result = await mammoth.default.convertToHtml({ buffer: req.file.buffer });
          content = result.value;
        } catch {
          content = req.file.buffer.toString("utf-8");
        }
      } else if (mimeType === "application/pdf" || fileName.endsWith(".pdf")) {
        try {
          const pdfParse = (await import("pdf-parse")).default;
          const parsed = await pdfParse(req.file.buffer);
          content = parsed.text.split("\n").map((l: string) => `<p>${l}</p>`).join("\n");
        } catch {
          content = "[PDF content - could not extract text]";
        }
      } else {
        content = req.file.buffer.toString("utf-8");
      }
    } else if (req.body.content) {
      content = req.body.content;
    }

    if (isDefault === "true") {
      const scopeConditions = [eq(firmFormTemplates.documentType, documentType)];
      if (dealType) {
        scopeConditions.push(eq(firmFormTemplates.dealType, dealType));
      } else {
        scopeConditions.push(isNull(firmFormTemplates.dealType));
      }
      await db.update(firmFormTemplates)
        .set({ isDefault: false })
        .where(and(...scopeConditions));
    }

    const [template] = await db.insert(firmFormTemplates).values({
      name,
      description: description || null,
      documentType,
      dealType: dealType || null,
      content,
      fileName,
      fileSize,
      mimeType,
      isDefault: isDefault === "true",
      uploadedBy: req.user?.id || null,
    }).returning();

    console.log(`[FormTemplates] Uploaded template "${name}" (${documentType}) by user ${req.user?.id}`);
    res.json(template);
  } catch (err: any) {
    console.error("[FormTemplates] Upload error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

const ALLOWED_EXTENSIONS = [".docx", ".doc", ".pdf", ".html", ".txt"];
const ALLOWED_DOC_TYPES = new Set([
  "closing_disclosure", "deed", "bill_of_sale", "settlement_statement",
  "title_affidavit", "transfer_tax_declaration", "buyers_closing_certificate",
  "sellers_closing_certificate", "sellers_affidavit", "promissory_note",
  "mortgage", "security_agreement", "ucc_financing_statement", "loan_agreement",
  "guaranty_agreement", "borrowers_certificate", "lenders_closing_certificate",
  "purchase_agreement", "assignment_agreement", "operating_agreement",
  "escrow_agreement", "power_of_attorney", "affidavit_of_title", "other",
]);

router.post("/form-templates/bulk", isAuthenticated, upload.array("files", 50), async (req: any, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: "No files provided" });
    }

    let names: string[];
    let documentTypes: string[];
    try {
      names = JSON.parse(req.body.names || "[]");
      documentTypes = JSON.parse(req.body.documentTypes || "[]");
      if (!Array.isArray(names) || !Array.isArray(documentTypes)) {
        return res.status(400).json({ error: "names and documentTypes must be JSON arrays" });
      }
    } catch {
      return res.status(400).json({ error: "Invalid JSON in names or documentTypes" });
    }

    const results: { index: number; success: boolean; name: string; error?: string; template?: any }[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const name = (names[i] || file.originalname.replace(/\.[^.]+$/, "")).slice(0, 500);
      const rawDocType = documentTypes[i] || "other";
      const documentType = ALLOWED_DOC_TYPES.has(rawDocType) ? rawDocType : "other";

      const ext = "." + file.originalname.split(".").pop()?.toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        results.push({ index: i, success: false, name, error: `Unsupported file type: ${ext}` });
        continue;
      }

      try {
        let content = "";
        const fileName = file.originalname;
        const fileSize = file.size;
        const mimeType = file.mimetype;

        if (mimeType === "text/html" || mimeType === "text/plain" || fileName.endsWith(".html") || fileName.endsWith(".txt")) {
          content = file.buffer.toString("utf-8");
        } else if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || fileName.endsWith(".docx")) {
          try {
            const mammoth = await import("mammoth");
            const result = await mammoth.default.convertToHtml({ buffer: file.buffer });
            content = result.value;
          } catch {
            content = file.buffer.toString("utf-8");
          }
        } else if (mimeType === "application/pdf" || fileName.endsWith(".pdf")) {
          try {
            const pdfParse = (await import("pdf-parse")).default;
            const parsed = await pdfParse(file.buffer);
            content = parsed.text.split("\n").map((l: string) => `<p>${l}</p>`).join("\n");
          } catch {
            content = "[PDF content - could not extract text]";
          }
        } else {
          content = file.buffer.toString("utf-8");
        }

        const [template] = await db.insert(firmFormTemplates).values({
          name,
          description: null,
          documentType,
          dealType: null,
          content,
          fileName,
          fileSize,
          mimeType,
          isDefault: false,
          uploadedBy: req.user?.id || null,
        }).returning();

        results.push({ index: i, success: true, name, template });
      } catch (err: any) {
        results.push({ index: i, success: false, name, error: err.message });
      }
    }

    const succeeded = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    console.log(`[FormTemplates] Bulk upload: ${succeeded} succeeded, ${failed} failed, by user ${req.user?.id}`);
    res.json({ results, succeeded, failed, total: files.length });
  } catch (err: any) {
    console.error("[FormTemplates] Bulk upload error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.patch("/form-templates/:id", isAuthenticated, async (req: any, res) => {
  try {
    const { name, description, documentType, dealType, isDefault } = req.body;
    const updates: any = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (documentType !== undefined) updates.documentType = documentType;
    if (dealType !== undefined) updates.dealType = dealType;
    if (isDefault !== undefined) {
      updates.isDefault = isDefault;
      if (isDefault) {
        const [existing] = await db.select().from(firmFormTemplates).where(eq(firmFormTemplates.id, req.params.id));
        if (existing) {
          const effectiveDocType = documentType !== undefined ? documentType : existing.documentType;
          const effectiveDealType = dealType !== undefined ? dealType : existing.dealType;
          const scopeConditions = [eq(firmFormTemplates.documentType, effectiveDocType)];
          if (effectiveDealType) {
            scopeConditions.push(eq(firmFormTemplates.dealType, effectiveDealType));
          } else {
            scopeConditions.push(isNull(firmFormTemplates.dealType));
          }
          await db.update(firmFormTemplates)
            .set({ isDefault: false })
            .where(and(...scopeConditions));
        }
      }
    }

    const [updated] = await db.update(firmFormTemplates)
      .set(updates)
      .where(eq(firmFormTemplates.id, req.params.id))
      .returning();

    if (!updated) return res.status(404).json({ error: "Template not found" });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/form-templates/:id", isAuthenticated, async (req: any, res) => {
  try {
    const [deleted] = await db.delete(firmFormTemplates)
      .where(eq(firmFormTemplates.id, req.params.id))
      .returning();
    if (!deleted) return res.status(404).json({ error: "Template not found" });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/form-templates/:id/set-default", isAuthenticated, async (req: any, res) => {
  try {
    const [template] = await db.select().from(firmFormTemplates).where(eq(firmFormTemplates.id, req.params.id));
    if (!template) return res.status(404).json({ error: "Template not found" });

    const scopeConditions = [eq(firmFormTemplates.documentType, template.documentType)];
    if (template.dealType) {
      scopeConditions.push(eq(firmFormTemplates.dealType, template.dealType));
    } else {
      scopeConditions.push(isNull(firmFormTemplates.dealType));
    }
    await db.update(firmFormTemplates)
      .set({ isDefault: false })
      .where(and(...scopeConditions));

    const [updated] = await db.update(firmFormTemplates)
      .set({ isDefault: true, updatedAt: new Date() })
      .where(eq(firmFormTemplates.id, req.params.id))
      .returning();

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/form-templates/:id/remove-default", isAuthenticated, async (req: any, res) => {
  try {
    const [template] = await db.select().from(firmFormTemplates).where(eq(firmFormTemplates.id, req.params.id));
    if (!template) return res.status(404).json({ error: "Template not found" });
    if (!template.isDefault) return res.status(400).json({ error: "Template is not currently set as default" });

    const [updated] = await db.update(firmFormTemplates)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(eq(firmFormTemplates.id, req.params.id))
      .returning();

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
