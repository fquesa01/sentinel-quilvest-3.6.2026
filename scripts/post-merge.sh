#!/bin/bash
set -e
npm install

# Create any missing enums before server startup to avoid interactive prompts
npx tsx scripts/ensure-enums.ts 2>/dev/null || true

# Ensure auto_generated column and unique index exist for closing auto-generation
psql "$DATABASE_URL" -c "ALTER TABLE closing_transactions ADD COLUMN IF NOT EXISTS auto_generated BOOLEAN DEFAULT false;" 2>/dev/null || true
psql "$DATABASE_URL" -c "CREATE UNIQUE INDEX IF NOT EXISTS idx_closing_tx_auto_gen_unique ON closing_transactions (deal_id) WHERE auto_generated = true;" 2>/dev/null || true

# Ensure organizations tables exist
psql "$DATABASE_URL" -c "CREATE TABLE IF NOT EXISTS organizations (id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(), name VARCHAR(255) NOT NULL, description TEXT, metadata JSONB DEFAULT '{}'::jsonb, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW());" 2>/dev/null || true
psql "$DATABASE_URL" -c "CREATE TABLE IF NOT EXISTS organization_members (id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(), organization_id VARCHAR NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE, joined_at TIMESTAMP DEFAULT NOW());" 2>/dev/null || true
psql "$DATABASE_URL" -c "CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id);" 2>/dev/null || true
psql "$DATABASE_URL" -c "CREATE UNIQUE INDEX IF NOT EXISTS idx_org_members_user_unique ON organization_members(organization_id, user_id);" 2>/dev/null || true

# Ensure ambient_session_id column exists on deal_meeting_notes for linking ambient sessions
psql "$DATABASE_URL" -c "ALTER TABLE deal_meeting_notes ADD COLUMN IF NOT EXISTS ambient_session_id VARCHAR;" 2>/dev/null || true
psql "$DATABASE_URL" -c "CREATE INDEX IF NOT EXISTS idx_deal_meeting_notes_ambient_session ON deal_meeting_notes(ambient_session_id);" 2>/dev/null || true
psql "$DATABASE_URL" -c "CREATE UNIQUE INDEX IF NOT EXISTS idx_deal_meeting_notes_ambient_session_unique ON deal_meeting_notes(ambient_session_id) WHERE ambient_session_id IS NOT NULL;" 2>/dev/null || true
