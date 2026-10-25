# P3057 — combo headroom without losing a real couple

Date: 2026-10-26 (Europe/Paris). Owner: t561u (dlnraja) "Prend les décisions toi même", t562u "Enchaîne tout".
Test: `test/critical/p3057-headroom.test.js`. Split script: `scripts/maintenance/p3057-split-radar-ts0601.js`.

## Why

Athom counts Zigbee combinations as manufacturerName x productId per driver (total limit 15500, per driver 1500).
Before P3057, the master floor (sacred + 9.0.1574 baseline pins forced, `HOMEY_ZIGBEE_MAX_TOTAL_COMBOS=1`) was 15412
without the 85 P3038c TS0601 pins and 16216 with them, so the P3038c re-entry (revert of 786382db4a) could not fit.
Target: floor <= 15200 (>= 300 headroom) with those pins, per-driver cap unchanged (1500).

## Decisions

1. **Split, not cap.** `presence_sensor_radar` mixed ~1000 manufacturer names with 56 product ids. Its TS0601-only
   Tuya DP names (808, case-insensitive selection) moved to a sibling `presence_sensor_radar_ts0601` whose only
   productId is TS0601. The parent keeps its id, its 191 other names and every product id (migration-safe: paired
   devices keep their driver; nothing is re-paired). Excluded from the move: names shipped on the parent in
   9.0.1574 with a non-TS0601 couple, names whose case variant must stay, names listed by any other driver
   (no new dual). Family union = the parent's golden snapshot hash (`scripts/perf/golden-couples.js` compares
   families via `lib/utils/DriverFamily.js`).
2. **Same runtime.** The sibling's `device.js` / `driver.js` re-export the parent's; capabilities, options and settings
   are identical. Its manifest lists only native clusters (DEVICE_TRUTH "native first"; 0xEF00 stays an optional
   runtime layer), so nothing new is mandatory at pairing.
3. **Flow cards keep their ids.** The 19 radar cards moved from `driver.flow.compose.json` to app-level
   `.homeycompose/flow/*` with a device arg filter `driver_id=presence_sensor_radar|presence_sensor_radar_ts0601`
   (same ids, so existing flows keep working; `getDeviceTriggerCard` resolves app-level device cards, as for
   `device_back_online`).
4. **Wrong-driver checks use the family.** `lib/helpers/device_helpers.js` (detectRecommendedDriver) and
   `lib/devices/BaseUnifiedDevice.js` use `sameDriverFamily`, so neither driver tells a device to move to the other.
   `safe-auto-migrate` already refuses to migrate TS0601 DP devices.
5. **Removal exemptions are final.** `resolveBaselinePins` now skips baseline couples with an owner-approved
   `removed:true` exemption (P3055 t555u) instead of force-pinning them on another driver that matches them by
   cartesian (that cost e.g. +280 combos on plug_energy_monitor). Plain move exemptions (P3039d) are unchanged.
   prepare-publish logs the count ("owner-approved removals not re-pinned").
6. **42 phantom couples exempted (t561u, under the t555u parasite-removal rule).** Each exists only as a cartesian
   in 9.0.1574, has no Z2M / ZHA / deCONZ / Blakadder / forum / diag source, and its real couple stays pinned:
   - `HEIMAN` x TS0215/TS0215A/TS0218 on button_emergency_sos (HEIMAN reports its own model ids);
   - `_TZE200_ntcy3xu1` (both cases) x 12 other-vendor smoke models on smoke_detector_advanced (Z2M TS0601_smoke_1:
     |TS0601 and |TS0205 stay);
   - `lumi`/`LUMI` x CK-BL702-MWS-01(7016) on vibration_sensor;
   - `_tz3000_o1jzcxou` x 5 Sonoff model ids on gateway_zigbee_bridge;
   - `_tze3000_pfc7i3kt` x 6 Tuya pids on switch_1_gang (mangled prefix: no `_TZE3000_` family exists);
   - `_TZE200_eqpaxqdv` (both cases) x TS0301 on sensor_gas_presence (Z2M: TS0601 gas sensor; |TS0601 stays).
   Never a `_TZE2xx_|TS0601` couple (test-checked).
   Side finding, out of scope: `_TZE200_eqpaxqdv` also sits in curtain_motor's source list.

## Measurements (real `homey app build` + `scripts/prepare-publish.js`, limits 15500 / 1500 / 2 case forms)

| master | floor (budget 1) | real run |
|---|---|---|
| origin/master, without P3038c pins | 15412 | 15499 |
| origin/master, with P3038c pins | 16216 | n/a (over) |
| P3057, without pins | 14673 | 15497, 304 drivers |
| P3057, with pins (13 sacred pins retargeted to the sibling) | **15195** (headroom 305) | 15498, exit 0 |

`homey app validate --level publish` passes on both publish payloads.

## Order of the master steps

1. P3055 merge; 2. P3057 headroom (this); 3. P3038c re-entry (patch + `retargetSacred` from the split script);
4. P3041 (held on #3683). Nothing is merged to master while the P3036 hold / pending send is active.

## Credits

Fingerprint truth: Koenkk zigbee-herdsman-converters (Z2M), zigpy zha-device-handlers (ZHA), dresden-elektronik
deCONZ DDF, Blakadder, Johan Bendz' Homey app; user forum and diag reports. Decision rule: P3055 (t555u).
