#!/bin/bash
set -e
npm install

DB_URL="${SUPABASE_DATABASE_URL:-$DATABASE_URL}"

# Create any missing enums before server startup to avoid interactive prompts
npx tsx scripts/ensure-enums.ts 2>/dev/null || true

# Ensure auto_generated column and unique index exist for closing auto-generation
psql "$DB_URL" -c "ALTER TABLE closing_transactions ADD COLUMN IF NOT EXISTS auto_generated BOOLEAN DEFAULT false;" 2>/dev/null || true
psql "$DB_URL" -c "CREATE UNIQUE INDEX IF NOT EXISTS idx_closing_tx_auto_gen_unique ON closing_transactions (deal_id) WHERE auto_generated = true;" 2>/dev/null || true

# Ensure organizations tables exist
psql "$DB_URL" -c "CREATE TABLE IF NOT EXISTS organizations (id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(), name VARCHAR(255) NOT NULL, description TEXT, metadata JSONB DEFAULT '{}'::jsonb, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW());" 2>/dev/null || true
psql "$DB_URL" -c "CREATE TABLE IF NOT EXISTS organization_members (id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(), organization_id VARCHAR NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE, joined_at TIMESTAMP DEFAULT NOW());" 2>/dev/null || true
psql "$DB_URL" -c "CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id);" 2>/dev/null || true
psql "$DB_URL" -c "CREATE UNIQUE INDEX IF NOT EXISTS idx_org_members_user_unique ON organization_members(organization_id, user_id);" 2>/dev/null || true

# Ensure ambient_session_id column exists on deal_meeting_notes for linking ambient sessions
psql "$DB_URL" -c "ALTER TABLE deal_meeting_notes ADD COLUMN IF NOT EXISTS ambient_session_id VARCHAR;" 2>/dev/null || true
psql "$DB_URL" -c "CREATE INDEX IF NOT EXISTS idx_deal_meeting_notes_ambient_session ON deal_meeting_notes(ambient_session_id);" 2>/dev/null || true
psql "$DB_URL" -c "CREATE UNIQUE INDEX IF NOT EXISTS idx_deal_meeting_notes_ambient_session_unique ON deal_meeting_notes(ambient_session_id) WHERE ambient_session_id IS NOT NULL;" 2>/dev/null || true

# Add data_lake_auto to contact_source_type enum for auto-sync from Data Lake
psql "$DB_URL" -c "ALTER TYPE contact_source_type ADD VALUE IF NOT EXISTS 'data_lake_auto';" 2>/dev/null || true

# Add storage_key column for Supabase Storage migration
psql "$DB_URL" -c "ALTER TABLE firm_form_templates ADD COLUMN IF NOT EXISTS storage_key varchar(1000);" 2>/dev/null || true

# Create deal_zoning_analyses table for Zoning Analysis feature
psql "$DB_URL" -c "CREATE TABLE IF NOT EXISTS deal_zoning_analyses (id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(), deal_id VARCHAR NOT NULL REFERENCES deals(id) ON DELETE CASCADE, property_address TEXT, jurisdiction JSONB, property_classification VARCHAR(50), zoning_district VARCHAR(255), future_designation VARCHAR(255), analysis_content JSONB, document_summaries JSONB, generated_at TIMESTAMP DEFAULT NOW() NOT NULL, updated_at TIMESTAMP DEFAULT NOW() NOT NULL);" 2>/dev/null || true
psql "$DB_URL" -c "CREATE UNIQUE INDEX IF NOT EXISTS idx_deal_zoning_analyses_deal_unique ON deal_zoning_analyses(deal_id);" 2>/dev/null || true

# Add search_source and person_mentioned columns for Intelligence Feed filtering
psql "$DB_URL" -c "ALTER TABLE news_alerts ADD COLUMN IF NOT EXISTS search_source varchar(20) DEFAULT 'news';" 2>/dev/null || true
psql "$DB_URL" -c "ALTER TABLE news_alerts ADD COLUMN IF NOT EXISTS person_mentioned boolean DEFAULT false;" 2>/dev/null || true
