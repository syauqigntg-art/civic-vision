BEGIN;

-- Index the referencing side of each new foreign key. These are separate from
-- the unique index that protects the referenced (project_id, id) pair.
CREATE INDEX IF NOT EXISTS project_versions_based_on_version_idx
  ON public.project_versions (project_id, based_on_version_id);

CREATE INDEX IF NOT EXISTS project_versions_created_by_idx
  ON public.project_versions (created_by);

CREATE INDEX IF NOT EXISTS project_versions_published_by_idx
  ON public.project_versions (published_by);

CREATE INDEX IF NOT EXISTS projects_active_version_fk_idx
  ON public.projects (id, active_version_id);

COMMIT;
