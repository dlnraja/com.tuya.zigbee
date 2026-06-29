# Working Versions Reference

Generated: 2026-06-29T22:26:09.727Z
App: com.dlnraja.tuya.zigbee.stable v5.11.219

## Dashboard Summary

Latest build: #12 v5.11.219 test
Latest working version: v5.11.219 (#12)
Latest test version: v5.11.219 (#12)
Working versions found: 6
Failed-only versions found: 0

## Versions That Work

| Version | Latest Build | Latest State | Successful Builds | Failed Builds | Last Successful | Last Test |
| --- | --- | --- | --- | --- | --- | --- |
| 5.11.219 | 12 | test | 1 | 1 | 2026-06-29T10:09:29.644Z | 2026-06-29T10:09:29.644Z |
| 5.11.216 | 10 | test | 3 | 0 | 2026-06-29T11:08:09.671Z | 2026-06-29T11:08:09.671Z |
| 5.11.213 | 7 | test | 1 | 0 | 2026-05-13T22:36:24.141Z | 2026-05-13T22:36:24.141Z |
| 5.11.212 | 6 | test | 4 | 0 | 2026-05-13T22:38:00.282Z | 2026-05-13T22:38:00.282Z |
| 5.11.211 | 2 | test | 1 | 0 | 2026-05-04T06:51:10.873Z | 2026-05-04T06:51:10.873Z |
| 5.11.209 | 1 | test | 1 | 0 | 2026-04-30T02:43:44.769Z | 2026-04-30T02:43:44.769Z |


## Failed-Only Versions

No failed-only versions in the current dashboard window.


## Commit Message Themes Since First Commit

| Theme | Commits | Latest Signal |
| --- | --- | --- |
| docs_rules | 1051 | 2026-06-21T14:52:31+02:00 3e569d81f3 v5.11.218: add changelog entry |
| fingerprints_pairing | 598 | 2026-06-29T11:02:57Z 677c99c5cb chore(auto-heal): Apply Tuya self-heal repairs [skip ci] |
| buttons_flows | 432 | 2026-06-29T22:45:21+02:00 dc3d4ccfa6 fix: harden stable button flows and safety checks |
| publish_processing | 243 | 2026-06-29T13:00:59+02:00 bde55c92dd fix(publish): skip duplicate healthy Homey builds |
| sdk3_lifecycle | 203 | 2026-06-29T13:00:59+02:00 bde55c92dd fix(publish): skip duplicate healthy Homey builds |
| diagnostics_crash | 180 | 2026-06-28T22:12:11+02:00 e71c95fccb fix: harden Homey timer crash diagnostics |
| battery_energy | 173 | 2026-06-29T10:01:48+02:00 02e8ca6fb0 fix(buttons): restore Moes battery fallbacks |
| security_privacy | 58 | 2026-06-28T16:23:08+02:00 3ace89f917 chore: sanitize secret examples [skip ci] |

## Regression Rules Reinforced

- Treat the latest Homey dashboard state as authoritative; historical AggregateError builds must not trigger republish when a newer test build is healthy.
- Keep battery support separated between `measure_battery` devices and mains-powered routers; do not combine conflicting battery capabilities.
- Keep physical button flows registered as device trigger cards and covered by tests for TS004x/Moes variants.
- Publish only the prepared payload, then wait for Athom processing and verify the resulting build state.
- Keep secrets in GitHub/Homey secrets only; reports must stay redacted before upload or commit.
