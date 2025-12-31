-- =============================================================================
-- PRODUCTION COMPLETE FIX - All Missing Columns
-- =============================================================================
-- Run this in Neon Production SQL Editor
-- This adds ALL potentially missing columns across key tables
-- =============================================================================

-- =====================
-- CASE_MESSAGES TABLE
-- =====================
ALTER TABLE case_messages ADD COLUMN IF NOT EXISTS case_id VARCHAR;
ALTER TABLE case_messages ADD COLUMN IF NOT EXISTS sender_id VARCHAR;
ALTER TABLE case_messages ADD COLUMN IF NOT EXISTS recipient_ids TEXT[];
ALTER TABLE case_messages ADD COLUMN IF NOT EXISTS read_by TEXT[];
ALTER TABLE case_messages ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE case_messages ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE case_messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;
ALTER TABLE case_messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMP;
ALTER TABLE case_messages ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE case_messages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- =====================
-- NOTIFICATIONS TABLE
-- =====================
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

-- =====================
-- COMMUNICATIONS TABLE - Key columns for email ingestion
-- =====================
ALTER TABLE communications ADD COLUMN IF NOT EXISTS id VARCHAR;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS body TEXT;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS sender TEXT;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS recipients JSONB;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS communication_type VARCHAR;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS source_type VARCHAR;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS timestamp TIMESTAMP;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS source_metadata JSONB;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS case_id VARCHAR;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS email_thread_id VARCHAR;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS custodian_name TEXT;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS custodian_id VARCHAR;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS file_path TEXT;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS file_size INTEGER;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS file_extension VARCHAR;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS mime_type VARCHAR;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS review_status VARCHAR DEFAULT 'not_reviewed';
ALTER TABLE communications ADD COLUMN IF NOT EXISTS privilege_status VARCHAR DEFAULT 'none';
ALTER TABLE communications ADD COLUMN IF NOT EXISTS legal_hold VARCHAR DEFAULT 'none';

-- Fix any NULL array values
UPDATE case_messages SET recipient_ids = ARRAY[]::text[] WHERE recipient_ids IS NULL;
UPDATE case_messages SET read_by = ARRAY[]::text[] WHERE read_by IS NULL;

-- =============================================================================
-- DONE - Refresh sntlabs.io and try uploading emails again
-- =============================================================================
