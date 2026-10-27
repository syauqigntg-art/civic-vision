BEGIN;

-- Logical deletion makes a question disappear from the current working bank
-- without breaking answers or immutable snapshots that refer to its ID.
ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

COMMENT ON COLUMN public.questions.deleted_at IS
  'When set, the question is removed from the working bank and omitted from newly built LKPD snapshots; historical answers and published snapshots are retained.';

CREATE INDEX IF NOT EXISTS questions_project_visible_order_idx
  ON public.questions(project_id, display_order)
  WHERE deleted_at IS NULL;

-- New snapshots exclude logically deleted working questions. Published snapshots
-- that already exist are immutable and are not updated by this migration.
CREATE OR REPLACE FUNCTION private.build_project_version_content(p_project_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT jsonb_build_object(
    'schema_version', 1,
    'project', jsonb_build_object(
      'id', p.id,
      'title', p.title,
      'tagline', p.tagline,
      'description', p.description,
      'subject', p.subject,
      'grade', p.grade,
      'phase', p.phase,
      'duration', p.duration
    ),
    'videos', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', v.id,
          'project_id', v.project_id,
          'number', v.number,
          'title', v.title,
          'category', v.category,
          'description', v.description,
          'video_url', v.video_url,
          'thumbnail_url', v.thumbnail_url,
          'duration', v.duration,
          'is_active', COALESCE(v.is_active, true)
        ) ORDER BY v.number, v.id
      )
      FROM public.videos AS v
      WHERE v.project_id = p.id
    ), '[]'::jsonb),
    'questions', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', q.id,
          'project_id', q.project_id,
          'category', q.category,
          'question_text', q.question_text,
          'description', q.description,
          'question_type', q.question_type,
          'placeholder', q.placeholder,
          'phase', q.phase,
          'is_required', COALESCE(q.is_required, true),
          'min_items', q.min_items,
          'display_order', q.display_order,
          'is_active', COALESCE(q.is_active, true),
          'question_options', COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object(
                'option_text', qo.option_text,
                'display_order', qo.display_order
              ) ORDER BY qo.display_order, qo.id
            )
            FROM public.question_options AS qo
            WHERE qo.question_id = q.id
          ), '[]'::jsonb)
        ) ORDER BY q.display_order, q.id
      )
      FROM public.questions AS q
      WHERE q.project_id = p.id
        AND q.deleted_at IS NULL
    ), '[]'::jsonb)
  )
  FROM public.projects AS p
  WHERE p.id = p_project_id;
$function$;

REVOKE ALL ON FUNCTION private.build_project_version_content(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.build_project_version_content(uuid) TO authenticated, service_role;

-- Keep authorization, project scoping, archived-project protection and locking.
-- A deleted question is hidden in the working bank even if historical answers
-- exist or an immutable published snapshot contains its original ID.
CREATE OR REPLACE FUNCTION public.admin_delete_question(p_id uuid, p_project_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_project_active boolean;
  v_deleted_at timestamptz;
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

  SELECT q.deleted_at INTO v_deleted_at
  FROM public.questions AS q
  WHERE q.id = p_id
    AND q.project_id = p_project_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN 'not_found';
  END IF;
  IF v_deleted_at IS NOT NULL THEN
    RETURN 'already_deleted';
  END IF;

  UPDATE public.questions
  SET is_active = false,
      deleted_at = COALESCE(deleted_at, clock_timestamp()),
      updated_at = clock_timestamp()
  WHERE id = p_id
    AND project_id = p_project_id
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN 'already_deleted';
  END IF;

  RETURN 'deleted';
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_delete_question(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_question(uuid,uuid) TO authenticated;

COMMIT;
