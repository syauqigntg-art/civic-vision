-- Versioned project/LKPD publication.
-- Draft snapshots are isolated from the version used by students.
-- Existing projects receive an immutable published baseline during migration.
-- Do not apply to Production until reviewed and tested against the staging migration ledger.

BEGIN;

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE TABLE public.project_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  version_number integer NOT NULL CHECK (version_number > 0),
  status text NOT NULL CHECK (status IN ('draft', 'published')),
  content jsonb NOT NULL CHECK (jsonb_typeof(content) = 'object'),
  based_on_version_id uuid,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  published_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  CONSTRAINT project_versions_project_version_uq UNIQUE (project_id, id),
  CONSTRAINT project_versions_project_number_uq UNIQUE (project_id, version_number),
  CONSTRAINT project_versions_based_on_fk
    FOREIGN KEY (project_id, based_on_version_id)
    REFERENCES public.project_versions(project_id, id),
  CONSTRAINT project_versions_published_fields_check CHECK (
    (status = 'draft' AND published_at IS NULL AND published_by IS NULL)
    OR (status = 'published' AND published_at IS NOT NULL)
  )
);

CREATE UNIQUE INDEX project_versions_one_draft_per_project
  ON public.project_versions(project_id)
  WHERE status = 'draft';

ALTER TABLE public.projects
  ADD COLUMN active_version_id uuid;

ALTER TABLE public.submissions
  ADD COLUMN project_version_id uuid;

COMMENT ON TABLE public.project_versions IS
  'Immutable published content snapshots and a single editable draft snapshot per project.';
COMMENT ON COLUMN public.projects.active_version_id IS
  'The published snapshot served to groups that start a new submission.';
COMMENT ON COLUMN public.submissions.project_version_id IS
  'Immutable content snapshot selected when the submission was first started.';

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
    ), '[]'::jsonb)
  )
  FROM public.projects AS p
  WHERE p.id = p_project_id;
$function$;

REVOKE ALL ON FUNCTION private.build_project_version_content(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.build_project_version_content(uuid) TO authenticated, service_role;

-- Freeze every existing project as an initial published snapshot before changing
-- how student reads/writes resolve their content.
INSERT INTO public.project_versions (
  project_id, version_number, status, content, published_at
)
SELECT p.id, 1, 'published', private.build_project_version_content(p.id), now()
FROM public.projects AS p;

UPDATE public.projects AS p
SET active_version_id = pv.id
FROM public.project_versions AS pv
WHERE pv.project_id = p.id
  AND pv.version_number = 1
  AND pv.status = 'published';

UPDATE public.submissions AS s
SET project_version_id = p.active_version_id
FROM public.projects AS p
WHERE p.id = s.project_id
  AND s.project_version_id IS NULL;

ALTER TABLE public.projects
  ADD CONSTRAINT projects_active_version_fk
  FOREIGN KEY (id, active_version_id)
  REFERENCES public.project_versions(project_id, id);

ALTER TABLE public.submissions
  ALTER COLUMN project_version_id SET NOT NULL,
  ADD CONSTRAINT submissions_project_version_fk
    FOREIGN KEY (project_id, project_version_id)
    REFERENCES public.project_versions(project_id, id);

CREATE INDEX project_versions_project_status_idx
  ON public.project_versions(project_id, status, version_number DESC);
CREATE INDEX submissions_project_version_idx
  ON public.submissions(project_id, project_version_id);

ALTER TABLE public.project_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin manage project versions" ON public.project_versions;
CREATE POLICY "admin manage project versions"
  ON public.project_versions
  FOR ALL TO authenticated
  USING ((SELECT private.is_admin()))
  WITH CHECK ((SELECT private.is_admin()));

REVOKE ALL ON TABLE public.project_versions FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.project_versions TO authenticated;
GRANT SELECT ON TABLE public.project_versions TO service_role;

CREATE OR REPLACE FUNCTION private.protect_published_project_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
BEGIN
  IF OLD.status = 'published' THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'published_project_version_is_immutable';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS project_versions_immutable ON public.project_versions;
CREATE TRIGGER project_versions_immutable
  BEFORE UPDATE OR DELETE ON public.project_versions
  FOR EACH ROW
  EXECUTE FUNCTION private.protect_published_project_version();

CREATE OR REPLACE FUNCTION private.validate_project_version_content(p_content jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $function$
DECLARE
  v_errors jsonb := '[]'::jsonb;
  v_active_videos integer := 0;
  v_active_questions integer := 0;
  v_question jsonb;
  v_options jsonb;
  v_option_count integer;
BEGIN
  IF p_content IS NULL OR jsonb_typeof(p_content) IS DISTINCT FROM 'object' THEN
    RETURN jsonb_build_object(
      'valid', false,
      'errors', jsonb_build_array('Snapshot konten tidak valid.'),
      'warnings', '[]'::jsonb
    );
  END IF;

  IF COALESCE(btrim(p_content #>> '{project,title}'), '') = '' THEN
    v_errors := v_errors || jsonb_build_array('Judul proyek wajib diisi.');
  END IF;

  IF jsonb_typeof(p_content->'videos') IS DISTINCT FROM 'array' THEN
    v_errors := v_errors || jsonb_build_array('Daftar video tidak valid.');
  ELSE
    SELECT count(*) INTO v_active_videos
    FROM jsonb_array_elements(p_content->'videos') AS item(value)
    WHERE COALESCE((item.value->>'is_active')::boolean, false);
    IF v_active_videos = 0 THEN
      v_errors := v_errors || jsonb_build_array('Minimal satu video kasus harus aktif.');
    END IF;
  END IF;

  IF jsonb_typeof(p_content->'questions') IS DISTINCT FROM 'array' THEN
    v_errors := v_errors || jsonb_build_array('Daftar pertanyaan LKPD tidak valid.');
  ELSE
    SELECT count(*) INTO v_active_questions
    FROM jsonb_array_elements(p_content->'questions') AS item(value)
    WHERE COALESCE((item.value->>'is_active')::boolean, false);
    IF v_active_questions = 0 THEN
      v_errors := v_errors || jsonb_build_array('Minimal satu pertanyaan LKPD harus aktif.');
    END IF;

    FOR v_question IN
      SELECT item.value
      FROM jsonb_array_elements(p_content->'questions') AS item(value)
      WHERE COALESCE((item.value->>'is_active')::boolean, false)
    LOOP
      IF COALESCE(btrim(v_question->>'question_text'), '') = '' THEN
        v_errors := v_errors || jsonb_build_array('Pertanyaan aktif tidak boleh kosong.');
      END IF;

      IF COALESCE(v_question->>'phase', '') NOT IN ('see','think','connect','act') THEN
        v_errors := v_errors || jsonb_build_array(
          'Setiap pertanyaan aktif harus ditempatkan pada tahap SEE, THINK, CONNECT, atau ACT.'
        );
      END IF;

      IF COALESCE(v_question->>'question_type', '') NOT IN
        ('text','textarea','multiple_text','single_select','multi_select','scale') THEN
        v_errors := v_errors || jsonb_build_array('Tipe pertanyaan aktif tidak dikenali.');
      END IF;

      IF v_question->>'question_type' IN ('single_select','multi_select') THEN
        v_options := v_question->'question_options';
        IF jsonb_typeof(v_options) IS DISTINCT FROM 'array' THEN
          v_option_count := 0;
        ELSE
          SELECT count(*) INTO v_option_count
          FROM jsonb_array_elements(v_options) AS option_item(value)
          WHERE COALESCE(btrim(option_item.value->>'option_text'), '') <> '';
        END IF;
        IF v_option_count < 2 THEN
          v_errors := v_errors || jsonb_build_array(
            'Pertanyaan pilihan harus memiliki minimal dua opsi yang terisi.'
          );
        END IF;
      END IF;
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'valid', jsonb_array_length(v_errors) = 0,
    'errors', v_errors,
    'warnings', '[]'::jsonb
  );
END;
$function$;

REVOKE ALL ON FUNCTION private.validate_project_version_content(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.validate_project_version_content(jsonb) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_save_project_version_draft(p_project_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_project_active boolean;
  v_content jsonb;
  v_version_id uuid;
  v_active_version_id uuid;
  v_next_number integer;
BEGIN
  IF NOT COALESCE((SELECT private.is_admin()), false) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'admin_required';
  END IF;

  SELECT p.is_active, p.active_version_id
    INTO v_project_active, v_active_version_id
  FROM public.projects AS p
  WHERE p.id = p_project_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'project_not_found';
  END IF;
  IF v_project_active IS FALSE THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'project_archived';
  END IF;

  v_content := private.build_project_version_content(p_project_id);
  IF v_content IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'project_content_not_found';
  END IF;

  SELECT pv.id INTO v_version_id
  FROM public.project_versions AS pv
  WHERE pv.project_id = p_project_id
    AND pv.status = 'draft'
  FOR UPDATE;

  IF v_version_id IS NOT NULL THEN
    UPDATE public.project_versions
    SET content = v_content,
        updated_at = now()
    WHERE id = v_version_id
      AND project_id = p_project_id
      AND status = 'draft';
    RETURN v_version_id;
  END IF;

  SELECT COALESCE(max(pv.version_number), 0) + 1
    INTO v_next_number
  FROM public.project_versions AS pv
  WHERE pv.project_id = p_project_id;

  INSERT INTO public.project_versions (
    project_id, version_number, status, content,
    based_on_version_id, created_by
  )
  VALUES (
    p_project_id, v_next_number, 'draft', v_content,
    v_active_version_id, (SELECT auth.uid())
  )
  RETURNING id INTO v_version_id;

  RETURN v_version_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_save_project_version_draft(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_save_project_version_draft(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_validate_project_version(
  p_project_id uuid,
  p_version_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_content jsonb;
BEGIN
  IF NOT COALESCE((SELECT private.is_admin()), false) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'admin_required';
  END IF;

  SELECT pv.content INTO v_content
  FROM public.project_versions AS pv
  WHERE pv.id = p_version_id
    AND pv.project_id = p_project_id
    AND pv.status = 'draft';
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'project_version_draft_not_found';
  END IF;

  RETURN private.validate_project_version_content(v_content);
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_validate_project_version(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_validate_project_version(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_publish_project_version(
  p_project_id uuid,
  p_version_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_project_active boolean;
  v_content jsonb;
  v_status text;
  v_validation jsonb;
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

  SELECT pv.content, pv.status INTO v_content, v_status
  FROM public.project_versions AS pv
  WHERE pv.id = p_version_id
    AND pv.project_id = p_project_id
  FOR UPDATE;
  IF NOT FOUND OR v_status IS DISTINCT FROM 'draft' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'project_version_draft_not_found';
  END IF;

  v_validation := private.validate_project_version_content(v_content);
  IF COALESCE((v_validation->>'valid')::boolean, false) IS NOT TRUE THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'project_version_validation_failed',
      DETAIL = v_validation::text;
  END IF;

  UPDATE public.project_versions
  SET status = 'published',
      published_at = now(),
      published_by = (SELECT auth.uid()),
      updated_at = now()
  WHERE id = p_version_id
    AND project_id = p_project_id
    AND status = 'draft';

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'project_version_publish_conflict';
  END IF;

  UPDATE public.projects
  SET active_version_id = p_version_id,
      updated_at = now()
  WHERE id = p_project_id;

  RETURN p_version_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_publish_project_version(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_publish_project_version(uuid, uuid) TO authenticated;

-- Keep current and historical submissions attached to their original snapshot.
CREATE OR REPLACE FUNCTION public.begin_submission(code text, vid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_group_id uuid;
  v_project_id uuid;
  v_version_id uuid;
  v_content jsonb;
BEGIN
  SELECT g.id, g.project_id, p.active_version_id, pv.content
    INTO v_group_id, v_project_id, v_version_id, v_content
  FROM public.groups AS g
  JOIN public.projects AS p
    ON p.id = g.project_id
   AND p.is_active IS TRUE
  JOIN public.project_versions AS pv
    ON pv.id = p.active_version_id
   AND pv.project_id = p.id
   AND pv.status = 'published'
  WHERE g.access_code = pg_catalog.upper(pg_catalog.btrim(code));

  IF v_group_id IS NULL OR v_version_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'project_version_not_published';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.group_videos AS gv
    WHERE gv.group_id = v_group_id
      AND gv.project_id = v_project_id
      AND gv.video_id = vid
  ) OR NOT EXISTS (
    SELECT 1
    FROM pg_catalog.jsonb_array_elements(v_content->'videos') AS video(value)
    WHERE video.value->>'id' = vid::text
      AND COALESCE((video.value->>'is_active')::boolean, false)
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'video tidak ditugaskan kepada kelompok';
  END IF;

  INSERT INTO public.submissions(project_id, group_id, video_id, project_version_id)
  VALUES (v_project_id, v_group_id, vid, v_version_id)
  ON CONFLICT (group_id) DO UPDATE
  SET video_id = CASE
    WHEN public.submissions.status = 'draft'
     AND public.submissions.project_version_id = EXCLUDED.project_version_id
    THEN EXCLUDED.video_id
    ELSE public.submissions.video_id
  END,
  updated_at = CASE
    WHEN public.submissions.status = 'draft'
     AND public.submissions.project_version_id = EXCLUDED.project_version_id
    THEN now()
    ELSE public.submissions.updated_at
  END;
END;
$function$;

REVOKE ALL ON FUNCTION public.begin_submission(text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.begin_submission(text, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.get_group(code text)
RETURNS json
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT json_build_object(
    'id', g.id,
    'group_number', g.group_number,
    'group_name', g.group_name,
    'class_name', g.class_name,
    'leader_name', g.leader_name,
    'members', COALESCE((
      SELECT json_agg(gm.name ORDER BY gm.member_order)
      FROM public.group_members AS gm
      WHERE gm.group_id = g.id
    ), '[]'::json),
    'video_ids', COALESCE((
      SELECT json_agg(gv.video_id ORDER BY gv.video_id)
      FROM public.group_videos AS gv
      WHERE gv.group_id = g.id
    ), '[]'::json),
    'active_version_number', (
      SELECT pv.version_number
      FROM public.projects AS p
      JOIN public.project_versions AS pv
        ON pv.id = p.active_version_id
       AND pv.project_id = p.id
      WHERE p.id = g.project_id
    ),
    'submission', (
      SELECT json_build_object(
        'video_id', s.video_id,
        'status', s.status,
        'submitted_at', s.submitted_at,
        'project_version_id', s.project_version_id,
        'project_version_number', pv.version_number
      )
      FROM public.submissions AS s
      JOIN public.project_versions AS pv
        ON pv.id = s.project_version_id
       AND pv.project_id = s.project_id
      WHERE s.group_id = g.id
    )
  )
  FROM public.groups AS g
  WHERE g.access_code = pg_catalog.upper(pg_catalog.btrim(code));
$function$;

REVOKE ALL ON FUNCTION public.get_group(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_group(text) TO service_role;

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
  v_version_content jsonb;
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

  SELECT s.id, s.status, pv.content
    INTO v_submission_id, v_submission_status, v_version_content
  FROM public.submissions AS s
  JOIN public.project_versions AS pv
    ON pv.id = s.project_version_id
   AND pv.project_id = s.project_id
  WHERE s.group_id = v_group_id
    AND s.project_id = v_project_id
  FOR UPDATE OF s;

  IF v_submission_id IS NULL
     OR v_submission_status IS DISTINCT FROM 'draft' THEN
    RETURN false;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.jsonb_array_elements(v_version_content->'questions') AS item(value)
    WHERE item.value->>'id' = qid::text
      AND COALESCE((item.value->>'is_active')::boolean, false)
  ) THEN
    RETURN false;
  END IF;

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

REVOKE ALL ON FUNCTION public.save_answer(text, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_answer(text, uuid, text) TO service_role;

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
  v_version_content jsonb;
  v_question jsonb;
  v_question_id uuid;
  v_answer text;
  v_json jsonb;
  v_item_count integer;
  v_min_items integer;
  v_question_type text;
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

  SELECT s.id, s.status, pv.content
    INTO v_submission_id, v_submission_status, v_version_content
  FROM public.submissions AS s
  JOIN public.project_versions AS pv
    ON pv.id = s.project_version_id
   AND pv.project_id = s.project_id
  WHERE s.group_id = v_group_id
    AND s.project_id = v_project_id
  FOR UPDATE OF s;

  IF v_submission_id IS NULL THEN
    RETURN 'belum mulai';
  END IF;
  IF v_submission_status = 'submitted' THEN
    RETURN 'sudah terkirim';
  END IF;
  IF COALESCE(v_group_name, '') = '' OR COALESCE(v_leader_name, '') = '' THEN
    RETURN 'identitas belum lengkap';
  END IF;

  FOR v_question IN
    SELECT item.value
    FROM pg_catalog.jsonb_array_elements(v_version_content->'questions') AS item(value)
    WHERE COALESCE((item.value->>'is_active')::boolean, false)
      AND COALESCE((item.value->>'is_required')::boolean, false)
  LOOP
    v_question_id := (v_question->>'id')::uuid;
    v_question_type := v_question->>'question_type';
    v_min_items := COALESCE((v_question->>'min_items')::integer, 1);

    SELECT a.answer_text INTO v_answer
    FROM public.answers AS a
    WHERE a.submission_id = v_submission_id
      AND a.project_id = v_project_id
      AND a.question_id = v_question_id;

    IF COALESCE(pg_catalog.btrim(v_answer), '') = '' THEN
      RETURN 'belum lengkap';
    END IF;

    IF v_question_type IN ('multiple_text', 'multi_select') THEN
      BEGIN
        v_json := v_answer::jsonb;
      EXCEPTION WHEN others THEN
        RETURN 'belum lengkap';
      END;

      IF pg_catalog.jsonb_typeof(v_json) IS DISTINCT FROM 'array' THEN
        RETURN 'belum lengkap';
      END IF;

      IF v_question_type = 'multiple_text' THEN
        SELECT pg_catalog.count(*) INTO v_item_count
        FROM pg_catalog.jsonb_array_elements_text(v_json) AS item(value)
        WHERE pg_catalog.btrim(item.value) <> '';
        IF v_item_count < v_min_items THEN
          RETURN 'belum lengkap';
        END IF;
      ELSE
        IF pg_catalog.jsonb_array_length(v_json) = 0 OR EXISTS (
          SELECT 1
          FROM pg_catalog.jsonb_array_elements_text(v_json) AS selected(value)
          WHERE NOT EXISTS (
            SELECT 1
            FROM pg_catalog.jsonb_array_elements(v_question->'question_options') AS option_item(value)
            WHERE option_item.value->>'option_text' = selected.value
          )
        ) THEN
          RETURN 'belum lengkap';
        END IF;
      END IF;
    ELSIF v_question_type = 'single_select' THEN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_catalog.jsonb_array_elements(v_question->'question_options') AS option_item(value)
        WHERE option_item.value->>'option_text' = v_answer
      ) THEN
        RETURN 'belum lengkap';
      END IF;
    ELSIF v_question_type = 'scale' THEN
      IF v_answer !~ '^[1-5]$' THEN
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

REVOKE ALL ON FUNCTION public.submit_group(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_group(text) TO service_role;



-- A row referenced by any published snapshot must remain available for old
-- drafts, answers, media URLs and teacher review. Remove/deactivate it instead.
CREATE OR REPLACE FUNCTION private.prevent_published_content_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
BEGIN
  IF TG_TABLE_NAME = 'questions' AND EXISTS (
    SELECT 1
    FROM public.project_versions AS pv
    CROSS JOIN LATERAL pg_catalog.jsonb_array_elements(pv.content->'questions') AS item(value)
    WHERE pv.project_id = OLD.project_id
      AND pv.status = 'published'
      AND item.value->>'id' = OLD.id::text
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'question_referenced_by_published_version_deactivate_instead';
  END IF;

  IF TG_TABLE_NAME = 'videos' AND EXISTS (
    SELECT 1
    FROM public.project_versions AS pv
    CROSS JOIN LATERAL pg_catalog.jsonb_array_elements(pv.content->'videos') AS item(value)
    WHERE pv.project_id = OLD.project_id
      AND pv.status = 'published'
      AND item.value->>'id' = OLD.id::text
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'video_referenced_by_published_version_deactivate_instead';
  END IF;

  RETURN OLD;
END;
$function$;

DROP TRIGGER IF EXISTS questions_published_version_delete_guard ON public.questions;
CREATE TRIGGER questions_published_version_delete_guard
  BEFORE DELETE ON public.questions
  FOR EACH ROW
  EXECUTE FUNCTION private.prevent_published_content_delete();

DROP TRIGGER IF EXISTS videos_published_version_delete_guard ON public.videos;
CREATE TRIGGER videos_published_version_delete_guard
  BEFORE DELETE ON public.videos
  FOR EACH ROW
  EXECUTE FUNCTION private.prevent_published_content_delete();

REVOKE ALL ON FUNCTION private.prevent_published_content_delete() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.prevent_published_content_delete() TO authenticated, service_role;

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
  WHERE p.id = p_project_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'project_not_found';
  END IF;
  IF v_project_active IS FALSE THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'project_archived';
  END IF;

  PERFORM 1
  FROM public.questions AS q
  WHERE q.id = p_id
    AND q.project_id = p_project_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN 'not_found';
  END IF;

  IF EXISTS (SELECT 1 FROM public.answers AS a WHERE a.question_id = p_id)
     OR EXISTS (
       SELECT 1
       FROM public.project_versions AS pv
       CROSS JOIN LATERAL pg_catalog.jsonb_array_elements(pv.content->'questions') AS item(value)
       WHERE pv.project_id = p_project_id
         AND pv.status = 'published'
         AND item.value->>'id' = p_id::text
     ) THEN
    UPDATE public.questions
    SET is_active = false, updated_at = now()
    WHERE id = p_id AND project_id = p_project_id;
    RETURN 'deactivated';
  END IF;

  DELETE FROM public.questions
  WHERE id = p_id AND project_id = p_project_id;
  RETURN 'deleted';
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_delete_question(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_question(uuid, uuid) TO authenticated;

COMMIT;
