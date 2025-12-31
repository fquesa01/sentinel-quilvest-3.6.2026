-- =============================================================================
-- SENTINEL COUNSEL LLP - COMPLETE PRODUCTION DATABASE MIGRATION
-- =============================================================================
-- Run this script in the Neon Production Database SQL Editor
-- Uses DO blocks with exception handling for idempotent operations
-- 
-- IMPORTANT: Run in ONE complete transaction. If any errors occur,
-- you may need to run individual sections.
-- =============================================================================

-- =============================================================================
-- SECTION 1: ENUM TYPES
-- =============================================================================
-- Creating all enum types using DO blocks for idempotent creation

DO $$ BEGIN CREATE TYPE user_role AS ENUM ('admin', 'compliance_officer', 'attorney', 'auditor', 'employee', 'vendor', 'external_counsel'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE alert_severity AS ENUM ('critical', 'high', 'medium', 'low', 'informational'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE case_status AS ENUM ('alert', 'investigation', 'review', 'resolution', 'closed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE violation_type AS ENUM (
  'fcpa', 'banking', 'antitrust', 'sec', 'sox', 'cta', 'finra', 'reg_bi', 'custody_rule', 'fda',
  'off_label_promotion', 'clinical_trial', 'anti_kickback', 'itar', 'export_control', 'ear',
  'gdpr', 'ccpa', 'privacy', 'florida_specific', 'discrimination', 'harassment', 'retaliation',
  'wage_hour', 'health_safety', 'workplace_bullying', 'theft_fraud', 'policy_violation',
  'whistleblower', 'accommodation', 'insider_trading', 'aml', 'bsa', 'insider_threat',
  'market_manipulation', 'off_channel', 'data_breach', 'conflict_of_interest', 'general_compliance', 'other'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE industry_sector AS ENUM (
  'general', 'broker_dealer', 'investment_advisor', 'life_sciences', 'pharmaceutical',
  'medical_device', 'defense_contractor', 'aerospace', 'technology', 'financial_services'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE policy_category AS ENUM (
  'code_of_conduct', 'harassment', 'discrimination', 'data_privacy', 'security',
  'ethics', 'safety', 'hr', 'conflicts_of_interest', 'workplace_respect', 'diversity_inclusion'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE interview_type AS ENUM ('fact_finding', 'investigative', 'training', 'exit'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE interview_invite_status AS ENUM ('draft', 'sent', 'opened', 'in_progress', 'completed', 'expired', 'cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE interview_delivery_channel AS ENUM ('email', 'sms', 'both'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE communication_source AS ENUM (
  'email_m365', 'email_google', 'chat_slack', 'chat_teams', 'chat_zoom', 'chat_meet',
  'sms_mobile', 'file_share_drive', 'file_share_sharepoint', 'file_share_box', 'web_history',
  'social_linkedin', 'social_instagram', 'social_facebook', 'social_twitter', 'social_tiktok',
  'social_youtube', 'social_reddit', 'social_snapchat', 'social_whatsapp', 'social_telegram',
  'social_other', 'manual_entry', 'other'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE privilege_status AS ENUM ('none', 'attorney_client_privileged', 'work_product', 'both'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE privilege_basis AS ENUM (
  'upjohn_warning', 'in_re_kbr', 'attorney_work_product', 'attorney_client_communication',
  'counsel_directed_investigation', 'other'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE detection_type AS ENUM (
  'off_channel_steering', 'fcpa_foreign_official', 'fcpa_third_party_risk', 'fcpa_payment_intent',
  'antitrust_price_fixing', 'antitrust_market_allocation', 'aml_suspicious_transaction',
  'reg_sp_privacy_violation', 'teaching_moment', 'other_violation'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE tag_category AS ENUM ('investigation_type', 'classification', 'priority', 'evidence_type', 'custom'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE document_index_status AS ENUM ('pending', 'indexing', 'indexed', 'failed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE notification_type AS ENUM ('annotation_mention', 'case_assignment', 'document_review_request', 'alert_escalation', 'system'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE chat_source_type AS ENUM ('whatsapp', 'sms_ios', 'sms_android', 'imessage', 'telegram', 'signal', 'other_chat'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE chat_message_direction AS ENUM ('inbound', 'outbound', 'unknown'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE tag_color AS ENUM (
  'slate', 'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal',
  'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE expert_type AS ENUM (
  'forensic_consultant', 'accounting_expert', 'industry_specialist', 'technical_consultant',
  'valuation_expert', 'economic_expert', 'scientific_expert', 'other'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE regulator_body AS ENUM ('doj', 'sec', 'ftc', 'cftc', 'finra', 'fda', 'epa', 'osha', 'irs', 'state_ag', 'other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE deadline_type AS ENUM (
  'subpoena_response', 'cid_deadline', 'production_deadline', 'interview_deadline',
  'court_filing', 'extension_request', 'regulatory_meeting', 'other'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE preservation_system AS ENUM (
  'email_m365', 'email_google', 'chat_slack', 'chat_teams', 'file_share_sharepoint',
  'file_share_drive', 'mobile_devices', 'social_media', 'financial_systems', 'crm_erp',
  'cctv', 'access_logs', 'other'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE conflict_type AS ENUM (
  'government_agency', 'target_subject', 'adverse_party', 'other_parties', 'current_client', 'former_client'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE ingestion_job_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'partially_completed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE ingestion_file_status AS ENUM ('queued', 'processing', 'completed', 'failed', 'skipped'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE file_type AS ENUM ('pst', 'eml', 'msg', 'pdf', 'docx', 'doc', 'txt', 'xlsx', 'csv', 'zip', 'other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE timeline_risk_level AS ENUM ('critical', 'medium', 'cleared', 'neutral'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =============================================================================
-- SECTION 2: CORE TABLES (No Foreign Key Dependencies)
-- =============================================================================

-- Sessions table (Replit Auth)
CREATE TABLE IF NOT EXISTS sessions (
  sid VARCHAR PRIMARY KEY,
  sess JSONB NOT NULL,
  expire TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON sessions(expire);

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  email VARCHAR UNIQUE,
  first_name VARCHAR,
  last_name VARCHAR,
  profile_image_url VARCHAR,
  microsoft_id VARCHAR UNIQUE,
  role user_role DEFAULT 'compliance_officer' NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- =============================================================================
-- SECTION 3: TABLES WITH USER REFERENCES
-- =============================================================================

-- Cases table
CREATE TABLE IF NOT EXISTS cases (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  case_number VARCHAR UNIQUE NOT NULL,
  alert_id VARCHAR,
  title TEXT NOT NULL,
  description TEXT,
  status case_status DEFAULT 'alert' NOT NULL,
  violation_type violation_type NOT NULL,
  assigned_to VARCHAR REFERENCES users(id),
  created_by VARCHAR NOT NULL REFERENCES users(id),
  priority VARCHAR DEFAULT 'medium' NOT NULL,
  employee_name TEXT,
  employee_position TEXT,
  resolution_notes TEXT,
  attorney_review_required VARCHAR DEFAULT 'false' NOT NULL,
  attorney_review_status VARCHAR DEFAULT 'pending' NOT NULL,
  reviewed_by_attorney VARCHAR REFERENCES users(id),
  attorney_review_notes TEXT,
  attorney_review_decision VARCHAR,
  attorney_reviewed_at TIMESTAMP,
  escalated_to VARCHAR REFERENCES users(id),
  escalation_reason TEXT,
  escalated_at TIMESTAMP,
  is_counsel_directed VARCHAR DEFAULT 'true' NOT NULL,
  privilege_status privilege_status DEFAULT 'attorney_client_privileged' NOT NULL,
  privilege_basis privilege_basis DEFAULT 'counsel_directed_investigation' NOT NULL,
  privilege_asserted_by VARCHAR REFERENCES users(id),
  privilege_asserted_at TIMESTAMP,
  privilege_review_status VARCHAR DEFAULT 'pending' NOT NULL,
  privilege_reviewed_by VARCHAR REFERENCES users(id),
  privilege_reviewed_at TIMESTAMP,
  privilege_notes TEXT,
  is_redacted VARCHAR DEFAULT 'false' NOT NULL,
  redaction_log JSONB,
  privilege_stamp TEXT,
  risk_score INTEGER,
  risk_level VARCHAR,
  ai_analysis_summary TEXT,
  closed_at TIMESTAMP,
  closed_by VARCHAR REFERENCES users(id),
  archived_at TIMESTAMP,
  archived_by VARCHAR REFERENCES users(id),
  reopen_reason TEXT,
  reopened_at TIMESTAMP,
  reopened_by VARCHAR REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Communications table
CREATE TABLE IF NOT EXISTS communications (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  sender TEXT NOT NULL,
  recipients JSONB NOT NULL,
  communication_type VARCHAR NOT NULL,
  source_type communication_source,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  metadata JSONB,
  source_metadata JSONB,
  legal_hold VARCHAR DEFAULT 'none' NOT NULL,
  retention_period INTEGER,
  retention_expiry TIMESTAMP,
  is_immutable VARCHAR DEFAULT 'false' NOT NULL,
  email_thread_id VARCHAR,
  document_family_id VARCHAR,
  parent_document_id VARCHAR,
  contains_attachments VARCHAR DEFAULT 'false' NOT NULL,
  attachment_count INTEGER DEFAULT 0 NOT NULL,
  attachment_ids JSONB,
  document_hash TEXT,
  near_duplicate_hash TEXT,
  near_duplicate_group_id VARCHAR,
  is_duplicate VARCHAR DEFAULT 'false' NOT NULL,
  master_document_id VARCHAR,
  custodian_id VARCHAR,
  custodian_name TEXT,
  custodian_department VARCHAR,
  bates_number VARCHAR,
  bates_range VARCHAR,
  production_set_id VARCHAR,
  production_status VARCHAR DEFAULT 'not_produced' NOT NULL,
  review_status VARCHAR DEFAULT 'not_reviewed' NOT NULL,
  review_batch_id VARCHAR,
  reviewed_by VARCHAR REFERENCES users(id),
  reviewed_at TIMESTAMP,
  review_started_at TIMESTAMP,
  time_spent_seconds INTEGER DEFAULT 0 NOT NULL,
  file_size INTEGER,
  file_path TEXT,
  file_extension VARCHAR,
  mime_type VARCHAR,
  language VARCHAR,
  word_count INTEGER,
  original_language VARCHAR,
  translated_subject TEXT,
  translated_body TEXT,
  is_translated BOOLEAN DEFAULT FALSE NOT NULL,
  privilege_status privilege_status DEFAULT 'none' NOT NULL,
  privilege_basis privilege_basis,
  privilege_asserted_by VARCHAR REFERENCES users(id),
  privilege_asserted_at TIMESTAMP,
  privilege_review_status VARCHAR DEFAULT 'pending' NOT NULL,
  privilege_reviewed_by VARCHAR REFERENCES users(id),
  privilege_reviewed_at TIMESTAMP,
  privilege_notes TEXT,
  is_redacted VARCHAR DEFAULT 'false' NOT NULL,
  redaction_log JSONB,
  privilege_stamp TEXT,
  compliance_score INTEGER,
  risk_level VARCHAR,
  ai_compliance_analysis TEXT,
  analyzed_at TIMESTAMP,
  case_id VARCHAR REFERENCES cases(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Alerts table
CREATE TABLE IF NOT EXISTS alerts (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  communication_id VARCHAR NOT NULL REFERENCES communications(id),
  severity alert_severity NOT NULL,
  violation_type violation_type NOT NULL,
  detection_types detection_type[],
  flagged_keywords JSONB,
  ai_analysis TEXT,
  risk_score INTEGER,
  confidence_score INTEGER,
  is_teaching_moment VARCHAR DEFAULT 'false' NOT NULL,
  rule_matches JSONB,
  status VARCHAR DEFAULT 'pending' NOT NULL,
  reviewed_by VARCHAR REFERENCES users(id),
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Add foreign key for cases.alert_id after alerts table exists
DO $$ BEGIN
  ALTER TABLE cases ADD CONSTRAINT cases_alert_id_fkey FOREIGN KEY (alert_id) REFERENCES alerts(id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  user_id VARCHAR REFERENCES users(id),
  recipient_user_id VARCHAR REFERENCES users(id),
  type VARCHAR DEFAULT 'general' NOT NULL,
  title TEXT,
  message TEXT,
  action_url TEXT,
  metadata JSONB,
  is_read BOOLEAN DEFAULT FALSE NOT NULL,
  read_at TIMESTAMP,
  email_sent BOOLEAN DEFAULT FALSE NOT NULL,
  email_sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS "notifications_recipient_unread_idx" ON notifications(recipient_user_id, is_read, created_at);

-- =============================================================================
-- SECTION 4: CASE-DEPENDENT TABLES
-- =============================================================================

-- Chat Threads
CREATE TABLE IF NOT EXISTS chat_threads (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  case_id VARCHAR NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  evidence_id VARCHAR,
  source_type chat_source_type NOT NULL,
  source_file_name TEXT NOT NULL,
  conversation_name TEXT NOT NULL,
  participants JSONB NOT NULL,
  message_count INTEGER DEFAULT 0 NOT NULL,
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  review_status VARCHAR DEFAULT 'not_reviewed' NOT NULL,
  reviewed_by VARCHAR REFERENCES users(id),
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS "chat_threads_case_idx" ON chat_threads(case_id);
CREATE INDEX IF NOT EXISTS "chat_threads_source_type_idx" ON chat_threads(source_type);

-- Ingested Chat Messages
CREATE TABLE IF NOT EXISTS ingested_chat_messages (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  thread_id VARCHAR REFERENCES chat_threads(id) ON DELETE CASCADE,
  message_id TEXT NOT NULL,
  message_index INTEGER,
  source_type chat_source_type NOT NULL,
  source_file_name TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  is_group BOOLEAN DEFAULT FALSE NOT NULL,
  participants JSONB NOT NULL,
  sender_id TEXT,
  sender_name TEXT,
  sender_phone TEXT,
  sent_at TIMESTAMP,
  text TEXT,
  media_attachments JSONB,
  direction chat_message_direction DEFAULT 'unknown' NOT NULL,
  raw_metadata JSONB,
  is_flagged BOOLEAN DEFAULT FALSE NOT NULL,
  flagged_by VARCHAR REFERENCES users(id),
  flagged_at TIMESTAMP,
  review_status VARCHAR DEFAULT 'not_reviewed' NOT NULL,
  reviewed_by VARCHAR REFERENCES users(id),
  reviewed_at TIMESTAMP,
  notes TEXT,
  case_id VARCHAR REFERENCES cases(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS "ingested_chat_thread_idx" ON ingested_chat_messages(thread_id);
CREATE INDEX IF NOT EXISTS "ingested_chat_conversation_idx" ON ingested_chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS "ingested_chat_case_idx" ON ingested_chat_messages(case_id);
CREATE INDEX IF NOT EXISTS "ingested_chat_sent_at_idx" ON ingested_chat_messages(sent_at);
CREATE INDEX IF NOT EXISTS "ingested_chat_flagged_idx" ON ingested_chat_messages(is_flagged);

-- Chat Message Notes
CREATE TABLE IF NOT EXISTS chat_message_notes (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  message_id VARCHAR NOT NULL REFERENCES ingested_chat_messages(id) ON DELETE CASCADE,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  note_text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Document Relationships
CREATE TABLE IF NOT EXISTS document_relationships (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  source_document_id VARCHAR NOT NULL REFERENCES communications(id),
  related_document_id VARCHAR NOT NULL REFERENCES communications(id),
  relationship_type VARCHAR NOT NULL,
  confidence_score INTEGER,
  explanation TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Case AI Analysis
CREATE TABLE IF NOT EXISTS case_ai_analysis (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  case_id VARCHAR NOT NULL UNIQUE REFERENCES cases(id) ON DELETE CASCADE,
  ai_summary_text TEXT,
  key_facts JSONB,
  key_individuals JSONB,
  key_entities JSONB,
  law_matrix JSONB,
  risk_assessment_text TEXT,
  suggested_next_steps JSONB,
  regulator_perspective TEXT,
  remediation_themes JSONB,
  communication_strategy TEXT,
  risk_heatmap JSONB,
  generated_by VARCHAR REFERENCES users(id),
  last_generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Case Parties
CREATE TABLE IF NOT EXISTS case_parties (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  case_id VARCHAR NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role_type VARCHAR NOT NULL,
  case_role VARCHAR NOT NULL,
  email TEXT,
  phone TEXT,
  department TEXT,
  company TEXT,
  title TEXT,
  legal_hold_status VARCHAR DEFAULT 'not_issued',
  legal_hold_issued_at TIMESTAMP,
  legal_hold_acknowledged_at TIMESTAMP,
  data_sources_collected JSONB,
  interview_status VARCHAR DEFAULT 'not_scheduled',
  risk_level VARCHAR DEFAULT 'low',
  notes TEXT,
  added_by VARCHAR NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Case Timeline Events
CREATE TABLE IF NOT EXISTS case_timeline_events (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  case_id VARCHAR NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  event_type VARCHAR NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  summary TEXT,
  event_date TIMESTAMP NOT NULL,
  entity_type VARCHAR,
  entity_id VARCHAR,
  icon VARCHAR,
  participants JSONB DEFAULT '[]'::JSONB,
  entities JSONB DEFAULT '[]'::JSONB,
  law_tags JSONB DEFAULT '[]'::JSONB,
  risk_tags JSONB DEFAULT '[]'::JSONB,
  source_document_ids JSONB DEFAULT '[]'::JSONB,
  source_interview_ids JSONB DEFAULT '[]'::JSONB,
  source_alert_ids JSONB DEFAULT '[]'::JSONB,
  importance_score INTEGER DEFAULT 50,
  confidence_score INTEGER DEFAULT 100,
  is_key_event BOOLEAN DEFAULT FALSE NOT NULL,
  is_hidden BOOLEAN DEFAULT FALSE NOT NULL,
  notes TEXT,
  risk_level timeline_risk_level DEFAULT 'neutral' NOT NULL,
  risk_reason TEXT,
  created_by VARCHAR REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Custom Timeline Columns
CREATE TABLE IF NOT EXISTS custom_timeline_columns (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  case_id VARCHAR NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  column_key TEXT NOT NULL,
  column_label TEXT NOT NULL,
  column_type VARCHAR DEFAULT 'text' NOT NULL,
  select_options JSONB,
  is_visible BOOLEAN DEFAULT TRUE NOT NULL,
  display_order INTEGER NOT NULL,
  created_by VARCHAR NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  UNIQUE(case_id, column_key)
);

-- Custom Timeline Column Values
CREATE TABLE IF NOT EXISTS custom_timeline_column_values (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  event_id VARCHAR NOT NULL REFERENCES case_timeline_events(id) ON DELETE CASCADE,
  column_id VARCHAR NOT NULL REFERENCES custom_timeline_columns(id) ON DELETE CASCADE,
  value TEXT,
  updated_by VARCHAR REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Case Tasks
CREATE TABLE IF NOT EXISTS case_tasks (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  case_id VARCHAR NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status VARCHAR DEFAULT 'pending' NOT NULL,
  priority VARCHAR DEFAULT 'medium' NOT NULL,
  due_date TIMESTAMP,
  assigned_to VARCHAR REFERENCES users(id),
  created_by VARCHAR NOT NULL REFERENCES users(id),
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Case Messages (Internal Messaging)
CREATE TABLE IF NOT EXISTS case_messages (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  case_id VARCHAR REFERENCES cases(id) ON DELETE CASCADE,
  sender_id VARCHAR REFERENCES users(id),
  recipient_user_id VARCHAR REFERENCES users(id),
  recipient_ids JSONB,
  content TEXT,
  subject TEXT,
  message_type VARCHAR DEFAULT 'general',
  is_read VARCHAR DEFAULT 'false',
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Case Assignments
CREATE TABLE IF NOT EXISTS case_assignments (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  case_id VARCHAR NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  user_id VARCHAR NOT NULL REFERENCES users(id),
  role VARCHAR DEFAULT 'reviewer' NOT NULL,
  assigned_by VARCHAR REFERENCES users(id),
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  status VARCHAR DEFAULT 'active' NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- =============================================================================
-- SECTION 5: INGESTION & PROCESSING TABLES
-- =============================================================================

-- Ingestion Jobs
CREATE TABLE IF NOT EXISTS ingestion_jobs (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  case_id VARCHAR REFERENCES cases(id) ON DELETE SET NULL,
  status ingestion_job_status DEFAULT 'pending' NOT NULL,
  source_type VARCHAR NOT NULL,
  file_count INTEGER DEFAULT 0 NOT NULL,
  processed_count INTEGER DEFAULT 0 NOT NULL,
  error_count INTEGER DEFAULT 0 NOT NULL,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  error_log JSONB,
  created_by VARCHAR REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Ingestion Files
CREATE TABLE IF NOT EXISTS ingestion_files (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  job_id VARCHAR NOT NULL REFERENCES ingestion_jobs(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type file_type NOT NULL,
  file_size INTEGER,
  status ingestion_file_status DEFAULT 'queued' NOT NULL,
  message_count INTEGER DEFAULT 0 NOT NULL,
  error_message TEXT,
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- =============================================================================
-- SECTION 6: TAGGING & DOCUMENT ORGANIZATION
-- =============================================================================

-- Tags
CREATE TABLE IF NOT EXISTS tags (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  name TEXT NOT NULL,
  category tag_category DEFAULT 'custom' NOT NULL,
  color tag_color DEFAULT 'blue' NOT NULL,
  description TEXT,
  case_id VARCHAR REFERENCES cases(id) ON DELETE CASCADE,
  created_by VARCHAR REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Document Tags
CREATE TABLE IF NOT EXISTS document_tags (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  document_id VARCHAR NOT NULL,
  tag_id VARCHAR NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  applied_by VARCHAR REFERENCES users(id),
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS "document_tags_document_idx" ON document_tags(document_id);
CREATE INDEX IF NOT EXISTS "document_tags_tag_idx" ON document_tags(tag_id);

-- Text Selection Tags
CREATE TABLE IF NOT EXISTS text_selection_tags (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  document_id VARCHAR NOT NULL,
  tag_id VARCHAR NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  start_offset INTEGER NOT NULL,
  end_offset INTEGER NOT NULL,
  selected_text TEXT NOT NULL,
  applied_by VARCHAR REFERENCES users(id),
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS "text_selection_tags_document_idx" ON text_selection_tags(document_id);
CREATE INDEX IF NOT EXISTS "text_selection_tags_tag_idx" ON text_selection_tags(tag_id);

-- Document Sets
CREATE TABLE IF NOT EXISTS document_sets (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  name TEXT NOT NULL,
  description TEXT,
  case_id VARCHAR REFERENCES cases(id) ON DELETE CASCADE,
  created_by VARCHAR REFERENCES users(id),
  document_count INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Document Set Members
CREATE TABLE IF NOT EXISTS document_set_members (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  set_id VARCHAR NOT NULL REFERENCES document_sets(id) ON DELETE CASCADE,
  document_id VARCHAR NOT NULL,
  added_by VARCHAR REFERENCES users(id),
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Bulk Actions
CREATE TABLE IF NOT EXISTS bulk_actions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  action_type VARCHAR NOT NULL,
  target_type VARCHAR NOT NULL,
  target_ids JSONB NOT NULL,
  parameters JSONB,
  status VARCHAR DEFAULT 'pending' NOT NULL,
  progress INTEGER DEFAULT 0 NOT NULL,
  error_count INTEGER DEFAULT 0 NOT NULL,
  error_log JSONB,
  started_by VARCHAR REFERENCES users(id),
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  completed_at TIMESTAMP
);

-- =============================================================================
-- SECTION 7: REGULATIONS & DETECTION
-- =============================================================================

-- Regulations
CREATE TABLE IF NOT EXISTS regulations (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  name TEXT NOT NULL,
  abbreviation VARCHAR NOT NULL,
  description TEXT,
  effective_date TIMESTAMP,
  jurisdiction VARCHAR,
  industry_sectors JSONB,
  key_requirements JSONB,
  penalties JSONB,
  resources JSONB,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Detection Rules
CREATE TABLE IF NOT EXISTS detection_rules (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  name TEXT NOT NULL,
  description TEXT,
  regulation_id VARCHAR REFERENCES regulations(id),
  violation_type violation_type NOT NULL,
  detection_type detection_type NOT NULL,
  severity alert_severity NOT NULL,
  keywords JSONB,
  patterns JSONB,
  ml_model_id VARCHAR,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  is_custom VARCHAR DEFAULT 'false' NOT NULL,
  sensitivity INTEGER DEFAULT 50 NOT NULL,
  created_by VARCHAR REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Sector Rule Packs
CREATE TABLE IF NOT EXISTS sector_rule_packs (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  sector industry_sector NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  rule_ids JSONB,
  regulation_ids JSONB,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- =============================================================================
-- SECTION 8: INTERVIEWS & TRAINING
-- =============================================================================

-- Interview Templates
CREATE TABLE IF NOT EXISTS interview_templates (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  name TEXT NOT NULL,
  description TEXT,
  interview_type interview_type NOT NULL,
  questions JSONB NOT NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_by VARCHAR REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Interviews
CREATE TABLE IF NOT EXISTS interviews (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  case_id VARCHAR NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  template_id VARCHAR REFERENCES interview_templates(id),
  interviewee_name TEXT NOT NULL,
  interviewee_email TEXT,
  interviewee_title TEXT,
  interview_type interview_type NOT NULL,
  status VARCHAR DEFAULT 'scheduled' NOT NULL,
  scheduled_at TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  conducted_by VARCHAR REFERENCES users(id),
  transcript TEXT,
  ai_summary TEXT,
  key_findings JSONB,
  follow_up_questions JSONB,
  privilege_status privilege_status DEFAULT 'attorney_client_privileged' NOT NULL,
  privilege_basis privilege_basis DEFAULT 'upjohn_warning',
  upjohn_given BOOLEAN DEFAULT FALSE NOT NULL,
  upjohn_given_at TIMESTAMP,
  notes TEXT,
  created_by VARCHAR REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Interview Invites
CREATE TABLE IF NOT EXISTS interview_invites (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  interview_id VARCHAR NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  status interview_invite_status DEFAULT 'draft' NOT NULL,
  delivery_channel interview_delivery_channel DEFAULT 'email' NOT NULL,
  recipient_email TEXT,
  recipient_phone TEXT,
  sent_at TIMESTAMP,
  opened_at TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  expires_at TIMESTAMP,
  reminder_count INTEGER DEFAULT 0 NOT NULL,
  last_reminder_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Recorded Interviews
CREATE TABLE IF NOT EXISTS recorded_interviews (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  invite_id VARCHAR NOT NULL REFERENCES interview_invites(id) ON DELETE CASCADE,
  interview_id VARCHAR NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  responses JSONB NOT NULL,
  audio_url TEXT,
  transcription TEXT,
  ai_summary TEXT,
  sentiment_analysis JSONB,
  key_themes JSONB,
  concerns_identified JSONB,
  completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Interview Notes
CREATE TABLE IF NOT EXISTS interview_notes (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  interview_id VARCHAR NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  note_text TEXT NOT NULL,
  is_privileged BOOLEAN DEFAULT TRUE NOT NULL,
  created_by VARCHAR NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Training Courses
CREATE TABLE IF NOT EXISTS training_courses (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  title TEXT NOT NULL,
  description TEXT,
  category policy_category,
  content JSONB,
  duration_minutes INTEGER,
  passing_score INTEGER DEFAULT 80,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_by VARCHAR REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Training Enrollments
CREATE TABLE IF NOT EXISTS training_enrollments (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  course_id VARCHAR NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR DEFAULT 'enrolled' NOT NULL,
  progress INTEGER DEFAULT 0 NOT NULL,
  score INTEGER,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  due_date TIMESTAMP,
  assigned_by VARCHAR REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Training Assignments
CREATE TABLE IF NOT EXISTS training_assignments (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  case_id VARCHAR REFERENCES cases(id) ON DELETE SET NULL,
  employee_name TEXT NOT NULL,
  employee_email TEXT NOT NULL,
  training_type VARCHAR NOT NULL,
  training_topics JSONB,
  reason TEXT,
  due_date TIMESTAMP NOT NULL,
  status VARCHAR DEFAULT 'pending' NOT NULL,
  completed_at TIMESTAMP,
  verification_method VARCHAR,
  verified_by VARCHAR REFERENCES users(id),
  verified_at TIMESTAMP,
  notes TEXT,
  created_by VARCHAR NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- =============================================================================
-- SECTION 9: POLICIES & CERTIFICATIONS
-- =============================================================================

-- Policies
CREATE TABLE IF NOT EXISTS policies (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  title TEXT NOT NULL,
  category policy_category NOT NULL,
  version VARCHAR NOT NULL,
  content TEXT NOT NULL,
  summary TEXT,
  effective_date TIMESTAMP NOT NULL,
  review_date TIMESTAMP,
  status VARCHAR DEFAULT 'draft' NOT NULL,
  requires_attestation BOOLEAN DEFAULT TRUE NOT NULL,
  attestation_frequency VARCHAR DEFAULT 'annual',
  applicable_roles JSONB,
  applicable_departments JSONB,
  owner_id VARCHAR REFERENCES users(id),
  approved_by VARCHAR REFERENCES users(id),
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Policy Attestations
CREATE TABLE IF NOT EXISTS policy_attestations (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  policy_id VARCHAR NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  attested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  attestation_type VARCHAR DEFAULT 'acknowledgment' NOT NULL,
  ip_address VARCHAR,
  user_agent TEXT,
  digital_signature TEXT,
  version_attested VARCHAR NOT NULL,
  expires_at TIMESTAMP,
  reminder_sent BOOLEAN DEFAULT FALSE NOT NULL,
  reminder_sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Certifications
CREATE TABLE IF NOT EXISTS certifications (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  case_id VARCHAR REFERENCES cases(id) ON DELETE SET NULL,
  certification_type VARCHAR NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  certifier_name TEXT NOT NULL,
  certifier_title TEXT NOT NULL,
  certifier_email TEXT,
  certification_scope TEXT,
  certification_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  valid_from TIMESTAMP NOT NULL,
  valid_until TIMESTAMP,
  status VARCHAR DEFAULT 'active' NOT NULL,
  attestation_text TEXT,
  digital_signature TEXT,
  supporting_documents JSONB,
  previous_version_id VARCHAR,
  supersedes_certification_id VARCHAR,
  verified_by VARCHAR REFERENCES users(id),
  verified_at TIMESTAMP,
  notes TEXT,
  created_by VARCHAR NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- =============================================================================
-- SECTION 10: WHISTLEBLOWER & HOTLINE
-- =============================================================================

-- Hotline Reports
CREATE TABLE IF NOT EXISTS hotline_reports (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  report_number VARCHAR UNIQUE NOT NULL,
  submission_type VARCHAR DEFAULT 'anonymous' NOT NULL,
  reporter_name TEXT,
  reporter_email TEXT,
  reporter_phone TEXT,
  reporter_department TEXT,
  reporter_relationship VARCHAR,
  category VARCHAR NOT NULL,
  subcategory VARCHAR,
  incident_date TIMESTAMP,
  incident_location TEXT,
  description TEXT NOT NULL,
  individuals_involved JSONB,
  witnesses JSONB,
  evidence_description TEXT,
  evidence_urls JSONB,
  priority VARCHAR DEFAULT 'medium' NOT NULL,
  status VARCHAR DEFAULT 'new' NOT NULL,
  assigned_to VARCHAR REFERENCES users(id),
  case_id VARCHAR REFERENCES cases(id),
  intake_notes TEXT,
  investigation_summary TEXT,
  resolution_summary TEXT,
  resolution_date TIMESTAMP,
  follow_up_required BOOLEAN DEFAULT FALSE NOT NULL,
  follow_up_date TIMESTAMP,
  is_retaliation_concern BOOLEAN DEFAULT FALSE NOT NULL,
  retaliation_notes TEXT,
  anonymous_reply_token TEXT UNIQUE,
  last_anonymous_reply TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Hotline Report Notes
CREATE TABLE IF NOT EXISTS hotline_report_notes (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  report_id VARCHAR NOT NULL REFERENCES hotline_reports(id) ON DELETE CASCADE,
  note_text TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT TRUE NOT NULL,
  created_by VARCHAR REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Whistleblower Protections
CREATE TABLE IF NOT EXISTS whistleblower_protections (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  report_id VARCHAR NOT NULL REFERENCES hotline_reports(id) ON DELETE CASCADE,
  employee_id VARCHAR,
  employee_name TEXT NOT NULL,
  employee_email TEXT,
  employee_department TEXT,
  employee_manager TEXT,
  protection_start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  protection_status VARCHAR DEFAULT 'active' NOT NULL,
  protection_end_date TIMESTAMP,
  protection_end_reason TEXT,
  monitoring_frequency VARCHAR DEFAULT 'weekly' NOT NULL,
  last_monitoring_date TIMESTAMP,
  hr_contact VARCHAR REFERENCES users(id),
  legal_contact VARCHAR REFERENCES users(id),
  monitoring_notes JSONB,
  employment_changes JSONB,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_by VARCHAR NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Retaliation Alerts
CREATE TABLE IF NOT EXISTS retaliation_alerts (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  protection_id VARCHAR NOT NULL REFERENCES whistleblower_protections(id) ON DELETE CASCADE,
  alert_type VARCHAR NOT NULL,
  alert_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  description TEXT NOT NULL,
  severity VARCHAR DEFAULT 'medium' NOT NULL,
  status VARCHAR DEFAULT 'new' NOT NULL,
  action_type VARCHAR,
  action_date TIMESTAMP,
  action_details TEXT,
  source_system VARCHAR,
  source_data JSONB,
  investigated_by VARCHAR REFERENCES users(id),
  investigation_date TIMESTAMP,
  investigation_outcome TEXT,
  remediation_required BOOLEAN DEFAULT FALSE NOT NULL,
  remediation_actions TEXT,
  remediation_completed BOOLEAN DEFAULT FALSE NOT NULL,
  remediation_completed_at TIMESTAMP,
  is_false_positive BOOLEAN DEFAULT FALSE NOT NULL,
  false_positive_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Whistleblowing Jurisdictions
CREATE TABLE IF NOT EXISTS whistleblowing_jurisdictions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  jurisdiction_name TEXT NOT NULL,
  jurisdiction_code VARCHAR UNIQUE NOT NULL,
  country_code VARCHAR NOT NULL,
  region VARCHAR,
  applicable_laws JSONB,
  reporting_deadlines JSONB,
  protection_requirements JSONB,
  financial_incentives JSONB,
  confidentiality_rules TEXT,
  anonymity_allowed BOOLEAN DEFAULT TRUE NOT NULL,
  retaliation_protections TEXT,
  regulatory_bodies JSONB,
  filing_procedures TEXT,
  penalty_structure JSONB,
  statute_of_limitations TEXT,
  notes TEXT,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- =============================================================================
-- SECTION 11: GRC (GOVERNANCE, RISK, COMPLIANCE)
-- =============================================================================

-- GRC Risks
CREATE TABLE IF NOT EXISTS grc_risks (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  risk_id VARCHAR UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category VARCHAR NOT NULL,
  subcategory VARCHAR,
  likelihood INTEGER DEFAULT 3 NOT NULL,
  impact INTEGER DEFAULT 3 NOT NULL,
  inherent_score INTEGER,
  residual_score INTEGER,
  risk_owner VARCHAR REFERENCES users(id),
  department VARCHAR,
  status VARCHAR DEFAULT 'identified' NOT NULL,
  mitigation_strategy TEXT,
  target_date TIMESTAMP,
  actual_completion_date TIMESTAMP,
  related_regulations JSONB,
  related_controls JSONB,
  review_frequency VARCHAR DEFAULT 'quarterly',
  last_review_date TIMESTAMP,
  next_review_date TIMESTAMP,
  notes TEXT,
  created_by VARCHAR REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- GRC Controls
CREATE TABLE IF NOT EXISTS grc_controls (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  control_id VARCHAR UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  control_type VARCHAR NOT NULL,
  control_category VARCHAR NOT NULL,
  frequency VARCHAR DEFAULT 'ongoing' NOT NULL,
  automation_level VARCHAR DEFAULT 'manual' NOT NULL,
  owner VARCHAR REFERENCES users(id),
  department VARCHAR,
  status VARCHAR DEFAULT 'active' NOT NULL,
  effectiveness VARCHAR DEFAULT 'not_tested' NOT NULL,
  last_test_date TIMESTAMP,
  next_test_date TIMESTAMP,
  test_results TEXT,
  related_risks JSONB,
  related_regulations JSONB,
  evidence_requirements TEXT,
  documentation_url TEXT,
  notes TEXT,
  created_by VARCHAR REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- GRC Incidents
CREATE TABLE IF NOT EXISTS grc_incidents (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  incident_id VARCHAR UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category VARCHAR NOT NULL,
  severity VARCHAR DEFAULT 'medium' NOT NULL,
  status VARCHAR DEFAULT 'open' NOT NULL,
  reported_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  incident_date TIMESTAMP,
  discovered_date TIMESTAMP,
  reported_by VARCHAR REFERENCES users(id),
  assigned_to VARCHAR REFERENCES users(id),
  department VARCHAR,
  root_cause TEXT,
  impact_assessment TEXT,
  immediate_actions TEXT,
  corrective_actions TEXT,
  preventive_actions TEXT,
  related_risks JSONB,
  related_controls JSONB,
  case_id VARCHAR REFERENCES cases(id),
  resolution_date TIMESTAMP,
  resolution_summary TEXT,
  lessons_learned TEXT,
  created_by VARCHAR REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- =============================================================================
-- SECTION 12: eDISCOVERY TABLES
-- =============================================================================

-- Custodians
CREATE TABLE IF NOT EXISTS custodians (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  case_id VARCHAR REFERENCES cases(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  title TEXT,
  department TEXT,
  employee_id VARCHAR,
  status VARCHAR DEFAULT 'active' NOT NULL,
  data_sources JSONB,
  legal_hold_status VARCHAR DEFAULT 'none' NOT NULL,
  legal_hold_issued_at TIMESTAMP,
  legal_hold_acknowledged_at TIMESTAMP,
  collection_status VARCHAR DEFAULT 'pending' NOT NULL,
  notes TEXT,
  created_by VARCHAR REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Document Families
CREATE TABLE IF NOT EXISTS document_families (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  case_id VARCHAR REFERENCES cases(id),
  family_type VARCHAR NOT NULL,
  parent_id VARCHAR,
  member_count INTEGER DEFAULT 1 NOT NULL,
  is_complete BOOLEAN DEFAULT FALSE NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Review Batches
CREATE TABLE IF NOT EXISTS review_batches (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  case_id VARCHAR NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  batch_name TEXT NOT NULL,
  batch_number VARCHAR,
  status VARCHAR DEFAULT 'pending' NOT NULL,
  document_count INTEGER DEFAULT 0 NOT NULL,
  reviewed_count INTEGER DEFAULT 0 NOT NULL,
  priority VARCHAR DEFAULT 'normal' NOT NULL,
  due_date TIMESTAMP,
  assignment_type VARCHAR DEFAULT 'manual' NOT NULL,
  search_criteria JSONB,
  reviewer_instructions TEXT,
  qa_required BOOLEAN DEFAULT FALSE NOT NULL,
  qa_sample_percentage INTEGER DEFAULT 10,
  qa_status VARCHAR DEFAULT 'pending' NOT NULL,
  qa_reviewer VARCHAR REFERENCES users(id),
  completed_at TIMESTAMP,
  created_by VARCHAR NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Reviewer Assignments
CREATE TABLE IF NOT EXISTS reviewer_assignments (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  batch_id VARCHAR NOT NULL REFERENCES review_batches(id) ON DELETE CASCADE,
  reviewer_id VARCHAR NOT NULL REFERENCES users(id),
  document_ids JSONB,
  document_count INTEGER DEFAULT 0 NOT NULL,
  reviewed_count INTEGER DEFAULT 0 NOT NULL,
  status VARCHAR DEFAULT 'assigned' NOT NULL,
  priority INTEGER DEFAULT 0 NOT NULL,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  average_time_per_doc INTEGER,
  estimated_completion TIMESTAMP,
  notes TEXT,
  assigned_by VARCHAR REFERENCES users(id),
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Coding Forms
CREATE TABLE IF NOT EXISTS coding_forms (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  case_id VARCHAR REFERENCES cases(id) ON DELETE CASCADE,
  form_name TEXT NOT NULL,
  description TEXT,
  fields JSONB NOT NULL,
  is_default BOOLEAN DEFAULT FALSE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_by VARCHAR REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Document Codings
CREATE TABLE IF NOT EXISTS document_codings (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  document_id VARCHAR NOT NULL,
  coding_form_id VARCHAR REFERENCES coding_forms(id),
  field_values JSONB NOT NULL,
  is_responsive VARCHAR DEFAULT 'not_reviewed' NOT NULL,
  responsiveness_reason TEXT,
  privilege_status VARCHAR DEFAULT 'not_reviewed' NOT NULL,
  privilege_basis TEXT,
  confidentiality_level VARCHAR DEFAULT 'none' NOT NULL,
  issues JSONB,
  hot_document BOOLEAN DEFAULT FALSE NOT NULL,
  key_document BOOLEAN DEFAULT FALSE NOT NULL,
  reviewer_notes TEXT,
  qa_status VARCHAR DEFAULT 'not_reviewed' NOT NULL,
  qa_reviewer VARCHAR REFERENCES users(id),
  qa_notes TEXT,
  coded_by VARCHAR NOT NULL REFERENCES users(id),
  coded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS "document_codings_document_idx" ON document_codings(document_id);
CREATE INDEX IF NOT EXISTS "document_codings_coded_by_idx" ON document_codings(coded_by);

-- Annotation Mentions
CREATE TABLE IF NOT EXISTS annotation_mentions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  document_coding_id VARCHAR NOT NULL REFERENCES document_codings(id) ON DELETE CASCADE,
  mentioned_user_id VARCHAR NOT NULL REFERENCES users(id),
  mentioned_by VARCHAR NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS "annotation_mentions_document_coding_idx" ON annotation_mentions(document_coding_id);
CREATE INDEX IF NOT EXISTS "annotation_mentions_mentioned_user_idx" ON annotation_mentions(mentioned_user_id);

-- Production Sets
CREATE TABLE IF NOT EXISTS production_sets (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  case_id VARCHAR NOT NULL REFERENCES cases(id),
  production_name TEXT NOT NULL,
  production_number VARCHAR UNIQUE NOT NULL,
  production_type VARCHAR DEFAULT 'rolling' NOT NULL,
  status VARCHAR DEFAULT 'draft' NOT NULL,
  bates_prefix VARCHAR DEFAULT 'SENT' NOT NULL,
  bates_start_number INTEGER DEFAULT 1 NOT NULL,
  bates_end_number INTEGER,
  bates_padding INTEGER DEFAULT 6 NOT NULL,
  bates_level VARCHAR DEFAULT 'page' NOT NULL,
  export_format VARCHAR DEFAULT 'relativity' NOT NULL,
  rendition_type VARCHAR DEFAULT 'native_pdf' NOT NULL,
  include_natives VARCHAR DEFAULT 'true' NOT NULL,
  include_text VARCHAR DEFAULT 'true' NOT NULL,
  include_metadata VARCHAR DEFAULT 'true' NOT NULL,
  metadata_fields JSONB,
  document_ids JSONB,
  document_count INTEGER DEFAULT 0 NOT NULL,
  page_count INTEGER DEFAULT 0 NOT NULL,
  confidentiality_stamp TEXT,
  apply_redactions VARCHAR DEFAULT 'true' NOT NULL,
  redaction_style VARCHAR DEFAULT 'black_box' NOT NULL,
  validation_status VARCHAR DEFAULT 'pending' NOT NULL,
  validation_errors JSONB,
  hash_manifest JSONB,
  transmitted_to TEXT,
  transmitted_at TIMESTAMP,
  transmission_method VARCHAR,
  delivery_receipt TEXT,
  cover_letter_url TEXT,
  production_log_url TEXT,
  export_package_url TEXT,
  notes TEXT,
  created_by VARCHAR NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Redaction Templates
CREATE TABLE IF NOT EXISTS redaction_templates (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  template_name TEXT NOT NULL,
  template_type VARCHAR NOT NULL,
  description TEXT,
  regex_pattern TEXT,
  entity_type VARCHAR,
  keywords JSONB,
  case_sensitive VARCHAR DEFAULT 'false' NOT NULL,
  redaction_color VARCHAR DEFAULT 'black' NOT NULL,
  redaction_reason TEXT NOT NULL,
  requires_approval VARCHAR DEFAULT 'false' NOT NULL,
  is_active VARCHAR DEFAULT 'true' NOT NULL,
  usage_count INTEGER DEFAULT 0 NOT NULL,
  created_by VARCHAR REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Document Redactions
CREATE TABLE IF NOT EXISTS document_redactions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  document_id VARCHAR NOT NULL,
  case_id VARCHAR REFERENCES cases(id),
  redaction_type VARCHAR NOT NULL,
  template_id VARCHAR REFERENCES redaction_templates(id),
  page_number INTEGER,
  coordinates JSONB,
  text_selection JSONB,
  redacted_content TEXT,
  redaction_reason TEXT NOT NULL,
  status VARCHAR DEFAULT 'pending' NOT NULL,
  approved_by VARCHAR REFERENCES users(id),
  approved_at TIMESTAMP,
  rejection_reason TEXT,
  applied_by VARCHAR NOT NULL REFERENCES users(id),
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  is_automatic VARCHAR DEFAULT 'false' NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Saved Searches
CREATE TABLE IF NOT EXISTS saved_searches (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  case_id VARCHAR REFERENCES cases(id),
  search_name TEXT NOT NULL,
  description TEXT,
  search_type VARCHAR DEFAULT 'standard' NOT NULL,
  query TEXT,
  conditions JSONB NOT NULL,
  scope VARCHAR DEFAULT 'all' NOT NULL,
  scope_ids JSONB,
  includes_family VARCHAR DEFAULT 'false' NOT NULL,
  index_type VARCHAR DEFAULT 'keyword' NOT NULL,
  use_proximity VARCHAR DEFAULT 'false' NOT NULL,
  use_stemming VARCHAR DEFAULT 'false' NOT NULL,
  use_fuzziness VARCHAR DEFAULT 'false' NOT NULL,
  proximity_distance INTEGER DEFAULT 10,
  result_count INTEGER DEFAULT 0 NOT NULL,
  last_run_at TIMESTAMP,
  last_run_duration INTEGER,
  requires_manual_rerun VARCHAR DEFAULT 'false' NOT NULL,
  is_public VARCHAR DEFAULT 'false' NOT NULL,
  owner_id VARCHAR NOT NULL REFERENCES users(id),
  shared_with JSONB,
  folder_path TEXT,
  tags JSONB,
  is_active VARCHAR DEFAULT 'true' NOT NULL,
  created_by VARCHAR NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Highlight Sets
CREATE TABLE IF NOT EXISTS highlight_sets (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  case_id VARCHAR REFERENCES cases(id),
  set_name TEXT NOT NULL,
  description TEXT,
  terms JSONB NOT NULL,
  terms_array JSONB,
  highlight_color VARCHAR DEFAULT 'yellow' NOT NULL,
  apply_to_all_documents VARCHAR DEFAULT 'true' NOT NULL,
  document_scope JSONB,
  case_scope JSONB,
  show_only_highlights VARCHAR DEFAULT 'false' NOT NULL,
  group_by_term VARCHAR DEFAULT 'false' NOT NULL,
  display_order INTEGER DEFAULT 0 NOT NULL,
  is_public VARCHAR DEFAULT 'false' NOT NULL,
  owner_id VARCHAR NOT NULL REFERENCES users(id),
  shared_with JSONB,
  is_active VARCHAR DEFAULT 'true' NOT NULL,
  created_by VARCHAR NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Viewing History
CREATE TABLE IF NOT EXISTS viewing_history (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  document_id VARCHAR NOT NULL,
  user_id VARCHAR NOT NULL REFERENCES users(id),
  case_id VARCHAR REFERENCES cases(id),
  batch_id VARCHAR REFERENCES review_batches(id),
  viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  view_duration INTEGER,
  scroll_percentage INTEGER,
  actions_performed JSONB,
  view_source VARCHAR DEFAULT 'review_queue' NOT NULL,
  previous_document_id VARCHAR,
  next_document_id VARCHAR,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- =============================================================================
-- SECTION 13: CRISIS RESPONSE TABLES
-- =============================================================================

-- Experts
CREATE TABLE IF NOT EXISTS experts (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  case_id VARCHAR NOT NULL REFERENCES cases(id),
  expert_type expert_type NOT NULL,
  firm_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  retained_under_privilege VARCHAR DEFAULT 'true' NOT NULL,
  privilege_basis TEXT DEFAULT 'Kovel doctrine - retained by counsel to assist in providing legal advice' NOT NULL,
  engagement_letter_url TEXT,
  engagement_date TIMESTAMP NOT NULL,
  scope_of_work TEXT NOT NULL,
  deliverables JSONB,
  estimated_fees INTEGER,
  actual_fees INTEGER DEFAULT 0 NOT NULL,
  billing_status VARCHAR DEFAULT 'active' NOT NULL,
  reports_submitted JSONB,
  work_product_urls JSONB,
  status VARCHAR DEFAULT 'active' NOT NULL,
  completed_at TIMESTAMP,
  notes TEXT,
  created_by VARCHAR NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Regulator Communications
CREATE TABLE IF NOT EXISTS regulator_communications (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  case_id VARCHAR NOT NULL REFERENCES cases(id),
  regulator_body regulator_body NOT NULL,
  regulator_name TEXT,
  communication_type VARCHAR NOT NULL,
  communication_date TIMESTAMP NOT NULL,
  subject TEXT NOT NULL,
  summary TEXT NOT NULL,
  regulator_attendees JSONB,
  company_attendees JSONB,
  attorney_attendees JSONB,
  commitments_made JSONB,
  documents_requested JSONB,
  documents_provided JSONB,
  next_steps TEXT,
  follow_up_required VARCHAR DEFAULT 'false' NOT NULL,
  follow_up_deadline TIMESTAMP,
  is_privileged VARCHAR DEFAULT 'true' NOT NULL,
  privilege_asserted VARCHAR DEFAULT 'false' NOT NULL,
  privilege_log TEXT,
  document_urls JSONB,
  notes TEXT,
  created_by VARCHAR NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Investigation Deadlines
CREATE TABLE IF NOT EXISTS investigation_deadlines (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  case_id VARCHAR NOT NULL REFERENCES cases(id),
  deadline_type deadline_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMP NOT NULL,
  priority VARCHAR DEFAULT 'high' NOT NULL,
  status VARCHAR DEFAULT 'pending' NOT NULL,
  assigned_to VARCHAR REFERENCES users(id),
  responsible_party TEXT,
  completed_at TIMESTAMP,
  completed_by VARCHAR REFERENCES users(id),
  completion_notes TEXT,
  original_due_date TIMESTAMP,
  extension_requested VARCHAR DEFAULT 'false' NOT NULL,
  extension_granted VARCHAR DEFAULT 'false' NOT NULL,
  extension_reason TEXT,
  alert_days_before INTEGER DEFAULT 3 NOT NULL,
  alert_sent VARCHAR DEFAULT 'false' NOT NULL,
  depends_on JSONB,
  related_documents JSONB,
  notes TEXT,
  created_by VARCHAR NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Preservation Checklists
CREATE TABLE IF NOT EXISTS preservation_checklists (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  case_id VARCHAR NOT NULL REFERENCES cases(id),
  system preservation_system NOT NULL,
  system_name TEXT NOT NULL,
  preservation_required VARCHAR DEFAULT 'true' NOT NULL,
  preservation_status VARCHAR DEFAULT 'pending' NOT NULL,
  preservation_date TIMESTAMP,
  affected_custodians JSONB,
  custodian_count INTEGER DEFAULT 0 NOT NULL,
  it_contact_name TEXT,
  it_contact_email TEXT,
  preservation_method TEXT,
  preservation_location TEXT,
  estimated_data_volume TEXT,
  actual_data_volume TEXT,
  verification_required VARCHAR DEFAULT 'true' NOT NULL,
  verification_completed VARCHAR DEFAULT 'false' NOT NULL,
  verified_by VARCHAR REFERENCES users(id),
  verified_at TIMESTAMP,
  verification_notes TEXT,
  preservation_order_url VARCHAR,
  confirmation_documents JSONB,
  notes TEXT,
  assigned_to VARCHAR REFERENCES users(id),
  created_by VARCHAR NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Conflict Checks
CREATE TABLE IF NOT EXISTS conflict_checks (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  case_id VARCHAR REFERENCES cases(id),
  matter_name TEXT NOT NULL,
  potential_client_name TEXT NOT NULL,
  matter_description TEXT NOT NULL,
  investigation_type TEXT,
  conflict_type conflict_type,
  government_agency TEXT,
  adverse_parties JSONB,
  related_parties JSONB,
  subjects JSONB,
  status VARCHAR DEFAULT 'pending' NOT NULL,
  conflicts_identified JSONB,
  conflict_severity VARCHAR,
  waiver_required VARCHAR DEFAULT 'false' NOT NULL,
  waiver_obtained VARCHAR DEFAULT 'false' NOT NULL,
  waiver_documents JSONB,
  engagement_approved VARCHAR DEFAULT 'false' NOT NULL,
  approved_by VARCHAR REFERENCES users(id),
  approved_at TIMESTAMP,
  declined_reason TEXT,
  screened_by VARCHAR NOT NULL REFERENCES users(id),
  screened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  reviewed_by VARCHAR REFERENCES users(id),
  reviewed_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Legal Hold Notifications
CREATE TABLE IF NOT EXISTS legal_hold_notifications (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  case_id VARCHAR NOT NULL REFERENCES cases(id),
  custodian_id VARCHAR REFERENCES custodians(id),
  recipient_name TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  recipient_type VARCHAR DEFAULT 'custodian' NOT NULL,
  notification_type VARCHAR DEFAULT 'initial' NOT NULL,
  sent_at TIMESTAMP,
  sent_by VARCHAR REFERENCES users(id),
  delivery_status VARCHAR DEFAULT 'pending' NOT NULL,
  acknowledgment_required VARCHAR DEFAULT 'true' NOT NULL,
  acknowledged_at TIMESTAMP,
  acknowledgment_method VARCHAR,
  notification_subject TEXT NOT NULL,
  notification_body TEXT NOT NULL,
  attachments JSONB,
  preservation_scope TEXT,
  preservation_start_date TIMESTAMP,
  preservation_end_date TIMESTAMP,
  reminder_scheduled VARCHAR DEFAULT 'false' NOT NULL,
  reminder_sent_at TIMESTAMP,
  escalation_required VARCHAR DEFAULT 'false' NOT NULL,
  escalated_at TIMESTAMP,
  escalated_to VARCHAR REFERENCES users(id),
  notes TEXT,
  created_by VARCHAR NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- =============================================================================
-- SECTION 14: ADDITIONAL TABLES
-- =============================================================================

-- Legal Holds
CREATE TABLE IF NOT EXISTS legal_holds (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  case_id VARCHAR NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  hold_name TEXT NOT NULL,
  description TEXT,
  status VARCHAR DEFAULT 'active' NOT NULL,
  custodian_ids JSONB,
  data_sources JSONB,
  issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  issued_by VARCHAR NOT NULL REFERENCES users(id),
  released_at TIMESTAMP,
  released_by VARCHAR REFERENCES users(id),
  release_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Remediation Plans
CREATE TABLE IF NOT EXISTS remediation_plans (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  case_id VARCHAR NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  plan_name TEXT NOT NULL,
  description TEXT,
  status VARCHAR DEFAULT 'draft' NOT NULL,
  priority VARCHAR DEFAULT 'medium' NOT NULL,
  owner_id VARCHAR REFERENCES users(id),
  due_date TIMESTAMP,
  milestones JSONB,
  success_criteria TEXT,
  budget_estimate INTEGER,
  actual_cost INTEGER,
  risk_reduction_target INTEGER,
  actual_risk_reduction INTEGER,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  verified_by VARCHAR REFERENCES users(id),
  verified_at TIMESTAMP,
  notes TEXT,
  created_by VARCHAR NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Regulatory Strategies
CREATE TABLE IF NOT EXISTS regulatory_strategies (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  case_id VARCHAR NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  strategy_name TEXT NOT NULL,
  description TEXT,
  regulatory_bodies JSONB,
  approach VARCHAR NOT NULL,
  key_messages JSONB,
  timeline JSONB,
  contingencies JSONB,
  approved_by VARCHAR REFERENCES users(id),
  approved_at TIMESTAMP,
  status VARCHAR DEFAULT 'draft' NOT NULL,
  created_by VARCHAR NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Disclosure Playbooks
CREATE TABLE IF NOT EXISTS disclosure_playbooks (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  case_id VARCHAR NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  playbook_name TEXT NOT NULL,
  description TEXT,
  disclosure_type VARCHAR NOT NULL,
  steps JSONB NOT NULL,
  stakeholders JSONB,
  templates JSONB,
  timeline JSONB,
  status VARCHAR DEFAULT 'draft' NOT NULL,
  activated_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_by VARCHAR NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Board Reports
CREATE TABLE IF NOT EXISTS board_reports (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  case_id VARCHAR REFERENCES cases(id) ON DELETE SET NULL,
  report_type VARCHAR NOT NULL,
  title TEXT NOT NULL,
  executive_summary TEXT,
  content JSONB NOT NULL,
  attachments JSONB,
  status VARCHAR DEFAULT 'draft' NOT NULL,
  classification VARCHAR DEFAULT 'confidential' NOT NULL,
  distribution_list JSONB,
  presented_at TIMESTAMP,
  presented_by VARCHAR REFERENCES users(id),
  board_resolution TEXT,
  action_items JSONB,
  follow_up_date TIMESTAMP,
  approved_by VARCHAR REFERENCES users(id),
  approved_at TIMESTAMP,
  version INTEGER DEFAULT 1 NOT NULL,
  previous_version_id VARCHAR,
  created_by VARCHAR NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Privilege Logs
CREATE TABLE IF NOT EXISTS privilege_logs (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  case_id VARCHAR NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  document_id VARCHAR NOT NULL,
  bates_number VARCHAR,
  document_date TIMESTAMP,
  document_type VARCHAR NOT NULL,
  author TEXT,
  recipients JSONB,
  subject TEXT,
  description TEXT,
  privilege_type privilege_status NOT NULL,
  privilege_basis privilege_basis NOT NULL,
  privilege_holder TEXT,
  attorney_names JSONB,
  redaction_type VARCHAR,
  production_status VARCHAR DEFAULT 'withheld' NOT NULL,
  challenge_status VARCHAR DEFAULT 'none' NOT NULL,
  challenge_notes TEXT,
  reviewed_by VARCHAR REFERENCES users(id),
  reviewed_at TIMESTAMP,
  notes TEXT,
  created_by VARCHAR NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Document Forwards
CREATE TABLE IF NOT EXISTS document_forwards (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  document_id VARCHAR NOT NULL,
  shared_by VARCHAR NOT NULL REFERENCES users(id),
  shared_with VARCHAR NOT NULL REFERENCES users(id),
  message TEXT,
  case_id VARCHAR REFERENCES cases(id),
  expires_at TIMESTAMP,
  viewed_at TIMESTAMP,
  notification_sent BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Connector Configurations
CREATE TABLE IF NOT EXISTS connector_configurations (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  connector_type VARCHAR NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  credentials JSONB,
  settings JSONB,
  sync_frequency VARCHAR DEFAULT 'daily',
  last_sync_at TIMESTAMP,
  next_sync_at TIMESTAMP,
  status VARCHAR DEFAULT 'active' NOT NULL,
  error_log JSONB,
  created_by VARCHAR REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- File Search Stores
CREATE TABLE IF NOT EXISTS file_search_stores (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  case_id VARCHAR REFERENCES cases(id),
  store_name TEXT NOT NULL,
  store_id TEXT,
  status VARCHAR DEFAULT 'creating' NOT NULL,
  document_count INTEGER DEFAULT 0 NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Document Indexing Status
CREATE TABLE IF NOT EXISTS document_indexing_status (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  document_id VARCHAR NOT NULL UNIQUE,
  store_id VARCHAR REFERENCES file_search_stores(id),
  status document_index_status DEFAULT 'pending' NOT NULL,
  file_id TEXT,
  error_message TEXT,
  indexed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Regulatory Changes
CREATE TABLE IF NOT EXISTS regulatory_changes (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  regulation_id VARCHAR REFERENCES regulations(id),
  title TEXT NOT NULL,
  summary TEXT,
  change_type VARCHAR NOT NULL,
  effective_date TIMESTAMP,
  announcement_date TIMESTAMP,
  source_url TEXT,
  impact_assessment TEXT,
  affected_sectors JSONB,
  affected_departments JSONB,
  action_required BOOLEAN DEFAULT FALSE NOT NULL,
  action_items JSONB,
  action_deadline TIMESTAMP,
  status VARCHAR DEFAULT 'pending_review' NOT NULL,
  reviewed_by VARCHAR REFERENCES users(id),
  reviewed_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- DSAR Requests
CREATE TABLE IF NOT EXISTS dsar_requests (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  request_number VARCHAR UNIQUE NOT NULL,
  requester_name TEXT NOT NULL,
  requester_email TEXT NOT NULL,
  requester_phone TEXT,
  request_type VARCHAR NOT NULL,
  description TEXT,
  data_categories JSONB,
  identity_verified BOOLEAN DEFAULT FALSE NOT NULL,
  identity_verification_method VARCHAR,
  identity_verified_at TIMESTAMP,
  status VARCHAR DEFAULT 'received' NOT NULL,
  due_date TIMESTAMP NOT NULL,
  assigned_to VARCHAR REFERENCES users(id),
  completed_at TIMESTAMP,
  response_method VARCHAR,
  response_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Chat Sessions (AI Assistant)
CREATE TABLE IF NOT EXISTS chat_sessions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  case_id VARCHAR REFERENCES cases(id) ON DELETE SET NULL,
  title TEXT,
  context JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Chat Messages (AI Assistant)
CREATE TABLE IF NOT EXISTS chat_messages (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  session_id VARCHAR NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role VARCHAR NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  user_id VARCHAR REFERENCES users(id),
  action VARCHAR NOT NULL,
  entity_type VARCHAR NOT NULL,
  entity_id VARCHAR,
  old_values JSONB,
  new_values JSONB,
  ip_address VARCHAR,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Document Highlights
CREATE TABLE IF NOT EXISTS document_highlights (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  document_id VARCHAR NOT NULL,
  user_id VARCHAR NOT NULL REFERENCES users(id),
  case_id VARCHAR REFERENCES cases(id),
  start_offset INTEGER NOT NULL,
  end_offset INTEGER NOT NULL,
  selected_text TEXT NOT NULL,
  highlight_color VARCHAR DEFAULT 'yellow' NOT NULL,
  is_resolved BOOLEAN DEFAULT FALSE NOT NULL,
  resolved_by VARCHAR REFERENCES users(id),
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS "document_highlights_document_idx" ON document_highlights(document_id);
CREATE INDEX IF NOT EXISTS "document_highlights_user_idx" ON document_highlights(user_id);

-- Highlight Comments
CREATE TABLE IF NOT EXISTS highlight_comments (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  highlight_id VARCHAR NOT NULL REFERENCES document_highlights(id) ON DELETE CASCADE,
  user_id VARCHAR NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  mentioned_user_ids JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS "highlight_comments_highlight_idx" ON highlight_comments(highlight_id);

-- Business Reports
CREATE TABLE IF NOT EXISTS business_reports (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  case_id VARCHAR NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  report_name TEXT NOT NULL,
  description TEXT,
  sections JSONB NOT NULL,
  generated_content JSONB,
  status VARCHAR DEFAULT 'pending' NOT NULL,
  generated_at TIMESTAMP,
  generated_by VARCHAR REFERENCES users(id),
  export_format VARCHAR DEFAULT 'pdf',
  export_url TEXT,
  created_by VARCHAR NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Report Templates
CREATE TABLE IF NOT EXISTS report_templates (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  template_name TEXT NOT NULL,
  description TEXT,
  sections JSONB NOT NULL,
  is_default BOOLEAN DEFAULT FALSE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_by VARCHAR REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Employees (for analytics)
CREATE TABLE IF NOT EXISTS employees (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  department TEXT,
  title TEXT,
  manager_email TEXT,
  hire_date TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Communication Stats
CREATE TABLE IF NOT EXISTS communication_stats (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  case_id VARCHAR REFERENCES cases(id),
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  total_communications INTEGER DEFAULT 0 NOT NULL,
  by_type JSONB,
  by_sender JSONB,
  by_department JSONB,
  top_communicators JSONB,
  risk_distribution JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Employee Analytics Cache
CREATE TABLE IF NOT EXISTS employee_analytics_cache (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  case_id VARCHAR REFERENCES cases(id),
  email TEXT NOT NULL,
  analytics_data JSONB NOT NULL,
  computed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  expires_at TIMESTAMP NOT NULL
);

-- Data Volume History
CREATE TABLE IF NOT EXISTS data_volume_history (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  case_id VARCHAR REFERENCES cases(id),
  period_date TIMESTAMP NOT NULL,
  communication_count INTEGER DEFAULT 0 NOT NULL,
  document_count INTEGER DEFAULT 0 NOT NULL,
  storage_bytes BIGINT DEFAULT 0 NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Monitored Devices (for mobile MDM)
CREATE TABLE IF NOT EXISTS monitored_devices (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  employee_email TEXT NOT NULL,
  device_type VARCHAR NOT NULL,
  device_identifier TEXT NOT NULL,
  device_name TEXT,
  os_version TEXT,
  mdm_enrolled BOOLEAN DEFAULT FALSE NOT NULL,
  monitoring_status VARCHAR DEFAULT 'pending' NOT NULL,
  last_sync_at TIMESTAMP,
  compliance_status VARCHAR DEFAULT 'compliant' NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Vendors
CREATE TABLE IF NOT EXISTS vendors (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  name TEXT NOT NULL,
  vendor_type VARCHAR NOT NULL,
  primary_contact_name TEXT,
  primary_contact_email TEXT,
  primary_contact_phone TEXT,
  address TEXT,
  website TEXT,
  industry VARCHAR,
  risk_level VARCHAR DEFAULT 'medium' NOT NULL,
  onboarding_status VARCHAR DEFAULT 'pending' NOT NULL,
  contract_start_date TIMESTAMP,
  contract_end_date TIMESTAMP,
  annual_spend INTEGER,
  data_access_level VARCHAR DEFAULT 'none' NOT NULL,
  compliance_certifications JSONB,
  notes TEXT,
  created_by VARCHAR REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Vendor Contacts
CREATE TABLE IF NOT EXISTS vendor_contacts (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  vendor_id VARCHAR NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT,
  email TEXT,
  phone TEXT,
  is_primary BOOLEAN DEFAULT FALSE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Vendor Risk Assessments
CREATE TABLE IF NOT EXISTS vendor_risk_assessments (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  vendor_id VARCHAR NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  assessment_type VARCHAR NOT NULL,
  assessment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  overall_score INTEGER,
  findings JSONB,
  risk_areas JSONB,
  recommendations TEXT,
  next_assessment_date TIMESTAMP,
  status VARCHAR DEFAULT 'pending' NOT NULL,
  assessed_by VARCHAR REFERENCES users(id),
  approved_by VARCHAR REFERENCES users(id),
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Vendor Risk Alerts
CREATE TABLE IF NOT EXISTS vendor_risk_alerts (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  vendor_id VARCHAR NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  alert_type VARCHAR NOT NULL,
  severity VARCHAR DEFAULT 'medium' NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  source VARCHAR,
  status VARCHAR DEFAULT 'open' NOT NULL,
  resolved_at TIMESTAMP,
  resolved_by VARCHAR REFERENCES users(id),
  resolution_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Vendor Onboarding Workflows
CREATE TABLE IF NOT EXISTS vendor_onboarding_workflows (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  vendor_id VARCHAR NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  workflow_type VARCHAR NOT NULL,
  status VARCHAR DEFAULT 'pending' NOT NULL,
  steps JSONB NOT NULL,
  current_step INTEGER DEFAULT 0 NOT NULL,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  assigned_to VARCHAR REFERENCES users(id),
  notes TEXT,
  created_by VARCHAR REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Folder Access (for hierarchical navigation)
CREATE TABLE IF NOT EXISTS folder_access (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  folder_path TEXT NOT NULL,
  access_level VARCHAR DEFAULT 'read' NOT NULL,
  granted_by VARCHAR REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- =============================================================================
-- SECTION 15: FINAL SETUP - ADD MISSING COLUMNS TO EXISTING TABLES
-- =============================================================================

-- Add any missing columns to existing tables (safe - will skip if exists)
DO $$ BEGIN ALTER TABLE notifications ADD COLUMN action_url TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE users ADD COLUMN microsoft_id VARCHAR UNIQUE; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE detection_rules ADD COLUMN is_custom VARCHAR DEFAULT 'false'; EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================
-- After running this script, test the following:
-- 1. Login at sntlabs.io should work
-- 2. Create a new case
-- 3. Upload emails/documents
-- 4. View Document Review page
-- =============================================================================
