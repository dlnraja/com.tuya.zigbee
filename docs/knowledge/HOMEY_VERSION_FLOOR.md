# Homey version floor (Athom AggregateError, 2026-10-10)

Symptom: master builds #3469-#3471 (v9.0.1339/1340) => `processing_failed` / `AggregateError`,
while diagnostic bisect builds #3467/#3468 (same app id) had already uploaded 9.0.1348/1349.
Athom rejects an upload whose version is <= a version already uploaded (also rejects re-upload
of the same version after processing_failed).

Rule:
- `.github/scripts/bump-homey-version.js` bumps from max(app.json, `.github/homey-version-floor`,
  env `HOMEY_VERSION_FLOOR`). Used by auto-publish-on-push.yml and publish.yml.
- Any manual / bisect / diagnostic upload to the master app id MUST raise
  `.github/homey-version-floor` on master to the highest uploaded version (or upload with a
  version below nothing: prefer bumping from master's current version + floor).
- Bisect branches must never consume versions ahead of master without updating the floor.
