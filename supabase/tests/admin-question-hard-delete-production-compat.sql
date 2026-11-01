-- Production-compatible hard-delete regression for the schema used before project versioning.
-- All synthetic rows and the forced-failure trigger are rolled back.
BEGIN;

INSERT INTO auth.users (id,email,raw_user_meta_data) VALUES
('00000000-0000-4000-8000-000000000001','hard-delete-admin@example.invalid','{"name":"Synthetic Admin"}'),
('00000000-0000-4000-8000-000000000002','hard-delete-student@example.invalid','{"name":"Synthetic Student"}');
UPDATE public.users SET role='admin' WHERE id='00000000-0000-4000-8000-000000000001';

INSERT INTO public.projects (id,title,is_active) VALUES
('00000000-0000-4000-8000-000000000101','Hard Delete Active Project',true),
('00000000-0000-4000-8000-000000000102','Hard Delete Other Project',true);
INSERT INTO public.groups (id,project_id,group_number,group_name,leader_name,access_code) VALUES
('00000000-0000-4000-8000-000000000201','00000000-0000-4000-8000-000000000101',1,'Group A','Leader A','HDGROUPA'),
('00000000-0000-4000-8000-000000000202','00000000-0000-4000-8000-000000000101',2,'Group B','Leader B','HDGROUPB');
INSERT INTO public.videos (id,project_id,number,title,is_active) VALUES
('00000000-0000-4000-8000-000000000301','00000000-0000-4000-8000-000000000101',1,'Hard Delete Video',true);
INSERT INTO public.group_videos (group_id,video_id,project_id) VALUES
('00000000-0000-4000-8000-000000000201','00000000-0000-4000-8000-000000000301','00000000-0000-4000-8000-000000000101'),
('00000000-0000-4000-8000-000000000202','00000000-0000-4000-8000-000000000301','00000000-0000-4000-8000-000000000101');
INSERT INTO public.questions (id,project_id,category,question_text,question_type,phase,display_order) VALUES
('00000000-0000-4000-8000-000000000401','00000000-0000-4000-8000-000000000101','Test','Question to delete','text','see',1),
('00000000-0000-4000-8000-000000000402','00000000-0000-4000-8000-000000000101','Test','Question to keep','text','think',2),
('00000000-0000-4000-8000-000000000403','00000000-0000-4000-8000-000000000102','Test','Cross project question','text','see',1);
INSERT INTO public.question_options (question_id,option_text,display_order) VALUES
('00000000-0000-4000-8000-000000000401','Option A',1),
('00000000-0000-4000-8000-000000000401','Option B',2);
INSERT INTO public.submissions (id,project_id,group_id,video_id,status) VALUES
('00000000-0000-4000-8000-000000000501','00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000201','00000000-0000-4000-8000-000000000301','draft'),
('00000000-0000-4000-8000-000000000502','00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000202','00000000-0000-4000-8000-000000000301','submitted');
INSERT INTO public.answers (project_id,submission_id,question_id,answer_text) VALUES
('00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000501','00000000-0000-4000-8000-000000000401','Answer A'),
('00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000502','00000000-0000-4000-8000-000000000401','Answer B'),
('00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000501','00000000-0000-4000-8000-000000000402','Keep this answer');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);

DO $success$
DECLARE v_result text;
BEGIN
  v_result := public.admin_delete_question('00000000-0000-4000-8000-000000000401','00000000-0000-4000-8000-000000000101');
  IF v_result IS DISTINCT FROM 'deleted'
     OR EXISTS (SELECT 1 FROM public.questions WHERE id='00000000-0000-4000-8000-000000000401')
     OR EXISTS (SELECT 1 FROM public.question_options WHERE question_id='00000000-0000-4000-8000-000000000401')
     OR EXISTS (SELECT 1 FROM public.answers WHERE question_id='00000000-0000-4000-8000-000000000401') THEN
    RAISE EXCEPTION 'FAIL: answered question, options, and answers were not all deleted';
  END IF;
  IF (SELECT count(*) FROM public.submissions) <> 2
     OR (SELECT count(*) FROM public.answers WHERE question_id='00000000-0000-4000-8000-000000000402') <> 1
     OR NOT EXISTS (SELECT 1 FROM public.questions WHERE id='00000000-0000-4000-8000-000000000402') THEN
    RAISE EXCEPTION 'FAIL: submissions or unrelated question/answer changed';
  END IF;
  RAISE NOTICE 'PASS: answered question and all related answers/options deleted; submissions and unrelated answer preserved';
END;
$success$;

DO $cross_project$
BEGIN
  IF public.admin_delete_question('00000000-0000-4000-8000-000000000403','00000000-0000-4000-8000-000000000101') IS DISTINCT FROM 'not_found'
     OR NOT EXISTS (SELECT 1 FROM public.questions WHERE id='00000000-0000-4000-8000-000000000403') THEN
    RAISE EXCEPTION 'FAIL: cross-project deletion was not rejected';
  END IF;
  RAISE NOTICE 'PASS: cross-project delete rejected';
END;
$cross_project$;

SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
DO $non_admin$
BEGIN
  BEGIN
    PERFORM public.admin_delete_question('00000000-0000-4000-8000-000000000402','00000000-0000-4000-8000-000000000101');
    RAISE EXCEPTION 'FAIL: non-admin deletion was accepted';
  EXCEPTION WHEN SQLSTATE '42501' THEN
    IF SQLERRM <> 'admin_required' THEN RAISE; END IF;
  END;
  RAISE NOTICE 'PASS: non-admin deletion denied';
END;
$non_admin$;

RESET ROLE;
CREATE FUNCTION public.cv_test_fail_hard_delete()
RETURNS trigger LANGUAGE plpgsql AS $function$
BEGIN
  IF OLD.id='00000000-0000-4000-8000-000000000402'::uuid THEN
    RAISE EXCEPTION 'cv_test_forced_delete_failure';
  END IF;
  RETURN OLD;
END;
$function$;
CREATE TRIGGER zz_cv_test_fail_hard_delete
BEFORE DELETE ON public.questions FOR EACH ROW EXECUTE FUNCTION public.cv_test_fail_hard_delete();
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
DO $rollback$
BEGIN
  BEGIN
    PERFORM public.admin_delete_question('00000000-0000-4000-8000-000000000402','00000000-0000-4000-8000-000000000101');
    RAISE EXCEPTION 'FAIL: forced failure did not abort';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN
    IF SQLERRM <> 'cv_test_forced_delete_failure' THEN RAISE; END IF;
  END;
  IF NOT EXISTS (SELECT 1 FROM public.questions WHERE id='00000000-0000-4000-8000-000000000402')
     OR (SELECT count(*) FROM public.answers WHERE question_id='00000000-0000-4000-8000-000000000402') <> 1 THEN
    RAISE EXCEPTION 'FAIL: child rows were not restored after rollback';
  END IF;
  RAISE NOTICE 'PASS: failed parent deletion rolls back child answer deletion';
END;
$rollback$;
RESET ROLE;
DROP TRIGGER zz_cv_test_fail_hard_delete ON public.questions;
DROP FUNCTION public.cv_test_fail_hard_delete();

ROLLBACK;
SELECT 'PASS: production-compatible hard-delete regression completed; all fixtures rolled back' AS test_result;
