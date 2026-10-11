# HOBEIAN ZG-101ZS = _TZ3000_bgtzm4ny + TS0044 → scene_switch_4 (2026-10-11, Paris)

## What the device is (sources, in our words)
- Zigbee2MQTT device page "ZG-101ZS" (Koen Kanters and contributors): HOBEIAN "Star Ring 4 Gang Scene
  Switch". Battery powered; exposes battery, voltage and an action per button 1–4 with single, double and
  hold presses.
- romasku/tuya-zigbee-switch issue #237: the same hardware (Telink TLSR8253 module) also announces itself as
  `_TZ3000_bgtzm4ny` + `TS0044`.

## Decision (user)
Both couples are one product, so they live in the same driver. `scene_switch_4` supports battery + 4
buttons with single/double/hold flows, and the sacred-couple rule already chose it as sole owner of
HOBEIAN+ZG-101ZS. So:
- `scene_switch_4` owns HOBEIAN (+ case forms) + ZG-101ZS and `_TZ3000_bgtzm4ny` + TS0044.
- `button_wireless_4` no longer lists `_TZ3000_bgtzm4ny` (curated removal) and never ZG-101ZS.
- Registry cases `hobeian-zg101zs-scene` / `bgtzm4ny-ts0044-star-ring-scene` forbid button_wireless_4;
  couple pins and publish-sacred-keep list both couples; mfs_db aligned.
- The old curated removal "HOBEIAN off scene_switch_4" (c731c0f92e) is withdrawn; P2328 now allows exactly
  this couple and still rejects knob pids.

## Bot reorder fix
`tools/ci/re-inject-manual-fixes.js` front-pinned Wing ZTH and eWeLink 7014 pids on climate_sensor at every
publish, which displaced the P2704 front-pin `SNZB-02`. Those two fixes are now append-only; their couples
are protected in the payload by publish-sacred-keep instead of list position.

## P2521 cause
`data/mfs_db.json` key `_TZ3210_A2ERLVB8` carried a cross-product of 37 modelIds with a stale pid/count
while the registry says switch_2gang TS0002/TS000F; realigned (pid + modelIdsCount coherent).
