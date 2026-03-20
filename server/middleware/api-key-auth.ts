import type { RequestHandler, Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { storage } from "../storage";
import type { ApiKey } from "@shared/schema";

function hashApiKey(rawKey: string): string {
  return crypto.createHash("sha256").update(rawKey).digest("hex");
}

function extractApiKey(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  const xApiKey = req.headers["x-api-key"];
  if (typeof xApiKey === "string") {
    return xApiKey;
  }
  return null;
}

const rateLimitWindows = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(apiKeyId: string, limit: number): boolean {
  const now = Date.now();
  const window = rateLimitWindows.get(apiKeyId);
  if (!window || now >= window.resetAt) {
    rateLimitWindows.set(apiKeyId, { count: 1, resetAt: now + 60000 });
    return true;
  }
  if (window.count >= limit) {
    return false;
  }
  window.count++;
  return true;
}

export const authenticateApiKey: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
  const rawKey = extractApiKey(req);
  if (!rawKey) {
    return res.status(401).json({ error: "Missing API key. Provide via Authorization: Bearer <key> or X-API-Key header." });
  }

  try {
    const keyHash = hashApiKey(rawKey);
    const apiKey = await storage.getApiKeyByHash(keyHash);

    if (!apiKey) {
      return res.status(401).json({ error: "Invalid API key." });
    }

    if (!apiKey.isActive) {
      return res.status(401).json({ error: "API key has been revoked." });
    }

    if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
      return res.status(401).json({ error: "API key has expired." });
    }

    const rateLimit = apiKey.rateLimitPerMinute ?? 60;
    if (!checkRateLimit(apiKey.id, rateLimit)) {
      return res.status(429).json({
        error: "Rate limit exceeded.",
        retryAfter: 60,
        limit: rateLimit,
      });
    }

    const user = await storage.getUser(apiKey.userId);
    if (!user) {
      return res.status(401).json({ error: "API key owner not found." });
    }

    (req as any).apiKey = apiKey;
    (req as any).apiKeyUser = user;
    (req as any).dbUser = user;

    storage.updateApiKeyLastUsed(apiKey.id).catch(() => {});

    const statusCode = res.statusCode;
    res.on("finish", () => {
      storage.createApiKeyAuditLog({
        apiKeyId: apiKey.id,
        userId: apiKey.userId,
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        ipAddress: (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || null,
        userAgent: req.headers["user-agent"] || null,
      }).catch(() => {});
    });

    next();
  } catch (error) {
    console.error("[API Key Auth] Error:", error);
    return res.status(500).json({ error: "Authentication error." });
  }
};

export function requireScopes(...requiredScopes: string[]): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const apiKey = (req as any).apiKey as ApiKey | undefined;
    if (!apiKey) {
      return res.status(401).json({ error: "API key authentication required." });
    }

    const hasAllScopes = requiredScopes.every(scope => apiKey.scopes.includes(scope));
    if (!hasAllScopes) {
      return res.status(403).json({
        error: "Insufficient permissions.",
        required: requiredScopes,
        granted: apiKey.scopes,
      });
    }

    next();
  };
}

export function generateApiKey(): { rawKey: string; keyHash: string; keyPrefix: string } {
  const rawKey = `clk_${crypto.randomBytes(32).toString("hex")}`;
  const keyHash = hashApiKey(rawKey);
  const keyPrefix = rawKey.slice(0, 10) + "...";
  return { rawKey, keyHash, keyPrefix };
}
