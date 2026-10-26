-- Manual negative integration test for immutable project/LKPD version publication.
-- Run in the Supabase STAGING SQL Editor as the database owner AFTER applying
-- migration 20261026022000_add_project_content_versioning.sql.
-- Requires at least one administrator row in public.users. Everything rolls back.
BEGIN;

DO $setup$
DECLARE
  v_project_id uuid;
  v_version_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE role = 'admin') THEN
    RAISE EXCEPTION 'TEST PRECONDITION FAILED: public.users must contain an admin row';
  END IF;

  IF has_table_privilege('authenticated', 'public.project_versions', 'INSERT') THEN
    RAISE EXCEPTION 'FAIL: authenticated still has direct INSERT on project_versions';
  END IF;
  IF has_table_privilege('authenticated', 'public.project_versions', 'UPDATE') THEN
    RAISE EXCEPTION 'FAIL: authenticated still has direct UPDATE on project_versions';
  END IF;
  IF has_table_privilege('service_role', 'public.project_versions', 'INSERT')
     OR has_table_privilege('service_role', 'public.project_versions', 'UPDATE')
     OR has_table_privilege('service_role', 'public.project_versions', 'DELETE') THEN
    RAISE EXCEPTION 'FAIL: service_role still has direct write privileges on project_versions';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.admin_save_project_version_draft(uuid)', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'public.admin_publish_project_version(uuid,uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL: official draft/publish RPC is not executable by authenticated';
  END IF;
  IF NOT (
    SELECT p.prosecdef
    FROM pg_catalog.pg_proc AS p
    WHERE p.oid = 'public.admin_save_project_version_draft(uuid)'::regprocedure
  ) OR NOT (
    SELECT p.prosecdef
    FROM pg_catalog.pg_proc AS p
    WHERE p.oid = 'public.admin_publish_project_version(uuid,uuid)'::regprocedure
  ) THEN
    RAISE EXCEPTION 'FAIL: draft/publish RPC must be SECURITY DEFINER after direct table writes are revoked';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_trigger
    WHERE tgrelid = 'public.projects'::regclass
      AND tgname = 'projects_active_version_publish_guard'
      AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'FAIL: active-version pointer guard trigger is missing';
  END IF;

  INSERT INTO public.projects (title, is_active)
  VALUES ('__versioning_security_test__', true)
  RETURNING id INTO v_project_id;

  INSERT INTO public.project_versions (
    project_id, version_number, status, content, published_at
  )
  VALUES (
    v_project_id,
    1,
    'published',
    jsonb_build_object(
      'schema_version', 1,
      'project', jsonb_build_object('id', v_project_id, 'title', 'security test'),
      'videos', jsonb_build_array(jsonb_build_object('id', gen_random_uuid(), 'is_active', true)),
      'questions', jsonb_build_array(jsonb_build_object(
        'id', gen_random_uuid(), 'is_active', true, 'question_text', 'test question',
        'phase', 'think', 'question_type', 'text', 'question_options', '[]'::jsonb
      ))
    ),
    now()
  )
  RETURNING id INTO v_version_id;

  UPDATE public.projects
  SET active_version_id = v_version_id
  WHERE id = v_project_id;
END;
$setup$;

-- The trusted service role may read snapshots but cannot move the active
-- pointer with a direct table UPDATE either.
SET LOCAL ROLE service_role;
DO $service_role_pointer_test$
DECLARE
  v_project_id uuid;
  v_message text;
BEGIN
  SELECT id INTO v_project_id
  FROM public.projects
  WHERE title = '__versioning_security_test__'
  ORDER BY id
  LIMIT 1;

  IF has_table_privilege('service_role', 'public.projects', 'UPDATE') THEN
    BEGIN
      UPDATE public.projects SET active_version_id = NULL WHERE id = v_project_id;
      RAISE EXCEPTION 'TEST FAILED: service_role direct active_version_id change was accepted';
    EXCEPTION WHEN insufficient_privilege THEN
      GET STACKED DIAGNOSTICS v_message = MESSAGE_TEXT;
      IF v_message <> 'active_project_version_must_use_publish_rpc' THEN
        RAISE EXCEPTION 'TEST FAILED: service_role pointer write was rejected for an unexpected reason: %', v_message;
      END IF;
    END;
  END IF;
END;
$service_role_pointer_test$;
RESET ROLE;

-- Supply the identity of an existing administrator, then test through the
-- same authenticated role used by the admin dashboard.
SELECT set_config(
  'request.jwt.claim.sub',
  (SELECT id::text FROM public.users WHERE role = 'admin' ORDER BY id LIMIT 1),
  true
);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;

DO $negative_tests$
DECLARE
  v_project_id uuid;
  v_original_active_version uuid;
  v_draft_id uuid;
  v_message text;
BEGIN
  SELECT id, active_version_id
    INTO v_project_id, v_original_active_version
  FROM public.projects
  WHERE title = '__versioning_security_test__'
  ORDER BY id
  LIMIT 1;

  IF v_project_id IS NULL OR v_original_active_version IS NULL THEN
    RAISE EXCEPTION 'TEST SETUP FAILED: published fixture project/version was not found';
  END IF;

  -- Negative test 1: authenticated must not insert a forged published version.
  BEGIN
    INSERT INTO public.project_versions (project_id, version_number, status, content, published_at)
    VALUES (v_project_id, 999, 'published', '{"forged":true}'::jsonb, now());
    RAISE EXCEPTION 'TEST FAILED: direct published INSERT was accepted';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  -- Negative test 2: authenticated must not mutate any version directly.
  BEGIN
    UPDATE public.project_versions
    SET status = 'published', published_at = now(), content = '{"forged":true}'::jsonb
    WHERE id = v_original_active_version;
    RAISE EXCEPTION 'TEST FAILED: direct project_versions UPDATE was accepted';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  -- Negative test 3: when ordinary project UPDATE is available, the pointer
  -- trigger must reject changing the active snapshot outside the publish RPC.
  IF has_table_privilege('authenticated', 'public.projects', 'UPDATE') THEN
    BEGIN
      UPDATE public.projects
      SET active_version_id = NULL
      WHERE id = v_project_id;
      RAISE EXCEPTION 'TEST FAILED: direct active_version_id change was accepted';
    EXCEPTION WHEN insufficient_privilege THEN
      GET STACKED DIAGNOSTICS v_message = MESSAGE_TEXT;
      IF v_message <> 'active_project_version_must_use_publish_rpc' THEN
        RAISE EXCEPTION 'TEST FAILED: pointer write was rejected for an unexpected reason: %', v_message;
      END IF;
    END;
  END IF;

  -- Negative test 4: the official RPC still works for saving, but refuses to
  -- publish a draft built from a project with no active videos/questions.
  v_draft_id := public.admin_save_project_version_draft(v_project_id);
  IF v_draft_id IS NULL THEN
    RAISE EXCEPTION 'TEST FAILED: official draft-save RPC returned no draft id';
  END IF;

  BEGIN
    PERFORM public.admin_publish_project_version(v_project_id, v_draft_id);
    RAISE EXCEPTION 'TEST FAILED: invalid draft publication was accepted';
  EXCEPTION WHEN SQLSTATE '22023' THEN
    GET STACKED DIAGNOSTICS v_message = MESSAGE_TEXT;
    IF v_message <> 'project_version_validation_failed' THEN
      RAISE EXCEPTION 'TEST FAILED: invalid draft was rejected for an unexpected reason: %', v_message;
    END IF;
  END;

  IF (SELECT active_version_id FROM public.projects WHERE id = v_project_id)
      IS DISTINCT FROM v_original_active_version THEN
    RAISE EXCEPTION 'TEST FAILED: active version changed after invalid publication';
  END IF;

  RAISE NOTICE 'PASS: direct version writes blocked; pointer bypass rejected; draft-save RPC preserved; invalid publication rejected; active version unchanged.';
END;
$negative_tests$;

RESET ROLE;
ROLLBACK;
