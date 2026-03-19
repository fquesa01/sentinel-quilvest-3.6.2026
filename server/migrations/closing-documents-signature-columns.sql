-- Migration: Add signature columns to closing_documents table
-- Date: 2026-03-19
-- Task: #67 - Closing Document PDF with E-Signature

ALTER TABLE closing_documents ADD COLUMN IF NOT EXISTS signature_image text;
ALTER TABLE closing_documents ADD COLUMN IF NOT EXISTS signed_at timestamp;
ALTER TABLE closing_documents ADD COLUMN IF NOT EXISTS signed_by varchar(500);
