BEGIN;

-- Production-compatible hard delete for the pre-versioning schema.
-- This migration intentionally does not depend on project_versions,
-- submissions.project_version_id, questions.deleted_at, or snapshot triggers.
-- It preserves the existing active-project and admin-only protections.

CREATE OR REPLACE FUNCTION public.admin_delete_question(p_id uuid, p_project_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_project_active boolean;
  v_locked_project_id uuid;
  v_deleted_count integer;
BEGIN
  IF NOT COALESCE((SELECT private.is_admin()), false) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'admin_required';
  END IF;

  -- Serialize project-level administrative changes and reject archived projects.
  SELECT p.id, p.is_active
    INTO v_locked_project_id, v_project_active
  FROM public.projects AS p
  WHERE p.id = p_project_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'project_not_found';
  END IF;

  IF v_project_active IS FALSE THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'project_archived';
  END IF;

  -- Lock the question row. This also prevents new answer rows from passing
  -- their FK check while the deletion transaction is in progress.
  PERFORM 1
  FROM public.questions AS q
  WHERE q.id = p_id
    AND q.project_id = p_project_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN 'not_found';
  END IF;

  -- Explicit child-first deletion. Any trigger/FK failure aborts the whole
  -- transaction, leaving the question and all related answers untouched.
  DELETE FROM public.answers AS a
  WHERE a.question_id = p_id
    AND a.project_id = p_project_id;

  DELETE FROM public.question_options AS qo
  WHERE qo.question_id = p_id;

  DELETE FROM public.questions AS q
  WHERE q.id = p_id
    AND q.project_id = p_project_id;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  IF v_deleted_count <> 1 THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'question_delete_conflict';
  END IF;

  RETURN 'deleted';
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_delete_question(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_question(uuid, uuid) TO authenticated;

COMMIT;
