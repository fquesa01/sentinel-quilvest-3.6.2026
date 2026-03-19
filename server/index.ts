import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { processPendingOCROnStartup } from "./services/ocr-service";
import { processPendingGeminiIndexing } from "./services/transaction-search-service";
import { seedEquityDDTemplate, seedDebtDDTemplate, seedRealEstateTemplate } from "./scripts/seed-deal-templates";
import { seedAllREClosingTemplates } from "./scripts/seed-re-closing-templates";
import { pool } from "./db";

const app = express();

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
    await pool.query(`ALTER TABLE firm_form_templates ADD COLUMN IF NOT EXISTS file_data bytea`);
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

    // Migrate old role enum values to new 4-role model
    // First, add new enum values if they don't exist
    const addEnumValue = async (val: string) => {
      try {
        await pool.query(`ALTER TYPE user_role ADD VALUE IF NOT EXISTS '${val}'`);
      } catch (e: any) {
        // Value already exists — safe to ignore
      }
    };
    await addEnumValue('super_admin');
    await addEnumValue('entity_admin');
    await addEnumValue('entity_user');
    await addEnumValue('individual_user');

    // Migrate existing users from old roles to new roles
    await pool.query(`UPDATE users SET role = 'super_admin' WHERE role = 'admin'`);
    await pool.query(`UPDATE users SET role = 'individual_user' WHERE role NOT IN ('super_admin', 'entity_admin', 'entity_user', 'individual_user')`);

    // Update the column default
    await pool.query(`ALTER TABLE users ALTER COLUMN role SET DEFAULT 'individual_user'`);

    console.log("[Startup] Database columns and role migration verified");
  } catch (err) {
    console.error("[Startup] Migration check error:", err);
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
