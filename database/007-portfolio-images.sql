BEGIN;
CREATE TABLE modern.portfolio_images(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),name text NOT NULL,mime_type text NOT NULL CHECK(mime_type IN ('image/png','image/jpeg','image/webp')),size integer NOT NULL CHECK(size>0 AND size<=5242880),content bytea NOT NULL,uploaded_by uuid NOT NULL REFERENCES modern.users,created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE modern.portfolio_images ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT ON modern.portfolio_images TO modern_app;
CREATE POLICY manager_images ON modern.portfolio_images TO modern_app USING(modern.actor_role()='manager') WITH CHECK(modern.actor_role()='manager' AND uploaded_by=modern.actor_id());
CREATE TRIGGER portfolio_images_immutable BEFORE UPDATE OR DELETE ON modern.portfolio_images FOR EACH ROW EXECUTE FUNCTION modern.immutable_history();
COMMIT;
