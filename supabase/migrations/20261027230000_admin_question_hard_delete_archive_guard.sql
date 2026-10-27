BEGIN;

-- Follow-up to 20261027210000_admin_question_permanent_delete.sql.
-- The deployment audited before this migration does not yet have project_versions
-- or questions.deleted_at. This migration deliberately does not depend on either.
-- It must run AFTER the existing versioning and permanent-delete migrations when
-- the complete pending migration history is reconciled.

-- Preserve existing archive protections for ordinary operations. The narrowly
-- scoped bypass is only usable by the owner-executed admin RPC, with a transaction-
-- local marker, while a DELETE trigger is running.
CREATE OR REPLACE FUNCTION public.reject_archived_project_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  pid uuid;
BEGIN
  IF TG_OP = 'DELETE'
     AND TG_TABLE_NAME IN ('questions', 'question_options', 'answers')
     AND pg_catalog.current_setting('civic_vision.admin_question_hard_delete', true) = 'on'
     AND pg_catalog.pg_trigger_depth() > 0
     AND current_user = (
       SELECT pg_catalog.pg_get_userbyid(p.proowner)
       FROM pg_catalog.pg_proc AS p
       WHERE p.oid = 'public.admin_delete_question(uuid,uuid)'::regprocedure
     ) THEN
    RETURN OLD;
  END IF;

  IF TG_TABLE_NAME IN ('videos', 'questions', 'groups') THEN
    pid := COALESCE(NEW.project_id, OLD.project_id);
  ELSIF TG_TABLE_NAME IN ('group_members', 'group_videos') THEN
    SELECT g.project_id INTO pid
    FROM public.groups AS g
    WHERE g.id = COALESCE(NEW.group_id, OLD.group_id);
  ELSIF TG_TABLE_NAME = 'question_options' THEN
    SELECT q.project_id INTO pid
    FROM public.questions AS q
    WHERE q.id = CASE WHEN TG_OP = 'DELETE' THEN OLD.question_id ELSE NEW.question_id END;
  ELSIF TG_TABLE_NAME = 'submissions' THEN
    pid := CASE WHEN TG_OP = 'DELETE' THEN OLD.project_id ELSE NEW.project_id END;
  ELSIF TG_TABLE_NAME = 'answers' THEN
    pid := CASE WHEN TG_OP = 'DELETE' THEN OLD.project_id ELSE NEW.project_id END;
  END IF;

  IF pid IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.projects AS p
    WHERE p.id = pid AND p.is_active IS FALSE
  ) THEN
    RAISE EXCEPTION 'Project diarsipkan: data pembelajaran bersifat baca-saja.';
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.guard_active_parent_project()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_project_id uuid;
  v_question_project uuid;
  v_parent_missing boolean := false;
  v_active boolean;
BEGIN
  IF TG_OP = 'DELETE'
     AND TG_TABLE_NAME IN ('question_options', 'answers')
     AND pg_catalog.current_setting('civic_vision.admin_question_hard_delete', true) = 'on'
     AND pg_catalog.pg_trigger_depth() > 0
     AND current_user = (
       SELECT pg_catalog.pg_get_userbyid(p.proowner)
       FROM pg_catalog.pg_proc AS p
       WHERE p.oid = 'public.admin_delete_question(uuid,uuid)'::regprocedure
     ) THEN
    RETURN OLD;
  END IF;

  IF TG_TABLE_NAME = 'group_members' THEN
    SELECT g.project_id INTO v_project_id
    FROM public.groups AS g
    WHERE g.id = CASE WHEN TG_OP = 'DELETE' THEN OLD.group_id ELSE NEW.group_id END;
    v_parent_missing := NOT FOUND;
  ELSIF TG_TABLE_NAME = 'question_options' THEN
    SELECT q.project_id INTO v_project_id
    FROM public.questions AS q
    WHERE q.id = CASE WHEN TG_OP = 'DELETE' THEN OLD.question_id ELSE NEW.question_id END;
    v_parent_missing := NOT FOUND;
  ELSIF TG_TABLE_NAME = 'answers' THEN
    SELECT s.project_id, q.project_id
      INTO v_project_id, v_question_project
    FROM public.submissions AS s
    JOIN public.questions AS q
      ON q.id = CASE WHEN TG_OP = 'DELETE' THEN OLD.question_id ELSE NEW.question_id END
    WHERE s.id = CASE WHEN TG_OP = 'DELETE' THEN OLD.submission_id ELSE NEW.submission_id END;
    v_parent_missing := NOT FOUND;

    IF NOT v_parent_missing AND v_project_id IS DISTINCT FROM v_question_project THEN
      RAISE EXCEPTION 'Jawaban dan pertanyaan harus berasal dari proyek yang sama.';
    END IF;
  ELSE
    RAISE EXCEPTION 'Tabel tidak didukung untuk pemeriksaan proyek.';
  END IF;

  IF v_parent_missing THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RAISE EXCEPTION 'Data induk tidak ditemukan atau belum memiliki project_id.';
  END IF;

  SELECT p.is_active INTO v_active
  FROM public.projects AS p
  WHERE p.id = v_project_id
  FOR SHARE;

  IF NOT FOUND THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RAISE EXCEPTION 'Proyek tidak ditemukan.';
  END IF;

  IF v_active IS FALSE THEN
    RAISE EXCEPTION 'Proyek diarsipkan. Aktifkan kembali proyek sebelum mengubah atau menghapus data.';
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.guard_active_project_row()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_project_id uuid;
  v_active boolean;
BEGIN
  IF TG_OP = 'DELETE'
     AND TG_TABLE_NAME = 'questions'
     AND pg_catalog.current_setting('civic_vision.admin_question_hard_delete', true) = 'on'
     AND pg_catalog.pg_trigger_depth() > 0
     AND current_user = (
       SELECT pg_catalog.pg_get_userbyid(p.proowner)
       FROM pg_catalog.pg_proc AS p
       WHERE p.oid = 'public.admin_delete_question(uuid,uuid)'::regprocedure
     ) THEN
    RETURN OLD;
  END IF;

  v_project_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.project_id ELSE NEW.project_id END;
  IF v_project_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RAISE EXCEPTION 'project_id wajib ditentukan.';
  END IF;

  SELECT p.is_active INTO v_active
  FROM public.projects AS p
  WHERE p.id = v_project_id
  FOR SHARE;

  IF NOT FOUND THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RAISE EXCEPTION 'Proyek tidak ditemukan.';
  END IF;

  IF v_active IS FALSE THEN
    RAISE EXCEPTION 'Proyek diarsipkan. Aktifkan kembali proyek sebelum mengubah atau menghapus data.';
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$function$;

-- If the versioning migration installed this trigger, remove only the question
-- snapshot guard. Published-video deletion protection remains intact.
DROP TRIGGER IF EXISTS questions_published_version_delete_guard ON public.questions;

CREATE OR REPLACE FUNCTION public.admin_delete_question(p_id uuid, p_project_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_locked_project_id uuid;
BEGIN
  IF NOT COALESCE((SELECT private.is_admin()), false) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'admin_required';
  END IF;

  SELECT p.id INTO v_locked_project_id
  FROM public.projects AS p
  WHERE p.id = p_project_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'project_not_found';
  END IF;

  PERFORM 1
  FROM public.questions AS q
  WHERE q.id = p_id
    AND q.project_id = p_project_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN 'not_found';
  END IF;

  -- Set a transaction-local marker. Guard triggers require both this marker
  -- and execution as the RPC owner to allow these specific deletes.
  PERFORM pg_catalog.set_config('civic_vision.admin_question_hard_delete', 'on', true);

  DELETE FROM public.answers AS a
  WHERE a.question_id = p_id
    AND a.project_id = p_project_id;

  DELETE FROM public.question_options AS qo
  WHERE qo.question_id = p_id;

  DELETE FROM public.questions AS q
  WHERE q.id = p_id
    AND q.project_id = p_project_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'question_delete_conflict';
  END IF;

  PERFORM pg_catalog.set_config('civic_vision.admin_question_hard_delete', 'off', true);
  RETURN 'deleted';
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_delete_question(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_question(uuid, uuid) TO authenticated;

COMMIT;
