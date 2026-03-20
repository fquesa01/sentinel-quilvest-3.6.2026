-- RON (Remote Online Notarization) Module Tables
-- Created directly via SQL (drizzle-kit push times out on enum creation)

-- Enums
DO $$ BEGIN
  CREATE TYPE ron_transaction_status AS ENUM ('draft', 'pending_idv', 'ready', 'in_progress', 'completed', 'cancelled', 'on_hold');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE ron_session_status AS ENUM ('scheduled', 'lobby', 'in_progress', 'paused', 'completed', 'cancelled', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE ron_notary_status AS ENUM ('pending_onboarding', 'active', 'suspended', 'inactive', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE ron_signer_role AS ENUM ('principal', 'gp', 'lp', 'counsel', 'witness', 'observer', 'power_of_attorney', 'corporate_officer', 'trustee', 'escrow_agent', 'title_agent');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE ron_document_status AS ENUM ('uploaded', 'preparing', 'ready', 'in_signing', 'partially_signed', 'fully_signed', 'notarized', 'recorded', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE ron_signing_order AS ENUM ('sequential', 'parallel', 'hybrid');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE ron_idv_status AS ENUM ('not_started', 'credential_pending', 'credential_passed', 'credential_failed', 'liveness_pending', 'liveness_passed', 'liveness_failed', 'kba_pending', 'kba_passed', 'kba_failed', 'ofac_pending', 'ofac_cleared', 'ofac_flagged', 'fully_verified', 'failed', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE ron_compliance_check_type AS ENUM ('ofac', 'aml', 'pep', 'kba', 'credential_analysis', 'liveness', 'biometric_match', 'geolocation', 'device_check', 'corporate_authority');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE ron_compliance_result AS ENUM ('pass', 'fail', 'review_required', 'pending', 'error', 'not_applicable');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE ron_journal_event_type AS ENUM ('transaction_created', 'document_uploaded', 'signer_added', 'signer_verified', 'session_scheduled', 'session_started', 'session_paused', 'session_resumed', 'signer_joined', 'signer_left', 'signature_applied', 'initial_applied', 'seal_applied', 'session_completed', 'session_cancelled', 'document_notarized', 'compliance_check', 'recording_started', 'recording_stopped', 'notary_assigned', 'signing_order_changed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE ron_annotation_type AS ENUM ('signature', 'initial', 'date', 'seal', 'text', 'checkbox', 'notary_signature', 'notary_seal');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE ron_recording_status AS ENUM ('not_started', 'recording', 'processing', 'completed', 'archived', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE ron_notary_availability AS ENUM ('available', 'busy', 'offline');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE ron_queue_status AS ENUM ('unassigned', 'queued', 'claimed', 'assigned');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- RON Transactions
CREATE TABLE IF NOT EXISTS ron_transactions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id VARCHAR REFERENCES deals(id) ON DELETE SET NULL,
  title VARCHAR(500) NOT NULL,
  status ron_transaction_status NOT NULL DEFAULT 'draft',
  transaction_type VARCHAR(100),
  jurisdiction VARCHAR(100),
  signing_order ron_signing_order DEFAULT 'parallel',
  signing_order_config JSONB DEFAULT '{}',
  scheduled_date TIMESTAMP,
  completed_date TIMESTAMP,
  expiration_date TIMESTAMP,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_by VARCHAR REFERENCES users(id),
  queue_status ron_queue_status DEFAULT 'unassigned',
  assigned_notary_id VARCHAR,
  claimed_by VARCHAR,
  claimed_at TIMESTAMP,
  queue_priority INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ron_transactions_status ON ron_transactions(status);
CREATE INDEX IF NOT EXISTS idx_ron_transactions_deal ON ron_transactions(deal_id);
CREATE INDEX IF NOT EXISTS idx_ron_transactions_created ON ron_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_ron_transactions_queue_status ON ron_transactions(queue_status);

-- RON Notaries
CREATE TABLE IF NOT EXISTS ron_notaries (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR REFERENCES users(id),
  first_name VARCHAR(200) NOT NULL,
  last_name VARCHAR(200) NOT NULL,
  email VARCHAR(300) NOT NULL,
  phone VARCHAR(50),
  status ron_notary_status NOT NULL DEFAULT 'pending_onboarding',
  commission_state VARCHAR(50) NOT NULL,
  commission_number VARCHAR(100),
  commission_expiration TIMESTAMP,
  bond_amount NUMERIC,
  bond_expiration TIMESTAMP,
  eo_insurance_amount NUMERIC,
  eo_insurance_expiration TIMESTAMP,
  eo_insurance_cert_url VARCHAR(1000),
  languages TEXT[] DEFAULT '{}',
  ron_training_completed BOOLEAN DEFAULT FALSE,
  ron_training_date TIMESTAMP,
  ron_exam_score INTEGER,
  seal_image_url VARCHAR(1000),
  signature_image_url VARCHAR(1000),
  digital_certificate_id VARCHAR(500),
  availability_schedule JSONB DEFAULT '{}',
  timezone VARCHAR(100) DEFAULT 'America/New_York',
  total_sessions INTEGER DEFAULT 0,
  avg_session_duration INTEGER,
  compliance_score INTEGER DEFAULT 100,
  background_check_date TIMESTAMP,
  background_check_status VARCHAR(50),
  availability_status ron_notary_availability DEFAULT 'offline',
  availability_updated_at TIMESTAMP,
  max_concurrent_sessions INTEGER DEFAULT 3,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ron_notaries_state ON ron_notaries(commission_state);
CREATE INDEX IF NOT EXISTS idx_ron_notaries_status ON ron_notaries(status);
CREATE INDEX IF NOT EXISTS idx_ron_notaries_email ON ron_notaries(email);
CREATE INDEX IF NOT EXISTS idx_ron_notaries_availability ON ron_notaries(availability_status);

-- RON Sessions
CREATE TABLE IF NOT EXISTS ron_sessions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id VARCHAR NOT NULL REFERENCES ron_transactions(id) ON DELETE CASCADE,
  notary_id VARCHAR REFERENCES ron_notaries(id),
  status ron_session_status NOT NULL DEFAULT 'scheduled',
  session_type VARCHAR(100) DEFAULT 'standard',
  scheduled_start TIMESTAMP,
  scheduled_end TIMESTAMP,
  actual_start TIMESTAMP,
  actual_end TIMESTAMP,
  duration_seconds INTEGER,
  notary_location_verified BOOLEAN DEFAULT FALSE,
  notary_latitude NUMERIC,
  notary_longitude NUMERIC,
  notary_state VARCHAR(50),
  video_session_id VARCHAR(500),
  video_provider VARCHAR(100),
  recording_status ron_recording_status DEFAULT 'not_started',
  recording_url VARCHAR(1000),
  recording_duration INTEGER,
  notes TEXT,
  cancellation_reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ron_sessions_transaction ON ron_sessions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_ron_sessions_notary ON ron_sessions(notary_id);
CREATE INDEX IF NOT EXISTS idx_ron_sessions_status ON ron_sessions(status);
CREATE INDEX IF NOT EXISTS idx_ron_sessions_scheduled ON ron_sessions(scheduled_start);

-- RON Signers
CREATE TABLE IF NOT EXISTS ron_signers (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id VARCHAR NOT NULL REFERENCES ron_transactions(id) ON DELETE CASCADE,
  session_id VARCHAR REFERENCES ron_sessions(id) ON DELETE SET NULL,
  first_name VARCHAR(200) NOT NULL,
  last_name VARCHAR(200) NOT NULL,
  email VARCHAR(300) NOT NULL,
  phone VARCHAR(50),
  role ron_signer_role NOT NULL DEFAULT 'principal',
  signer_title VARCHAR(200),
  organization VARCHAR(300),
  idv_status ron_idv_status NOT NULL DEFAULT 'not_started',
  kba_score INTEGER,
  kba_attempts INTEGER DEFAULT 0,
  kba_last_attempt TIMESTAMP,
  credential_type VARCHAR(100),
  credential_number VARCHAR(200),
  credential_expiration TIMESTAMP,
  credential_image_url VARCHAR(1000),
  liveness_check_passed BOOLEAN DEFAULT FALSE,
  biometric_match_score NUMERIC,
  signature_image_url VARCHAR(1000),
  initials_image_url VARCHAR(1000),
  signing_order INTEGER DEFAULT 0,
  signing_depends_on TEXT[] DEFAULT '{}',
  signing_completed BOOLEAN DEFAULT FALSE,
  signing_completed_at TIMESTAMP,
  joined_session_at TIMESTAMP,
  left_session_at TIMESTAMP,
  preferred_language VARCHAR(10) DEFAULT 'en',
  ip_address VARCHAR(100),
  user_agent TEXT,
  device_fingerprint VARCHAR(500),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ron_signers_transaction ON ron_signers(transaction_id);
CREATE INDEX IF NOT EXISTS idx_ron_signers_session ON ron_signers(session_id);
CREATE INDEX IF NOT EXISTS idx_ron_signers_email ON ron_signers(email);
CREATE INDEX IF NOT EXISTS idx_ron_signers_idv ON ron_signers(idv_status);

-- RON Documents
CREATE TABLE IF NOT EXISTS ron_documents (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id VARCHAR NOT NULL REFERENCES ron_transactions(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  status ron_document_status NOT NULL DEFAULT 'uploaded',
  document_type VARCHAR(100),
  original_pdf_url VARCHAR(1000),
  signed_pdf_url VARCHAR(1000),
  storage_key VARCHAR(1000),
  page_count INTEGER,
  file_size INTEGER,
  mime_type VARCHAR(100),
  signing_order INTEGER DEFAULT 0,
  requires_notarization BOOLEAN DEFAULT TRUE,
  notarization_type VARCHAR(100),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ron_documents_transaction ON ron_documents(transaction_id);
CREATE INDEX IF NOT EXISTS idx_ron_documents_status ON ron_documents(status);

-- RON Annotation Placements
CREATE TABLE IF NOT EXISTS ron_annotation_placements (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id VARCHAR NOT NULL REFERENCES ron_documents(id) ON DELETE CASCADE,
  signer_id VARCHAR REFERENCES ron_signers(id) ON DELETE SET NULL,
  notary_id VARCHAR REFERENCES ron_notaries(id) ON DELETE SET NULL,
  annotation_type ron_annotation_type NOT NULL,
  page_number INTEGER NOT NULL,
  x_position NUMERIC NOT NULL,
  y_position NUMERIC NOT NULL,
  width NUMERIC NOT NULL,
  height NUMERIC NOT NULL,
  required BOOLEAN DEFAULT TRUE,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP,
  completed_value TEXT,
  sort_order INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ron_annotations_document ON ron_annotation_placements(document_id);
CREATE INDEX IF NOT EXISTS idx_ron_annotations_signer ON ron_annotation_placements(signer_id);

-- RON Signatures
CREATE TABLE IF NOT EXISTS ron_signatures (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  signer_id VARCHAR NOT NULL REFERENCES ron_signers(id) ON DELETE CASCADE,
  document_id VARCHAR NOT NULL REFERENCES ron_documents(id) ON DELETE CASCADE,
  annotation_id VARCHAR REFERENCES ron_annotation_placements(id),
  session_id VARCHAR REFERENCES ron_sessions(id),
  signature_type VARCHAR(50) NOT NULL,
  signature_image_url VARCHAR(1000),
  signature_data TEXT,
  page_number INTEGER NOT NULL,
  x_position NUMERIC NOT NULL,
  y_position NUMERIC NOT NULL,
  ip_address VARCHAR(100),
  user_agent TEXT,
  certificate_id VARCHAR(500),
  certificate_serial VARCHAR(500),
  hash_algorithm VARCHAR(50) DEFAULT 'SHA-256',
  document_hash VARCHAR(512),
  signed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ron_signatures_signer ON ron_signatures(signer_id);
CREATE INDEX IF NOT EXISTS idx_ron_signatures_document ON ron_signatures(document_id);
CREATE INDEX IF NOT EXISTS idx_ron_signatures_session ON ron_signatures(session_id);

-- RON Seals
CREATE TABLE IF NOT EXISTS ron_seals (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  notary_id VARCHAR NOT NULL REFERENCES ron_notaries(id) ON DELETE CASCADE,
  document_id VARCHAR NOT NULL REFERENCES ron_documents(id) ON DELETE CASCADE,
  session_id VARCHAR REFERENCES ron_sessions(id),
  seal_image_url VARCHAR(1000),
  seal_data TEXT,
  page_number INTEGER NOT NULL,
  x_position NUMERIC NOT NULL,
  y_position NUMERIC NOT NULL,
  commission_state VARCHAR(50),
  commission_number VARCHAR(100),
  commission_expiration TIMESTAMP,
  certificate_id VARCHAR(500),
  applied_at TIMESTAMP NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ron_seals_notary ON ron_seals(notary_id);
CREATE INDEX IF NOT EXISTS idx_ron_seals_document ON ron_seals(document_id);

-- RON Journal Entries (immutable hash chain)
CREATE TABLE IF NOT EXISTS ron_journal_entries (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id VARCHAR NOT NULL REFERENCES ron_transactions(id) ON DELETE CASCADE,
  session_id VARCHAR REFERENCES ron_sessions(id),
  notary_id VARCHAR REFERENCES ron_notaries(id),
  sequence_number INTEGER NOT NULL,
  event_type ron_journal_event_type NOT NULL,
  actor_type VARCHAR(50) NOT NULL,
  actor_id VARCHAR(200),
  actor_name VARCHAR(300),
  description TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  document_id VARCHAR,
  signer_id VARCHAR,
  previous_hash VARCHAR(128),
  entry_hash VARCHAR(128) NOT NULL,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  ip_address VARCHAR(100),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ron_journal_transaction ON ron_journal_entries(transaction_id);
CREATE INDEX IF NOT EXISTS idx_ron_journal_session ON ron_journal_entries(session_id);
CREATE INDEX IF NOT EXISTS idx_ron_journal_sequence ON ron_journal_entries(transaction_id, sequence_number);

-- RON Recordings
CREATE TABLE IF NOT EXISTS ron_recordings (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR NOT NULL REFERENCES ron_sessions(id) ON DELETE CASCADE,
  status ron_recording_status NOT NULL DEFAULT 'not_started',
  storage_url VARCHAR(1000),
  storage_key VARCHAR(1000),
  archive_url VARCHAR(1000),
  duration INTEGER,
  file_size INTEGER,
  format VARCHAR(50),
  retention_expiration TIMESTAMP,
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  archived_at TIMESTAMP,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ron_recordings_session ON ron_recordings(session_id);
CREATE INDEX IF NOT EXISTS idx_ron_recordings_status ON ron_recordings(status);

-- RON Compliance Checks
CREATE TABLE IF NOT EXISTS ron_compliance_checks (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id VARCHAR NOT NULL REFERENCES ron_transactions(id) ON DELETE CASCADE,
  signer_id VARCHAR REFERENCES ron_signers(id) ON DELETE CASCADE,
  check_type ron_compliance_check_type NOT NULL,
  result ron_compliance_result NOT NULL DEFAULT 'pending',
  score INTEGER,
  provider VARCHAR(200),
  provider_reference_id VARCHAR(500),
  details JSONB DEFAULT '{}',
  raw_response JSONB DEFAULT '{}',
  expires_at TIMESTAMP,
  performed_by VARCHAR REFERENCES users(id),
  performed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ron_compliance_transaction ON ron_compliance_checks(transaction_id);
CREATE INDEX IF NOT EXISTS idx_ron_compliance_signer ON ron_compliance_checks(signer_id);
CREATE INDEX IF NOT EXISTS idx_ron_compliance_type ON ron_compliance_checks(check_type);

-- Queue & Availability columns (ALTER TABLE for existing databases)
DO $$ BEGIN
  ALTER TABLE ron_transactions ADD COLUMN IF NOT EXISTS queue_status ron_queue_status DEFAULT 'unassigned';
EXCEPTION WHEN undefined_column THEN NULL; WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE ron_transactions ADD COLUMN IF NOT EXISTS assigned_notary_id VARCHAR;
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE ron_transactions ADD COLUMN IF NOT EXISTS claimed_by VARCHAR;
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE ron_transactions ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMP;
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE ron_transactions ADD COLUMN IF NOT EXISTS queue_priority INTEGER DEFAULT 0;
EXCEPTION WHEN others THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS idx_ron_transactions_queue_status ON ron_transactions(queue_status);

DO $$ BEGIN
  ALTER TABLE ron_notaries ADD COLUMN IF NOT EXISTS availability_status ron_notary_availability DEFAULT 'offline';
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE ron_notaries ADD COLUMN IF NOT EXISTS availability_updated_at TIMESTAMP;
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE ron_notaries ADD COLUMN IF NOT EXISTS max_concurrent_sessions INTEGER DEFAULT 3;
EXCEPTION WHEN others THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS idx_ron_notaries_availability ON ron_notaries(availability_status);

-- RON Eligibility Result Enum
DO $$ BEGIN
  CREATE TYPE ron_eligibility_result AS ENUM ('eligible', 'ineligible', 'conditional', 'manual_review');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- RON Alternative IDV Method Enum
DO $$ BEGIN
  CREATE TYPE ron_alt_idv_method AS ENUM ('credible_witness', 'personal_knowledge');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- RON Alternative IDV Status Enum
DO $$ BEGIN
  CREATE TYPE ron_alt_idv_status AS ENUM ('initiated', 'witness_idv_pending', 'witness_idv_complete', 'attestation_pending', 'completed', 'rejected', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- RON Eligibility Checks
CREATE TABLE IF NOT EXISTS ron_eligibility_checks (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id VARCHAR NOT NULL REFERENCES ron_transactions(id) ON DELETE CASCADE,
  result ron_eligibility_result NOT NULL,
  jurisdiction VARCHAR(100) NOT NULL,
  transaction_type VARCHAR(100),
  document_types JSONB DEFAULT '[]',
  reasons JSONB DEFAULT '[]',
  warnings JSONB DEFAULT '[]',
  county_override VARCHAR(200),
  checked_by VARCHAR REFERENCES users(id),
  checked_at TIMESTAMP NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ron_eligibility_transaction ON ron_eligibility_checks(transaction_id);
CREATE INDEX IF NOT EXISTS idx_ron_eligibility_result ON ron_eligibility_checks(result);

-- RON Alternative IDV Records
CREATE TABLE IF NOT EXISTS ron_alt_idv_records (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id VARCHAR NOT NULL REFERENCES ron_transactions(id) ON DELETE CASCADE,
  signer_id VARCHAR NOT NULL REFERENCES ron_signers(id) ON DELETE CASCADE,
  method ron_alt_idv_method NOT NULL,
  status ron_alt_idv_status NOT NULL DEFAULT 'initiated',
  witness_first_name VARCHAR(200),
  witness_last_name VARCHAR(200),
  witness_email VARCHAR(300),
  witness_phone VARCHAR(50),
  witness_relationship VARCHAR(200),
  witness_credential_type VARCHAR(100),
  witness_credential_number VARCHAR(200),
  witness_idv_passed BOOLEAN DEFAULT FALSE,
  witness_kba_score INTEGER,
  notary_id VARCHAR REFERENCES ron_notaries(id),
  notary_attestation TEXT,
  notary_signature TEXT,
  attestation_date TIMESTAMP,
  reason TEXT,
  details JSONB DEFAULT '{}',
  completed_at TIMESTAMP,
  completed_by VARCHAR REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ron_alt_idv_transaction ON ron_alt_idv_records(transaction_id);
CREATE INDEX IF NOT EXISTS idx_ron_alt_idv_signer ON ron_alt_idv_records(signer_id);
CREATE INDEX IF NOT EXISTS idx_ron_alt_idv_method ON ron_alt_idv_records(method);
