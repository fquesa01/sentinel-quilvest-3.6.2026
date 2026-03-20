import type { Express, Request, Response } from "express";
import { isAuthenticated, requireRole } from "../replitAuth";
import { storage } from "../storage";
import { generateApiKey } from "../middleware/api-key-auth";
import { createApiKeyRequestSchema } from "@shared/schema";

export function registerApiKeyRoutes(app: Express) {
  app.post("/api/api-keys", isAuthenticated, requireRole("super_admin"), async (req: Request, res: Response) => {
    try {
      const parsed = createApiKeyRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request.", details: parsed.error.flatten() });
      }

      const { displayName, scopes, rateLimitPerMinute, expiresAt } = parsed.data;
      const userId = (req as any).dbUser?.id;
      if (!userId) return res.status(401).json({ error: "User not found." });

      const { rawKey, keyHash, keyPrefix } = generateApiKey();

      const apiKey = await storage.createApiKey({
        displayName,
        keyHash,
        keyPrefix,
        userId,
        scopes,
        rateLimitPerMinute: rateLimitPerMinute ?? 60,
        isActive: true,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      });

      res.status(201).json({
        data: {
          ...apiKey,
          keyHash: undefined,
          rawKey,
        },
        message: "API key created. Save the raw key now - it will not be shown again.",
      });
    } catch (error) {
      console.error("[API Keys] Error creating key:", error);
      res.status(500).json({ error: "Failed to create API key." });
    }
  });

  app.get("/api/api-keys", isAuthenticated, requireRole("super_admin"), async (req: Request, res: Response) => {
    try {
      const keys = await storage.getAllApiKeys();
      const masked = keys.map(k => ({
        ...k,
        keyHash: undefined,
      }));
      res.json({ data: masked });
    } catch (error) {
      console.error("[API Keys] Error listing keys:", error);
      res.status(500).json({ error: "Failed to list API keys." });
    }
  });

  app.get("/api/api-keys/:id", isAuthenticated, requireRole("super_admin"), async (req: Request, res: Response) => {
    try {
      const key = await storage.getApiKey(req.params.id);
      if (!key) return res.status(404).json({ error: "API key not found." });
      res.json({ data: { ...key, keyHash: undefined } });
    } catch (error) {
      console.error("[API Keys] Error getting key:", error);
      res.status(500).json({ error: "Failed to get API key." });
    }
  });

  app.post("/api/api-keys/:id/revoke", isAuthenticated, requireRole("super_admin"), async (req: Request, res: Response) => {
    try {
      const key = await storage.getApiKey(req.params.id);
      if (!key) return res.status(404).json({ error: "API key not found." });
      if (!key.isActive) return res.status(400).json({ error: "API key is already revoked." });

      const revoked = await storage.revokeApiKey(req.params.id);
      res.json({ data: { ...revoked, keyHash: undefined }, message: "API key revoked." });
    } catch (error) {
      console.error("[API Keys] Error revoking key:", error);
      res.status(500).json({ error: "Failed to revoke API key." });
    }
  });

  app.get("/api/api-keys/:id/audit-logs", isAuthenticated, requireRole("super_admin"), async (req: Request, res: Response) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
      const offset = (page - 1) * limit;

      const [logs, total] = await Promise.all([
        storage.getApiKeyAuditLogs({ apiKeyId: req.params.id, limit, offset }),
        storage.getApiKeyAuditLogCount(req.params.id),
      ]);

      res.json({
        data: logs,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      console.error("[API Keys] Error getting audit logs:", error);
      res.status(500).json({ error: "Failed to get audit logs." });
    }
  });

  app.get("/api/api-key-audit-logs", isAuthenticated, requireRole("super_admin"), async (req: Request, res: Response) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
      const offset = (page - 1) * limit;

      const [logs, total] = await Promise.all([
        storage.getApiKeyAuditLogs({ limit, offset }),
        storage.getApiKeyAuditLogCount(),
      ]);

      res.json({
        data: logs,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      console.error("[API Keys] Error getting all audit logs:", error);
      res.status(500).json({ error: "Failed to get audit logs." });
    }
  });
}
