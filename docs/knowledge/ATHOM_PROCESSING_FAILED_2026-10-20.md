# Athom "processing failed": diagnosis (20/10/2026, P2902)

## What we saw (18/10–20/10)
- master: #3622, #3623, #3625, #3628, #3630, #3632–#3634, #3637–#3640 ended in `processing_failed`.
  Accepted builds in the same window: #3631 (v9.0.1550), #3635 (v9.0.1554).
- stable-v5: #347, #350, #352, #357 ended in `processing_failed`. 5.12.466–468 were accepted.
- The build object Athom returns for a failed build has no `error`, `feedback` or `stateMeta`
  (the log showed `detail={}`). The AthomAppsAPI spec (homey-api 3.21.0) has no build-log
  endpoint, only getBuild, getBuilds, getBuildMetrics and updateBuildChannel. **No raw error body
  can be obtained through the API.**
- Size is not the trigger on its own. Stable passed with a 33.1 MB payload, 338 drivers and
  5455 flow cards, while master failed at 31.3 MB, 348 drivers and 6111 flow cards. The
  combo matrix (13989) and app.json (3.47 MB) were the same for #3635 (passed) and #3640 (failed).
  The only difference was 5 files, all from `led_controller_spi_tuya`.
  #3622 failed without SPI, so Athom also has intermittent failures on its side.

## Workflow bug found
`scripts/direct-api-publish.js` re-polled a terminal `processing_failed` 5 times, with waits of
30, 60, 90, 90 and 90 s. The delegation token expired during those waits, so the next API call
died with **`FATAL: The provided token is invalid.`**. The post-failure logic was then skipped:
the soft-expect check, the healthy-Test check and the classification for the size CSV
(`kind=unknown`). Every PF run ended red without a usable diagnosis.

## Fix (additive)
- The token is minted again on 401 or "token is invalid" while polling and before the
  post-failure listBuilds.
- Re-polls of a failed build go from 5 to 2, with 20 s and 40 s waits.
- The raw build object of a failed build (every field, long strings cut) goes to the log as
  `RAW-BUILD` and to `$RUNNER_TEMP/publish-size/athom-build-<id>.json`, which is uploaded
  with the size telemetry artifact.
- New pre-upload check `scripts/ci/payload-preflight.cjs`, called by direct-api-publish
  before packing. It checks:
  - paths: length (200 or less), non-ASCII names, reserved characters and names, case
    collisions, symlinks, unreadable or empty files;
  - every JSON file parses;
  - driver images are PNGs of 75×75, 500×500 or 1000×1000;
  - every relative `require()` resolves inside the payload (try-guarded requires only warn);
  - no duplicate driver or flow ids, each driver dir and image exists, app.json is 4 MB or less;
  - flow device-filter syntax.
  `PAYLOAD_PREFLIGHT=warn` or `off` relaxes it.
- Three flow cards had invalid device filters, now fixed:
  - `knob_rotated` used `driver_id=smart_knob,capabilities=dim`; it now uses `&`.
  - `set_power_on_behavior` and `set_software_child_lock` repeated `|driver_id=`; the list is
    now `driver_id=a|b|c`.
  The broken filters predate the accepted builds, so they were not the PF trigger.

## Next signal
The next PF writes `RAW-BUILD` keys to the log. If Athom ever returns a reason field, it will
be there. Test: `test/critical/p2902-payload-preflight.test.js`.

## Found by the preflight on its first stable run (39347599049, 20/10 ~02:40 Paris)
- stable `data/sacred-couple-catch-all.json` was **UTF-16 LE with BOM** in the uploaded payload, so a
  strict JSON parser fails on it. It is now converted to UTF-8 with the same content. The preflight
  rejects UTF-16 JSON.
- stable driver images are declared as `//drivers/<id>/assets/images/*.png` (double leading slash).
  The files exist, so this is a warning only. The first preflight version flagged it wrongly and blocked
  that run before upload, so no Athom version was spent.
