import { Router } from "express";
import { db } from "../db";
import { eq, desc, and, sql, isNull } from "drizzle-orm";
import { firmFormTemplates } from "@shared/schema";
import { isAuthenticated } from "../replitAuth";
import multer from "multer";
import { emailService } from "../services/email-service";

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
    const { name, description, documentType, dealType, isDefault, notes } = req.body;
    const updates: any = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (documentType !== undefined) updates.documentType = documentType;
    if (dealType !== undefined) updates.dealType = dealType;
    if (notes !== undefined) updates.notes = typeof notes === "string" ? notes : null;
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

router.post("/form-templates/:id/share", isAuthenticated, async (req: any, res) => {
  try {
    const { emails, message } = req.body;
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ error: "At least one email address is required" });
    }
    if (emails.length > 20) {
      return res.status(400).json({ error: "Maximum 20 recipients per share" });
    }
    if (!emails.every((e: any) => typeof e === "string")) {
      return res.status(400).json({ error: "All email entries must be strings" });
    }
    if (message !== undefined && typeof message !== "string") {
      return res.status(400).json({ error: "Message must be a string" });
    }
    if (typeof message === "string" && message.length > 2000) {
      return res.status(400).json({ error: "Message must be 2000 characters or less" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = emails.filter((e: string) => !emailRegex.test(e.trim()));
    if (invalidEmails.length > 0) {
      return res.status(400).json({ error: `Invalid email address(es): ${invalidEmails.join(", ")}` });
    }

    const [template] = await db.select().from(firmFormTemplates).where(eq(firmFormTemplates.id, req.params.id));
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }

    const senderName = req.user?.firstName && req.user?.lastName
      ? `${req.user.firstName} ${req.user.lastName}`
      : req.user?.email || "A team member";

    const docTypeLabel = template.documentType
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l: string) => l.toUpperCase());

    const templateUrl = `${req.protocol}://${req.get("host")}/form-templates`;

    const results: { email: string; success: boolean; error?: string }[] = [];

    for (const recipientEmail of emails) {
      const trimmedEmail = recipientEmail.trim();
      try {
        const html = buildTemplateShareEmailHtml({
          senderName,
          templateName: template.name,
          documentType: docTypeLabel,
          fileName: template.fileName,
          fileSize: template.fileSize,
          message: message?.trim() || undefined,
          templateUrl,
        });

        const success = await emailService.sendEmail({
          to: trimmedEmail,
          subject: `${senderName} shared a form template with you: ${template.name}`,
          html,
        });

        results.push({ email: trimmedEmail, success });
      } catch (err: any) {
        results.push({ email: trimmedEmail, success: false, error: err.message });
      }
    }

    const succeeded = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    console.log(`[FormTemplates] Share template "${template.name}" to ${emails.length} recipients: ${succeeded} sent, ${failed} failed`);

    if (failed > 0 && succeeded === 0) {
      return res.status(500).json({ error: "Failed to send all emails", results });
    }

    res.json({ success: true, results, succeeded, failed, total: emails.length });
  } catch (err: any) {
    console.error("[FormTemplates] Share error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildTemplateShareEmailHtml(data: {
  senderName: string;
  templateName: string;
  documentType: string;
  fileName: string | null;
  fileSize: number | null;
  message?: string;
  templateUrl: string;
}): string {
  const senderName = escapeHtml(data.senderName);
  const templateName = escapeHtml(data.templateName);
  const documentType = escapeHtml(data.documentType);
  const fileName = data.fileName ? escapeHtml(data.fileName) : null;
  const fileSize = data.fileSize;
  const message = data.message ? escapeHtml(data.message) : undefined;
  const templateUrl = encodeURI(data.templateUrl);

  const fileSizeFormatted = fileSize
    ? fileSize < 1024 ? `${fileSize} B`
      : fileSize < 1024 * 1024 ? `${(fileSize / 1024).toFixed(1)} KB`
      : `${(fileSize / (1024 * 1024)).toFixed(1)} MB`
    : null;

  const fileDetails = fileName
    ? `<div style="color: #6c757d; font-size: 13px; margin-top: 8px;">File: ${fileName}${fileSizeFormatted ? ` (${fileSizeFormatted})` : ""}</div>`
    : "";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
        .template-card { background: white; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .template-name { font-size: 18px; font-weight: 600; color: #1a1a2e; margin-bottom: 8px; }
        .template-type { display: inline-block; background: #e9ecef; color: #495057; padding: 3px 10px; border-radius: 4px; font-size: 13px; font-weight: 500; }
        .message-box { background: #e7f3ff; border-left: 4px solid #0066cc; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0; }
        .button { display: inline-block; background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; }
        .footer { text-align: center; padding: 20px; color: #6c757d; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Form Template Shared With You</h1>
        </div>
        <div class="content">
          <p><strong>${senderName}</strong> has shared a form template with you on Sentinel Counsel.</p>
          
          <div class="template-card">
            <div class="template-name">${templateName}</div>
            <span class="template-type">${documentType}</span>
            ${fileDetails}
          </div>
          
          ${message ? `<div class="message-box"><strong>Message:</strong> ${message}</div>` : ""}
          
          <p style="text-align: center; margin-top: 25px;">
            <a href="${templateUrl}" class="button">View Templates</a>
          </p>
        </div>
        <div class="footer">
          <p>This email was sent by Sentinel Counsel LLP.<br>Compliance monitoring and case management platform.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export default router;
