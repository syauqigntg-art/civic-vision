# CIVIC VISION — PR2 QA after PR3

## Important migration note
PR #3 has already been merged and its database migration, `supabase/p1-project-isolation.sql`, is the current project-isolation baseline. **Do not run `supabase/p1-project-management.sql` from the original PR #2 branch against this database.** That file defines overlapping archive/cross-project triggers and replaces student RPC functions. Any missing behavior must be compared to the live database and implemented as a new, narrowly scoped migration after review.

## Preview checks
1. Deploy branch `p1/pr2-aligned-with-pr3` to Vercel Preview and confirm the build is Ready.
2. Confirm Preview is connected to the intended Supabase project. Do not use real student data for destructive tests.
3. Create two disposable active projects called `UJI P1 PROYEK A` and `UJI P1 PROYEK B`.
4. Add one video, one question, and one group to each project. Assign only each project's video to its own group.
5. Switch A → B → A. Confirm dashboard, videos, questions, groups, assignments, submissions, and answers stay within the selected project.
6. Check project selection in two browser tabs and after refresh. There should be no silent fallback to the first project.
7. Archive only one temporary project. Confirm teacher results remain readable and edit/assignment actions are read-only. Test draft save/submit blocking and submitted result viewing.
8. Reactivate the test project and confirm the data still exists.
9. Never archive or delete the real CIVIC VISION project. Only delete explicitly identified disposable test projects after confirming their attached data may be removed.

## Record results
Record the Preview URL, build result, project-isolation results, archive behavior, and any SQL/API error. This is a test plan and not proof that the test has passed.
