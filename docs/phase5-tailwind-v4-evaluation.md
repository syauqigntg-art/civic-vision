# Tahap 5C — Tailwind CSS v4 remediation evaluation

Reviewed: 2026-10-25 (Asia/Jakarta)

## Scope and base/head snapshot

- PR #13: https://github.com/syauqigntg-art/civic-vision/pull/13
- Base branch: `main`; head branch: `phase5/release-readiness-tests`.
- The application migration originally touched seven files: `app/globals.css`, `package.json`, `package-lock.json`, `postcss.config.mjs`, `tailwind.config.js`, deletion of `tailwind.config.ts`, and this evaluation document.
- **Stacked-branch scope note (updated 2026-10-25):** PR #14 is merged into this source branch at `ecdae3385ce016ab02f798e92a01a55a834cd58d` to remediate Zod. PR #11 has also merged into this branch at `87b01d8c7b39c244a8dc79fd5f20945adeada22a`, bringing `docs/phase6-final-verification.md` into PR #13's diff. The live GitHub changed-file endpoint now reports **eight files**: the seven original migration/evaluation files plus the inherited Phase 6 document. This added document is not part of the intended Tailwind application migration and the PR description must acknowledge it. PR #13 remains Open/Draft pending independent review and its remaining verification gates.

## Migration changes

| File | Change |
|---|---|
| `package.json` / `package-lock.json` | Use `tailwindcss@4.3.3` and `@tailwindcss/postcss@4.3.3`; remove direct `autoprefixer`. |
| `postcss.config.mjs` | Replace the v3 `tailwindcss` plugin with `@tailwindcss/postcss`. |
| `app/globals.css` | Replace v3 directives with v4 theme/utilities CSS imports; omit `tailwindcss/preflight.css` to preserve the intended no-Preflight styling. |
| `tailwind.config.ts` → `tailwind.config.js` | Load legacy JavaScript configuration explicitly with `@config`; remove unsupported `corePlugins.preflight`. |

## Automated test evidence

- Initial migration candidate [Run #62](https://github.com/syauqigntg-art/civic-vision/actions/runs/39899004570) passed installation, TypeScript, 12 tests, source invariants, Next.js build (17/17 static pages), and dependency audit steps.
- Candidate SHA `f3e052ede3f2bcc4d752b7d49ab8fd19504e707c` passed [Run #83](https://github.com/syauqigntg-art/civic-vision/actions/runs/39937221235).
- SHA `bbd38280d19db4480062aa4cb754ac23e3f4c8a0` passed [Run #87](https://github.com/syauqigntg-art/civic-vision/actions/runs/39938450784).
- SHA `c114bd8c671603b0d325e623030f6459feaa2fe6` passed [Run #89](https://github.com/syauqigntg-art/civic-vision/actions/runs/39940082224).
- SHA `424a07cb082c088b394adc2d33d690875cfadd3d` passed [Run #91](https://github.com/syauqigntg-art/civic-vision/actions/runs/39940231989).
- SHA `434e665897636a02401d5d00b67bce03922877c9` passed [Run #93](https://github.com/syauqigntg-art/civic-vision/actions/runs/39940400099). The run completed successfully, including lockfile installation, TypeScript, regression tests, invariants, Next.js production build, and both dependency-reporting steps.
- [Run #94](https://github.com/syauqigntg-art/civic-vision/actions/runs/39941222968) (push) and [Run #95](https://github.com/syauqigntg-art/civic-vision/actions/runs/39941232720) (pull request) passed on SHA `eb10faff2858bc5293b83eff8be6e1622b0dd520`.
- [Run #96](https://github.com/syauqigntg-art/civic-vision/actions/runs/39942579677) (push) and [Run #97](https://github.com/syauqigntg-art/civic-vision/actions/runs/39942585051) (pull request) passed on PR #13 head SHA `0b31b0babb6d37811dc259b6ba71fb74e233665b`. This exact-SHA report supersedes stale text that said Run #97 was still running.
- These results apply only to their named SHAs. PR #13's CI must be rechecked after base/head changes; PR #11's newer documentation commit has a separate CI run.

## Vercel deployment status and Ignored Build Step

The recorded Vercel bot comment for a docs-only commit shows **Ignored** after the configured Ignored Build Step returned exit code 0. The command uses `git diff --quiet` and excludes `README.md`, `docs/**`, `supabase/**`, and `.github/**`. Therefore a documentation-only change can intentionally skip a new build. This is not a failed application build, but it is not proof of a new deployment either.

- Previously recorded ignored deployment: https://vercel.com/uki8/civic-vision/3xH6quX3bBjJNP1cuostB8c8HmjR
- Earlier candidate application deployment: https://vercel.com/uki8/civic-vision/3fbeCgQr8BaiJ552xNgQGEJQvxUz

A Vercel status marked success or a Ready deployment for another SHA is not proof that the current exact PR #13 candidate was freshly deployed to Preview and tested.

## Manual smoke-test report — user-reported

On 2026-10-23, the user reported these six manual smoke checks as PASS on the site they opened. They are recorded as **user-reported** and were not independently executed by the agent:

| Check | Reported result |
|---|---|
| Beranda dan navigasi | PASS — user-reported |
| Tampilan mobile | PASS — user-reported |
| Pemutar video | PASS — user-reported |
| Formulir SEE–THINK–CONNECT–ACT | PASS — user-reported |
| Penyimpanan jawaban | PASS — user-reported |
| Halaman admin | PASS — user-reported |

The report did not itself identify the exact deployment SHA/target, test browser/version, explicit desktop viewport, or staging database evidence. These remain separate verification requirements.

## Remaining Preview, browser and staging gates

1. Match the tested deployment to its exact source SHA and confirm Vercel target is Preview.
2. Verify the Preview's Supabase URL points to the intended staging project; keep secrets out of documentation and artifacts.
3. Record explicit desktop and tablet results, in addition to the reported mobile PASS; document browser/OS versions and tested viewports.
4. Cover relevant PBL and admin flows, including validation, save/retry, authorization, error states, and keyboard accessibility.
5. Verify browser console/network behavior and ensure tests did not call Production Supabase.
6. For write/concurrency tests, capture sanitized request ordering and staging-row evidence for autosave, retries, duplicate saves/submits, and submit-over-save races. Do not run these against Production.
7. Obtain an independent code review and document the accepted browser compatibility floor for Tailwind v4 (the previously recorded floor is Safari 16.4+, Chrome 111+, Firefox 128+; see https://tailwindcss.com/docs/upgrade-guide).

## Release decision

**BLOCKED — PR #13 stays Draft and must not be merged to `main` until the inherited documentation scope is accurately disclosed, required CI and merge-policy checks are verified, independent review is recorded, and applicable browser/staging/compatibility gates are closed or formally waived by an authorized owner.**

The CI results and six user-reported manual smoke tests are positive but do not prove exact Preview identity, verified staging target, the complete browser matrix, persisted-row consistency, the Tailwind browser-floor decision, or an independent review. The Phase 6 file is already included in this PR's live diff because PR #11 merged into the source branch. The live file count is eight. Automated validation and a Ready Preview status are positive evidence tied to the current head but do not close the browser/staging, compatibility, or independent-review gates.

No application code, Production configuration, secrets, environment variables, Supabase configuration, or database was changed as part of these documentation edits.
