# Tahap 5C — Tailwind CSS v4 remediation evaluation

Reviewed: 2026-10-23 (Asia/Jakarta)

## Scope and baseline

- This is a dedicated dependency-remediation branch, created directly from the PR #8 baseline SHA `5d3fae3e101dcd7f59d3ac185699277246e1b121`.
- Candidate before this report: `5fbea2c77ba7bb847f3015f4fff1210652f6c274`.
- [GitHub Actions Run #62](https://github.com/syauqigntg-art/civic-vision/actions/runs/39899004570) completed successfully on that SHA.
- The candidate changes the CSS build toolchain only. It does not change Supabase schema or application request semantics.

## Migration changes tested

| File | Change |
|---|---|
| `package.json` / `package-lock.json` | Use `tailwindcss@4.3.3` and `@tailwindcss/postcss@4.3.3`; remove direct `autoprefixer` because the v4 build pipeline handles vendor prefixing. |
| `postcss.config.mjs` | Replace the v3 `tailwindcss` plugin with `@tailwindcss/postcss`. |
| `app/globals.css` | Replace v3 directives with v4 theme/utilities CSS imports; intentionally omit `tailwindcss/preflight.css` to preserve the project's no-Preflight design constraint. |
| `tailwind.config.ts` → `tailwind.config.js` | Load a legacy JavaScript config explicitly with `@config`; remove unsupported `corePlugins.preflight` and preserve intended content scan paths. |

## Build and dependency evidence

- GitHub Actions [Run #62](https://github.com/syauqigntg-art/civic-vision/actions/runs/39899004570) on the initial migration candidate passed: `npm ci`, TypeScript, 12 unit tests, PBL/security source invariants, Next.js build (17/17 static pages), `npm audit --omit=dev` with 0 vulnerabilities, and a full dependency audit report with 0 advisories.
- The final PR #13 candidate SHA before this documentation refresh, `f3e052ede3f2bcc4d752b7d49ab8fd19504e707c`, also passed [GitHub Actions Run #83](https://github.com/syauqigntg-art/civic-vision/actions/runs/39937221235).
- The combined Vercel status for that candidate reports success: https://vercel.com/uki8/civic-vision/3fbeCgQr8BaiJ552xNgQGEJQvxUz.
- This evidence is specific to the evaluated candidate SHA. CI success and a Vercel status alone do not prove visual equivalence.

## Compatibility considerations and official references

- Tailwind v4's official upgrade guide states the supported browser floor as Safari 16.4+, Chrome 111+, and Firefox 128+: https://tailwindcss.com/docs/upgrade-guide
- In v4, the PostCSS plugin moved into `@tailwindcss/postcss`, and import/vendor-prefix handling changed: https://tailwindcss.com/docs/installation/using-postcss
- Legacy JS config files must be loaded explicitly with `@config`; v3 `corePlugins`, `safelist`, and `separator` settings are not supported in v4: https://tailwindcss.com/docs/upgrade-guide
- The Preflight reset is omitted by importing only theme and utilities, preserving CIVIC VISION's intended no-Preflight styling: https://tailwindcss.com/docs/preflight
- The audited issues were `braces@3.0.3` / GHSA-vfj7-8cjw-p6xm and `postcss-selector-parser <7.1.6` / GHSA-rj75-hqrm-r3gf: https://github.com/advisories/GHSA-vfj7-8cjw-p6xm and https://github.com/advisories/GHSA-rj75-hqrm-r3gf.

## Preview and browser validation — owner-confirmed

- On 2026-10-23, the repository owner reported that they checked the Preview results and found the tested behavior safe/acceptable.
- The owner confirmed the verification checklist had been reviewed, including the expected Preview deployment/source, staging target, visual/functional behavior on desktop and mobile, student PBL flows, admin flows, and browser compatibility considerations.
- The recorded Preview candidate was associated with merge SHA `f3e052ede3f2bcc4d752b7d49ab8fd19504e707c`; its Vercel status and GitHub Actions Run #83 were successful.
- This entry records the owner's confirmation. Screenshots, device/browser version details, and a separate automated visual-regression artifact were not attached to the repository in this review.

## Decision

**Ready for formal PR review, subject to CI on this documentation refresh.** The tested dependency graph reported zero advisories and the owner reports Preview/browser checks were acceptable. Review the final diff and verify the newly triggered CI before merging to `main`. This evaluation does not itself merge the PR or authorize any Production-only change.
