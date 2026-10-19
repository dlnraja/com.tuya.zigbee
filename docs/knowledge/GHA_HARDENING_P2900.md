# GitHub Actions hardening P2900 (20/10/2026, Paris time)

## Audit (last 200 runs per branch, up to 19/10/2026)
| Branch | Runs | Failed | Cancelled | Publish workflow | Publish failed | Publish median time |
|---|---|---|---|---|---|---|
| master | 200 (since 19/10) | 17 (8.5%) | 9 | Auto-Publish on Push | 6/27 (22%) | 802 s |
| stable-v5 | 200 (since 14/10) | 61 (30.5%) | 13 | Publish Stable to Test | 9/35 (26%) | 636 s |
| bastien-home | 200 (since 10/10) | 40 (20%) | 16 | Publish Zigbee Bastien | 10/62 (16%) | 189 s |

Failure causes: on stable-v5 and bastien-home, most red runs are test regressions (Node 22 runtime tests, Syntax Check, all fixed since). On the publish workflows, the causes are Athom processing_failed (socket hang up, AggregateError, invalid_state) and gh EOF/TLS errors. All workflows already had concurrency, timeouts and permissions. Publish groups use `cancel-in-progress: false`, so queued publishes are not cancelled. The cancelled runs come from code-quality and Node 22 superseding themselves, which is intended.

## Changes
- `.github/scripts/athom-retry-policy.js` is **byte-identical on all three branches**, and test p2900 checks its hash. It sets the budget to 2 transient retries (socket hang up, ECONNRESET, S3 key, timeouts), 2 AggregateError retries and then a bisect, and 1 invalid_state retry, only after an idle wait. Unknown failures get no retry. Backoff is 60 s × 2^(n-1), capped at 240 s, plus 0 to 29 s of jitter. Every retry uses a strictly higher version.
  - master: `transient-publish-retry.js` reads its budgets and backoff from this policy. The values are unchanged.
  - stable-v5: the in-run re-upload loop uses the policy budget and backoff. It used 30 s × 2^n before. The failure kind is logged.
  - bastien-home: there was **no retry before**. A new `reupload` step runs when processing_failed comes with a retryable kind. Each attempt applies the version floor, bumps the patch, checks the floor gate, rebuilds, prunes, runs direct-api `--force`, and waits again. Tip-lag and in-flight builds are never re-uploaded.
- `.github/scripts/publish-size-telemetry.js` measures each upload: gz archive, payload bytes and files, app.json bytes, drivers and flow cards. It records the outcome and kind in a CSV, uploaded as the `publish-size-telemetry-<run>` artifact (kept 90 days). The CSV lives under `$RUNNER_TEMP`, so no bot commit picks it up.
- `scripts/direct-api-publish.js` (S3 PUT): adds `AbortSignal.timeout` (`HOMEY_UPLOAD_TIMEOUT_MS`, 300 s), so a stalled upload gets retried instead of hanging the step. Retry backoff now has jitter, and `duplex: 'half'` is set for the stream body. The default API timeout is now 180 s (was 120 s).
- `.github/scripts/gh-retry.sh` retries gh only on transport errors (TLS, EOF, 5xx, secondary rate limit): 4 tries, 5/15/45 s plus jitter. master uses it for the retry dispatch.
- Every `actions/*@vN` reference in workflows and composite actions is pinned to a full SHA (master 48 refs, stable 20, bastien 29), and test p2900 enforces it.

## Correlating failures with size
Download the artifacts (`gh run download -n publish-size-telemetry-<id>`), concatenate the CSVs, then group `outcome`/`kind` by `archive_gz_bytes`.
