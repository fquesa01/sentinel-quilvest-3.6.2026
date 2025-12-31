-- =============================================================================
-- PRODUCTION - CREATE MISSING TABLES
-- =============================================================================
-- Run this in Neon Production SQL Editor
-- =============================================================================

-- Create case_messages table if it doesn't exist
CREATE TABLE IF NOT EXISTS case_messages (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  case_id VARCHAR,
  sender_id VARCHAR,
  recipient_ids TEXT[] DEFAULT ARRAY[]::text[],
  read_by TEXT[] DEFAULT ARRAY[]::text[],
  subject TEXT,
  content TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS case_messages_case_idx ON case_messages(case_id);
CREATE INDEX IF NOT EXISTS case_messages_sender_idx ON case_messages(sender_id);

-- Add any missing columns to notifications (in case table exists but columns don't)
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_url TEXT;

-- =============================================================================
-- DONE - Refresh sntlabs.io and try uploading emails again
-- =============================================================================
