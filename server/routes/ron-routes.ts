import { Router } from "express";
import multer from "multer";
import { db } from "../db";
import { eq, and, desc, asc, sql, inArray, or, ilike } from "drizzle-orm";
import * as schema from "@shared/schema";
import { z } from "zod";
import { isAuthenticated, requireRole } from "../replitAuth";
import * as journalService from "../services/ron-journal-service";
import * as complianceService from "../services/ron-compliance-service";
import { ObjectStorageService } from "../objectStorage";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });

router.use(isAuthenticated);

async function verifyTransactionAccess(transactionId: string, userId: string, userRole: string) {
  const [txn] = await db.select().from(schema.ronTransactions)
    .where(eq(schema.ronTransactions.id, transactionId));
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
    let query = db.select().from(schema.ronTransactions);

    const conditions = [];
    if (req.user.role !== "admin") {
      conditions.push(eq(schema.ronTransactions.createdBy, req.user.id));
    }
    if (status) conditions.push(eq(schema.ronTransactions.status, status as any));
    if (dealId) conditions.push(eq(schema.ronTransactions.dealId, dealId as string));

    const transactions = conditions.length > 0
      ? await query.where(and(...conditions)).orderBy(desc(schema.ronTransactions.createdAt))
      : await query.orderBy(desc(schema.ronTransactions.createdAt));

    res.json(transactions);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/transactions/:id", async (req: any, res) => {
  try {
    const { txn, error } = await verifyTransactionAccess(req.params.id, req.user.id, req.user.role);
    if (error) return res.status(txn === null && error === "Transaction not found" ? 404 : 403).json({ message: error });

    const signers = await db.select().from(schema.ronSigners)
      .where(eq(schema.ronSigners.transactionId, req.params.id));
    const documents = await db.select().from(schema.ronDocuments)
      .where(eq(schema.ronDocuments.transactionId, req.params.id));
    const sessions = await db.select().from(schema.ronSessions)
      .where(eq(schema.ronSessions.transactionId, req.params.id));

    res.json({ ...txn, signers, documents, sessions });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/transactions", requireRole("admin", "attorney", "external_counsel"), async (req: any, res) => {
  try {
    const body = req.body;
    const [txn] = await db.insert(schema.ronTransactions).values({
      title: body.title,
      dealId: body.dealId || null,
      status: body.status || "draft",
      transactionType: body.transactionType,
      jurisdiction: body.jurisdiction,
      signingOrder: body.signingOrder || "parallel",
      signingOrderConfig: body.signingOrderConfig || {},
      scheduledDate: body.scheduledDate ? new Date(body.scheduledDate) : null,
      expirationDate: body.expirationDate ? new Date(body.expirationDate) : null,
      notes: body.notes,
      metadata: body.metadata || {},
      createdBy: req.user.id,
    }).returning();

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

    const updates: any = { ...req.body, updatedAt: new Date() };
    delete updates.id; delete updates.createdAt; delete updates.createdBy;

    const [updated] = await db.update(schema.ronTransactions)
      .set(updates)
      .where(eq(schema.ronTransactions.id, req.params.id))
      .returning();

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.delete("/transactions/:id", async (req: any, res) => {
  try {
    const { txn, error } = await verifyTransactionAccess(req.params.id, req.user.id, req.user.role);
    if (error) return res.status(txn === null && error === "Transaction not found" ? 404 : 403).json({ message: error });

    await db.delete(schema.ronTransactions).where(eq(schema.ronTransactions.id, req.params.id));
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
    const { state, language, status } = req.query;
    const conditions = [];
    if (state) conditions.push(eq(schema.ronNotaries.commissionState, state as string));
    if (status) conditions.push(eq(schema.ronNotaries.status, status as any));

    let notaries;
    if (conditions.length > 0) {
      notaries = await db.select().from(schema.ronNotaries)
        .where(and(...conditions))
        .orderBy(asc(schema.ronNotaries.lastName));
    } else {
      notaries = await db.select().from(schema.ronNotaries)
        .orderBy(asc(schema.ronNotaries.lastName));
    }

    if (language) {
      notaries = notaries.filter((n: any) =>
        n.languages && Array.isArray(n.languages) && n.languages.includes(language as string)
      );
    }

    res.json(notaries);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/notaries/:id", requireRole("admin", "attorney", "external_counsel"), async (req: any, res) => {
  try {
    const [notary] = await db.select().from(schema.ronNotaries)
      .where(eq(schema.ronNotaries.id, req.params.id));
    if (!notary) return res.status(404).json({ message: "Notary not found" });

    const sessions = await db.select().from(schema.ronSessions)
      .where(eq(schema.ronSessions.notaryId, req.params.id))
      .orderBy(desc(schema.ronSessions.createdAt))
      .limit(20);

    res.json({ ...notary, recentSessions: sessions });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/notaries", requireRole("admin"), async (req: any, res) => {
  try {
    const body = req.body;
    const [notary] = await db.insert(schema.ronNotaries).values({
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
    }).returning();

    res.status(201).json(notary);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.patch("/notaries/:id", requireRole("admin"), async (req: any, res) => {
  try {
    const updates: any = { ...req.body, updatedAt: new Date() };
    delete updates.id; delete updates.createdAt;

    if (updates.commissionExpiration) updates.commissionExpiration = new Date(updates.commissionExpiration);
    if (updates.bondExpiration) updates.bondExpiration = new Date(updates.bondExpiration);
    if (updates.eoInsuranceExpiration) updates.eoInsuranceExpiration = new Date(updates.eoInsuranceExpiration);

    const [notary] = await db.update(schema.ronNotaries)
      .set(updates)
      .where(eq(schema.ronNotaries.id, req.params.id))
      .returning();
    if (!notary) return res.status(404).json({ message: "Notary not found" });
    res.json(notary);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.delete("/notaries/:id", requireRole("admin"), async (req: any, res) => {
  try {
    const activeSessions = await db.select().from(schema.ronSessions)
      .where(and(
        eq(schema.ronSessions.notaryId, req.params.id),
        or(
          eq(schema.ronSessions.status, "scheduled" as any),
          eq(schema.ronSessions.status, "in_progress" as any),
        ),
      ));

    if (activeSessions.length > 0) {
      return res.status(400).json({
        message: "Cannot delete notary with active or scheduled sessions",
        activeSessions: activeSessions.length,
      });
    }

    const [notary] = await db.delete(schema.ronNotaries)
      .where(eq(schema.ronNotaries.id, req.params.id))
      .returning();
    if (!notary) return res.status(404).json({ message: "Notary not found" });
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

    const signers = await db.select().from(schema.ronSigners)
      .where(eq(schema.ronSigners.transactionId, req.params.transactionId))
      .orderBy(asc(schema.ronSigners.signingOrder));
    res.json(signers);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/signers/:id", async (req: any, res) => {
  try {
    const [signer] = await db.select().from(schema.ronSigners)
      .where(eq(schema.ronSigners.id, req.params.id));
    if (!signer) return res.status(404).json({ message: "Signer not found" });

    const { txn, error } = await verifyTransactionAccess(signer.transactionId, req.user.id, req.user.role);
    if (error) return res.status(403).json({ message: error });

    const complianceChecks = await db.select().from(schema.ronComplianceChecks)
      .where(eq(schema.ronComplianceChecks.signerId, req.params.id));

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
    const [signer] = await db.insert(schema.ronSigners).values({
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
    }).returning();

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
    const [signer] = await db.select().from(schema.ronSigners)
      .where(eq(schema.ronSigners.id, req.params.id));
    if (!signer) return res.status(404).json({ message: "Signer not found" });

    const { txn, error } = await verifyTransactionAccess(signer.transactionId, req.user.id, req.user.role);
    if (error) return res.status(403).json({ message: error });

    const updates: any = { ...req.body, updatedAt: new Date() };
    delete updates.id; delete updates.createdAt; delete updates.transactionId;

    const [updated] = await db.update(schema.ronSigners)
      .set(updates)
      .where(eq(schema.ronSigners.id, req.params.id))
      .returning();
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.delete("/signers/:id", async (req: any, res) => {
  try {
    const [signer] = await db.select().from(schema.ronSigners)
      .where(eq(schema.ronSigners.id, req.params.id));
    if (!signer) return res.status(404).json({ message: "Signer not found" });

    const { txn, error } = await verifyTransactionAccess(signer.transactionId, req.user.id, req.user.role);
    if (error) return res.status(403).json({ message: error });

    await db.delete(schema.ronSigners).where(eq(schema.ronSigners.id, req.params.id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Signer IDV status update
router.post("/signers/:id/idv", async (req: any, res) => {
  try {
    const [signer] = await db.select().from(schema.ronSigners)
      .where(eq(schema.ronSigners.id, req.params.id));
    if (!signer) return res.status(404).json({ message: "Signer not found" });

    const { txn, error } = await verifyTransactionAccess(signer.transactionId, req.user.id, req.user.role);
    if (error) return res.status(403).json({ message: error });

    const { idvStatus, kbaScore, credentialType, credentialNumber } = req.body;
    const updates: any = { updatedAt: new Date() };
    if (idvStatus) updates.idvStatus = idvStatus;
    if (kbaScore !== undefined) {
      updates.kbaScore = kbaScore;
      updates.kbaAttempts = (signer.kbaAttempts || 0) + 1;
      updates.kbaLastAttempt = new Date();
    }
    if (credentialType) updates.credentialType = credentialType;
    if (credentialNumber) updates.credentialNumber = credentialNumber;

    const [updated] = await db.update(schema.ronSigners)
      .set(updates)
      .where(eq(schema.ronSigners.id, req.params.id))
      .returning();

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

    const documents = await db.select().from(schema.ronDocuments)
      .where(eq(schema.ronDocuments.transactionId, req.params.transactionId))
      .orderBy(asc(schema.ronDocuments.signingOrder));
    res.json(documents);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/documents/:id", async (req: any, res) => {
  try {
    const [doc] = await db.select().from(schema.ronDocuments)
      .where(eq(schema.ronDocuments.id, req.params.id));
    if (!doc) return res.status(404).json({ message: "Document not found" });

    const { txn, error } = await verifyTransactionAccess(doc.transactionId, req.user.id, req.user.role);
    if (error) return res.status(403).json({ message: error });

    const annotations = await db.select().from(schema.ronAnnotationPlacements)
      .where(eq(schema.ronAnnotationPlacements.documentId, req.params.id))
      .orderBy(asc(schema.ronAnnotationPlacements.pageNumber), asc(schema.ronAnnotationPlacements.sortOrder));
    const signatures = await db.select().from(schema.ronSignatures)
      .where(eq(schema.ronSignatures.documentId, req.params.id));
    const seals = await db.select().from(schema.ronSeals)
      .where(eq(schema.ronSeals.documentId, req.params.id));

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
    const [doc] = await db.insert(schema.ronDocuments).values({
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
    }).returning();

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
    const [doc] = await db.select().from(schema.ronDocuments)
      .where(eq(schema.ronDocuments.id, req.params.id));
    if (!doc) return res.status(404).json({ message: "Document not found" });

    const { txn, error } = await verifyTransactionAccess(doc.transactionId, req.user.id, req.user.role);
    if (error) return res.status(403).json({ message: error });

    const updates: any = { ...req.body, updatedAt: new Date() };
    delete updates.id; delete updates.createdAt; delete updates.transactionId;

    const [updated] = await db.update(schema.ronDocuments)
      .set(updates)
      .where(eq(schema.ronDocuments.id, req.params.id))
      .returning();
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.delete("/documents/:id", async (req: any, res) => {
  try {
    const [doc] = await db.select().from(schema.ronDocuments)
      .where(eq(schema.ronDocuments.id, req.params.id));
    if (!doc) return res.status(404).json({ message: "Document not found" });

    const { txn, error } = await verifyTransactionAccess(doc.transactionId, req.user.id, req.user.role);
    if (error) return res.status(403).json({ message: error });

    await db.delete(schema.ronDocuments).where(eq(schema.ronDocuments.id, req.params.id));
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
    const [doc] = await db.select().from(schema.ronDocuments)
      .where(eq(schema.ronDocuments.id, req.params.documentId));
    if (!doc) return res.status(404).json({ message: "Document not found" });

    const { txn, error } = await verifyTransactionAccess(doc.transactionId, req.user.id, req.user.role);
    if (error) return res.status(403).json({ message: error });

    const annotations = await db.select().from(schema.ronAnnotationPlacements)
      .where(eq(schema.ronAnnotationPlacements.documentId, req.params.documentId))
      .orderBy(asc(schema.ronAnnotationPlacements.pageNumber), asc(schema.ronAnnotationPlacements.sortOrder));
    res.json(annotations);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/documents/:documentId/annotations", async (req: any, res) => {
  try {
    const [doc] = await db.select().from(schema.ronDocuments)
      .where(eq(schema.ronDocuments.id, req.params.documentId));
    if (!doc) return res.status(404).json({ message: "Document not found" });

    const { txn, error } = await verifyTransactionAccess(doc.transactionId, req.user.id, req.user.role);
    if (error) return res.status(403).json({ message: error });

    const body = req.body;
    const placements = Array.isArray(body) ? body : [body];

    const inserted = [];
    for (const p of placements) {
      const [annotation] = await db.insert(schema.ronAnnotationPlacements).values({
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
      }).returning();
      inserted.push(annotation);
    }

    if (doc.status === "uploaded") {
      await db.update(schema.ronDocuments)
        .set({ status: "preparing", updatedAt: new Date() })
        .where(eq(schema.ronDocuments.id, req.params.documentId));
    }

    res.status(201).json(inserted);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.delete("/annotations/:id", async (req: any, res) => {
  try {
    const [annotation] = await db.select().from(schema.ronAnnotationPlacements)
      .where(eq(schema.ronAnnotationPlacements.id, req.params.id));
    if (!annotation) return res.status(404).json({ message: "Annotation not found" });

    const [doc] = await db.select().from(schema.ronDocuments)
      .where(eq(schema.ronDocuments.id, annotation.documentId));
    if (!doc) return res.status(404).json({ message: "Document not found" });

    const { txn, error } = await verifyTransactionAccess(doc.transactionId, req.user.id, req.user.role);
    if (error) return res.status(403).json({ message: error });

    await db.delete(schema.ronAnnotationPlacements)
      .where(eq(schema.ronAnnotationPlacements.id, req.params.id));
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

    const sessions = await db.select().from(schema.ronSessions)
      .where(eq(schema.ronSessions.transactionId, req.params.transactionId))
      .orderBy(desc(schema.ronSessions.scheduledStart));
    res.json(sessions);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/sessions/:id", async (req: any, res) => {
  try {
    const [session] = await db.select().from(schema.ronSessions)
      .where(eq(schema.ronSessions.id, req.params.id));
    if (!session) return res.status(404).json({ message: "Session not found" });

    const { txn, error } = await verifyTransactionAccess(session.transactionId, req.user.id, req.user.role);
    if (error) return res.status(403).json({ message: error });

    const signers = await db.select().from(schema.ronSigners)
      .where(eq(schema.ronSigners.sessionId, req.params.id));
    const recordings = await db.select().from(schema.ronRecordings)
      .where(eq(schema.ronRecordings.sessionId, req.params.id));

    let notary = null;
    if (session.notaryId) {
      const [n] = await db.select().from(schema.ronNotaries)
        .where(eq(schema.ronNotaries.id, session.notaryId));
      notary = n || null;
    }

    res.json({ ...session, signers, recordings, notary });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.delete("/sessions/:id", async (req: any, res) => {
  try {
    const [session] = await db.select().from(schema.ronSessions)
      .where(eq(schema.ronSessions.id, req.params.id));
    if (!session) return res.status(404).json({ message: "Session not found" });

    const { txn, error } = await verifyTransactionAccess(session.transactionId, req.user.id, req.user.role);
    if (error) return res.status(403).json({ message: error });

    if (session.status === "in_progress") {
      return res.status(400).json({ message: "Cannot delete an in-progress session" });
    }

    await db.delete(schema.ronSessions).where(eq(schema.ronSessions.id, req.params.id));
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
    const [session] = await db.insert(schema.ronSessions).values({
      transactionId: req.params.transactionId,
      notaryId: body.notaryId,
      status: "scheduled",
      sessionType: body.sessionType || "standard",
      scheduledStart: body.scheduledStart ? new Date(body.scheduledStart) : null,
      scheduledEnd: body.scheduledEnd ? new Date(body.scheduledEnd) : null,
      notes: body.notes,
      metadata: body.metadata || {},
    }).returning();

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
    const [session] = await db.select().from(schema.ronSessions)
      .where(eq(schema.ronSessions.id, req.params.id));
    if (!session) return res.status(404).json({ message: "Session not found" });

    const { txn, error } = await verifyTransactionAccess(session.transactionId, req.user.id, req.user.role);
    if (error) return res.status(403).json({ message: error });

    const updates: any = { ...req.body, updatedAt: new Date() };
    delete updates.id; delete updates.createdAt; delete updates.transactionId;

    if (updates.scheduledStart) updates.scheduledStart = new Date(updates.scheduledStart);
    if (updates.scheduledEnd) updates.scheduledEnd = new Date(updates.scheduledEnd);
    if (updates.actualStart) updates.actualStart = new Date(updates.actualStart);
    if (updates.actualEnd) updates.actualEnd = new Date(updates.actualEnd);

    const [updated] = await db.update(schema.ronSessions)
      .set(updates)
      .where(eq(schema.ronSessions.id, req.params.id))
      .returning();

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
    const [session] = await db.select().from(schema.ronSessions)
      .where(eq(schema.ronSessions.id, req.params.id));
    if (!session) return res.status(404).json({ message: "Session not found" });

    const { txn, error } = await verifyTransactionAccess(session.transactionId, req.user.id, req.user.role);
    if (error) return res.status(403).json({ message: error });

    const [updated] = await db.update(schema.ronSessions)
      .set({
        status: "in_progress",
        actualStart: new Date(),
        recordingStatus: "recording",
        updatedAt: new Date(),
      })
      .where(eq(schema.ronSessions.id, req.params.id))
      .returning();

    await db.update(schema.ronTransactions)
      .set({ status: "in_progress", updatedAt: new Date() })
      .where(eq(schema.ronTransactions.id, session.transactionId));

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
    const [session] = await db.select().from(schema.ronSessions)
      .where(eq(schema.ronSessions.id, req.params.id));
    if (!session) return res.status(404).json({ message: "Session not found" });

    const { txn, error } = await verifyTransactionAccess(session.transactionId, req.user.id, req.user.role);
    if (error) return res.status(403).json({ message: error });

    const now = new Date();
    const duration = session.actualStart
      ? Math.round((now.getTime() - session.actualStart.getTime()) / 1000)
      : 0;

    const [updated] = await db.update(schema.ronSessions)
      .set({
        status: "completed",
        actualEnd: now,
        durationSeconds: duration,
        recordingStatus: "completed",
        updatedAt: now,
      })
      .where(eq(schema.ronSessions.id, req.params.id))
      .returning();

    const activeSessions = await db.select().from(schema.ronSessions)
      .where(and(
        eq(schema.ronSessions.transactionId, session.transactionId),
        eq(schema.ronSessions.status, "in_progress" as any),
      ));

    if (activeSessions.length === 0) {
      await db.update(schema.ronTransactions)
        .set({ status: "completed", completedDate: now, updatedAt: now })
        .where(eq(schema.ronTransactions.id, session.transactionId));
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
      await db.update(schema.ronNotaries)
        .set({
          totalSessions: sql`COALESCE(${schema.ronNotaries.totalSessions}, 0) + 1`,
          updatedAt: now,
        })
        .where(eq(schema.ronNotaries.id, session.notaryId));
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

    const [doc] = await db.select().from(schema.ronDocuments)
      .where(eq(schema.ronDocuments.id, body.documentId));
    if (!doc) return res.status(404).json({ message: "Document not found" });

    const { txn, error } = await verifyTransactionAccess(doc.transactionId, req.user.id, req.user.role);
    if (error) return res.status(403).json({ message: error });

    const [signer] = await db.select().from(schema.ronSigners)
      .where(eq(schema.ronSigners.id, body.signerId));
    if (!signer) return res.status(404).json({ message: "Signer not found" });
    if (signer.transactionId !== doc.transactionId) {
      return res.status(400).json({ message: "Signer does not belong to this transaction" });
    }

    const [signature] = await db.insert(schema.ronSignatures).values({
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
    }).returning();

    if (body.annotationId) {
      await db.update(schema.ronAnnotationPlacements)
        .set({ completed: true, completedAt: new Date() })
        .where(eq(schema.ronAnnotationPlacements.id, body.annotationId));
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

    const allAnnotations = await db.select().from(schema.ronAnnotationPlacements)
      .where(eq(schema.ronAnnotationPlacements.documentId, body.documentId));
    const allCompleted = allAnnotations.every(a => a.completed || !a.required);
    if (allCompleted && allAnnotations.length > 0) {
      await db.update(schema.ronDocuments)
        .set({ status: "fully_signed", updatedAt: new Date() })
        .where(eq(schema.ronDocuments.id, body.documentId));
    } else {
      await db.update(schema.ronDocuments)
        .set({ status: "in_signing", updatedAt: new Date() })
        .where(eq(schema.ronDocuments.id, body.documentId));
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

    const [doc] = await db.select().from(schema.ronDocuments)
      .where(eq(schema.ronDocuments.id, body.documentId));
    if (!doc) return res.status(404).json({ message: "Document not found" });

    const { txn, error } = await verifyTransactionAccess(doc.transactionId, req.user.id, req.user.role);
    if (error) return res.status(403).json({ message: error });

    const [notary] = await db.select().from(schema.ronNotaries)
      .where(eq(schema.ronNotaries.id, body.notaryId));
    if (!notary) return res.status(404).json({ message: "Notary not found" });

    if (notary.status !== "active") {
      return res.status(400).json({ message: "Notary is not active" });
    }

    if (body.sessionId) {
      const [session] = await db.select().from(schema.ronSessions)
        .where(eq(schema.ronSessions.id, body.sessionId));
      if (!session || session.transactionId !== doc.transactionId) {
        return res.status(400).json({ message: "Session does not belong to this transaction" });
      }
    }

    const [seal] = await db.insert(schema.ronSeals).values({
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
    }).returning();

    await db.update(schema.ronDocuments)
      .set({ status: "notarized", updatedAt: new Date() })
      .where(eq(schema.ronDocuments.id, body.documentId));

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

    const validCheckTypes = ["ofac", "aml", "pep", "kba", "credential_analysis", "liveness", "biometric_match", "geolocation", "device_check", "corporate_authority"];
    if (!validCheckTypes.includes(checkType)) {
      return res.status(400).json({ message: `Invalid checkType. Must be one of: ${validCheckTypes.join(", ")}` });
    }

    if (signerId) {
      const [signer] = await db.select().from(schema.ronSigners)
        .where(eq(schema.ronSigners.id, signerId));
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
    const [signer] = await db.select().from(schema.ronSigners)
      .where(eq(schema.ronSigners.id, req.params.signerId));
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
    const [session] = await db.select().from(schema.ronSessions)
      .where(eq(schema.ronSessions.id, req.params.sessionId));
    if (!session) return res.status(404).json({ message: "Session not found" });

    const { txn, error } = await verifyTransactionAccess(session.transactionId, req.user.id, req.user.role);
    if (error) return res.status(403).json({ message: error });

    const recordings = await db.select().from(schema.ronRecordings)
      .where(eq(schema.ronRecordings.sessionId, req.params.sessionId));
    res.json(recordings);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/sessions/:sessionId/recordings", async (req: any, res) => {
  try {
    const [session] = await db.select().from(schema.ronSessions)
      .where(eq(schema.ronSessions.id, req.params.sessionId));
    if (!session) return res.status(404).json({ message: "Session not found" });

    const { txn, error } = await verifyTransactionAccess(session.transactionId, req.user.id, req.user.role);
    if (error) return res.status(403).json({ message: error });

    const retentionYears = 10;
    const retentionExp = new Date();
    retentionExp.setFullYear(retentionExp.getFullYear() + retentionYears);

    const [recording] = await db.insert(schema.ronRecordings).values({
      sessionId: req.params.sessionId,
      status: "recording",
      startedAt: new Date(),
      retentionExpiration: retentionExp,
      format: req.body.format || "webm",
      metadata: req.body.metadata || {},
    }).returning();

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
    const conditions = req.user.role !== "admin"
      ? [eq(schema.ronTransactions.createdBy, req.user.id)]
      : [];

    const allTxns = conditions.length > 0
      ? await db.select().from(schema.ronTransactions).where(and(...conditions))
      : await db.select().from(schema.ronTransactions);

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const active = allTxns.filter(t => ["draft", "pending_idv", "ready", "in_progress"].includes(t.status));
    const completedRecently = allTxns.filter(t =>
      t.status === "completed" && t.completedDate && t.completedDate >= thirtyDaysAgo
    );

    const allSessions = await db.select().from(schema.ronSessions);
    const pendingSessions = allSessions.filter(s => s.status === "scheduled");
    const activeNotaries = await db.select().from(schema.ronNotaries)
      .where(eq(schema.ronNotaries.status, "active" as any));

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
