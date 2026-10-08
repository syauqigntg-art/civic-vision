-- Untuk database yang SUDAH dibuat dari versi sebelumnya (idempotent). Instalasi baru tidak perlu.
alter table questions add column if not exists phase text check(phase in('see','think','connect','act'));
update questions set phase=case category when 'Masalah' then 'see' when 'Penyebab' then 'think' when 'Nilai Pancasila' then 'connect' when 'Dampak' then 'connect' else 'act' end where phase is null;
create index if not exists i_answers_sub on answers(submission_id); create index if not exists i_subs_group on submissions(group_id); create index if not exists i_q_proj on questions(project_id,display_order);
create index if not exists i_gm_group on group_members(group_id); create index if not exists i_gv_group on group_videos(group_id); create index if not exists i_v_proj on videos(project_id,number); create index if not exists i_qo_q on question_options(question_id);
