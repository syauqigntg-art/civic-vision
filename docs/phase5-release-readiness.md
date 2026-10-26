# Tahap 5 — Baseline, behavior tests, and release-readiness ledger

> **Historical release-readiness ledger:** CI results and open gaps below refer to the specific Phase 5 candidates recorded in this file. Do not infer current PBL completeness from these historical checks; use the [canonical pedagogical checklist](phase3-learning-ux-audit.md#kanonis--checklist-validasi-pedagogis-pbl-audit-2026-10-26).

Last reviewed: 2026-10-23 (Asia/Jakarta).

## Baseline and traceability

- Baseline: PR #8 candidate SHA `5d3fae3e101dcd7f59d3ac185699277246e1b121`.
- Dedicated branch: `phase5/release-readiness-tests`.
- This branch was created from the PR #8 baseline; it does not modify the source branch for PR #6, #7, or #8.
- The PR #8 baseline's combined GitHub status reports `Vercel = failure` and links to `https://vercel.com/uki8?upgradeToPro=build-rate-limit`. That is a separate provider status, not a failed GitHub Actions run.

## Implemented controlled behavior tests

The suite runs using Node's built-in test runner, synthetic objects, injected read functions, and mocked `fetch`; it never writes to Supabase.

- Identity save controller: field/range validation, payload normalization, one-flight concurrency guard, server error, network throw, preserving the draft, and retry after a failure.
- Student case-list load: no group code, invalid group, empty assignment, assigned video filtering, API/network errors, and retry succeeding after a transient failure.
- Analysis snapshot: draft local values override older server values, pending answers request one flush, submitted server values take precedence over stale local values, missing-code/group paths, API errors, and retry preserving pending draft values.
- Student API wrappers: request body and method on success; HTTP and network failures normalize to visible error results rather than uncaught rejection.
- Existing tests remain for structured answer parsing, question/video schemas, option ordering, media traversal prevention, and request validation.
- UI pages call the same injected loaders/controllers that the tests exercise. Source invariants assert those helpers are wired to the page retry/save handlers. This improves behavior coverage but is not a DOM-rendered interaction test.

## CI evidence

- [Run #59](https://github.com/syauqigntg-art/civic-vision/actions/runs/39898584927), SHA `958f132f8f1822951216497094dee65f0164b9f8`: 25 tests passed, 0 failed; TypeScript, source invariants, build (17/17 static pages), and production audit passed.
- [Run #60](https://github.com/syauqigntg-art/civic-vision/actions/runs/39898722751), SHA `5c863fd8457a62ffb89a7f6a8e00a3dd14805c4e`: same gates passed after adding the Phase 5 pull-request workflow trigger.
- A follow-up doc update requires its own CI run before its resulting SHA is considered verified.

## Remaining gaps (explicitly not passed)

1. Vercel deployment status: **failure** on the PR #8 baseline, target indicates a Free-plan build-rate-limit page. GitHub Actions success does not mean deployment success.
2. Authorized access to Vercel scope `uki8`: blocked by HTTP 403. Exact deployment source SHA and Preview environment's Supabase target are not verified.
3. Browser/visual UI: not tested. Node tests exercise controller/loader behavior but do not render React pages or prove CSS layout, mobile appearance, focus order, or real click behavior.
4. Autosave/submit concurrency: not tested against a live staging database. No database writes or migrations in this phase.
5. Full dependency tree: still has seven package entries (five high, two moderate) on the PR #8 dependency branch. A separate Tailwind v4 evaluation branch is testing whether a contained toolchain migration clears that graph; it is not part of this PR.
6. PR #6, #7, #8, and #9 remain Draft. No merge or Production release is approved.

## Acceptance for this phase

- Each candidate SHA must have its own passing CI run.
- Service/controller tests may be treated as unit-level behavior evidence only.
- Browser and concurrency gates stay blocked until Preview source SHA and staging target are verified.
- Any decision to accept unresolved advisories needs explicit owner/risk/expiry; the fact that the audit step produced a report is not risk acceptance.


## Rujukan checklist pedagogis kanonis (audit 2026-10-26)

Checklist pedagogis yang harus dipakai lintas fase adalah [A.1–A.7 di audit UX belajar Tahap 3](phase3-learning-ux-audit.md#kanonis--checklist-validasi-pedagogis-pbl-audit-2026-10-26). Jangan membuat checklist pedagogis duplikat di ledger rilis ini. Status implementasi dari audit source: A.1 PARTIAL, A.2 PARTIAL, A.3 NOT IMPLEMENTED, A.4 PARTIAL, A.5 PARTIAL, A.6 PARTIAL, A.7 PARTIAL. Status tersebut adalah hasil inspeksi source/dokumen, bukan hasil pengujian browser atau staging.
