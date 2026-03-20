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

function parseConnectionConfig(connStr: string, supabase: boolean): PoolConfig {
  const sslConfig = supabase ? { rejectUnauthorized: false } : { rejectUnauthorized: false };

  const match = connStr.match(/^(postgresql?):\/\/([^:]+):(.+)@([^/]+)\/(.+)$/);
  if (match) {
    const [, , user, password, hostPort, database] = match;
    const [host, portStr] = hostPort.split(':');
    return {
      user,
      password,
      host,
      port: portStr ? parseInt(portStr, 10) : 5432,
      database: database.split('?')[0],
      ssl: sslConfig,
    };
  }

  return { connectionString: connStr, ssl: sslConfig };
}

const poolConfig = parseConnectionConfig(rawConnectionString, isSupabase);
export const pool = new Pool(poolConfig);
export const db = drizzle({ client: pool, schema });

console.log(`[DB] Connected via ${isSupabase ? 'Supabase' : 'Replit'} PostgreSQL`);
