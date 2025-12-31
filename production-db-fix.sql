-- PRODUCTION DATABASE FIX SCRIPT
-- Run each command ONE AT A TIME in the Neon Production Database SQL Editor
-- Commands that fail with "column already exists" can be safely ignored

-- ============================================
-- SECTION 1: NOTIFICATIONS TABLE
-- ============================================

ALTER TABLE notifications ADD COLUMN user_id VARCHAR(255);
ALTER TABLE notifications ADD COLUMN recipient_user_id VARCHAR(255);
ALTER TABLE notifications ADD COLUMN type VARCHAR(255) DEFAULT 'general';
ALTER TABLE notifications ADD COLUMN title TEXT;
ALTER TABLE notifications ADD COLUMN message TEXT;
ALTER TABLE notifications ADD COLUMN action_url TEXT;
ALTER TABLE notifications ADD COLUMN metadata JSONB;
ALTER TABLE notifications ADD COLUMN is_read BOOLEAN DEFAULT FALSE;
ALTER TABLE notifications ADD COLUMN read_at TIMESTAMP;
ALTER TABLE notifications ADD COLUMN email_sent BOOLEAN DEFAULT FALSE;
ALTER TABLE notifications ADD COLUMN email_sent_at TIMESTAMP;
ALTER TABLE notifications ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- ============================================
-- SECTION 2: COMMUNICATIONS TABLE
-- (Required for email ingestion)
-- ============================================

ALTER TABLE communications ADD COLUMN subject TEXT;
ALTER TABLE communications ADD COLUMN body TEXT;
ALTER TABLE communications ADD COLUMN sender TEXT;
ALTER TABLE communications ADD COLUMN recipients JSONB;
ALTER TABLE communications ADD COLUMN communication_type VARCHAR(255);
ALTER TABLE communications ADD COLUMN source_type VARCHAR(255);
ALTER TABLE communications ADD COLUMN timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE communications ADD COLUMN metadata JSONB;
ALTER TABLE communications ADD COLUMN source_metadata JSONB;
ALTER TABLE communications ADD COLUMN legal_hold VARCHAR(255) DEFAULT 'none';
ALTER TABLE communications ADD COLUMN retention_period INTEGER;
ALTER TABLE communications ADD COLUMN retention_expiry TIMESTAMP;
ALTER TABLE communications ADD COLUMN is_immutable VARCHAR(255) DEFAULT 'false';
ALTER TABLE communications ADD COLUMN email_thread_id VARCHAR(255);
ALTER TABLE communications ADD COLUMN document_family_id VARCHAR(255);
ALTER TABLE communications ADD COLUMN parent_document_id VARCHAR(255);
ALTER TABLE communications ADD COLUMN contains_attachments VARCHAR(255) DEFAULT 'false';
ALTER TABLE communications ADD COLUMN attachment_count INTEGER DEFAULT 0;
ALTER TABLE communications ADD COLUMN attachment_ids JSONB;
ALTER TABLE communications ADD COLUMN document_hash TEXT;
ALTER TABLE communications ADD COLUMN near_duplicate_hash TEXT;
ALTER TABLE communications ADD COLUMN near_duplicate_group_id VARCHAR(255);
ALTER TABLE communications ADD COLUMN is_duplicate VARCHAR(255) DEFAULT 'false';
ALTER TABLE communications ADD COLUMN master_document_id VARCHAR(255);
ALTER TABLE communications ADD COLUMN custodian_id VARCHAR(255);
ALTER TABLE communications ADD COLUMN custodian_name TEXT;
ALTER TABLE communications ADD COLUMN custodian_department VARCHAR(255);
ALTER TABLE communications ADD COLUMN bates_number VARCHAR(255);
ALTER TABLE communications ADD COLUMN bates_range VARCHAR(255);
ALTER TABLE communications ADD COLUMN production_set_id VARCHAR(255);
ALTER TABLE communications ADD COLUMN production_status VARCHAR(255) DEFAULT 'not_produced';
ALTER TABLE communications ADD COLUMN review_status VARCHAR(255) DEFAULT 'not_reviewed';
ALTER TABLE communications ADD COLUMN review_batch_id VARCHAR(255);
ALTER TABLE communications ADD COLUMN reviewed_by VARCHAR(255);
ALTER TABLE communications ADD COLUMN reviewed_at TIMESTAMP;
ALTER TABLE communications ADD COLUMN review_started_at TIMESTAMP;
ALTER TABLE communications ADD COLUMN time_spent_seconds INTEGER DEFAULT 0;
ALTER TABLE communications ADD COLUMN file_size INTEGER;
ALTER TABLE communications ADD COLUMN file_path TEXT;
ALTER TABLE communications ADD COLUMN file_extension VARCHAR(255);
ALTER TABLE communications ADD COLUMN mime_type VARCHAR(255);
ALTER TABLE communications ADD COLUMN language VARCHAR(255);
ALTER TABLE communications ADD COLUMN word_count INTEGER;
ALTER TABLE communications ADD COLUMN original_language VARCHAR(255);
ALTER TABLE communications ADD COLUMN translated_subject TEXT;
ALTER TABLE communications ADD COLUMN translated_body TEXT;
ALTER TABLE communications ADD COLUMN is_translated BOOLEAN DEFAULT FALSE;
ALTER TABLE communications ADD COLUMN privilege_status VARCHAR(255) DEFAULT 'none';
ALTER TABLE communications ADD COLUMN privilege_basis VARCHAR(255);
ALTER TABLE communications ADD COLUMN privilege_asserted_by VARCHAR(255);
ALTER TABLE communications ADD COLUMN privilege_asserted_at TIMESTAMP;
ALTER TABLE communications ADD COLUMN privilege_review_status VARCHAR(255) DEFAULT 'pending';
ALTER TABLE communications ADD COLUMN privilege_reviewed_by VARCHAR(255);
ALTER TABLE communications ADD COLUMN privilege_reviewed_at TIMESTAMP;
ALTER TABLE communications ADD COLUMN privilege_notes TEXT;
ALTER TABLE communications ADD COLUMN is_redacted VARCHAR(255) DEFAULT 'false';
ALTER TABLE communications ADD COLUMN redaction_log JSONB;
ALTER TABLE communications ADD COLUMN privilege_stamp TEXT;
ALTER TABLE communications ADD COLUMN compliance_score INTEGER;
ALTER TABLE communications ADD COLUMN risk_level VARCHAR(255);
ALTER TABLE communications ADD COLUMN ai_compliance_analysis TEXT;
ALTER TABLE communications ADD COLUMN analyzed_at TIMESTAMP;
ALTER TABLE communications ADD COLUMN case_id VARCHAR(255);
ALTER TABLE communications ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- ============================================
-- SECTION 3: CASE_MESSAGES TABLE
-- ============================================

ALTER TABLE case_messages ADD COLUMN case_id VARCHAR(255);
ALTER TABLE case_messages ADD COLUMN sender_id VARCHAR(255);
ALTER TABLE case_messages ADD COLUMN recipient_user_id VARCHAR(255);
ALTER TABLE case_messages ADD COLUMN recipient_ids JSONB;
ALTER TABLE case_messages ADD COLUMN content TEXT;
ALTER TABLE case_messages ADD COLUMN subject TEXT;
ALTER TABLE case_messages ADD COLUMN message_type VARCHAR(255) DEFAULT 'general';
ALTER TABLE case_messages ADD COLUMN is_read VARCHAR(10) DEFAULT 'false';
ALTER TABLE case_messages ADD COLUMN read_at TIMESTAMP;
ALTER TABLE case_messages ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- ============================================
-- SECTION 4: USERS TABLE (if needed)
-- ============================================

ALTER TABLE users ADD COLUMN microsoft_id VARCHAR(255);
ALTER TABLE users ADD COLUMN role VARCHAR(255) DEFAULT 'compliance_officer';

-- ============================================
-- SECTION 5: DETECTION_RULES TABLE
-- ============================================

ALTER TABLE detection_rules ADD COLUMN is_custom VARCHAR(10) DEFAULT 'false';

-- ============================================
-- SECTION 6: ALERTS TABLE
-- ============================================

ALTER TABLE alerts ADD COLUMN communication_id VARCHAR(255);
ALTER TABLE alerts ADD COLUMN severity VARCHAR(255);
ALTER TABLE alerts ADD COLUMN violation_type VARCHAR(255);
ALTER TABLE alerts ADD COLUMN detection_types VARCHAR(255)[];
ALTER TABLE alerts ADD COLUMN flagged_keywords JSONB;
ALTER TABLE alerts ADD COLUMN ai_analysis TEXT;
ALTER TABLE alerts ADD COLUMN risk_score INTEGER;
ALTER TABLE alerts ADD COLUMN confidence_score INTEGER;
ALTER TABLE alerts ADD COLUMN is_teaching_moment VARCHAR(255) DEFAULT 'false';
ALTER TABLE alerts ADD COLUMN rule_matches JSONB;
ALTER TABLE alerts ADD COLUMN status VARCHAR(255) DEFAULT 'pending';
ALTER TABLE alerts ADD COLUMN reviewed_by VARCHAR(255);
ALTER TABLE alerts ADD COLUMN reviewed_at TIMESTAMP;
ALTER TABLE alerts ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- ============================================
-- END OF SCRIPT
-- ============================================
-- After running all commands, test email upload again on sntlabs.io
