# P195 — stable-v5 workflow soak (BOTH)

Date: 2026-08-16  
Track: **BOTH** (publish/reliability). No feature managers. No full-tree sync.

## Live truth before this commit

| Item | Value |
|---|---|
| Homey Test | **9.0.558** (master soak) |
| stable tip | `a61b99939` P139 + ZT08 DP17 + TYZB01 |
| Open issues / PRs | none |
| Last Publish Stable→Test | failed at Draft (Test not overwritten) |

GitHub issues, PRs, and the last cross-source triage show **0 unclaimed human-reported manufacturers**. #513 ZT08 is confirmed on 9.0.533. Do not invent new FPs from Gmail “5 new” harvests.

## What was wrong on stable

1. `publish-stable.yml` had `cancel-in-progress: true` and **no soak guard** — a green promote would replace 9.0 Test with 5.12.x.
2. `publish-self-heal.yml` re-triggered **Publish Stable→Test**.
3. `direct-api-publish.js` waited for `ready` only — Athom now parks at `draft` (same P192 timeout).
4. `draft-to-test.yml` could promote `stable-v5` with `cancel-in-progress: true`.
5. `bug-report-auto-pr` commits lacked `[skip ci]`.

## What landed (surgical)

- Soak guard + `force_test` input on Publish Stable
- Self-heal watches **Auto-Publish on Push** (master) only
- Draft / test / live count as publish success
- Draft-to-test soak when branch is `stable-v5` (master + stable copies)
- Policy error if any workflow re-triggers Publish Stable→Test

Promote stays skipped while Test is `9.*` unless `STABLE_FORCE_TEST=1`.
