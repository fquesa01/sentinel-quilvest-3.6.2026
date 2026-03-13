import { Router } from "express";
import multer from "multer";
import { isAuthenticated, requireRole } from "../replitAuth";
import * as journalService from "../services/ron-journal-service";
import * as complianceService from "../services/ron-compliance-service";
import { ObjectStorageService } from "../objectStorage";
import { storage } from "../storage";
import type { RonComplianceCheck } from "@shared/schema";

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
  if (userRole !== "admin" && txn.createdBy !== userId) {
    return { txn: null, error: "Access denied" };
  }
  return { txn };
}

// ============================================================================
// TRANSACTIONS
// ============================================================================

router.get("/transactions", requireRole("admin", "attorney", "external_counsel"), async (req: any, res) => {
  try {
    const { status, dealId } = req.query;
    const filters: { status?: string; dealId?: string; createdBy?: string } = {};
    if (req.user.role !== "admin") filters.createdBy = req.user.id;
    if (status) filters.status = status as string;
    if (dealId) filters.dealId = dealId as string;

    const transactions = await storage.getRonTransactions(filters);
    res.json(transactions);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/transactions/:id", async (req: any, res) => {
  try {
    const { txn, error } = await verifyTransactionAccess(req.params.id, req.user.id, req.user.role);
    if (error) return res.status(txn === null && error === "Transaction not found" ? 404 : 403).json({ message: error });

    const signers = await storage.getRonSigners(req.params.id);
    const documents = await storage.getRonDocuments(req.params.id);
    const sessions = await storage.getRonSessions(req.params.id);

    res.json({ ...txn, signers, documents, sessions });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/transactions", requireRole("admin", "attorney", "external_counsel"), async (req: any, res) => {
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

    res.status(201).json(txn);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
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
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.delete("/transactions/:id", async (req: any, res) => {
  try {
    const { txn, error } = await verifyTransactionAccess(req.params.id, req.user.id, req.user.role);
    if (error) return res.status(txn === null && error === "Transaction not found" ? 404 : 403).json({ message: error });

    await storage.deleteRonTransaction(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================================================
// NOTARIES
// ============================================================================

router.get("/notaries", requireRole("admin", "attorney", "external_counsel"), async (req: any, res) => {
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
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/notaries/:id", requireRole("admin", "attorney", "external_counsel"), async (req: any, res) => {
  try {
    const notary = await storage.getRonNotary(req.params.id);
    if (!notary) return res.status(404).json({ message: "Notary not found" });

    const allSessions = await storage.getRonSessionsByNotary(req.params.id);
    const recentSessions = allSessions.slice(0, 20);

    res.json({ ...notary, recentSessions });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/notaries", requireRole("admin"), async (req: any, res) => {
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
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.patch("/notaries/:id", requireRole("admin"), async (req: any, res) => {
  try {
    const updates: any = { ...req.body };
    delete updates.id; delete updates.createdAt;

    if (updates.commissionExpiration) updates.commissionExpiration = new Date(updates.commissionExpiration);
    if (updates.bondExpiration) updates.bondExpiration = new Date(updates.bondExpiration);
    if (updates.eoInsuranceExpiration) updates.eoInsuranceExpiration = new Date(updates.eoInsuranceExpiration);

    const notary = await storage.updateRonNotary(req.params.id, updates);
    if (!notary) return res.status(404).json({ message: "Notary not found" });
    res.json(notary);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.delete("/notaries/:id", requireRole("admin"), async (req: any, res) => {
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
  } catch (error: any) {
    res.status(500).json({ message: error.message });
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
  } catch (error: any) {
    res.status(500).json({ message: error.message });
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
  } catch (error: any) {
    res.status(500).json({ message: error.message });
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
  } catch (error: any) {
    res.status(500).json({ message: error.message });
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
  } catch (error: any) {
    res.status(500).json({ message: error.message });
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
  } catch (error: any) {
    res.status(500).json({ message: error.message });
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
  } catch (error: any) {
    res.status(500).json({ message: error.message });
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
  } catch (error: any) {
    res.status(500).json({ message: error.message });
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
  } catch (error: any) {
    res.status(500).json({ message: error.message });
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

    if (file) {
      const objectStorageService = new ObjectStorageService();
      storageKey = `ron/${req.params.transactionId}/${file.originalname}`;
      await objectStorageService.uploadBuffer(storageKey, file.buffer, file.mimetype);
      originalPdfUrl = storageKey;
      fileSize = file.size;
      mimeType = file.mimetype;
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
  } catch (error: any) {
    res.status(500).json({ message: error.message });
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
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.delete("/documents/:id", async (req: any, res) => {
  try {
    const doc = await storage.getRonDocument(req.params.id);
    if (!doc) return res.status(404).json({ message: "Document not found" });

    const { txn, error } = await verifyTransactionAccess(doc.transactionId, req.user.id, req.user.role);
    if (error) return res.status(403).json({ message: error });

    await storage.deleteRonDocument(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
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
  } catch (error: any) {
    res.status(500).json({ message: error.message });
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
  } catch (error: any) {
    res.status(500).json({ message: error.message });
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
  } catch (error: any) {
    res.status(500).json({ message: error.message });
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
  } catch (error: any) {
    res.status(500).json({ message: error.message });
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
  } catch (error: any) {
    res.status(500).json({ message: error.message });
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
  } catch (error: any) {
    res.status(500).json({ message: error.message });
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
  } catch (error: any) {
    res.status(500).json({ message: error.message });
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
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Start session
router.post("/sessions/:id/start", async (req: any, res) => {
  try {
    const session = await storage.getRonSession(req.params.id);
    if (!session) return res.status(404).json({ message: "Session not found" });

    const { txn, error } = await verifyTransactionAccess(session.transactionId, req.user.id, req.user.role);
    if (error) return res.status(403).json({ message: error });

    const updated = await storage.updateRonSession(req.params.id, {
      status: "in_progress",
      actualStart: new Date(),
      recordingStatus: "recording",
    });

    await storage.updateRonTransaction(session.transactionId, { status: "in_progress" });

    await journalService.createJournalEntry({
      transactionId: session.transactionId,
      sessionId: session.id,
      notaryId: session.notaryId || undefined,
      eventType: "session_started",
      actorType: "user",
      actorId: req.user.id,
      description: "Notarization session started",
      ipAddress: req.ip,
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Complete session
router.post("/sessions/:id/complete", async (req: any, res) => {
  try {
    const session = await storage.getRonSession(req.params.id);
    if (!session) return res.status(404).json({ message: "Session not found" });

    const { txn, error } = await verifyTransactionAccess(session.transactionId, req.user.id, req.user.role);
    if (error) return res.status(403).json({ message: error });

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
  } catch (error: any) {
    res.status(500).json({ message: error.message });
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

    if (body.annotationId) {
      const annotation = await storage.getRonAnnotation(body.annotationId);
      if (!annotation || annotation.documentId !== body.documentId) {
        return res.status(400).json({ message: "Annotation does not belong to this document" });
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
  } catch (error: any) {
    res.status(500).json({ message: error.message });
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

    if (body.sessionId) {
      const session = await storage.getRonSession(body.sessionId);
      if (!session || session.transactionId !== doc.transactionId) {
        return res.status(400).json({ message: "Session does not belong to this transaction" });
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
  } catch (error: any) {
    res.status(500).json({ message: error.message });
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
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/transactions/:transactionId/journal/verify", async (req: any, res) => {
  try {
    const { txn, error } = await verifyTransactionAccess(req.params.transactionId, req.user.id, req.user.role);
    if (error) return res.status(txn === null && error === "Transaction not found" ? 404 : 403).json({ message: error });

    const result = await journalService.verifyJournalChain(req.params.transactionId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================================================
// COMPLIANCE
// ============================================================================

router.get("/compliance/rules", requireRole("admin", "attorney", "external_counsel"), async (req: any, res) => {
  try {
    const { state } = req.query;
    if (state) {
      const rules = complianceService.getComplianceRules(state as string);
      if (!rules) return res.status(404).json({ message: `No rules for state: ${state}` });
      return res.json(rules);
    }
    res.json(complianceService.getAllSupportedStates());
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/transactions/:transactionId/compliance", async (req: any, res) => {
  try {
    const { txn, error } = await verifyTransactionAccess(req.params.transactionId, req.user.id, req.user.role);
    if (error) return res.status(txn === null && error === "Transaction not found" ? 404 : 403).json({ message: error });

    const checks = await complianceService.getComplianceChecks(req.params.transactionId);
    res.json(checks);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
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
  } catch (error: any) {
    res.status(500).json({ message: error.message });
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
  } catch (error: any) {
    res.status(500).json({ message: error.message });
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
  } catch (error: any) {
    res.status(500).json({ message: error.message });
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
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================================================
// DASHBOARD STATS
// ============================================================================

router.get("/dashboard/stats", requireRole("admin", "attorney", "external_counsel"), async (req: any, res) => {
  try {
    const filters: { createdBy?: string } = {};
    if (req.user.role !== "admin") filters.createdBy = req.user.id;

    const allTxns = await storage.getRonTransactions(filters);

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const active = allTxns.filter(t => ["draft", "pending_idv", "ready", "in_progress"].includes(t.status));
    const completedRecently = allTxns.filter(t =>
      t.status === "completed" && t.completedDate && t.completedDate >= thirtyDaysAgo
    );

    const allSessions = await storage.getAllRonSessions();
    const pendingSessions = allSessions.filter(s => s.status === "scheduled");
    const activeNotaries = await storage.getRonNotaries({ status: "active" });

    res.json({
      activeTransactions: active.length,
      completedThisMonth: completedRecently.length,
      pendingSessions: pendingSessions.length,
      totalTransactions: allTxns.length,
      activeNotaries: activeNotaries.length,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export function registerRonRoutes(app: any) {
  app.use("/api/ron", router);
  console.log("[RON] Routes registered");
}
