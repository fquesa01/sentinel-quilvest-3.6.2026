-- =============================================================================
-- PRODUCTION FINAL FIX - Complete the remaining statements
-- =============================================================================
-- This completes the migration after the microsoft_id constraint error
-- Run this in Neon Production SQL Editor
-- =============================================================================

-- Skip the microsoft_id unique constraint (caused the error due to duplicates)
-- If you want to add it later, first clean up duplicate values

-- =====================
-- COMMUNICATIONS TABLE - Continue from where we left off
-- =====================
ALTER TABLE communications ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS body TEXT;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS sender TEXT;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS recipients JSONB;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS communication_type VARCHAR;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS source_type VARCHAR;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS source_metadata JSONB;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS legal_hold VARCHAR DEFAULT 'none';
ALTER TABLE communications ADD COLUMN IF NOT EXISTS retention_period INTEGER;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS retention_expiry TIMESTAMP;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS is_immutable VARCHAR DEFAULT 'false';
ALTER TABLE communications ADD COLUMN IF NOT EXISTS email_thread_id VARCHAR;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS document_family_id VARCHAR;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS parent_document_id VARCHAR;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS contains_attachments VARCHAR DEFAULT 'false';
ALTER TABLE communications ADD COLUMN IF NOT EXISTS attachment_count INTEGER DEFAULT 0;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS attachment_ids JSONB;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS document_hash TEXT;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS near_duplicate_hash TEXT;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS near_duplicate_group_id VARCHAR;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS is_duplicate VARCHAR DEFAULT 'false';
ALTER TABLE communications ADD COLUMN IF NOT EXISTS master_document_id VARCHAR;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS custodian_id VARCHAR;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS custodian_name TEXT;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS custodian_department VARCHAR;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS bates_number VARCHAR;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS bates_range VARCHAR;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS production_set_id VARCHAR;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS production_status VARCHAR DEFAULT 'not_produced';
ALTER TABLE communications ADD COLUMN IF NOT EXISTS review_status VARCHAR DEFAULT 'not_reviewed';
ALTER TABLE communications ADD COLUMN IF NOT EXISTS review_batch_id VARCHAR;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS reviewed_by VARCHAR;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS review_started_at TIMESTAMP;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS time_spent_seconds INTEGER DEFAULT 0;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS file_size INTEGER;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS file_path TEXT;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS file_extension VARCHAR;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS mime_type VARCHAR;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS language VARCHAR;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS word_count INTEGER;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS original_language VARCHAR;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS translated_subject TEXT;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS translated_body TEXT;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS is_translated BOOLEAN DEFAULT FALSE;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS privilege_status VARCHAR DEFAULT 'none';
ALTER TABLE communications ADD COLUMN IF NOT EXISTS privilege_basis VARCHAR;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS privilege_asserted_by VARCHAR;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS privilege_asserted_at TIMESTAMP;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS privilege_review_status VARCHAR DEFAULT 'pending';
ALTER TABLE communications ADD COLUMN IF NOT EXISTS privilege_reviewed_by VARCHAR;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS privilege_reviewed_at TIMESTAMP;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS privilege_notes TEXT;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS is_redacted VARCHAR DEFAULT 'false';
ALTER TABLE communications ADD COLUMN IF NOT EXISTS redaction_log JSONB;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS privilege_stamp TEXT;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS compliance_score INTEGER;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS risk_level VARCHAR;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS ai_compliance_analysis TEXT;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS analyzed_at TIMESTAMP;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS case_id VARCHAR;
ALTER TABLE communications ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- =====================
-- CASES TABLE
-- =====================
ALTER TABLE cases ADD COLUMN IF NOT EXISTS case_number VARCHAR;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS alert_id VARCHAR;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'alert';
ALTER TABLE cases ADD COLUMN IF NOT EXISTS violation_type VARCHAR;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS assigned_to VARCHAR;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS created_by VARCHAR;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS priority VARCHAR DEFAULT 'medium';
ALTER TABLE cases ADD COLUMN IF NOT EXISTS employee_name TEXT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS employee_position TEXT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS resolution_notes TEXT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS attorney_review_required VARCHAR DEFAULT 'false';
ALTER TABLE cases ADD COLUMN IF NOT EXISTS attorney_review_status VARCHAR DEFAULT 'pending';
ALTER TABLE cases ADD COLUMN IF NOT EXISTS reviewed_by_attorney VARCHAR;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS attorney_review_notes TEXT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS attorney_review_decision VARCHAR;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS attorney_reviewed_at TIMESTAMP;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS escalated_to VARCHAR;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS escalation_reason TEXT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMP;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS is_counsel_directed VARCHAR DEFAULT 'true';
ALTER TABLE cases ADD COLUMN IF NOT EXISTS privilege_status VARCHAR DEFAULT 'attorney_client_privileged';
ALTER TABLE cases ADD COLUMN IF NOT EXISTS privilege_basis VARCHAR DEFAULT 'counsel_directed_investigation';
ALTER TABLE cases ADD COLUMN IF NOT EXISTS privilege_asserted_by VARCHAR;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS privilege_asserted_at TIMESTAMP;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS privilege_review_status VARCHAR DEFAULT 'pending';
ALTER TABLE cases ADD COLUMN IF NOT EXISTS privilege_reviewed_by VARCHAR;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS privilege_reviewed_at TIMESTAMP;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS privilege_notes TEXT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS is_redacted VARCHAR DEFAULT 'false';
ALTER TABLE cases ADD COLUMN IF NOT EXISTS redaction_log JSONB;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS privilege_stamp TEXT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS risk_score INTEGER;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS risk_level VARCHAR;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS ai_analysis_summary TEXT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS closed_by VARCHAR;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS archived_by VARCHAR;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS reopen_reason TEXT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS reopened_at TIMESTAMP;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS reopened_by VARCHAR;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- =====================
-- ALERTS TABLE
-- =====================
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS communication_id VARCHAR;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS severity VARCHAR;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS violation_type VARCHAR;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS detection_types VARCHAR[];
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS flagged_keywords JSONB;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS ai_analysis TEXT;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS risk_score INTEGER;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS confidence_score INTEGER;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS is_teaching_moment VARCHAR DEFAULT 'false';
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS rule_matches JSONB;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'pending';
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS reviewed_by VARCHAR;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- =====================
-- CASE_MESSAGES TABLE
-- =====================
ALTER TABLE case_messages ADD COLUMN IF NOT EXISTS case_id VARCHAR;
ALTER TABLE case_messages ADD COLUMN IF NOT EXISTS sender_id VARCHAR;
ALTER TABLE case_messages ADD COLUMN IF NOT EXISTS recipient_user_id VARCHAR;
ALTER TABLE case_messages ADD COLUMN IF NOT EXISTS recipient_ids JSONB;
ALTER TABLE case_messages ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE case_messages ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE case_messages ADD COLUMN IF NOT EXISTS message_type VARCHAR DEFAULT 'general';
ALTER TABLE case_messages ADD COLUMN IF NOT EXISTS is_read VARCHAR DEFAULT 'false';
ALTER TABLE case_messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMP;
ALTER TABLE case_messages ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- =====================
-- DETECTION_RULES TABLE
-- =====================
ALTER TABLE detection_rules ADD COLUMN IF NOT EXISTS is_custom VARCHAR DEFAULT 'false';

-- =============================================================================
-- DONE - Test the app now on sntlabs.io
-- =============================================================================
