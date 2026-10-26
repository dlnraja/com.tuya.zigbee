# _TZE284_hodyryli: one couple, one driver (P3070)

Decision made on 26/10/2026 (Paris time): `_TZE284_hodyryli` + `TS0601` pairs on **climate_sensor_zt08**
and nowhere else in the publish payload.

## What the hardware is
- It is the Tuya ZT08 / ZT03_PRO weather sensor. It has a display and an external probe, and it talks
  the Tuya EF00 protocol:
  - DP1: temperature ÷10.
  - DP2: humidity, raw.
  - DP3: battery.
  - DP38: probe temperature ÷10.
  - DP17: time commit (unix 1970).
- Sources, rewritten here in our own words:
  - Zigbee2MQTT issues #29508, #29541 and #30862 (thanks to Koenkk and the reporters).
  - Our GitHub issue #513.
  - Homey forum thread 140352.
- Every source lists `TS0601` only. The repo already agreed:
  - `data/user-misattribution-registry.json` (entry `zt08-hodyryli`) names zt08 as the canonical driver
    and forbids climate_sensor.
  - `tools/ci/anti-bot-regression-gate.js` has rule P133.

## Why it still showed up in climate_sensor
The source compose files were already right; the publish payload was not. Two old pins put the couple
back into climate_sensor:
1. **P2490 sacred keep.** `config/architecture/publish-sacred-keep-couples.json` pinned the couple with
   `driverId: climate_sensor`, which was its home before P133. It now points to `climate_sensor_zt08`.
2. **P3024b baseline re-pin.**
   - Test package 9.0.1574 shipped `_TZE284_hodyryli` in climate_sensor, crossed with the 12 pids of
     that driver (cartesian).
   - The real `TS0601` couple moves to zt08 on its own, because zt08 owns it.
   - The other 11 combos (TS0201, ZTH11/13, CK-TLSR, ZG-227Z, and the case forms ts0601/Ts0601...) are
     not real devices. No driver owns them, so they were re-pinned on climate_sensor. That re-pin
     brought the manufacturer back, and climate_sensor's own `TS0601` pid recreated the duplicate.
   - Those 11 combos are now baseline `exemptions` with a reason, an `approvedBy` and a date.

## What does not change
- The real couple is never lost. It stays pinned in the payload (sacred keep plus baseline) on
  climate_sensor_zt08.
- Devices that are already paired on climate_sensor keep their driver id, because Homey never
  re-assigns a paired device. The climate_sensor runtime code is unchanged.
- No variant split needs both drivers. If a variant ever appears with a different productId and
  exact proof, add it to zt08 as its own exact couple.

Tests: `test/critical/p3070-hodyryli-one-driver.test.js` and
`test/critical/p3070-hodyryli-legacy-runtime.test.js` (climate_sensor still decodes DP1/2/3/38 for
devices paired before the move).

## Soak

Catalogue moves go to master first and soak before stable. This one reached stable-v5 the same day
(023e52e745, 26/10) and is kept there, not reverted: new pairings land on climate_sensor_zt08, devices
already on climate_sensor keep working (runtime test above). Soak watch until 02/11 on both trees:
any report of a ZT08 on climate_sensor losing temperature, humidity, battery or probe values.
