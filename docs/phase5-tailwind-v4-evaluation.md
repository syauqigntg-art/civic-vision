# Tahap 5C — Tailwind CSS v4 remediation evaluation

Reviewed: 2026-10-23 (Asia/Jakarta)

## Scope and baseline

- This is a dedicated dependency-remediation branch, created directly from the PR #8 baseline SHA `5d3fae3e101dcd7f59d3ac185699277246e1b121`.
- Candidate before this report: `5fbea2c77ba7bb847f3015f4fff1210652f6c274`.
- [GitHub Actions Run #62](https://github.com/syauqigntg-art/civic-vision/actions/runs/39899004570) completed successfully on that SHA.
- The candidate changes the CSS build toolchain only. It does not change Supabase, application request semantics, Vercel environment variables, or Production.

## Migration changes tested

| File | Change |
|---|---|
| `package.json` / `package-lock.json` | Pin the tested v4-compatible major ranges: `tailwindcss@4.3.3` and `@tailwindcss/postcss@4.3.3`; remove direct `autoprefixer` because the v4 build pipeline handles vendor prefixing. |
| `postcss.config.mjs` | Replace the v3 `tailwindcss` plugin with `@tailwindcss/postcss`. |
| `app/globals.css` | Replace v3 `@tailwind base/components/utilities` directives with v4 theme/utilities CSS imports; intentionally omit `tailwindcss/preflight.css` to preserve the project's no-Preflight design constraint. |
| `tailwind.config.ts` → `tailwind.config.js` | Load a legacy JavaScript config explicitly with `@config "../tailwind.config.js"`; remove `corePlugins.preflight`, which is not supported in v4, and preserve the intended content scan paths. |
| `.github/workflows/ci.yml` | Enable normal CI for the dedicated Stage 5 experiment branch. The temporary lockfile-refresh workflow used during generation was removed from the branch after the lockfile commit. |

## Build and dependency evidence

Run #62 on `5fbea2c77ba7bb847f3015f4fff1210652f6c274` reports:
- `npm ci`: success.
- TypeScript check: success.
- Existing unit tests: 12 passed, 0 failed (this branch starts from the PR #8 baseline, not the expanded 25-test Phase 5 branch).
- PBL/security source invariants: success.
- Next.js production build: compiled successfully; 17/17 static pages generated.
- `npm audit --omit=dev`: 0 vulnerabilities.
- Full dependency tree: 0 total advisories (0 low, 0 moderate, 0 high, 0 critical) in the npm audit JSON report.

This is evidence that the migration candidate removes the seven known npm-audit entries from the evaluated lockfile and can compile. It is not proof that the new CSS renders identically in a browser. CI still emits a deprecation notice for `glob@10.5.0`; the audit count is zero, but the deprecation warning has not been separately remediated.

## Compatibility considerations and official references

- Tailwind v4's official upgrade guide says v4 targets Safari 16.4+, Chrome 111+, and Firefox 128+; projects that need older browser support should remain on v3.4 until that requirement changes: https://tailwindcss.com/docs/upgrade-guide
- In v4, the PostCSS plugin moved into `@tailwindcss/postcss`, and import/vendor-prefix handling changed: https://tailwindcss.com/docs/installation/using-postcss
- Legacy JS config files are no longer auto-discovered and must be loaded explicitly with `@config`. The v3 `corePlugins`, `safelist`, and `separator` settings are not supported in v4: https://tailwindcss.com/docs/upgrade-guide
- Tailwind's Preflight guide says the reset styles are injected by the Preflight import. This candidate omits that import and loads only theme and utilities to avoid silently changing CIVIC VISION's global element styling: https://tailwindcss.com/docs/preflight
- Audited issues: `braces@3.0.3` / GHSA-vfj7-8cjw-p6xm (the advisory currently lists no patched version) and `postcss-selector-parser <7.1.6` / GHSA-rj75-hqrm-r3gf. Source records: https://github.com/advisories/GHSA-vfj7-8cjw-p6xm and https://github.com/advisories/GHSA-rj75-hqrm-r3gf

## Remaining gates — do not mark release-ready yet

1. **Visual/browser regression: NOT TESTED.** Vercel reports failure for the PR #8 baseline at `https://vercel.com/uki8?upgradeToPro=build-rate-limit`, which is distinct from GitHub Actions success. Vercel scope `uki8` remains inaccessible via authorized APIs, so the deployment source SHA/environment cannot be validated or used for browser tests.
2. Compare mobile and desktop UI in a verified Preview: home/navigation, group identity, assigned video list/player, SEE/THINK/CONNECT/ACT phase forms, save/error status, submission/results, admin login, admin video/group/question forms, tables, dialogs, and reduced-motion behavior.
3. Confirm the expected browser support floor for students' devices. If Safari older than 16.4, Chrome older than 111, or Firefox older than 128 must work, the Tailwind v4 candidate is not acceptable without a separate compatibility decision.
4. Verify utility generation and custom CSS cascade visually; build success cannot detect subtle visual changes caused by the new layer order or changed CSS defaults.
5. Keep this candidate isolated and Draft until visual checks, Preview source/configuration, and product owner approval are complete. No changes were made to Production or Supabase.

## Decision

**Promising build/audit candidate; not release-approved.** The full dependency audit result is clean on this exact evaluated lockfile, but browser support, visual equivalence, and the Vercel deployment gate remain open.
