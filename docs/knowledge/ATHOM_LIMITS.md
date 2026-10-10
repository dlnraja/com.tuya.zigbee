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
1. (No Athom contact — user rule.) Keep bisecting from our side only.
2. Change the driver set in one isolated build only (one new driver per build), never mixed with content.
3. Shrink manifest: move the bulk of manufacturerName lists out of app.json is NOT possible for
   pairing (Homey matches on manifest), but case-variant duplicates (~3× per FP) could be removed
   if Homey matching is case-insensitive — must be verified first, else it breaks pairing.
4. Split into satellite apps by family (lights / sensors / switches) — large migration, re-pair cost.
5. Keep runtime data (fingerprints DB, dp registry) in lazy-loaded data files, never in app.json.

## Update 21:50 Paris — K3 and payload forensics
| K3 #3489 v9.0.1370 | master #3488 content + switch_module_whd02 released only | AggregateError |
Confirms: one new driver alone, on current master, fails. Same for J4/J5.

Local reproduction of the publish payload (scripts/prepare-publish.js, auto-publish env
14000/1500/2, fresh .homeybuild each run — the script mutates .homeybuild, so reruns on the same
dir are NOT comparable):
- base (both held): 347 payload drivers (99 synthetic pruned), 13 987 combos.
- whd02+spi released: only those 2 drivers added, 13 995 combos; no other driver changes.
- wall_remote deprecated: only that driver's `deprecated` flag changes; combos identical.
- So no budget redistribution, no duplicate couple (new couples are unique), no image/format issue
  (all 902 PNG 8-bit RGBA non-interlaced, sizes 75/500), and latest athombv/node-homey-lib validates
  every variant at level `publish` (only `verified` complains: ir_remote has no platforms — not our level).
- CI totals: 13 995 combos / 3.84 MB both on passing and failing builds → not a size or combo cap.
- History: source driver count rose 434 → 446 between v9.0.1317 and v9.0.1330 (Oct 2–4). CI logs of
  that period have expired, so whether each of those builds reached Test is not provable from CI.
Open: the trigger is server-side and specific to driver-set changes; our pipeline and payload are clean.
Next safe probes (bisect branch only): release whd02 with `pair` views copied from a passing socket
driver; and a payload that adds a new driver id cloned 1:1 from a passing driver (rename only).

## Correction 22:45 Paris — always read stateMeta
- #3490 v9.0.1371 and #3492 v9.0.1373 = `processing_failed | stateMeta=socket hang up` (transient
  Athom transport), NOT AggregateError. Retry, never bisect on them.
- R1 #3491 v9.0.1372 (exact #3488 content) → Test. R3 #3493 v9.0.1374 (#3488 + VicHY radar write-once
  only) → Test. The radar change is safe.
- Real AggregateError builds so far: 1331..1361 tips with spi, J3/J4/J5, #3481, #3483 (deprecated
  wall_remote_4_gang), K3 #3489 (whd02 only).
- History (git SSOT): 1330 was accepted and contained ~12 drivers added Oct 2–4 (sound_sensor_tuya,
  light_cct_ts0502b, light_rgbcct_ts0505b, light_dimmable_ts0501a, mc101z_pwm_dimmer, bulb_zbeacon_ts0505b,
  switch_zbeacon_ts0001, temphumidsensor_zcl_th01/ts0601, sensor_ias_zonetype_ewelink,
  panel_switch_cover_tuya, switch_presence_tuya). Adding drivers worked up to 1330.

## Probe P1 / R4 (2026-10-10 ~23:00 Paris)
- **P1** `bisect-p1-copy`: 1:1 rename of accepted `sound_sensor_tuya` → `sound_sensor_tuya_probe` (no manufacturerName, deprecated). Adds a driver id without pairable couple change.
  - #3494 v9.0.1375 = `processing_failed | stateMeta=socket hang up` → **retry** (run 38086030042), do not conclude.
- **R4** `bisect-r4-rename-clone` / `switch_probe_r4_clone` (invented `_TZ3000_r4clonex`+`TS00R4`): Validate failed (compose not in app.json). **Branch deleted** — invented couple must never land on master/stable. Superseded by P1 design.
