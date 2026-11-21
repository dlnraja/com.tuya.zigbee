# Live promotion

P3360 (21/11/2026, Europe/Paris). Live applies to master (`com.dlnraja.tuya.zigbee`)
and stable-v5 (`.stable`) only. Bastien (`.bastien`) must never go to Live.

## Policy

**Live is automatic only after objective gates.** It is never a silent side-effect
of an upload, and it is never promoted because a fixed number of days has passed.

The supported path is Athom Apps API `updateBuildChannel({ appId, buildId, channel: 'live' })`
(see `.github/scripts/homey-apps-api-client.js`). The workflow is
`.github/workflows/promote-live.yml` (workflow_dispatch, plus an hourly schedule on master).
Certification, if Athom requires it, stays on the official path; a failed channel
update is not retried as a masked success.

## Objective gates

Implemented in `scripts/ci/live-promote-gates.cjs` and enforced by
`.github/scripts/promote-live.js`:

1. **CI green** on the Test build's source SHA: the required workflows for that app
   (master: Syntax Check, Unified CI/CD, Node 22 tests, Homey App Validate; stable as
   in P3036). Bastien is not a Live candidate.
2. **Validate publish** is green (Homey App Validate at publish level, or the equivalent
   successful validate workflow on that SHA).
3. **No lost driver IDs or couples** versus the previous Live. When a Live manifest is
   not on hand, master uses the last accepted Test package baseline (9.0.1574 / #3655
   driver IDs, plus P3024b when a couple list is supplied). The candidate set is taken
   from the Test source SHA, not from a later working tree.
4. **The Test version is healthy:** state is `test`, and there are **no new crash
   signals** in the notebook or diags dated after that build reached Test.
5. **Minimum Test soak is evidence-driven**, not a fixed 7 days. A short quiet floor
   (default 2 hours, `LIVE_MIN_QUIET_MS`) plus a scan run at decision time is enough
   when no new crash signals appear. A longer quiet window does not waive a new crash.

## Branch rules

- **master** and **stable** promote regularly and automatically when the gates pass, any hour
  (hourly schedule plus workflow_dispatch).
- **Bastien must never go to Live.** `com.dlnraja.tuya.zigbee.bastien` is only for Bastien's
  house. The gate module and `promote-live.js` refuse that app; it is not in the workflow matrix.
  Bastien publish stays night-only on its own Test path. Learnings flow Bastien -> master and
  stable via `bastien-promote-upstream.yml`.
- A build that is already Live is left untouched.
- Fail closed: missing CI, a missing Test timestamp, or a missing target holds the promote.
- Errors are not masked: a gate hold is printed as `HELD` with reasons; API failures fail the job.

## One-shot

The first use of this path (P3360) is a single promotion of master #3717 v9.0.1636
when the gates pass. Later promotions go through the same gates, one Test build at a time.
