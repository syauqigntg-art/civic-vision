CREATE OR REPLACE FUNCTION public.admin_delete_question(p_id uuid, p_project_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $function$
DECLARE
  v_project_active boolean;
  v_existing_project uuid;
BEGIN
  IF NOT COALESCE((SELECT private.is_admin()), false) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'admin_required';
  END IF;
  SELECT is_active INTO v_project_active FROM public.projects WHERE id = p_project_id;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'project_not_found'; END IF;
  IF v_project_active IS FALSE THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'project_archived'; END IF;
  SELECT project_id INTO v_existing_project FROM public.questions
  WHERE id = p_id AND project_id = p_project_id FOR UPDATE;
  IF NOT FOUND THEN RETURN 'not_found'; END IF;
  IF EXISTS (SELECT 1 FROM public.answers WHERE question_id = p_id) THEN
    UPDATE public.questions SET is_active = false, updated_at = now()
    WHERE id = p_id AND project_id = p_project_id;
    RETURN 'deactivated';
  END IF;
  DELETE FROM public.questions WHERE id = p_id AND project_id = p_project_id;
  RETURN 'deleted';
END;
$function$;
REVOKE ALL ON FUNCTION public.admin_delete_question(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_question(uuid,uuid) TO authenticated;
