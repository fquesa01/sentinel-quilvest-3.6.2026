import { Router, Request, Response } from "express";
import { db } from "../db";
import { connectedCalendarAccounts, externalCalendarEvents, oauthNonces } from "@shared/schema";
import { eq, and, lt, isNull, sql } from "drizzle-orm";
import { isAuthenticated } from "../replitAuth";
import crypto from "crypto";

const router = Router();

// Secure state signing for OAuth CSRF protection
// In production, require a proper secret - fallback only for development
const STATE_SECRET = process.env.SESSION_SECRET || process.env.REPL_ID || (
  process.env.NODE_ENV === "production" 
    ? (() => { throw new Error("SESSION_SECRET must be set in production"); })()
    : "calendar-oauth-secret-dev"
);

// Nonce expiry time (15 minutes)
const NONCE_EXPIRY_MS = 15 * 60 * 1000;

// Periodic cleanup of expired nonces from database
setInterval(async () => {
  try {
    await db.delete(oauthNonces).where(lt(oauthNonces.expiresAt, new Date()));
  } catch (error) {
    console.error("Failed to cleanup expired OAuth nonces:", error);
  }
}, 5 * 60 * 1000); // Every 5 minutes

function generateNonce(): string {
  return crypto.randomBytes(32).toString("hex");
}

// Store nonce in database for single-use verification
async function storeNonce(nonce: string, userId: string, provider: string): Promise<void> {
  await db.insert(oauthNonces).values({
    nonce,
    userId,
    provider,
    expiresAt: new Date(Date.now() + NONCE_EXPIRY_MS),
  });
}

// Verify and consume nonce atomically (returns true if valid, unused, and not expired)
// Uses atomic DELETE + RETURNING to prevent race conditions in concurrent callbacks
async function verifyAndConsumeNonce(nonce: string, userId: string, provider: string): Promise<boolean> {
  try {
    // Atomic: DELETE the nonce if it exists, is unused, belongs to this user/provider, and not expired
    // This is a single atomic operation - if two concurrent requests try to use the same nonce,
    // only one will successfully delete it (and get a row returned), the other will get 0 rows
    const result = await db.execute(sql`
      DELETE FROM oauth_nonces 
      WHERE nonce = ${nonce}
        AND user_id = ${userId}
        AND provider = ${provider}
        AND used_at IS NULL
        AND expires_at > NOW()
      RETURNING nonce
    `);
    
    // If we deleted exactly one row, the nonce was valid and we consumed it
    return (result.rows?.length ?? 0) === 1;
  } catch (error) {
    console.error("Error consuming OAuth nonce:", error);
    return false;
  }
}

// Token encryption helpers (basic app-level encryption)
const TOKEN_ENCRYPTION_KEY = crypto.createHash("sha256")
  .update(STATE_SECRET + "-token-encryption")
  .digest();

function encryptToken(token: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", TOKEN_ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

export function decryptToken(encryptedToken: string): string | null {
  try {
    const buffer = Buffer.from(encryptedToken, "base64");
    const iv = buffer.subarray(0, 16);
    const authTag = buffer.subarray(16, 32);
    const encrypted = buffer.subarray(32);
    const decipher = crypto.createDecipheriv("aes-256-gcm", TOKEN_ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);
    return decipher.update(encrypted) + decipher.final("utf8");
  } catch {
    return null;
  }
}

export { encryptToken };

function signState(data: object): { state: string; nonce: string } {
  // Add a unique nonce to make state single-use
  const nonce = generateNonce();
  const dataWithNonce = { ...data, nonce };
  const payload = JSON.stringify(dataWithNonce);
  const hmac = crypto.createHmac("sha256", STATE_SECRET);
  hmac.update(payload);
  const signature = hmac.digest("hex");
  const state = Buffer.from(JSON.stringify({ payload, signature })).toString("base64url");
  return { state, nonce };
}

function verifyStateSignature(state: string): { valid: boolean; data?: any } {
  try {
    const decoded = JSON.parse(Buffer.from(state, "base64url").toString());
    const { payload, signature } = decoded;
    
    const hmac = crypto.createHmac("sha256", STATE_SECRET);
    hmac.update(payload);
    const expectedSignature = hmac.digest("hex");
    
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return { valid: false };
    }
    
    const data = JSON.parse(payload);
    
    // Check expiry (15 minute window)
    if (data.exp && Date.now() > data.exp) {
      return { valid: false };
    }
    
    return { valid: true, data };
  } catch {
    return { valid: false };
  }
}

// Full verification including nonce consumption (async)
async function verifyStateAndConsumeNonce(state: string, userId: string, provider: string): Promise<{ valid: boolean; data?: any }> {
  const signatureResult = verifyStateSignature(state);
  if (!signatureResult.valid) {
    return signatureResult;
  }
  
  const { data } = signatureResult;
  
  // Verify and consume nonce from database
  if (data.nonce) {
    const nonceValid = await verifyAndConsumeNonce(data.nonce, userId, provider);
    if (!nonceValid) {
      console.warn("OAuth state nonce invalid or already used");
      return { valid: false };
    }
  }
  
  return { valid: true, data };
}

// Google Calendar OAuth Configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CALENDAR_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.REPLIT_DEV_DOMAIN 
  ? `https://${process.env.REPLIT_DEV_DOMAIN}/api/calendar/oauth/google/callback`
  : `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}/api/calendar/oauth/google/callback`;

// Microsoft OAuth Configuration
const MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CALENDAR_CLIENT_ID;
const MICROSOFT_CLIENT_SECRET = process.env.MICROSOFT_CALENDAR_CLIENT_SECRET;
const MICROSOFT_REDIRECT_URI = process.env.REPLIT_DEV_DOMAIN 
  ? `https://${process.env.REPLIT_DEV_DOMAIN}/api/calendar/oauth/microsoft/callback`
  : `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}/api/calendar/oauth/microsoft/callback`;

// Google Calendar Scopes
const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

// Microsoft Graph Scopes
const MICROSOFT_SCOPES = [
  "openid",
  "profile",
  "email",
  "offline_access",
  "Calendars.ReadWrite",
].join(" ");

// Get connected calendar accounts for current user
router.get("/api/calendar/connected-accounts", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const accounts = await db.select({
      id: connectedCalendarAccounts.id,
      provider: connectedCalendarAccounts.provider,
      providerEmail: connectedCalendarAccounts.providerEmail,
      syncStatus: connectedCalendarAccounts.syncStatus,
      syncError: connectedCalendarAccounts.syncError,
      lastSyncedAt: connectedCalendarAccounts.lastSyncedAt,
      syncDirection: connectedCalendarAccounts.syncDirection,
      selectedCalendars: connectedCalendarAccounts.selectedCalendars,
      createdAt: connectedCalendarAccounts.createdAt,
    }).from(connectedCalendarAccounts)
      .where(eq(connectedCalendarAccounts.userId, userId));

    res.json(accounts);
  } catch (error) {
    console.error("Error fetching connected accounts:", error);
    res.status(500).json({ error: "Failed to fetch connected accounts" });
  }
});

// ==================== GOOGLE CALENDAR OAUTH ====================

// Initiate Google OAuth flow
router.get("/api/calendar/oauth/google/connect", isAuthenticated, async (req: Request, res: Response) => {
  if (!GOOGLE_CLIENT_ID) {
    return res.status(503).json({ 
      error: "Google Calendar integration not configured",
      message: "Please add GOOGLE_CALENDAR_CLIENT_ID and GOOGLE_CALENDAR_CLIENT_SECRET to your environment variables"
    });
  }

  const userId = (req as any).user?.id;
  if (!userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const { state, nonce } = signState({ 
    userId, 
    provider: "google",
    exp: Date.now() + 15 * 60 * 1000 // 15 minute expiry
  });
  
  // Store nonce in database for single-use verification
  await storeNonce(nonce, userId, "google");
  
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", GOOGLE_REDIRECT_URI);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", GOOGLE_SCOPES);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("state", state);

  res.json({ authUrl: authUrl.toString() });
});

// Google OAuth callback - requires active session to bind state to user
router.get("/api/calendar/oauth/google/callback", isAuthenticated, async (req: Request, res: Response) => {
  const { code, state, error } = req.query;

  if (error) {
    console.error("Google OAuth error:", error);
    return res.redirect("/calendar?error=oauth_denied");
  }

  if (!code || !state || !GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return res.redirect("/calendar?error=oauth_failed");
  }

  // First verify state signature (sync)
  const signatureVerification = verifyStateSignature(state as string);
  if (!signatureVerification.valid) {
    console.error("Invalid OAuth state signature");
    return res.redirect("/calendar?error=invalid_state");
  }

  try {
    const { userId } = signatureVerification.data;
    
    // SECURITY: Verify the authenticated user matches the state's userId
    const authenticatedUser = (req as any).user;
    if (!authenticatedUser || authenticatedUser.id !== userId) {
      console.error("OAuth callback user mismatch - session user:", authenticatedUser?.id, "state user:", userId);
      return res.redirect("/calendar?error=session_mismatch");
    }
    
    // Verify and consume nonce (async, database-backed single-use protection)
    const stateVerification = await verifyStateAndConsumeNonce(state as string, userId, "google");
    if (!stateVerification.valid) {
      console.error("OAuth state nonce invalid or replay detected");
      return res.redirect("/calendar?error=invalid_state");
    }

    // Exchange code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: code as string,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("Token exchange failed:", errorData);
      return res.redirect("/calendar?error=token_exchange_failed");
    }

    const tokens = await tokenResponse.json();

    // Get user info
    const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    const userInfo = await userInfoResponse.json();

    // Check if account already connected
    const existing = await db.select()
      .from(connectedCalendarAccounts)
      .where(and(
        eq(connectedCalendarAccounts.userId, userId),
        eq(connectedCalendarAccounts.provider, "google"),
        eq(connectedCalendarAccounts.providerAccountId, userInfo.id)
      ));

    // Encrypt tokens before storage
    const encryptedAccessToken = encryptToken(tokens.access_token);
    const encryptedRefreshToken = tokens.refresh_token ? encryptToken(tokens.refresh_token) : null;

    if (existing.length > 0) {
      // Update existing connection
      await db.update(connectedCalendarAccounts)
        .set({
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken || existing[0].refreshToken,
          tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
          syncStatus: "active",
          syncError: null,
          updatedAt: new Date(),
        })
        .where(eq(connectedCalendarAccounts.id, existing[0].id));
    } else {
      // Create new connection
      await db.insert(connectedCalendarAccounts).values({
        userId,
        provider: "google",
        providerAccountId: userInfo.id,
        providerEmail: userInfo.email,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        syncStatus: "active",
        syncDirection: "bidirectional",
      });
    }

    res.redirect("/calendar?connected=google");
  } catch (error) {
    console.error("Google OAuth callback error:", error);
    res.redirect("/calendar?error=oauth_callback_failed");
  }
});

// ==================== MICROSOFT CALENDAR OAUTH ====================

// Initiate Microsoft OAuth flow
router.get("/api/calendar/oauth/microsoft/connect", isAuthenticated, async (req: Request, res: Response) => {
  if (!MICROSOFT_CLIENT_ID) {
    return res.status(503).json({ 
      error: "Microsoft Calendar integration not configured",
      message: "Please add MICROSOFT_CALENDAR_CLIENT_ID and MICROSOFT_CALENDAR_CLIENT_SECRET to your environment variables"
    });
  }

  const userId = (req as any).user?.id;
  if (!userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const { state, nonce } = signState({ 
    userId, 
    provider: "microsoft",
    exp: Date.now() + 15 * 60 * 1000 // 15 minute expiry
  });
  
  // Store nonce in database for single-use verification
  await storeNonce(nonce, userId, "microsoft");
  
  const authUrl = new URL("https://login.microsoftonline.com/common/oauth2/v2.0/authorize");
  authUrl.searchParams.set("client_id", MICROSOFT_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", MICROSOFT_REDIRECT_URI);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", MICROSOFT_SCOPES);
  authUrl.searchParams.set("response_mode", "query");
  authUrl.searchParams.set("state", state);

  res.json({ authUrl: authUrl.toString() });
});

// Microsoft OAuth callback - requires active session to bind state to user
router.get("/api/calendar/oauth/microsoft/callback", isAuthenticated, async (req: Request, res: Response) => {
  const { code, state, error } = req.query;

  if (error) {
    console.error("Microsoft OAuth error:", error);
    return res.redirect("/calendar?error=oauth_denied");
  }

  if (!code || !state || !MICROSOFT_CLIENT_ID || !MICROSOFT_CLIENT_SECRET) {
    return res.redirect("/calendar?error=oauth_failed");
  }

  // First verify state signature (sync)
  const signatureVerification = verifyStateSignature(state as string);
  if (!signatureVerification.valid) {
    console.error("Invalid OAuth state signature");
    return res.redirect("/calendar?error=invalid_state");
  }

  try {
    const { userId } = signatureVerification.data;
    
    // SECURITY: Verify the authenticated user matches the state's userId
    const authenticatedUser = (req as any).user;
    if (!authenticatedUser || authenticatedUser.id !== userId) {
      console.error("OAuth callback user mismatch - session user:", authenticatedUser?.id, "state user:", userId);
      return res.redirect("/calendar?error=session_mismatch");
    }
    
    // Verify and consume nonce (async, database-backed single-use protection)
    const stateVerification = await verifyStateAndConsumeNonce(state as string, userId, "microsoft");
    if (!stateVerification.valid) {
      console.error("OAuth state nonce invalid or replay detected");
      return res.redirect("/calendar?error=invalid_state");
    }

    // Exchange code for tokens
    const tokenResponse = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: code as string,
        client_id: MICROSOFT_CLIENT_ID,
        client_secret: MICROSOFT_CLIENT_SECRET,
        redirect_uri: MICROSOFT_REDIRECT_URI,
        grant_type: "authorization_code",
        scope: MICROSOFT_SCOPES,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("Token exchange failed:", errorData);
      return res.redirect("/calendar?error=token_exchange_failed");
    }

    const tokens = await tokenResponse.json();

    // Get user info from Microsoft Graph
    const userInfoResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    const userInfo = await userInfoResponse.json();

    // Check if account already connected
    const existing = await db.select()
      .from(connectedCalendarAccounts)
      .where(and(
        eq(connectedCalendarAccounts.userId, userId),
        eq(connectedCalendarAccounts.provider, "microsoft"),
        eq(connectedCalendarAccounts.providerAccountId, userInfo.id)
      ));

    // Encrypt tokens before storage
    const encryptedAccessToken = encryptToken(tokens.access_token);
    const encryptedRefreshToken = tokens.refresh_token ? encryptToken(tokens.refresh_token) : null;

    if (existing.length > 0) {
      // Update existing connection
      await db.update(connectedCalendarAccounts)
        .set({
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken || existing[0].refreshToken,
          tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
          syncStatus: "active",
          syncError: null,
          updatedAt: new Date(),
        })
        .where(eq(connectedCalendarAccounts.id, existing[0].id));
    } else {
      // Create new connection
      await db.insert(connectedCalendarAccounts).values({
        userId,
        provider: "microsoft",
        providerAccountId: userInfo.id,
        providerEmail: userInfo.mail || userInfo.userPrincipalName,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        syncStatus: "active",
        syncDirection: "bidirectional",
      });
    }

    res.redirect("/calendar?connected=microsoft");
  } catch (error) {
    console.error("Microsoft OAuth callback error:", error);
    res.redirect("/calendar?error=oauth_callback_failed");
  }
});

// ==================== DISCONNECT & SYNC ====================

// Disconnect a calendar account
router.delete("/api/calendar/connected-accounts/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Verify ownership
    const account = await db.select()
      .from(connectedCalendarAccounts)
      .where(and(
        eq(connectedCalendarAccounts.id, id),
        eq(connectedCalendarAccounts.userId, userId)
      ));

    if (account.length === 0) {
      return res.status(404).json({ error: "Account not found" });
    }

    // Delete associated external events first
    await db.delete(externalCalendarEvents)
      .where(eq(externalCalendarEvents.connectedAccountId, id));

    // Delete the account
    await db.delete(connectedCalendarAccounts)
      .where(eq(connectedCalendarAccounts.id, id));

    res.json({ success: true });
  } catch (error) {
    console.error("Error disconnecting account:", error);
    res.status(500).json({ error: "Failed to disconnect account" });
  }
});

// Update sync settings for a connected account
router.patch("/api/calendar/connected-accounts/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    const { syncDirection, syncStatus, selectedCalendars } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Verify ownership
    const account = await db.select()
      .from(connectedCalendarAccounts)
      .where(and(
        eq(connectedCalendarAccounts.id, id),
        eq(connectedCalendarAccounts.userId, userId)
      ));

    if (account.length === 0) {
      return res.status(404).json({ error: "Account not found" });
    }

    const updateData: any = { updatedAt: new Date() };
    if (syncDirection) updateData.syncDirection = syncDirection;
    if (syncStatus) updateData.syncStatus = syncStatus;
    if (selectedCalendars) updateData.selectedCalendars = selectedCalendars;

    await db.update(connectedCalendarAccounts)
      .set(updateData)
      .where(eq(connectedCalendarAccounts.id, id));

    res.json({ success: true });
  } catch (error) {
    console.error("Error updating account:", error);
    res.status(500).json({ error: "Failed to update account" });
  }
});

// Check integration status (for UI to show if APIs are configured)
router.get("/api/calendar/integration-status", isAuthenticated, async (req: Request, res: Response) => {
  res.json({
    google: {
      configured: !!GOOGLE_CLIENT_ID && !!GOOGLE_CLIENT_SECRET,
      clientId: GOOGLE_CLIENT_ID ? "configured" : null,
    },
    microsoft: {
      configured: !!MICROSOFT_CLIENT_ID && !!MICROSOFT_CLIENT_SECRET,
      clientId: MICROSOFT_CLIENT_ID ? "configured" : null,
    },
  });
});

export default router;
