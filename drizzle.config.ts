import { defineConfig } from "drizzle-kit";

const rawUrl = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;

if (!rawUrl) {
  throw new Error("SUPABASE_DATABASE_URL or DATABASE_URL must be set");
}

function buildSafeUrl(connStr: string): string {
  const match = connStr.match(/^(postgresql?):\/\/([^:]+):(.+)@([^/]+)\/(.+)$/);
  if (match) {
    const [, scheme, user, password, hostPort, database] = match;
    return `${scheme}://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${hostPort}/${database}`;
  }
  return connStr;
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: buildSafeUrl(rawUrl),
    ssl: process.env.SUPABASE_DATABASE_URL ? "require" : undefined,
  },
});
