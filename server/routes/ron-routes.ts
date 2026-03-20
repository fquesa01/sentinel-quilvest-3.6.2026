import { Router, type Express } from "express";
import multer from "multer";
import { randomBytes } from "crypto";
import { nanoid } from "nanoid";
import { isAuthenticated, requireRole } from "../replitAuth";
import * as journalService from "../services/ron-journal-service";
import * as complianceService from "../services/ron-compliance-service";
import * as queueService from "../services/ron-queue-service";
import { uploadFile, downloadFile, deleteFile, RON_DOCUMENTS_BUCKET } from "../supabaseStorage";
import { storage } from "../storage";
import type { RonComplianceCheck } from "@shared/schema";
import { convertWordToPdf } from "../word-to-pdf";

type ComplianceCheckType = RonComplianceCheck["checkType"];

const VALID_COMPLIANCE_CHECK_TYPES: readonly ComplianceCheckType[] = [
  "ofac", "aml", "pep", "kba", "credential_analysis", "liveness",
  "biometric_match", "geolocation", "device_check", "corporate_authority"
] as const;

function isComplianceCheckType(value: unknown): value is ComplianceCheckType {
  return typeof value === "string" && VALID_COMPLIANCE_CHECK_TYPES.includes(value as ComplianceCheckType);
}

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });

router.use(isAuthenticated);

async function verifyTransactionAccess(transactionId: string, userId: string, userRole: string) {
  const txn = await storage.getRonTransaction(transactionId);
  if (!txn) return { txn: null, error: "Transaction not found" };
  if (userRole !== "super_admin" && txn.createdBy !== userId) {
    return { txn: null, error: "Access denied" };
  }
  return { txn };
}

// ============================================================================
// TRANSACTIONS
// ============================================================================

router.get("/transactions", async (req: any, res) => {
  try {
    const { status, dealId } = req.query;
    const filters: { status?: string; dealId?: string; createdBy?: string } = {};
    if (req.user.role !== "super_admin") filters.createdBy = req.user.id;
    if (status) filters.status = status as string;
    if (dealId) filters.dealId = dealId as string;

    const transactions = await storage.getRonTransactions(filters);
    const enriched = await Promise.all(
      transactions.map(async (txn) => {
        const signers = await storage.getRonSigners(txn.id);
        const sessions = await storage.getRonSessions(txn.id);
        const scheduledSession = sessions
          .filter(s => s.status === "scheduled" && s.scheduledStart)
          .sort((a, b) => new Date(a.scheduledStart!).getTime() - new Date(b.scheduledStart!).getTime())[0];
        return {
          ...txn,
          signerCount: signers.length,
          nextSessionDate: scheduledSession?.scheduledStart || null,
        };
      })
    );
    res.json(enriched);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message });
  }
});

router.get("/transactions/:id", async (req: any, res) => {
  try {
    const { txn, error } = await verifyTransactionAccess(req.params.id, req.user.id, req.user.role);
    if (error) return res.status(txn === null && error === "Transaction not found" ? 404 : 403).json({ message: error });

    const signers = await storage.getRonSigners(req.params.id);
    const documents = await storage.getRonDocuments(req.params.id);
    const sessions = await storage.getRonSessions(req.params.id);
    const latestEligibility = await complianceService.getLatestEligibilityCheck(req.params.id);

    res.json({ ...txn, signers, documents, sessions, eligibilityCheck: latestEligibility });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

router.post("/transactions", async (req: any, res) => {
  try {
    const body = req.body;
    const txn = await storage.createRonTransaction({
      title: body.title,
      dealId: body.dealId || null,
      status: "draft",
      transactionType: body.transactionType,
      jurisdiction: body.jurisdiction,
      signingOrder: body.signingOrder || "parallel",
      signingOrderConfig: body.signingOrderConfig || {},
      scheduledDate: body.scheduledDate ? new Date(body.scheduledDate) : null,
      expirationDate: body.expirationDate ? new Date(body.expirationDate) : null,
      notes: body.notes,
      metadata: body.metadata || {},
      createdBy: req.user.id,
    });

    await journalService.createJournalEntry({
      transactionId: txn.id,
      eventType: "transaction_created",
      actorType: "user",
      actorId: req.user.id,
      actorName: `${req.user.firstName || ""} ${req.user.lastName || ""}`.trim(),
      description: `Transaction "${txn.title}" created`,
      eventData: { jurisdiction: txn.jurisdiction, dealId: txn.dealId },
      ipAddress: req.ip,
    });

    let eligibilityResult = null;
    if (txn.jurisdiction) {
      const eligibility = complianceService.checkRonEligibility({
        jurisdiction: txn.jurisdiction,
        transactionType: txn.transactionType || undefined,
        documentTypes: body.documentTypes || [],
        county: body.county,
      });
      eligibilityResult = await complianceService.saveEligibilityCheck({
        transactionId: txn.id,
        result: eligibility.result,
        jurisdiction: txn.jurisdiction,
        transactionType: txn.transactionType,
        documentTypes: body.documentTypes || [],
        reasons: eligibility.reasons,
        warnings: eligibility.warnings,
        countyOverride: body.county,
        checkedBy: req.user.id,
        checkedAt: new Date(),
      });
    }

    res.status(201).json({ ...txn, eligibilityCheck: eligibilityResult });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

router.patch("/transactions/:id", async (req: any, res) => {
  try {
    const { txn, error } = await verifyTransactionAccess(req.params.id, req.user.id, req.user.role);
    if (error) return res.status(txn === null && error === "Transaction not found" ? 404 : 403).json({ message: error });

    const updates: any = { ...req.body };
    delete updates.id; delete updates.createdAt; delete updates.createdBy;

    const updated = await storage.updateRonTransaction(req.params.id, updates);
    res.json(updated);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

router.delete("/transactions/:id", async (req: any, res) => {
  try {
    const { txn, error } = await verifyTransactionAccess(req.params.id, req.user.id, req.user.role);
    if (error) return res.status(txn === null && error === "Transaction not found" ? 404 : 403).json({ message: error });

    await storage.deleteRonTransaction(req.params.id);
    res.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

// ============================================================================
// NOTARIES
// ============================================================================

router.get("/notaries", async (req: any, res) => {
  try {
    const { state, language, status, available } = req.query;
    const filters: { state?: string; status?: string } = {};
    if (state) filters.state = state as string;
    if (status) filters.status = status as string;

    let notaries = await storage.getRonNotaries(filters);

    if (language) {
      notaries = notaries.filter((n) =>
        n.languages && Array.isArray(n.languages) && n.languages.includes(language as string)
      );
    }

    if (available === "true") {
      const now = new Date();
      notaries = notaries.filter((n) => {
        if (n.status !== "active") return false;
        if (n.commissionExpiration && n.commissionExpiration < now) return false;
        if (n.bondExpiration && n.bondExpiration < now) return false;
        if (n.eoInsuranceExpiration && n.eoInsuranceExpiration < now) return false;
        return true;
      });
    }

    res.json(notaries);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

router.get("/notaries/:id", async (req: any, res) => {
  try {
    const notary = await storage.getRonNotary(req.params.id);
    if (!notary) return res.status(404).json({ message: "Notary not found" });

    const allSessions = await storage.getRonSessionsByNotary(req.params.id);
    const recentSessions = allSessions.slice(0, 20);

    res.json({ ...notary, recentSessions });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

router.post("/notaries", requireRole("super_admin"), async (req: any, res) => {
  try {
    const body = req.body;
    const notary = await storage.createRonNotary({
      userId: body.userId,
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      phone: body.phone,
      status: body.status || "pending_onboarding",
      commissionState: body.commissionState,
      commissionNumber: body.commissionNumber,
      commissionExpiration: body.commissionExpiration ? new Date(body.commissionExpiration) : null,
      bondAmount: body.bondAmount,
      bondExpiration: body.bondExpiration ? new Date(body.bondExpiration) : null,
      eoInsuranceAmount: body.eoInsuranceAmount,
      eoInsuranceExpiration: body.eoInsuranceExpiration ? new Date(body.eoInsuranceExpiration) : null,
      languages: body.languages || ["en"],
      ronTrainingCompleted: body.ronTrainingCompleted || false,
      timezone: body.timezone || "America/New_York",
      metadata: body.metadata || {},
    });

    res.status(201).json(notary);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

router.patch("/notaries/:id", requireRole("super_admin"), async (req: any, res) => {
  try {
    const updates: any = { ...req.body };
    delete updates.id; delete updates.createdAt;

    if (updates.commissionExpiration) updates.commissionExpiration = new Date(updates.commissionExpiration);
    if (updates.bondExpiration) updates.bondExpiration = new Date(updates.bondExpiration);
    if (updates.eoInsuranceExpiration) updates.eoInsuranceExpiration = new Date(updates.eoInsuranceExpiration);

    const notary = await storage.updateRonNotary(req.params.id, updates);
    if (!notary) return res.status(404).json({ message: "Notary not found" });
    res.json(notary);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

router.delete("/notaries/:id", requireRole("super_admin"), async (req: any, res) => {
  try {
    const scheduledSessions = await storage.getRonSessionsByNotary(req.params.id, { status: "scheduled" });
    const inProgressSessions = await storage.getRonSessionsByNotary(req.params.id, { status: "in_progress" });
    const activeSessions = [...scheduledSessions, ...inProgressSessions];

    if (activeSessions.length > 0) {
      return res.status(400).json({
        message: "Cannot delete notary with active or scheduled sessions",
        activeSessions: activeSessions.length,
      });
    }

    await storage.deleteRonNotary(req.params.id);
    res.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

// ============================================================================
// NOTARY DOCUMENTS
// ============================================================================

router.get("/notaries/:notaryId/documents", requireRole("super_admin"), async (req: any, res) => {
  try {
    const docs = await storage.getRonNotaryDocuments(req.params.notaryId);
    res.json(docs);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

router.patch("/notary-documents/:id/verify", requireRole("super_admin"), async (req: any, res) => {
  try {
    const { status, rejectionReason } = req.body;
    if (!["verified", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Status must be 'verified' or 'rejected'" });
    }
    const doc = await storage.updateRonNotaryDocument(req.params.id, {
      verificationStatus: status,
      verifiedBy: req.user.id,
      verifiedAt: new Date(),
      rejectionReason: status === "rejected" ? rejectionReason : null,
    });
    if (!doc) return res.status(404).json({ message: "Document not found" });
    res.json(doc);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

router.delete("/notary-documents/:id", requireRole("super_admin"), async (req: any, res) => {
  try {
    const doc = await storage.getRonNotaryDocument(req.params.id);
    if (doc?.fileUrl) {
      try {
        await deleteFile(RON_DOCUMENTS_BUCKET, doc.fileUrl);
      } catch (storageErr) {
        console.error(`[RON] Failed to delete notary document storage object ${doc.fileUrl}:`, storageErr);
      }
    }
    await storage.deleteRonNotaryDocument(req.params.id);
    res.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

// ============================================================================
// NOTARY INVITATIONS
// ============================================================================

router.get("/notary-invitations", requireRole("super_admin"), async (req: any, res) => {
  try {
    const invitations = await storage.getRonNotaryInvitations();
    res.json(invitations);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

router.post("/notary-invitations", requireRole("super_admin"), async (req: any, res) => {
  try {
    const { email, expirationDays: rawDays } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });
    const expirationDays = Math.min(Math.max(Number(rawDays) || 7, 1), 90);

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expirationDays);

    const invitation = await storage.createRonNotaryInvitation({
      email,
      token,
      status: "pending",
      expiresAt,
      invitedBy: req.user.id,
    });

    res.status(201).json(invitation);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

// ============================================================================
// SIGNERS
// ============================================================================

router.get("/transactions/:transactionId/signers", async (req: any, res) => {
  try {
    const { txn, error } = await verifyTransactionAccess(req.params.transactionId, req.user.id, req.user.role);
    if (error) return res.status(txn === null && error === "Transaction not found" ? 404 : 403).json({ message: error });

    const signers = await storage.getRonSigners(req.params.transactionId);
    res.json(signers);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

router.get("/signers/:id", async (req: any, res) => {
  try {
    const signer = await storage.getRonSigner(req.params.id);
    if (!signer) return res.status(404).json({ message: "Signer not found" });

    const { txn, error } = await verifyTransactionAccess(signer.transactionId, req.user.id, req.user.role);
    if (error) return res.status(403).json({ message: error });

    const complianceChecks = await storage.getRonComplianceChecksBySigner(req.params.id);

    res.json({ ...signer, complianceChecks });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

router.post("/transactions/:transactionId/signers", async (req: any, res) => {
  try {
    const { txn, error } = await verifyTransactionAccess(req.params.transactionId, req.user.id, req.user.role);
    if (error) return res.status(txn === null && error === "Transaction not found" ? 404 : 403).json({ message: error });

    const body = req.body;
    const signer = await storage.createRonSigner({
      transactionId: req.params.transactionId,
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      phone: body.phone,
      role: body.role || "principal",
      signerTitle: body.signerTitle,
      organization: body.organization,
      signingOrder: body.signingOrder || 0,
      signingDependsOn: body.signingDependsOn || [],
      preferredLanguage: body.preferredLanguage || "en",
      metadata: body.metadata || {},
    });

    await journalService.createJournalEntry({
      transactionId: req.params.transactionId,
      eventType: "signer_added",
      actorType: "user",
      actorId: req.user.id,
      actorName: `${req.user.firstName || ""} ${req.user.lastName || ""}`.trim(),
      description: `Signer "${signer.firstName} ${signer.lastName}" added with role "${signer.role}"`,
      signerId: signer.id,
      ipAddress: req.ip,
    });

    res.status(201).json(signer);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

router.patch("/signers/:id", async (req: any, res) => {
  try {
    const signer = await storage.getRonSigner(req.params.id);
    if (!signer) return res.status(404).json({ message: "Signer not found" });

    const { txn, error } = await verifyTransactionAccess(signer.transactionId, req.user.id, req.user.role);
    if (error) return res.status(403).json({ message: error });

    const updates: any = { ...req.body };
    delete updates.id; delete updates.createdAt; delete updates.transactionId;

    const updated = await storage.updateRonSigner(req.params.id, updates);
    res.json(updated);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

router.delete("/signers/:id", async (req: any, res) => {
  try {
    const signer = await storage.getRonSigner(req.params.id);
    if (!signer) return res.status(404).json({ message: "Signer not found" });

    const { txn, error } = await verifyTransactionAccess(signer.transactionId, req.user.id, req.user.role);
    if (error) return res.status(403).json({ message: error });

    await storage.deleteRonSigner(req.params.id);
    res.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

// Signer IDV status update
router.post("/signers/:id/idv", async (req: any, res) => {
  try {
    const signer = await storage.getRonSigner(req.params.id);
    if (!signer) return res.status(404).json({ message: "Signer not found" });

    const { txn, error } = await verifyTransactionAccess(signer.transactionId, req.user.id, req.user.role);
    if (error) return res.status(403).json({ message: error });

    const { idvStatus, kbaScore, credentialType, credentialNumber } = req.body;
    const updates: any = {};
    if (idvStatus) updates.idvStatus = idvStatus;
    if (kbaScore !== undefined) {
      updates.kbaScore = kbaScore;
      updates.kbaAttempts = (signer.kbaAttempts || 0) + 1;
      updates.kbaLastAttempt = new Date();
    }
    if (credentialType) updates.credentialType = credentialType;
    if (credentialNumber) updates.credentialNumber = credentialNumber;

    const updated = await storage.updateRonSigner(req.params.id, updates);

    if (idvStatus === "fully_verified") {
      await journalService.createJournalEntry({
        transactionId: signer.transactionId,
        eventType: "signer_verified",
        actorType: "system",
        actorId: "idv_system",
        description: `Signer "${signer.firstName} ${signer.lastName}" identity fully verified`,
        signerId: signer.id,
        eventData: { idvStatus, kbaScore },
        ipAddress: req.ip,
      });
    }

    res.json(updated);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

// ============================================================================
// DOCUMENTS
// ============================================================================

router.get("/transactions/:transactionId/documents", async (req: any, res) => {
  try {
    const { txn, error } = await verifyTransactionAccess(req.params.transactionId, req.user.id, req.user.role);
    if (error) return res.status(txn === null && error === "Transaction not found" ? 404 : 403).json({ message: error });

    const documents = await storage.getRonDocuments(req.params.transactionId);
    res.json(documents);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

router.get("/documents/:id", async (req: any, res) => {
  try {
    const doc = await storage.getRonDocument(req.params.id);
    if (!doc) return res.status(404).json({ message: "Document not found" });

    const { txn, error } = await verifyTransactionAccess(doc.transactionId, req.user.id, req.user.role);
    if (error) return res.status(403).json({ message: error });

    const annotations = await storage.getRonAnnotations(req.params.id);
    const signatures = await storage.getRonSignaturesByDocument(req.params.id);
    const seals = await storage.getRonSealsByDocument(req.params.id);

    res.json({ ...doc, annotations, signatures, seals });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

router.post("/transactions/:transactionId/documents", upload.single("file"), async (req: any, res) => {
  try {
    const { txn, error } = await verifyTransactionAccess(req.params.transactionId, req.user.id, req.user.role);
    if (error) return res.status(txn === null && error === "Transaction not found" ? 404 : 403).json({ message: error });

    const file = req.file;
    let storageKey: string | null = null;
    let originalPdfUrl: string | null = null;
    let fileSize: number | null = null;
    let mimeType: string | null = null;

    const ALLOWED_DOCUMENT_MIMES = [
      "application/pdf",
      "image/png", "image/jpeg", "image/tiff",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
    ];

    const WORD_MIMES = [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
    ];

    if (file && !ALLOWED_DOCUMENT_MIMES.includes(file.mimetype)) {
      return res.status(400).json({
        message: `Unsupported file type "${file.mimetype}". Allowed: ${ALLOWED_DOCUMENT_MIMES.join(", ")}`,
      });
    }

    if (file && file.mimetype === "application/msword") {
      return res.status(400).json({
        message: "Legacy .doc format is not supported. Please re-save the document as .docx and upload again.",
      });
    }

    if (file) {
      const isWordDoc = WORD_MIMES.includes(file.mimetype);

      if (isWordDoc) {
        const originalKey = `ron/${req.params.transactionId}/originals/${file.originalname}`;
        await uploadFile(RON_DOCUMENTS_BUCKET, originalKey, file.buffer, file.mimetype);
        originalPdfUrl = originalKey;

        const pdfBuffer = await convertWordToPdf(file.buffer);
        const pdfFileName = file.originalname.replace(/\.docx?$/i, ".pdf");
        storageKey = `ron/${req.params.transactionId}/${pdfFileName}`;
        await uploadFile(RON_DOCUMENTS_BUCKET, storageKey, pdfBuffer, "application/pdf");
        fileSize = pdfBuffer.length;
        mimeType = "application/pdf";
      } else {
        storageKey = `ron/${req.params.transactionId}/${file.originalname}`;
        await uploadFile(RON_DOCUMENTS_BUCKET, storageKey, file.buffer, file.mimetype);
        originalPdfUrl = storageKey;
        fileSize = file.size;
        mimeType = file.mimetype;
      }
    }

    const body = req.body;
    const doc = await storage.createRonDocument({
      transactionId: req.params.transactionId,
      title: body.title || file?.originalname || "Untitled Document",
      status: "uploaded",
      documentType: body.documentType,
      originalPdfUrl,
      storageKey,
      pageCount: body.pageCount ? parseInt(body.pageCount) : null,
      fileSize,
      mimeType,
      signingOrder: body.signingOrder ? parseInt(body.signingOrder) : 0,
      requiresNotarization: body.requiresNotarization !== "false",
      notarizationType: body.notarizationType,
      metadata: body.metadata ? JSON.parse(body.metadata) : {},
    });

    await journalService.createJournalEntry({
      transactionId: req.params.transactionId,
      eventType: "document_uploaded",
      actorType: "user",
      actorId: req.user.id,
      actorName: `${req.user.firstName || ""} ${req.user.lastName || ""}`.trim(),
      description: `Document "${doc.title}" uploaded`,
      documentId: doc.id,
      ipAddress: req.ip,
    });

    res.status(201).json(doc);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

router.get("/documents/:id/preview", async (req: any, res) => {
  try {
    const doc = await storage.getRonDocument(req.params.id);
    if (!doc) return res.status(404).json({ message: "Document not found" });

    const { txn, error } = await verifyTransactionAccess(doc.transactionId, req.user.id, req.user.role);
    if (error) return res.status(403).json({ message: error });

    if (!doc.storageKey) return res.status(404).json({ message: "No file stored for this document" });

    const buffer = await downloadFile(RON_DOCUMENTS_BUCKET, doc.storageKey);
    res.setHeader("Content-Type", doc.mimeType || "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${doc.title}"`);
    res.send(buffer);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

router.patch("/documents/:id", async (req: any, res) => {
  try {
    const doc = await storage.getRonDocument(req.params.id);
    if (!doc) return res.status(404).json({ message: "Document not found" });

    const { txn, error } = await verifyTransactionAccess(doc.transactionId, req.user.id, req.user.role);
    if (error) return res.status(403).json({ message: error });

    const updates: any = { ...req.body };
    delete updates.id; delete updates.createdAt; delete updates.transactionId;

    const updated = await storage.updateRonDocument(req.params.id, updates);
    res.json(updated);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

router.delete("/documents/:id", async (req: any, res) => {
  try {
    const doc = await storage.getRonDocument(req.params.id);
    if (!doc) return res.status(404).json({ message: "Document not found" });

    const { txn, error } = await verifyTransactionAccess(doc.transactionId, req.user.id, req.user.role);
    if (error) return res.status(403).json({ message: error });

    if (doc.storageKey) {
      try {
        await deleteFile(RON_DOCUMENTS_BUCKET, doc.storageKey);
      } catch (storageErr) {
        console.error(`[RON] Failed to delete storage object ${doc.storageKey}:`, storageErr);
      }
    }

    await storage.deleteRonDocument(req.params.id);
    res.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

// ============================================================================
// ANNOTATION PLACEMENTS
// ============================================================================

router.get("/documents/:documentId/annotations", async (req: any, res) => {
  try {
    const doc = await storage.getRonDocument(req.params.documentId);
    if (!doc) return res.status(404).json({ message: "Document not found" });

    const { txn, error } = await verifyTransactionAccess(doc.transactionId, req.user.id, req.user.role);
    if (error) return res.status(403).json({ message: error });

    const annotations = await storage.getRonAnnotations(req.params.documentId);
    res.json(annotations);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

router.post("/documents/:documentId/annotations", async (req: any, res) => {
  try {
    const doc = await storage.getRonDocument(req.params.documentId);
    if (!doc) return res.status(404).json({ message: "Document not found" });

    const { txn, error } = await verifyTransactionAccess(doc.transactionId, req.user.id, req.user.role);
    if (error) return res.status(403).json({ message: error });

    const body = req.body;
    const placements = Array.isArray(body) ? body : [body];

    const inserted = [];
    for (const p of placements) {
      const annotation = await storage.createRonAnnotation({
        documentId: req.params.documentId,
        signerId: p.signerId,
        notaryId: p.notaryId,
        annotationType: p.annotationType,
        pageNumber: p.pageNumber,
        xPosition: p.xPosition.toString(),
        yPosition: p.yPosition.toString(),
        width: p.width.toString(),
        height: p.height.toString(),
        required: p.required !== false,
        sortOrder: p.sortOrder || 0,
        metadata: p.metadata || {},
      });
      inserted.push(annotation);
    }

    if (doc.status === "uploaded") {
      await storage.updateRonDocument(req.params.documentId, { status: "preparing" });
    }

    res.status(201).json(inserted);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

router.patch("/annotations/:id", async (req: any, res) => {
  try {
    const annotation = await storage.getRonAnnotation(req.params.id);
    if (!annotation) return res.status(404).json({ message: "Annotation not found" });

    const doc = await storage.getRonDocument(annotation.documentId);
    if (!doc) return res.status(404).json({ message: "Document not found" });

    const { txn, error } = await verifyTransactionAccess(doc.transactionId, req.user.id, req.user.role);
    if (error) return res.status(403).json({ message: error });

    const { xPosition, yPosition, width, height, pageNumber, signerId } = req.body;
    const updates: Record<string, unknown> = {};
    if (xPosition !== undefined) updates.xPosition = xPosition.toString();
    if (yPosition !== undefined) updates.yPosition = yPosition.toString();
    if (width !== undefined) updates.width = width.toString();
    if (height !== undefined) updates.height = height.toString();
    if (pageNumber !== undefined) updates.pageNumber = pageNumber;
    if (signerId !== undefined) updates.signerId = signerId;

    const updated = await storage.updateRonAnnotation(req.params.id, updates);
    res.json(updated);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

router.delete("/annotations/:id", async (req: any, res) => {
  try {
    const annotation = await storage.getRonAnnotation(req.params.id);
    if (!annotation) return res.status(404).json({ message: "Annotation not found" });

    const doc = await storage.getRonDocument(annotation.documentId);
    if (!doc) return res.status(404).json({ message: "Document not found" });

    const { txn, error } = await verifyTransactionAccess(doc.transactionId, req.user.id, req.user.role);
    if (error) return res.status(403).json({ message: error });

    await storage.deleteRonAnnotation(req.params.id);
    res.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

// ============================================================================
// SESSIONS
// ============================================================================

router.get("/transactions/:transactionId/sessions", async (req: any, res) => {
  try {
    const { txn, error } = await verifyTransactionAccess(req.params.transactionId, req.user.id, req.user.role);
    if (error) return res.status(txn === null && error === "Transaction not found" ? 404 : 403).json({ message: error });

    const sessions = await storage.getRonSessions(req.params.transactionId);
    res.json(sessions);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

router.get("/sessions/:id", async (req: any, res) => {
  try {
    const session = await storage.getRonSession(req.params.id);
    if (!session) return res.status(404).json({ message: "Session not found" });

    const { txn, error } = await verifyTransactionAccess(session.transactionId, req.user.id, req.user.role);
    if (error) return res.status(403).json({ message: error });

    const signers = await storage.getRonSignersBySession(req.params.id);
    const recordings = await storage.getRonRecordings(req.params.id);

    let notary = null;
    if (session.notaryId) {
      notary = await storage.getRonNotary(session.notaryId) || null;
    }

    res.json({ ...session, signers, recordings, notary });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

router.delete("/sessions/:id", async (req: any, res) => {
  try {
    const session = await storage.getRonSession(req.params.id);
    if (!session) return res.status(404).json({ message: "Session not found" });

    const { txn, error } = await verifyTransactionAccess(session.transactionId, req.user.id, req.user.role);
    if (error) return res.status(403).json({ message: error });

    if (session.status === "in_progress") {
      return res.status(400).json({ message: "Cannot delete an in-progress session" });
    }

    await storage.deleteRonSession(req.params.id);
    res.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

router.post("/transactions/:transactionId/sessions", async (req: any, res) => {
  try {
    const { txn, error } = await verifyTransactionAccess(req.params.transactionId, req.user.id, req.user.role);
    if (error) return res.status(txn === null && error === "Transaction not found" ? 404 : 403).json({ message: error });

    const body = req.body;
    const session = await storage.createRonSession({
      transactionId: req.params.transactionId,
      notaryId: body.notaryId,
      status: "scheduled",
      sessionType: body.sessionType || "standard",
      scheduledStart: body.scheduledStart ? new Date(body.scheduledStart) : null,
      scheduledEnd: body.scheduledEnd ? new Date(body.scheduledEnd) : null,
      notes: body.notes,
      metadata: body.metadata || {},
    });

    await journalService.createJournalEntry({
      transactionId: req.params.transactionId,
      sessionId: session.id,
      notaryId: body.notaryId,
      eventType: "session_scheduled",
      actorType: "user",
      actorId: req.user.id,
      actorName: `${req.user.firstName || ""} ${req.user.lastName || ""}`.trim(),
      description: `Session scheduled for ${body.scheduledStart || "TBD"}`,
      ipAddress: req.ip,
    });

    res.status(201).json(session);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

router.patch("/sessions/:id", async (req: any, res) => {
  try {
    const session = await storage.getRonSession(req.params.id);
    if (!session) return res.status(404).json({ message: "Session not found" });

    const { txn, error } = await verifyTransactionAccess(session.transactionId, req.user.id, req.user.role);
    if (error) return res.status(403).json({ message: error });

    if (req.body.status && req.body.status !== session.status) {
      const validTransitions: Record<string, string[]> = {
        scheduled: ["in_progress", "cancelled"],
        in_progress: ["paused", "completed", "cancelled"],
        paused: ["in_progress", "cancelled"],
        completed: [],
        cancelled: [],
      };
      const allowed = validTransitions[session.status] || [];
      if (!allowed.includes(req.body.status)) {
        return res.status(400).json({
          message: `Invalid session status transition from "${session.status}" to "${req.body.status}". Allowed: ${allowed.join(", ") || "none"}`,
        });
      }
    }

    const updates: any = { ...req.body };
    delete updates.id; delete updates.createdAt; delete updates.transactionId;

    if (updates.scheduledStart) updates.scheduledStart = new Date(updates.scheduledStart);
    if (updates.scheduledEnd) updates.scheduledEnd = new Date(updates.scheduledEnd);
    if (updates.actualStart) updates.actualStart = new Date(updates.actualStart);
    if (updates.actualEnd) updates.actualEnd = new Date(updates.actualEnd);

    const updated = await storage.updateRonSession(req.params.id, updates);

    if (req.body.status && req.body.status !== session.status) {
      const eventMap: Record<string, string> = {
        in_progress: "session_started",
        paused: "session_paused",
        completed: "session_completed",
        cancelled: "session_cancelled",
      };
      const eventType = eventMap[req.body.status];
      if (eventType) {
        await journalService.createJournalEntry({
          transactionId: session.transactionId,
          sessionId: session.id,
          notaryId: session.notaryId || undefined,
          eventType,
          actorType: "user",
          actorId: req.user.id,
          actorName: `${req.user.firstName || ""} ${req.user.lastName || ""}`.trim(),
          description: `Session ${req.body.status}`,
          ipAddress: req.ip,
        });
      }
    }

    res.json(updated);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

// Start session
router.post("/sessions/:id/start", async (req: any, res) => {
  try {
    const session = await storage.getRonSession(req.params.id);
    if (!session) return res.status(404).json({ message: "Session not found" });

    const { txn, error } = await verifyTransactionAccess(session.transactionId, req.user.id, req.user.role);
    if (error) return res.status(403).json({ message: error });

    if (session.notaryId && req.user.role !== "super_admin") {
      const notaryRecord = await storage.getRonNotary(session.notaryId);
      if (!notaryRecord || !notaryRecord.userId || notaryRecord.userId !== req.user.id) {
        return res.status(403).json({ message: "Only the assigned notary or an admin can start this session" });
      }
    }

    if (!["scheduled", "paused"].includes(session.status)) {
      return res.status(400).json({
        message: `Cannot start session in "${session.status}" status. Session must be "scheduled" or "paused".`,
      });
    }

    if (session.status === "scheduled") {
      const signers = await storage.getRonSigners(session.transactionId);
      const documents = await storage.getRonDocuments(session.transactionId);
      const notary = session.notaryId ? await storage.getRonNotary(session.notaryId) : null;

      if (signers.length === 0) {
        return res.status(400).json({ message: "Cannot start session: no signers assigned" });
      }
      if (documents.length === 0) {
        return res.status(400).json({ message: "Cannot start session: no documents uploaded" });
      }
      const allVerified = signers.every(s => s.idvStatus === "fully_verified");
      if (!allVerified) {
        return res.status(400).json({ message: "Cannot start session: not all signers have completed identity verification" });
      }
      if (!notary || notary.status !== "active") {
        return res.status(400).json({ message: "Cannot start session: notary is not assigned or not active" });
      }
      const docsReady = documents.every(d => ["ready", "in_signing", "partially_signed", "fully_signed", "notarized"].includes(d.status));
      if (!docsReady) {
        return res.status(400).json({ message: "Cannot start session: not all documents are in a ready state" });
      }
    }

    const updateData: Record<string, unknown> = {
      status: "in_progress",
      recordingStatus: "recording",
    };

    if (session.status === "scheduled") {
      updateData.actualStart = new Date();
    }

    const updated = await storage.updateRonSession(req.params.id, updateData);

    await storage.updateRonTransaction(session.transactionId, { status: "in_progress" });

    const eventDesc = session.status === "paused" ? "Notarization session resumed" : "Notarization session started";
    await journalService.createJournalEntry({
      transactionId: session.transactionId,
      sessionId: session.id,
      notaryId: session.notaryId || undefined,
      eventType: session.status === "paused" ? "session_resumed" : "session_started",
      actorType: "user",
      actorId: req.user.id,
      description: eventDesc,
      ipAddress: req.ip,
    });

    res.json(updated);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

// Complete session
router.post("/sessions/:id/complete", async (req: any, res) => {
  try {
    const session = await storage.getRonSession(req.params.id);
    if (!session) return res.status(404).json({ message: "Session not found" });

    const { txn, error } = await verifyTransactionAccess(session.transactionId, req.user.id, req.user.role);
    if (error) return res.status(403).json({ message: error });

    if (session.notaryId && req.user.role !== "super_admin") {
      const notaryRecord = await storage.getRonNotary(session.notaryId);
      if (!notaryRecord || !notaryRecord.userId || notaryRecord.userId !== req.user.id) {
        return res.status(403).json({ message: "Only the assigned notary or an admin can complete this session" });
      }
    }

    if (!["in_progress", "paused"].includes(session.status)) {
      return res.status(400).json({
        message: `Cannot complete session in "${session.status}" status. Session must be "in_progress" or "paused".`,
      });
    }

    const documents = await storage.getRonDocuments(session.transactionId);
    const allAnnotationsSigned = await Promise.all(documents.map(async (doc) => {
      const annotations = await storage.getRonAnnotations(doc.id);
      const requiredAnnotations = annotations.filter(a => a.required);
      return requiredAnnotations.every(a => a.completed);
    }));

    if (!allAnnotationsSigned.every(Boolean)) {
      return res.status(400).json({ message: "Cannot complete session: not all required signature fields have been signed" });
    }

    const now = new Date();
    const duration = session.actualStart
      ? Math.round((now.getTime() - session.actualStart.getTime()) / 1000)
      : 0;

    const updated = await storage.updateRonSession(req.params.id, {
      status: "completed",
      actualEnd: now,
      durationSeconds: duration,
      recordingStatus: "completed",
    });

    for (const doc of documents) {
      const seals = await storage.getRonSealsByDocument(doc.id);
      const annotations = await storage.getRonAnnotations(doc.id);
      const allRequired = annotations.filter(a => a.required);
      const allSigned = allRequired.every(a => a.completed);
      if (allSigned && seals.length > 0) {
        await storage.updateRonDocument(doc.id, { status: "notarized" });
      } else if (allSigned) {
        await storage.updateRonDocument(doc.id, { status: "fully_signed" });
      }
    }

    const remainingActiveSessions = await storage.getRonSessions(session.transactionId);
    const stillActive = remainingActiveSessions.filter(s => s.status === "in_progress" && s.id !== req.params.id);

    if (stillActive.length === 0) {
      await storage.updateRonTransaction(session.transactionId, { status: "completed", completedDate: now });
    }

    await journalService.createJournalEntry({
      transactionId: session.transactionId,
      sessionId: session.id,
      notaryId: session.notaryId || undefined,
      eventType: "session_completed",
      actorType: "user",
      actorId: req.user.id,
      description: `Session completed (duration: ${Math.round(duration / 60)} minutes)`,
      eventData: { durationSeconds: duration },
      ipAddress: req.ip,
    });

    if (session.notaryId) {
      await storage.incrementRonNotarySessions(session.notaryId);
    }

    res.json(updated);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

// ============================================================================
// SIGNATURES & SEALS
// ============================================================================

router.post("/signatures", async (req: any, res) => {
  try {
    const body = req.body;
    if (!body.signerId || !body.documentId || !body.pageNumber || body.xPosition === undefined || body.yPosition === undefined) {
      return res.status(400).json({ message: "signerId, documentId, pageNumber, xPosition, and yPosition are required" });
    }

    const doc = await storage.getRonDocument(body.documentId);
    if (!doc) return res.status(404).json({ message: "Document not found" });

    const { txn, error } = await verifyTransactionAccess(doc.transactionId, req.user.id, req.user.role);
    if (error) return res.status(403).json({ message: error });

    const signer = await storage.getRonSigner(body.signerId);
    if (!signer) return res.status(404).json({ message: "Signer not found" });
    if (signer.transactionId !== doc.transactionId) {
      return res.status(400).json({ message: "Signer does not belong to this transaction" });
    }

    if (req.user.role !== "super_admin") {
      const callerEmail = req.user.email || req.user.profileData?.email;
      if (!callerEmail || !signer.email) {
        return res.status(403).json({ message: "Cannot verify signer identity: email information is missing" });
      }
      if (callerEmail.toLowerCase() !== signer.email.toLowerCase()) {
        return res.status(403).json({ message: "You can only apply signatures for your own signer identity" });
      }
    }

    if (body.annotationId) {
      const annotation = await storage.getRonAnnotation(body.annotationId);
      if (!annotation || annotation.documentId !== body.documentId) {
        return res.status(400).json({ message: "Annotation does not belong to this document" });
      }
      if (annotation.signerId && annotation.signerId !== body.signerId) {
        return res.status(403).json({ message: "This annotation field is assigned to a different signer" });
      }
    }

    const signature = await storage.createRonSignature({
      signerId: body.signerId,
      documentId: body.documentId,
      annotationId: body.annotationId,
      sessionId: body.sessionId,
      signatureType: body.signatureType || "signature",
      signatureImageUrl: body.signatureImageUrl,
      signatureData: body.signatureData,
      pageNumber: body.pageNumber,
      xPosition: body.xPosition.toString(),
      yPosition: body.yPosition.toString(),
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    if (body.annotationId) {
      await storage.updateRonAnnotation(body.annotationId, { completed: true, completedAt: new Date() });
    }

    await journalService.createJournalEntry({
      transactionId: doc.transactionId,
      sessionId: body.sessionId,
      eventType: body.signatureType === "initial" ? "initial_applied" : "signature_applied",
      actorType: "signer",
      actorId: body.signerId,
      description: `${body.signatureType || "Signature"} applied to "${doc.title}" (page ${body.pageNumber})`,
      documentId: body.documentId,
      signerId: body.signerId,
      ipAddress: req.ip,
    });

    const allAnnotations = await storage.getRonAnnotations(body.documentId);
    const allCompleted = allAnnotations.every(a => a.completed || !a.required);
    if (allCompleted && allAnnotations.length > 0) {
      await storage.updateRonDocument(body.documentId, { status: "fully_signed" });
    } else {
      await storage.updateRonDocument(body.documentId, { status: "in_signing" });
    }

    res.status(201).json(signature);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

router.post("/seals", async (req: any, res) => {
  try {
    const body = req.body;
    if (!body.notaryId || !body.documentId || !body.pageNumber || body.xPosition === undefined || body.yPosition === undefined) {
      return res.status(400).json({ message: "notaryId, documentId, pageNumber, xPosition, and yPosition are required" });
    }

    const doc = await storage.getRonDocument(body.documentId);
    if (!doc) return res.status(404).json({ message: "Document not found" });

    const { txn, error } = await verifyTransactionAccess(doc.transactionId, req.user.id, req.user.role);
    if (error) return res.status(403).json({ message: error });

    const notary = await storage.getRonNotary(body.notaryId);
    if (!notary) return res.status(404).json({ message: "Notary not found" });

    if (notary.status !== "active") {
      return res.status(400).json({ message: "Notary is not active" });
    }

    if (req.user.role !== "super_admin") {
      if (!notary.userId) {
        return res.status(403).json({ message: "Notary does not have a linked user account. Contact an admin to bind the notary record." });
      }
      if (notary.userId !== req.user.id) {
        return res.status(403).json({ message: "Only the assigned notary or an admin can apply seals" });
      }
    }

    if (body.sessionId) {
      const session = await storage.getRonSession(body.sessionId);
      if (!session || session.transactionId !== doc.transactionId) {
        return res.status(400).json({ message: "Session does not belong to this transaction" });
      }
      if (session.notaryId && session.notaryId !== body.notaryId) {
        return res.status(403).json({ message: "Seal must be applied by the notary assigned to this session" });
      }
    }

    const seal = await storage.createRonSeal({
      notaryId: body.notaryId,
      documentId: body.documentId,
      sessionId: body.sessionId,
      sealImageUrl: body.sealImageUrl || notary.sealImageUrl,
      sealData: body.sealData,
      pageNumber: body.pageNumber,
      xPosition: body.xPosition.toString(),
      yPosition: body.yPosition.toString(),
      commissionState: notary.commissionState,
      commissionNumber: notary.commissionNumber,
      commissionExpiration: notary.commissionExpiration,
    });

    await storage.updateRonDocument(body.documentId, { status: "notarized" });

    await journalService.createJournalEntry({
      transactionId: doc.transactionId,
      sessionId: body.sessionId,
      notaryId: body.notaryId,
      eventType: "seal_applied",
      actorType: "notary",
      actorId: body.notaryId,
      actorName: `${notary.firstName} ${notary.lastName}`,
      description: `Notary seal applied to "${doc.title}" (page ${body.pageNumber})`,
      documentId: body.documentId,
      ipAddress: req.ip,
    });

    res.status(201).json(seal);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

// ============================================================================
// SESSION PRE-CHECKLIST & PAUSE
// ============================================================================

router.get("/sessions/:id/checklist", async (req: any, res) => {
  try {
    const session = await storage.getRonSession(req.params.id);
    if (!session) return res.status(404).json({ message: "Session not found" });

    const { txn, error } = await verifyTransactionAccess(session.transactionId, req.user.id, req.user.role);
    if (error) return res.status(403).json({ message: error });

    const signers = await storage.getRonSigners(session.transactionId);
    const documents = await storage.getRonDocuments(session.transactionId);
    const notary = session.notaryId ? await storage.getRonNotary(session.notaryId) : null;

    const signerChecks = await Promise.all(signers.map(async (signer) => {
      const compliance = await storage.getRonComplianceChecks(session.transactionId);
      const signerCompliance = compliance.filter(c => c.signerId === signer.id);
      const ofacCheck = signerCompliance.find(c => c.checkType === "ofac");
      const kbaCheck = signerCompliance.find(c => c.checkType === "kba");

      const idvPassed = signer.idvStatus === "fully_verified";
      const kbaPassed = signer.kbaScore !== null && signer.kbaScore >= 4;
      const ofacCleared = ofacCheck?.result === "pass";
      const credentialVerified = ["credential_passed", "liveness_passed", "kba_passed", "ofac_cleared", "fully_verified"].includes(signer.idvStatus);

      return {
        signerId: signer.id,
        signerName: `${signer.firstName} ${signer.lastName}`,
        email: signer.email,
        idvStatus: signer.idvStatus,
        credentialVerified,
        kbaPassed,
        kbaScore: signer.kbaScore,
        kbaAttempts: signer.kbaAttempts,
        ofacCleared: ofacCleared || signer.idvStatus === "ofac_cleared" || signer.idvStatus === "fully_verified",
        livenessPassed: signer.livenessCheckPassed || false,
        overallReady: idvPassed,
      };
    }));

    const documentsReady = documents.every(d => ["ready", "in_signing", "partially_signed", "fully_signed", "notarized"].includes(d.status));
    const allDocsPrepared = documents.length > 0 && documents.every(d => d.status !== "uploaded");
    const allSignersVerified = signerChecks.every(s => s.overallReady);
    const notaryReady = notary !== null && notary.status === "active";
    const hasDocuments = documents.length > 0;
    const hasSigners = signers.length > 0;

    const canStart = allSignersVerified && documentsReady && notaryReady && hasDocuments && hasSigners;

    res.json({
      sessionId: session.id,
      sessionStatus: session.status,
      canStart,
      checks: {
        signers: signerChecks,
        allSignersVerified,
        documentsReady,
        allDocsPrepared,
        notaryReady,
        notaryName: notary ? `${notary.firstName} ${notary.lastName}` : null,
        notaryStatus: notary?.status || null,
        hasDocuments,
        hasSigners,
        documentCount: documents.length,
        signerCount: signers.length,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

router.post("/sessions/:id/pause", async (req: any, res) => {
  try {
    const session = await storage.getRonSession(req.params.id);
    if (!session) return res.status(404).json({ message: "Session not found" });

    const { txn, error } = await verifyTransactionAccess(session.transactionId, req.user.id, req.user.role);
    if (error) return res.status(403).json({ message: error });

    if (session.status !== "in_progress") {
      return res.status(400).json({ message: `Cannot pause session in "${session.status}" status` });
    }

    const updated = await storage.updateRonSession(req.params.id, {
      status: "paused",
      recordingStatus: "not_started",
    });

    await journalService.createJournalEntry({
      transactionId: session.transactionId,
      sessionId: session.id,
      notaryId: session.notaryId || undefined,
      eventType: "session_paused",
      actorType: "user",
      actorId: req.user.id,
      description: "Notarization session paused",
      ipAddress: req.ip,
    });

    res.json(updated);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

// ============================================================================
// KBA QUIZ (MOCK)
// ============================================================================

const MOCK_KBA_QUESTIONS = [
  {
    id: 1,
    question: "Which of the following addresses have you been associated with?",
    options: ["123 Oak Street, Springfield", "456 Elm Avenue, Portland", "789 Pine Road, Denver", "101 Maple Lane, Austin"],
    correctAnswer: 0,
  },
  {
    id: 2,
    question: "Which of the following vehicles have you owned or leased?",
    options: ["2019 Toyota Camry", "2020 Honda Civic", "2018 Ford F-150", "None of the above"],
    correctAnswer: 2,
  },
  {
    id: 3,
    question: "Which county have you resided in?",
    options: ["Broward County", "Miami-Dade County", "Palm Beach County", "Orange County"],
    correctAnswer: 1,
  },
  {
    id: 4,
    question: "What is the approximate monthly payment on your mortgage or rent?",
    options: ["$800 - $1,200", "$1,200 - $1,800", "$1,800 - $2,500", "$2,500 - $3,500"],
    correctAnswer: 2,
  },
  {
    id: 5,
    question: "Which of the following phone numbers have you been associated with?",
    options: ["(555) 123-4567", "(555) 987-6543", "(555) 246-8135", "None of the above"],
    correctAnswer: 0,
  },
];

router.get("/signers/:id/kba-questions", async (req: any, res) => {
  try {
    const signer = await storage.getRonSigner(req.params.id);
    if (!signer) return res.status(404).json({ message: "Signer not found" });

    const { error } = await verifyTransactionAccess(signer.transactionId, req.user.id, req.user.role);
    if (error) return res.status(403).json({ message: error });

    const questions = MOCK_KBA_QUESTIONS.map(q => ({
      id: q.id,
      question: q.question,
      options: q.options,
    }));

    res.json({ signerId: signer.id, questions });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

router.post("/signers/:id/kba-submit", async (req: any, res) => {
  try {
    const signer = await storage.getRonSigner(req.params.id);
    if (!signer) return res.status(404).json({ message: "Signer not found" });

    const { txn, error } = await verifyTransactionAccess(signer.transactionId, req.user.id, req.user.role);
    if (error) return res.status(403).json({ message: error });

    const allowedPriorStates = ["liveness_passed", "kba_pending", "kba_failed"];
    if (!allowedPriorStates.includes(signer.idvStatus)) {
      return res.status(400).json({ message: `KBA quiz requires liveness check completion first (current status: ${signer.idvStatus})` });
    }

    const { answers } = req.body;
    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ message: "answers array is required" });
    }

    let correct = 0;
    const results = MOCK_KBA_QUESTIONS.map((q, i) => {
      const isCorrect = answers[i] === q.correctAnswer;
      if (isCorrect) correct++;
      return { questionId: q.id, correct: isCorrect };
    });

    const passed = correct >= 4;
    const newIdvStatus = passed ? "kba_passed" : "kba_failed";

    await storage.updateRonSigner(req.params.id, {
      kbaScore: correct,
      kbaAttempts: (signer.kbaAttempts || 0) + 1,
      kbaLastAttempt: new Date(),
      idvStatus: newIdvStatus,
    });

    await complianceService.runComplianceCheck({
      transactionId: signer.transactionId,
      signerId: signer.id,
      checkType: "kba",
      performedBy: req.user.id,
    });

    res.json({ score: correct, total: 5, passed, results, idvStatus: newIdvStatus });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

router.post("/signers/:id/credential-verify", async (req: any, res) => {
  try {
    const signer = await storage.getRonSigner(req.params.id);
    if (!signer) return res.status(404).json({ message: "Signer not found" });

    const { txn, error } = await verifyTransactionAccess(signer.transactionId, req.user.id, req.user.role);
    if (error) return res.status(403).json({ message: error });

    const allowedPriorStates = ["not_started", "credential_pending", "credential_failed"];
    if (!allowedPriorStates.includes(signer.idvStatus)) {
      return res.status(400).json({ message: `Credential verification already completed or skipped (current status: ${signer.idvStatus})` });
    }

    const { credentialType, credentialNumber } = req.body;

    await storage.updateRonSigner(req.params.id, {
      idvStatus: "credential_passed",
      credentialType: credentialType || "drivers_license",
      credentialNumber: credentialNumber || `SIM-${Date.now()}`,
    });

    await complianceService.runComplianceCheck({
      transactionId: signer.transactionId,
      signerId: signer.id,
      checkType: "credential_analysis",
      performedBy: req.user.id,
    });

    await journalService.createJournalEntry({
      transactionId: signer.transactionId,
      eventType: "signer_verified",
      actorType: "system",
      actorId: "idv_system",
      description: `Credential verified for "${signer.firstName} ${signer.lastName}"`,
      signerId: signer.id,
      ipAddress: req.ip,
    });

    res.json({ success: true, idvStatus: "credential_passed" });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

router.post("/signers/:id/liveness-check", async (req: any, res) => {
  try {
    const signer = await storage.getRonSigner(req.params.id);
    if (!signer) return res.status(404).json({ message: "Signer not found" });

    const { txn, error } = await verifyTransactionAccess(signer.transactionId, req.user.id, req.user.role);
    if (error) return res.status(403).json({ message: error });

    const allowedPriorStates = ["credential_passed", "liveness_pending", "liveness_failed"];
    if (!allowedPriorStates.includes(signer.idvStatus)) {
      return res.status(400).json({ message: `Liveness check requires credential verification first (current status: ${signer.idvStatus})` });
    }

    await storage.updateRonSigner(req.params.id, {
      idvStatus: "liveness_passed",
      livenessCheckPassed: true,
      biometricMatchScore: "0.95",
    });

    await complianceService.runComplianceCheck({
      transactionId: signer.transactionId,
      signerId: signer.id,
      checkType: "liveness",
      performedBy: req.user.id,
    });

    res.json({ success: true, idvStatus: "liveness_passed", matchScore: 0.95 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

router.post("/signers/:id/ofac-screen", async (req: any, res) => {
  try {
    const signer = await storage.getRonSigner(req.params.id);
    if (!signer) return res.status(404).json({ message: "Signer not found" });

    const { txn, error } = await verifyTransactionAccess(signer.transactionId, req.user.id, req.user.role);
    if (error) return res.status(403).json({ message: error });

    const allowedPriorStates = ["kba_passed", "ofac_pending"];
    if (!allowedPriorStates.includes(signer.idvStatus)) {
      return res.status(400).json({ message: `OFAC screening requires KBA quiz completion first (current status: ${signer.idvStatus})` });
    }

    if (signer.kbaScore === null || signer.kbaScore === undefined || signer.kbaScore < 4) {
      return res.status(400).json({ message: `OFAC screening requires KBA score of at least 4/5 (current: ${signer.kbaScore ?? 0})` });
    }

    await storage.updateRonSigner(req.params.id, {
      idvStatus: "ofac_cleared",
    });

    await complianceService.runComplianceCheck({
      transactionId: signer.transactionId,
      signerId: signer.id,
      checkType: "ofac",
      performedBy: req.user.id,
    });

    res.json({ success: true, idvStatus: "ofac_cleared", result: "pass" });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

router.post("/signers/:id/complete-idv", async (req: any, res) => {
  try {
    const signer = await storage.getRonSigner(req.params.id);
    if (!signer) return res.status(404).json({ message: "Signer not found" });

    const { txn, error } = await verifyTransactionAccess(signer.transactionId, req.user.id, req.user.role);
    if (error) return res.status(403).json({ message: error });

    const altIdvRecords = await complianceService.getAltIdvRecords(signer.id);
    const hasCompletedAltIdv = altIdvRecords.some(r => r.status === "completed");

    if (!signer.livenessCheckPassed) {
      return res.status(400).json({ message: "Cannot complete IDV: liveness check not passed" });
    }

    const compliance = await storage.getRonComplianceChecks(signer.transactionId);
    const signerCompliance = compliance.filter(c => c.signerId === signer.id);
    const ofacCheck = signerCompliance.find(c => c.checkType === "ofac");
    if (!ofacCheck || ofacCheck.result !== "pass") {
      return res.status(400).json({ message: "Cannot complete IDV: OFAC screening not cleared" });
    }

    if (!hasCompletedAltIdv) {
      if (signer.idvStatus !== "ofac_cleared") {
        return res.status(400).json({ message: `Cannot complete IDV: all prior steps (credential, liveness, KBA, OFAC) must be completed first (current status: ${signer.idvStatus})` });
      }

      if (signer.kbaScore === null || signer.kbaScore === undefined || signer.kbaScore < 4) {
        return res.status(400).json({ message: `Cannot complete IDV: KBA score insufficient (${signer.kbaScore ?? 0}/5, need 4)` });
      }
    }

    await storage.updateRonSigner(req.params.id, {
      idvStatus: "fully_verified",
    });

    const verificationMethod = hasCompletedAltIdv
      ? `alternative IDV (${altIdvRecords.find(r => r.status === "completed")?.method})`
      : "standard IDV";

    await journalService.createJournalEntry({
      transactionId: signer.transactionId,
      eventType: "signer_verified",
      actorType: "system",
      actorId: "idv_system",
      description: `Signer "${signer.firstName} ${signer.lastName}" identity fully verified via ${verificationMethod}`,
      signerId: signer.id,
      ipAddress: req.ip,
    });

    res.json({ success: true, idvStatus: "fully_verified", method: verificationMethod });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

// ============================================================================
// SIGNER JOIN/LEAVE SESSION
// ============================================================================

router.post("/sessions/:id/join", async (req: any, res) => {
  try {
    const session = await storage.getRonSession(req.params.id);
    if (!session) return res.status(404).json({ message: "Session not found" });

    const { txn, error } = await verifyTransactionAccess(session.transactionId, req.user.id, req.user.role);
    if (error) return res.status(403).json({ message: error });

    const { signerId } = req.body;
    if (!signerId) return res.status(400).json({ message: "signerId is required" });

    const signer = await storage.getRonSigner(signerId);
    if (!signer) return res.status(404).json({ message: "Signer not found" });
    if (signer.transactionId !== session.transactionId) {
      return res.status(400).json({ message: "Signer does not belong to this transaction" });
    }

    await journalService.createJournalEntry({
      transactionId: session.transactionId,
      sessionId: session.id,
      eventType: "signer_joined",
      actorType: "signer",
      actorId: signerId,
      description: `Signer "${signer.firstName} ${signer.lastName}" joined the session`,
      signerId: signerId,
      ipAddress: req.ip,
    });

    res.json({ success: true, message: `${signer.firstName} ${signer.lastName} joined the session` });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

router.post("/sessions/:id/leave", async (req: any, res) => {
  try {
    const session = await storage.getRonSession(req.params.id);
    if (!session) return res.status(404).json({ message: "Session not found" });

    const { txn, error } = await verifyTransactionAccess(session.transactionId, req.user.id, req.user.role);
    if (error) return res.status(403).json({ message: error });

    const { signerId } = req.body;
    if (!signerId) return res.status(400).json({ message: "signerId is required" });

    const signer = await storage.getRonSigner(signerId);
    if (!signer) return res.status(404).json({ message: "Signer not found" });
    if (signer.transactionId !== session.transactionId) {
      return res.status(400).json({ message: "Signer does not belong to this transaction" });
    }

    await journalService.createJournalEntry({
      transactionId: session.transactionId,
      sessionId: session.id,
      eventType: "signer_left",
      actorType: "signer",
      actorId: signerId,
      description: `Signer "${signer.firstName} ${signer.lastName}" left the session`,
      signerId: signerId,
      ipAddress: req.ip,
    });

    res.json({ success: true, message: `${signer.firstName} ${signer.lastName} left the session` });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

// ============================================================================
// SESSION ENRICHED DETAIL (for closing room)
// ============================================================================

router.get("/sessions/:id/detail", async (req: any, res) => {
  try {
    const session = await storage.getRonSession(req.params.id);
    if (!session) return res.status(404).json({ message: "Session not found" });

    const { txn, error } = await verifyTransactionAccess(session.transactionId, req.user.id, req.user.role);
    if (error) return res.status(403).json({ message: error });

    const notary = session.notaryId ? await storage.getRonNotary(session.notaryId) : null;
    const signers = await storage.getRonSigners(session.transactionId);
    const documents = await storage.getRonDocuments(session.transactionId);
    const journal = await journalService.getJournalEntries(session.transactionId);

    const docsWithAnnotations = await Promise.all(documents.map(async (doc) => {
      const annotations = await storage.getRonAnnotations(doc.id);
      const signatures = await storage.getRonSignaturesByDocument(doc.id);
      const seals = await storage.getRonSealsByDocument(doc.id);
      return { ...doc, annotations, signatures, seals };
    }));

    res.json({
      session,
      transaction: txn,
      notary,
      signers,
      documents: docsWithAnnotations,
      journal: journal.slice(-20),
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

// ============================================================================
// COMPLIANCE DASHBOARD
// ============================================================================

router.get("/compliance/dashboard", async (req: any, res) => {
  try {
    const allTransactions = await storage.getRonTransactions(
      req.user.role !== "super_admin" ? { createdBy: req.user.id } : {}
    );

    const allChecks: Array<{
      check: any;
      transactionTitle: string;
      signerName: string | null;
    }> = [];

    for (const txn of allTransactions) {
      const checks = await storage.getRonComplianceChecks(txn.id);
      const signers = await storage.getRonSigners(txn.id);
      const signerMap = new Map(signers.map(s => [s.id, `${s.firstName} ${s.lastName}`]));

      for (const check of checks) {
        allChecks.push({
          check,
          transactionTitle: txn.title,
          signerName: check.signerId ? signerMap.get(check.signerId) || null : null,
        });
      }
    }

    const { checkType, result } = req.query;
    let filtered = allChecks;
    if (checkType) filtered = filtered.filter(c => c.check.checkType === checkType);
    if (result) filtered = filtered.filter(c => c.check.result === result);

    filtered.sort((a, b) => new Date(b.check.performedAt).getTime() - new Date(a.check.performedAt).getTime());

    const hasFilters = checkType || result;
    const summarySource = hasFilters ? filtered : allChecks;
    const summary = {
      total: summarySource.length,
      pass: summarySource.filter(c => c.check.result === "pass").length,
      fail: summarySource.filter(c => c.check.result === "fail").length,
      pending: summarySource.filter(c => c.check.result === "pending").length,
      reviewRequired: summarySource.filter(c => c.check.result === "review_required").length,
      byType: {} as Record<string, number>,
    };
    for (const c of summarySource) {
      summary.byType[c.check.checkType] = (summary.byType[c.check.checkType] || 0) + 1;
    }

    res.json({ checks: filtered, summary });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

// ============================================================================
// SIGNER SIGNATURE SAVE
// ============================================================================

router.patch("/signers/:id/signature", async (req: any, res) => {
  try {
    const signer = await storage.getRonSigner(req.params.id);
    if (!signer) return res.status(404).json({ message: "Signer not found" });

    const { txn, error } = await verifyTransactionAccess(signer.transactionId, req.user.id, req.user.role);
    if (error) return res.status(403).json({ message: error });

    const { signatureImageUrl, initialsImageUrl } = req.body;
    const updates: Record<string, unknown> = {};
    if (signatureImageUrl) updates.signatureImageUrl = signatureImageUrl;
    if (initialsImageUrl) updates.initialsImageUrl = initialsImageUrl;

    const updated = await storage.updateRonSigner(req.params.id, updates);
    res.json(updated);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

// ============================================================================
// JOURNAL
// ============================================================================

router.get("/transactions/:transactionId/journal", async (req: any, res) => {
  try {
    const { txn, error } = await verifyTransactionAccess(req.params.transactionId, req.user.id, req.user.role);
    if (error) return res.status(txn === null && error === "Transaction not found" ? 404 : 403).json({ message: error });

    const entries = await journalService.getJournalEntries(req.params.transactionId);
    res.json(entries);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

router.get("/transactions/:transactionId/journal/verify", async (req: any, res) => {
  try {
    const { txn, error } = await verifyTransactionAccess(req.params.transactionId, req.user.id, req.user.role);
    if (error) return res.status(txn === null && error === "Transaction not found" ? 404 : 403).json({ message: error });

    const result = await journalService.verifyJournalChain(req.params.transactionId);
    res.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

// ============================================================================
// COMPLIANCE
// ============================================================================

router.get("/compliance/rules", async (req: any, res) => {
  try {
    const { state } = req.query;
    if (state) {
      const rules = complianceService.getComplianceRules(state as string);
      if (!rules) return res.status(404).json({ message: `No rules for state: ${state}` });
      return res.json(rules);
    }
    res.json(complianceService.getAllSupportedStates());
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

router.get("/transactions/:transactionId/compliance", async (req: any, res) => {
  try {
    const { txn, error } = await verifyTransactionAccess(req.params.transactionId, req.user.id, req.user.role);
    if (error) return res.status(txn === null && error === "Transaction not found" ? 404 : 403).json({ message: error });

    const checks = await complianceService.getComplianceChecks(req.params.transactionId);
    res.json(checks);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

router.post("/transactions/:transactionId/compliance/check", async (req: any, res) => {
  try {
    const { txn, error } = await verifyTransactionAccess(req.params.transactionId, req.user.id, req.user.role);
    if (error) return res.status(txn === null && error === "Transaction not found" ? 404 : 403).json({ message: error });

    const { checkType, signerId } = req.body;
    if (!checkType) return res.status(400).json({ message: "checkType is required" });

    if (!isComplianceCheckType(checkType)) {
      return res.status(400).json({ message: `Invalid checkType. Must be one of: ${VALID_COMPLIANCE_CHECK_TYPES.join(", ")}` });
    }

    if (signerId) {
      const signer = await storage.getRonSigner(signerId);
      if (!signer || signer.transactionId !== req.params.transactionId) {
        return res.status(400).json({ message: "Signer does not belong to this transaction" });
      }
    }

    const check = await complianceService.runComplianceCheck({
      transactionId: req.params.transactionId,
      signerId,
      checkType,
      performedBy: req.user.id,
    });

    await journalService.createJournalEntry({
      transactionId: req.params.transactionId,
      eventType: "compliance_check",
      actorType: "system",
      actorId: "compliance_engine",
      description: `${checkType.toUpperCase()} check: ${check.result}`,
      signerId,
      eventData: { checkType, result: check.result },
      ipAddress: req.ip,
    });

    res.status(201).json(check);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

router.get("/signers/:signerId/readiness", async (req: any, res) => {
  try {
    const signer = await storage.getRonSigner(req.params.signerId);
    if (!signer) return res.status(404).json({ message: "Signer not found" });

    const { txn, error } = await verifyTransactionAccess(signer.transactionId, req.user.id, req.user.role);
    if (error) return res.status(403).json({ message: error });

    const jurisdiction = txn?.jurisdiction || "FL";
    const readiness = await complianceService.checkSignerReadiness(req.params.signerId, jurisdiction);
    res.json(readiness);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

// ============================================================================
// RECORDINGS
// ============================================================================

router.get("/sessions/:sessionId/recordings", async (req: any, res) => {
  try {
    const session = await storage.getRonSession(req.params.sessionId);
    if (!session) return res.status(404).json({ message: "Session not found" });

    const { txn, error } = await verifyTransactionAccess(session.transactionId, req.user.id, req.user.role);
    if (error) return res.status(403).json({ message: error });

    const recordings = await storage.getRonRecordings(req.params.sessionId);
    res.json(recordings);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

router.post("/sessions/:sessionId/recordings", async (req: any, res) => {
  try {
    const session = await storage.getRonSession(req.params.sessionId);
    if (!session) return res.status(404).json({ message: "Session not found" });

    const { txn, error } = await verifyTransactionAccess(session.transactionId, req.user.id, req.user.role);
    if (error) return res.status(403).json({ message: error });

    const retentionYears = 10;
    const retentionExp = new Date();
    retentionExp.setFullYear(retentionExp.getFullYear() + retentionYears);

    const recording = await storage.createRonRecording({
      sessionId: req.params.sessionId,
      status: "recording",
      startedAt: new Date(),
      retentionExpiration: retentionExp,
      format: req.body.format || "webm",
      metadata: req.body.metadata || {},
    });

    await journalService.createJournalEntry({
      transactionId: session.transactionId,
      sessionId: session.id,
      eventType: "recording_started",
      actorType: "system",
      description: "Session recording started",
      ipAddress: req.ip,
    });

    res.status(201).json(recording);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

// ============================================================================
// DASHBOARD STATS
// ============================================================================

router.get("/dashboard/stats", async (req: any, res) => {
  try {
    const filters: { createdBy?: string } = {};
    if (req.user.role !== "super_admin") filters.createdBy = req.user.id;

    const allTxns = await storage.getRonTransactions(filters);

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const active = allTxns.filter(t => ["draft", "pending_idv", "ready", "in_progress"].includes(t.status));
    const completedRecently = allTxns.filter(t =>
      t.status === "completed" && t.completedDate && t.completedDate >= thirtyDaysAgo
    );

    let pendingSessionCount = 0;
    let activeNotaryCount = 0;

    if (req.user.role === "super_admin") {
      const allSessions = await storage.getAllRonSessions();
      pendingSessionCount = allSessions.filter(s => s.status === "scheduled").length;
      const activeNotaries = await storage.getRonNotaries({ status: "active" });
      activeNotaryCount = activeNotaries.length;
    } else {
      const txnIds = new Set(allTxns.map(t => t.id));
      for (const txnId of txnIds) {
        const sessions = await storage.getRonSessions(txnId);
        pendingSessionCount += sessions.filter(s => s.status === "scheduled").length;
      }
    }

    res.json({
      activeTransactions: active.length,
      completedThisMonth: completedRecently.length,
      pendingSessions: pendingSessionCount,
      totalTransactions: allTxns.length,
      ...(req.user.role === "super_admin" ? { activeNotaries: activeNotaryCount } : {}),
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

// ============================================================================
// RON ELIGIBILITY CHECKING
// ============================================================================

router.post("/transactions/:transactionId/eligibility-check", async (req: any, res) => {
  try {
    const { txn, error } = await verifyTransactionAccess(req.params.transactionId, req.user.id, req.user.role);
    if (error) return res.status(txn === null && error === "Transaction not found" ? 404 : 403).json({ message: error });

    const documents = await storage.getRonDocuments(req.params.transactionId);
    const documentTypes = documents.map(d => d.documentType).filter(Boolean) as string[];

    const eligibility = complianceService.checkRonEligibility({
      jurisdiction: txn!.jurisdiction || req.body.jurisdiction || "FL",
      transactionType: txn!.transactionType || req.body.transactionType,
      documentTypes: req.body.documentTypes || documentTypes,
      county: req.body.county,
    });

    const saved = await complianceService.saveEligibilityCheck({
      transactionId: req.params.transactionId,
      result: eligibility.result,
      jurisdiction: txn!.jurisdiction || req.body.jurisdiction || "FL",
      transactionType: txn!.transactionType || req.body.transactionType,
      documentTypes: req.body.documentTypes || documentTypes,
      reasons: eligibility.reasons,
      warnings: eligibility.warnings,
      countyOverride: req.body.county,
      checkedBy: req.user.id,
      checkedAt: new Date(),
    });

    await journalService.createJournalEntry({
      transactionId: req.params.transactionId,
      eventType: "compliance_check",
      actorType: "system",
      actorId: "eligibility_engine",
      description: `RON eligibility check: ${eligibility.result}`,
      eventData: { result: eligibility.result, reasons: eligibility.reasons, warnings: eligibility.warnings },
      ipAddress: req.ip,
    });

    res.json({ ...saved, alternativeIdvMethods: eligibility.alternativeIdvMethods });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

router.get("/transactions/:transactionId/eligibility", async (req: any, res) => {
  try {
    const { txn, error } = await verifyTransactionAccess(req.params.transactionId, req.user.id, req.user.role);
    if (error) return res.status(txn === null && error === "Transaction not found" ? 404 : 403).json({ message: error });

    const checks = await complianceService.getEligibilityChecks(req.params.transactionId);
    const latest = checks.length > 0 ? checks[checks.length - 1] : null;
    res.json({ checks, latest });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

router.post("/eligibility/preview", async (req: any, res) => {
  try {
    const { jurisdiction, transactionType, documentTypes, county } = req.body;
    if (!jurisdiction) return res.status(400).json({ message: "jurisdiction is required" });

    const eligibility = complianceService.checkRonEligibility({
      jurisdiction,
      transactionType,
      documentTypes: documentTypes || [],
      county,
    });

    res.json(eligibility);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

// ============================================================================
// ALTERNATIVE IDV PATHWAYS
// ============================================================================

router.post("/signers/:signerId/alt-idv/credible-witness", async (req: any, res) => {
  try {
    const signer = await storage.getRonSigner(req.params.signerId);
    if (!signer) return res.status(404).json({ message: "Signer not found" });

    const { txn, error } = await verifyTransactionAccess(signer.transactionId, req.user.id, req.user.role);
    if (error) return res.status(403).json({ message: error });

    const jurisdiction = txn?.jurisdiction || "FL";
    const rules = complianceService.getComplianceRules(jurisdiction);
    if (!rules || !rules.alternativeIdvMethods.credibleWitness) {
      return res.status(400).json({ message: `Credible witness IDV is not permitted in ${jurisdiction}` });
    }

    if (signer.idvStatus !== "kba_failed") {
      return res.status(400).json({ message: `Alternative IDV can only be initiated when KBA has failed (current status: ${signer.idvStatus})` });
    }

    const { witnessFirstName, witnessLastName, witnessEmail, witnessPhone, witnessRelationship, reason } = req.body;
    if (!witnessFirstName || !witnessLastName || !witnessEmail) {
      return res.status(400).json({ message: "Witness first name, last name, and email are required" });
    }

    const record = await complianceService.createAltIdvRecord({
      transactionId: signer.transactionId,
      signerId: signer.id,
      method: "credible_witness",
      status: "witness_idv_pending",
      witnessFirstName,
      witnessLastName,
      witnessEmail,
      witnessPhone: witnessPhone || null,
      witnessRelationship: witnessRelationship || null,
      reason: reason || "KBA failed — using credible witness alternative",
      details: {
        jurisdictionRules: rules.alternativeIdvMethods.credibleWitnessRequirements,
        initiatedAt: new Date().toISOString(),
      },
    });

    await journalService.createJournalEntry({
      transactionId: signer.transactionId,
      eventType: "compliance_check",
      actorType: "user",
      actorId: req.user.id,
      actorName: `${req.user.firstName || ""} ${req.user.lastName || ""}`.trim(),
      description: `Credible witness IDV initiated for "${signer.firstName} ${signer.lastName}" — witness: ${witnessFirstName} ${witnessLastName}`,
      signerId: signer.id,
      eventData: { method: "credible_witness", witnessEmail, altIdvRecordId: record.id },
      ipAddress: req.ip,
    });

    res.status(201).json(record);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

router.post("/alt-idv/:recordId/witness-verify", async (req: any, res) => {
  try {
    const record = await complianceService.getAltIdvRecord(req.params.recordId);
    if (!record) return res.status(404).json({ message: "Alt IDV record not found" });

    const { txn, error } = await verifyTransactionAccess(record.transactionId, req.user.id, req.user.role);
    if (error) return res.status(403).json({ message: error });

    if (record.method !== "credible_witness") {
      return res.status(400).json({ message: "This record is not a credible witness pathway" });
    }

    const { credentialType, credentialNumber, kbaScore } = req.body;

    const updated = await complianceService.updateAltIdvRecord(record.id, {
      witnessCredentialType: credentialType || "drivers_license",
      witnessCredentialNumber: credentialNumber || `WIT-${Date.now()}`,
      witnessIdvPassed: true,
      witnessKbaScore: kbaScore ?? 5,
      status: "witness_idv_complete",
    });

    await complianceService.runComplianceCheck({
      transactionId: record.transactionId,
      signerId: record.signerId,
      checkType: "credential_analysis",
      performedBy: req.user.id,
    });

    await journalService.createJournalEntry({
      transactionId: record.transactionId,
      eventType: "compliance_check",
      actorType: "system",
      actorId: "alt_idv_system",
      description: `Credible witness "${record.witnessFirstName} ${record.witnessLastName}" identity verified`,
      signerId: record.signerId,
      eventData: { method: "credible_witness", witnessVerified: true, altIdvRecordId: record.id },
      ipAddress: req.ip,
    });

    res.json(updated);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

router.post("/alt-idv/:recordId/complete", async (req: any, res) => {
  try {
    const record = await complianceService.getAltIdvRecord(req.params.recordId);
    if (!record) return res.status(404).json({ message: "Alt IDV record not found" });

    const { txn, error } = await verifyTransactionAccess(record.transactionId, req.user.id, req.user.role);
    if (error) return res.status(403).json({ message: error });

    if (record.method === "credible_witness" && !record.witnessIdvPassed) {
      return res.status(400).json({ message: "Witness must complete IDV before this pathway can be completed" });
    }

    const updated = await complianceService.updateAltIdvRecord(record.id, {
      status: "completed",
      completedAt: new Date(),
      completedBy: req.user.id,
    });

    const signer = await storage.getRonSigner(record.signerId);

    await journalService.createJournalEntry({
      transactionId: record.transactionId,
      eventType: "signer_verified",
      actorType: "system",
      actorId: "alt_idv_system",
      description: `Signer "${signer?.firstName} ${signer?.lastName}" identity verified via ${record.method === "credible_witness" ? "credible witness" : "personal knowledge"}`,
      signerId: record.signerId,
      eventData: { method: record.method, altIdvRecordId: record.id },
      ipAddress: req.ip,
    });

    res.json(updated);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

router.post("/signers/:signerId/alt-idv/personal-knowledge", async (req: any, res) => {
  try {
    const signer = await storage.getRonSigner(req.params.signerId);
    if (!signer) return res.status(404).json({ message: "Signer not found" });

    const { txn, error } = await verifyTransactionAccess(signer.transactionId, req.user.id, req.user.role);
    if (error) return res.status(403).json({ message: error });

    const jurisdiction = txn?.jurisdiction || "FL";
    const rules = complianceService.getComplianceRules(jurisdiction);
    if (!rules || !rules.alternativeIdvMethods.personalKnowledge) {
      return res.status(400).json({ message: `Personal knowledge IDV is not permitted in ${jurisdiction}` });
    }

    if (signer.idvStatus !== "kba_failed") {
      return res.status(400).json({ message: `Alternative IDV can only be initiated when KBA has failed (current status: ${signer.idvStatus})` });
    }

    const { notaryId, notaryAttestation, reason } = req.body;
    if (!notaryId) return res.status(400).json({ message: "notaryId is required" });
    if (!notaryAttestation) return res.status(400).json({ message: "Notary attestation is required" });

    const notary = await storage.getRonNotary(notaryId);
    if (!notary) return res.status(404).json({ message: "Notary not found" });
    if (notary.status !== "active") return res.status(400).json({ message: "Notary must be active" });

    const record = await complianceService.createAltIdvRecord({
      transactionId: signer.transactionId,
      signerId: signer.id,
      method: "personal_knowledge",
      status: "attestation_pending",
      notaryId,
      notaryAttestation,
      reason: reason || "KBA failed — using personal knowledge alternative",
      details: {
        jurisdictionRules: rules.alternativeIdvMethods.personalKnowledgeRequirements,
        notaryName: `${notary.firstName} ${notary.lastName}`,
        notaryCommissionState: notary.commissionState,
        notaryCommissionNumber: notary.commissionNumber,
        initiatedAt: new Date().toISOString(),
      },
    });

    await journalService.createJournalEntry({
      transactionId: signer.transactionId,
      eventType: "compliance_check",
      actorType: "notary",
      actorId: notaryId,
      actorName: `${notary.firstName} ${notary.lastName}`,
      description: `Personal knowledge IDV initiated for "${signer.firstName} ${signer.lastName}" by notary ${notary.firstName} ${notary.lastName}`,
      signerId: signer.id,
      eventData: { method: "personal_knowledge", notaryId, altIdvRecordId: record.id },
      ipAddress: req.ip,
    });

    res.status(201).json(record);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

router.post("/alt-idv/:recordId/sign-attestation", async (req: any, res) => {
  try {
    const record = await complianceService.getAltIdvRecord(req.params.recordId);
    if (!record) return res.status(404).json({ message: "Alt IDV record not found" });

    const { txn, error } = await verifyTransactionAccess(record.transactionId, req.user.id, req.user.role);
    if (error) return res.status(403).json({ message: error });

    if (record.method !== "personal_knowledge") {
      return res.status(400).json({ message: "This endpoint is for personal knowledge attestations only" });
    }

    if (record.notaryId) {
      const notary = await storage.getRonNotary(record.notaryId);
      if (notary) {
        const notaryUser = await storage.getUserByEmail(notary.email);
        if (notaryUser && notaryUser.id !== req.user.id && req.user.role !== "super_admin") {
          return res.status(403).json({ message: "Only the designated notary can sign this attestation" });
        }
      }
    }

    const { notarySignature } = req.body;
    if (!notarySignature) return res.status(400).json({ message: "Notary signature is required" });

    const updated = await complianceService.updateAltIdvRecord(record.id, {
      notarySignature,
      attestationDate: new Date(),
      status: "completed",
      completedAt: new Date(),
      completedBy: req.user.id,
    });

    const signer = await storage.getRonSigner(record.signerId);

    await journalService.createJournalEntry({
      transactionId: record.transactionId,
      eventType: "compliance_check",
      actorType: "notary",
      actorId: record.notaryId || "unknown",
      description: `Personal knowledge attestation signed for signer "${signer?.firstName} ${signer?.lastName}" — use complete-idv to finalize verification`,
      signerId: record.signerId,
      eventData: { method: "personal_knowledge", attestationSigned: true, altIdvRecordId: record.id },
      ipAddress: req.ip,
    });

    res.json(updated);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

router.get("/signers/:signerId/alt-idv", async (req: any, res) => {
  try {
    const signer = await storage.getRonSigner(req.params.signerId);
    if (!signer) return res.status(404).json({ message: "Signer not found" });

    const { txn, error } = await verifyTransactionAccess(signer.transactionId, req.user.id, req.user.role);
    if (error) return res.status(403).json({ message: error });

    const records = await complianceService.getAltIdvRecords(req.params.signerId);

    const jurisdiction = txn?.jurisdiction || "FL";
    const rules = complianceService.getComplianceRules(jurisdiction);

    res.json({
      records,
      availableMethods: {
        credibleWitness: rules?.alternativeIdvMethods.credibleWitness || false,
        personalKnowledge: rules?.alternativeIdvMethods.personalKnowledge || false,
      },
      requirements: {
        credibleWitness: rules?.alternativeIdvMethods.credibleWitnessRequirements || null,
        personalKnowledge: rules?.alternativeIdvMethods.personalKnowledgeRequirements || null,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

const publicRouter = Router();
const publicUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

publicRouter.get("/validate-invitation/:token", async (req: any, res) => {
  try {
    const invitation = await storage.getRonNotaryInvitationByToken(req.params.token);
    if (!invitation) return res.status(404).json({ message: "Invitation not found" });
    if (invitation.status === "submitted") return res.status(400).json({ message: "This invitation has already been used" });
    if (invitation.status === "cancelled") return res.status(400).json({ message: "This invitation has been cancelled" });
    if (new Date() > new Date(invitation.expiresAt)) {
      await storage.updateRonNotaryInvitation(invitation.id, { status: "expired" });
      return res.status(400).json({ message: "This invitation has expired" });
    }
    res.json({ email: invitation.email, expiresAt: invitation.expiresAt, status: invitation.status });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

publicRouter.post("/submit-credentials/:token", publicUpload.fields([
  { name: "commission_cert", maxCount: 1 },
  { name: "bond_cert", maxCount: 1 },
  { name: "eo_insurance_cert", maxCount: 1 },
  { name: "training_cert", maxCount: 1 },
  { name: "background_check", maxCount: 1 },
  { name: "seal_image", maxCount: 1 },
  { name: "signature_image", maxCount: 1 },
  { name: "other", maxCount: 1 },
]), async (req: any, res) => {
  try {
    const invitation = await storage.getRonNotaryInvitationByToken(req.params.token);
    if (!invitation) return res.status(404).json({ message: "Invitation not found" });
    if (invitation.status === "submitted") return res.status(400).json({ message: "This invitation has already been used" });
    if (invitation.status === "cancelled") return res.status(400).json({ message: "This invitation has been cancelled" });
    if (new Date() > new Date(invitation.expiresAt)) {
      await storage.updateRonNotaryInvitation(invitation.id, { status: "expired" });
      return res.status(400).json({ message: "This invitation has expired" });
    }

    const {
      firstName, lastName, email, phone, commissionState, commissionNumber,
      commissionExpiration, notarizationType, languages, bondAmount, bondExpiration,
      eoInsuranceAmount, eoInsuranceExpiration, ronTrainingCompleted, ronTrainingDate,
    } = req.body;

    if (!firstName || !lastName || !commissionState) {
      return res.status(400).json({ message: "First name, last name, and commission state are required" });
    }

    const boundEmail = invitation.email;
    if (email && email.toLowerCase() !== boundEmail.toLowerCase()) {
      return res.status(400).json({ message: "Email does not match invitation" });
    }

    const filesMap = req.files as { [fieldname: string]: Express.Multer.File[] };
    if (!filesMap?.commission_cert || filesMap.commission_cert.length === 0) {
      return res.status(400).json({ message: "Commission certificate is required" });
    }

    let notary = await storage.getRonNotaryByEmail(boundEmail);

    if (notary) {
      notary = await storage.updateRonNotary(notary.id, {
        firstName,
        lastName,
        phone: phone || notary.phone,
        commissionState,
        commissionNumber: commissionNumber || notary.commissionNumber,
        commissionExpiration: commissionExpiration ? new Date(commissionExpiration) : notary.commissionExpiration,
        languages: languages ? (typeof languages === "string" ? JSON.parse(languages) : languages) : notary.languages,
        bondAmount: bondAmount || notary.bondAmount,
        bondExpiration: bondExpiration ? new Date(bondExpiration) : notary.bondExpiration,
        eoInsuranceAmount: eoInsuranceAmount || notary.eoInsuranceAmount,
        eoInsuranceExpiration: eoInsuranceExpiration ? new Date(eoInsuranceExpiration) : notary.eoInsuranceExpiration,
        ronTrainingCompleted: ronTrainingCompleted === "true" || ronTrainingCompleted === true,
        ronTrainingDate: ronTrainingDate ? new Date(ronTrainingDate) : notary.ronTrainingDate,
        status: "pending_onboarding",
        metadata: { ...((notary.metadata && typeof notary.metadata === "object" ? notary.metadata : {}) as Record<string, unknown>), notarizationType: notarizationType || "both" },
      });
    } else {
      notary = await storage.createRonNotary({
        firstName,
        lastName,
        email: boundEmail,
        phone: phone || null,
        commissionState,
        commissionNumber: commissionNumber || null,
        commissionExpiration: commissionExpiration ? new Date(commissionExpiration) : null,
        status: "pending_onboarding",
        languages: languages ? (typeof languages === "string" ? JSON.parse(languages) : languages) : ["English"],
        bondAmount: bondAmount || null,
        bondExpiration: bondExpiration ? new Date(bondExpiration) : null,
        eoInsuranceAmount: eoInsuranceAmount || null,
        eoInsuranceExpiration: eoInsuranceExpiration ? new Date(eoInsuranceExpiration) : null,
        ronTrainingCompleted: ronTrainingCompleted === "true" || ronTrainingCompleted === true,
        ronTrainingDate: ronTrainingDate ? new Date(ronTrainingDate) : null,
        timezone: "America/New_York",
        metadata: { notarizationType: notarizationType || "both" },
      });
    }

    const docTypes = ["commission_cert", "bond_cert", "eo_insurance_cert", "training_cert", "background_check", "seal_image", "signature_image", "other"] as const;

    const uploadedDocs: Array<{ docType: string; fileUrl: string; file: Express.Multer.File }> = [];

    for (const docType of docTypes) {
      if (filesMap[docType] && filesMap[docType].length > 0) {
        const file = filesMap[docType][0];
        const key = `notary-documents/${notary.id}/${docType}_${nanoid()}_${file.originalname}`;
        await uploadFile(RON_DOCUMENTS_BUCKET, key, file.buffer, file.mimetype);
        uploadedDocs.push({ docType, fileUrl: key, file });
      }
    }

    for (const { docType, fileUrl, file } of uploadedDocs) {
      await storage.createRonNotaryDocument({
        notaryId: notary.id,
        documentType: docType as "commission_cert" | "bond_cert" | "eo_insurance_cert" | "training_cert" | "background_check" | "seal_image" | "signature_image" | "other",
        fileUrl,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        verificationStatus: "pending",
      });
    }

    await storage.updateRonNotaryInvitation(invitation.id, {
      status: "submitted",
      notaryId: notary.id,
    });

    res.status(201).json({ success: true, notaryId: notary.id });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[RON] Credential submission error:", error);
    res.status(500).json({ message: msg });
  }
});

// ============================================================================
// QUEUE & ROUTING ENGINE
// ============================================================================

router.get("/queue/stats", requireRole("super_admin"), async (req: any, res) => {
  try {
    const stats = await queueService.getQueueStats();
    res.json(stats);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

router.get("/queue/transactions", requireRole("super_admin"), async (req: any, res) => {
  try {
    const transactions = await queueService.getQueuedTransactions();
    const enriched = await Promise.all(
      transactions.map(async (txn) => {
        const signers = await storage.getRonSigners(txn.id);
        return { ...txn, signerCount: signers.length };
      })
    );
    res.json(enriched);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

router.get("/queue/my-queue/:notaryId", async (req: any, res) => {
  try {
    const notary = await storage.getRonNotary(req.params.notaryId);
    if (!notary) return res.status(404).json({ message: "Notary not found" });
    if (req.user.role !== "super_admin" && notary.userId !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }

    const eligible = await queueService.getEligibleTransactionsForNotary(req.params.notaryId);
    const enriched = await Promise.all(
      eligible.map(async (txn) => {
        const signers = await storage.getRonSigners(txn.id);
        return { ...txn, signerCount: signers.length };
      })
    );
    res.json(enriched);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

router.post("/queue/claim/:transactionId", async (req: any, res) => {
  try {
    const { notaryId } = req.body;
    if (!notaryId) return res.status(400).json({ message: "notaryId is required" });

    const notary = await storage.getRonNotary(notaryId);
    if (!notary) return res.status(404).json({ message: "Notary not found" });
    if (req.user.role !== "super_admin" && notary.userId !== req.user.id) {
      return res.status(403).json({ message: "You can only claim transactions for your own notary profile" });
    }

    const txn = await queueService.claimTransaction(req.params.transactionId, notaryId);
    if (!txn) return res.status(400).json({ message: "Transaction cannot be claimed. It may already be claimed or assigned, or you may not be eligible." });

    await journalService.createJournalEntry({
      transactionId: txn.id,
      eventType: "notary_assigned",
      actorType: "user",
      actorId: req.user.id,
      actorName: `${req.user.firstName || ""} ${req.user.lastName || ""}`.trim(),
      description: `Transaction claimed by notary`,
      eventData: { notaryId, action: "claimed" },
      ipAddress: req.ip,
    });

    res.json(txn);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

router.post("/queue/release/:transactionId", async (req: any, res) => {
  try {
    const { notaryId } = req.body;
    if (!notaryId) return res.status(400).json({ message: "notaryId is required" });

    const notary = await storage.getRonNotary(notaryId);
    if (!notary) return res.status(404).json({ message: "Notary not found" });
    if (req.user.role !== "super_admin" && notary.userId !== req.user.id) {
      return res.status(403).json({ message: "You can only release your own claimed transactions" });
    }

    const txn = await queueService.releaseClaimedTransaction(req.params.transactionId, notaryId);
    if (!txn) return res.status(400).json({ message: "Cannot release this transaction" });

    res.json(txn);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

router.post("/queue/assign/:transactionId", requireRole("super_admin"), async (req: any, res) => {
  try {
    const { notaryId } = req.body;
    if (!notaryId) return res.status(400).json({ message: "notaryId is required" });

    const txn = await queueService.forceAssignTransaction(req.params.transactionId, notaryId, req.user.id);
    if (!txn) return res.status(400).json({ message: "Could not assign transaction" });

    await journalService.createJournalEntry({
      transactionId: txn.id,
      eventType: "notary_assigned",
      actorType: "user",
      actorId: req.user.id,
      actorName: `${req.user.firstName || ""} ${req.user.lastName || ""}`.trim(),
      description: `Transaction force-assigned to notary`,
      eventData: { notaryId, action: "force_assigned" },
      ipAddress: req.ip,
    });

    res.json(txn);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

router.post("/queue/auto-assign/:transactionId", requireRole("super_admin"), async (req: any, res) => {
  try {
    const result = await queueService.autoAssignTransaction(req.params.transactionId);
    if (!result) return res.status(400).json({ message: "No eligible notaries available for auto-assignment" });

    await journalService.createJournalEntry({
      transactionId: result.transaction.id,
      eventType: "notary_assigned",
      actorType: "system",
      actorId: "queue_engine",
      description: `Transaction auto-assigned to ${result.notary.firstName} ${result.notary.lastName}`,
      eventData: { notaryId: result.notary.id, action: "auto_assigned" },
      ipAddress: req.ip,
    });

    res.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

router.post("/queue/push/:transactionId", requireRole("super_admin"), async (req: any, res) => {
  try {
    const { priority } = req.body;
    const txn = await queueService.pushToQueue(req.params.transactionId, priority);
    if (!txn) return res.status(404).json({ message: "Transaction not found" });

    res.json(txn);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

router.patch("/notaries/:id/availability", async (req: any, res) => {
  try {
    const { availabilityStatus } = req.body;
    if (!["available", "busy", "offline"].includes(availabilityStatus)) {
      return res.status(400).json({ message: "availabilityStatus must be 'available', 'busy', or 'offline'" });
    }

    const existing = await storage.getRonNotary(req.params.id);
    if (!existing) return res.status(404).json({ message: "Notary not found" });
    if (req.user.role !== "super_admin" && existing.userId !== req.user.id) {
      return res.status(403).json({ message: "You can only update your own availability" });
    }

    const notary = await queueService.updateNotaryAvailability(req.params.id, availabilityStatus);
    if (!notary) return res.status(404).json({ message: "Notary not found" });

    res.json(notary);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

router.get("/notaries/:id/workload", requireRole("super_admin"), async (req: any, res) => {
  try {
    const workload = await queueService.getNotaryWorkload(req.params.id);
    res.json(workload);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: msg });
  }
});

export function registerRonRoutes(app: Express) {
  app.use("/api/ron/public", publicRouter);
  app.use("/api/ron", router);
  console.log("[RON] Routes registered");
}
