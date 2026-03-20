-- Migration: Add missing columns to organizations table
-- The schema in shared/schema.ts defines these columns but they were never
-- added to the database, causing 500 errors when creating organizations.

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS logo_url VARCHAR(1000);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS primary_color VARCHAR(50);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS company_name VARCHAR(500);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS footer_text TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS billing_plan VARCHAR(100) DEFAULT 'per_session';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS per_session_rate INTEGER DEFAULT 2500;
