# CIVIC VISION — P1 project management QA

## Archive policy

- A project uses the existing `projects.is_active` flag: `true` means active and `false` means archived.
- Archiving never deletes videos, questions, groups, submissions, or answers.
- Teachers can select an archived project and review existing records/results. Project content and group-management actions are read-only; reopening a submitted result requires reactivating the project first.
- Students with a draft in an archived project cannot continue or submit while it is archived. Draft answers remain in the database and can be continued after the teacher reactivates the project. Students whose work was already submitted can still view their read-only result.
- A group can only be assigned a video from the same project. The UI filters available groups by the selected video's project, and a database trigger rejects cross-project writes.

## Deployment and migration order

1. Deploy this branch to a Preview environment and verify its build is Ready.
2. Confirm the Supabase project attached to Preview and Production. Use a backup before changing the shared database.
3. Review and run `supabase/p1-project-management.sql` in the intended Supabase SQL Editor. It checks existing cross-project assignments before installing the guard, replaces the student RPC definitions needed for archive policy, and does not delete answer/project records.
4. Keep this branch separate from `main` until the two-project and archive tests below pass.

## Manual test: selected project scope

1. In the admin Project page, create two temporary active projects named `UJI P1 PROYEK A` and `UJI P1 PROYEK B`. Do not repurpose the existing CIVIC VISION project.
2. Select project A in the header switcher. Add one video, one question, and one test group in project A. Assign the video to the group.
3. Switch to project B. Verify that project A's video, question, group, and answers do not appear. Add one different video, one different question, and one different test group in project B. Assign project B's video to its group.
4. Switch back to project A and refresh the page. Verify that A's data is still selected and no B-only item appears. Repeat in a second browser tab, selecting B there; switching one tab should not change the other tab's project selection.
5. Open Hasil Siswa in each project and verify that only that project's groups/submissions appear.

Expected: no page silently defaults to the first project; the selected project is explicit and saved per tab.

## Manual test: cross-project video assignment

1. In project A, note the test group's group ID. In project B, note the test video's video ID.
2. Use the SQL block below. It attempts a cross-project association inside a PL/pgSQL sub-block; a correctly configured trigger rejects it, and the failed insert is rolled back by the sub-block. It does not delete or update existing records.

```sql
DO $test$
DECLARE
  v_group_id uuid;
  v_video_id uuid;
BEGIN
  SELECT g.id INTO v_group_id
  FROM public.groups g
  JOIN public.projects p ON p.id = g.project_id
  WHERE p.title = 'UJI P1 PROYEK A'
  ORDER BY g.created_at DESC
  LIMIT 1;

  SELECT v.id INTO v_video_id
  FROM public.videos v
  JOIN public.projects p ON p.id = v.project_id
  WHERE p.title = 'UJI P1 PROYEK B'
  ORDER BY v.created_at DESC
  LIMIT 1;

  IF v_group_id IS NULL OR v_video_id IS NULL THEN
    RAISE EXCEPTION 'Siapkan satu kelompok uji di proyek A dan satu video uji di proyek B terlebih dahulu.';
  END IF;

  BEGIN
    INSERT INTO public.group_videos(group_id, video_id)
    VALUES (v_group_id, v_video_id);

    RAISE EXCEPTION 'P1_TEST_FAILED: database menerima penugasan lintas proyek.';
  EXCEPTION
    WHEN raise_exception THEN
      IF SQLERRM = 'Kelompok dan video harus berasal dari proyek yang sama.' THEN
        RAISE NOTICE 'P1 PASS: database menolak video dari proyek lain.';
      ELSIF SQLERRM = 'P1_TEST_FAILED: database menerima penugasan lintas proyek.' THEN
        RAISE;
      ELSE
        RAISE;
      END IF;
  END;
END;
$test$;
```

Expected: Supabase reports a NOTICE `P1 PASS: database menolak video dari proyek lain.`. This is a controlled rejection test; the attempted row is rolled back.

## Manual test: archive behavior

1. Record the row counts for one test project in `videos`, `questions`, `groups`, `submissions`, and `answers`.
2. Archive that temporary project in the admin Project page.
3. Verify that the archived project is marked `Diarsipkan`, its results can still be opened/read by the teacher, and its editing/assignment controls are disabled.
4. On a test group with draft work, verify the student content API blocks continuation with the archive message; check that existing draft answer rows are not deleted.
5. On a test group that was submitted before archiving (if available), verify the student can still view the read-only result.
6. Verify the project's row counts and existing answer hashes are unchanged.
7. Reactivate the project and verify its content and draft work become available again.
8. Do not archive the real production project for this test.

## Cleanup

After testing, identify the exact temporary projects by title. First confirm all the test data belongs only to `UJI P1 PROYEK A` and `UJI P1 PROYEK B`. Delete only those temporary projects if you are certain their attached test answers are no longer needed; project foreign keys may cascade and permanently delete their test data. Never delete the real CIVIC VISION project or actual student groups.

This document is a QA procedure, not proof that each scenario has passed. Record the observed result for each manual step before marking P1 complete.
