BEGIN;

-- PR #24's first migration is already part of main and implemented logical
-- deletion. Do not rewrite that historical migration: this forward migration
-- replaces the RPC with a permanent, project-scoped deletion transaction.
-- Published project_versions.content is intentionally never read or changed.

-- Only published-video deletion remains guarded. Question deletion no longer
-- consults snapshots, but videos referenced by published snapshots stay protected.
CREATE OR REPLACE FUNCTION private.prevent_published_content_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
BEGIN
  IF TG_TABLE_NAME = 'videos' AND EXISTS (
    SELECT 1
    FROM public.project_versions AS pv
    CROSS JOIN LATERAL pg_catalog.jsonb_array_elements(pv.content->'videos') AS item(value)
    WHERE pv.project_id = OLD.project_id
      AND pv.status = 'published'
      AND item.value->>'id' = OLD.id::text
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'video_referenced_by_published_version_deactivate_instead';
  END IF;

  RETURN OLD;
END;
$function$;

DROP TRIGGER IF EXISTS questions_published_version_delete_guard ON public.questions;
-- Keep videos_published_version_delete_guard attached to the function above.

REVOKE ALL ON FUNCTION private.prevent_published_content_delete() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.prevent_published_content_delete() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_delete_question(p_id uuid, p_project_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_project_id uuid;
BEGIN
  IF NOT COALESCE((SELECT private.is_admin()), false) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'admin_required';
  END IF;

  -- Lock the selected project first to serialize this operation with other
  -- project-scoped admin mutations. Archived projects may still be cleaned up.
  SELECT p.id INTO v_project_id
  FROM public.projects AS p
  WHERE p.id = p_project_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'project_not_found';
  END IF;

  -- Match both identifiers before locking. A question from another project is
  -- indistinguishable from a missing question to the caller.
  PERFORM 1
  FROM public.questions AS q
  WHERE q.id = p_id
    AND q.project_id = p_project_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN 'not_found';
  END IF;

  -- This RPC runs as one PostgreSQL transaction. Any error in a later DELETE
  -- rolls back the answer and option deletions as well.
  DELETE FROM public.answers AS a
  USING public.submissions AS s
  WHERE a.submission_id = s.id
    AND a.question_id = p_id
    AND s.project_id = p_project_id;

  DELETE FROM public.question_options AS qo
  WHERE qo.question_id = p_id;

  DELETE FROM public.questions AS q
  WHERE q.id = p_id
    AND q.project_id = p_project_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'question_delete_conflict';
  END IF;

  RETURN 'deleted';
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_delete_question(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_question(uuid,uuid) TO authenticated;

COMMIT;
