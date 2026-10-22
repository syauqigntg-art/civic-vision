# CIVIC VISION — P1 project management QA

## PR #3 compatibility note

PR #3 is already merged. Its `supabase/p1-project-isolation.sql` migration is the current database baseline. **Do not execute `supabase/p1-project-management.sql` from this branch as a second migration.** It contains overlapping project/archive triggers and replaces student RPC functions. Review its logic as reference only; any behavior that is genuinely missing from the deployed PR #3 database must be extracted into a separate, narrowly scoped migration after reviewing the live schema and functions.

## Archive policy to verify

- `projects.is_active=true` means active; `false` means archived.
- Archiving must not delete videos, questions, groups, submissions, or answers.
- Teachers must be able to select an archived project and review historical results; write actions should be blocked.
- Students with draft work must not continue or submit while archived. Submitted work must remain available read-only if supported by the deployed RPC/API implementation.
- Video assignment must never connect a group and video across different projects.

## Preview test plan

1. Deploy this branch to Vercel Preview and verify the build is Ready before any merge.
2. Confirm it uses the intended Supabase project. Do not use production student data for destructive tests.
3. Create two temporary active projects named `UJI P1 PROYEK A` and `UJI P1 PROYEK B`.
4. Add one video, one question, and one group to each project. Assign each project's video only to its own group.
5. Switch A → B → A. Verify every page shows only the selected project's videos, questions, groups, assignments, submissions, and answers.
6. Test the selection behavior in two tabs and after refresh. The UI should not silently select the first project.
7. Archive only one temporary project. Verify teacher history remains readable and project edit/assignment controls are read-only. Verify draft work cannot be saved/submitted, while previously submitted work stays readable if the active API supports that policy.
8. Reactivate the temporary project and confirm the retained records are still present.
9. Do not archive or delete the real CIVIC VISION project. Only remove explicitly identified temporary test projects after confirming their dependent data is disposable.

## Completion record

Record the Preview deployment URL, build status, selected project, result of each isolation test, archive behavior, and any SQL/API errors. This checklist is a test plan, not proof that the tests have passed.
