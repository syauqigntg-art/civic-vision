-- CIVIC VISION P0: Serialize answer saves with final submission.
-- Run only in Supabase SQL Editor after reviewing this file and confirming a backup exists.
-- This migration changes function definitions only; it does not modify existing answers.
-- It is designed for the existing schema in which one submission belongs to one group.

BEGIN;

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

-- Keep these SECURITY DEFINER functions callable only through the trusted server API.
REVOKE EXECUTE ON FUNCTION public.save_answer(text, uuid, text)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.submit_group(text)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.save_answer(text, uuid, text)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.submit_group(text)
  TO service_role;

COMMIT;
