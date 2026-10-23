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
- Each result applies only to its named SHA. After this documentation update, verify CI again on the exact current PR head.

## Vercel Ignored Build Step — cause now confirmed

The user-provided Vercel build log shows that the deployment was cancelled because the Ignored Build Step command returned exit code `0`. The configured command runs `git diff --quiet` between `VERCEL_GIT_PREVIOUS_SHA` and `VERCEL_GIT_COMMIT_SHA`, while excluding `README.md`, `docs/**`, `supabase/**`, and `.github/**` from the comparison.

For the documented commit `434e665`, the latest changes were documentation-only. Since the command found no relevant code changes after exclusions, `git diff --quiet` returned `0`, and the configured ignored-build logic correctly returned `0` to skip deployment. Vercel documents that exit code `0` skips the build while exit code `1` continues with a deployment: https://vercel.com/kb/guide/how-do-i-use-the-ignored-build-step-field-on-vercel

**Interpretation:** This particular status is an intentional Ignored Build Step outcome, not a failed Next.js build. It does not prove that the CSS/application build failed. It also does not prove a new deployment was produced for commit `434e665`.

The latest Vercel bot comment at the time of this review labels the associated deployment as **Ignored**:
- Deployment detail: https://vercel.com/uki8/civic-vision/diVYyZCzku1SVpTRZGszxKcGNAJi
- Preview alias: https://civic-vision-git-phase5-release-readiness-tests-uki8.vercel.app

A previous candidate deployment is associated with status link https://vercel.com/uki8/civic-vision/3fbeCgQr8BaiJ552xNgQGEJQvxUz on SHA `f3e052ede3f2bcc4d752b7d49ab8fd19504e707c`. Before using it for visual regression, open its deployment details and confirm the source SHA and target are correct. The application files were not changed by later documentation-only commits, so this deployment may be suitable for testing the Tailwind CSS migration, but it must not be described as a deployment of the newer documentation SHA.

## Preview and visual/browser validation — still incomplete

The previous Vercel API inspection returned HTTP 403 for team scope `uki8`, and the available browser/testing method could not open the Preview. Although the ignore reason for commit `434e665` is now explained by the log, a usable Preview deployment's source SHA and environment still need to be verified before results are recorded.

Remaining items:
1. Verify a usable Preview deployment and confirm its source SHA and target environment. Prefer the existing successful candidate deployment only if its details confirm that it contains the Tailwind v4 application code.
2. Run desktop and mobile visual tests: navigation, group identity, video/player, SEE/THINK/CONNECT/ACT forms, save/error states, submissions/results, admin login, video/group/question forms, tables, dialogs, and reduced-motion behavior.
3. Test student/PBL and admin flows using staging credentials and non-production data.
4. Confirm browser support requirements against Tailwind v4's stated floor of Safari 16.4+, Chrome 111+, and Firefox 128+: https://tailwindcss.com/docs/upgrade-guide
5. Record an independent code review. No independent review submission was recorded at the latest PR check.

A static review did not establish a definite code blocker, but it does not replace runtime testing or independent review.

## Other technical references

- Tailwind v4 PostCSS setup: https://tailwindcss.com/docs/installation/using-postcss
- Tailwind v4 upgrade guide and legacy `@config`: https://tailwindcss.com/docs/upgrade-guide
- Preflight behavior: https://tailwindcss.com/docs/preflight
- Dependency advisories previously triaged: https://github.com/advisories/GHSA-vfj7-8cjw-p6xm and https://github.com/advisories/GHSA-rj75-hqrm-r3gf

## Decision

**BLOCKED — keep PR #13 as Draft. Do not merge to `main`.**

Automated CI passed on SHA `434e665897636a02401d5d00b67bce03922877c9` in Run #93 before this documentation change. The cause of the latest Ignored deployment for `434e665` is now known: the command intentionally skips documentation-only commits. However, a usable Preview/source SHA must still be confirmed, desktop/mobile and functional browser tests must be recorded, browser support must be accepted, and an independent review remains outstanding. No Production, secrets, Supabase, or database changes were made during this validation.
