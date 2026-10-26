-- Staging integration test: v1/v2 pinning, historical answers, archive protection,
-- and late-autosave rejection after submit.
-- Run as the Staging database owner after the versioning/CAS migrations.
-- All fixtures and content changes are rolled back at the end.
BEGIN;

DO $setup$
DECLARE
  v_admin_id uuid := gen_random_uuid();
  v_project_id uuid := gen_random_uuid();
  v_video_id uuid := gen_random_uuid();
  v_question_id uuid := gen_random_uuid();
  v_group_a_id uuid := gen_random_uuid();
  v_group_b_id uuid := gen_random_uuid();
  v_code_a text := 'CV20A' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16));
  v_code_b text := 'CV20B' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16));
BEGIN
  INSERT INTO auth.users (
    id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    v_admin_id, 'authenticated', 'authenticated',
    'v1v2-integration-' || v_admin_id::text || '@example.invalid',
    '', now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Temporary V1V2 Integration Admin"}'::jsonb, now(), now()
  );

  UPDATE public.users SET role = 'admin' WHERE id = v_admin_id;
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id=v_admin_id AND role='admin') THEN
    RAISE EXCEPTION 'SETUP FAILED: temporary admin identity is missing';
  END IF;

  INSERT INTO public.projects (id,title,is_active)
  VALUES (v_project_id,'__pr20_v1v2_integration_test__',true);

  INSERT INTO public.videos (id,project_id,number,title,is_active)
  VALUES (v_video_id,v_project_id,1,'Synthetic V1V2 video',true);

  INSERT INTO public.questions (
    id,project_id,category,question_text,question_type,phase,
    display_order,is_required,is_active
  ) VALUES (
    v_question_id,v_project_id,'integration-test','Question text v1',
    'text','think',1,true,true
  );

  INSERT INTO public.groups (
    id,project_id,group_number,group_name,class_name,leader_name,access_code
  ) VALUES
    (v_group_a_id,v_project_id,990001,'Synthetic Group A','PR20 V1V2','Student A',v_code_a),
    (v_group_b_id,v_project_id,990002,'Synthetic Group B','PR20 V1V2','Student B',v_code_b);

  INSERT INTO public.group_videos (project_id,group_id,video_id)
  VALUES
    (v_project_id,v_group_a_id,v_video_id),
    (v_project_id,v_group_b_id,v_video_id);

  PERFORM set_config('pr20_v1v2.admin_id',v_admin_id::text,true);
  PERFORM set_config('pr20_v1v2.project_id',v_project_id::text,true);
  PERFORM set_config('pr20_v1v2.video_id',v_video_id::text,true);
  PERFORM set_config('pr20_v1v2.question_id',v_question_id::text,true);
  PERFORM set_config('pr20_v1v2.group_a_id',v_group_a_id::text,true);
  PERFORM set_config('pr20_v1v2.group_b_id',v_group_b_id::text,true);
  PERFORM set_config('pr20_v1v2.code_a',v_code_a,true);
  PERFORM set_config('pr20_v1v2.code_b',v_code_b,true);
END;
$setup$;

-- Publish a valid v1 through the official admin RPC.
SELECT set_config('request.jwt.claim.sub',current_setting('pr20_v1v2.admin_id'),true);
SELECT set_config('request.jwt.claim.role','authenticated',true);
SET LOCAL ROLE authenticated;

DO $publish_v1$
DECLARE
  v_project_id uuid := current_setting('pr20_v1v2.project_id')::uuid;
  v_version_id uuid;
  v_expected_updated_at timestamptz;
  v_validation jsonb;
BEGIN
  v_version_id := public.admin_save_project_version_draft(v_project_id);
  SELECT updated_at INTO v_expected_updated_at
  FROM public.project_versions
  WHERE id=v_version_id AND project_id=v_project_id AND status='draft';
  v_validation := public.admin_validate_project_version(v_project_id,v_version_id);
  IF COALESCE((v_validation->>'valid')::boolean,false) IS NOT TRUE THEN
    RAISE EXCEPTION 'V1V2 TEST FAILED: initial content invalid: %',v_validation::text;
  END IF;
  PERFORM public.admin_publish_project_version(v_project_id,v_version_id,v_expected_updated_at);
  IF NOT EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.project_versions pv ON pv.id=p.active_version_id AND pv.project_id=p.id
    WHERE p.id=v_project_id AND pv.version_number=1 AND pv.status='published'
  ) THEN
    RAISE EXCEPTION 'V1V2 TEST FAILED: v1 did not become the active published version';
  END IF;
  PERFORM set_config('pr20_v1v2.v1_id',v_version_id::text,true);
  RAISE NOTICE 'PASS: official RPC published valid v1';
END;
$publish_v1$;

-- Group A starts on v1 and saves an answer before v2 exists.
RESET ROLE;
SET LOCAL ROLE service_role;

DO $start_group_a$
DECLARE
  v_code text := current_setting('pr20_v1v2.code_a');
  v_video_id uuid := current_setting('pr20_v1v2.video_id')::uuid;
  v_question_id uuid := current_setting('pr20_v1v2.question_id')::uuid;
  v_v1_id uuid := current_setting('pr20_v1v2.v1_id')::uuid;
  v_submission_version uuid;
  v_saved boolean;
BEGIN
  PERFORM public.begin_submission(v_code,v_video_id);
  SELECT project_version_id INTO v_submission_version
  FROM public.submissions
  WHERE group_id=current_setting('pr20_v1v2.group_a_id')::uuid;
  IF v_submission_version IS DISTINCT FROM v_v1_id THEN
    RAISE EXCEPTION 'V1V2 TEST FAILED: Group A did not pin to v1';
  END IF;
  v_saved := public.save_answer(v_code,v_question_id,'group-a-answer-v1');
  IF v_saved IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'V1V2 TEST FAILED: Group A could not save its v1 answer';
  END IF;
  RAISE NOTICE 'PASS: Group A submission and answer are pinned to v1';
END;
$start_group_a$;

-- Edit the working question and publish v2 with compare-and-swap.
RESET ROLE;
SELECT set_config('request.jwt.claim.sub',current_setting('pr20_v1v2.admin_id'),true);
SELECT set_config('request.jwt.claim.role','authenticated',true);
SET LOCAL ROLE authenticated;

DO $publish_v2$
DECLARE
  v_project_id uuid := current_setting('pr20_v1v2.project_id')::uuid;
  v_question_id uuid := current_setting('pr20_v1v2.question_id')::uuid;
  v_version_id uuid;
  v_expected_updated_at timestamptz;
  v_validation jsonb;
  v_group_a_version uuid;
  v_answer text;
BEGIN
  UPDATE public.questions
  SET question_text='Question text v2',updated_at=clock_timestamp()
  WHERE id=v_question_id AND project_id=v_project_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'V1V2 TEST FAILED: working question could not be changed';
  END IF;

  v_version_id := public.admin_save_project_version_draft(v_project_id);
  SELECT updated_at INTO v_expected_updated_at
  FROM public.project_versions
  WHERE id=v_version_id AND project_id=v_project_id AND status='draft';
  v_validation := public.admin_validate_project_version(v_project_id,v_version_id);
  IF COALESCE((v_validation->>'valid')::boolean,false) IS NOT TRUE THEN
    RAISE EXCEPTION 'V1V2 TEST FAILED: v2 content invalid: %',v_validation::text;
  END IF;

  PERFORM public.admin_publish_project_version(v_project_id,v_version_id,v_expected_updated_at);
  IF NOT EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.project_versions pv ON pv.id=p.active_version_id AND pv.project_id=p.id
    WHERE p.id=v_project_id AND pv.id=v_version_id AND pv.version_number=2 AND pv.status='published'
  ) THEN
    RAISE EXCEPTION 'V1V2 TEST FAILED: v2 did not become active through CAS publication';
  END IF;

  SELECT project_version_id INTO v_group_a_version
  FROM public.submissions
  WHERE group_id=current_setting('pr20_v1v2.group_a_id')::uuid;
  SELECT answer_text INTO v_answer
  FROM public.answers
  WHERE submission_id=(SELECT id FROM public.submissions WHERE group_id=current_setting('pr20_v1v2.group_a_id')::uuid)
    AND question_id=v_question_id;
  IF v_group_a_version IS DISTINCT FROM current_setting('pr20_v1v2.v1_id')::uuid
     OR v_answer IS DISTINCT FROM 'group-a-answer-v1' THEN
    RAISE EXCEPTION 'V1V2 TEST FAILED: v2 publication altered Group A pin or answer';
  END IF;

  PERFORM set_config('pr20_v1v2.v2_id',v_version_id::text,true);
  RAISE NOTICE 'PASS: CAS publication activated v2; Group A stayed on v1 with its answer unchanged';
END;
$publish_v2$;

-- Group B starts after v2, historical prompt is unchanged, and late save after
-- Group A submission is rejected without mutating its final answer.
RESET ROLE;
SET LOCAL ROLE service_role;

DO $student_history_and_submit$
DECLARE
  v_code_a text := current_setting('pr20_v1v2.code_a');
  v_code_b text := current_setting('pr20_v1v2.code_b');
  v_video_id uuid := current_setting('pr20_v1v2.video_id')::uuid;
  v_question_id uuid := current_setting('pr20_v1v2.question_id')::uuid;
  v_group_a_id uuid := current_setting('pr20_v1v2.group_a_id')::uuid;
  v_group_b_id uuid := current_setting('pr20_v1v2.group_b_id')::uuid;
  v_v1_id uuid := current_setting('pr20_v1v2.v1_id')::uuid;
  v_v2_id uuid := current_setting('pr20_v1v2.v2_id')::uuid;
  v_group_a_submission uuid;
  v_group_b_version uuid;
  v_group_a_version uuid;
  v_v1_prompt text;
  v_v2_prompt text;
  v_submit_result text;
  v_late_save boolean;
  v_final_answer text;
  v_message text;
BEGIN
  PERFORM public.begin_submission(v_code_b,v_video_id);
  SELECT project_version_id INTO v_group_b_version
  FROM public.submissions WHERE group_id=v_group_b_id;
  SELECT project_version_id INTO v_group_a_version
  FROM public.submissions WHERE group_id=v_group_a_id;
  IF v_group_b_version IS DISTINCT FROM v_v2_id OR v_group_a_version IS DISTINCT FROM v_v1_id THEN
    RAISE EXCEPTION 'V1V2 TEST FAILED: Group A/Group B version pins are not v1/v2 as expected';
  END IF;

  SELECT item.value->>'question_text' INTO v_v1_prompt
  FROM public.project_versions pv
  CROSS JOIN LATERAL jsonb_array_elements(pv.content->'questions') item(value)
  WHERE pv.id=v_v1_id AND item.value->>'id'=v_question_id::text;
  SELECT item.value->>'question_text' INTO v_v2_prompt
  FROM public.project_versions pv
  CROSS JOIN LATERAL jsonb_array_elements(pv.content->'questions') item(value)
  WHERE pv.id=v_v2_id AND item.value->>'id'=v_question_id::text;
  IF v_v1_prompt IS DISTINCT FROM 'Question text v1'
     OR v_v2_prompt IS DISTINCT FROM 'Question text v2' THEN
    RAISE EXCEPTION 'V1V2 TEST FAILED: historical prompts mismatch (v1=%, v2=%)',v_v1_prompt,v_v2_prompt;
  END IF;

  SELECT id INTO v_group_a_submission FROM public.submissions WHERE group_id=v_group_a_id;
  v_submit_result := public.submit_group(v_code_a);
  IF v_submit_result IS DISTINCT FROM 'ok' THEN
    RAISE EXCEPTION 'V1V2 TEST FAILED: Group A submission did not finalize: %',v_submit_result;
  END IF;

  v_late_save := public.save_answer(v_code_a,v_question_id,'late-overwrite-must-not-stick');
  IF v_late_save IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'V1V2 TEST FAILED: late autosave after submit was accepted';
  END IF;

  SELECT answer_text INTO v_final_answer
  FROM public.answers
  WHERE submission_id=v_group_a_submission AND question_id=v_question_id;
  IF v_final_answer IS DISTINCT FROM 'group-a-answer-v1' THEN
    RAISE EXCEPTION 'V1V2 TEST FAILED: late autosave changed the final answer';
  END IF;

  -- Physical delete of content used by published snapshots must be rejected;
  -- archiving via is_active=false remains allowed without changing snapshots.
  BEGIN
    DELETE FROM public.questions WHERE id=v_question_id AND project_id=current_setting('pr20_v1v2.project_id')::uuid;
    RAISE EXCEPTION 'V1V2 TEST FAILED: physical deletion of published question succeeded';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_message=MESSAGE_TEXT;
    IF v_message <> 'question_referenced_by_published_version_deactivate_instead' THEN
      RAISE EXCEPTION 'V1V2 TEST FAILED: question deletion blocked unexpectedly: %',v_message;
    END IF;
  END;

  BEGIN
    DELETE FROM public.videos WHERE id=v_video_id AND project_id=current_setting('pr20_v1v2.project_id')::uuid;
    RAISE EXCEPTION 'V1V2 TEST FAILED: physical deletion of published video succeeded';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_message=MESSAGE_TEXT;
    IF v_message <> 'video_referenced_by_published_version_deactivate_instead' THEN
      RAISE EXCEPTION 'V1V2 TEST FAILED: video deletion blocked unexpectedly: %',v_message;
    END IF;
  END;

  UPDATE public.questions SET is_active=false WHERE id=v_question_id AND project_id=current_setting('pr20_v1v2.project_id')::uuid;
  UPDATE public.videos SET is_active=false WHERE id=v_video_id AND project_id=current_setting('pr20_v1v2.project_id')::uuid;
  IF NOT EXISTS (
    SELECT 1 FROM public.questions WHERE id=v_question_id AND project_id=current_setting('pr20_v1v2.project_id')::uuid AND is_active=false
  ) OR NOT EXISTS (
    SELECT 1 FROM public.videos WHERE id=v_video_id AND project_id=current_setting('pr20_v1v2.project_id')::uuid AND is_active=false
  ) THEN
    RAISE EXCEPTION 'V1V2 TEST FAILED: content could not be archived';
  END IF;

  IF (SELECT project_version_id FROM public.submissions WHERE group_id=v_group_a_id) IS DISTINCT FROM v_v1_id
     OR (SELECT project_version_id FROM public.submissions WHERE group_id=v_group_b_id) IS DISTINCT FROM v_v2_id THEN
    RAISE EXCEPTION 'V1V2 TEST FAILED: archiving working content changed submission version pins';
  END IF;

  RAISE NOTICE 'PASS: Group A v1, Group B v2, historical prompts preserved, late autosave rejected, content archive preserves published snapshots';
END;
$student_history_and_submit$;

SELECT 'PASS: V1/V2 integration completed; Group A remained on v1, Group B used v2, late autosave was rejected, historical snapshots survived archive, all fixtures will roll back' AS test_run_status;
ROLLBACK;
