# Athom / Homey publish limits — what we know (2026-10-10, Paris)

## Measured facts (our bisects, publish.yml, same pipeline)
| Build | Change vs last Test build | Result |
|---|---|---|
| #3482 v9.0.1364 | baseline (spi + whd02 held) | Test |
| #3483 v9.0.1365 | + `deprecated: true` on wall_remote_4_gang (+18 B) | AggregateError |
| #3485 v9.0.1366 | deprecated reverted, ci/actions-optimization merged | Test |
| #3486 v9.0.1367 (K1) | + one `it` driver name (+38 B) | Test |
| #3487 v9.0.1368 (K2) | + `zigbee_rebind` maintenance action on 319 drivers (~+70 KB app.json) + manifest.version read | Test |
| J4 #3479 / J5 #3481 | I + one new driver (spi / whd02) | AggregateError |

Conclusion: **it is not a byte-size threshold** (K2 added ~70 KB and passed; +18 B deprecated failed).
Every failure changes the **set of pairable driver ids** (a new driver, or a driver hidden via deprecated).
Pure content changes inside existing drivers pass. Note: master already ships 12 deprecated
drivers and passes, so `deprecated` itself is not forbidden; the trigger is a change in the set.
Working hypothesis: Athom's server-side processing (store driver index / images / per-driver
pages) fails when the driver list changes for this very large app. Not documented; to confirm with Athom.

## Our app vs peers
| App | app.json | drivers | manufacturerName entries |
|---|---|---|---|
| ours (master) | 2.39 MB | 448 (446 published) | 19 199 (≈3 600 productId entries) |
| JohanBendz/com.tuya.zigbee (upstream) | 0.35 MB | 113 | 650 |
Other peers (Xiaomi, Sonoff, Hue) raw app.json not fetchable at HEAD (built file not committed).

## Official sources checked (in our words)
- node-homey-lib validator (athombv/node-homey-lib, lib/App/index.js): no limit on app.json size,
  driver count or fingerprint count; only small/large driver images are required (xlarge optional).
- Homey CLI (athombv/node-homey, lib/App.js): build = tar+gzip, no client-side size cap.
- SDK docs, Homey CLI + App Store guidelines (apps.developer.homey.app, Athom): `processing_failed`
  is not a documented validation error; big apps take longer to review.
- Community post by @Attilla (community.homey.app/t/140352/1271, 2026-01-29): `homey app run`
  hit "Payload Too Large" on the remote debug session for this app → a hidden upload size cap exists
  for remote run (separate from store publish).

## Audit (master)
- All 448 drivers have small 75×75 + large 500×500 PNG; none has xlarge (also true for builds that pass).
- Held drivers have correct images, ids < 41 chars (max id length 41), class/capabilities valid.

## Proposed solutions (not applied — need decision)
1. Ask Athom support (email, Athom-only) for the server log of #3483/#3481 with the bisect table above.
2. Change the driver set in one isolated build only (one new driver per build), never mixed with content.
3. Shrink manifest: move the bulk of manufacturerName lists out of app.json is NOT possible for
   pairing (Homey matches on manifest), but case-variant duplicates (~3× per FP) could be removed
   if Homey matching is case-insensitive — must be verified first, else it breaks pairing.
4. Split into satellite apps by family (lights / sensors / switches) — large migration, re-pair cost.
5. Keep runtime data (fingerprints DB, dp registry) in lazy-loaded data files, never in app.json.
