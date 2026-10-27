-- Staging-only regression test for snapshot-safe question edits.
-- Run after the versioning/CAS migrations, question-edit hotfix, 20261027170000_admin_question_logical_delete_preserve_history.sql, and 20261027210000_admin_question_permanent_delete.sql.
-- All fixture rows, including temporary Auth identities and answers, are rolled back.
BEGIN;

DO $setup$
DECLARE
  v_admin uuid := gen_random_uuid();
  v_student uuid := gen_random_uuid();
  v_project uuid := gen_random_uuid();
  v_video uuid := gen_random_uuid();
  v_question uuid := gen_random_uuid();
  v_other_question uuid := gen_random_uuid();
  v_cross_project uuid := gen_random_uuid();
  v_cross_project_question uuid := gen_random_uuid();
  v_group_a uuid := gen_random_uuid();
  v_group_b uuid := gen_random_uuid();
  v_code_a text := 'CVHF' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 18));
  v_code_b text := 'CVHF' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 18));
BEGIN
  INSERT INTO auth.users (
    id,aud,role,email,encrypted_password,email_confirmed_at,
    raw_app_meta_data,raw_user_meta_data,created_at,updated_at
  ) VALUES
    (v_admin,'authenticated','authenticated','cv-hotfix-admin-'||v_admin::text||'@example.invalid','',now(),
     '{"provider":"email","providers":["email"]}'::jsonb,'{"name":"Synthetic hotfix admin"}'::jsonb,now(),now()),
    (v_student,'authenticated','authenticated','cv-hotfix-student-'||v_student::text||'@example.invalid','',now(),
     '{"provider":"email","providers":["email"]}'::jsonb,'{"name":"Synthetic hotfix student"}'::jsonb,now(),now());

  UPDATE public.users SET role='admin' WHERE id=v_admin;
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id=v_admin AND role='admin')
     OR NOT EXISTS (SELECT 1 FROM public.users WHERE id=v_student AND role<>'admin') THEN
    RAISE EXCEPTION 'HOTFIX TEST FAILED: synthetic identities were not initialized';
  END IF;

  INSERT INTO public.projects(id,title,is_active)
  VALUES(v_project,'__cv_hotfix_snapshot_edit__',true);
  INSERT INTO public.videos(id,project_id,number,title,is_active)
  VALUES(v_video,v_project,1,'Synthetic versioning video',true);
  INSERT INTO public.questions(
    id,project_id,category,question_text,phase,question_type,is_required,is_active,
    display_order,min_items,placeholder,description,updated_at
  ) VALUES
    (v_question,v_project,'Synthetic','Question v1','think','single_select',true,true,
      1,1,'Choose one','Historical prompt',now()),
    (v_other_question,v_project,'Synthetic','Other question survives','act','textarea',false,true,
      2,1,'Optional','Must remain after deletion of the target question',now());
  INSERT INTO public.question_options(question_id,option_text,display_order)
  VALUES(v_question,'A',1),(v_question,'B',2);
  INSERT INTO public.projects(id,title,is_active)
  VALUES(v_cross_project,'__cv_hotfix_other_project__',true);
  INSERT INTO public.questions(
    id,project_id,category,question_text,phase,question_type,is_required,is_active,
    display_order,min_items,updated_at
  ) VALUES (v_cross_project_question,v_cross_project,'Synthetic','Other project question','think','textarea',false,true,1,1,now());
  INSERT INTO public.groups(id,project_id,group_number,group_name,class_name,leader_name,access_code)
  VALUES
    (v_group_a,v_project,990901,'Synthetic Group A','CV HOTFIX','Synthetic Leader A',v_code_a),
    (v_group_b,v_project,990902,'Synthetic Group B','CV HOTFIX','Synthetic Leader B',v_code_b);
  INSERT INTO public.group_videos(project_id,group_id,video_id)
  VALUES(v_project,v_group_a,v_video),(v_project,v_group_b,v_video);

  PERFORM set_config('cv_hotfix.admin_id',v_admin::text,true);
  PERFORM set_config('cv_hotfix.student_id',v_student::text,true);
  PERFORM set_config('cv_hotfix.project_id',v_project::text,true);
  PERFORM set_config('cv_hotfix.video_id',v_video::text,true);
  PERFORM set_config('cv_hotfix.question_id',v_question::text,true);
  PERFORM set_config('cv_hotfix.other_question_id',v_other_question::text,true);
  PERFORM set_config('cv_hotfix.cross_project_id',v_cross_project::text,true);
  PERFORM set_config('cv_hotfix.cross_project_question_id',v_cross_project_question::text,true);
  PERFORM set_config('cv_hotfix.code_a',v_code_a,true);
  PERFORM set_config('cv_hotfix.code_b',v_code_b,true);
END;
$setup$;

-- A project with no draft must create one; resaving identical content must reuse it.
DO $set_admin_claim$
BEGIN
  PERFORM set_config('request.jwt.claim.sub',current_setting('cv_hotfix.admin_id'),true);
END;
$set_admin_claim$;
DO $set_authenticated_claim$
BEGIN
  PERFORM set_config('request.jwt.claim.role','authenticated',true);
END;
$set_authenticated_claim$;
SET LOCAL ROLE authenticated;
DO $v1$
DECLARE
  p uuid := current_setting('cv_hotfix.project_id')::uuid;
  v1 uuid;
  v1_again uuid;
  expected_at timestamptz;
  validation jsonb;
BEGIN
  v1 := public.admin_save_project_version_draft(p);
  v1_again := public.admin_save_project_version_draft(p);
  IF v1 IS DISTINCT FROM v1_again THEN
    RAISE EXCEPTION 'HOTFIX TEST FAILED: resaving an unchanged draft created a duplicate';
  END IF;
  SELECT updated_at INTO expected_at FROM public.project_versions WHERE id=v1 AND status='draft';
  validation := public.admin_validate_project_version(p,v1);
  IF COALESCE((validation->>'valid')::boolean,false) IS NOT TRUE THEN
    RAISE EXCEPTION 'HOTFIX TEST FAILED: v1 did not validate: %',validation::text;
  END IF;
  PERFORM public.admin_publish_project_version(p,v1,expected_at);
  PERFORM set_config('cv_hotfix.v1_id',v1::text,true);
END;
$v1$;

RESET ROLE;
SET LOCAL ROLE service_role;
DO $start_a$
BEGIN
  PERFORM public.begin_submission(current_setting('cv_hotfix.code_a'),current_setting('cv_hotfix.video_id')::uuid);
  IF public.save_answer(current_setting('cv_hotfix.code_a'),current_setting('cv_hotfix.question_id')::uuid,'A') IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'HOTFIX TEST FAILED: Group A answer did not save';
  END IF;
  IF public.save_answer(current_setting('cv_hotfix.code_a'),current_setting('cv_hotfix.other_question_id')::uuid,'Other answer A') IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'HOTFIX TEST FAILED: Group A unrelated answer did not save';
  END IF;
END;
$start_a$;

RESET ROLE;
DO $set_admin_claim$
BEGIN
  PERFORM set_config('request.jwt.claim.sub',current_setting('cv_hotfix.admin_id'),true);
END;
$set_admin_claim$;
DO $set_authenticated_claim$
BEGIN
  PERFORM set_config('request.jwt.claim.role','authenticated',true);
END;
$set_authenticated_claim$;
SET LOCAL ROLE authenticated;

-- Semantic edits (prompt, type and options) must be accepted only because v1
-- contains the exact immutable definition for Group A's pinned submission.
DO $edit_v2$
DECLARE
  p uuid := current_setting('cv_hotfix.project_id')::uuid;
  q uuid := current_setting('cv_hotfix.question_id')::uuid;
  result_id uuid;
  draft_id uuid;
  expected_at timestamptz;
  validation jsonb;
  old_text text;
  old_type text;
  old_options jsonb;
  answer_value text;
  active_before uuid;
BEGIN
  result_id := public.admin_save_question(
    q,p,'Question v2 after validation race','Synthetic','think','multi_select',
    true,true,'Choose several','Updated working definition',1,1,'["C","D"]'::jsonb
  );
  IF result_id IS DISTINCT FROM q THEN
    RAISE EXCEPTION 'HOTFIX TEST FAILED: editor did not return the existing question ID';
  END IF;

  -- Invalid option payload must roll back the whole editor operation.
  BEGIN
    PERFORM public.admin_save_question(
      q,p,'Must not persist','Synthetic','think','multi_select',
      true,true,'','',1,1,'["only one"]'::jsonb
    );
    RAISE EXCEPTION 'HOTFIX TEST FAILED: invalid options were accepted';
  EXCEPTION WHEN SQLSTATE '22023' THEN
    IF SQLERRM <> 'invalid_question_options' THEN RAISE; END IF;
  END;
  IF NOT EXISTS (
    SELECT 1 FROM public.questions
    WHERE id=q AND question_text='Question v2 after validation race' AND question_type='multi_select'
  ) OR (SELECT count(*) FROM public.question_options WHERE question_id=q) <> 2 THEN
    RAISE EXCEPTION 'HOTFIX TEST FAILED: invalid save left partial question/option changes';
  END IF;

  SELECT pv.content->'questions'->0->>'question_text',
         pv.content->'questions'->0->>'question_type',
         pv.content->'questions'->0->'question_options'
  INTO old_text,old_type,old_options
  FROM public.project_versions pv
  WHERE pv.id=current_setting('cv_hotfix.v1_id')::uuid;
  IF old_text IS DISTINCT FROM 'Question v1'
     OR old_type IS DISTINCT FROM 'single_select'
     OR old_options IS DISTINCT FROM '[{"option_text":"A","display_order":1},{"option_text":"B","display_order":2}]'::jsonb THEN
    RAISE EXCEPTION 'HOTFIX TEST FAILED: v1 historical question/choices changed';
  END IF;
  SELECT answer_text INTO answer_value FROM public.answers
  WHERE question_id=q AND project_id=p;
  IF answer_value IS DISTINCT FROM 'A' THEN
    RAISE EXCEPTION 'HOTFIX TEST FAILED: historical answer changed';
  END IF;

  draft_id := public.admin_save_project_version_draft(p);
  SELECT updated_at INTO expected_at FROM public.project_versions WHERE id=draft_id AND status='draft';
  validation := public.admin_validate_project_version(p,draft_id);
  IF COALESCE((validation->>'valid')::boolean,false) IS NOT TRUE THEN
    RAISE EXCEPTION 'HOTFIX TEST FAILED: v2 did not validate: %',validation::text;
  END IF;

  -- Change the working definition after validation; stale publication must fail.
  PERFORM public.admin_save_question(
    q,p,'Question v2 final','Synthetic','think','multi_select',
    true,true,'Choose several','Updated working definition',1,1,'["C","D"]'::jsonb
  );
  PERFORM public.admin_save_project_version_draft(p);
  SELECT active_version_id INTO active_before FROM public.projects WHERE id=p;
  BEGIN
    PERFORM public.admin_publish_project_version(p,draft_id,expected_at);
    RAISE EXCEPTION 'HOTFIX TEST FAILED: stale validated draft was published';
  EXCEPTION WHEN SQLSTATE '40001' THEN
    IF SQLERRM <> 'project_version_validation_stale' THEN RAISE; END IF;
  END;
  IF (SELECT active_version_id FROM public.projects WHERE id=p) IS DISTINCT FROM active_before THEN
    RAISE EXCEPTION 'HOTFIX TEST FAILED: active pointer changed after stale publish rejection';
  END IF;

  draft_id := public.admin_save_project_version_draft(p);
  SELECT updated_at INTO expected_at FROM public.project_versions WHERE id=draft_id AND status='draft';
  validation := public.admin_validate_project_version(p,draft_id);
  IF COALESCE((validation->>'valid')::boolean,false) IS NOT TRUE THEN
    RAISE EXCEPTION 'HOTFIX TEST FAILED: refreshed v2 did not validate: %',validation::text;
  END IF;
  PERFORM public.admin_publish_project_version(p,draft_id,expected_at);
  PERFORM set_config('cv_hotfix.v2_id',draft_id::text,true);
END;
$edit_v2$;

RESET ROLE;
SET LOCAL ROLE service_role;
DO $start_b$
BEGIN
  PERFORM public.begin_submission(current_setting('cv_hotfix.code_b'),current_setting('cv_hotfix.video_id')::uuid);
  IF public.save_answer(current_setting('cv_hotfix.code_b'),current_setting('cv_hotfix.question_id')::uuid,'["A"]') IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'HOTFIX TEST FAILED: Group B initial answer did not save';
  END IF;
END;
$start_b$;
DO $v2_answer_validation$
BEGIN
  IF public.submit_group(current_setting('cv_hotfix.code_b')) IS DISTINCT FROM 'belum lengkap' THEN
    RAISE EXCEPTION 'HOTFIX TEST FAILED: v2 accepted a choice that exists only in v1';
  END IF;
END;
$v2_answer_validation$;
DO $save_b_valid$
BEGIN
  IF public.save_answer(current_setting('cv_hotfix.code_b'),current_setting('cv_hotfix.question_id')::uuid,'["C"]') IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'HOTFIX TEST FAILED: valid v2 answer did not save';
  END IF;
  IF public.save_answer(current_setting('cv_hotfix.code_b'),current_setting('cv_hotfix.other_question_id')::uuid,'Other answer B') IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'HOTFIX TEST FAILED: Group B unrelated answer did not save';
  END IF;
END;
$save_b_valid$;
DO $v2_submit$
BEGIN
  IF public.submit_group(current_setting('cv_hotfix.code_b')) IS DISTINCT FROM 'ok' THEN
    RAISE EXCEPTION 'HOTFIX TEST FAILED: valid v2 answer was rejected';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.submissions s
    WHERE s.group_id=(SELECT id FROM public.groups WHERE access_code=current_setting('cv_hotfix.code_b'))
      AND s.project_version_id=current_setting('cv_hotfix.v2_id')::uuid
  ) THEN
    RAISE EXCEPTION 'HOTFIX TEST FAILED: new submission did not pin to v2';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.answers a
    JOIN public.submissions s ON s.id=a.submission_id
    WHERE s.group_id=(SELECT id FROM public.groups WHERE access_code=current_setting('cv_hotfix.code_b'))
      AND a.answer_text='["C"]'
  ) THEN
    RAISE EXCEPTION 'HOTFIX TEST FAILED: v2 answer was not preserved';
  END IF;
END;
$v2_submit$;

-- Group A must still validate using v1's single_select A/B definition.
DO $v1_submit$
BEGIN
  IF public.submit_group(current_setting('cv_hotfix.code_a')) IS DISTINCT FROM 'ok' THEN
    RAISE EXCEPTION 'HOTFIX TEST FAILED: v1 submission did not validate against its pinned definition';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.submissions s
    WHERE s.group_id=(SELECT id FROM public.groups WHERE access_code=current_setting('cv_hotfix.code_a'))
      AND s.project_version_id=current_setting('cv_hotfix.v1_id')::uuid
  ) THEN
    RAISE EXCEPTION 'HOTFIX TEST FAILED: Group A lost its v1 pin';
  END IF;
  IF (SELECT count(*) FROM public.answers a
      JOIN public.submissions s ON s.id=a.submission_id
      WHERE s.group_id=(SELECT id FROM public.groups WHERE access_code=current_setting('cv_hotfix.code_a'))) <> 2 THEN
    RAISE EXCEPTION 'HOTFIX TEST FAILED: historical answer row was lost';
  END IF;
END;
$v1_submit$;

RESET ROLE;
DO $set_admin_claim$
BEGIN
  PERFORM set_config('request.jwt.claim.sub',current_setting('cv_hotfix.admin_id'),true);
END;
$set_admin_claim$;
DO $set_authenticated_claim$
BEGIN
  PERFORM set_config('request.jwt.claim.role','authenticated',true);
END;
$set_authenticated_claim$;
SET LOCAL ROLE authenticated;

-- Non-admin must still be rejected by the admin RPC.
DO $set_student_claim$
BEGIN
  PERFORM set_config('request.jwt.claim.sub',current_setting('cv_hotfix.student_id'),true);
END;
$set_student_claim$;
DO $non_admin$
DECLARE
  q uuid := current_setting('cv_hotfix.question_id')::uuid;
  p uuid := current_setting('cv_hotfix.project_id')::uuid;
BEGIN
  BEGIN
    PERFORM public.admin_save_question(
      q,p,'Unauthorized change','Synthetic','think','multi_select',
      true,true,'','',1,1,'["C","D"]'::jsonb
    );
    RAISE EXCEPTION 'HOTFIX TEST FAILED: non-admin called admin_save_question';
  EXCEPTION WHEN SQLSTATE '42501' THEN
    IF SQLERRM <> 'admin_required' THEN RAISE; END IF;
  END;

  BEGIN
    PERFORM public.admin_delete_question(q,p);
    RAISE EXCEPTION 'HOTFIX TEST FAILED: non-admin called admin_delete_question';
  EXCEPTION WHEN SQLSTATE '42501' THEN
    IF SQLERRM <> 'admin_required' THEN RAISE; END IF;
  END;
END;
$non_admin$;

DO $set_admin_claim$
BEGIN
  PERFORM set_config('request.jwt.claim.sub',current_setting('cv_hotfix.admin_id'),true);
END;
$set_admin_claim$;

-- Capture immutable snapshot contents before attempting deletion.
DO $snapshot_baseline$
BEGIN
  PERFORM set_config('cv_hotfix.v1_content_before',
    (SELECT content::text FROM public.project_versions WHERE id=current_setting('cv_hotfix.v1_id')::uuid),true);
  PERFORM set_config('cv_hotfix.v2_content_before',
    (SELECT content::text FROM public.project_versions WHERE id=current_setting('cv_hotfix.v2_id')::uuid),true);
END;
$snapshot_baseline$;

-- Cross-project deletion must fail closed without deleting the other project's question.
DO $cross_project_scope$
DECLARE
  result text;
  other_q uuid := current_setting('cv_hotfix.cross_project_question_id')::uuid;
  p uuid := current_setting('cv_hotfix.project_id')::uuid;
BEGIN
  result := public.admin_delete_question(other_q,p);
  IF result IS DISTINCT FROM 'not_found' THEN
    RAISE EXCEPTION 'HOTFIX TEST FAILED: cross-project question was not rejected';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.questions WHERE id=other_q AND project_id=current_setting('cv_hotfix.cross_project_id')::uuid) THEN
    RAISE EXCEPTION 'HOTFIX TEST FAILED: cross-project question was changed';
  END IF;
END;
$cross_project_scope$;

-- Verify archived projects still permit admin cleanup.
RESET ROLE;
UPDATE public.projects SET is_active=false WHERE id=current_setting('cv_hotfix.project_id')::uuid;

-- Force a failure after answer/option DELETEs; the RPC exception must roll
-- back all of those statements as one transaction.
CREATE FUNCTION pg_temp.cv_test_fail_question_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF OLD.id = current_setting('cv_hotfix.question_id')::uuid THEN
    RAISE EXCEPTION 'cv_test_forced_delete_failure';
  END IF;
  RETURN OLD;
END;
$function$;
CREATE TRIGGER cv_test_fail_question_delete
  BEFORE DELETE ON public.questions
  FOR EACH ROW EXECUTE FUNCTION pg_temp.cv_test_fail_question_delete();

SET LOCAL ROLE authenticated;
DO $atomic_failure$
DECLARE
  q uuid := current_setting('cv_hotfix.question_id')::uuid;
  p uuid := current_setting('cv_hotfix.project_id')::uuid;
BEGIN
  BEGIN
    PERFORM public.admin_delete_question(q,p);
    RAISE EXCEPTION 'HOTFIX TEST FAILED: forced trigger failure did not abort deletion';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN
    IF SQLERRM <> 'cv_test_forced_delete_failure' THEN RAISE; END IF;
  END;

  IF NOT EXISTS (SELECT 1 FROM public.questions WHERE id=q AND project_id=p) THEN
    RAISE EXCEPTION 'HOTFIX TEST FAILED: atomic failure removed the question';
  END IF;
  IF (SELECT count(*) FROM public.question_options WHERE question_id=q) <> 2 THEN
    RAISE EXCEPTION 'HOTFIX TEST FAILED: atomic failure removed question options';
  END IF;
  IF (SELECT count(*) FROM public.answers WHERE question_id=q) <> 2 THEN
    RAISE EXCEPTION 'HOTFIX TEST FAILED: atomic failure left answer deletion partially committed';
  END IF;
END;
$atomic_failure$;

RESET ROLE;
DROP TRIGGER cv_test_fail_question_delete ON public.questions;
-- pg_temp function is dropped automatically at transaction end.
SET LOCAL ROLE authenticated;

DO $permanent_delete$
DECLARE
  q uuid := current_setting('cv_hotfix.question_id')::uuid;
  other_q uuid := current_setting('cv_hotfix.other_question_id')::uuid;
  p uuid := current_setting('cv_hotfix.project_id')::uuid;
  result text;
BEGIN
  result := public.admin_delete_question(q,p);
  IF result IS DISTINCT FROM 'deleted' THEN
    RAISE EXCEPTION 'HOTFIX TEST FAILED: answered/published question was not permanently deleted';
  END IF;
  IF EXISTS (SELECT 1 FROM public.questions WHERE id=q) THEN
    RAISE EXCEPTION 'HOTFIX TEST FAILED: question row still exists after deletion';
  END IF;
  IF EXISTS (SELECT 1 FROM public.question_options WHERE question_id=q) THEN
    RAISE EXCEPTION 'HOTFIX TEST FAILED: question options still exist after deletion';
  END IF;
  IF EXISTS (SELECT 1 FROM public.answers WHERE question_id=q) THEN
    RAISE EXCEPTION 'HOTFIX TEST FAILED: answers for deleted question still exist';
  END IF;
  IF (SELECT count(*) FROM public.answers WHERE question_id=other_q) <> 2 THEN
    RAISE EXCEPTION 'HOTFIX TEST FAILED: unrelated question answers were deleted';
  END IF;
  IF (SELECT count(*) FROM public.submissions WHERE project_id=p) <> 2 THEN
    RAISE EXCEPTION 'HOTFIX TEST FAILED: submissions were changed by question deletion';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.project_versions
    WHERE id=current_setting('cv_hotfix.v1_id')::uuid
      AND content IS DISTINCT FROM current_setting('cv_hotfix.v1_content_before')::jsonb
  ) OR EXISTS (
    SELECT 1 FROM public.project_versions
    WHERE id=current_setting('cv_hotfix.v2_id')::uuid
      AND content IS DISTINCT FROM current_setting('cv_hotfix.v2_content_before')::jsonb
  ) THEN
    RAISE EXCEPTION 'HOTFIX TEST FAILED: published snapshot content changed';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.project_versions pv
    CROSS JOIN LATERAL pg_catalog.jsonb_array_elements(pv.content->'questions') AS item(value)
    WHERE pv.id=current_setting('cv_hotfix.v1_id')::uuid
      AND item.value->>'id'=q::text
      AND item.value->>'question_text'='Question v1'
  ) THEN
    RAISE EXCEPTION 'HOTFIX TEST FAILED: old snapshot no longer contains its historical question text';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.questions
    WHERE id=other_q AND project_id=p
  ) THEN
    RAISE EXCEPTION 'HOTFIX TEST FAILED: unrelated question row was removed';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.questions
    WHERE id=current_setting('cv_hotfix.cross_project_question_id')::uuid
      AND project_id=current_setting('cv_hotfix.cross_project_id')::uuid
  ) THEN
    RAISE EXCEPTION 'HOTFIX TEST FAILED: cross-project question row was removed';
  END IF;
END;
$permanent_delete$;

-- Historical snapshots can still name the question while its answer row is gone.
-- Consumers must render an explicit unavailable-answer state, not invent content.
DO $final_integrity$
DECLARE
  p uuid := current_setting('cv_hotfix.project_id')::uuid;
  q uuid := current_setting('cv_hotfix.question_id')::uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM public.project_versions WHERE project_id=p AND status='draft') THEN
    RAISE EXCEPTION 'HOTFIX TEST FAILED: unexpected draft remains after publication';
  END IF;
  IF (SELECT count(*) FROM public.answers WHERE question_id=q) <> 0 THEN
    RAISE EXCEPTION 'HOTFIX TEST FAILED: deleted question answers still exist';
  END IF;
  RAISE NOTICE 'PASS: permanent deletion, immutable snapshots, unrelated answers/submissions, cross-project scope, archived cleanup, admin denial and atomic rollback';
END;
$final_integrity$;

ROLLBACK;
SELECT 'PASS: versioned question permanent deletion, immutable snapshots, unrelated data retention, cross-project protection, non-admin denial and atomic rollback' AS test_result;
