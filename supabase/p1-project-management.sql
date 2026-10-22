-- CIVIC VISION P1: explicit project scope, cross-project assignment guard,
-- and archive lifecycle enforcement for student work.
-- Existing videos, questions, groups, submissions, and answers are not deleted.
-- Run once in Supabase SQL Editor after the P1 deployment is READY and a backup exists.
BEGIN;

-- P1: validate that group/video assignments always stay inside the same project.
DO $preflight$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.group_videos gv
    JOIN public.groups g ON g.id = gv.group_id
    JOIN public.videos v ON v.id = gv.video_id
    WHERE g.project_id IS DISTINCT FROM v.project_id
  ) THEN
    RAISE EXCEPTION 'Migrasi dibatalkan: ditemukan penugasan video lintas proyek. Periksa tabel group_videos terlebih dahulu.';
  END IF;
END;
$preflight$;

CREATE OR REPLACE FUNCTION public.guard_group_video_project()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
  v_group_id uuid;
  v_video_id uuid;
  v_group_project uuid;
  v_video_project uuid;
  v_project_active boolean;
  v_video_active boolean;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_group_id := OLD.group_id;
    v_video_id := OLD.video_id;
  ELSE
    v_group_id := NEW.group_id;
    v_video_id := NEW.video_id;
  END IF;

  SELECT g.project_id, p.is_active
  INTO v_group_project, v_project_active
  FROM public.groups g
  JOIN public.projects p ON p.id = g.project_id
  WHERE g.id = v_group_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Kelompok penugasan tidak ditemukan.';
  END IF;

  IF v_project_active IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'Proyek diarsipkan. Aktifkan kembali proyek sebelum mengubah penugasan.';
  END IF;

  IF TG_OP <> 'DELETE' THEN
    SELECT v.project_id, v.is_active
    INTO v_video_project, v_video_active
    FROM public.videos v
    WHERE v.id = v_video_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Video penugasan tidak ditemukan.';
    END IF;

    IF v_group_project IS DISTINCT FROM v_video_project THEN
      RAISE EXCEPTION 'Kelompok dan video harus berasal dari proyek yang sama.';
    END IF;

    IF v_video_active IS DISTINCT FROM TRUE THEN
      RAISE EXCEPTION 'Video nonaktif tidak dapat ditugaskan.';
    END IF;
    RETURN NEW;
  END IF;

  RETURN OLD;
END;
$function$;

DROP TRIGGER IF EXISTS guard_group_video_project ON public.group_videos;
CREATE TRIGGER guard_group_video_project
BEFORE INSERT OR UPDATE OF group_id, video_id OR DELETE
ON public.group_videos
FOR EACH ROW EXECUTE FUNCTION public.guard_group_video_project();

CREATE OR REPLACE FUNCTION public.save_answer(code text, qid uuid, val text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_group_id uuid;
  v_project_id uuid;
  v_submission_id uuid;
  v_submission_status text;
BEGIN
  IF val IS NULL OR char_length(val) > 5000 THEN
    RETURN false;
  END IF;

  SELECT g.id, g.project_id
  INTO v_group_id, v_project_id
  FROM public.groups AS g
  WHERE g.access_code = upper(trim(code));

  IF v_group_id IS NULL THEN
    RETURN false;
  END IF;

  -- Archived projects are read-only: existing results remain stored, but
  -- students cannot change answers until a teacher reactivates the project.
  PERFORM 1 FROM public.projects
  WHERE id = v_project_id AND is_active IS TRUE
  FOR SHARE;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Serialize all saves for this group against submit_group().
  -- A save already holding this row lock completes before submit validates;
  -- a save arriving after submit commits sees status='submitted' and is rejected.
  SELECT s.id, s.status
  INTO v_submission_id, v_submission_status
  FROM public.submissions AS s
  WHERE s.group_id = v_group_id
    AND s.project_id = v_project_id
  FOR UPDATE;

  IF v_submission_id IS NULL
     OR v_submission_status IS DISTINCT FROM 'draft' THEN
    RETURN false;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.questions AS q
    WHERE q.id = qid
      AND q.project_id = v_project_id
      AND q.is_active = true
  ) THEN
    RETURN false;
  END IF;

  INSERT INTO public.answers (
    submission_id, question_id, answer_text
  )
  VALUES (v_submission_id, qid, val)
  ON CONFLICT (submission_id, question_id)
  DO UPDATE SET
    answer_text = EXCLUDED.answer_text,
    updated_at = now();

  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.submit_group(code text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  g public.groups%ROWTYPE;
  s public.submissions%ROWTYPE;
  q public.questions%ROWTYPE;
  v_answer text;
  v_json jsonb;
  v_count integer;
  v_updated integer;
BEGIN
  SELECT *
  INTO g
  FROM public.groups
  WHERE access_code = upper(trim(code))
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN 'kode tidak valid';
  END IF;

  PERFORM 1 FROM public.projects
  WHERE id = g.project_id AND is_active IS TRUE
  FOR SHARE;
  IF NOT FOUND THEN
    RETURN 'proyek diarsipkan';
  END IF;

  -- This row lock is shared with save_answer() to prevent a save racing
  -- with final validation and changing data after the submission is locked.
  SELECT *
  INTO s
  FROM public.submissions
  WHERE group_id = g.id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN 'belum mulai';
  END IF;

  IF s.status = 'submitted' THEN
    RETURN 'sudah terkirim';
  END IF;

  IF s.status IS DISTINCT FROM 'draft' THEN
    RETURN 'status tidak valid';
  END IF;

  IF coalesce(btrim(g.group_name), '') = ''
     OR coalesce(btrim(g.leader_name), '') = '' THEN
    RETURN 'identitas belum lengkap';
  END IF;

  FOR q IN
    SELECT *
    FROM public.questions
    WHERE project_id = g.project_id
      AND is_active = true
      AND is_required = true
    ORDER BY display_order, id
  LOOP
    v_answer := NULL;

    SELECT a.answer_text
    INTO v_answer
    FROM public.answers AS a
    WHERE a.submission_id = s.id
      AND a.question_id = q.id;

    IF v_answer IS NULL OR btrim(v_answer) = '' THEN
      RETURN 'belum lengkap';
    END IF;

    IF q.question_type = 'multiple_text' THEN
      BEGIN
        v_json := v_answer::jsonb;
      EXCEPTION WHEN others THEN
        RETURN 'belum lengkap';
      END;

      IF jsonb_typeof(v_json) IS DISTINCT FROM 'array' THEN
        RETURN 'belum lengkap';
      END IF;

      IF EXISTS (
        SELECT 1
        FROM jsonb_array_elements(v_json) AS e(value)
        WHERE jsonb_typeof(e.value) IS DISTINCT FROM 'string'
      ) THEN
        RETURN 'belum lengkap';
      END IF;

      SELECT count(*)
      INTO v_count
      FROM jsonb_array_elements(v_json) AS e(value)
      WHERE btrim(e.value #>> '{}') <> '';

      IF v_count < q.min_items THEN
        RETURN 'belum lengkap';
      END IF;

    ELSIF q.question_type = 'multi_select' THEN
      BEGIN
        v_json := v_answer::jsonb;
      EXCEPTION WHEN others THEN
        RETURN 'belum lengkap';
      END;

      IF jsonb_typeof(v_json) IS DISTINCT FROM 'array' THEN
        RETURN 'belum lengkap';
      END IF;

      SELECT count(*)
      INTO v_count
      FROM jsonb_array_elements(v_json) AS e(value)
      WHERE jsonb_typeof(e.value) = 'string'
        AND btrim(e.value #>> '{}') <> '';

      IF v_count = 0 THEN
        RETURN 'belum lengkap';
      END IF;

      -- Only accept choices actually offered for this question.
      IF EXISTS (
        SELECT 1
        FROM jsonb_array_elements(v_json) AS e(value)
        WHERE jsonb_typeof(e.value) IS DISTINCT FROM 'string'
           OR NOT EXISTS (
             SELECT 1
             FROM public.question_options AS o
             WHERE o.question_id = q.id
               AND o.option_text = (e.value #>> '{}')
           )
      ) THEN
        RETURN 'belum lengkap';
      END IF;

    ELSIF q.question_type = 'single_select' THEN
      IF NOT EXISTS (
        SELECT 1
        FROM public.question_options AS o
        WHERE o.question_id = q.id
          AND o.option_text = v_answer
      ) THEN
        RETURN 'belum lengkap';
      END IF;

    ELSIF q.question_type = 'scale' THEN
      IF v_answer !~ '^[1-5]$' THEN
        RETURN 'belum lengkap';
      END IF;
    END IF;
  END LOOP;

  UPDATE public.submissions
  SET status = 'submitted',
      submitted_at = now(),
      updated_at = now()
  WHERE id = s.id
    AND status = 'draft';

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated <> 1 THEN
    RETURN 'sudah terkirim';
  END IF;

  RETURN 'ok';
END;
$function$;

-- Identity writes must not change a group while its project is archived.
CREATE OR REPLACE FUNCTION public.save_identity(
  code text, p_name text, p_number integer, p_class text,
  p_leader text, p_members jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_group_id uuid;
  v_project_id uuid;
  v_project_active boolean;
BEGIN
  SELECT g.id, g.project_id
  INTO v_group_id, v_project_id
  FROM public.groups g
  WHERE g.access_code = upper(trim(code))
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Kode kelompok tidak valid.';
  END IF;

  SELECT p.is_active
  INTO v_project_active
  FROM public.projects p
  WHERE p.id = v_project_id
  FOR SHARE;

  IF v_project_active IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'Proyek diarsipkan. Minta guru mengaktifkannya kembali sebelum mengubah identitas.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.submissions s
    WHERE s.group_id = v_group_id AND s.status = 'submitted'
  ) THEN
    RAISE EXCEPTION 'Pengerjaan sudah terkirim dan terkunci.';
  END IF;

  UPDATE public.groups
  SET group_name = trim(p_name),
      group_number = p_number,
      class_name = trim(p_class),
      leader_name = trim(p_leader),
      updated_at = now()
  WHERE id = v_group_id;

  DELETE FROM public.group_members WHERE group_id = v_group_id;
  INSERT INTO public.group_members(group_id, name, member_order)
  SELECT v_group_id, trim(member_name), ordinality::integer
  FROM jsonb_array_elements_text(coalesce(p_members, '[]'::jsonb))
       WITH ORDINALITY AS members(member_name, ordinality)
  WHERE trim(member_name) <> '';
END;
$function$;

-- A student may start only an active, assigned video in their own project.
CREATE OR REPLACE FUNCTION public.begin_submission(code text, vid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_group public.groups%ROWTYPE;
  v_video public.videos%ROWTYPE;
  v_project_active boolean;
BEGIN
  SELECT *
  INTO v_group
  FROM public.groups
  WHERE access_code = upper(trim(code))
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Kode kelompok tidak valid.';
  END IF;

  SELECT p.is_active
  INTO v_project_active
  FROM public.projects p
  WHERE p.id = v_group.project_id
  FOR SHARE;

  IF v_project_active IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'Proyek diarsipkan. Jawaban draft tetap tersimpan; minta guru mengaktifkan kembali proyek.';
  END IF;

  SELECT *
  INTO v_video
  FROM public.videos
  WHERE id = vid
    AND project_id = v_group.project_id
    AND is_active IS TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Video tidak aktif atau bukan milik proyek kelompok ini.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.group_videos gv
    WHERE gv.group_id = v_group.id AND gv.video_id = v_video.id
  ) THEN
    RAISE EXCEPTION 'Video ini tidak ditugaskan kepada kelompok tersebut.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.submissions s
    WHERE s.group_id = v_group.id AND s.status = 'submitted'
  ) THEN
    RAISE EXCEPTION 'Pengerjaan sudah terkirim dan terkunci.';
  END IF;

  INSERT INTO public.submissions(project_id, group_id, video_id)
  VALUES (v_group.project_id, v_group.id, v_video.id)
  ON CONFLICT (group_id) DO UPDATE
  SET video_id = EXCLUDED.video_id,
      updated_at = now()
  WHERE submissions.status = 'draft'
    AND submissions.project_id = EXCLUDED.project_id;
END;
$function$;

-- The browser calls these functions through the trusted student API only.
REVOKE EXECUTE ON FUNCTION public.save_answer(text, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.submit_group(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.begin_submission(text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.save_identity(text, text, integer, text, text, jsonb) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.save_answer(text, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.submit_group(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.begin_submission(text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.save_identity(text, text, integer, text, text, jsonb) TO service_role;

COMMIT;
