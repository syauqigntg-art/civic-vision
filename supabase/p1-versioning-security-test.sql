-- Staging integration test for immutable project/LKPD version publication.
-- Run in the Supabase STAGING SQL Editor as the database owner AFTER applying
-- migration 20261026090535_add_project_content_versioning.sql.
-- All fixtures, including any temporary auth users, are rolled back at the end.
BEGIN;

DO $setup$
DECLARE
  v_admin_id uuid;
  v_student_id uuid;
  v_project_id uuid;
  v_other_project_id uuid;
  v_video_id uuid;
  v_question_id uuid;
  v_version_id uuid;
  v_other_version_id uuid;
BEGIN
  -- Staging is allowed to be empty. Create test-only Auth identities inside
  -- this transaction; the final ROLLBACK removes them and their public.users rows.
  SELECT id INTO v_admin_id
  FROM public.users
  WHERE role = 'admin'
  ORDER BY id
  LIMIT 1;

  IF v_admin_id IS NULL THEN
    v_admin_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) VALUES (
      v_admin_id, 'authenticated', 'authenticated',
      'versioning-test-admin-' || v_admin_id::text || '@example.invalid',
      '', now(), '{"provider":"email","providers":["email"]}'::jsonb,
      '{"name":"Temporary Versioning Test Admin"}'::jsonb, now(), now()
    );
    UPDATE public.users SET role = 'admin' WHERE id = v_admin_id;
  END IF;

  v_student_id := gen_random_uuid();
  INSERT INTO auth.users (
    id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    v_student_id, 'authenticated', 'authenticated',
    'versioning-test-student-' || v_student_id::text || '@example.invalid',
    '', now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Temporary Versioning Test Student"}'::jsonb, now(), now()
  );

  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = v_admin_id AND role = 'admin')
     OR NOT EXISTS (SELECT 1 FROM public.users WHERE id = v_student_id AND role <> 'admin') THEN
    RAISE EXCEPTION 'TEST SETUP FAILED: temporary admin/student identity could not be prepared';
  END IF;

  IF has_table_privilege('authenticated', 'public.project_versions', 'INSERT') THEN
    RAISE EXCEPTION 'FAIL: authenticated still has direct INSERT on project_versions';
  END IF;
  IF has_table_privilege('authenticated', 'public.project_versions', 'UPDATE') THEN
    RAISE EXCEPTION 'FAIL: authenticated still has direct UPDATE on project_versions';
  END IF;
  IF has_table_privilege('authenticated', 'public.project_versions', 'DELETE') THEN
    RAISE EXCEPTION 'FAIL: authenticated still has direct DELETE on project_versions';
  END IF;
  IF has_table_privilege('anon', 'public.project_versions', 'SELECT')
     OR has_table_privilege('anon', 'public.project_versions', 'INSERT')
     OR has_table_privilege('anon', 'public.project_versions', 'UPDATE')
     OR has_table_privilege('anon', 'public.project_versions', 'DELETE') THEN
    RAISE EXCEPTION 'FAIL: anon has unnecessary project_versions table privileges';
  END IF;
  IF NOT has_table_privilege('authenticated', 'public.project_versions', 'SELECT')
     OR NOT has_table_privilege('service_role', 'public.project_versions', 'SELECT') THEN
    RAISE EXCEPTION 'FAIL: authenticated/service_role must retain read-only access to project_versions';
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
  IF has_function_privilege('anon', 'public.admin_save_project_version_draft(uuid)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.admin_publish_project_version(uuid,uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL: anon must not be able to execute administrative versioning RPCs';
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

  v_video_id := gen_random_uuid();
  v_question_id := gen_random_uuid();
  INSERT INTO public.videos (id, project_id, number, title, is_active)
  VALUES (v_video_id, v_project_id, 1, 'versioning security test video', true);
  INSERT INTO public.questions (
    id, project_id, category, question_text, question_type, phase,
    display_order, is_required, is_active
  ) VALUES (
    v_question_id, v_project_id, 'security-test', 'versioning test question',
    'text', 'think', 1, true, true
  );

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
      'videos', jsonb_build_array(jsonb_build_object(
        'id', v_video_id, 'project_id', v_project_id, 'number', 1,
        'title', 'versioning security test video', 'is_active', true
      )),
      'questions', jsonb_build_array(jsonb_build_object(
        'id', v_question_id, 'project_id', v_project_id, 'is_active', true,
        'question_text', 'versioning test question', 'phase', 'think',
        'question_type', 'text', 'is_required', true, 'question_options', '[]'::jsonb
      ))
    ),
    now()
  )
  RETURNING id INTO v_version_id;

  UPDATE public.projects
  SET active_version_id = v_version_id
  WHERE id = v_project_id;

  -- Foreign-project published version used to prove RPC project scoping.
  INSERT INTO public.projects (title, is_active)
  VALUES ('__versioning_security_test_other_project__', true)
  RETURNING id INTO v_other_project_id;
  INSERT INTO public.project_versions (
    project_id, version_number, status, content, published_at
  ) VALUES (
    v_other_project_id, 1, 'published',
    jsonb_build_object(
      'schema_version', 1,
      'project', jsonb_build_object('id', v_other_project_id, 'title', 'other security test project'),
      'videos', '[]'::jsonb,
      'questions', '[]'::jsonb
    ), now()
  ) RETURNING id INTO v_other_version_id;
  UPDATE public.projects SET active_version_id = v_other_version_id WHERE id = v_other_project_id;

  PERFORM set_config('versioning_test.admin_id', v_admin_id::text, true);
  PERFORM set_config('versioning_test.student_id', v_student_id::text, true);
  PERFORM set_config('versioning_test.project_id', v_project_id::text, true);
  PERFORM set_config('versioning_test.video_id', v_video_id::text, true);
  PERFORM set_config('versioning_test.question_id', v_question_id::text, true);
  PERFORM set_config('versioning_test.version1_id', v_version_id::text, true);
  PERFORM set_config('versioning_test.other_project_id', v_other_project_id::text, true);
  PERFORM set_config('versioning_test.other_version_id', v_other_version_id::text, true);
END;
$setup$;

-- Explicit anon negative tests: no table DML/read access and no admin RPC execution.
SET LOCAL ROLE anon;
DO $anon_tests$
DECLARE
  v_project_id uuid := current_setting('versioning_test.project_id')::uuid;
  v_version_id uuid := current_setting('versioning_test.version1_id')::uuid;
  v_message text;
BEGIN
  BEGIN
    INSERT INTO public.project_versions (project_id, version_number, status, content, published_at)
    VALUES (v_project_id, 999, 'published', '{"forged":true}'::jsonb, now());
    RAISE EXCEPTION 'TEST FAILED: anon direct INSERT was accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    UPDATE public.project_versions SET content = '{"forged":true}'::jsonb WHERE id = v_version_id;
    RAISE EXCEPTION 'TEST FAILED: anon direct UPDATE was accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    DELETE FROM public.project_versions WHERE id = v_version_id;
    RAISE EXCEPTION 'TEST FAILED: anon direct DELETE was accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    PERFORM public.admin_save_project_version_draft(v_project_id);
    RAISE EXCEPTION 'TEST FAILED: anon admin_save RPC invocation was accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    PERFORM public.admin_publish_project_version(v_project_id, v_version_id);
    RAISE EXCEPTION 'TEST FAILED: anon admin_publish RPC invocation was accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  RAISE NOTICE 'PASS: anon cannot read/write project_versions or execute admin versioning RPCs.';
END;
$anon_tests$;
RESET ROLE;

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

-- Test authenticated requests with a real non-admin fixture and with no UID.
SELECT set_config('request.jwt.claim.sub', current_setting('versioning_test.student_id'), true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;
DO $non_admin_rpc_tests$
DECLARE
  v_project_id uuid := current_setting('versioning_test.project_id')::uuid;
  v_version_id uuid := current_setting('versioning_test.version1_id')::uuid;
  v_message text;
BEGIN
  BEGIN
    PERFORM public.admin_save_project_version_draft(v_project_id);
    RAISE EXCEPTION 'TEST FAILED: non-admin draft-save RPC was accepted';
  EXCEPTION WHEN insufficient_privilege THEN
    GET STACKED DIAGNOSTICS v_message = MESSAGE_TEXT;
    IF v_message <> 'admin_required' THEN
      RAISE EXCEPTION 'TEST FAILED: non-admin draft-save rejected unexpectedly: %', v_message;
    END IF;
  END;

  BEGIN
    PERFORM public.admin_publish_project_version(v_project_id, v_version_id);
    RAISE EXCEPTION 'TEST FAILED: non-admin publish RPC was accepted';
  EXCEPTION WHEN insufficient_privilege THEN
    GET STACKED DIAGNOSTICS v_message = MESSAGE_TEXT;
    IF v_message <> 'admin_required' THEN
      RAISE EXCEPTION 'TEST FAILED: non-admin publish rejected unexpectedly: %', v_message;
    END IF;
  END;
END;
$non_admin_rpc_tests$;
RESET ROLE;

SELECT set_config('request.jwt.claim.sub', '', true);
SET LOCAL ROLE authenticated;
DO $unauthenticated_rpc_tests$
DECLARE
  v_project_id uuid := current_setting('versioning_test.project_id')::uuid;
  v_version_id uuid := current_setting('versioning_test.version1_id')::uuid;
  v_message text;
BEGIN
  BEGIN
    PERFORM public.admin_save_project_version_draft(v_project_id);
    RAISE EXCEPTION 'TEST FAILED: request without an authenticated UID could save a draft';
  EXCEPTION WHEN insufficient_privilege THEN
    GET STACKED DIAGNOSTICS v_message = MESSAGE_TEXT;
    IF v_message <> 'admin_required' THEN
      RAISE EXCEPTION 'TEST FAILED: unauthenticated draft-save rejected unexpectedly: %', v_message;
    END IF;
  END;

  BEGIN
    PERFORM public.admin_publish_project_version(v_project_id, v_version_id);
    RAISE EXCEPTION 'TEST FAILED: request without an authenticated UID could publish';
  EXCEPTION WHEN insufficient_privilege THEN
    GET STACKED DIAGNOSTICS v_message = MESSAGE_TEXT;
    IF v_message <> 'admin_required' THEN
      RAISE EXCEPTION 'TEST FAILED: unauthenticated publish rejected unexpectedly: %', v_message;
    END IF;
  END;
END;
$unauthenticated_rpc_tests$;
RESET ROLE;

-- The administrator can create and publish a valid draft through the official
-- RPC. Publishing v2 must not change the stored v1 snapshot.
SELECT set_config('request.jwt.claim.sub', current_setting('versioning_test.admin_id'), true);
SET LOCAL ROLE authenticated;
DO $positive_publication$
DECLARE
  v_project_id uuid := current_setting('versioning_test.project_id')::uuid;
  v_version1_id uuid := current_setting('versioning_test.version1_id')::uuid;
  v_other_version_id uuid := current_setting('versioning_test.other_version_id')::uuid;
  v_draft_id uuid;
  v_active_id uuid;
  v_v1_content jsonb;
  v_v2_status text;
  v_message text;
BEGIN
  SELECT content INTO v_v1_content
  FROM public.project_versions WHERE id = v_version1_id AND status = 'published';
  IF v_v1_content IS NULL THEN
    RAISE EXCEPTION 'TEST SETUP FAILED: initial published v1 snapshot not found';
  END IF;

  v_draft_id := public.admin_save_project_version_draft(v_project_id);
  IF v_draft_id IS NULL THEN
    RAISE EXCEPTION 'TEST FAILED: official draft-save RPC returned no draft id';
  END IF;
  PERFORM public.admin_publish_project_version(v_project_id, v_draft_id);

  SELECT active_version_id INTO v_active_id
  FROM public.projects WHERE id = v_project_id;
  SELECT status INTO v_v2_status
  FROM public.project_versions WHERE id = v_draft_id AND project_id = v_project_id;
  IF v_active_id IS DISTINCT FROM v_draft_id OR v_v2_status IS DISTINCT FROM 'published' THEN
    RAISE EXCEPTION 'TEST FAILED: valid publication did not promote its version to the active pointer';
  END IF;
  IF (SELECT content FROM public.project_versions WHERE id = v_version1_id)
     IS DISTINCT FROM v_v1_content THEN
    RAISE EXCEPTION 'TEST FAILED: publishing v2 changed the stored v1 snapshot';
  END IF;

  -- A version from another project cannot be published under this project ID.
  BEGIN
    PERFORM public.admin_publish_project_version(v_project_id, v_other_version_id);
    RAISE EXCEPTION 'TEST FAILED: cross-project version publication was accepted';
  EXCEPTION WHEN SQLSTATE '22023' THEN
    GET STACKED DIAGNOSTICS v_message = MESSAGE_TEXT;
    IF v_message <> 'project_version_draft_not_found' THEN
      RAISE EXCEPTION 'TEST FAILED: cross-project publication rejected unexpectedly: %', v_message;
    END IF;
  END;

  PERFORM set_config('versioning_test.version2_id', v_draft_id::text, true);
  RAISE NOTICE 'PASS: valid draft published through RPC; active pointer moved to v2; v1 content unchanged; cross-project version rejected.';
END;
$positive_publication$;

SELECT set_config('request.jwt.claim.role', 'authenticated', true);

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

  -- Directly attempting to point at a published version belonging to another
  -- project must be blocked by the same guard (or by table grants if UPDATE is absent).
  IF has_table_privilege('authenticated', 'public.projects', 'UPDATE') THEN
    BEGIN
      UPDATE public.projects
      SET active_version_id = current_setting('versioning_test.other_version_id')::uuid
      WHERE id = v_project_id;
      RAISE EXCEPTION 'TEST FAILED: direct cross-project active_version_id change was accepted';
    EXCEPTION WHEN insufficient_privilege THEN
      GET STACKED DIAGNOSTICS v_message = MESSAGE_TEXT;
      IF v_message <> 'active_project_version_must_use_publish_rpc' THEN
        RAISE EXCEPTION 'TEST FAILED: cross-project pointer write rejected unexpectedly: %', v_message;
      END IF;
    END;
  END IF;

  -- Negative test 4: DELETE is just as restricted as INSERT/UPDATE for the app role.
  BEGIN
    DELETE FROM public.project_versions WHERE id = v_original_active_version;
    RAISE EXCEPTION 'TEST FAILED: direct DELETE of published project version was accepted';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  -- Negative test 5: a draft with no active videos/questions is rejected, and
  -- the active v2 pointer must not move.
  UPDATE public.videos SET is_active = false
  WHERE id = current_setting('versioning_test.video_id')::uuid;
  IF NOT FOUND THEN RAISE EXCEPTION 'TEST FAILED: could not deactivate test video'; END IF;
  UPDATE public.questions SET is_active = false
  WHERE id = current_setting('versioning_test.question_id')::uuid;
  IF NOT FOUND THEN RAISE EXCEPTION 'TEST FAILED: could not deactivate test question'; END IF;

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
  PERFORM set_config('versioning_test.invalid_draft_id', v_draft_id::text, true);

  RAISE NOTICE 'PASS: authenticated direct INSERT/UPDATE/DELETE blocked; pointer bypass rejected; valid RPC publication passed; invalid publication rejected; active version unchanged.';
END;
$negative_tests$;

RESET ROLE;

-- The immutability trigger is defense in depth: even the database-owner path
-- cannot UPDATE or DELETE a row that has already been published.
DO $owner_immutability_tests$
DECLARE
  v_version1_id uuid := current_setting('versioning_test.version1_id')::uuid;
  v_message text;
BEGIN
  BEGIN
    UPDATE public.project_versions
    SET content = '{"tampered":true}'::jsonb
    WHERE id = v_version1_id;
    RAISE EXCEPTION 'TEST FAILED: database-owner UPDATE of published snapshot was accepted';
  EXCEPTION WHEN SQLSTATE '22023' THEN
    GET STACKED DIAGNOSTICS v_message = MESSAGE_TEXT;
    IF v_message <> 'published_project_version_is_immutable' THEN
      RAISE EXCEPTION 'TEST FAILED: published UPDATE blocked for unexpected reason: %', v_message;
    END IF;
  END;

  BEGIN
    DELETE FROM public.project_versions WHERE id = v_version1_id;
    RAISE EXCEPTION 'TEST FAILED: database-owner DELETE of published snapshot was accepted';
  EXCEPTION WHEN SQLSTATE '22023' THEN
    GET STACKED DIAGNOSTICS v_message = MESSAGE_TEXT;
    IF v_message <> 'published_project_version_is_immutable' THEN
      RAISE EXCEPTION 'TEST FAILED: published DELETE blocked for unexpected reason: %', v_message;
    END IF;
  END;

  RAISE NOTICE 'PASS: immutability trigger rejects owner-level UPDATE and DELETE of published v1.';
END;
$owner_immutability_tests$;

-- When the SQL editor runs as the publication function's owner, also exercise
-- the trigger's content-state check directly with a draft pointer. If the
-- current session is not that owner, the authenticated bypass-denial tests
-- above still cover the public attack path; report this branch as skipped.
DO $owner_pointer_state_test$
DECLARE
  v_project_id uuid := current_setting('versioning_test.project_id')::uuid;
  v_draft_id uuid := current_setting('versioning_test.invalid_draft_id')::uuid;
  v_publish_owner name;
  v_message text;
BEGIN
  SELECT pg_catalog.pg_get_userbyid(p.proowner)
  INTO v_publish_owner
  FROM pg_catalog.pg_proc AS p
  WHERE p.oid = 'public.admin_publish_project_version(uuid,uuid)'::regprocedure;

  IF current_user IS DISTINCT FROM v_publish_owner THEN
    RAISE NOTICE 'SKIP: direct owner-only draft-pointer check; current SQL role differs from publish RPC owner.';
    RETURN;
  END IF;

  BEGIN
    UPDATE public.projects SET active_version_id = v_draft_id WHERE id = v_project_id;
    RAISE EXCEPTION 'TEST FAILED: project accepted a draft as active_version_id';
  EXCEPTION WHEN SQLSTATE '22023' THEN
    GET STACKED DIAGNOSTICS v_message = MESSAGE_TEXT;
    IF v_message <> 'active_project_version_must_be_published_for_project' THEN
      RAISE EXCEPTION 'TEST FAILED: draft pointer rejected for unexpected reason: %', v_message;
    END IF;
  END;

  RAISE NOTICE 'PASS: pointer guard rejects a draft version even in publish-owner context.';
END;
$owner_pointer_state_test$;

ROLLBACK;
