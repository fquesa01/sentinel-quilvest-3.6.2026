import { createClient } from "@supabase/supabase-js";
import type { Express, RequestHandler } from "express";
import { storage } from "./storage";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

let supabaseAdmin: ReturnType<typeof createClient> | null = null;

function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
    }
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  }
  return supabaseAdmin;
}

// Automatically assign admin role to designated testing admin emails
const testingAdminEmails = [
  "frank.quesada@gmail.com",
  "binhaks@binhaklaw.com",
  "zoinertejada@gmail.com",
  "charliewhorton@gmail.com",
  "rjb@borgheselaw.com",
];

export function getSession() {
  // No-op: sessions are managed by Supabase client-side
  return (_req: any, _res: any, next: any) => next();
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);

  // Login redirect - client handles auth via Supabase
  app.get("/api/login", (_req, res) => {
    res.redirect("/login");
  });

  // Logout - client handles signout via Supabase
  app.get("/api/logout", (_req, res) => {
    res.redirect("/");
  });

  // Callback route - no longer needed but kept to avoid 404
  app.get("/api/callback", (_req, res) => {
    res.redirect("/");
  });

  console.log("[Auth] Supabase auth configured");
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.slice(7);

  try {
    const admin = getSupabaseAdmin();
    const {
      data: { user: supabaseUser },
      error,
    } = await admin.auth.getUser(token);

    if (error || !supabaseUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Build user data for upsert
    const userData: any = {
      id: supabaseUser.id,
      email: supabaseUser.email,
      firstName:
        supabaseUser.user_metadata?.first_name ||
        supabaseUser.user_metadata?.full_name?.split(" ")[0] ||
        null,
      lastName:
        supabaseUser.user_metadata?.last_name ||
        supabaseUser.user_metadata?.full_name?.split(" ").slice(1).join(" ") ||
        null,
      profileImageUrl: supabaseUser.user_metadata?.avatar_url || null,
    };

    // Auto-assign admin role for designated emails
    if (testingAdminEmails.includes(supabaseUser.email || "")) {
      userData.role = "admin";
    }

    const dbUser = await storage.upsertUser(userData);

    // Attach user to request (matching existing interface)
    (req as any).user = {
      ...dbUser,
      claims: { sub: dbUser.id, email: dbUser.email },
      access_token: token,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    };
    (req as any).dbUser = dbUser;

    return next();
  } catch (error) {
    console.error("[Auth] Token verification error:", error);
    return res.status(401).json({ message: "Unauthorized" });
  }
};

// Role-based authorization middleware
export function requireRole(...roles: string[]): RequestHandler {
  return async (req, res, next) => {
    const dbUser = (req as any).dbUser;

    if (!dbUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!roles.includes(dbUser.role)) {
      return res
        .status(403)
        .json({ message: "Forbidden: Insufficient permissions" });
    }

    next();
  };
}
