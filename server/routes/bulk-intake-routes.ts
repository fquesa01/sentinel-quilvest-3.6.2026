import { Router } from "express";
import multer from "multer";
import * as bulkIntakeService from "../services/bulk-intake-service";
import { ObjectStorageService } from "../objectStorage";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });

async function verifySessionOwnership(sessionId: string, userId: string, userRole: string): Promise<{ session: any; error?: string }> {
  const session = await bulkIntakeService.getSession(sessionId);
  if (!session) return { session: null, error: "Session not found" };
  if (userRole !== "admin" && session.uploadedBy !== userId) {
    return { session: null, error: "Access denied" };
  }
  return { session };
}

export function registerBulkIntakeRoutes(app: Router, isAuthenticated: any, requireRole: any) {
  app.post("/api/bulk-intake/sessions", isAuthenticated, requireRole("admin", "attorney", "external_counsel"), async (req: any, res) => {
    try {
      const session = await bulkIntakeService.createSession(req.user.id);
      res.status(201).json(session);
    } catch (error: any) {
      console.error("[BulkIntake] Error creating session:", error.message);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/bulk-intake/sessions/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { session, error } = await verifySessionOwnership(req.params.id, req.user.id, req.user.role);
      if (error) return res.status(error === "Session not found" ? 404 : 403).json({ message: error });
      const documents = await bulkIntakeService.getSessionDocuments(req.params.id);
      res.json({ ...session, documents });
    } catch (error: any) {
      console.error("[BulkIntake] Error fetching session:", error.message);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/bulk-intake/sessions/:id/upload", isAuthenticated, upload.array("files", 200), async (req: any, res) => {
    try {
      const { session, error } = await verifySessionOwnership(req.params.id, req.user.id, req.user.role);
      if (error) return res.status(error === "Session not found" ? 404 : 403).json({ message: error });

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No files provided" });
      }

      const objectStorageService = new ObjectStorageService();
      const uploaded = [];

      for (const file of files) {
        const storagePath = `bulk-intake/${req.params.id}/${file.originalname}`;
        const key = await objectStorageService.uploadBuffer(
          storagePath,
          file.buffer,
          file.mimetype
        );

        const doc = await bulkIntakeService.addDocumentToSession(
          req.params.id,
          file.originalname,
          file.size,
          file.mimetype,
          key
        );
        uploaded.push(doc);
      }

      res.json({ uploaded: uploaded.length, documents: uploaded });
    } catch (error: any) {
      console.error("[BulkIntake] Error uploading files:", error.message);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/bulk-intake/sessions/:id/process", isAuthenticated, async (req: any, res) => {
    try {
      const { session, error } = await verifySessionOwnership(req.params.id, req.user.id, req.user.role);
      if (error) return res.status(error === "Session not found" ? 404 : 403).json({ message: error });

      res.json({ message: "Processing started" });

      bulkIntakeService.startProcessing(req.params.id).catch((err) => {
        console.error("[BulkIntake] Background processing error:", err.message);
      });
    } catch (error: any) {
      console.error("[BulkIntake] Error starting processing:", error.message);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/bulk-intake/sessions/:id/cluster", isAuthenticated, async (req: any, res) => {
    try {
      const { session, error } = await verifySessionOwnership(req.params.id, req.user.id, req.user.role);
      if (error) return res.status(error === "Session not found" ? 404 : 403).json({ message: error });

      const result = await bulkIntakeService.clusterDocuments(req.params.id);
      res.json(result);
    } catch (error: any) {
      console.error("[BulkIntake] Error clustering:", error.message);
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/bulk-intake/sessions/:id/clusters", isAuthenticated, async (req: any, res) => {
    try {
      const { session, error } = await verifySessionOwnership(req.params.id, req.user.id, req.user.role);
      if (error) return res.status(error === "Session not found" ? 404 : 403).json({ message: error });

      if (!req.body || !req.body.clusters || !Array.isArray(req.body.clusters)) {
        return res.status(400).json({ message: "Invalid clustering data: clusters array required" });
      }

      await bulkIntakeService.updateClustering(req.params.id, req.body);
      res.json({ message: "Clustering updated" });
    } catch (error: any) {
      console.error("[BulkIntake] Error updating clusters:", error.message);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/bulk-intake/sessions/:id/confirm", isAuthenticated, requireRole("admin", "attorney", "external_counsel"), async (req: any, res) => {
    try {
      const { session, error } = await verifySessionOwnership(req.params.id, req.user.id, req.user.role);
      if (error) return res.status(error === "Session not found" ? 404 : 403).json({ message: error });

      const createdDeals = await bulkIntakeService.confirmAndCreateDeals(
        req.params.id,
        req.user.id
      );
      res.json({ deals: createdDeals });
    } catch (error: any) {
      console.error("[BulkIntake] Error confirming:", error.message);
      res.status(500).json({ message: error.message });
    }
  });

  console.log("[BulkIntake] Routes registered");
}
