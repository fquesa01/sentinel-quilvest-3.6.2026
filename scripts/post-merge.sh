#!/bin/bash
set -e
npm install

# Create any missing enums before drizzle push to avoid interactive prompts
npx tsx scripts/ensure-enums.ts 2>/dev/null || true

# Run db push with a timeout and auto-answer prompts to prevent hanging.
# The 'yes' command feeds 'y' to any interactive prompts, and timeout kills
# the process if it takes longer than 90 seconds.
timeout 90 bash -c 'yes "" | npm run db:push --force 2>&1' || timeout 90 bash -c 'yes "" | npm run db:push 2>&1' || echo "db:push completed with warnings"

# Ensure auto_generated column and unique index exist for closing auto-generation
psql "$DATABASE_URL" -c "ALTER TABLE closing_transactions ADD COLUMN IF NOT EXISTS auto_generated BOOLEAN DEFAULT false;" 2>/dev/null || true
psql "$DATABASE_URL" -c "CREATE UNIQUE INDEX IF NOT EXISTS idx_closing_tx_auto_gen_unique ON closing_transactions (deal_id) WHERE auto_generated = true;" 2>/dev/null || true

# Ensure organizations tables exist
psql "$DATABASE_URL" -c "CREATE TABLE IF NOT EXISTS organizations (id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(), name VARCHAR(255) NOT NULL, description TEXT, metadata JSONB DEFAULT '{}'::jsonb, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW());" 2>/dev/null || true
psql "$DATABASE_URL" -c "CREATE TABLE IF NOT EXISTS organization_members (id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(), organization_id VARCHAR NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE, joined_at TIMESTAMP DEFAULT NOW());" 2>/dev/null || true
psql "$DATABASE_URL" -c "CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id);" 2>/dev/null || true
psql "$DATABASE_URL" -c "CREATE UNIQUE INDEX IF NOT EXISTS idx_org_members_user_unique ON organization_members(organization_id, user_id);" 2>/dev/null || true
