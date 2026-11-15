BEGIN;
CREATE OR REPLACE FUNCTION modern.can_project(pid uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$ SELECT EXISTS(SELECT 1 FROM modern.projects p JOIN modern.users u ON u.id=modern.actor_id() AND u.active WHERE p.id=pid AND (u.role IN ('manager','secretary','accountant') OR (u.role='client' AND p.client_id=u.client_id) OR (u.role NOT IN ('client','site_supervisor') AND EXISTS(SELECT 1 FROM modern.assignments a WHERE a.project_id=p.id AND a.user_id=u.id AND a.stage<=p.stage)) OR (u.role='site_supervisor' AND p.stage>=7 AND EXISTS(SELECT 1 FROM modern.assignments a WHERE a.project_id=p.id AND a.user_id=u.id AND a.stage=7)))) $$;
DROP POLICY tasks_read ON modern.tasks;
CREATE POLICY tasks_read ON modern.tasks FOR SELECT TO modern_app USING(modern.can_project(project_id) AND (modern.actor_role() IN ('manager','secretary') OR assigned_to=modern.actor_id()));
COMMIT;
