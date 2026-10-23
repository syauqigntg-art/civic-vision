-- CIVIC VISION P0: serialize final submission with autosave on the same submission row.
-- Apply only after reviewing staging migration history. Never run db push blindly against staging.
-- save_answer() and submit_group() must acquire the same row lock:
--   save first -> submit waits, then validates the completed write;
--   submit first -> late save waits, sees submitted, and returns false.
CREATE OR REPLACE FUNCTION public.submit_group(code text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_group_id uuid;
  v_project_id uuid;
  v_group_name text;
  v_leader_name text;
  v_submission_id uuid;
  v_submission_status text;
  q public.questions%ROWTYPE;
  v_answer text;
  v_json jsonb;
  v_item_count integer;
BEGIN
  SELECT g.id, g.project_id, g.group_name, g.leader_name
    INTO v_group_id, v_project_id, v_group_name, v_leader_name
  FROM public.groups AS g
  WHERE g.access_code = pg_catalog.upper(pg_catalog.btrim(code));

  IF v_group_id IS NULL THEN
    RETURN 'belum mulai';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.projects AS p
    WHERE p.id = v_project_id AND p.is_active IS TRUE
  ) THEN
    RETURN 'proyek diarsipkan';
  END IF;

  -- This is intentionally the same lock target used by public.save_answer().
  SELECT s.id, s.status
    INTO v_submission_id, v_submission_status
  FROM public.submissions AS s
  WHERE s.group_id = v_group_id
    AND s.project_id = v_project_id
  FOR UPDATE;

  IF v_submission_id IS NULL THEN
    RETURN 'belum mulai';
  END IF;

  IF v_submission_status = 'submitted' THEN
    RETURN 'sudah terkirim';
  END IF;

  IF COALESCE(v_group_name, '') = ''
     OR pg_catalog.coalesce(v_leader_name, '') = '' THEN
    RETURN 'identitas belum lengkap';
  END IF;

  FOR q IN
    SELECT questions.*
    FROM public.questions
    WHERE project_id = v_project_id
      AND is_active IS TRUE
      AND is_required IS TRUE
  LOOP
    SELECT a.answer_text
      INTO v_answer
    FROM public.answers AS a
    WHERE a.submission_id = v_submission_id
      AND a.project_id = v_project_id
      AND a.question_id = q.id;

    IF pg_catalog.coalesce(pg_catalog.btrim(v_answer), '') = '' THEN
      RETURN 'belum lengkap';
    END IF;

    IF q.question_type IN ('multiple_text', 'multi_select') THEN
      BEGIN
        v_json := v_answer::jsonb;
      EXCEPTION
        WHEN others THEN
          RETURN 'belum lengkap';
      END;

      IF pg_catalog.jsonb_typeof(v_json) IS DISTINCT FROM 'array' THEN
        RETURN 'belum lengkap';
      END IF;

      IF q.question_type = 'multiple_text' THEN
        SELECT pg_catalog.count(*)
          INTO v_item_count
        FROM pg_catalog.jsonb_array_elements_text(v_json) AS item(value)
        WHERE pg_catalog.btrim(item.value) <> '';

        IF v_item_count < q.min_items THEN
          RETURN 'belum lengkap';
        END IF;
      ELSIF q.question_type = 'multi_select'
        AND pg_catalog.jsonb_array_length(v_json) = 0 THEN
        RETURN 'belum lengkap';
      END IF;
    END IF;
  END LOOP;

  UPDATE public.submissions
  SET status = 'submitted',
      submitted_at = pg_catalog.now(),
      updated_at = pg_catalog.now()
  WHERE id = v_submission_id
    AND status = 'draft';

  IF NOT FOUND THEN
    RETURN 'sudah terkirim';
  END IF;

  RETURN 'ok';
END;
$function$;

REVOKE ALL ON FUNCTION public.submit_group(text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_group(text)
  TO service_role;
