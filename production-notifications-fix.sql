-- =============================================================================
-- PRODUCTION NOTIFICATIONS TABLE FIX
-- =============================================================================
-- Run this in Neon Production SQL Editor to add missing columns to notifications
-- =============================================================================

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_url TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS recipient_user_id VARCHAR;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS user_id VARCHAR;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS type VARCHAR DEFAULT 'general';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMP;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT FALSE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMP;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Fix any NULL array values in case_messages
UPDATE case_messages SET recipient_ids = ARRAY[]::text[] WHERE recipient_ids IS NULL;
UPDATE case_messages SET read_by = ARRAY[]::text[] WHERE read_by IS NULL;

-- =============================================================================
-- DONE - Refresh sntlabs.io after running this
-- =============================================================================
