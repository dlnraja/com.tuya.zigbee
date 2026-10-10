# Homey versions strictly incremental — all apps (rule from dlnraja, 2026-10-10)

Versions MUST always increase strictly on master (com.dlnraja.tuya.zigbee), stable
(com.dlnraja.tuya.zigbee.stable) and bastien, including diagnostic / bisect uploads.
Athom rejects a version <= one already uploaded (and re-upload of a processing_failed version).

## Mechanism
- `.github/scripts/athom-version-floor.js`
  - computes uploadedMax = max(Athom build history via HOMEY_PAT (git tags ignored: repo-wide),
    `.github/homey-version-floor`)
  - `--apply` (before bump): raises app.json/.homeycompose/package.json to uploadedMax if higher
  - `--gate` (after bump): FAILS the job if the new version <= uploadedMax (never go backwards)
- `.github/scripts/bump-homey-version.js` also honours `.github/homey-version-floor` and
  `HOMEY_VERSION_FLOOR` env (exported by the floor script).
- Wired as `floor --apply && bump && floor --gate` in auto-publish-on-push.yml, publish.yml,
  auto-fix-and-publish.yml (master); same script ported to stable-v5 and bastien-home.
- Manual/diag uploads: raise `.github/homey-version-floor` on the app's branch to the version used.

## History
- 2026-10-10: master #3469-#3471 (9.0.1339/1340) AggregateError after bisect builds 9.0.1348/1349.
  NB: #3472/#3473 at 9.0.1350 (> all) STILL AggregateError -> version was not the root cause of
  that incident, but the rule stays (prevention).
