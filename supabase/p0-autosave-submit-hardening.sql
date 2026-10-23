-- CIVIC VISION P0: serialize autosave with final submission.
-- Applied to Supabase as migration 20261023010223_serialize_answer_saves_with_submission.
-- Prefer the numbered migration in a release workflow. This copy is retained for
-- auditability and safe manual recovery; it replaces save_answer only, not submit_group.
-- No existing answer rows are modified.
CREATE OR REPLACE FUNCTION public.save_answer(code text, qid uuid, val text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_group_id uuid;
  v_project_id uuid;
  v_submission_id uuid;
  v_submission_status text;
  v_answer_id uuid;
BEGIN
  IF val IS NULL OR pg_catalog.char_length(val) > 5000 THEN
    RETURN false;
  END IF;

  SELECT g.id, g.project_id
  INTO v_group_id, v_project_id
  FROM public.groups AS g
  JOIN public.projects AS p
    ON p.id = g.project_id
   AND p.is_active IS TRUE
  WHERE g.access_code = pg_catalog.upper(pg_catalog.btrim(code));

  IF v_group_id IS NULL THEN
    RETURN false;
  END IF;

  -- Share the lock used by submit_group(): writes finish before final validation,
  -- or a late write sees status='submitted' and is rejected.
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

  -- Reject cross-project question IDs.
  IF NOT EXISTS (
    SELECT 1
    FROM public.questions AS q
    WHERE q.id = qid
      AND q.project_id = v_project_id
  ) THEN
    RETURN false;
  END IF;

  -- P1 schema requires project_id and enforces composite project constraints.
  INSERT INTO public.answers AS existing
    (project_id, submission_id, question_id, answer_text)
  VALUES
    (v_project_id, v_submission_id, qid, val)
  ON CONFLICT (submission_id, question_id)
  DO UPDATE SET
    answer_text = EXCLUDED.answer_text,
    updated_at = pg_catalog.now()
  WHERE existing.project_id = EXCLUDED.project_id
  RETURNING existing.id INTO v_answer_id;

  RETURN FOUND;
END;
$function$;

REVOKE ALL ON FUNCTION public.save_answer(text, uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_answer(text, uuid, text)
  TO service_role;
