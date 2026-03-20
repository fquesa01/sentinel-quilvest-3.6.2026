import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { processPendingOCROnStartup } from "./services/ocr-service";
import { processPendingGeminiIndexing } from "./services/transaction-search-service";
import { seedEquityDDTemplate, seedDebtDDTemplate, seedRealEstateTemplate } from "./scripts/seed-deal-templates";
import { seedAllREClosingTemplates } from "./scripts/seed-re-closing-templates";
import { pool } from "./db";
import { initBuckets } from "./supabaseStorage";

const app = express();

process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught exception:', err.message, err.stack);
});
process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Unhandled rejection:', reason);
});

app.use((req, _res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS' && req.path.startsWith('/api/')) {
    console.log(`[HTTP] ${req.method} ${req.path} content-type=${req.headers['content-type'] || 'none'} content-length=${req.headers['content-length'] || 'none'}`);
  }
  next();
});

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS organizations (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS organization_members (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id VARCHAR NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        joined_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id)`);
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_org_members_user_unique ON organization_members(user_id)`);
    await pool.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'unique_org_member'
        ) THEN
          ALTER TABLE organization_members ADD CONSTRAINT unique_org_member UNIQUE (organization_id, user_id);
        END IF;
      END $$
    `);

    await pool.query(`ALTER TABLE firm_form_templates ADD COLUMN IF NOT EXISTS file_data bytea`);
    await pool.query(`ALTER TABLE firm_form_templates ADD COLUMN IF NOT EXISTS storage_key varchar(1000)`);
    await pool.query(`ALTER TABLE firm_form_templates ADD COLUMN IF NOT EXISTS notes text`);
    await pool.query(`ALTER TABLE closing_documents ADD COLUMN IF NOT EXISTS notes text`);
    await pool.query(`ALTER TABLE generated_documents ADD COLUMN IF NOT EXISTS notes text`);
    await pool.query(`ALTER TABLE pe_firm_settings ADD COLUMN IF NOT EXISTS pipeline_stages jsonb DEFAULT '[]'::jsonb`);
    await pool.query(`ALTER TABLE pe_deals ADD COLUMN IF NOT EXISTS custom_stage varchar(100)`);
    await pool.query(`ALTER TABLE connected_calendar_accounts ADD COLUMN IF NOT EXISTS token_source varchar(30) DEFAULT 'oauth'`);
    await pool.query(`ALTER TABLE email_accounts ADD COLUMN IF NOT EXISTS token_source varchar(30) DEFAULT 'oauth'`);
    await pool.query(`ALTER TABLE closing_documents ADD COLUMN IF NOT EXISTS signature_image text`);
    await pool.query(`ALTER TABLE closing_documents ADD COLUMN IF NOT EXISTS signed_at timestamp`);
    await pool.query(`ALTER TABLE closing_documents ADD COLUMN IF NOT EXISTS signed_by varchar(500)`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id varchar UNIQUE`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS microsoft_id varchar UNIQUE`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash varchar`);

    // Ensure user_type enum and column exist
    try {
      await pool.query(`CREATE TYPE user_type AS ENUM ('individual', 'corporate')`);
    } catch (e: any) {
      // Type already exists — safe to ignore
    }
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS user_type user_type NOT NULL DEFAULT 'individual'`);

    // Migrate old role enum values to new 4-role model
    // Phase 1: Add new enum values using a dedicated client connection.
    // PostgreSQL forbids using a newly added enum value in the same transaction,
    // so we must commit the ADD VALUE statements and release the client before
    // any statements that reference the new values.
    const enumClient = await pool.connect();
    try {
      for (const val of ['super_admin', 'entity_admin', 'entity_user', 'individual_user']) {
        await enumClient.query(`ALTER TYPE user_role ADD VALUE IF NOT EXISTS '${val}'`);
      }
    } finally {
      enumClient.release();
    }

    // Phase 2: Now safe to reference the new enum values from a fresh connection.
    const oldAdminCheck = await pool.query(`SELECT 1 FROM pg_enum WHERE enumlabel = 'admin' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role') LIMIT 1`);
    if (oldAdminCheck.rows.length > 0) {
      await pool.query(`UPDATE users SET role = 'super_admin' WHERE role = 'admin'`);
      await pool.query(`UPDATE users SET role = 'individual_user' WHERE role NOT IN ('super_admin', 'entity_admin', 'entity_user', 'individual_user')`);
    }
    await pool.query(`ALTER TABLE users ALTER COLUMN role SET DEFAULT 'individual_user'`);

    // RON Notary Document & Invitation enums
    await pool.query(`
      DO $$ BEGIN
        CREATE TYPE ron_notary_doc_type AS ENUM ('commission_cert', 'bond_cert', 'eo_insurance_cert', 'training_cert', 'background_check', 'seal_image', 'signature_image', 'other');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);
    await pool.query(`
      DO $$ BEGIN
        CREATE TYPE ron_notary_doc_verification AS ENUM ('pending', 'verified', 'rejected');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);
    await pool.query(`
      DO $$ BEGIN
        CREATE TYPE ron_notary_invitation_status AS ENUM ('pending', 'submitted', 'expired', 'cancelled');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    // RON Notary Documents table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ron_notary_documents (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        notary_id VARCHAR NOT NULL REFERENCES ron_notaries(id) ON DELETE CASCADE,
        document_type ron_notary_doc_type NOT NULL,
        file_url VARCHAR(1000) NOT NULL,
        file_name VARCHAR(500),
        file_size INTEGER,
        mime_type VARCHAR(200),
        verification_status ron_notary_doc_verification NOT NULL DEFAULT 'pending',
        verified_by VARCHAR REFERENCES users(id),
        verified_at TIMESTAMP,
        rejection_reason TEXT,
        uploaded_at TIMESTAMP NOT NULL DEFAULT NOW(),
        metadata JSONB DEFAULT '{}'
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_ron_notary_docs_notary ON ron_notary_documents(notary_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_ron_notary_docs_type ON ron_notary_documents(document_type)`);

    // RON Notary Invitations table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ron_notary_invitations (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(300) NOT NULL,
        token VARCHAR(200) NOT NULL UNIQUE,
        status ron_notary_invitation_status NOT NULL DEFAULT 'pending',
        expires_at TIMESTAMP NOT NULL,
        notary_id VARCHAR REFERENCES ron_notaries(id),
        invited_by VARCHAR REFERENCES users(id),
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_ron_notary_invitations_token ON ron_notary_invitations(token)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_ron_notary_invitations_email ON ron_notary_invitations(email)`);

    console.log("[Startup] Database columns and role migration verified");
  } catch (err) {
    console.error("[Startup] Migration check error:", err);
  }

  try {
    await initBuckets();
    console.log("[Startup] Supabase Storage buckets initialized");
  } catch (err) {
    console.error("[Startup] Supabase Storage bucket init error:", err);
  }

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error("[Express] Unhandled error:", err);
    res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    // Auto-seed deal templates if they don't exist
    (async () => {
      try {
        await seedEquityDDTemplate();
        await seedDebtDDTemplate();
        await seedRealEstateTemplate();
        await seedAllREClosingTemplates();
        console.log("[Startup] Deal templates seeded/verified");
      } catch (err) {
        console.error("[Startup] Error seeding deal templates:", err);
      }
    })();
    // Process pending OCR documents on startup
    processPendingOCROnStartup();
    // Process pending Gemini indexing for RAG search (after 15s delay to let OCR start first)
    setTimeout(() => {
      processPendingGeminiIndexing().catch((err) => {
        console.error("[Startup] Error processing pending Gemini indexing:", err);
      });
    }, 15000);
  });
})();
