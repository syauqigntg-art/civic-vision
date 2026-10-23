CREATE OR REPLACE FUNCTION public.admin_reorder_questions(p_project_id uuid, p_question_ids uuid[])
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $function$
DECLARE
  v_project_active boolean;
  v_total integer;
  v_distinct_ids integer;
  v_matching_ids integer;
BEGIN
  IF NOT COALESCE((SELECT private.is_admin()), false) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'admin_required';
  END IF;
  SELECT is_active INTO v_project_active FROM public.projects WHERE id = p_project_id;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'project_not_found'; END IF;
  IF v_project_active IS FALSE THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'project_archived'; END IF;
  IF p_question_ids IS NULL THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_question_order'; END IF;
  SELECT count(*) INTO v_total FROM public.questions WHERE project_id = p_project_id;
  SELECT count(DISTINCT x) INTO v_distinct_ids FROM unnest(p_question_ids) AS u(x);
  SELECT count(*) INTO v_matching_ids FROM unnest(p_question_ids) AS u(id)
    JOIN public.questions q ON q.id = u.id AND q.project_id = p_project_id;
  IF cardinality(p_question_ids) <> v_total OR v_distinct_ids <> cardinality(p_question_ids)
     OR v_matching_ids <> v_total THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_question_order';
  END IF;
  UPDATE public.questions q SET display_order = u.ordinality::integer, updated_at = now()
  FROM unnest(p_question_ids) WITH ORDINALITY AS u(id, ordinality)
  WHERE q.id = u.id AND q.project_id = p_project_id;
  RETURN true;
END;
$function$;
REVOKE ALL ON FUNCTION public.admin_reorder_questions(uuid,uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_reorder_questions(uuid,uuid[]) TO authenticated;
