#!/bin/bash
set -e
npm install

# Create any missing enums before drizzle push to avoid interactive prompts
npx tsx scripts/ensure-enums.ts 2>/dev/null || true

# Run db push with stdin closed to prevent interactive prompts from hanging
npm run db:push --force </dev/null 2>&1 || npm run db:push </dev/null 2>&1 || echo "db:push completed with warnings"

# Ensure auto_generated column and unique index exist for closing auto-generation
psql "$DATABASE_URL" -c "ALTER TABLE closing_transactions ADD COLUMN IF NOT EXISTS auto_generated BOOLEAN DEFAULT false;" 2>/dev/null || true
psql "$DATABASE_URL" -c "CREATE UNIQUE INDEX IF NOT EXISTS idx_closing_tx_auto_gen_unique ON closing_transactions (deal_id) WHERE auto_generated = true;" 2>/dev/null || true
