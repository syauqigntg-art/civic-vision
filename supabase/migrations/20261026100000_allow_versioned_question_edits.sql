BEGIN;

-- Editing working questions is safe only when every existing answer can be
-- interpreted through its immutable, published submission snapshot.
-- Lock the project row before changing working content so snapshot creation
-- and publication serialize with edits on the same project.
CREATE OR REPLACE FUNCTION public.admin_save_question(
  p_id uuid,
  p_project_id uuid,
  p_question_text text,
  p_category text,
  p_phase text,
  p_question_type text,
  p_is_required boolean,
  p_is_active boolean,
  p_placeholder text,
  p_description text,
  p_display_order integer,
  p_min_items integer,
  p_options jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_id uuid;
  v_existing public.questions%ROWTYPE;
  v_project_active boolean;
  v_count integer;
  v_unique_count integer;
  v_old_options jsonb;
  v_new_options jsonb;
BEGIN
  IF NOT COALESCE((SELECT private.is_admin()), false) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'admin_required';
  END IF;

  SELECT p.is_active INTO v_project_active
  FROM public.projects AS p
  WHERE p.id = p_project_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'project_not_found';
  END IF;
  IF v_project_active IS FALSE THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'project_archived';
  END IF;

  IF p_question_text IS NULL OR char_length(btrim(p_question_text)) NOT BETWEEN 1 AND 500
     OR p_category IS NULL OR char_length(btrim(p_category)) NOT BETWEEN 1 AND 60
     OR p_phase IS NOT NULL AND p_phase NOT IN ('see','think','connect','act')
     OR p_question_type NOT IN ('text','textarea','multiple_text','single_select','multi_select','scale')
     OR p_display_order NOT BETWEEN 1 AND 999
     OR p_min_items NOT BETWEEN 1 AND 10
     OR p_is_required IS NULL OR p_is_active IS NULL
     OR p_placeholder IS NOT NULL AND char_length(p_placeholder) > 200
     OR p_description IS NOT NULL AND char_length(p_description) > 300 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_question_fields';
  END IF;

  IF p_question_type IN ('single_select','multi_select') THEN
    IF p_options IS NULL OR jsonb_typeof(p_options) IS DISTINCT FROM 'array' THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_question_options';
    END IF;
    SELECT count(*) INTO v_count
    FROM jsonb_array_elements(p_options) AS e(value)
    WHERE jsonb_typeof(e.value) IS DISTINCT FROM 'string'
       OR char_length(btrim(e.value #>> '{}')) NOT BETWEEN 1 AND 300;
    IF v_count > 0 OR jsonb_array_length(p_options) < 2 THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_question_options';
    END IF;
    SELECT count(DISTINCT btrim(value)) INTO v_unique_count
    FROM jsonb_array_elements_text(p_options) AS o(value);
    IF v_unique_count <> jsonb_array_length(p_options) THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'duplicate_question_options';
    END IF;
    SELECT COALESCE(jsonb_agg(to_jsonb(btrim(value)) ORDER BY ordinality), '[]'::jsonb)
    INTO v_new_options
    FROM jsonb_array_elements_text(p_options) WITH ORDINALITY AS o(value, ordinality);
  ELSE
    v_new_options := '[]'::jsonb;
  END IF;

  IF p_id IS NULL THEN
    UPDATE public.questions
    SET display_order = display_order + 1
    WHERE project_id = p_project_id AND display_order >= p_display_order;
    INSERT INTO public.questions (
      project_id, question_text, category, phase, question_type, is_required,
      is_active, placeholder, description, display_order, min_items, updated_at
    ) VALUES (
      p_project_id, btrim(p_question_text), btrim(p_category), p_phase, p_question_type,
      p_is_required, p_is_active, NULLIF(p_placeholder,''), NULLIF(p_description,''),
      p_display_order, p_min_items, clock_timestamp()
    ) RETURNING id INTO v_id;
  ELSE
    SELECT * INTO v_existing
    FROM public.questions
    WHERE id = p_id AND project_id = p_project_id
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'question_not_found';
    END IF;

    SELECT COALESCE(jsonb_agg(to_jsonb(option_text) ORDER BY display_order, id), '[]'::jsonb)
    INTO v_old_options
    FROM public.question_options
    WHERE question_id = p_id;

    IF EXISTS (SELECT 1 FROM public.answers AS a WHERE a.question_id = p_id) THEN
      -- Fail closed if even one answer cannot be tied to a published snapshot
      -- containing this question. Never delete or rewrite answer rows here.
      IF EXISTS (
        SELECT 1
        FROM public.answers AS a
        LEFT JOIN public.submissions AS s
          ON s.id = a.submission_id
         AND s.project_id = a.project_id
        LEFT JOIN public.project_versions AS pv
          ON pv.id = s.project_version_id
         AND pv.project_id = s.project_id
         AND pv.status = 'published'
        WHERE a.question_id = p_id
          AND (
            a.project_id IS DISTINCT FROM p_project_id
            OR s.id IS NULL
            OR pv.id IS NULL
            OR NOT EXISTS (
              SELECT 1
              FROM pg_catalog.jsonb_array_elements(
                CASE
                  WHEN pg_catalog.jsonb_typeof(pv.content->'questions') = 'array'
                    THEN pv.content->'questions'
                  ELSE '[]'::jsonb
                END
              ) AS item(value)
              WHERE item.value->>'id' = p_id::text
            )
          )
      ) THEN
        RAISE EXCEPTION USING
          ERRCODE = '23514',
          MESSAGE = 'question_has_unversioned_answers',
          DETAIL = 'At least one answer is not covered by an immutable published submission snapshot; no working content was changed.';
      END IF;
    END IF;

    IF v_existing.display_order <> p_display_order THEN
      IF p_display_order < v_existing.display_order THEN
        UPDATE public.questions SET display_order = display_order + 1
        WHERE project_id = p_project_id AND id <> p_id
          AND display_order >= p_display_order AND display_order < v_existing.display_order;
      ELSE
        UPDATE public.questions SET display_order = display_order - 1
        WHERE project_id = p_project_id AND id <> p_id
          AND display_order > v_existing.display_order AND display_order <= p_display_order;
      END IF;
    END IF;

    UPDATE public.questions SET
      question_text = btrim(p_question_text),
      category = btrim(p_category),
      phase = p_phase,
      question_type = p_question_type,
      is_required = p_is_required,
      is_active = p_is_active,
      placeholder = NULLIF(p_placeholder,''),
      description = NULLIF(p_description,''),
      display_order = p_display_order,
      min_items = p_min_items,
      updated_at = clock_timestamp()
    WHERE id = p_id AND project_id = p_project_id
    RETURNING id INTO v_id;
  END IF;

  -- Options are working content. Published JSON snapshots keep the historical
  -- option labels/order, while this transactional replacement affects future
  -- snapshots only.
  DELETE FROM public.question_options WHERE question_id = v_id;
  IF p_question_type IN ('single_select','multi_select') THEN
    INSERT INTO public.question_options (question_id, option_text, display_order)
    SELECT v_id, btrim(value), ordinality::integer
    FROM jsonb_array_elements_text(p_options) WITH ORDINALITY AS o(value, ordinality);
  END IF;

  RETURN v_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_save_question(uuid,uuid,text,text,text,text,boolean,boolean,text,text,integer,integer,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_save_question(uuid,uuid,text,text,text,text,boolean,boolean,text,text,integer,integer,jsonb) TO authenticated;

-- A question that is answered or referenced by a published snapshot is archived
-- instead of physically removed, so results and old pinned work remain intact.
CREATE OR REPLACE FUNCTION public.admin_delete_question(p_id uuid, p_project_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_project_active boolean;
BEGIN
  IF NOT COALESCE((SELECT private.is_admin()), false) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'admin_required';
  END IF;

  SELECT p.is_active INTO v_project_active
  FROM public.projects AS p
  WHERE p.id = p_project_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'project_not_found';
  END IF;
  IF v_project_active IS FALSE THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'project_archived';
  END IF;

  PERFORM 1
  FROM public.questions AS q
  WHERE q.id = p_id AND q.project_id = p_project_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN 'not_found';
  END IF;

  IF EXISTS (SELECT 1 FROM public.answers AS a WHERE a.question_id = p_id)
     OR EXISTS (
       SELECT 1
       FROM public.project_versions AS pv
       CROSS JOIN LATERAL pg_catalog.jsonb_array_elements(
         CASE
           WHEN pg_catalog.jsonb_typeof(pv.content->'questions') = 'array'
             THEN pv.content->'questions'
           ELSE '[]'::jsonb
         END
       ) AS item(value)
       WHERE pv.project_id = p_project_id
         AND pv.status = 'published'
         AND item.value->>'id' = p_id::text
     ) THEN
    UPDATE public.questions
    SET is_active = false, updated_at = clock_timestamp()
    WHERE id = p_id AND project_id = p_project_id;
    RETURN 'deactivated';
  END IF;

  DELETE FROM public.questions
  WHERE id = p_id AND project_id = p_project_id;
  RETURN 'deleted';
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_delete_question(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_question(uuid,uuid) TO authenticated;

COMMIT;
