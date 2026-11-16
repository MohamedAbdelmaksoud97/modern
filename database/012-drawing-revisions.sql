BEGIN;

CREATE TABLE modern.drawing_series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES modern.projects(id),
  category text NOT NULL CHECK (category IN ('architecture','civil','drawings_2d','drawings_3d','municipality')),
  name text NOT NULL,
  published_revision integer,
  UNIQUE (id, project_id, category)
);
CREATE INDEX drawing_series_project_category ON modern.drawing_series(project_id, category);

ALTER TABLE modern.documents ADD COLUMN drawing_id uuid, ADD COLUMN revision_number integer;
ALTER TABLE modern.documents
  ADD CONSTRAINT drawing_revision_pair CHECK (
    (drawing_id IS NULL AND revision_number IS NULL) OR
    (drawing_id IS NOT NULL AND revision_number IS NOT NULL AND revision_number > 0)
  ),
  ADD CONSTRAINT drawing_revision_unique UNIQUE (drawing_id, revision_number),
  ADD CONSTRAINT drawing_series_scope FOREIGN KEY (drawing_id, project_id, category)
    REFERENCES modern.drawing_series(id, project_id, category);

-- Preserve the identity and visibility of each legacy file. Names cannot identify a revision chain.
INSERT INTO modern.drawing_series(id, project_id, category, name, published_revision)
SELECT id, project_id, category, name, 1 FROM modern.documents
WHERE category IN ('architecture','civil','drawings_2d','drawings_3d','municipality');
ALTER TABLE modern.documents DISABLE TRIGGER documents_immutable;
UPDATE modern.documents SET drawing_id=id, revision_number=1
WHERE category IN ('architecture','civil','drawings_2d','drawings_3d','municipality');
ALTER TABLE modern.documents ENABLE TRIGGER documents_immutable;

ALTER TABLE modern.drawing_series ADD CONSTRAINT drawing_published_revision
  FOREIGN KEY (id, published_revision) REFERENCES modern.documents(drawing_id, revision_number);

CREATE TABLE modern.drawing_revision_notes (
  document_id uuid PRIMARY KEY REFERENCES modern.documents(id),
  body text NOT NULL CHECK (length(btrim(body)) BETWEEN 1 AND 4000)
);

ALTER TABLE modern.drawing_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE modern.drawing_revision_notes ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE (published_revision) ON modern.drawing_series TO modern_app;
GRANT SELECT, INSERT ON modern.drawing_revision_notes TO modern_app;
GRANT SELECT (drawing_id, revision_number) ON modern.documents TO modern_app;

CREATE POLICY drawing_series_read ON modern.drawing_series FOR SELECT TO modern_app USING (
  modern.can_project(project_id) AND modern.actor_role()<>'accountant' AND
  (modern.actor_role()<>'client' OR (published_revision IS NOT NULL AND modern.visible(project_id,category)))
);
CREATE POLICY drawing_series_insert ON modern.drawing_series FOR INSERT TO modern_app WITH CHECK (
  published_revision IS NULL AND modern.can_upload(project_id,category)
);
CREATE POLICY drawing_series_publish ON modern.drawing_series FOR UPDATE TO modern_app
  USING (modern.can_upload(project_id,category)) WITH CHECK (modern.can_upload(project_id,category));

DROP POLICY documents_read ON modern.documents;
CREATE POLICY documents_read ON modern.documents FOR SELECT TO modern_app USING (
  modern.can_project(project_id)
  AND (modern.actor_role()<>'accountant' OR category IN ('receipts','contract','supervision_contract'))
  AND (modern.actor_role()<>'client' OR (
    modern.visible(project_id,category) AND (drawing_id IS NULL OR EXISTS (
      SELECT 1 FROM modern.drawing_series s
      WHERE s.id=drawing_id AND s.published_revision=revision_number
    ))
  ))
);

CREATE POLICY drawing_revision_notes_read ON modern.drawing_revision_notes FOR SELECT TO modern_app USING (
  modern.actor_role() NOT IN ('client','accountant') AND
  EXISTS (SELECT 1 FROM modern.documents d WHERE d.id=document_id)
);
CREATE POLICY drawing_revision_notes_insert ON modern.drawing_revision_notes FOR INSERT TO modern_app WITH CHECK (
  EXISTS (SELECT 1 FROM modern.documents d WHERE d.id=document_id AND d.drawing_id IS NOT NULL
    AND d.uploaded_by=modern.actor_id() AND modern.can_upload(d.project_id,d.category))
);

COMMIT;
