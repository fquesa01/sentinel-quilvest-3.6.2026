import { db } from "../server/db";
import { sql } from "drizzle-orm";

const ENUMS: Record<string, string[]> = {
  chat_source_type: ["whatsapp", "sms_ios", "sms_android", "imessage", "telegram", "signal", "other_chat"],
};

async function ensureEnums() {
  for (const [name, values] of Object.entries(ENUMS)) {
    const result = await db.execute(
      sql`SELECT 1 FROM pg_type WHERE typname = ${name}`
    );
    const rows = (result as any).rows || result;
    if (!rows || rows.length === 0) {
      const valuesStr = values.map(v => `'${v}'`).join(", ");
      await db.execute(sql.raw(`CREATE TYPE ${name} AS ENUM (${valuesStr})`));
      console.log(`Created enum: ${name}`);
    }
  }
  process.exit(0);
}

ensureEnums().catch((e) => {
  console.error("Error ensuring enums:", e.message);
  process.exit(1);
});
