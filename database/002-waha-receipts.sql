BEGIN;
GRANT UPDATE ON modern.notifications TO modern_app;
ALTER TABLE modern.waha_webhook_events ADD COLUMN IF NOT EXISTS provider_message_id text;
ALTER TABLE modern.waha_webhook_events ADD COLUMN IF NOT EXISTS ack integer;
CREATE INDEX IF NOT EXISTS waha_receipts_message ON modern.waha_webhook_events(provider_message_id,ack) WHERE provider_message_id IS NOT NULL;
COMMIT;
