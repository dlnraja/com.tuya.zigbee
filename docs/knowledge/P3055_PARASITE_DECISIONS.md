# P3055 — parasitic Zigbee combos: per-couple decisions

Date: 2026-10-25 (Europe/Paris). Owner approval: t555u (dlnraja) (go-ahead to decide every couple, keeping losses as low as possible).
Machine-readable copy: `config/architecture/p3055-parasite-decisions.json`. Test: `test/critical/p3055-parasite-decisions.test.js`.

## Why

Homey pairs a Zigbee device when its manufacturerName **and** productId are both listed by one driver. A driver with M manufacturers and P productIds therefore matches M×P couples, most of which no real device reports. The P3036d report (650 couples of the 9.0.1574 Test-package baseline) listed those cartesian artefacts. The key of truth is the **exact couple** mfr+productId, checked against every source we keep.

## Rule applied per couple

1. **KEEP (attested)**: at least one source attests the couple (case-insensitive): Z2M herdsman converters (Koenkk), ZHA quirks, deCONZ, Blakadder, Johan Bendz' Homey app, Hubitat (kkossev and others), SmartThings, Domoticz, Tasmota, `lib/data/couple-guard.json`, diag reports, forum leads, Homey interviews, reviewed duals, misattribution registry, firmware quirks, or the changelog/docs.
2. **MOVE**: attested but wrong device class. None among the 650: the audit's class check (Z2M exposes vs driver capabilities) flags none of the 108 attested couples. The only move is `_TZE284_hodyryli` (see below).
3. **REMOVE**: no source at all, and removing it costs no attested couple: either the manufacturerName has no attested productId on that driver (mfr dropped), or no manufacturer of that driver is attested with the productId and the driver has no unverified manufacturer that might need it (productId dropped). Sacred pins and kb-topup-priority entries are never dropped.
4. **KEEP (collateral)**: a parasite whose mfr or productId is needed by an attested or unverified couple on the same driver. Removing it would need a driver split, so it stays, and the audit baseline keeps tracking it.

Removed couples that were in the 9.0.1574 baseline get a `baseline.exemptions` entry (approvedBy t555u) so publish-prep (`resolveBaselinePins`) cannot re-attach them. `.github/mfr-multi-driver-parasitic-baseline.json` shrank from 2233 to 1825 (shrink-only, no new entry).

## Counts

| Decision | Couples (of 650) |
|---|---|
| keep: attested | 108 |
| keep: collateral | 292 |
| move | 0 (plus the hodyryli fix) |
| remove | 250 |

Raw combinations removed from source matching: 783 (all case forms) across 6 drivers. No new driver. No attested couple lost (test-checked, in source and in the compacted publish payload). Already paired devices are untouched: only new pairing matching changes, and `lib/data/couple-guard.json` keeps unlisted productIds working on their current driver.

Lists changed:
- `device_air_purifier_plug`: mfr `_TZE200_7bztmfm1` (4 case forms), plus 21 productIds.
- `smoke_sensor3`: mfrs `_TZE200_0zaf1cr8` and `_TZE284_0zaf1cr8` (8 case forms). Their only productId here was TS0205, and the 0zaf1cr8 devices are TS0601.
- `bulb_tunable_white`: 21 productIds (Hue/IKEA/Gledopto/Innr models and TS0001/2/3/TS000F).
- `doorwindowsensor_4`: 11 productIds.
- `gas_sensor_switch`: 47 productIds. TS011F stays: it is the only attested one for `_TZ3000_9ni6xxld`.
- `switch_2_gang_metering`: TS004F.

## _TZE284_hodyryli + TS0601 (dual climate_sensor / climate_sensor_zt08)

- **Hardware**: TuYa ZT08 weather station with clock, internal/external temperature and humidity. Sources: Z2M `tuya.ts` `tuya.fingerprint("TS0601", ["_TZE284_hodyryli"])`, model ZT08, DPs 1 temp/10, 2 humidity, 3 battery_state, 17 time_format, 38 external temperature/10. Also Hubitat, GitHub #513/#1448, `data/user-misattribution-registry.json` (case zt08-hodyryli, canonical climate_sensor_zt08), and the anti-bot gate P133 (`p133-hodyryli-not-climate`).
- **Right driver**: `climate_sensor_zt08`, the only source driver that lists it.
- **Why the dual came back in the payload**:
  1. The sacred pin pointed at `climate_sensor`.
  2. The baseline restored 11 parasitic `_TZE284_hodyryli`@climate_sensor couples (TS0201 forms, ZTH13-3.0, ZTH11-3.0, ZG-227Z forms, CK-TLSR8656 forms, ts0601/Ts0601). That re-added the mfr to climate_sensor, and its cartesian then matched TS0601 again.
- **Fix**:
  1. The sacred pin now targets `climate_sensor_zt08`.
  2. The 11 couples are exempted (none is attested; ZT08 is TS0601 only).
  3. The test runs the real compaction and asserts the couple pairs on `climate_sensor_zt08` only.

## Compaction-shuffle guard pins

Freeing budget changes which unpinned groups pass2 cuts at the 17000 cap. Four attested canonical couples would have moved out of the payload, so they are now sacred pins:
- `_TYZB01_m6ec2pgj`+TS0222 on illuminance_sensor (Z2M TS0222 light sensor);
- `_TZ3000_rid8lzvo`+TS0203 on sensor_contact_zigbee (Z2M Wing WZDA1). The exact wire string was already absent before; now it is in;
- `_TZE284_tre6haif`+TS0601 on sensor_motion_presence (Z2M TS0601_pir_solar);
- `_TZ3000_ynmowqk2`+TS011F on smartplug (Z2M lidl.ts).

The fingerbot move (below) freed budget again, and four more attested couples dropped out one after another. They are pinned too:
- `_TZ3000_0t4zjtia`+TS0001 on wall_switch_1gang_1way (SmartThings; its only driver);
- `_TZE200_tz32mtza`+TS0601 on wall_switch_3gang_1way (Z2M moes.ts ZTS-EU_3gang, also ZHA and Blakadder);
- `_TZE200_3ejwxpmu`+TS0601 on air_quality_co2 (Z2M TS0601_temperature_humidity_co2_sensor, also ZHA);
- `_TZE284_8zizsafo`+TS0601 on valve_irrigation (Z2M GIEX GX03 2-zone watering timer, also ZHA and Hubitat). Before this, only case variants were in the payload.

Final check (built payload vs master payload, case-insensitive, per driver): the only attested couple that leaves a driver is hodyryli@climate_sensor, which is intended. Earlier result before the fingerbot step: canonical attested couples in the payload went from 1493 to 1499, and the only intended losses are the hodyryli@climate_sensor parasites. Some non-canonical case variants (e.g. `_tyzb01_m6ec2pgj`) were trimmed by the existing case-form limit. Devices report the canonical string.

## Fingerbot plus on TS0001 (steering 2)

`_TZ3210_7vgttna6`, `_TZ3210_a04acm9s` and `_TZ3210_cm9mbpr1` with TS0001 are the Tuya Zigbee fingerbot plus (Z2M tuya.ts `TS0001_fingerbot` for all three; ZHA `tuya_fingerbot` for the first two). On master they were listed on sensor_motion_presence, a wrong-class driver; the store build had them on no TS0001 driver. fingerbot already had TS0001 and its device.js already handles this mfr family.
- Decision: the 4 case forms of each mfr leave sensor_motion_presence and go to fingerbot. A sacred pin keeps the exact couple on fingerbot. One couple, one driver.
- Already-paired devices keep their driver, because only matching changes. The 9.0.1574 baseline has none of these mfrs, so no exemption is needed.
- Lead, not changed (runtime, not matching): `lib/tuya/fingerprints.json` and the fp shards still hint `_TZ3210_7vgttna6` as motion_sensor and the uppercase forms as bulb_rgb TS0503A.

`_TZ3210_d3m9v8p6` and `_TZ3210_pwj6vuj9` on fingerbot: no Z2M, ZHA, Johan, web, forum or diag hit. They have been on fingerbot since the v7.2.9 import (2026-04-11; earlier history was lost). Every data file that lists them was generated from the compose file. They are in the 9.0.1574 baseline and nothing proves them wrong, so they are **kept**.

## Credits

Z2M / zigbee-herdsman-converters (Koenkk and contributors), ZHA device handlers, deCONZ, Blakadder Zigbee DB, Johan Bendz (com.tuya.zigbee original), Hubitat community drivers (kkossev), SmartThings, Domoticz and Tasmota device lists, and the forum and GitHub reporters of #513/#1448. Data was cross-checked, not copied.

## Table (650 P3036d couples + 11 hodyryli)

| mfr | productId | driver | decision | source / reason |
|---|---|---|---|---|
| _TZB210_rkgngb5o | Classic A60 TW | bulb_tunable_white | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZB210_rkgngb5o | E11-N13 | bulb_tunable_white | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZB210_rkgngb5o | E11-N14 | bulb_tunable_white | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZB210_rkgngb5o | E12-N13 | bulb_tunable_white | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZB210_rkgngb5o | E12-N14 | bulb_tunable_white | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZB210_rkgngb5o | GL-B-007Z | bulb_tunable_white | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZB210_rkgngb5o | GL-C-007 | bulb_tunable_white | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZB210_rkgngb5o | LED1545G12 | bulb_tunable_white | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZB210_rkgngb5o | LED1546G12 | bulb_tunable_white | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZB210_rkgngb5o | LTW001 | bulb_tunable_white | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZB210_rkgngb5o | LTW004 | bulb_tunable_white | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZB210_rkgngb5o | LTW010 | bulb_tunable_white | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZB210_rkgngb5o | LTW012 | bulb_tunable_white | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZB210_rkgngb5o | LTW013 | bulb_tunable_white | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZB210_rkgngb5o | LTW015 | bulb_tunable_white | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZB210_rkgngb5o | RB 178 T | bulb_tunable_white | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZB210_rkgngb5o | RS 128 T | bulb_tunable_white | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZB210_rkgngb5o | TS0001 | bulb_tunable_white | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZB210_rkgngb5o | TS0002 | bulb_tunable_white | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZB210_rkgngb5o | TS0003 | bulb_tunable_white | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZB210_rkgngb5o | TS000F | bulb_tunable_white | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZB210_rkgngb5o | TS0011 | bulb_tunable_white | KEEP (attested) | docs:docs/reports/MASTER_AUTOMATION_REPORT.json |
| _TZB210_rkgngb5o | TS0502B | bulb_tunable_white | KEEP (attested) | blakadder, misattribution-registry, docs:docs/knowledge/DEVICE_TRUTH.md |
| _tzb210_rkgngb5o | Classic A60 TW | bulb_tunable_white | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tzb210_rkgngb5o | E11-N13 | bulb_tunable_white | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tzb210_rkgngb5o | E11-N14 | bulb_tunable_white | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tzb210_rkgngb5o | E12-N13 | bulb_tunable_white | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tzb210_rkgngb5o | E12-N14 | bulb_tunable_white | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tzb210_rkgngb5o | GL-B-007Z | bulb_tunable_white | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tzb210_rkgngb5o | GL-C-007 | bulb_tunable_white | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tzb210_rkgngb5o | LED1545G12 | bulb_tunable_white | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tzb210_rkgngb5o | LED1546G12 | bulb_tunable_white | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tzb210_rkgngb5o | LTW001 | bulb_tunable_white | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tzb210_rkgngb5o | LTW004 | bulb_tunable_white | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tzb210_rkgngb5o | LTW010 | bulb_tunable_white | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tzb210_rkgngb5o | LTW012 | bulb_tunable_white | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tzb210_rkgngb5o | LTW013 | bulb_tunable_white | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tzb210_rkgngb5o | LTW015 | bulb_tunable_white | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tzb210_rkgngb5o | RB 178 T | bulb_tunable_white | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tzb210_rkgngb5o | RS 128 T | bulb_tunable_white | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tzb210_rkgngb5o | TS0001 | bulb_tunable_white | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tzb210_rkgngb5o | TS0002 | bulb_tunable_white | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tzb210_rkgngb5o | TS0003 | bulb_tunable_white | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tzb210_rkgngb5o | TS000F | bulb_tunable_white | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tzb210_rkgngb5o | TS0011 | bulb_tunable_white | KEEP (attested) | docs:docs/reports/MASTER_AUTOMATION_REPORT.json |
| _tzb210_rkgngb5o | TS0502B | bulb_tunable_white | KEEP (attested) | blakadder, misattribution-registry, docs:docs/knowledge/DEVICE_TRUTH.md |
| ZBEACON | TS0505B | bulb_zbeacon_ts0505b | KEEP (attested) | interviews |
| zbeacon | TS0505B | bulb_zbeacon_ts0505b | KEEP (attested) | interviews |
| HOBEIAN | ts0041 | button_wireless_1 | KEEP (collateral) | collateral: 54 unverified mfrs on driver could use this pid, and mfr has attested pids here () |
| HOBEIAN | Ts0041 | button_wireless_1 | KEEP (collateral) | collateral: 54 unverified mfrs on driver could use this pid, and mfr has attested pids here () |
| HOBEIAN | TS0041 | button_wireless_1 | KEEP (collateral) | collateral: 54 unverified mfrs on driver could use this pid, and mfr has attested pids here () |
| HOBEIAN | TS0601 | button_wireless_1 | KEEP (collateral) | collateral: 54 unverified mfrs on driver could use this pid, and mfr has attested pids here () |
| HOBEIAN | zg-101zl | button_wireless_1 | KEEP (collateral) | collateral: 54 unverified mfrs on driver could use this pid, and mfr has attested pids here () |
| HOBEIAN | ZG-101ZL | button_wireless_1 | KEEP (collateral) | collateral: 54 unverified mfrs on driver could use this pid, and mfr has attested pids here () |
| HOBEIAN | TS0001 | button_wireless_1 | KEEP (collateral) | collateral: 54 unverified mfrs on driver could use this pid, and mfr has attested pids here () |
| hobeian | ts0041 | button_wireless_1 | KEEP (collateral) | collateral: 54 unverified mfrs on driver could use this pid, and mfr has attested pids here () |
| hobeian | Ts0041 | button_wireless_1 | KEEP (collateral) | collateral: 54 unverified mfrs on driver could use this pid, and mfr has attested pids here () |
| hobeian | TS0041 | button_wireless_1 | KEEP (collateral) | collateral: 54 unverified mfrs on driver could use this pid, and mfr has attested pids here () |
| hobeian | TS0601 | button_wireless_1 | KEEP (collateral) | collateral: 54 unverified mfrs on driver could use this pid, and mfr has attested pids here () |
| hobeian | zg-101zl | button_wireless_1 | KEEP (collateral) | collateral: 54 unverified mfrs on driver could use this pid, and mfr has attested pids here () |
| hobeian | ZG-101ZL | button_wireless_1 | KEEP (collateral) | collateral: 54 unverified mfrs on driver could use this pid, and mfr has attested pids here () |
| hobeian | TS0001 | button_wireless_1 | KEEP (collateral) | collateral: 54 unverified mfrs on driver could use this pid, and mfr has attested pids here () |
| HOBEIAN | CK-TLSR8656-SS5-02(7014) | climate_sensor | KEEP (collateral) | collateral: 520 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-227Z,ZG-227ZL,zg-227z) |
| HOBEIAN | CK-TLSR8656-SS5-01(7014) | climate_sensor | KEEP (collateral) | collateral: 520 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-227Z,ZG-227ZL,zg-227z) |
| HOBEIAN | ZTH13-3.0 | climate_sensor | KEEP (collateral) | collateral: 520 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-227Z,ZG-227ZL,zg-227z) |
| HOBEIAN | ZTH11-3.0 | climate_sensor | KEEP (collateral) | collateral: 520 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-227Z,ZG-227ZL,zg-227z) |
| HOBEIAN | TS0201 | climate_sensor | KEEP (collateral) | collateral: 520 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-227Z,ZG-227ZL,zg-227z) |
| HOBEIAN | ZG-227Z | climate_sensor | KEEP (attested) | kb:deconz, interviews |
| HOBEIAN | TS0601 | climate_sensor | KEEP (collateral) | collateral: 520 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-227Z,ZG-227ZL,zg-227z) |
| HOBEIAN | ts0201 | climate_sensor | KEEP (collateral) | collateral: 520 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-227Z,ZG-227ZL,zg-227z) |
| HOBEIAN | Ts0201 | climate_sensor | KEEP (collateral) | collateral: 520 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-227Z,ZG-227ZL,zg-227z) |
| HOBEIAN | zg-227z | climate_sensor | KEEP (attested) | kb:deconz, interviews |
| HOBEIAN | ts0601 | climate_sensor | KEEP (collateral) | collateral: 520 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-227Z,ZG-227ZL,zg-227z) |
| HOBEIAN | Ts0601 | climate_sensor | KEEP (collateral) | collateral: 520 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-227Z,ZG-227ZL,zg-227z) |
| hobeian | CK-TLSR8656-SS5-02(7014) | climate_sensor | KEEP (collateral) | collateral: 520 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-227Z,ZG-227ZL,zg-227z) |
| hobeian | CK-TLSR8656-SS5-01(7014) | climate_sensor | KEEP (collateral) | collateral: 520 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-227Z,ZG-227ZL,zg-227z) |
| hobeian | ZTH13-3.0 | climate_sensor | KEEP (collateral) | collateral: 520 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-227Z,ZG-227ZL,zg-227z) |
| hobeian | ZTH11-3.0 | climate_sensor | KEEP (collateral) | collateral: 520 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-227Z,ZG-227ZL,zg-227z) |
| hobeian | TS0201 | climate_sensor | KEEP (collateral) | collateral: 520 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-227Z,ZG-227ZL,zg-227z) |
| hobeian | ZG-227Z | climate_sensor | KEEP (attested) | kb:deconz, interviews |
| hobeian | TS0601 | climate_sensor | KEEP (collateral) | collateral: 520 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-227Z,ZG-227ZL,zg-227z) |
| hobeian | ts0201 | climate_sensor | KEEP (collateral) | collateral: 520 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-227Z,ZG-227ZL,zg-227z) |
| hobeian | Ts0201 | climate_sensor | KEEP (collateral) | collateral: 520 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-227Z,ZG-227ZL,zg-227z) |
| hobeian | zg-227z | climate_sensor | KEEP (attested) | kb:deconz, interviews |
| hobeian | ts0601 | climate_sensor | KEEP (collateral) | collateral: 520 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-227Z,ZG-227ZL,zg-227z) |
| hobeian | Ts0601 | climate_sensor | KEEP (collateral) | collateral: 520 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-227Z,ZG-227ZL,zg-227z) |
| HOBEIAN | TS0203 | contact_sensor | KEEP (collateral) | collateral: 26 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-102Z,zg-102z) |
| HOBEIAN | 3300-S | contact_sensor | KEEP (collateral) | collateral: 26 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-102Z,zg-102z) |
| HOBEIAN | 3320-L | contact_sensor | KEEP (collateral) | collateral: 26 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-102Z,zg-102z) |
| HOBEIAN | CK-TLSR8656-SS5-01(7003) | contact_sensor | KEEP (collateral) | collateral: 26 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-102Z,zg-102z) |
| HOBEIAN | DS01 | contact_sensor | KEEP (collateral) | collateral: 26 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-102Z,zg-102z) |
| HOBEIAN | ZG-102Z | contact_sensor | KEEP (attested) | interviews |
| HOBEIAN | ts0203 | contact_sensor | KEEP (collateral) | collateral: 26 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-102Z,zg-102z) |
| HOBEIAN | Ts0203 | contact_sensor | KEEP (collateral) | collateral: 26 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-102Z,zg-102z) |
| HOBEIAN | zg-102z | contact_sensor | KEEP (attested) | interviews |
| hobeian | TS0203 | contact_sensor | KEEP (collateral) | collateral: 26 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-102Z,zg-102z) |
| hobeian | 3300-S | contact_sensor | KEEP (collateral) | collateral: 26 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-102Z,zg-102z) |
| hobeian | 3320-L | contact_sensor | KEEP (collateral) | collateral: 26 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-102Z,zg-102z) |
| hobeian | CK-TLSR8656-SS5-01(7003) | contact_sensor | KEEP (collateral) | collateral: 26 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-102Z,zg-102z) |
| hobeian | DS01 | contact_sensor | KEEP (collateral) | collateral: 26 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-102Z,zg-102z) |
| hobeian | ZG-102Z | contact_sensor | KEEP (attested) | interviews |
| hobeian | ts0203 | contact_sensor | KEEP (collateral) | collateral: 26 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-102Z,zg-102z) |
| hobeian | Ts0203 | contact_sensor | KEEP (collateral) | collateral: 26 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-102Z,zg-102z) |
| hobeian | zg-102z | contact_sensor | KEEP (attested) | interviews |
| _TZE200_7bztmfm1 | 0x8040 | device_air_purifier_plug | REMOVE | mfr dropped from driver (no pid of this driver is attested for it) |
| _TZE200_7bztmfm1 | BASICZBR3 | device_air_purifier_plug | REMOVE | mfr dropped from driver (no pid of this driver is attested for it) |
| _TZE200_7bztmfm1 | BSP-EZ2 | device_air_purifier_plug | REMOVE | mfr dropped from driver (no pid of this driver is attested for it) |
| _TZE200_7bztmfm1 | BSP-FZ2 | device_air_purifier_plug | REMOVE | mfr dropped from driver (no pid of this driver is attested for it) |
| _TZE200_7bztmfm1 | Battery switch, 1 button | device_air_purifier_plug | REMOVE | mfr dropped from driver (no pid of this driver is attested for it) |
| _TZE200_7bztmfm1 | Battery switch, 2 buttons | device_air_purifier_plug | REMOVE | mfr dropped from driver (no pid of this driver is attested for it) |
| _TZE200_7bztmfm1 | PJ-1203A | device_air_purifier_plug | REMOVE | mfr dropped from driver (no pid of this driver is attested for it) |
| _TZE200_7bztmfm1 | S26R2ZB | device_air_purifier_plug | REMOVE | mfr dropped from driver (no pid of this driver is attested for it) |
| _TZE200_7bztmfm1 | S31ZB | device_air_purifier_plug | REMOVE | mfr dropped from driver (no pid of this driver is attested for it) |
| _TZE200_7bztmfm1 | S40ZBTPB | device_air_purifier_plug | REMOVE | mfr dropped from driver (no pid of this driver is attested for it) |
| _TZE200_7bztmfm1 | TRV001 | device_air_purifier_plug | REMOVE | mfr dropped from driver (no pid of this driver is attested for it) |
| _TZE200_7bztmfm1 | TRV003 | device_air_purifier_plug | REMOVE | mfr dropped from driver (no pid of this driver is attested for it) |
| _TZE200_7bztmfm1 | TS0026 | device_air_purifier_plug | REMOVE | mfr dropped from driver (no pid of this driver is attested for it) |
| _TZE200_7bztmfm1 | TS0041A | device_air_purifier_plug | REMOVE | mfr dropped from driver (no pid of this driver is attested for it) |
| _TZE200_7bztmfm1 | TS0044 | device_air_purifier_plug | REMOVE | mfr dropped from driver (no pid of this driver is attested for it) |
| _TZE200_7bztmfm1 | TS004F | device_air_purifier_plug | REMOVE | mfr dropped from driver (no pid of this driver is attested for it) |
| _TZE200_7bztmfm1 | TS0052 | device_air_purifier_plug | REMOVE | mfr dropped from driver (no pid of this driver is attested for it) |
| _TZE200_7bztmfm1 | TS0105 | device_air_purifier_plug | REMOVE | mfr dropped from driver (no pid of this driver is attested for it) |
| _TZE200_7bztmfm1 | TS011F | device_air_purifier_plug | REMOVE | mfr dropped from driver (no pid of this driver is attested for it) |
| _TZE200_7bztmfm1 | TS0224 | device_air_purifier_plug | REMOVE | mfr dropped from driver (no pid of this driver is attested for it) |
| _TZE200_7bztmfm1 | TS0601_meter | device_air_purifier_plug | REMOVE | mfr dropped from driver (no pid of this driver is attested for it) |
| _TZE200_7bztmfm1 | TS0901 | device_air_purifier_plug | REMOVE | mfr dropped from driver (no pid of this driver is attested for it) |
| _tze200_7bztmfm1 | 0x8040 | device_air_purifier_plug | REMOVE | mfr dropped from driver (no pid of this driver is attested for it) |
| _tze200_7bztmfm1 | BASICZBR3 | device_air_purifier_plug | REMOVE | mfr dropped from driver (no pid of this driver is attested for it) |
| _tze200_7bztmfm1 | BSP-EZ2 | device_air_purifier_plug | REMOVE | mfr dropped from driver (no pid of this driver is attested for it) |
| _tze200_7bztmfm1 | BSP-FZ2 | device_air_purifier_plug | REMOVE | mfr dropped from driver (no pid of this driver is attested for it) |
| _tze200_7bztmfm1 | Battery switch, 1 button | device_air_purifier_plug | REMOVE | mfr dropped from driver (no pid of this driver is attested for it) |
| _tze200_7bztmfm1 | Battery switch, 2 buttons | device_air_purifier_plug | REMOVE | mfr dropped from driver (no pid of this driver is attested for it) |
| _tze200_7bztmfm1 | PJ-1203A | device_air_purifier_plug | REMOVE | mfr dropped from driver (no pid of this driver is attested for it) |
| _tze200_7bztmfm1 | S26R2ZB | device_air_purifier_plug | REMOVE | mfr dropped from driver (no pid of this driver is attested for it) |
| _tze200_7bztmfm1 | S31ZB | device_air_purifier_plug | REMOVE | mfr dropped from driver (no pid of this driver is attested for it) |
| _tze200_7bztmfm1 | S40ZBTPB | device_air_purifier_plug | REMOVE | mfr dropped from driver (no pid of this driver is attested for it) |
| _tze200_7bztmfm1 | TRV001 | device_air_purifier_plug | REMOVE | mfr dropped from driver (no pid of this driver is attested for it) |
| _tze200_7bztmfm1 | TRV003 | device_air_purifier_plug | REMOVE | mfr dropped from driver (no pid of this driver is attested for it) |
| _tze200_7bztmfm1 | TS0026 | device_air_purifier_plug | REMOVE | mfr dropped from driver (no pid of this driver is attested for it) |
| _tze200_7bztmfm1 | TS0041A | device_air_purifier_plug | REMOVE | mfr dropped from driver (no pid of this driver is attested for it) |
| _tze200_7bztmfm1 | TS0044 | device_air_purifier_plug | REMOVE | mfr dropped from driver (no pid of this driver is attested for it) |
| _tze200_7bztmfm1 | TS004F | device_air_purifier_plug | REMOVE | mfr dropped from driver (no pid of this driver is attested for it) |
| _tze200_7bztmfm1 | TS0052 | device_air_purifier_plug | REMOVE | mfr dropped from driver (no pid of this driver is attested for it) |
| _tze200_7bztmfm1 | TS0105 | device_air_purifier_plug | REMOVE | mfr dropped from driver (no pid of this driver is attested for it) |
| _tze200_7bztmfm1 | TS011F | device_air_purifier_plug | REMOVE | mfr dropped from driver (no pid of this driver is attested for it) |
| _tze200_7bztmfm1 | TS0224 | device_air_purifier_plug | REMOVE | mfr dropped from driver (no pid of this driver is attested for it) |
| _tze200_7bztmfm1 | TS0601_meter | device_air_purifier_plug | REMOVE | mfr dropped from driver (no pid of this driver is attested for it) |
| _tze200_7bztmfm1 | TS0901 | device_air_purifier_plug | REMOVE | mfr dropped from driver (no pid of this driver is attested for it) |
| _TZE204_7bztmfm1 | 0x8040 | device_air_purifier_plug | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZE204_7bztmfm1 | BASICZBR3 | device_air_purifier_plug | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZE204_7bztmfm1 | BSP-EZ2 | device_air_purifier_plug | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZE204_7bztmfm1 | BSP-FZ2 | device_air_purifier_plug | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZE204_7bztmfm1 | Battery switch, 1 button | device_air_purifier_plug | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZE204_7bztmfm1 | Battery switch, 2 buttons | device_air_purifier_plug | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZE204_7bztmfm1 | PJ-1203A | device_air_purifier_plug | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZE204_7bztmfm1 | S26R2ZB | device_air_purifier_plug | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZE204_7bztmfm1 | S31ZB | device_air_purifier_plug | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZE204_7bztmfm1 | S40ZBTPB | device_air_purifier_plug | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZE204_7bztmfm1 | TRV001 | device_air_purifier_plug | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZE204_7bztmfm1 | TRV003 | device_air_purifier_plug | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZE204_7bztmfm1 | TS0026 | device_air_purifier_plug | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZE204_7bztmfm1 | TS0041A | device_air_purifier_plug | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZE204_7bztmfm1 | TS0044 | device_air_purifier_plug | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZE204_7bztmfm1 | TS004F | device_air_purifier_plug | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZE204_7bztmfm1 | TS0052 | device_air_purifier_plug | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZE204_7bztmfm1 | TS0105 | device_air_purifier_plug | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZE204_7bztmfm1 | TS011F | device_air_purifier_plug | KEEP (attested) | docs:docs/progress/JOURNAL.md |
| _TZE204_7bztmfm1 | TS0224 | device_air_purifier_plug | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZE204_7bztmfm1 | TS0601_meter | device_air_purifier_plug | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZE204_7bztmfm1 | TS0901 | device_air_purifier_plug | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tze204_7bztmfm1 | 0x8040 | device_air_purifier_plug | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tze204_7bztmfm1 | BASICZBR3 | device_air_purifier_plug | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tze204_7bztmfm1 | BSP-EZ2 | device_air_purifier_plug | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tze204_7bztmfm1 | BSP-FZ2 | device_air_purifier_plug | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tze204_7bztmfm1 | Battery switch, 1 button | device_air_purifier_plug | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tze204_7bztmfm1 | Battery switch, 2 buttons | device_air_purifier_plug | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tze204_7bztmfm1 | PJ-1203A | device_air_purifier_plug | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tze204_7bztmfm1 | S26R2ZB | device_air_purifier_plug | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tze204_7bztmfm1 | S31ZB | device_air_purifier_plug | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tze204_7bztmfm1 | S40ZBTPB | device_air_purifier_plug | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tze204_7bztmfm1 | TRV001 | device_air_purifier_plug | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tze204_7bztmfm1 | TRV003 | device_air_purifier_plug | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tze204_7bztmfm1 | TS0026 | device_air_purifier_plug | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tze204_7bztmfm1 | TS0041A | device_air_purifier_plug | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tze204_7bztmfm1 | TS0044 | device_air_purifier_plug | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tze204_7bztmfm1 | TS004F | device_air_purifier_plug | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tze204_7bztmfm1 | TS0052 | device_air_purifier_plug | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tze204_7bztmfm1 | TS0105 | device_air_purifier_plug | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tze204_7bztmfm1 | TS011F | device_air_purifier_plug | KEEP (attested) | docs:docs/progress/JOURNAL.md |
| _tze204_7bztmfm1 | TS0224 | device_air_purifier_plug | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tze204_7bztmfm1 | TS0601_meter | device_air_purifier_plug | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tze204_7bztmfm1 | TS0901 | device_air_purifier_plug | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| ZBEACON | DS01 | doorwindowsensor_4 | KEEP (attested) | kb:deconz, kb:johan, interviews |
| ZBEACON | Excellux | doorwindowsensor_4 | KEEP (collateral) | collateral: pid attested for another mfr of driver and mfr attested here with DS01,TS0201,TS0202 |
| ZBEACON | RH3052 | doorwindowsensor_4 | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| ZBEACON | SM0201 | doorwindowsensor_4 | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| ZBEACON | THS317-ET | doorwindowsensor_4 | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| ZBEACON | TS0201 | doorwindowsensor_4 | KEEP (attested) | deconz, kb:deconz, interviews |
| ZBEACON | TS0202 | doorwindowsensor_4 | KEEP (attested) | z2m, kb:z2m, kb:zhc |
| ZBEACON | TS0222 | doorwindowsensor_4 | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| ZBEACON | TS0601 | doorwindowsensor_4 | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| ZBEACON | TS1201 | doorwindowsensor_4 | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| ZBEACON | TY0201 | doorwindowsensor_4 | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| ZBEACON | WSDCGQ01LM | doorwindowsensor_4 | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| ZBEACON | WSDCGQ11LM | doorwindowsensor_4 | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| ZBEACON | WSDCGQ12LM | doorwindowsensor_4 | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| ZBEACON | lumi.sensor_ht | doorwindowsensor_4 | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| zbeacon | DS01 | doorwindowsensor_4 | KEEP (attested) | kb:deconz, kb:johan, interviews |
| zbeacon | Excellux | doorwindowsensor_4 | KEEP (collateral) | collateral: pid attested for another mfr of driver and mfr attested here with DS01,TS0201,TS0202 |
| zbeacon | RH3052 | doorwindowsensor_4 | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| zbeacon | SM0201 | doorwindowsensor_4 | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| zbeacon | THS317-ET | doorwindowsensor_4 | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| zbeacon | TS0201 | doorwindowsensor_4 | KEEP (attested) | deconz, kb:deconz, interviews |
| zbeacon | TS0202 | doorwindowsensor_4 | KEEP (attested) | z2m, kb:z2m, kb:zhc |
| zbeacon | TS0222 | doorwindowsensor_4 | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| zbeacon | TS0601 | doorwindowsensor_4 | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| zbeacon | TS1201 | doorwindowsensor_4 | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| zbeacon | TY0201 | doorwindowsensor_4 | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| zbeacon | WSDCGQ01LM | doorwindowsensor_4 | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| zbeacon | WSDCGQ11LM | doorwindowsensor_4 | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| zbeacon | WSDCGQ12LM | doorwindowsensor_4 | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| zbeacon | lumi.sensor_ht | doorwindowsensor_4 | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZ3000_9ni6xxld | 01MINIZB | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZ3000_9ni6xxld | 3315-S | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZ3000_9ni6xxld | 3315-Seu | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZ3000_9ni6xxld | BASICZBR3 | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZ3000_9ni6xxld | CK-TLSR8656-SS5-01(7019) | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZ3000_9ni6xxld | HS1WL | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZ3000_9ni6xxld | LS21001 | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZ3000_9ni6xxld | S26R2ZB | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZ3000_9ni6xxld | S31ZB | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZ3000_9ni6xxld | SJCGQ11LM | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZ3000_9ni6xxld | SJCGQ12LM | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZ3000_9ni6xxld | SJCGQ13LM | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZ3000_9ni6xxld | SQ510A | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZ3000_9ni6xxld | TS0001 | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZ3000_9ni6xxld | TS0001_power | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZ3000_9ni6xxld | TS0001_switch | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZ3000_9ni6xxld | TS0001_switch_module | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZ3000_9ni6xxld | TS0002 | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZ3000_9ni6xxld | TS0003 | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZ3000_9ni6xxld | TS0004 | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZ3000_9ni6xxld | TS000F | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZ3000_9ni6xxld | TS0011 | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZ3000_9ni6xxld | TS0012 | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZ3000_9ni6xxld | TS0014 | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZ3000_9ni6xxld | TS0041 | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZ3000_9ni6xxld | TS0101 | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZ3000_9ni6xxld | TS0111 | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZ3000_9ni6xxld | TS0203 | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZ3000_9ni6xxld | TS0601 | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZ3000_9ni6xxld | TS0601_generic | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZ3000_9ni6xxld | TS0603 | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZ3000_9ni6xxld | TS0726 | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZ3000_9ni6xxld | TS110E | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZ3000_9ni6xxld | TS130F | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZ3000_9ni6xxld | TS4100 | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZ3000_9ni6xxld | ZBM5-1C-120 | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZ3000_9ni6xxld | ZBM5-2C-120 | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZ3000_9ni6xxld | ZBM5-3C-120 | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZ3000_9ni6xxld | ZBMINI | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZ3000_9ni6xxld | ZBMINIL2 | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZ3000_9ni6xxld | ZBMINIL2-R2 | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZ3000_9ni6xxld | ZBMINIR | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZ3000_9ni6xxld | ZBMINIR2 | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZ3000_9ni6xxld | ZBMINIR2-R2 | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZ3000_9ni6xxld | _tz3000_eit6l5 | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZ3000_9ni6xxld | _tz3000_kyb656no | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZ3000_9ni6xxld | lumi.sensor_wleak.aq1 | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tz3000_9ni6xxld | 01MINIZB | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tz3000_9ni6xxld | 3315-S | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tz3000_9ni6xxld | 3315-Seu | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tz3000_9ni6xxld | BASICZBR3 | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tz3000_9ni6xxld | CK-TLSR8656-SS5-01(7019) | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tz3000_9ni6xxld | HS1WL | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tz3000_9ni6xxld | LS21001 | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tz3000_9ni6xxld | S26R2ZB | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tz3000_9ni6xxld | S31ZB | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tz3000_9ni6xxld | SJCGQ11LM | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tz3000_9ni6xxld | SJCGQ12LM | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tz3000_9ni6xxld | SJCGQ13LM | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tz3000_9ni6xxld | SQ510A | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tz3000_9ni6xxld | TS0001 | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tz3000_9ni6xxld | TS0001_power | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tz3000_9ni6xxld | TS0001_switch | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tz3000_9ni6xxld | TS0001_switch_module | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tz3000_9ni6xxld | TS0002 | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tz3000_9ni6xxld | TS0003 | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tz3000_9ni6xxld | TS0004 | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tz3000_9ni6xxld | TS000F | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tz3000_9ni6xxld | TS0011 | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tz3000_9ni6xxld | TS0012 | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tz3000_9ni6xxld | TS0014 | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tz3000_9ni6xxld | TS0041 | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tz3000_9ni6xxld | TS0101 | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tz3000_9ni6xxld | TS0111 | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tz3000_9ni6xxld | TS0203 | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tz3000_9ni6xxld | TS0601 | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tz3000_9ni6xxld | TS0601_generic | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tz3000_9ni6xxld | TS0603 | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tz3000_9ni6xxld | TS0726 | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tz3000_9ni6xxld | TS110E | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tz3000_9ni6xxld | TS130F | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tz3000_9ni6xxld | TS4100 | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tz3000_9ni6xxld | ZBM5-1C-120 | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tz3000_9ni6xxld | ZBM5-2C-120 | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tz3000_9ni6xxld | ZBM5-3C-120 | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tz3000_9ni6xxld | ZBMINI | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tz3000_9ni6xxld | ZBMINIL2 | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tz3000_9ni6xxld | ZBMINIL2-R2 | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tz3000_9ni6xxld | ZBMINIR | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tz3000_9ni6xxld | ZBMINIR2 | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tz3000_9ni6xxld | ZBMINIR2-R2 | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tz3000_9ni6xxld | _tz3000_eit6l5 | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tz3000_9ni6xxld | _tz3000_kyb656no | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tz3000_9ni6xxld | lumi.sensor_wleak.aq1 | gas_sensor_switch | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| HOBEIAN | TS0222 | illuminance_sensor | KEEP (collateral) | collateral: 4 unverified mfrs on driver could use this pid, and mfr has attested pids here (TS0225,ZG-106Z,ts0225) |
| HOBEIAN | TS0601 | illuminance_sensor | KEEP (collateral) | collateral: 4 unverified mfrs on driver could use this pid, and mfr has attested pids here (TS0225,ZG-106Z,ts0225) |
| HOBEIAN | ZG-106Z | illuminance_sensor | KEEP (attested) | kb:deconz |
| HOBEIAN | ts0222 | illuminance_sensor | KEEP (collateral) | collateral: 4 unverified mfrs on driver could use this pid, and mfr has attested pids here (TS0225,ZG-106Z,ts0225) |
| HOBEIAN | Ts0222 | illuminance_sensor | KEEP (collateral) | collateral: 4 unverified mfrs on driver could use this pid, and mfr has attested pids here (TS0225,ZG-106Z,ts0225) |
| HOBEIAN | zg-106z | illuminance_sensor | KEEP (attested) | kb:deconz |
| hobeian | TS0222 | illuminance_sensor | KEEP (collateral) | collateral: 4 unverified mfrs on driver could use this pid, and mfr has attested pids here (TS0225,ZG-106Z,ts0225) |
| hobeian | TS0601 | illuminance_sensor | KEEP (collateral) | collateral: 4 unverified mfrs on driver could use this pid, and mfr has attested pids here (TS0225,ZG-106Z,ts0225) |
| hobeian | ZG-106Z | illuminance_sensor | KEEP (attested) | kb:deconz |
| hobeian | ts0222 | illuminance_sensor | KEEP (collateral) | collateral: 4 unverified mfrs on driver could use this pid, and mfr has attested pids here (TS0225,ZG-106Z,ts0225) |
| hobeian | Ts0222 | illuminance_sensor | KEEP (collateral) | collateral: 4 unverified mfrs on driver could use this pid, and mfr has attested pids here (TS0225,ZG-106Z,ts0225) |
| hobeian | zg-106z | illuminance_sensor | KEEP (attested) | kb:deconz |
| _TZB210_rkgngb5o | TS0601_led | led_controller_dimmable | KEEP (collateral) | collateral: 16 unverified mfrs on driver could use this pid, and mfr has attested pids here (TS0501B) |
| _TZB210_rkgngb5o | TRI-C1ZR | led_controller_dimmable | KEEP (collateral) | collateral: 16 unverified mfrs on driver could use this pid, and mfr has attested pids here (TS0501B) |
| _TZB210_rkgngb5o | TRI-K1ZR | led_controller_dimmable | KEEP (collateral) | collateral: 16 unverified mfrs on driver could use this pid, and mfr has attested pids here (TS0501B) |
| _tzb210_rkgngb5o | TS0601_led | led_controller_dimmable | KEEP (collateral) | collateral: 16 unverified mfrs on driver could use this pid, and mfr has attested pids here (TS0501B) |
| _tzb210_rkgngb5o | TRI-C1ZR | led_controller_dimmable | KEEP (collateral) | collateral: 16 unverified mfrs on driver could use this pid, and mfr has attested pids here (TS0501B) |
| _tzb210_rkgngb5o | TRI-K1ZR | led_controller_dimmable | KEEP (collateral) | collateral: 16 unverified mfrs on driver could use this pid, and mfr has attested pids here (TS0501B) |
| _TZ3000_9ni6xxld | TS0601 | plug_energy_monitor | KEEP (collateral) | collateral: 76 unverified mfrs on driver could use this pid, and mfr has attested pids here (TS011F) |
| _TZ3000_9ni6xxld | 01MINIZB | plug_energy_monitor | KEEP (collateral) | collateral: 76 unverified mfrs on driver could use this pid, and mfr has attested pids here (TS011F) |
| _TZ3000_9ni6xxld | A11Z | plug_energy_monitor | KEEP (collateral) | collateral: 76 unverified mfrs on driver could use this pid, and mfr has attested pids here (TS011F) |
| _TZ3000_9ni6xxld | A7Z | plug_energy_monitor | KEEP (collateral) | collateral: 76 unverified mfrs on driver could use this pid, and mfr has attested pids here (TS011F) |
| _TZ3000_9ni6xxld | BASICZBR3 | plug_energy_monitor | KEEP (collateral) | collateral: 76 unverified mfrs on driver could use this pid, and mfr has attested pids here (TS011F) |
| _TZ3000_9ni6xxld | CK-BL702-SWP-01(7020) | plug_energy_monitor | KEEP (collateral) | collateral: 76 unverified mfrs on driver could use this pid, and mfr has attested pids here (TS011F) |
| _TZ3000_9ni6xxld | E1603/E1702/E1708 | plug_energy_monitor | KEEP (collateral) | collateral: 76 unverified mfrs on driver could use this pid, and mfr has attested pids here (TS011F) |
| _TZ3000_9ni6xxld | S26R2ZB | plug_energy_monitor | KEEP (collateral) | collateral: 76 unverified mfrs on driver could use this pid, and mfr has attested pids here (TS011F) |
| _tz3000_9ni6xxld | TS0601 | plug_energy_monitor | KEEP (collateral) | collateral: 76 unverified mfrs on driver could use this pid, and mfr has attested pids here (TS011F) |
| _tz3000_9ni6xxld | 01MINIZB | plug_energy_monitor | KEEP (collateral) | collateral: 76 unverified mfrs on driver could use this pid, and mfr has attested pids here (TS011F) |
| _tz3000_9ni6xxld | A11Z | plug_energy_monitor | KEEP (collateral) | collateral: 76 unverified mfrs on driver could use this pid, and mfr has attested pids here (TS011F) |
| _tz3000_9ni6xxld | A7Z | plug_energy_monitor | KEEP (collateral) | collateral: 76 unverified mfrs on driver could use this pid, and mfr has attested pids here (TS011F) |
| _tz3000_9ni6xxld | BASICZBR3 | plug_energy_monitor | KEEP (collateral) | collateral: 76 unverified mfrs on driver could use this pid, and mfr has attested pids here (TS011F) |
| _tz3000_9ni6xxld | CK-BL702-SWP-01(7020) | plug_energy_monitor | KEEP (collateral) | collateral: 76 unverified mfrs on driver could use this pid, and mfr has attested pids here (TS011F) |
| _tz3000_9ni6xxld | E1603/E1702/E1708 | plug_energy_monitor | KEEP (collateral) | collateral: 76 unverified mfrs on driver could use this pid, and mfr has attested pids here (TS011F) |
| _tz3000_9ni6xxld | S26R2ZB | plug_energy_monitor | KEEP (collateral) | collateral: 76 unverified mfrs on driver could use this pid, and mfr has attested pids here (TS011F) |
| ZBEACON | TS0601 | plug_smart | KEEP (collateral) | collateral: 8 unverified mfrs on driver could use this pid, and mfr has attested pids here (TS011F) |
| zbeacon | TS0601 | plug_smart | KEEP (collateral) | collateral: 8 unverified mfrs on driver could use this pid, and mfr has attested pids here (TS011F) |
| HOBEIAN | TS0601 | presence_sensor_radar | KEEP (collateral) | collateral: 427 unverified mfrs on driver could use this pid, and mfr has attested pids here (CK-BL702-MWS-01(7016),TS0225,ZG-204Z) |
| HOBEIAN | ZG-204ZE | presence_sensor_radar | KEEP (collateral) | collateral: 427 unverified mfrs on driver could use this pid, and mfr has attested pids here (CK-BL702-MWS-01(7016),TS0225,ZG-204Z) |
| HOBEIAN | ZG-204ZH | presence_sensor_radar | KEEP (collateral) | collateral: 427 unverified mfrs on driver could use this pid, and mfr has attested pids here (CK-BL702-MWS-01(7016),TS0225,ZG-204Z) |
| HOBEIAN | ZG-204ZK | presence_sensor_radar | KEEP (collateral) | collateral: 427 unverified mfrs on driver could use this pid, and mfr has attested pids here (CK-BL702-MWS-01(7016),TS0225,ZG-204Z) |
| HOBEIAN | ZG-204ZL | presence_sensor_radar | KEEP (attested) | kb:deconz, interviews |
| HOBEIAN | ZG-204ZM | presence_sensor_radar | KEEP (attested) | kb:deconz, kb:zha, interviews |
| HOBEIAN | ZG-204ZV | presence_sensor_radar | KEEP (attested) | kb:deconz, interviews |
| HOBEIAN | ZG-204ZX | presence_sensor_radar | KEEP (collateral) | collateral: 427 unverified mfrs on driver could use this pid, and mfr has attested pids here (CK-BL702-MWS-01(7016),TS0225,ZG-204Z) |
| HOBEIAN | ZG-302ZL | presence_sensor_radar | KEEP (collateral) | collateral: 427 unverified mfrs on driver could use this pid, and mfr has attested pids here (CK-BL702-MWS-01(7016),TS0225,ZG-204Z) |
| HOBEIAN | ZG-302ZM | presence_sensor_radar | KEEP (collateral) | collateral: 427 unverified mfrs on driver could use this pid, and mfr has attested pids here (CK-BL702-MWS-01(7016),TS0225,ZG-204Z) |
| HOBEIAN | ts0601 | presence_sensor_radar | KEEP (collateral) | collateral: 427 unverified mfrs on driver could use this pid, and mfr has attested pids here (CK-BL702-MWS-01(7016),TS0225,ZG-204Z) |
| HOBEIAN | Ts0601 | presence_sensor_radar | KEEP (collateral) | collateral: 427 unverified mfrs on driver could use this pid, and mfr has attested pids here (CK-BL702-MWS-01(7016),TS0225,ZG-204Z) |
| HOBEIAN | zg-204ze | presence_sensor_radar | KEEP (collateral) | collateral: 427 unverified mfrs on driver could use this pid, and mfr has attested pids here (CK-BL702-MWS-01(7016),TS0225,ZG-204Z) |
| HOBEIAN | zg-204zh | presence_sensor_radar | KEEP (collateral) | collateral: 427 unverified mfrs on driver could use this pid, and mfr has attested pids here (CK-BL702-MWS-01(7016),TS0225,ZG-204Z) |
| HOBEIAN | zg-204zk | presence_sensor_radar | KEEP (collateral) | collateral: 427 unverified mfrs on driver could use this pid, and mfr has attested pids here (CK-BL702-MWS-01(7016),TS0225,ZG-204Z) |
| HOBEIAN | zg-204zl | presence_sensor_radar | KEEP (attested) | kb:deconz, interviews |
| HOBEIAN | zg-204zm | presence_sensor_radar | KEEP (attested) | kb:deconz, kb:zha, interviews |
| HOBEIAN | zg-204zv | presence_sensor_radar | KEEP (attested) | kb:deconz, interviews |
| HOBEIAN | zg-204zx | presence_sensor_radar | KEEP (collateral) | collateral: 427 unverified mfrs on driver could use this pid, and mfr has attested pids here (CK-BL702-MWS-01(7016),TS0225,ZG-204Z) |
| HOBEIAN | zg-302zl | presence_sensor_radar | KEEP (collateral) | collateral: 427 unverified mfrs on driver could use this pid, and mfr has attested pids here (CK-BL702-MWS-01(7016),TS0225,ZG-204Z) |
| HOBEIAN | zg-302zm | presence_sensor_radar | KEEP (collateral) | collateral: 427 unverified mfrs on driver could use this pid, and mfr has attested pids here (CK-BL702-MWS-01(7016),TS0225,ZG-204Z) |
| hobeian | TS0601 | presence_sensor_radar | KEEP (collateral) | collateral: 427 unverified mfrs on driver could use this pid, and mfr has attested pids here (CK-BL702-MWS-01(7016),TS0225,ZG-204Z) |
| hobeian | ZG-204ZE | presence_sensor_radar | KEEP (collateral) | collateral: 427 unverified mfrs on driver could use this pid, and mfr has attested pids here (CK-BL702-MWS-01(7016),TS0225,ZG-204Z) |
| hobeian | ZG-204ZH | presence_sensor_radar | KEEP (collateral) | collateral: 427 unverified mfrs on driver could use this pid, and mfr has attested pids here (CK-BL702-MWS-01(7016),TS0225,ZG-204Z) |
| hobeian | ZG-204ZK | presence_sensor_radar | KEEP (collateral) | collateral: 427 unverified mfrs on driver could use this pid, and mfr has attested pids here (CK-BL702-MWS-01(7016),TS0225,ZG-204Z) |
| hobeian | ZG-204ZL | presence_sensor_radar | KEEP (attested) | kb:deconz, interviews |
| hobeian | ZG-204ZM | presence_sensor_radar | KEEP (attested) | kb:deconz, kb:zha, interviews |
| hobeian | ZG-204ZV | presence_sensor_radar | KEEP (attested) | kb:deconz, interviews |
| hobeian | ZG-204ZX | presence_sensor_radar | KEEP (collateral) | collateral: 427 unverified mfrs on driver could use this pid, and mfr has attested pids here (CK-BL702-MWS-01(7016),TS0225,ZG-204Z) |
| hobeian | ZG-302ZL | presence_sensor_radar | KEEP (collateral) | collateral: 427 unverified mfrs on driver could use this pid, and mfr has attested pids here (CK-BL702-MWS-01(7016),TS0225,ZG-204Z) |
| hobeian | ZG-302ZM | presence_sensor_radar | KEEP (collateral) | collateral: 427 unverified mfrs on driver could use this pid, and mfr has attested pids here (CK-BL702-MWS-01(7016),TS0225,ZG-204Z) |
| hobeian | ts0601 | presence_sensor_radar | KEEP (collateral) | collateral: 427 unverified mfrs on driver could use this pid, and mfr has attested pids here (CK-BL702-MWS-01(7016),TS0225,ZG-204Z) |
| hobeian | Ts0601 | presence_sensor_radar | KEEP (collateral) | collateral: 427 unverified mfrs on driver could use this pid, and mfr has attested pids here (CK-BL702-MWS-01(7016),TS0225,ZG-204Z) |
| hobeian | zg-204ze | presence_sensor_radar | KEEP (collateral) | collateral: 427 unverified mfrs on driver could use this pid, and mfr has attested pids here (CK-BL702-MWS-01(7016),TS0225,ZG-204Z) |
| hobeian | zg-204zh | presence_sensor_radar | KEEP (collateral) | collateral: 427 unverified mfrs on driver could use this pid, and mfr has attested pids here (CK-BL702-MWS-01(7016),TS0225,ZG-204Z) |
| hobeian | zg-204zk | presence_sensor_radar | KEEP (collateral) | collateral: 427 unverified mfrs on driver could use this pid, and mfr has attested pids here (CK-BL702-MWS-01(7016),TS0225,ZG-204Z) |
| hobeian | zg-204zl | presence_sensor_radar | KEEP (attested) | kb:deconz, interviews |
| hobeian | zg-204zm | presence_sensor_radar | KEEP (attested) | kb:deconz, kb:zha, interviews |
| hobeian | zg-204zv | presence_sensor_radar | KEEP (attested) | kb:deconz, interviews |
| hobeian | zg-204zx | presence_sensor_radar | KEEP (collateral) | collateral: 427 unverified mfrs on driver could use this pid, and mfr has attested pids here (CK-BL702-MWS-01(7016),TS0225,ZG-204Z) |
| hobeian | zg-302zl | presence_sensor_radar | KEEP (collateral) | collateral: 427 unverified mfrs on driver could use this pid, and mfr has attested pids here (CK-BL702-MWS-01(7016),TS0225,ZG-204Z) |
| hobeian | zg-302zm | presence_sensor_radar | KEEP (collateral) | collateral: 427 unverified mfrs on driver could use this pid, and mfr has attested pids here (CK-BL702-MWS-01(7016),TS0225,ZG-204Z) |
| _TZE284_xpq2rzhq | ZG-204ZE | presence_sensor_radar | KEEP (collateral) | collateral: 427 unverified mfrs on driver could use this pid, and mfr has attested pids here (TS0601,ts0601,Ts0601) |
| _TZE284_xpq2rzhq | ZG-204ZH | presence_sensor_radar | KEEP (collateral) | collateral: 427 unverified mfrs on driver could use this pid, and mfr has attested pids here (TS0601,ts0601,Ts0601) |
| _TZE284_xpq2rzhq | ZG-204ZK | presence_sensor_radar | KEEP (collateral) | collateral: 427 unverified mfrs on driver could use this pid, and mfr has attested pids here (TS0601,ts0601,Ts0601) |
| _TZE284_xpq2rzhq | ZG-204ZL | presence_sensor_radar | KEEP (collateral) | collateral: 427 unverified mfrs on driver could use this pid, and mfr has attested pids here (TS0601,ts0601,Ts0601) |
| _TZE284_xpq2rzhq | ZG-204ZM | presence_sensor_radar | KEEP (collateral) | collateral: 427 unverified mfrs on driver could use this pid, and mfr has attested pids here (TS0601,ts0601,Ts0601) |
| _TZE284_xpq2rzhq | ZG-204ZV | presence_sensor_radar | KEEP (collateral) | collateral: 427 unverified mfrs on driver could use this pid, and mfr has attested pids here (TS0601,ts0601,Ts0601) |
| _TZE284_xpq2rzhq | ZG-204ZX | presence_sensor_radar | KEEP (collateral) | collateral: 427 unverified mfrs on driver could use this pid, and mfr has attested pids here (TS0601,ts0601,Ts0601) |
| _TZE284_xpq2rzhq | ZG-302ZL | presence_sensor_radar | KEEP (collateral) | collateral: 427 unverified mfrs on driver could use this pid, and mfr has attested pids here (TS0601,ts0601,Ts0601) |
| _TZE284_xpq2rzhq | ZG-302ZM | presence_sensor_radar | KEEP (collateral) | collateral: 427 unverified mfrs on driver could use this pid, and mfr has attested pids here (TS0601,ts0601,Ts0601) |
| _TZE284_xpq2rzhq | zg-204ze | presence_sensor_radar | KEEP (collateral) | collateral: 427 unverified mfrs on driver could use this pid, and mfr has attested pids here (TS0601,ts0601,Ts0601) |
| _TZE284_xpq2rzhq | zg-204zh | presence_sensor_radar | KEEP (collateral) | collateral: 427 unverified mfrs on driver could use this pid, and mfr has attested pids here (TS0601,ts0601,Ts0601) |
| _TZE284_xpq2rzhq | zg-204zk | presence_sensor_radar | KEEP (collateral) | collateral: 427 unverified mfrs on driver could use this pid, and mfr has attested pids here (TS0601,ts0601,Ts0601) |
| _TZE284_xpq2rzhq | zg-204zl | presence_sensor_radar | KEEP (collateral) | collateral: 427 unverified mfrs on driver could use this pid, and mfr has attested pids here (TS0601,ts0601,Ts0601) |
| _TZE284_xpq2rzhq | zg-204zm | presence_sensor_radar | KEEP (collateral) | collateral: 427 unverified mfrs on driver could use this pid, and mfr has attested pids here (TS0601,ts0601,Ts0601) |
| _TZE284_xpq2rzhq | zg-204zv | presence_sensor_radar | KEEP (collateral) | collateral: 427 unverified mfrs on driver could use this pid, and mfr has attested pids here (TS0601,ts0601,Ts0601) |
| _TZE284_xpq2rzhq | zg-204zx | presence_sensor_radar | KEEP (collateral) | collateral: 427 unverified mfrs on driver could use this pid, and mfr has attested pids here (TS0601,ts0601,Ts0601) |
| _TZE284_xpq2rzhq | zg-302zl | presence_sensor_radar | KEEP (collateral) | collateral: 427 unverified mfrs on driver could use this pid, and mfr has attested pids here (TS0601,ts0601,Ts0601) |
| _TZE284_xpq2rzhq | zg-302zm | presence_sensor_radar | KEEP (collateral) | collateral: 427 unverified mfrs on driver could use this pid, and mfr has attested pids here (TS0601,ts0601,Ts0601) |
| _tze284_xpq2rzhq | ZG-204ZE | presence_sensor_radar | KEEP (collateral) | collateral: 427 unverified mfrs on driver could use this pid, and mfr has attested pids here (TS0601,ts0601,Ts0601) |
| _tze284_xpq2rzhq | ZG-204ZH | presence_sensor_radar | KEEP (collateral) | collateral: 427 unverified mfrs on driver could use this pid, and mfr has attested pids here (TS0601,ts0601,Ts0601) |
| _tze284_xpq2rzhq | ZG-204ZK | presence_sensor_radar | KEEP (collateral) | collateral: 427 unverified mfrs on driver could use this pid, and mfr has attested pids here (TS0601,ts0601,Ts0601) |
| _tze284_xpq2rzhq | ZG-204ZL | presence_sensor_radar | KEEP (collateral) | collateral: 427 unverified mfrs on driver could use this pid, and mfr has attested pids here (TS0601,ts0601,Ts0601) |
| _tze284_xpq2rzhq | ZG-204ZM | presence_sensor_radar | KEEP (collateral) | collateral: 427 unverified mfrs on driver could use this pid, and mfr has attested pids here (TS0601,ts0601,Ts0601) |
| _tze284_xpq2rzhq | ZG-204ZV | presence_sensor_radar | KEEP (collateral) | collateral: 427 unverified mfrs on driver could use this pid, and mfr has attested pids here (TS0601,ts0601,Ts0601) |
| _tze284_xpq2rzhq | ZG-204ZX | presence_sensor_radar | KEEP (collateral) | collateral: 427 unverified mfrs on driver could use this pid, and mfr has attested pids here (TS0601,ts0601,Ts0601) |
| _tze284_xpq2rzhq | ZG-302ZL | presence_sensor_radar | KEEP (collateral) | collateral: 427 unverified mfrs on driver could use this pid, and mfr has attested pids here (TS0601,ts0601,Ts0601) |
| _tze284_xpq2rzhq | ZG-302ZM | presence_sensor_radar | KEEP (collateral) | collateral: 427 unverified mfrs on driver could use this pid, and mfr has attested pids here (TS0601,ts0601,Ts0601) |
| _tze284_xpq2rzhq | zg-204ze | presence_sensor_radar | KEEP (collateral) | collateral: 427 unverified mfrs on driver could use this pid, and mfr has attested pids here (TS0601,ts0601,Ts0601) |
| _tze284_xpq2rzhq | zg-204zh | presence_sensor_radar | KEEP (collateral) | collateral: 427 unverified mfrs on driver could use this pid, and mfr has attested pids here (TS0601,ts0601,Ts0601) |
| _tze284_xpq2rzhq | zg-204zk | presence_sensor_radar | KEEP (collateral) | collateral: 427 unverified mfrs on driver could use this pid, and mfr has attested pids here (TS0601,ts0601,Ts0601) |
| _tze284_xpq2rzhq | zg-204zl | presence_sensor_radar | KEEP (collateral) | collateral: 427 unverified mfrs on driver could use this pid, and mfr has attested pids here (TS0601,ts0601,Ts0601) |
| _tze284_xpq2rzhq | zg-204zm | presence_sensor_radar | KEEP (collateral) | collateral: 427 unverified mfrs on driver could use this pid, and mfr has attested pids here (TS0601,ts0601,Ts0601) |
| _tze284_xpq2rzhq | zg-204zv | presence_sensor_radar | KEEP (collateral) | collateral: 427 unverified mfrs on driver could use this pid, and mfr has attested pids here (TS0601,ts0601,Ts0601) |
| _tze284_xpq2rzhq | zg-204zx | presence_sensor_radar | KEEP (collateral) | collateral: 427 unverified mfrs on driver could use this pid, and mfr has attested pids here (TS0601,ts0601,Ts0601) |
| _tze284_xpq2rzhq | zg-302zl | presence_sensor_radar | KEEP (collateral) | collateral: 427 unverified mfrs on driver could use this pid, and mfr has attested pids here (TS0601,ts0601,Ts0601) |
| _tze284_xpq2rzhq | zg-302zm | presence_sensor_radar | KEEP (collateral) | collateral: 427 unverified mfrs on driver could use this pid, and mfr has attested pids here (TS0601,ts0601,Ts0601) |
| HOBEIAN | TS0207 | rain_sensor | KEEP (collateral) | collateral: 18 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-223Z,zg-223z) |
| HOBEIAN | TS0207_rain | rain_sensor | KEEP (collateral) | collateral: 18 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-223Z,zg-223z) |
| HOBEIAN | TS0601 | rain_sensor | KEEP (collateral) | collateral: 18 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-223Z,zg-223z) |
| HOBEIAN | ZG-223Z | rain_sensor | KEEP (attested) | kb:deconz, misattribution-registry |
| HOBEIAN | ts0207 | rain_sensor | KEEP (collateral) | collateral: 18 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-223Z,zg-223z) |
| HOBEIAN | Ts0207 | rain_sensor | KEEP (collateral) | collateral: 18 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-223Z,zg-223z) |
| HOBEIAN | ts0207_rain | rain_sensor | KEEP (collateral) | collateral: 18 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-223Z,zg-223z) |
| HOBEIAN | TS0207_RAIN | rain_sensor | KEEP (collateral) | collateral: 18 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-223Z,zg-223z) |
| HOBEIAN | Ts0207_rain | rain_sensor | KEEP (collateral) | collateral: 18 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-223Z,zg-223z) |
| HOBEIAN | zg-223z | rain_sensor | KEEP (attested) | kb:deconz, misattribution-registry |
| hobeian | TS0207 | rain_sensor | KEEP (collateral) | collateral: 18 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-223Z,zg-223z) |
| hobeian | TS0207_rain | rain_sensor | KEEP (collateral) | collateral: 18 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-223Z,zg-223z) |
| hobeian | TS0601 | rain_sensor | KEEP (collateral) | collateral: 18 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-223Z,zg-223z) |
| hobeian | ZG-223Z | rain_sensor | KEEP (attested) | kb:deconz, misattribution-registry |
| hobeian | ts0207 | rain_sensor | KEEP (collateral) | collateral: 18 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-223Z,zg-223z) |
| hobeian | Ts0207 | rain_sensor | KEEP (collateral) | collateral: 18 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-223Z,zg-223z) |
| hobeian | ts0207_rain | rain_sensor | KEEP (collateral) | collateral: 18 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-223Z,zg-223z) |
| hobeian | TS0207_RAIN | rain_sensor | KEEP (collateral) | collateral: 18 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-223Z,zg-223z) |
| hobeian | Ts0207_rain | rain_sensor | KEEP (collateral) | collateral: 18 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-223Z,zg-223z) |
| hobeian | zg-223z | rain_sensor | KEEP (attested) | kb:deconz, misattribution-registry |
| HOBEIAN | TS0044 | scene_switch_4 | KEEP (collateral) | collateral: 21 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-101ZS) |
| HOBEIAN | TS1002 | scene_switch_4 | KEEP (collateral) | collateral: 21 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-101ZS) |
| HOBEIAN | ts0044 | scene_switch_4 | KEEP (collateral) | collateral: 21 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-101ZS) |
| HOBEIAN | Ts0044 | scene_switch_4 | KEEP (collateral) | collateral: 21 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-101ZS) |
| HOBEIAN | ts1002 | scene_switch_4 | KEEP (collateral) | collateral: 21 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-101ZS) |
| HOBEIAN | Ts1002 | scene_switch_4 | KEEP (collateral) | collateral: 21 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-101ZS) |
| HOBEIAN | ZG-101ZS | scene_switch_4 | KEEP (attested) | misattribution-registry |
| hobeian | TS0044 | scene_switch_4 | KEEP (collateral) | collateral: 21 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-101ZS) |
| hobeian | TS1002 | scene_switch_4 | KEEP (collateral) | collateral: 21 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-101ZS) |
| hobeian | ts0044 | scene_switch_4 | KEEP (collateral) | collateral: 21 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-101ZS) |
| hobeian | Ts0044 | scene_switch_4 | KEEP (collateral) | collateral: 21 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-101ZS) |
| hobeian | ts1002 | scene_switch_4 | KEEP (collateral) | collateral: 21 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-101ZS) |
| hobeian | Ts1002 | scene_switch_4 | KEEP (collateral) | collateral: 21 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-101ZS) |
| hobeian | ZG-101ZS | scene_switch_4 | KEEP (attested) | misattribution-registry |
| _TZ3000_cayepv1a | TS0121 | smartPlug_DinRail | KEEP (attested) | johan, kb:johan, docs:docs/reports/MASTER_AUTOMATION_REPORT.json |
| _TZ3000_cayepv1a | TSO121 | smartPlug_DinRail | KEEP (attested) | johan, kb:johan, docs:docs/reports/MASTER_AUTOMATION_REPORT.json |
| _tz3000_cayepv1a | TS0121 | smartPlug_DinRail | KEEP (attested) | johan, kb:johan, docs:docs/reports/MASTER_AUTOMATION_REPORT.json |
| _tz3000_cayepv1a | TSO121 | smartPlug_DinRail | KEEP (attested) | johan, kb:johan, docs:docs/reports/MASTER_AUTOMATION_REPORT.json |
| _TZ3000_yi0n4xfd | TS0121 | smartPlug_DinRail | KEEP (collateral) | collateral: pid attested for another mfr of driver and mfr attested here with TS011F |
| _TZ3000_yi0n4xfd | TSO121 | smartPlug_DinRail | KEEP (collateral) | collateral: pid attested for another mfr of driver and mfr attested here with TS011F |
| _tz3000_yi0n4xfd | TS0121 | smartPlug_DinRail | KEEP (collateral) | collateral: pid attested for another mfr of driver and mfr attested here with TS011F |
| _tz3000_yi0n4xfd | TSO121 | smartPlug_DinRail | KEEP (collateral) | collateral: pid attested for another mfr of driver and mfr attested here with TS011F |
| _TZ3290_ixd9mvv4 | TS0601 | smart_irrigation_valve | KEEP (attested) | docs:docs/reports/MASTER_AUTOMATION_REPORT.json |
| _TZ3290_ixd9mvv4 | TS0202 | smart_irrigation_valve | KEEP (collateral) | collateral: 2 unverified mfrs on driver could use this pid, and mfr has attested pids here (TS0601,TS0049) |
| _tz3290_ixd9mvv4 | TS0601 | smart_irrigation_valve | KEEP (attested) | docs:docs/reports/MASTER_AUTOMATION_REPORT.json |
| _tz3290_ixd9mvv4 | TS0202 | smart_irrigation_valve | KEEP (collateral) | collateral: 2 unverified mfrs on driver could use this pid, and mfr has attested pids here (TS0601,TS0049) |
| _TZE284_6ycgarab | TS0205 | smoke_sensor | KEEP (attested) | docs:docs/reports/MASTER_AUTOMATION_REPORT.json |
| _TZE284_6ycgarab | SMD9300 | smoke_sensor | KEEP (collateral) | collateral: 8 unverified mfrs on driver could use this pid, and mfr has attested pids here (TS0205,TS0601) |
| _tze284_6ycgarab | TS0205 | smoke_sensor | KEEP (attested) | docs:docs/reports/MASTER_AUTOMATION_REPORT.json |
| _tze284_6ycgarab | SMD9300 | smoke_sensor | KEEP (collateral) | collateral: 8 unverified mfrs on driver could use this pid, and mfr has attested pids here (TS0205,TS0601) |
| _TZE200_0zaf1cr8 | TS0205 | smoke_sensor3 | REMOVE | mfr dropped from driver (no pid of this driver is attested for it) |
| _tze200_0zaf1cr8 | TS0205 | smoke_sensor3 | REMOVE | mfr dropped from driver (no pid of this driver is attested for it) |
| _TZE200_yh7aoahi | TS0205 | smoke_sensor3 | KEEP (attested) | docs:docs/progress/JOURNAL.md |
| _tze200_yh7aoahi | TS0205 | smoke_sensor3 | KEEP (attested) | docs:docs/progress/JOURNAL.md |
| _TZE284_0zaf1cr8 | TS0205 | smoke_sensor3 | REMOVE | mfr dropped from driver (no pid of this driver is attested for it) |
| _tze284_0zaf1cr8 | TS0205 | smoke_sensor3 | REMOVE | mfr dropped from driver (no pid of this driver is attested for it) |
| _TZE284_6ycgarab | TS0205 | smoke_sensor3 | KEEP (attested) | docs:docs/reports/MASTER_AUTOMATION_REPORT.json |
| _tze284_6ycgarab | TS0205 | smoke_sensor3 | KEEP (attested) | docs:docs/reports/MASTER_AUTOMATION_REPORT.json |
| _TZE200_vzekyi4c | TS0205 | smoke_sensor3 | KEEP (attested) | docs:docs/progress/JOURNAL.md |
| _tze200_vzekyi4c | TS0205 | smoke_sensor3 | KEEP (attested) | docs:docs/progress/JOURNAL.md |
| HOBEIAN | AY-303Z | soil_sensor | KEEP (collateral) | collateral: 173 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-303Z,zg-303z) |
| HOBEIAN | ay-303z | soil_sensor | KEEP (collateral) | collateral: 173 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-303Z,zg-303z) |
| HOBEIAN | AY-302Z | soil_sensor | KEEP (collateral) | collateral: 173 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-303Z,zg-303z) |
| HOBEIAN | ay-302z | soil_sensor | KEEP (collateral) | collateral: 173 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-303Z,zg-303z) |
| HOBEIAN | TS0601 | soil_sensor | KEEP (collateral) | collateral: 173 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-303Z,zg-303z) |
| HOBEIAN | ZG-303Z | soil_sensor | KEEP (attested) | kb:deconz, misattribution-registry, interviews |
| HOBEIAN | ts0601 | soil_sensor | KEEP (collateral) | collateral: 173 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-303Z,zg-303z) |
| HOBEIAN | zg-303z | soil_sensor | KEEP (attested) | kb:deconz, misattribution-registry, interviews |
| hobeian | AY-303Z | soil_sensor | KEEP (collateral) | collateral: 173 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-303Z,zg-303z) |
| hobeian | ay-303z | soil_sensor | KEEP (collateral) | collateral: 173 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-303Z,zg-303z) |
| hobeian | AY-302Z | soil_sensor | KEEP (collateral) | collateral: 173 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-303Z,zg-303z) |
| hobeian | ay-302z | soil_sensor | KEEP (collateral) | collateral: 173 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-303Z,zg-303z) |
| hobeian | TS0601 | soil_sensor | KEEP (collateral) | collateral: 173 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-303Z,zg-303z) |
| hobeian | ZG-303Z | soil_sensor | KEEP (attested) | kb:deconz, misattribution-registry, interviews |
| hobeian | ts0601 | soil_sensor | KEEP (collateral) | collateral: 173 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-303Z,zg-303z) |
| hobeian | zg-303z | soil_sensor | KEEP (attested) | kb:deconz, misattribution-registry, interviews |
| HOBEIAN | ZG-301Z | switch_1gang | KEEP (attested) | misattribution-registry |
| HOBEIAN | TS0001 | switch_1gang | KEEP (collateral) | collateral: 441 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-301Z,zg-301z) |
| HOBEIAN | TS0003 | switch_1gang | KEEP (collateral) | collateral: 441 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-301Z,zg-301z) |
| HOBEIAN | TS000F | switch_1gang | KEEP (collateral) | collateral: 441 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-301Z,zg-301z) |
| HOBEIAN | TS0011 | switch_1gang | KEEP (collateral) | collateral: 441 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-301Z,zg-301z) |
| HOBEIAN | TS011F | switch_1gang | KEEP (collateral) | collateral: 441 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-301Z,zg-301z) |
| HOBEIAN | TS0601 | switch_1gang | KEEP (collateral) | collateral: 441 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-301Z,zg-301z) |
| HOBEIAN | zg-301z | switch_1gang | KEEP (attested) | misattribution-registry |
| HOBEIAN | ts0001 | switch_1gang | KEEP (collateral) | collateral: 441 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-301Z,zg-301z) |
| HOBEIAN | Ts0001 | switch_1gang | KEEP (collateral) | collateral: 441 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-301Z,zg-301z) |
| HOBEIAN | ts0003 | switch_1gang | KEEP (collateral) | collateral: 441 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-301Z,zg-301z) |
| HOBEIAN | Ts0003 | switch_1gang | KEEP (collateral) | collateral: 441 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-301Z,zg-301z) |
| HOBEIAN | ts000f | switch_1gang | KEEP (collateral) | collateral: 441 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-301Z,zg-301z) |
| HOBEIAN | Ts000f | switch_1gang | KEEP (collateral) | collateral: 441 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-301Z,zg-301z) |
| HOBEIAN | ts0011 | switch_1gang | KEEP (collateral) | collateral: 441 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-301Z,zg-301z) |
| HOBEIAN | Ts0011 | switch_1gang | KEEP (collateral) | collateral: 441 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-301Z,zg-301z) |
| HOBEIAN | ts011f | switch_1gang | KEEP (collateral) | collateral: 441 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-301Z,zg-301z) |
| HOBEIAN | Ts011f | switch_1gang | KEEP (collateral) | collateral: 441 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-301Z,zg-301z) |
| hobeian | ZG-301Z | switch_1gang | KEEP (attested) | misattribution-registry |
| hobeian | TS0001 | switch_1gang | KEEP (collateral) | collateral: 441 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-301Z,zg-301z) |
| hobeian | TS0003 | switch_1gang | KEEP (collateral) | collateral: 441 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-301Z,zg-301z) |
| hobeian | TS000F | switch_1gang | KEEP (collateral) | collateral: 441 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-301Z,zg-301z) |
| hobeian | TS0011 | switch_1gang | KEEP (collateral) | collateral: 441 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-301Z,zg-301z) |
| hobeian | TS011F | switch_1gang | KEEP (collateral) | collateral: 441 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-301Z,zg-301z) |
| hobeian | TS0601 | switch_1gang | KEEP (collateral) | collateral: 441 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-301Z,zg-301z) |
| hobeian | zg-301z | switch_1gang | KEEP (attested) | misattribution-registry |
| hobeian | ts0001 | switch_1gang | KEEP (collateral) | collateral: 441 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-301Z,zg-301z) |
| hobeian | Ts0001 | switch_1gang | KEEP (collateral) | collateral: 441 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-301Z,zg-301z) |
| hobeian | ts0003 | switch_1gang | KEEP (collateral) | collateral: 441 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-301Z,zg-301z) |
| hobeian | Ts0003 | switch_1gang | KEEP (collateral) | collateral: 441 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-301Z,zg-301z) |
| hobeian | ts000f | switch_1gang | KEEP (collateral) | collateral: 441 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-301Z,zg-301z) |
| hobeian | Ts000f | switch_1gang | KEEP (collateral) | collateral: 441 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-301Z,zg-301z) |
| hobeian | ts0011 | switch_1gang | KEEP (collateral) | collateral: 441 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-301Z,zg-301z) |
| hobeian | Ts0011 | switch_1gang | KEEP (collateral) | collateral: 441 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-301Z,zg-301z) |
| hobeian | ts011f | switch_1gang | KEEP (collateral) | collateral: 441 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-301Z,zg-301z) |
| hobeian | Ts011f | switch_1gang | KEEP (collateral) | collateral: 441 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-301Z,zg-301z) |
| _TZ3000_skueekg3 | TS0003 | switch_1gang | KEEP (collateral) | collateral: 441 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-301Z,01MINIZB,BASICZBR3) |
| _TZ3000_skueekg3 | TS0011 | switch_1gang | KEEP (attested) | docs:docs/reports/ZERO_DEFECT_AUDIT.json |
| _TZ3000_skueekg3 | TS011F | switch_1gang | KEEP (attested) | docs:docs/reports/ZERO_DEFECT_AUDIT.json |
| _TZ3000_skueekg3 | ts0003 | switch_1gang | KEEP (collateral) | collateral: 441 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-301Z,01MINIZB,BASICZBR3) |
| _TZ3000_skueekg3 | Ts0003 | switch_1gang | KEEP (collateral) | collateral: 441 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-301Z,01MINIZB,BASICZBR3) |
| _TZ3000_skueekg3 | ts0011 | switch_1gang | KEEP (attested) | docs:docs/reports/ZERO_DEFECT_AUDIT.json |
| _TZ3000_skueekg3 | Ts0011 | switch_1gang | KEEP (attested) | docs:docs/reports/ZERO_DEFECT_AUDIT.json |
| _TZ3000_skueekg3 | ts011f | switch_1gang | KEEP (attested) | docs:docs/reports/ZERO_DEFECT_AUDIT.json |
| _TZ3000_skueekg3 | Ts011f | switch_1gang | KEEP (attested) | docs:docs/reports/ZERO_DEFECT_AUDIT.json |
| _tz3000_skueekg3 | TS0003 | switch_1gang | KEEP (collateral) | collateral: 441 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-301Z,01MINIZB,BASICZBR3) |
| _tz3000_skueekg3 | TS0011 | switch_1gang | KEEP (attested) | docs:docs/reports/ZERO_DEFECT_AUDIT.json |
| _tz3000_skueekg3 | TS011F | switch_1gang | KEEP (attested) | docs:docs/reports/ZERO_DEFECT_AUDIT.json |
| _tz3000_skueekg3 | ts0003 | switch_1gang | KEEP (collateral) | collateral: 441 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-301Z,01MINIZB,BASICZBR3) |
| _tz3000_skueekg3 | Ts0003 | switch_1gang | KEEP (collateral) | collateral: 441 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-301Z,01MINIZB,BASICZBR3) |
| _tz3000_skueekg3 | ts0011 | switch_1gang | KEEP (attested) | docs:docs/reports/ZERO_DEFECT_AUDIT.json |
| _tz3000_skueekg3 | Ts0011 | switch_1gang | KEEP (attested) | docs:docs/reports/ZERO_DEFECT_AUDIT.json |
| _tz3000_skueekg3 | ts011f | switch_1gang | KEEP (attested) | docs:docs/reports/ZERO_DEFECT_AUDIT.json |
| _tz3000_skueekg3 | Ts011f | switch_1gang | KEEP (attested) | docs:docs/reports/ZERO_DEFECT_AUDIT.json |
| _TZ3000_cayepv1a | TS0601 | switch_2_gang_metering | KEEP (attested) | docs:docs/reports/ZERO_DEFECT_AUDIT.json |
| _TZ3000_cayepv1a | TS004F | switch_2_gang_metering | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _TZ3000_cayepv1a | TS0002 | switch_2_gang_metering | KEEP (attested) | johan, kb:johan |
| _tz3000_cayepv1a | TS0601 | switch_2_gang_metering | KEEP (attested) | docs:docs/reports/ZERO_DEFECT_AUDIT.json |
| _tz3000_cayepv1a | TS004F | switch_2_gang_metering | REMOVE | pid dropped from driver (no mfr of this driver is attested with it, no unverified mfr) |
| _tz3000_cayepv1a | TS0002 | switch_2_gang_metering | KEEP (attested) | johan, kb:johan |
| HOBEIAN | ZG-305Z | switch_2gang | KEEP (attested) | kb:deconz, misattribution-registry |
| HOBEIAN | TS0002 | switch_2gang | KEEP (collateral) | collateral: 53 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-305Z,zg-305z) |
| HOBEIAN | TS0012 | switch_2gang | KEEP (collateral) | collateral: 53 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-305Z,zg-305z) |
| HOBEIAN | TS0601 | switch_2gang | KEEP (collateral) | collateral: 53 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-305Z,zg-305z) |
| HOBEIAN | ZG-301Z-2CH | switch_2gang | KEEP (collateral) | collateral: 53 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-305Z,zg-305z) |
| HOBEIAN | zg-305z | switch_2gang | KEEP (attested) | kb:deconz, misattribution-registry |
| HOBEIAN | ts0002 | switch_2gang | KEEP (collateral) | collateral: 53 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-305Z,zg-305z) |
| HOBEIAN | Ts0002 | switch_2gang | KEEP (collateral) | collateral: 53 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-305Z,zg-305z) |
| HOBEIAN | ts0012 | switch_2gang | KEEP (collateral) | collateral: 53 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-305Z,zg-305z) |
| HOBEIAN | Ts0012 | switch_2gang | KEEP (collateral) | collateral: 53 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-305Z,zg-305z) |
| HOBEIAN | ts0601 | switch_2gang | KEEP (collateral) | collateral: 53 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-305Z,zg-305z) |
| HOBEIAN | Ts0601 | switch_2gang | KEEP (collateral) | collateral: 53 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-305Z,zg-305z) |
| HOBEIAN | zg-301z-2ch | switch_2gang | KEEP (collateral) | collateral: 53 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-305Z,zg-305z) |
| HOBEIAN | TS0003 | switch_2gang | KEEP (collateral) | collateral: 53 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-305Z,zg-305z) |
| HOBEIAN | TS011F | switch_2gang | KEEP (collateral) | collateral: 53 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-305Z,zg-305z) |
| HOBEIAN | TS000F | switch_2gang | KEEP (collateral) | collateral: 53 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-305Z,zg-305z) |
| hobeian | ZG-305Z | switch_2gang | KEEP (attested) | kb:deconz, misattribution-registry |
| hobeian | TS0002 | switch_2gang | KEEP (collateral) | collateral: 53 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-305Z,zg-305z) |
| hobeian | TS0012 | switch_2gang | KEEP (collateral) | collateral: 53 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-305Z,zg-305z) |
| hobeian | TS0601 | switch_2gang | KEEP (collateral) | collateral: 53 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-305Z,zg-305z) |
| hobeian | ZG-301Z-2CH | switch_2gang | KEEP (collateral) | collateral: 53 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-305Z,zg-305z) |
| hobeian | zg-305z | switch_2gang | KEEP (attested) | kb:deconz, misattribution-registry |
| hobeian | ts0002 | switch_2gang | KEEP (collateral) | collateral: 53 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-305Z,zg-305z) |
| hobeian | Ts0002 | switch_2gang | KEEP (collateral) | collateral: 53 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-305Z,zg-305z) |
| hobeian | ts0012 | switch_2gang | KEEP (collateral) | collateral: 53 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-305Z,zg-305z) |
| hobeian | Ts0012 | switch_2gang | KEEP (collateral) | collateral: 53 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-305Z,zg-305z) |
| hobeian | ts0601 | switch_2gang | KEEP (collateral) | collateral: 53 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-305Z,zg-305z) |
| hobeian | Ts0601 | switch_2gang | KEEP (collateral) | collateral: 53 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-305Z,zg-305z) |
| hobeian | zg-301z-2ch | switch_2gang | KEEP (collateral) | collateral: 53 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-305Z,zg-305z) |
| hobeian | TS0003 | switch_2gang | KEEP (collateral) | collateral: 53 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-305Z,zg-305z) |
| hobeian | TS011F | switch_2gang | KEEP (collateral) | collateral: 53 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-305Z,zg-305z) |
| hobeian | TS000F | switch_2gang | KEEP (collateral) | collateral: 53 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-305Z,zg-305z) |
| ZBEACON | TS0001 | switch_zbeacon_ts0001 | KEEP (attested) | interviews |
| zbeacon | TS0001 | switch_zbeacon_ts0001 | KEEP (attested) | interviews |
| ZBEACON | TH01 | temphumidsensor_zcl_th01 | KEEP (attested) | kb:deconz, kb:z2m, kb:zhc |
| zbeacon | TH01 | temphumidsensor_zcl_th01 | KEEP (attested) | kb:deconz, kb:z2m, kb:zhc |
| HOBEIAN | AY02SZ | vibration_sensor | KEEP (collateral) | collateral: 78 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-102ZM,ZG-228Z,zg-102zm) |
| HOBEIAN | TS011F | vibration_sensor | KEEP (collateral) | collateral: 78 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-102ZM,ZG-228Z,zg-102zm) |
| HOBEIAN | TS0209 | vibration_sensor | KEEP (collateral) | collateral: 78 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-102ZM,ZG-228Z,zg-102zm) |
| HOBEIAN | TS0601 | vibration_sensor | KEEP (collateral) | collateral: 78 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-102ZM,ZG-228Z,zg-102zm) |
| HOBEIAN | ZG-102ZM | vibration_sensor | KEEP (attested) | kb:deconz |
| HOBEIAN | ZG-103Z | vibration_sensor | KEEP (collateral) | collateral: 78 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-102ZM,ZG-228Z,zg-102zm) |
| HOBEIAN | ZG-228Z | vibration_sensor | KEEP (attested) | misattribution-registry |
| HOBEIAN | zg-102zm | vibration_sensor | KEEP (attested) | kb:deconz |
| HOBEIAN | zg-103z | vibration_sensor | KEEP (collateral) | collateral: 78 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-102ZM,ZG-228Z,zg-102zm) |
| HOBEIAN | zg-228z | vibration_sensor | KEEP (attested) | misattribution-registry |
| hobeian | AY02SZ | vibration_sensor | KEEP (collateral) | collateral: 78 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-102ZM,ZG-228Z,zg-102zm) |
| hobeian | TS011F | vibration_sensor | KEEP (collateral) | collateral: 78 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-102ZM,ZG-228Z,zg-102zm) |
| hobeian | TS0209 | vibration_sensor | KEEP (collateral) | collateral: 78 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-102ZM,ZG-228Z,zg-102zm) |
| hobeian | TS0601 | vibration_sensor | KEEP (collateral) | collateral: 78 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-102ZM,ZG-228Z,zg-102zm) |
| hobeian | ZG-102ZM | vibration_sensor | KEEP (attested) | kb:deconz |
| hobeian | ZG-103Z | vibration_sensor | KEEP (collateral) | collateral: 78 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-102ZM,ZG-228Z,zg-102zm) |
| hobeian | ZG-228Z | vibration_sensor | KEEP (attested) | misattribution-registry |
| hobeian | zg-102zm | vibration_sensor | KEEP (attested) | kb:deconz |
| hobeian | zg-103z | vibration_sensor | KEEP (collateral) | collateral: 78 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-102ZM,ZG-228Z,zg-102zm) |
| hobeian | zg-228z | vibration_sensor | KEEP (attested) | misattribution-registry |
| HOBEIAN | 3315-S | water_leak_sensor | KEEP (collateral) | collateral: 38 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-222Z,ZG-226Z,zg-222z) |
| HOBEIAN | TS0207 | water_leak_sensor | KEEP (collateral) | collateral: 38 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-222Z,ZG-226Z,zg-222z) |
| HOBEIAN | ZG-222Z | water_leak_sensor | KEEP (attested) | kb:deconz, interviews |
| HOBEIAN | ZG-226Z | water_leak_sensor | KEEP (attested) | misattribution-registry |
| HOBEIAN | 3315-s | water_leak_sensor | KEEP (collateral) | collateral: 38 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-222Z,ZG-226Z,zg-222z) |
| HOBEIAN | ts0207 | water_leak_sensor | KEEP (collateral) | collateral: 38 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-222Z,ZG-226Z,zg-222z) |
| HOBEIAN | Ts0207 | water_leak_sensor | KEEP (collateral) | collateral: 38 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-222Z,ZG-226Z,zg-222z) |
| HOBEIAN | zg-222z | water_leak_sensor | KEEP (attested) | kb:deconz, interviews |
| HOBEIAN | zg-226z | water_leak_sensor | KEEP (attested) | misattribution-registry |
| HOBEIAN | TS0601 | water_leak_sensor | KEEP (collateral) | collateral: 38 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-222Z,ZG-226Z,zg-222z) |
| hobeian | 3315-S | water_leak_sensor | KEEP (collateral) | collateral: 38 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-222Z,ZG-226Z,zg-222z) |
| hobeian | TS0207 | water_leak_sensor | KEEP (collateral) | collateral: 38 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-222Z,ZG-226Z,zg-222z) |
| hobeian | ZG-222Z | water_leak_sensor | KEEP (attested) | kb:deconz, interviews |
| hobeian | ZG-226Z | water_leak_sensor | KEEP (attested) | misattribution-registry |
| hobeian | 3315-s | water_leak_sensor | KEEP (collateral) | collateral: 38 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-222Z,ZG-226Z,zg-222z) |
| hobeian | ts0207 | water_leak_sensor | KEEP (collateral) | collateral: 38 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-222Z,ZG-226Z,zg-222z) |
| hobeian | Ts0207 | water_leak_sensor | KEEP (collateral) | collateral: 38 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-222Z,ZG-226Z,zg-222z) |
| hobeian | zg-222z | water_leak_sensor | KEEP (attested) | kb:deconz, interviews |
| hobeian | zg-226z | water_leak_sensor | KEEP (attested) | misattribution-registry |
| hobeian | TS0601 | water_leak_sensor | KEEP (collateral) | collateral: 38 unverified mfrs on driver could use this pid, and mfr has attested pids here (ZG-222Z,ZG-226Z,zg-222z) |
| _TZ3290_IXD9MVV4 | TS0601_watervalve | water_valve_smart | KEEP (collateral) | collateral: 46 unverified mfrs on driver could use this pid, and mfr has attested pids here (TS0601) |
| _TZ3290_IXD9MVV4 | TS0601 | water_valve_smart | KEEP (attested) | docs:docs/reports/MASTER_AUTOMATION_REPORT.json |
| _TZ3290_IXD9MVV4 | TS0111 | water_valve_smart | KEEP (collateral) | collateral: 46 unverified mfrs on driver could use this pid, and mfr has attested pids here (TS0601) |
| _TZ3290_IXD9MVV4 | TS0001 | water_valve_smart | KEEP (collateral) | collateral: 46 unverified mfrs on driver could use this pid, and mfr has attested pids here (TS0601) |
| _tz3290_ixd9mvv4 | TS0601_watervalve | water_valve_smart | KEEP (collateral) | collateral: 46 unverified mfrs on driver could use this pid, and mfr has attested pids here (TS0601) |
| _tz3290_ixd9mvv4 | TS0601 | water_valve_smart | KEEP (attested) | docs:docs/reports/MASTER_AUTOMATION_REPORT.json |
| _tz3290_ixd9mvv4 | TS0111 | water_valve_smart | KEEP (collateral) | collateral: 46 unverified mfrs on driver could use this pid, and mfr has attested pids here (TS0601) |
| _tz3290_ixd9mvv4 | TS0001 | water_valve_smart | KEEP (collateral) | collateral: 46 unverified mfrs on driver could use this pid, and mfr has attested pids here (TS0601) |
| _TZE284_hodyryli | CK-TLSR8656-SS5-02(7014) | climate_sensor | REMOVE (hodyryli dual fix) | no source for this couple; ZT08 is TS0601 only (Z2M tuya.ts), real couple stays on climate_sensor_zt08 |
| _TZE284_hodyryli | CK-TLSR8656-SS5-01(7014) | climate_sensor | REMOVE (hodyryli dual fix) | no source for this couple; ZT08 is TS0601 only (Z2M tuya.ts), real couple stays on climate_sensor_zt08 |
| _TZE284_hodyryli | ZTH13-3.0 | climate_sensor | REMOVE (hodyryli dual fix) | no source for this couple; ZT08 is TS0601 only (Z2M tuya.ts), real couple stays on climate_sensor_zt08 |
| _TZE284_hodyryli | ZTH11-3.0 | climate_sensor | REMOVE (hodyryli dual fix) | no source for this couple; ZT08 is TS0601 only (Z2M tuya.ts), real couple stays on climate_sensor_zt08 |
| _TZE284_hodyryli | TS0201 | climate_sensor | REMOVE (hodyryli dual fix) | no source for this couple; ZT08 is TS0601 only (Z2M tuya.ts), real couple stays on climate_sensor_zt08 |
| _TZE284_hodyryli | ZG-227Z | climate_sensor | REMOVE (hodyryli dual fix) | no source for this couple; ZT08 is TS0601 only (Z2M tuya.ts), real couple stays on climate_sensor_zt08 |
| _TZE284_hodyryli | ts0201 | climate_sensor | REMOVE (hodyryli dual fix) | no source for this couple; ZT08 is TS0601 only (Z2M tuya.ts), real couple stays on climate_sensor_zt08 |
| _TZE284_hodyryli | Ts0201 | climate_sensor | REMOVE (hodyryli dual fix) | no source for this couple; ZT08 is TS0601 only (Z2M tuya.ts), real couple stays on climate_sensor_zt08 |
| _TZE284_hodyryli | zg-227z | climate_sensor | REMOVE (hodyryli dual fix) | no source for this couple; ZT08 is TS0601 only (Z2M tuya.ts), real couple stays on climate_sensor_zt08 |
| _TZE284_hodyryli | ts0601 | climate_sensor | REMOVE (hodyryli dual fix) | no source for this couple; ZT08 is TS0601 only (Z2M tuya.ts), real couple stays on climate_sensor_zt08 |
| _TZE284_hodyryli | Ts0601 | climate_sensor | REMOVE (hodyryli dual fix) | no source for this couple; ZT08 is TS0601 only (Z2M tuya.ts), real couple stays on climate_sensor_zt08 |
| _TZE284_hodyryli | TS0601 | climate_sensor_zt08 | KEEP (single driver) | Z2M tuya.ts ZT08, Hubitat, #513, misattribution registry |
