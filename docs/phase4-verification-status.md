# CIVIC VISION — Tahap 4: Dependency, staging, dan runtime verification ledger

Last checked: 2026-10-23 (Asia/Jakarta)

## Candidate and evidence baseline

- Phase 3 candidate SHA: `7768f374db177e18b7804ca8f618167f36bba4e9`.
- Phase 4 audit branch: `phase4/dependency-and-staging-gates`.
- Initial Phase 4 workflow/audit-report commit: `bcfdfcecc804a02b92e23243b4a471e8d9a358fe`.
- [GitHub Actions Run #48](https://github.com/syauqigntg-art/civic-vision/actions/runs/39894916424) completed successfully on that Phase 4 commit. The production-only audit found 0 vulnerabilities. The separate full-tree audit step is intentionally report-only while its findings are triaged.
- Run #47 on the Phase 3 candidate also passed TypeScript, 12/12 unit tests, PBL/security invariants, build (17/17 static pages), and production dependency audit.

## 4A — Full dependency tree audit

The lockfile and `npm audit --json` report were checked from a clean `npm ci` runner. The full dependency graph reports 7 affected package entries (5 high, 2 moderate, 0 critical, 0 low). These are not seven independent root-cause advisories: the report traces primarily to two dependency issues in the Tailwind CSS v3 build toolchain.

| Package / installed version | Severity shown by npm | Dependency path / finding | Disposition |
|---|---|---|---|
| `braces@3.0.3` | High | GHSA-vfj7-8cjw-p6xm: stack-exhaustion denial-of-service issue; enters via `chokidar@3.6.0` and `fast-glob@3.3.3 → micromatch@4.0.8`. | No patched `braces` version was listed in npm's current graph; upstream tracking reports 3.0.3 remains latest and no patch release is available as of this review. Do not invent an override target or claim fixed. See https://github.com/advisories/GHSA-vfj7-8cjw-p6xm and https://github.com/micromatch/braces/issues/84. |
| `postcss-selector-parser@6.1.4` | Moderate | GHSA-rj75-hqrm-r3gf: quadratic parsing complexity for long flat selectors; installed version is below the patched 7.1.6 release. It enters via `postcss-nested@6.2.0` and Tailwind CSS v3. | The direct patched major version is outside the current parent's `^6.1.x` range. npm recommends `tailwindcss@4.3.3` as a major update rather than a compatible one-step fix. See https://github.com/advisories/GHSA-rj75-hqrm-r3gf. |

Relevant direct toolchain versions from the lockfile: `tailwindcss@3.4.19`, `postcss@8.5.29`, `autoprefixer@10.6.1`, `chokidar@3.6.0`, `fast-glob@3.3.3`, `micromatch@4.0.8`, `braces@3.0.3`, `postcss-nested@6.2.0`, and `postcss-selector-parser@6.1.4`.

### Risk and remediation decision

- The affected packages are marked development/build tooling in the lockfile; `npm audit --omit=dev` reports zero production dependency vulnerabilities on the same CI run. This narrows the known finding to the dev/build dependency tree; it does **not** mean the full tree is clean or that build-time risk is impossible.
- npm proposes `tailwindcss@4.3.3`, which is a semver-major migration, not a routine patch. The current repo uses a JS/TS config with `corePlugins: { preflight: false }`, `postcss.config.mjs` with the v3 PostCSS plugin, and `@tailwind base/components/utilities` directives in `app/globals.css`.
- Tailwind's official v3→v4 guide states v4 removes the old `@tailwind` directives in favor of CSS imports and moves the PostCSS plugin to `@tailwindcss/postcss`; the upgrade must also preserve the intentional no-preflight behavior and current custom styling. Reference: https://tailwindcss.com/docs/upgrade-guide and https://tailwindcss.com/docs/installation/using-postcss.
- **Decision:** do not apply `npm audit fix --force`, force an override to a nonexistent/unverified patched `braces` version, or silently move this branch to Tailwind v4. Instead treat Tailwind v4 migration as a separately reviewed dependency-remediation candidate that must pass build and visual/browser regression checks. Until the advisories are fixed or formally accepted with a documented owner/expiry, the full dependency-tree release gate remains open.
- CI's full-tree step is explicitly labeled triage/report-only to expose complete package-level findings; do not interpret its success as a clean full-tree audit. The production-only audit remains a blocking CI step.

## 4B — Vercel Preview and staging target

- The documented Preview alias/deployment belongs to Vercel scope `uki8`. Official Vercel project/environment/deployment reads return HTTP 403: `Not authorized: Trying to access resource under scope "uki8"`.
- The Vercel connector's authorized team list and deployment-context list return no accessible teams. A lookup of the account's accessible projects may show a project name, but project detail, environment metadata, and deployment listing still fail 403; this is not sufficient to establish the existing Preview deployment's source SHA or Supabase target.
- The available tool surface in this session does not expose the recommended `authorize_team_access` / `authorize_team_sso` action. No access-control bypass, secret retrieval, or Preview write test was attempted.
- **Status: BLOCKED.** Need the approved Vercel access/authorization path for scope `uki8`; then verify the exact deployment Git SHA and the Preview environment's `NEXT_PUBLIC_SUPABASE_URL` matches staging ref `bneqqkvhehrlcjhvvyvv` without printing key values. No environment variables were changed.

## 4C — Browser behavior

Not run, because Preview cannot yet be confirmed to use staging. Do not perform any database-writing student test until this gate is cleared.

Scenarios to record with expected/actual result and evidence after authorized Preview verification:
1. Student case list: retry after load/network error; empty assignments remain distinct from failures.
2. Analysis page: retry/back navigation after load error; pending local draft is preserved.
3. Identity form: duplicate click while save is in-flight; network/server failure preserves text and shows error; one successful request continues to the case list.
4. Teacher flow: project/video/question/group management, options and required validation, empty/error/loading states, and mobile layout.
5. Confirm whether teacher reopen-submission UI/RPC exists. If it cannot be found, mark not implemented/not confirmed rather than passed.

## 4D — Autosave/submit concurrency

Not run. No database-writing tests or migrations were added in this Phase 4 audit step.

Run only against the verified staging target with synthetic data:
1. Type answer then submit immediately; the stored submitted value equals the last text.
2. Interrupt connection during autosave then reconnect; queued value retries and persists without silent loss.
3. Deliver a delayed save after submit; server rejects it and the submitted value remains unchanged.
4. Exercise two overlapping save/submit requests and verify the shared submission-row lock serializes them.

Live function metadata/SQL lock inspection is not a runtime concurrency test. Do not run `supabase db push` until the staging migration ledger is reconciled.

## 4E — Acceptance gate snapshot

| Gate | Status | Evidence / blocker |
|---|---|---|
| Candidate SHA pinned | Passed for the recorded runs | Run #48 is tied to `bcfdfcecc804a02b92e23243b4a471e8d9a358fe`; any follow-up change requires a new run. |
| TypeScript, unit tests, source invariants, build | Passed on Run #48 | The run contains these success steps; unit test summary should be confirmed in logs. |
| Production dependency audit | Passed | Run #48 reports `found 0 vulnerabilities` for `npm audit --omit=dev`. |
| Full dependency tree | Open | 5 high and 2 moderate package entries; root issues and migration impact documented above, no compatible fix applied. |
| Preview source/configuration | Blocked | Vercel scope `uki8` API 403; exact SHA/environment cannot be verified. |
| Browser UX behavior | Blocked / not tested | Waiting for verified Preview→staging environment. |
| Autosave/submit runtime concurrency | Blocked / not tested | Must use synthetic data in verified staging; not proved by source audit. |
| Production release | Not approved | PR #6 and PR #7 remain Draft; no merge/release from this task. |
