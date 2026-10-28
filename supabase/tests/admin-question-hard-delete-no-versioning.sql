-- Test-only regression suite for permanent deletion on the pre-versioning schema.
-- All fixtures and temporary test objects are enclosed in one transaction and rolled back.
BEGIN;

INSERT INTO auth.users (id,email,raw_user_meta_data) VALUES
('00000000-0000-4000-8000-000000000001','synthetic-admin@example.invalid','{"name":"Synthetic Admin"}'),
('00000000-0000-4000-8000-000000000002','synthetic-student@example.invalid','{"name":"Synthetic Student"}');
UPDATE public.users SET role='admin' WHERE id='00000000-0000-4000-8000-000000000001';

INSERT INTO public.projects (id,title,is_active) VALUES
('00000000-0000-4000-8000-000000000101','Synthetic Active Project',true),
('00000000-0000-4000-8000-000000000102','Synthetic Other Project',true),
('00000000-0000-4000-8000-000000000103','Synthetic Archive Project',true);
INSERT INTO public.groups (id,project_id,group_number,group_name,leader_name,access_code) VALUES
('00000000-0000-4000-8000-000000000201','00000000-0000-4000-8000-000000000101',1,'Synthetic A','Leader A','SYNTHA'),
('00000000-0000-4000-8000-000000000202','00000000-0000-4000-8000-000000000101',2,'Synthetic B','Leader B','SYNTHB'),
('00000000-0000-4000-8000-000000000203','00000000-0000-4000-8000-000000000103',3,'Synthetic Archive','Leader C','SYNTHC');
INSERT INTO public.videos (id,project_id,number,title,is_active) VALUES
('00000000-0000-4000-8000-000000000301','00000000-0000-4000-8000-000000000101',1,'Synthetic Active Video',true),
('00000000-0000-4000-8000-000000000302','00000000-0000-4000-8000-000000000103',1,'Synthetic Archive Video',true);
INSERT INTO public.group_videos (group_id,video_id) VALUES
('00000000-0000-4000-8000-000000000201','00000000-0000-4000-8000-000000000301'),
('00000000-0000-4000-8000-000000000202','00000000-0000-4000-8000-000000000301'),
('00000000-0000-4000-8000-000000000203','00000000-0000-4000-8000-000000000302');

INSERT INTO public.questions (id,project_id,category,question_text,question_type,phase,display_order) VALUES
('00000000-0000-4000-8000-000000000401','00000000-0000-4000-8000-000000000101','Synthetic','Target question','text','see',1),
('00000000-0000-4000-8000-000000000402','00000000-0000-4000-8000-000000000101','Synthetic','Unrelated question','text','think',2),
('00000000-0000-4000-8000-000000000403','00000000-0000-4000-8000-000000000101','Synthetic','Forced rollback question','text','connect',3),
('00000000-0000-4000-8000-000000000404','00000000-0000-4000-8000-000000000102','Synthetic','Cross-project question','text','see',1),
('00000000-0000-4000-8000-000000000405','00000000-0000-4000-8000-000000000103','Synthetic','Archived target question','text','act',1),
('00000000-0000-4000-8000-000000000406','00000000-0000-4000-8000-000000000103','Synthetic','Archived guard question','text','act',2);
INSERT INTO public.question_options (question_id,option_text,display_order) VALUES
('00000000-0000-4000-8000-000000000401','Target A',1),('00000000-0000-4000-8000-000000000401','Target B',2),
('00000000-0000-4000-8000-000000000403','Rollback A',1),('00000000-0000-4000-8000-000000000403','Rollback B',2),
('00000000-0000-4000-8000-000000000405','Archived A',1),('00000000-0000-4000-8000-000000000405','Archived B',2),
('00000000-0000-4000-8000-000000000406','Guard A',1);
INSERT INTO public.submissions (id,project_id,group_id,video_id,status) VALUES
('00000000-0000-4000-8000-000000000501','00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000201','00000000-0000-4000-8000-000000000301','draft'),
('00000000-0000-4000-8000-000000000502','00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000202','00000000-0000-4000-8000-000000000301','draft'),
('00000000-0000-4000-8000-000000000503','00000000-0000-4000-8000-000000000103','00000000-0000-4000-8000-000000000203','00000000-0000-4000-8000-000000000302','draft');
INSERT INTO public.answers (project_id,submission_id,question_id,answer_text) VALUES
('00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000501','00000000-0000-4000-8000-000000000401','Target answer A'),
('00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000502','00000000-0000-4000-8000-000000000401','Target answer B'),
('00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000501','00000000-0000-4000-8000-000000000402','Unrelated answer A'),
('00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000502','00000000-0000-4000-8000-000000000402','Unrelated answer B'),
('00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000501','00000000-0000-4000-8000-000000000403','Rollback answer'),
('00000000-0000-4000-8000-000000000103','00000000-0000-4000-8000-000000000503','00000000-0000-4000-8000-000000000405','Archived answer'),
('00000000-0000-4000-8000-000000000103','00000000-0000-4000-8000-000000000503','00000000-0000-4000-8000-000000000406','Guard answer');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);

-- 1-4: Successful deletion of an answered question is scoped and atomic.
DO $active_delete$
DECLARE result text;
BEGIN
  result := public.admin_delete_question('00000000-0000-4000-8000-000000000401','00000000-0000-4000-8000-000000000101');
  IF result IS DISTINCT FROM 'deleted' OR EXISTS (SELECT 1 FROM public.questions WHERE id='00000000-0000-4000-8000-000000000401') THEN
    RAISE EXCEPTION 'TEST FAILED: admin delete did not complete before returning deleted';
  END IF;
  RAISE NOTICE 'PASS 1/2: admin deleted an answered question; deleted returned only after row removal';
  IF EXISTS (SELECT 1 FROM public.question_options WHERE question_id='00000000-0000-4000-8000-000000000401')
     OR EXISTS (SELECT 1 FROM public.answers WHERE question_id='00000000-0000-4000-8000-000000000401') THEN
    RAISE EXCEPTION 'TEST FAILED: target options/answers remain';
  END IF;
  RAISE NOTICE 'PASS 3: target question, options, and answers are absent';
  IF (SELECT count(*) FROM public.answers WHERE question_id='00000000-0000-4000-8000-000000000402') <> 2
     OR (SELECT count(*) FROM public.submissions) <> 3
     OR NOT EXISTS (SELECT 1 FROM public.questions WHERE id='00000000-0000-4000-8000-000000000402') THEN
    RAISE EXCEPTION 'TEST FAILED: unrelated answers/questions/submissions changed';
  END IF;
  IF public.admin_delete_question('00000000-0000-4000-8000-000000000401','00000000-0000-4000-8000-000000000101') IS DISTINCT FROM 'not_found' THEN
    RAISE EXCEPTION 'TEST FAILED: absent question did not return not_found';
  END IF;
  RAISE NOTICE 'PASS 4: unrelated answers and submissions remain; missing question returns not_found';
END;
$active_delete$;

-- 5: A non-admin authenticated user must be denied.
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
DO $non_admin$
BEGIN
  BEGIN
    PERFORM public.admin_delete_question('00000000-0000-4000-8000-000000000402','00000000-0000-4000-8000-000000000101');
    RAISE EXCEPTION 'TEST FAILED: non-admin deletion was accepted';
  EXCEPTION WHEN SQLSTATE '42501' THEN
    IF SQLERRM <> 'admin_required' THEN RAISE; END IF;
  END;
  RAISE NOTICE 'PASS 5: non-admin is rejected with admin_required';
END;
$non_admin$;

-- 6: Cross-project request must fail closed.
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
DO $cross_project$
BEGIN
  IF public.admin_delete_question('00000000-0000-4000-8000-000000000404','00000000-0000-4000-8000-000000000101') IS DISTINCT FROM 'not_found'
     OR NOT EXISTS (SELECT 1 FROM public.questions WHERE id='00000000-0000-4000-8000-000000000404' AND project_id='00000000-0000-4000-8000-000000000102') THEN
    RAISE EXCEPTION 'TEST FAILED: cross-project question was deleted or not rejected';
  END IF;
  RAISE NOTICE 'PASS 6: cross-project deletion is rejected and original row remains';
END;
$cross_project$;

-- 9: Force an error after the RPC has started deleting child rows.
RESET ROLE;
CREATE FUNCTION public.cv_test_fail_question_delete()
RETURNS trigger LANGUAGE plpgsql AS $function$
BEGIN
  IF OLD.id='00000000-0000-4000-8000-000000000403'::uuid THEN
    RAISE EXCEPTION 'cv_test_forced_delete_failure';
  END IF;
  RETURN OLD;
END;
$function$;
CREATE TRIGGER zz_cv_test_fail_question_delete
  BEFORE DELETE ON public.questions FOR EACH ROW EXECUTE FUNCTION public.cv_test_fail_question_delete();
SET LOCAL ROLE authenticated;
DO $atomic_rollback$
BEGIN
  BEGIN
    PERFORM public.admin_delete_question('00000000-0000-4000-8000-000000000403','00000000-0000-4000-8000-000000000101');
    RAISE EXCEPTION 'TEST FAILED: forced failure did not abort deletion';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN
    IF SQLERRM <> 'cv_test_forced_delete_failure' THEN RAISE; END IF;
  END;
  IF NOT EXISTS (SELECT 1 FROM public.questions WHERE id='00000000-0000-4000-8000-000000000403')
     OR (SELECT count(*) FROM public.question_options WHERE question_id='00000000-0000-4000-8000-000000000403') <> 2
     OR (SELECT count(*) FROM public.answers WHERE question_id='00000000-0000-4000-8000-000000000403') <> 1 THEN
    RAISE EXCEPTION 'TEST FAILED: forced failure did not roll back all child/parent deletes';
  END IF;
  RAISE NOTICE 'PASS 9: forced failure rolls back question, options, and answers';
END;
$atomic_rollback$;
RESET ROLE;
DROP TRIGGER zz_cv_test_fail_question_delete ON public.questions;
DROP FUNCTION public.cv_test_fail_question_delete();
SET LOCAL ROLE authenticated;

-- 7, 8, 10: Archived-project policy and the narrow bypass.
RESET ROLE;
UPDATE public.projects SET is_active=false WHERE id='00000000-0000-4000-8000-000000000103';
SET LOCAL ROLE authenticated;
SELECT set_config('civic_vision.admin_question_hard_delete','on',true);
DO $direct_bypass$
BEGIN
  BEGIN
    DELETE FROM public.questions WHERE id='00000000-0000-4000-8000-000000000406';
    RAISE EXCEPTION 'TEST FAILED: direct delete used caller-set bypass marker';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN
    IF SQLERRM <> 'Project diarsipkan: data pembelajaran bersifat baca-saja.' THEN RAISE; END IF;
  END;
  IF NOT EXISTS (SELECT 1 FROM public.questions WHERE id='00000000-0000-4000-8000-000000000406') THEN
    RAISE EXCEPTION 'TEST FAILED: direct bypass attempt deleted archived question';
  END IF;
  RAISE NOTICE 'PASS 8: caller-set bypass marker cannot authorize direct archived deletion';
END;
$direct_bypass$;
DO $archived_write$
BEGIN
  BEGIN
    UPDATE public.questions SET question_text='Must be rejected' WHERE id='00000000-0000-4000-8000-000000000406';
    RAISE EXCEPTION 'TEST FAILED: ordinary archived-project update was accepted';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN
    IF SQLERRM <> 'Project diarsipkan: data pembelajaran bersifat baca-saja.' THEN RAISE; END IF;
  END;
  RAISE NOTICE 'PASS 10: ordinary writes to archived projects remain blocked';
END;
$archived_write$;
DO $archived_cleanup$
DECLARE result text;
BEGIN
  result := public.admin_delete_question('00000000-0000-4000-8000-000000000405','00000000-0000-4000-8000-000000000103');
  IF result IS DISTINCT FROM 'deleted'
     OR EXISTS (SELECT 1 FROM public.questions WHERE id='00000000-0000-4000-8000-000000000405')
     OR EXISTS (SELECT 1 FROM public.question_options WHERE question_id='00000000-0000-4000-8000-000000000405')
     OR EXISTS (SELECT 1 FROM public.answers WHERE question_id='00000000-0000-4000-8000-000000000405')
     OR NOT EXISTS (SELECT 1 FROM public.submissions WHERE id='00000000-0000-4000-8000-000000000503') THEN
    RAISE EXCEPTION 'TEST FAILED: archived RPC cleanup violated intended policy';
  END IF;
  RAISE NOTICE 'PASS 7: archived admin cleanup removes only target question data and retains submission';
END;
$archived_cleanup$;
DO $video_guard$
BEGIN
  BEGIN
    DELETE FROM public.videos WHERE id='00000000-0000-4000-8000-000000000302';
    RAISE EXCEPTION 'TEST FAILED: archived video delete was accepted';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN
    IF SQLERRM <> 'Project diarsipkan: data pembelajaran bersifat baca-saja.' THEN RAISE; END IF;
  END;
  IF NOT EXISTS (SELECT 1 FROM public.videos WHERE id='00000000-0000-4000-8000-000000000302') THEN
    RAISE EXCEPTION 'TEST FAILED: video guard failed to preserve archived video';
  END IF;
  RAISE NOTICE 'PASS 11: archived video guard remains active';
END;
$video_guard$;

-- 11: Catalog checks for schema, constraints, triggers, RLS, grants and function hardening.
DO $catalog$
DECLARE
  v_def text; v_prosecdef boolean; v_proconfig text[];
  v_guard_def text; v_guard_prosecdef boolean; v_guard_proconfig text[];
  v_count integer;
BEGIN
  IF to_regclass('public.project_versions') IS NOT NULL
     OR EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='questions' AND column_name='deleted_at') THEN
    RAISE EXCEPTION 'TEST FAILED: versioning objects unexpectedly exist in this baseline';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='answers' AND column_name='project_id' AND is_nullable='NO') THEN
    RAISE EXCEPTION 'TEST FAILED: answers.project_id missing or nullable';
  END IF;
  SELECT count(*) INTO v_count FROM pg_catalog.pg_constraint
  WHERE conname IN ('answers_project_submission_fkey','answers_project_question_fkey',
                    'submissions_project_group_fkey','group_videos_project_group_fkey','group_videos_project_video_fkey')
    AND contype='f' AND convalidated;
  IF v_count <> 5 THEN RAISE EXCEPTION 'TEST FAILED: expected five validated composite project FKs; found %',v_count; END IF;

  IF NOT (SELECT relrowsecurity FROM pg_catalog.pg_class WHERE oid='public.questions'::regclass)
     OR NOT (SELECT relrowsecurity FROM pg_catalog.pg_class WHERE oid='public.question_options'::regclass)
     OR NOT (SELECT relrowsecurity FROM pg_catalog.pg_class WHERE oid='public.answers'::regclass) THEN
    RAISE EXCEPTION 'TEST FAILED: RLS disabled on a relevant table';
  END IF;
  SELECT count(*) INTO v_count FROM pg_catalog.pg_trigger
  WHERE NOT tgisinternal AND tgname LIKE 'archived_project_guard_%' AND tgenabled <> 'D';
  IF v_count <> 8 OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_trigger WHERE tgrelid='public.videos'::regclass
                                AND tgname='archived_project_guard_videos' AND NOT tgisinternal AND tgenabled <> 'D') THEN
    RAISE EXCEPTION 'TEST FAILED: archive guard trigger set changed or video guard missing';
  END IF;

  SELECT p.prosecdef,p.proconfig,pg_catalog.pg_get_functiondef(p.oid)
  INTO v_prosecdef,v_proconfig,v_def
  FROM pg_catalog.pg_proc p WHERE p.oid='public.admin_delete_question(uuid,uuid)'::regprocedure;
  IF v_prosecdef IS DISTINCT FROM true
     OR NOT (COALESCE(v_proconfig,ARRAY[]::text[]) @> ARRAY['search_path=""']::text[])
     OR position('private.is_admin()' IN v_def)=0
     OR position('civic_vision.admin_question_hard_delete' IN v_def)=0
     OR position('DELETE FROM public.answers' IN v_def)=0 THEN
    RAISE EXCEPTION 'TEST FAILED: admin RPC security/search_path/delete contract incomplete';
  END IF;
  IF has_function_privilege('anon','public.admin_delete_question(uuid,uuid)','EXECUTE')
     OR NOT has_function_privilege('authenticated','public.admin_delete_question(uuid,uuid)','EXECUTE')
     OR EXISTS (
       SELECT 1 FROM pg_catalog.pg_proc p
       CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) a
       WHERE p.oid='public.admin_delete_question(uuid,uuid)'::regprocedure
         AND a.grantee=0 AND a.privilege_type='EXECUTE'
     ) THEN
    RAISE EXCEPTION 'TEST FAILED: admin RPC execute grants too broad or missing';
  END IF;

  SELECT p.prosecdef,p.proconfig,pg_catalog.pg_get_functiondef(p.oid)
  INTO v_guard_prosecdef,v_guard_proconfig,v_guard_def
  FROM pg_catalog.pg_proc p WHERE p.oid='public.reject_archived_project_write()'::regprocedure;
  IF v_guard_prosecdef IS DISTINCT FROM false
     OR NOT (COALESCE(v_guard_proconfig,ARRAY[]::text[]) @> ARRAY['search_path=""']::text[])
     OR position('current_user =' IN v_guard_def)=0
     OR position('pg_trigger_depth() > 0' IN v_guard_def)=0
     OR to_regprocedure('public.guard_active_parent_project()') IS NULL
     OR to_regprocedure('public.guard_active_project_row()') IS NULL THEN
    RAISE EXCEPTION 'TEST FAILED: archive guard hardening functions/security checks incomplete';
  END IF;
  IF has_function_privilege('anon','private.is_admin()','EXECUTE')
     OR NOT has_function_privilege('authenticated','private.is_admin()','EXECUTE') THEN
    RAISE EXCEPTION 'TEST FAILED: private.is_admin grants incorrect';
  END IF;
  RAISE NOTICE 'PASS 11: project FKs, RLS, archive triggers, function hardening, and grants verified';
  RAISE NOTICE 'NOT APPLICABLE: project_versions, questions.deleted_at, and snapshot immutability are absent by design';
END;
$catalog$;

RESET ROLE;
ROLLBACK;
SELECT 'PASS: pre-versioning hard-delete regression suite completed; all synthetic fixtures rolled back' AS test_result;
