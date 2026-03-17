import { Router } from "express";
import { db } from "../db";
import { eq, desc, and, sql } from "drizzle-orm";
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
      await db.update(firmFormTemplates)
        .set({ isDefault: false })
        .where(eq(firmFormTemplates.documentType, documentType));
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
          await db.update(firmFormTemplates)
            .set({ isDefault: false })
            .where(eq(firmFormTemplates.documentType, existing.documentType));
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

    await db.update(firmFormTemplates)
      .set({ isDefault: false })
      .where(eq(firmFormTemplates.documentType, template.documentType));

    const [updated] = await db.update(firmFormTemplates)
      .set({ isDefault: true, updatedAt: new Date() })
      .where(eq(firmFormTemplates.id, req.params.id))
      .returning();

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
