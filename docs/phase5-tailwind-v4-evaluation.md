# Tahap 5C — Tailwind CSS v4 remediation evaluation

Reviewed: 2026-10-23 (Asia/Jakarta)

## Scope and baseline

- Dedicated dependency-remediation candidate based on the PR #8 baseline SHA `5d3fae3e101dcd7f59d3ac185699277246e1b121`.
- Initial candidate: `5fbea2c77ba7bb847f3015f4fff1210652f6c274`; [GitHub Actions Run #62](https://github.com/syauqigntg-art/civic-vision/actions/runs/39899004570) completed successfully on that SHA.
- The migration changes the CSS build toolchain. It does not change Supabase schema or application request semantics.

## Migration changes tested

| File | Change |
|---|---|
| `package.json` / `package-lock.json` | Use `tailwindcss@4.3.3` and `@tailwindcss/postcss@4.3.3`; remove direct `autoprefixer`. |
| `postcss.config.mjs` | Replace the v3 `tailwindcss` plugin with `@tailwindcss/postcss`. |
| `app/globals.css` | Replace v3 directives with v4 theme/utilities CSS imports; omit `tailwindcss/preflight.css` to preserve the no-Preflight design constraint. |
| `tailwind.config.ts` → `tailwind.config.js` | Load a legacy JavaScript config explicitly with `@config`; remove unsupported `corePlugins.preflight` and preserve intended content scan paths. |

## Build and dependency evidence

GitHub Actions [Run #62](https://github.com/syauqigntg-art/civic-vision/actions/runs/39899004570) on the initial candidate passed `npm ci`, TypeScript, 12 unit tests, PBL/security source invariants, Next.js build (17/17 static pages), `npm audit --omit=dev` with 0 vulnerabilities, and the full dependency audit with 0 advisories.

The previous PR #13 candidate SHA `f3e052ede3f2bcc4d752b7d49ab8fd19504e707c` passed [GitHub Actions Run #83](https://github.com/syauqigntg-art/civic-vision/actions/runs/39937221235). Its Vercel status was also reported as success: https://vercel.com/uki8/civic-vision/3fbeCgQr8BaiJ552xNgQGEJQvxUz.

These results apply to the named SHAs only. A successful build or Vercel status by itself does not confirm which Preview SHA/environment was tested or prove visual equivalence.

## Compatibility considerations and references

- Tailwind v4's official upgrade guide states a browser floor of Safari 16.4+, Chrome 111+, and Firefox 128+: https://tailwindcss.com/docs/upgrade-guide
- The PostCSS plugin moved to `@tailwindcss/postcss`, with changed import/vendor-prefix handling: https://tailwindcss.com/docs/installation/using-postcss
- Legacy JS configuration must be loaded explicitly with `@config`; v3 `corePlugins`, `safelist`, and `separator` settings are not supported in v4: https://tailwindcss.com/docs/upgrade-guide
- Preflight reset styles are omitted by importing only theme and utilities: https://tailwindcss.com/docs/preflight
- Audited issues: `braces@3.0.3` / GHSA-vfj7-8cjw-p6xm and `postcss-selector-parser <7.1.6` / GHSA-rj75-hqrm-r3gf: https://github.com/advisories/GHSA-vfj7-8cjw-p6xm and https://github.com/advisories/GHSA-rj75-hqrm-r3gf.

## Remaining release gates — not yet verified

1. **Preview source SHA and environment: NOT VERIFIED.** The Vercel status on the previously tested merge SHA was successful, but the exact Preview deployment source SHA and staging environment still need explicit confirmation.
2. **Visual/browser regression: NOT VERIFIED.** Compare desktop and mobile behavior for home/navigation, group identity, assigned videos and player, SEE/THINK/CONNECT/ACT phase forms, save/error states, submissions/results, admin login, video/group/question forms, tables, dialogs, and reduced-motion behavior.
3. Confirm students' browser support needs against Tailwind v4's minimum versions. If older browsers must be supported, v4 may not meet the requirement.
4. Recheck the current PR head's CI after any updates. Do not treat results from an earlier SHA as proof for a new one.

## Decision

**Keep PR #13 as Draft until the current head's CI succeeds, Preview SHA/environment are verified, and desktop/mobile visual and functional checks are recorded.** Do not merge to `main` or make a Production change until these gates are complete. No Supabase schema, database, environment/secrets, or Production changes were made by this evaluation.
