-- Migration: Add Organizations & User Auth for multi-tenant support
-- This migration adds organizations, organization_members, and user auth fields

-- Add userType enum column to users (default 'individual')
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_type') THEN
    CREATE TYPE user_type AS ENUM ('individual', 'corporate');
  END IF;
END $$;

ALTER TABLE users ADD COLUMN IF NOT EXISTS user_type user_type DEFAULT 'individual' NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Create organizations table (varchar UUID primary key to match Drizzle schema)
CREATE TABLE IF NOT EXISTS organizations (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create organization_members join table (varchar UUID primary key to match Drizzle schema)
CREATE TABLE IF NOT EXISTS organization_members (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id VARCHAR NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_org_members_user_unique ON organization_members(user_id);

-- Composite unique constraint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_org_member'
  ) THEN
    ALTER TABLE organization_members ADD CONSTRAINT unique_org_member UNIQUE (organization_id, user_id);
  END IF;
END $$;
