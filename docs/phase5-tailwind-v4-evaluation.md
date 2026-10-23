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
- SHA `424a07cb082c088b394adc2d33d690875cfadd3d` passed [Run #91](https://github.com/syauqigntg-art/civic-vision/actions/runs/39940231989). The run completed successfully, including lockfile installation, TypeScript, regression tests, source invariants, Next.js production build, and both dependency-reporting steps.
- These results apply only to their exact named SHAs. Always check that the latest CI run's head SHA exactly matches the current PR head; successful results from prior commits do not validate a later commit.

## Vercel Preview — BLOCKED / NOT VERIFIED

The latest Vercel bot comment on PR #13 reports the associated deployment as **Ignored**:
- Deployment detail: https://vercel.com/uki8/civic-vision/Fzv19C9h4UwDAjeqdMU6ZSA2DUoU
- Preview hostname: https://civic-vision-git-phase5-release-readiness-tests-uki8.vercel.app

The combined commit status for SHA `424a07cb082c088b394adc2d33d690875cfadd3d` showed Vercel `success`, while the Vercel bot's deployment comment for the associated deployment says `Ignored`. These signals conflict. A green status alone does not prove that a usable Preview was deployed from the exact PR head and configured for staging.

The reported validation attempt received HTTP 403 from the Vercel API for team scope `uki8`, and the available browser/testing method could not open Preview. The exact underlying reason for Ignored remains unverified.

Still unresolved:
1. Whether there is a usable Preview deployment for the exact current PR head SHA.
2. The source SHA and environment/target attached to the usable deployment.
3. Why the deployment was marked Ignored.

Next safe action: restore authorized access to the Vercel team/project, inspect the deployment details and any configured Ignored Build Step, then use an approved Preview-only retry or fix if appropriate. Do not bypass deployment protection, trigger a Production deployment, or change project-wide settings without explicit authorization.

## Visual, functional, browser, and code-review gates — BLOCKED

These checks have **not** been completed against a verified Preview:

- Desktop visual testing.
- Mobile visual testing.
- Student/PBL flows: group access, assigned video playback, SEE/THINK/CONNECT/ACT forms, saving responses, success/error states, and submission/results where available.
- Admin flows using staging credentials/data: login, video/question/group forms, access codes, validation, tables/dialogs.
- Actual browser/version compatibility, including the Tailwind v4 floor of Safari 16.4+, Chrome 111+, and Firefox 128+: https://tailwindcss.com/docs/upgrade-guide
- Independent code review submission: none was recorded at the latest PR review check.

A static review did not establish a definite code blocker, but it is not a substitute for browser/runtime testing or an independent review. Do not mark these gates PASS without evidence.

## Other technical references

- Tailwind v4 PostCSS setup: https://tailwindcss.com/docs/installation/using-postcss
- Tailwind v4 upgrade guide and legacy `@config`: https://tailwindcss.com/docs/upgrade-guide
- Preflight behavior: https://tailwindcss.com/docs/preflight
- Dependency advisories previously triaged: https://github.com/advisories/GHSA-vfj7-8cjw-p6xm and https://github.com/advisories/GHSA-rj75-hqrm-r3gf

## Decision

**BLOCKED — keep PR #13 as Draft. Do not merge to `main`.**

Automated CI passed on the exact SHA in Run #91, but the Vercel bot reports the associated deployment as Ignored, Preview source/environment is not verified, and visual/browser plus independent review evidence is absent. The latest head's CI must be verified by exact SHA for any new commit. No Production, secrets, Supabase, or database changes were made in this validation.
