BEGIN;
CREATE OR REPLACE FUNCTION modern.can_project(pid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT EXISTS (
    SELECT 1 FROM modern.projects p
    JOIN modern.users u ON u.id=modern.actor_id() AND u.active
    WHERE p.id=pid AND (
      u.role IN ('manager','secretary','accountant')
      OR (u.role='client' AND p.client_id=u.client_id)
      OR EXISTS (
        SELECT 1 FROM modern.assignments a
        WHERE a.project_id=p.id AND a.user_id=u.id AND a.stage<=p.stage
          AND u.role=CASE a.stage
            WHEN 1 THEN 'architect' WHEN 2 THEN 'civil_engineer'
            WHEN 3 THEN 'draftsman' WHEN 4 THEN 'municipality_draftsman'
            WHEN 7 THEN 'site_supervisor' END
      )
    )
  )
$$;
COMMIT;
