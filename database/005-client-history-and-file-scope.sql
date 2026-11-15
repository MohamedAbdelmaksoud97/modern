BEGIN;
CREATE POLICY client_stage_history ON modern.audit FOR SELECT TO modern_app USING(modern.actor_role()='client' AND action='transition' AND modern.can_project(project_id) AND modern.visible(project_id,'history'));
CREATE OR REPLACE FUNCTION modern.can_upload(pid uuid,cat text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT EXISTS(SELECT 1 FROM modern.projects p JOIN modern.users u ON u.id=modern.actor_id() AND u.active WHERE p.id=pid AND modern.can_project(pid) AND (
  (cat='receipts' AND u.role IN ('manager','accountant')) OR
  (p.stage=CASE cat WHEN 'contract' THEN 0 WHEN 'architecture' THEN 1 WHEN 'civil' THEN 2 WHEN 'drawings_2d' THEN 3 WHEN 'drawings_3d' THEN 3 WHEN 'municipality' THEN 4 WHEN 'municipality_letters' THEN 5 WHEN 'supervision_contract' THEN 6 WHEN 'site_photos' THEN 7 WHEN 'site_reports' THEN 7 ELSE -1 END
   AND (u.role IN ('manager','secretary') OR EXISTS(SELECT 1 FROM modern.assignments a WHERE a.project_id=p.id AND a.user_id=u.id AND a.stage=p.stage AND u.role=CASE p.stage WHEN 1 THEN 'architect' WHEN 2 THEN 'civil_engineer' WHEN 3 THEN 'draftsman' WHEN 4 THEN 'municipality_draftsman' WHEN 7 THEN 'site_supervisor' END)))
 ))
$$;
REVOKE ALL ON FUNCTION modern.can_upload(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION modern.can_upload(uuid,text) TO modern_app;
DROP POLICY documents_insert ON modern.documents;
CREATE POLICY documents_insert ON modern.documents FOR INSERT TO modern_app WITH CHECK(modern.can_upload(project_id,category) AND uploaded_by=modern.actor_id());
DROP POLICY reports_insert ON modern.reports;
CREATE POLICY reports_insert ON modern.reports FOR INSERT TO modern_app WITH CHECK(modern.can_project(project_id) AND modern.actor_role() IN ('manager','site_supervisor') AND created_by=modern.actor_id() AND EXISTS(SELECT 1 FROM modern.projects WHERE id=project_id AND stage=7));
COMMIT;
