# Tahap 5C — Tailwind CSS v4 remediation evaluation

Reviewed: 2026-10-23 (Asia/Jakarta)

## Scope and baseline

- PR #13: https://github.com/syauqigntg-art/civic-vision/pull/13
- Base branch: `main`; head branch: `phase5/release-readiness-tests`.
- Head SHA verified before this documentation update: `bbd38280d19db4480062aa4cb754ac23e3f4c8a0`.
- PR #13 changes are limited to seven migration/documentation files: `app/globals.css`, `package.json`, `package-lock.json`, `postcss.config.mjs`, `tailwind.config.js`, deletion of `tailwind.config.ts`, and this evaluation document.

## Migration changes

| File | Change |
|---|---|
| `package.json` / `package-lock.json` | Use `tailwindcss@4.3.3` and `@tailwindcss/postcss@4.3.3`; remove direct `autoprefixer`. |
| `postcss.config.mjs` | Replace the v3 `tailwindcss` plugin with `@tailwindcss/postcss`. |
| `app/globals.css` | Replace v3 directives with v4 theme/utilities CSS imports; omit `tailwindcss/preflight.css` to preserve the intended no-Preflight design. |
| `tailwind.config.ts` → `tailwind.config.js` | Load legacy JavaScript configuration explicitly using `@config`; remove unsupported `corePlugins.preflight`. |

## Automated test evidence

- Initial migration candidate [Run #62](https://github.com/syauqigntg-art/civic-vision/actions/runs/39899004570) passed installation, TypeScript, 12 tests, source invariants, Next.js build (17/17 static pages), and dependency audit steps.
- Candidate SHA `f3e052ede3f2bcc4d752b7d49ab8fd19504e707c` passed [Run #83](https://github.com/syauqigntg-art/civic-vision/actions/runs/39937221235).
- The later head SHA `bbd38280d19db4480062aa4cb754ac23e3f4c8a0` passed [Run #87](https://github.com/syauqigntg-art/civic-vision/actions/runs/39938450784). Recorded successful steps include lockfile installation, TypeScript, PBL/admin copy/accessibility regression tests, whitespace check, security/PBL invariants, Next.js production build, and both dependency-reporting steps.
- Run #87 proves automated CI passed on SHA `bbd3828...` before this documentation update. Since this change creates a new commit on the PR head, the new head must pass CI before it can be considered current and green.
- A successful Vercel check/status is not conclusive deployment evidence if the deployment bot reports the deployment as ignored or skipped.

## Vercel Preview — BLOCKED / NOT VERIFIED

The Vercel bot comment on PR #13 reports one **Ignored** deployment for project `civic-vision` and links to the Preview action/deployment:
- Vercel deployment detail: https://vercel.com/uki8/civic-vision/5h3wQWXw78KGPNEespokkfNPjN1n
- Preview hostname: https://civic-vision-git-phase5-release-readiness-tests-uki8.vercel.app

The combined commit status shows a Vercel success status, while the Vercel bot comment identifies the related deployment as Ignored. These signals conflict and must not be treated as proof of a successful Preview. During this validation attempt, the Vercel API returned HTTP 403 for team scope `uki8`, and the available browser/testing method could not open the Preview.

Still unverified:
1. Whether Vercel actually created and made available a Preview deployment for the exact PR head SHA.
2. The source SHA and target environment attached to a usable deployment.
3. Why Vercel marked the reported deployment Ignored/Skipped.

Do not guess the cause or attempt to bypass deployment protection. Restore authorized Vercel connector access, inspect the project's deployment details and the Ignored Build Step/configuration, and only then use an approved mechanism to create/retry a **Preview** from the latest PR head. Do not trigger a Production deployment or change project-level settings without explicit authorization.

## Visual, functional, browser, and review gates — BLOCKED

These tests have **not** been run against a verified Preview because the deployment could not be confirmed/opened:

- Desktop visual checks.
- Mobile visual checks.
- Student flows: group access/identity, assigned video playback, SEE/THINK/CONNECT/ACT forms, saving responses, error/success states, and submissions/results where implemented.
- Admin flows using non-production credentials/data: login, video/question/group forms, access codes, validation, and table/dialog behavior.
- Browser/version compatibility checks, including the expected Tailwind v4 browser floor of Safari 16.4+, Chrome 111+, and Firefox 128+: https://tailwindcss.com/docs/upgrade-guide
- Independent code review submission: none was recorded on PR #13 at the time of this check.

A static review of the seven-file diff did not establish a definite code blocker, but it is not a substitute for browser/runtime validation or independent review. Do not mark these gates PASS.

## Other compatibility references

- Tailwind v4 PostCSS setup: https://tailwindcss.com/docs/installation/using-postcss
- Tailwind v4 upgrade guide and legacy `@config` considerations: https://tailwindcss.com/docs/upgrade-guide
- Preflight behavior: https://tailwindcss.com/docs/preflight
- Dependency advisories previously triaged: https://github.com/advisories/GHSA-vfj7-8cjw-p6xm and https://github.com/advisories/GHSA-rj75-hqrm-r3gf

## Decision

**BLOCKED — keep PR #13 as Draft. Do not merge to `main`.**

Automated CI passed on the previously verified head SHA `bbd38280d19db4480062aa4cb754ac23e3f4c8a0`, but this documentation update creates a new head commit and requires fresh CI. Preview source/environment, visual and functional browser tests, and an independent review remain unresolved. No Production, secrets, Supabase, or database changes were made as part of this validation.
