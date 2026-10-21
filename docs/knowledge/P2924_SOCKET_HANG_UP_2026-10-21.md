# P2924 — "socket hang up": where it happens and what we changed (21/10/2026)

## Evidence (Auto-Publish on Push, master, v9.0.1532 → v9.0.1576)
- Every failing build was **uploaded fine**: the CLI prints "Created Build ID N" and
  "successfully uploaded"; about 40-70 s later Athom sets `processing_failed` with
  `stateMeta = socket hang up`. The error is in Athom's server-side processing, not in our
  HTTP upload (so keep-alive, upload timeout, chunking or a fresh token cannot change it).
- Size is not the cause: the same payload (29.9 MB / 4406 files, archive 8.78 MB gz, app.json
  3.46 MB) gave Test for 9.0.1574 and hang-up for 9.0.1572/1573/1576; across 1532-1576 about
  half of the builds failed between 33.8 and 35.4 MB with no trend.
- v9.0.1576: upload 07:33:37 UTC, hang-up seen 07:34:21 UTC (#3657). The retry chain was
  dispatched (retry 2) but that run stopped at the guidelines audit (P2923) before uploading.

## Change
- Shared policy `.github/scripts/athom-retry-policy.js` v2 (identical on master, stable-v5,
  bastien-home): `maxHangupRetries: 4` for socket hang up; other transient errors keep 2,
  AggregateError keeps 2 then bisect, unknown errors never retry; each retry is a strictly
  higher version; backoff 60/120/240/240 s + jitter. New CLI `max` and `retry-kind`.
- master `transient-publish-retry.js`: per-kind cap; a hang-up chain may run past the
  AggregateError budget, AggregateError still asks for a bisect at 2.
- stable `publish-stable.yml` and Bastien `bastien-publish.yml`: loop bound from `max`,
  per-kind check every pass.
- With ~50 % independent failures, 4 retries leave ~3 % of chains without a Test build
  (was ~12.5 % with 2).

## Not changed (reason)
- Payload reduction: no size correlation in 45 builds; not a lever for this error.
- Upload agent/timeouts: upload already succeeds; the existing 300 s watchdog stays.
- Tests: test/critical/p2924-hangup-budget.test.js, test/p2900.test.js (hash + budgets).
