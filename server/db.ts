import { Pool, PoolConfig } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";
import dns from 'dns';

dns.setDefaultResultOrder('ipv4first');

const rawConnectionString = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;

if (!rawConnectionString) {
  throw new Error(
    "SUPABASE_DATABASE_URL or DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const isSupabase = !!process.env.SUPABASE_DATABASE_URL;

function parseConnectionConfig(connStr: string): PoolConfig {
  try {
    const parsed = new URL(connStr);
    return {
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      host: parsed.hostname,
      port: parsed.port ? parseInt(parsed.port, 10) : 5432,
      database: parsed.pathname.replace(/^\//, ''),
    };
  } catch {
    const match = connStr.match(/^postgresql?:\/\/([^:]+):(.+)@([^@/]+)\/(.+)$/);
    if (!match) {
      throw new Error("Unable to parse database connection string");
    }
    const [, user, password, hostPort, dbPart] = match;
    const [host, portStr] = hostPort.split(':');
    return {
      user,
      password,
      host,
      port: portStr ? parseInt(portStr, 10) : 5432,
      database: dbPart.split('?')[0],
    };
  }
}

const poolConfig = parseConnectionConfig(rawConnectionString);

function getSslConfig(): PoolConfig['ssl'] {
  const envOverride = process.env.DB_SSL_REJECT_UNAUTHORIZED;
  if (envOverride !== undefined) {
    return { rejectUnauthorized: envOverride === 'true' };
  }
  if (isSupabase) {
    return { rejectUnauthorized: false };
  }
  return { rejectUnauthorized: false };
}

poolConfig.ssl = getSslConfig();

export const pool = new Pool(poolConfig);
export const db = drizzle({ client: pool, schema });

console.log(`[DB] Connected via ${isSupabase ? 'Supabase' : 'Replit'} PostgreSQL`);
