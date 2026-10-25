# P3036: Athom publish policy (green CI, spacing, one retry, bisect exit)

25/10/2026 (Paris, UTC+1). Applies to master (`com.dlnraja.tuya.zigbee`), stable-v5 (`.stable`) and
bastien-home (`.bastien`). Scheduled workflows run from master only.

## Why
P3034 closed with 9.0.1599 (#3682): the same payload that had been refused went to draft and then to Test
once CI was green and the upload window was quiet. The refusals line up with red CI, uploads sent too close
together and Athom-side `socket hang up`, not with the app content. That is a strong presumption, not a proof.
This policy turns those findings into rules that every upload path follows.

## Rules
| Rule | master | stable-v5 | bastien-home |
|---|---|---|---|
| Green CI required on the SHA (or a code-identical ancestor) | Syntax Check, Unified CI/CD, Node 22 tests, Homey App Validate | Syntax Check, Node 22 tests, Homey App Validate | Node 22 tests, Homey App Validate |
| Minimum gap between two uploads | 120 min | 60 min | 60 min |
| Successful uploads per 24 h | 1 | 4 | 4 |
| Lock (concurrency group) | `athom-publish-master` | `athom-publish-stable` | `athom-publish-bastien` |

- **CI gate.** A `[skip ci]` data/docs commit on top of a green SHA is accepted when no code file changed
  (a version-only `package.json` / `package-lock.json` bump is not code). Cancelled/skipped runs are ignored.
  Red or pending (after `CI_GATE_WAIT_MS`, default 40 min) → no upload, logged, retried at the next slot.
  Missing CI on the SHA is dispatched once (`CI_GATE_DISPATCH_MISSING`, after `CI_GATE_DISPATCH_AFTER_MS`).
- **Spacing.** Taken from the build snapshot (`data/status/homey-build-status-<app>.json`) merged with the
  ledger `docs/knowledge/athom-publish-outcomes.jsonl`. Counted successes: states test / live / approved.
  Overrides: `ATHOM_MIN_INTERVAL_MIN`, `ATHOM_MAX_SUCCESS_PER_24H`, `ATHOM_CI_REQUIRED` (comma list).
- **Busy.** No upload while a previous build of the same app is still processing (stuck `waiting_for_files`
  > 5 min and non-final builds > 6 h are ignored). Re-checked right before the upload step.
- **Unreadable data.** Automatic runs hold (fail closed). A manual dispatch may try.
- **Manual override.** `override_spacing` (workflow_dispatch input, mapped to `FORCE_PUBLISH`) bypasses spacing
  and the 24 h cap for a manual run only. It never bypasses the CI gate.

## Error classification (one module for every path)
`classify()` in `.github/scripts/athom-publish-policy.js`; `athom-retry-policy.js` and
`transient-publish-retry.js` delegate to it.

| Kind | Examples | Retry | Breaker | Diagnostic |
|---|---|---|---|---|
| transient | socket hang up, ECONNRESET, ETIMEDOUT, 5xx, timeouts, invalid_state | exactly 1, after >= 300 s + 0-60 s jitter, once the previous build is final | not tripped; the retry is exempt (fixes run 40194918949) | no |
| real | AggregateError, processing_failed (without a transient cause), validation errors, unknown | none | tripped | yes |

A bare `processing_failed` row with no reason at all keeps the P3025 rule in `athom-classify-failure.js`
(wait log first, then empty error -> transient): Athom history shows those are mostly hang-ups.

The in-run fallbacks (`homey-app-publish` action, `homey-publish` action, Auto-Fix publish job,
publish-stable and bastien-publish loops) call `athom-publish-policy.js fallback` and record
`ATHOM_RETRY_USED=1`, so a run can never retry twice.

## Where it is wired
- `auto-publish-on-push.yml`: gate steps in the breaker job (`p3036_go`), busy re-check before `id: pub`.
- `publish.yml`, `verified-publish-and-diagnostics.yml`: `p3036-gate` job (composite action
  `.github/actions/athom-publish-gate`).
- `auto-fix-and-publish.yml`: the recovery upload moved to its own `publish` job under `athom-publish-master`,
  after a `p3036-gate` job. Plain auto-fix runs never take the lock.
- `draft-to-test.yml`, `draft-to-test-fleet.yml`: job-level per-app lock.
- `publish-self-heal.yml`: `deferred` job runs `.github/scripts/athom-deferred-dispatch.js`: a held run leaves an
  `athom-deferred-<app>-<run>` artifact; the next slot dispatches the app's workflow once with
  `deferred_retry=true` (automatic run, same gate). Artifacts are never deleted by this job.
- stable-v5 `publish-stable.yml`, bastien-home `bastien-publish.yml`: same gate and lock names.

## Bisect exit
`docs/knowledge/athom-bisect-state.json` status=done → `bisect-hold.js` allows everything: no forced drafts,
no `bisect_trial`. Normal flow: draft → Test automatically when processing is OK. **Live is never automatic.**
If rejections come back, rerun the bisect: set status=running (drafts only + `bisect_trial` are re-armed).

## Env flags
`CI_GATE_SHA`, `CI_GATE_BRANCH`, `CI_GATE_WAIT_MS`, `CI_GATE_POLL_MS`, `CI_GATE_DISPATCH_MISSING`,
`CI_GATE_DISPATCH_AFTER_MS`, `CI_GATE_SKIP` (manual only, not wired in any workflow), `EVENT_NAME`,
`TRANSIENT_RETRY`, `DEFERRED_RETRY`, `FORCE_PUBLISH`, `ATHOM_MIN_INTERVAL_MIN`, `ATHOM_MAX_SUCCESS_PER_24H`,
`ATHOM_CI_REQUIRED`, `ATHOM_RETRY_USED`, `ATHOM_REACH_TEST`, `DEFERRED_DRY_RUN`, `HOMEY_ZIGBEE_TOPUP_MAX_TOTAL`,
`HOMEY_ZIGBEE_TOPUP_MAX_DRIVER`, `HOMEY_ZIGBEE_TOPUP_ALLOW_UNMEASURED`.

## TS0601 couples dropped by the compaction (lead L-P3037-01)
Measurements, root cause and the measured Athom ceiling: `ATHOM_LIMITS.md`, section "P3036 measured combo
ceiling and TS0601 top-up". In short: `scripts/maintenance/ts0601-topup.cjs` runs after the compaction and
only adds missing (manufacturer, TS0601) groups up to `HOMEY_ZIGBEE_TOPUP_MAX_TOTAL` (20000 = highest combo
count Athom accepted from us) and `HOMEY_ZIGBEE_TOPUP_MAX_DRIVER` (2000). On master it brings back 540
groups (15 498 -> 19 999 combos); 2 162 stay out because the per-driver cartesian product makes them cost
~64k combos in their current drivers. Getting all of them in needs a TS0601-only carrier driver or real
probe uploads above 20k: both are owner decisions.

Tests: `test/critical/p3036-athom-publish-policy.test.js`, `test/critical/p3036-ts0601-topup.test.js`.

## Port on this branch (stable-v5 / bastien-home, 2026-10-25 Paris)

- `athom-publish-policy.js` and `athom-retry-policy.js` are byte-identical to master (hash tests p3036 / p2900).
- `publish-stable.yml` / `bastien-publish.yml`: a `p3036-gate` job runs before the upload job (green CI on the
  branch head or a code-identical ancestor, per-app spacing, no build processing). A hold writes an
  `athom-deferred-<app>-<run>` marker; master's publish-self-heal re-dispatches at the next slot (`deferred_retry`).
- Bastien's lock is now `athom-publish-bastien` (was `athom-developer-api-publish`), the group master's
  draft-to-test and verified-publish already use for Bastien. Stable keeps `athom-publish-stable`.
- Stable's in-run CLI → direct-API fallback asks `athom-publish-policy.js fallback` (one retry after >= 5 min,
  transient only); the re-upload loop starts at `ATHOM_RETRY_USED` so the single retry is never spent twice.
- `syntax-check.yml` (stable) gains `workflow_dispatch` so the gate can dispatch a check a path filter skipped.
- The TS0601 top-up (`scripts/maintenance/ts0601-topup.cjs` + prepare-publish hook) is ported **dormant**:
  no `HOMEY_ZIGBEE_TOPUP_MAX_TOTAL` in this branch's publish workflow, so the payload is unchanged until the
  owner enables it after master's ~20k package is accepted.


## P3036b: base cap 17000 + KB couple top-up (25/10/2026, Paris)
- `HOMEY_ZIGBEE_MAX_TOTAL_COMBOS` 17000 and `HOMEY_ZIGBEE_KB_TOPUP_MAX_TOTAL` 20000 in the three publish
  workflows; `scripts/maintenance/kb-couple-topup.cjs` runs in `scripts/prepare-publish.js` after the
  compaction and before the TS0601 top-up. Adds only, same driver set, ≤ 20 000 total / 1 008 per driver
  (measured accepted maxima, docs/knowledge/ATHOM_LIMITS.md on master).
- Tier 1 = `config/architecture/kb-topup-priority.json` (KB couples the P3038c pins pushed out); a
  FATAL(P3036b) stops the publish if one is not put back. Tier 2 = other KB couples, best couples per combo.
- Platform budget gate: `alsoEnv` includes `HOMEY_ZIGBEE_KB_TOPUP_MAX_TOTAL`. Test:
  `test/critical/p3036b-kb-couple-topup.test.js`.

## P3036c: single cap source (25/10/2026 17:20, Paris)
- `config/publish-caps.json` is the only place for the Zigbee publish caps; `scripts/lib/publish-caps.cjs`
  serves prepare-publish, the compactor defaults, the budget gate, z2m-coverage, tests and workflows.
  No `HOMEY_ZIGBEE_*` cap in any workflow (guard `test/critical/p3036c-single-cap-source.test.js`).
- Routine « Homey envois master par étapes » (replacement text, the routine itself is not edited): green CI
  first; ≥ 2 h between uploads per app, one lock per app; at most 1 successful upload per day plus 1 retry
  ≥ 5 min after a transient hang-up (shared transient/real classification; a real error opens the breaker
  and writes a diagnostic); draft→Test automatic, Live always manual; bisect_trial only while
  status=running (stop on done); no upload while Athom is still processing the previous build.
- Port note (bastien-home): TS0601 top-up dormant here (ts0601TopupMaxTotal 0); measured limits and the coverage target are in docs/knowledge/ATHOM_LIMITS.md on master.
