# P201 — Crawler wiring + meterPoll / wifi_camera lifecycle

**Date:** 2026-08-16  
**From audits:** [Map scrapers vs workflows](15eb6325-d04f-4fd1-a9f0-31e5db108396), [Find unimplemented architecture gaps](a5faeeaa-a7f9-4da1-9756-53910636b3bd), [Map scraper/workflow gaps](227e7327-9f44-4e60-b9c2-05f03de3b8ac), [Find next real code gaps](2d99f54e-edf8-4377-98d1-21e441e77633)

## Fixes

| Class | Change |
|-------|--------|
| MASTER_ONLY | `tools/ci/gmail-diagnostics.js` wrapper → `.github/scripts/fetch-gmail-diagnostics.js` |
| MASTER_ONLY | mega `forum` → `forum-fetch-140352.js`; auto-enrich forum → `forum-silent-multi-scan.js` |
| MASTER_ONLY | AGENTS + AI_OFFLINE_GUIDE + PROJECT_INDEX identity/cron truth |
| BOTH | `device_air_purifier_plug` + `dimmer_wall_plug`: restore 120s `_meterPoll`, clear via safe-timers, `onUninit` |
| BOTH | `wifi_camera.onUninit` mirrors `onDeleted` cleanup |

## Test

`test/critical/p201-crawler-meterpoll.test.js`
