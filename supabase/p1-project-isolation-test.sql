-- Manual integration test for supabase/p1-project-isolation.sql.
-- Run in Supabase SQL Editor AFTER the migration. Entire test rolls back.
begin;

do $$
declare
  p1 uuid; p2 uuid;
  g1 uuid; g2 uuid;
  v1 uuid; v2 uuid;
  q1 uuid; s1 uuid;
  answer_count int;
begin
  insert into projects(title,is_active) values ('P1 TEST alpha',true) returning id into p1;
  insert into projects(title,is_active) values ('P1 TEST beta',true) returning id into p2;
  insert into groups(project_id,group_number,access_code) values (p1,901,'P1-A-'||upper(substr(gen_random_uuid()::text,1,8))) returning id into g1;
  insert into groups(project_id,group_number,access_code) values (p2,902,'P1-B-'||upper(substr(gen_random_uuid()::text,1,8))) returning id into g2;
  insert into videos(project_id,number,title) values (p1,901,'P1 video alpha') returning id into v1;
  insert into videos(project_id,number,title) values (p2,902,'P1 video beta') returning id into v2;

  -- Valid same-project assignment succeeds.
  insert into group_videos(group_id,video_id) values (g1,v1);
  -- Cross-project assignment must fail (trigger or composite FK).
  begin
    insert into group_videos(group_id,video_id) values (g1,v2);
    raise exception 'FAIL: cross-project group/video assignment was accepted';
  exception when others then
    if sqlerrm like 'FAIL:%' then raise; end if;
  end;

  insert into questions(project_id,category,question_text,question_type,display_order)
    values (p1,'P1 test','P1 question alpha','textarea',901) returning id into q1;
  insert into submissions(project_id,group_id,video_id,status)
    values (p1,g1,v1,'draft') returning id into s1;
  insert into answers(project_id,submission_id,question_id,answer_text)
    values (p1,s1,q1,'saved before archive');

  update projects set is_active=false where id=p1;

  -- Existing answer remains intact after archiving.
  select count(*) into answer_count from answers where submission_id=s1 and answer_text='saved before archive';
  if answer_count <> 1 then raise exception 'FAIL: archived project answer was not retained'; end if;

  -- Archived content must be read-only.
  begin
    insert into questions(project_id,category,question_text,question_type,display_order)
      values (p1,'P1 test','Should be blocked','textarea',902);
    raise exception 'FAIL: archived project accepted a content write';
  exception when others then
    if sqlerrm like 'FAIL:%' then raise; end if;
  end;

  raise notice 'PASS: multi-project separation, cross-project assignment rejection, and archive retention/read-only behavior.';
end $$;

rollback;
