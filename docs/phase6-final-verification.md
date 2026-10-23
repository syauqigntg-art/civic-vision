# Phase 6 — Final Verification & Release Decision

**Snapshot date:** 2026-10-23 (Asia/Jakarta)
**Decision at snapshot:** **NO-GO for Production**
**Scope:** Freeze and verify evidence; no merge, Production deploy, environment edits, migrations, or database writes.

## 1. Candidate freeze (6A)

These are the exact heads captured for this verification snapshot. A later commit on either PR changes the candidate; all evidence must then be checked against the new SHA before sign-off.

| Candidate | PR | Head SHA | Branch | CI evidence at this SHA | Vercel status |
|---|---|---|---|---|---|
| PBL behavior/recovery hardening | [#9](https://github.com/syauqigntg-art/civic-vision/pull/9) | `ae6b9039c2dec119352e0c6d6dbc0f4a7fff3a36` | `phase5/release-readiness-tests` | [Run #64 push](https://github.com/syauqigntg-art/civic-vision/actions/runs/39899186075) and [Run #65 pull request](https://github.com/syauqigntg-art/civic-vision/actions/runs/39899190331): success; 25 Node-level tests reported passing on this candidate | **Failure** — Free-plan build-rate-limit link |
| Tailwind v4 dependency experiment | [#10](https://github.com/syauqigntg-art/civic-vision/pull/10) | `5300fe0d165dfda9fa6397f998920bb42cd2be98` | `phase5/tailwind-v4-remediation` | [Run #63 push](https://github.com/syauqigntg-art/civic-vision/actions/runs/39899133116) and [Run #66 pull request](https://github.com/syauqigntg-art/civic-vision/actions/runs/39899328502): success; Run #66 validates the combined PR candidate with 25 tests | **Failure** — Free-plan build-rate-limit link |

The reported Vercel context currently points to `https://vercel.com/uki8?upgradeToPro=build-rate-limit` on both candidate SHAs. A successful GitHub Actions build is not proof that Vercel Preview deployed either SHA.

**Separation rule:** PR #9 is the non-Tailwind-v4 behavior-hardening candidate. PR #10 is a separate Tailwind v4 dependency-remediation experiment stacked on PR #9. Do not merge either candidate during this phase. Do not regard PR #10's clean dependency audit as evidence of visual equivalence or supported student-device compatibility.

## 2. Preview access and visual/browser gate (6B)

### Access/deployment evidence required

- [ ] Obtain official authorized access to the Vercel team/project scope.
- [ ] Capture a Vercel deployment record that shows **Ready**, the exact candidate SHA, Preview target, deployment URL, and build logs.
- [ ] Verify the Preview environment's `NEXT_PUBLIC_SUPABASE_URL` resolves to the intended **staging** Supabase project. Record the project reference/host only; never copy keys or secrets into this report.
- [ ] Confirm browser-delivered JavaScript does not expose `SUPABASE_SERVICE_ROLE_KEY`; confirm privileged operations remain server-side.
- [ ] Confirm the active database for all write tests is staging and that test records are synthetic.
- [ ] Record the date, browser/version, viewport, tested route, result, and screenshot/console/network evidence for each test.

**Current state:** **BLOCKED.** The connector could not list an authorized Vercel team and the project read returned HTTP 403 for scope `uki8`. No authorized team-access approval action was available through this connection. Do not bypass the access gate or substitute Production as a test target.

### Browser test matrix

Run against the deployed Preview URL only after the above evidence is collected. Use clean sessions and synthetic test identities.

| ID | Surface / scenario | Expected acceptance evidence | State |
|---|---|---|---|
| V-01 | Desktop layout at 1440×900 | No overlapping/cut-off controls; primary and secondary navigation usable; no unexpected horizontal overflow | Blocked |
| V-02 | Mobile layout at 390×844 and 360×800 | Inputs/buttons fit viewport; readable feedback; keyboard does not hide the active input/action | Blocked |
| V-03 | Tablet layout at 768×1024 | Responsive layout and navigation remain usable | Blocked |
| V-04 | PBL identity form | Required-field validation is clear; save success/failure is understandable; duplicate taps do not create conflicting state | Blocked |
| V-05 | Case/assignment list | Valid code loads list; missing/invalid code and server/network errors are distinct and actionable; retry runs in place | Blocked |
| V-06 | Analysis/question form | Existing submitted server answer is authoritative; unsent local draft is preserved when appropriate; retry reloads successfully | Blocked |
| V-07 | Video player | Play/pause, loading, playback error and retry work; controls remain operable on small screens | Blocked |
| V-08 | Navigation and recovery | Back/forward and refresh behave predictably; recoverable failures do not silently erase a draft | Blocked |
| V-09 | Admin routes | Unauthenticated student cannot access admin-only actions; authorized admin can use required controls; no staging secrets are exposed | Blocked |
| V-10 | Accessibility basics | Keyboard-only traversal, visible focus, associated labels, legible error messages, and sensible focus after validation | Blocked |
| V-11 | Browser console/network | No uncaught runtime exception or unexpected 4xx/5xx in a valid flow; no request to Production Supabase | Blocked |

For each failure, retain a minimal reproduction, sanitized console/network details and screenshot. Redact tokens, cookies, student identifiers and personal data.

## 3. Autosave, submit and database consistency (6C)

**Precondition:** Vercel Preview SHA and staging Supabase target have both been verified. Do not execute these write tests before that precondition. Use isolated synthetic records; delete/clean up only those staging records if a cleanup procedure is approved.

| ID | Synthetic test sequence | Pass condition / evidence | State |
|---|---|---|---|
| C-01 | Enter an answer, wait for autosave success, refresh/reopen | The exact synthetic answer is present after reload in the staging record; UI state matches stored value | Blocked |
| C-02 | Disconnect network during save, edit draft, reconnect and retry | A visible error appears while offline; retry succeeds after reconnect; latest intended draft persists | Blocked |
| C-03 | Start a save, then submit before the save settles | Submit response and final staging row agree; a late older save cannot overwrite the submitted answer | Blocked |
| C-04 | Trigger two saves in quick succession with different values | Final persisted value follows documented ordering/authority rule; no stale value overwrites the latest intended state | Blocked |
| C-05 | Tap identity save twice rapidly | Only one in-flight identity save is created by the single-flight controller; persisted identity is consistent | Blocked |
| C-06 | Submit twice rapidly / replay the same submit request | No duplicate submission rows or unexpected side effects; the operation is safely rejected or idempotent as designed | Blocked |
| C-07 | Simulate an API error then retry without changing the draft | Failure is surfaced; retry succeeds without losing data or duplicating a successful write | Blocked |

Evidence must include (1) sanitized request/response status and sequence/timing, (2) staging row(s) queried after completion, (3) whether duplicates or stale writes exist, and (4) the exact deployed SHA. UI toast/status alone is insufficient. If the existing data model does not support safe idempotency or authoritative submission, record a defect and keep the release **No-Go** rather than assuming a pass.

## 4. Tailwind v4 compatibility decision (6D)

Tailwind v4's official upgrade guide lists minimum browser versions of Safari 16.4+, Chrome 111+, and Firefox 128+ ([official upgrade guide](https://tailwindcss.com/docs/upgrade-guide)). This is a user-device compatibility requirement, not a conclusion from the dependency audit.

- [ ] Establish the minimum browser/OS versions in the target student environment (including managed school devices and mobile browsers).
- [ ] If those minimum versions cannot be guaranteed, **do not accept PR #10 as-is** without a tested compatibility alternative.
- [ ] If the supported range is accepted, run V-01 through V-11 on the Tailwind v4 candidate and compare key layouts/states with the non-v4 baseline.
- [ ] Verify navigation, forms, dialogs, video, focus states, admin pages, and error/retry states, not only the landing page.
- [ ] Document the decision maker, accepted browser floor, test devices, visual defects, and any accepted risk.

**Current state:** **NOT DECIDED.** Run #63/#66 demonstrate successful CI/build/audit for the Tailwind v4 candidate, but do not establish real-browser visual parity or device coverage.

## 5. Release decision gate (6E)

Production remains **NO-GO** until all mandatory gates below have evidence tied to the exact candidate SHA. A risk exception must explicitly name the risk, scope, owner/approver, mitigation, and expiry; an unverified Preview/database target is not an acceptable implicit exception.

| Gate | Current assessment | Required to change state |
|---|---|---|
| Exact candidate + matching CI | **Pass for snapshot** | Recheck if either PR head changes |
| PR #9 behavioral/unit tests | **Pass in Node/CI** | Does not replace real-browser testing |
| Tailwind v4 build/dependency audit | **Pass in CI** | Does not prove visual or browser compatibility |
| Vercel Preview and exact deployed SHA | **Blocked** | Authorized access + Ready deployment for exact candidate |
| Preview-to-staging Supabase target | **Unverified / blocked** | Safe evidence of staging target; no secrets in artifacts |
| Browser visual/functional matrix | **Not run** | Record V-01 through V-11 results |
| Autosave/submit concurrency against DB | **Not run** | Record C-01 through C-07 and verify persisted staging rows |
| Tailwind v4 browser-floor acceptance | **Pending decision** | Approved supported device/browser range + visual test results |
| PR review/merge | **Not authorized** | Only after required evidence and an explicit review decision |
| Production deployment | **Not approved** | New explicit release decision after all required gates pass |

### Phase 6 sign-off record

- Candidate SHA tested:
- Preview deployment URL / deployment ID:
- Verified staging project reference:
- Browser/OS and viewport matrix:
- Results and evidence links for V-01–V-11:
- Results and staging row evidence for C-01–C-07:
- Tailwind v4 compatibility decision / approver:
- Residual risks and explicit acceptances:
- Final decision: **NO-GO / GO**
- Decision maker and date:

**Non-negotiable guardrails:** keep PRs #6–#10 Draft and unmerged during this phase; no Production deploy; no Production database writes; no environment-variable edits; no migrations or `supabase db push` from this verification work.

## Evidence boundaries

- GitHub Actions result: automated CI tests, static/type checks, build and audit results from the logged workflow run.
- Vercel Ready deployment: proves a deployment was completed for a specific SHA; it does not itself prove every user flow works.
- Browser tests: prove rendered and interactive behavior for the tested browser/device/viewport only.
- Staging database evidence: proves the tested synthetic writes and ordering for that run; redact sensitive values.
- User/device compatibility decision: establishes whether the tested/browser support floor is acceptable for the target student population.
