BEGIN;
REVOKE SELECT ON modern.users FROM modern_app;
GRANT SELECT(id,name,email,role,client_id,active,must_change_password,created_at) ON modern.users TO modern_app;
DROP POLICY IF EXISTS admin_access ON modern.inquiries;
CREATE POLICY office_access ON modern.inquiries TO modern_app USING(modern.actor_role() IN ('manager','secretary')) WITH CHECK(modern.actor_role() IN ('manager','secretary'));
CREATE OR REPLACE FUNCTION modern.immutable_history() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$ BEGIN RAISE EXCEPTION 'History is append-only' USING ERRCODE='23514'; END $$;
REVOKE ALL ON FUNCTION modern.immutable_history() FROM PUBLIC,anon,authenticated;
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['audit','payments','quotations','reports','documents'] LOOP IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgname=t||'_immutable' AND tgrelid=('modern.'||t)::regclass) THEN EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE OR DELETE ON modern.%I FOR EACH ROW EXECUTE FUNCTION modern.immutable_history()',t||'_immutable',t); END IF; END LOOP; END $$;
COMMIT;
