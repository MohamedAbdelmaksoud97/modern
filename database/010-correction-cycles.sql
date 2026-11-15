BEGIN;
ALTER TABLE modern.projects ADD COLUMN rework_started_at timestamptz;
COMMIT;
