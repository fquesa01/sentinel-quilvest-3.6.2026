-- Migration: Relationship Intelligence v2
-- Adds:
--   1. deal_interest_profiles      — user-defined deal/contact preference filters
--   2. contact_deal_associations    — junction linking relationship_contacts to knowledge_base_entries
--   3. backfill of contact_deal_associations from knowledge_base_entries.people_mentioned / companies_mentioned
--
-- Idempotent: safe to re-run. Compatible with `drizzle-kit push` (which may
-- create the tables first from shared/schema.ts; the IF NOT EXISTS guards
-- and DO blocks tolerate either order).

-- =========================================================================
-- 1. deal_interest_profiles
-- =========================================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'deal_stage') THEN
    CREATE TYPE deal_stage AS ENUM (
      'sourced', 'evaluated', 'passed', 'in_diligence', 'closed', 'lost', 'current'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'contact_deal_role') THEN
    CREATE TYPE contact_deal_role AS ENUM (
      'principal', 'advisor', 'broker', 'lender', 'counsel',
      'sponsor', 'investor', 'target', 'intermediary', 'mentioned', 'other'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'contact_deal_source') THEN
    CREATE TYPE contact_deal_source AS ENUM (
      'manual', 'backfill_kb_mentions', 'email_thread', 'llm_extracted', 'csv_import'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS deal_interest_profiles (
  id              VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL,
  description     TEXT,
  industries      TEXT[] NOT NULL DEFAULT '{}',
  geographies     TEXT[] NOT NULL DEFAULT '{}',   -- free-form: "Northeast", "Miami-Dade"
  states          TEXT[] NOT NULL DEFAULT '{}',   -- 2-letter codes: "TX", "FL"
  deal_types      TEXT[] NOT NULL DEFAULT '{}',   -- "acquisition", "co-invest", "lp", etc.
  keywords        TEXT[] NOT NULL DEFAULT '{}',   -- positive match terms: "roofing", "HVAC"
  excluded_terms  TEXT[] NOT NULL DEFAULT '{}',   -- negative match terms
  min_deal_value  NUMERIC(15, 2),
  max_deal_value  NUMERIC(15, 2),
  priority        INTEGER NOT NULL DEFAULT 3,     -- 1 (highest) .. 5 (lowest)
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dip_user_active
  ON deal_interest_profiles (user_id, is_active);

-- GIN indexes for fast array containment queries used by the daily scanner
CREATE INDEX IF NOT EXISTS idx_dip_keywords_gin
  ON deal_interest_profiles USING GIN (keywords);
CREATE INDEX IF NOT EXISTS idx_dip_industries_gin
  ON deal_interest_profiles USING GIN (industries);
CREATE INDEX IF NOT EXISTS idx_dip_states_gin
  ON deal_interest_profiles USING GIN (states);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_dip_user_name'
  ) THEN
    ALTER TABLE deal_interest_profiles
      ADD CONSTRAINT unique_dip_user_name UNIQUE (user_id, name);
  END IF;
END $$;

-- =========================================================================
-- 2. contact_deal_associations
-- =========================================================================

CREATE TABLE IF NOT EXISTS contact_deal_associations (
  id           VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contact_id   VARCHAR NOT NULL REFERENCES relationship_contacts(id) ON DELETE CASCADE,
  kb_entry_id  VARCHAR NOT NULL REFERENCES knowledge_base_entries(id) ON DELETE CASCADE,
  role         contact_deal_role NOT NULL DEFAULT 'mentioned',
  stage        deal_stage,                  -- nullable: not all KB entries map to a stage
  source       contact_deal_source NOT NULL DEFAULT 'manual',
  confidence   REAL NOT NULL DEFAULT 1.0,   -- 0..1; lower for fuzzy backfills, 1.0 for manual
  notes        TEXT,
  created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

-- A contact can appear on a deal in multiple roles; same role twice is the dup we want to block.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_cda_contact_kb_role'
  ) THEN
    ALTER TABLE contact_deal_associations
      ADD CONSTRAINT unique_cda_contact_kb_role
      UNIQUE (contact_id, kb_entry_id, role);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_cda_user        ON contact_deal_associations (user_id);
CREATE INDEX IF NOT EXISTS idx_cda_contact     ON contact_deal_associations (contact_id);
CREATE INDEX IF NOT EXISTS idx_cda_kb_entry    ON contact_deal_associations (kb_entry_id);
CREATE INDEX IF NOT EXISTS idx_cda_user_stage  ON contact_deal_associations (user_id, stage);

-- =========================================================================
-- 3. Backfill from knowledge_base_entries.people_mentioned / companies_mentioned
--
-- Strategy:
--   a. For each KB entry, normalize each name in people_mentioned[] and try
--      to match against relationship_contacts.full_name (case-insensitive,
--      same user_id).
--   b. If a people_mentioned entry looks like an email (contains '@'),
--      additionally match on relationship_contacts.email.
--   c. Insert with role='mentioned', source='backfill_kb_mentions',
--      confidence=0.5 (fuzzy). Manual upgrades can re-rate later.
--   d. ON CONFLICT DO NOTHING via the unique constraint above keeps re-runs safe.
-- =========================================================================

-- (a) name match against full_name
INSERT INTO contact_deal_associations
  (user_id, contact_id, kb_entry_id, role, source, confidence, notes)
SELECT
  kb.user_id,
  rc.id,
  kb.id,
  'mentioned'::contact_deal_role,
  'backfill_kb_mentions'::contact_deal_source,
  0.5,
  'Auto-linked via people_mentioned name match'
FROM knowledge_base_entries kb
CROSS JOIN LATERAL unnest(COALESCE(kb.people_mentioned, ARRAY[]::text[])) AS p(name)
JOIN relationship_contacts rc
  ON rc.user_id = kb.user_id
 AND rc.is_active = TRUE
 AND LOWER(TRIM(rc.full_name)) = LOWER(TRIM(p.name))
 AND POSITION('@' IN p.name) = 0    -- skip email-looking entries; handled below
ON CONFLICT ON CONSTRAINT unique_cda_contact_kb_role DO NOTHING;

-- (b) email match for entries that are actually email addresses
INSERT INTO contact_deal_associations
  (user_id, contact_id, kb_entry_id, role, source, confidence, notes)
SELECT
  kb.user_id,
  rc.id,
  kb.id,
  'mentioned'::contact_deal_role,
  'backfill_kb_mentions'::contact_deal_source,
  0.8,
  'Auto-linked via people_mentioned email match'
FROM knowledge_base_entries kb
CROSS JOIN LATERAL unnest(COALESCE(kb.people_mentioned, ARRAY[]::text[])) AS p(name)
JOIN relationship_contacts rc
  ON rc.user_id = kb.user_id
 AND rc.is_active = TRUE
 AND LOWER(rc.email) = LOWER(TRIM(p.name))
WHERE POSITION('@' IN p.name) > 0
ON CONFLICT ON CONSTRAINT unique_cda_contact_kb_role DO NOTHING;

-- (c) company match: if a contact's company appears in companies_mentioned[],
--     link as 'mentioned' with low confidence (0.3) — useful for surfacing
--     "people from companies on this deal" but noisier than name matches.
--     Commented out by default; uncomment if you want company-level fanout.
--
-- INSERT INTO contact_deal_associations
--   (user_id, contact_id, kb_entry_id, role, source, confidence, notes)
-- SELECT
--   kb.user_id,
--   rc.id,
--   kb.id,
--   'mentioned'::contact_deal_role,
--   'backfill_kb_mentions'::contact_deal_source,
--   0.3,
--   'Auto-linked via company match'
-- FROM knowledge_base_entries kb
-- CROSS JOIN LATERAL unnest(COALESCE(kb.companies_mentioned, ARRAY[]::text[])) AS c(co)
-- JOIN relationship_contacts rc
--   ON rc.user_id = kb.user_id
--  AND rc.is_active = TRUE
--  AND rc.company IS NOT NULL
--  AND LOWER(TRIM(rc.company)) = LOWER(TRIM(c.co))
-- ON CONFLICT ON CONSTRAINT unique_cda_contact_kb_role DO NOTHING;
