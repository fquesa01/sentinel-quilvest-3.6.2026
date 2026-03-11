import { db } from "../server/db";
import { sql } from "drizzle-orm";

const ENUMS: Record<string, string[]> = {
  chat_source_type: ["whatsapp", "sms_ios", "sms_android", "imessage", "telegram", "signal", "other_chat"],
};

const ENUM_VALUES_TO_ADD: Record<string, string[]> = {
  deal_type: [
    "residential_financed", "residential_cash", "refinance", "heloc",
    "reverse_mortgage", "new_construction", "short_sale", "foreclosure_reo",
    "estate_probate", "commercial_financed", "commercial_cash", "commercial_refinance",
    "cmbs", "construction_loan", "ground_lease", "exchange_1031",
    "portfolio_bulk", "sale_leaseback", "distressed_asset", "co_op",
    "mixed_use", "opportunity_zone", "loan_assumption", "deed_in_lieu",
    "capital_stack", "reit_contribution", "condo_subdivision", "leasehold_financing",
  ],
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

  for (const [enumName, values] of Object.entries(ENUM_VALUES_TO_ADD)) {
    const typeCheck = await db.execute(
      sql`SELECT 1 FROM pg_type WHERE typname = ${enumName}`
    );
    const typeRows = (typeCheck as any).rows || typeCheck;
    if (!typeRows || typeRows.length === 0) {
      console.log(`Enum ${enumName} does not exist yet, skipping value additions`);
      continue;
    }
    for (const val of values) {
      const existing = await db.execute(
        sql`SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = ${enumName}) AND enumlabel = ${val}`
      );
      const existingRows = (existing as any).rows || existing;
      if (!existingRows || existingRows.length === 0) {
        await db.execute(sql.raw(`ALTER TYPE ${enumName} ADD VALUE IF NOT EXISTS '${val}'`));
        console.log(`Added value '${val}' to enum ${enumName}`);
      }
    }
  }

  process.exit(0);
}

ensureEnums().catch((e) => {
  console.error("Error ensuring enums:", e.message);
  process.exit(1);
});
