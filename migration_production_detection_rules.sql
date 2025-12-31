-- Migration Script for Production Database
-- This adds missing columns to detection_rules table
-- Run this on your PRODUCTION database only

-- Add missing columns to detection_rules table
ALTER TABLE detection_rules ADD COLUMN IF NOT EXISTS is_custom varchar NOT NULL DEFAULT 'false';
ALTER TABLE detection_rules ADD COLUMN IF NOT EXISTS risk_score integer NOT NULL DEFAULT 50;
ALTER TABLE detection_rules ADD COLUMN IF NOT EXISTS condition_groups jsonb;
ALTER TABLE detection_rules ADD COLUMN IF NOT EXISTS numeric_thresholds jsonb;
ALTER TABLE detection_rules ADD COLUMN IF NOT EXISTS entity_exclusions jsonb;
ALTER TABLE detection_rules ADD COLUMN IF NOT EXISTS rule_version integer NOT NULL DEFAULT 1;
ALTER TABLE detection_rules ADD COLUMN IF NOT EXISTS test_results jsonb;
ALTER TABLE detection_rules ADD COLUMN IF NOT EXISTS trigger_count integer NOT NULL DEFAULT 0;
ALTER TABLE detection_rules ADD COLUMN IF NOT EXISTS last_triggered timestamp;
ALTER TABLE detection_rules ADD COLUMN IF NOT EXISTS template_id varchar;

-- Verify columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'detection_rules' 
AND column_name IN ('is_custom', 'risk_score', 'condition_groups', 'numeric_thresholds', 'entity_exclusions', 'rule_version', 'test_results', 'trigger_count', 'last_triggered', 'template_id')
ORDER BY column_name;
