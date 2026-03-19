-- Add email to deal_channel_type enum
DO $$ BEGIN
  ALTER TYPE deal_channel_type ADD VALUE IF NOT EXISTS 'email';
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- Add inbound_email_address column for email forwarding
ALTER TABLE deal_channels ADD COLUMN IF NOT EXISTS inbound_email_address VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_deal_channels_email ON deal_channels (inbound_email_address);

-- Add metadata column for storing OAuth tokens and integration config
ALTER TABLE deal_channels ADD COLUMN IF NOT EXISTS metadata JSONB;
