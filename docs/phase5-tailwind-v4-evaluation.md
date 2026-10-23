# Tahap 5C — Tailwind CSS v4 remediation evaluation

Reviewed: 2026-10-23 (Asia/Jakarta)

## Scope and baseline

- PR #13: https://github.com/syauqigntg-art/civic-vision/pull/13
- Base branch: `main`; head branch: `phase5/release-readiness-tests`.
- The intended diff contains seven migration/documentation files: `app/globals.css`, `package.json`, `package-lock.json`, `postcss.config.mjs`, `tailwind.config.js`, deletion of `tailwind.config.ts`, and this document.

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
- [Run #94](https://github.com/syauqigntg-art/civic-vision/actions/runs/39941222968) (push) and [Run #95](https://github.com/syauqigntg-art/civic-vision/actions/runs/39941232720) (pull request) passed on exact head SHA `eb10faff2858bc5293b83eff8be6e1622b0dd520`, including lockfile installation, TypeScript, PBL/admin copy/accessibility regressions, patch whitespace, PBL/security invariants, Next.js build, and dependency reports.
- Each result applies only to its named SHA. This release-readiness documentation update creates a newer docs-only commit, so confirm CI is green again on the resulting exact PR head.

## Vercel Ignored Build Step — cause now confirmed

The Vercel log supplied for this PR shows that a deployment was cancelled because the configured Ignored Build Step returned exit code `0`. The command runs `git diff --quiet` between `VERCEL_GIT_PREVIOUS_SHA` and `VERCEL_GIT_COMMIT_SHA`, excluding `README.md`, `docs/**`, `supabase/**`, and `.github/**`.

The latest previously recorded PR head, `eb10faff2858bc5293b83eff8be6e1622b0dd520`, contains documentation-only changes. Those changes are excluded by the command, so the deployment was intentionally skipped. The current bot comment labels the deployment **Ignored**:
- Deployment detail: https://vercel.com/uki8/civic-vision/3xH6quX3bBjJNP1cuostB8c8HmjR
- Existing candidate deployment: https://vercel.com/uki8/civic-vision/3fbeCgQr8BaiJ552xNgQGEJQvxUz

An Ignored result for a docs-only commit is not a failed application build, but neither does it prove that a new deployment was produced for that commit. Do not treat a generic Vercel `success` status as proof of a fresh Preview.

## Manual smoke-test report — 2026-10-23

The user reported that all six smoke-test items passed on the site they opened:

| Check | Reported result |
|---|---|
| Beranda dan navigasi | PASS |
| Tampilan mobile | PASS |
| Pemutar video | PASS |
| Formulir SEE–THINK–CONNECT–ACT | PASS |
| Penyimpanan jawaban | PASS |
| Halaman admin | PASS |

This records **six user-reported manual PASS results**. The report does not itself include the exact source commit SHA or the target environment displayed in the deployment details, so those details must still be matched before attributing these results conclusively to the Tailwind v4 candidate. The mobile result is explicit; a separately labelled desktop viewport result was not included in the report.

## Preview and browser validation — remaining

The smoke-test report is positive progress, but these release-evidence items remain open:

1. Confirm the tested deployment's source SHA and target environment. The existing candidate deployment is associated with SHA `f3e052ede3f2bcc4d752b7d49ab8fd19504e707c`; use it for this PR only if its Vercel details confirm that SHA and the Preview target.
2. Record an explicit desktop viewport result alongside the reported mobile PASS, and confirm the broader student/PBL and admin flows were tested in a non-production environment with test data.
3. Confirm the supported-browser floor with evidence for Tailwind v4's stated minimums: Safari 16.4+, Chrome 111+, and Firefox 128+: https://tailwindcss.com/docs/upgrade-guide. Passing in one browser does not establish all three.
4. Obtain and record an independent code review. No independent review submission was present at the latest check.

A static review and passing CI do not replace deployment identity verification, browser compatibility evidence, or independent review.

## Other technical references

- Tailwind v4 PostCSS setup: https://tailwindcss.com/docs/installation/using-postcss
- Tailwind v4 upgrade guide and legacy `@config`: https://tailwindcss.com/docs/upgrade-guide
- Preflight behavior: https://tailwindcss.com/docs/preflight
- Dependency advisories previously triaged: https://github.com/advisories/GHSA-vfj7-8cjw-p6xm and https://github.com/advisories/GHSA-rj75-hqrm-r3gf

## Decision

**BLOCKED — keep PR #13 as Draft. Do not merge to `main` yet.**

The user-reported smoke test passed all six listed checks. The remaining release gates are: matching the tested Preview to its source SHA/environment, explicit desktop and broader non-production-flow evidence, supported-browser compatibility evidence, and independent code review. The documentation-only commit does not require changing the Ignored Build Step or production configuration. No Production, secrets, Supabase, or database changes were made during this validation.
