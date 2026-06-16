# Known Issues Registry

> Last updated: 2026-06-15
> App version: v9.0.33 (master) / v5.5.518 (stable-v5)

This document tracks ALL known issues across both GitHub repositories and their resolution status.

---

## 1. dlnraja/com.tuya.zigbee - Open Issues

### Critical / High Priority

| # | Title | Status | Labels | Fix Version |
|---|-------|--------|--------|-------------|
| [#424](https://github.com/dlnraja/com.tuya.zigbee/issues/424) | Bed sensor `_TZE200_seq9cm6u` pairs as "Unknown Zigbee Device" | OPEN | device-request | Pending |
| [#420](https://github.com/dlnraja/com.tuya.zigbee/issues/420) | `_TZE204_clrdrnya` (Wenzhi MTG235-ZB-RL) pairs but reports no data | OPEN | enhancement, device-request | Pending |
| [#388](https://github.com/dlnraja/com.tuya.zigbee/issues/388) | Rain Sensor TS0207 incorrectly recognized as Water Leak Sensor (`_TZ3210_tgvtvdoc`) | OPEN | bug, new-fingerprint, device-recognition | Pending |
| [#383](https://github.com/dlnraja/com.tuya.zigbee/issues/383) | Bed Sensor issues persist in v8.1.141 (DP1 presence, battery drop, missing settings) | OPEN | bug, bed_sensor | Pending |
| [#380](https://github.com/dlnraja/com.tuya.zigbee/issues/380) | Configuration page still loading endlessly (follow-up to #375) | OPEN | bug, configuration, loading_issue | v8.1.98+ partial |
| [#417](https://github.com/dlnraja/com.tuya.zigbee/issues/417) | Rain sensor `_TZ3210_p68kms0l` - water alarm not working | OPEN | device-request, awaiting-verification | Pending |

### Device Requests (Open)

| # | Title | Device Type |
|---|-------|-------------|
| [#419](https://github.com/dlnraja/com.tuya.zigbee/issues/419) | 122 new fingerprints from community (2026-06) | Auto-sync |
| [#418](https://github.com/dlnraja/com.tuya.zigbee/issues/418) | 130 new fingerprints from community (2026-06) | Auto-sync |

---

## 2. dlnraja/com.tuya.zigbee - Recently Closed Issues (Resolved)

| # | Title | Resolution | Fix Version |
|---|-------|-----------|-------------|
| [#413](https://github.com/dlnraja/com.tuya.zigbee/issues/413) | `_TZ3000_wzmuk9ai` TS011F plug energy bug | DP mapping fix | v9.0.1 |
| [#412](https://github.com/dlnraja/com.tuya.zigbee/issues/412) | `_TZ3000_yj6k7vfo` wireless button - no press detected again | Fingerprint + DP fix | v9.0.1 |
| [#410](https://github.com/dlnraja/com.tuya.zigbee/issues/410) | `_TZ3000_yj6k7vfo` wireless button regression (#334) | Fingerprint fix | v9.0.1 |
| [#406](https://github.com/dlnraja/com.tuya.zigbee/issues/406) | `_TZE200_ka8l86iu` presence sensor radar | DP mapping fix | v9.0.1 |
| [#399](https://github.com/dlnraja/com.tuya.zigbee/issues/399) | `_TZE200_ka8l86iu` presence sensor (follow-up) | DP mapping fix | v9.0.1 |
| [#398](https://github.com/dlnraja/com.tuya.zigbee/issues/398) | Strange readings from soil sensors | DP inference fix | v9.0.1 |
| [#395](https://github.com/dlnraja/com.tuya.zigbee/issues/395) | TS0601 `_TZE200_9xfjixap` radiator valve not working | DP profile B fix | v9.0.1 |
| [#394](https://github.com/dlnraja/com.tuya.zigbee/issues/394) | `_TZE200_u6x1zyv2` TS0601 rain sensor from #370/#373 | DP mapping fix | v9.0.1 |
| [#382](https://github.com/dlnraja/com.tuya.zigbee/issues/382) | `_TZE200_ka8l86iu` presence sensor (initial report) | DP mapping fix | v9.0.1 |
| [#381](https://github.com/dlnraja/com.tuya.zigbee/issues/381) | TS0601 `_TZE200_9xfjixap` radiator valve | DP profile fix | v9.0.1 |
| [#379](https://github.com/dlnraja/com.tuya.zigbee/issues/379) | `_TZE200_9xfjixap` radiator valve still not working | DP profile fix | v9.0.1 |
| [#378](https://github.com/dlnraja/com.tuya.zigbee/issues/378) | Bed sensor issues in v8.1.124 | Partially fixed | v9.0.1 |
| [#376](https://github.com/dlnraja/com.tuya.zigbee/issues/376) | Strange soil sensor readings | DP inference fix | v9.0.1 |
| [#375](https://github.com/dlnraja/com.tuya.zigbee/issues/375) | Device endlessly loading | DataRecoveryManager crash fix | v8.1.98 |
| [#374](https://github.com/dlnraja/com.tuya.zigbee/issues/374) | `_TZE200_ka8l86iu` presence sensor radar | DP mapping fix | v9.0.1 |
| [#373](https://github.com/dlnraja/com.tuya.zigbee/issues/373) | From #370 - rain sensor LUX issue | DP mapping fix | v9.0.1 |
| [#371](https://github.com/dlnraja/com.tuya.zigbee/issues/371) | Bed sensor issues in v8.1.106 | Partially fixed | v9.0.1 |
| [#370](https://github.com/dlnraja/com.tuya.zigbee/issues/370) | `_TZE200_u6x1zyv2` rain sensor | DP mapping fix | v9.0.1 |
| [#367](https://github.com/dlnraja/com.tuya.zigbee/issues/367) | Bed sensor issues in v8.1.92 | Partially fixed | v9.0.1 |
| [#365](https://github.com/dlnraja/com.tuya.zigbee/issues/365) | `_TZE200_9xfjixap` radiator valve temperature display | DP profile fix | v9.0.1 |
| [#363](https://github.com/dlnraja/com.tuya.zigbee/issues/363) | Battery/sensitivity issue (follow-up to #328) | Partially fixed | v9.0.1 |
| [#361](https://github.com/dlnraja/com.tuya.zigbee/issues/361) | Debugging option not loading | Settings fix | v8.1.98+ |
| [#360](https://github.com/dlnraja/com.tuya.zigbee/issues/360) | Bed sensor DP1 issue (follow-up to #328) | Partially fixed | v9.0.1 |
| [#355](https://github.com/dlnraja/com.tuya.zigbee/issues/355) | Bed sensor DP issue (follow-up to #328) | Partially fixed | v9.0.1 |
| [#338](https://github.com/dlnraja/com.tuya.zigbee/issues/338) | App crash on startup (v8.1.6) | Crash fix | v8.1.98 |
| [#337](https://github.com/dlnraja/com.tuya.zigbee/issues/337) | `_TZE200_3towulqd` motion sensor delay issue | DP mapping fix | v9.0.1 |
| [#334](https://github.com/dlnraja/com.tuya.zigbee/issues/334) | `_TZ3000_yj6k7vfo` wireless button - no press detected | Fingerprint fix | v9.0.1 |
| [#332](https://github.com/dlnraja/com.tuya.zigbee/issues/332) | Gate opener TS0603 "Could not get device by ID" | Driver fix | v9.0.1 |
| [#331](https://github.com/dlnraja/com.tuya.zigbee/issues/331) | Settings tab not loading | Critical fix | v8.1.98 |
| [#329](https://github.com/dlnraja/com.tuya.zigbee/issues/329) | CT Clamp Power Meter | New fingerprint added | v9.0.1 |
| [#326](https://github.com/dlnraja/com.tuya.zigbee/issues/326) | `_TZE200_u6x1zyv2` rain sensor | DP mapping fix | v9.0.1 |
| [#325](https://github.com/dlnraja/com.tuya.zigbee/issues/325) | Presence sensor detected as climate sensor | Driver classification fix | v9.0.1 |
| [#323](https://github.com/dlnraja/com.tuya.zigbee/issues/323) | PJ-1203A incorrect measurement values | DP mapping fix | v9.0.1 |
| [#318](https://github.com/dlnraja/com.tuya.zigbee/issues/318) | PJ-1203A incorrect values (follow-up) | DP mapping fix | v9.0.1 |

---

## 3. JohanBendz/com.tuya.zigbee - Open Issues (Selected)

| # | Title | Category |
|---|-------|----------|
| [#1411](https://github.com/JohanBendz/com.tuya.zigbee/issues/1411) | Generic device request (no details) | New Device |
| [#1410](https://github.com/JohanBendz/com.tuya.zigbee/issues/1410) | GIEX 2-Zone Smart Water Valve `_TZE284_8zizsafo` | New Device |
| [#1409](https://github.com/JohanBendz/com.tuya.zigbee/issues/1409) | Tuya Thermostat Radiator `_TZE284_pcdmj88b` | New Device |
| [#1408](https://github.com/JohanBendz/com.tuya.zigbee/issues/1408) | Tuya Power Monitoring Plug `_TZ3210_jlf1nepw` | New Device |
| [#1407](https://github.com/JohanBendz/com.tuya.zigbee/issues/1407) | Tuya Smart Button `_TZ3000_b4awzgct` | New Device |
| [#1405](https://github.com/JohanBendz/com.tuya.zigbee/issues/1405) | Quoya M515EGBZTN roller blind `_TZE200_gubdgai2` | New Device |
| [#1404](https://github.com/JohanBendz/com.tuya.zigbee/issues/1404) | Moes mini 2 gang dimmer ZM-105B-M | New Device |
| [#1403](https://github.com/JohanBendz/com.tuya.zigbee/issues/1403) | Tuya Pressure/Contact Sensor `_TZE200_seq9cm6u` | New Device |
| [#1401](https://github.com/JohanBendz/com.tuya.zigbee/issues/1401) | BSEED 4 Gang switch `_TZ3002_pzao9ls1` TS0726 | New Device |
| [#1398](https://github.com/JohanBendz/com.tuya.zigbee/issues/1398) | 10G Radarsensor 4in1 `_TZE200_rhgsbacq` | New Device |
| [#1397](https://github.com/JohanBendz/com.tuya.zigbee/issues/1397) | Radar sensor mmWave `_TZE284_1youk3hj` | New Device |
| [#1396](https://github.com/JohanBendz/com.tuya.zigbee/issues/1396) | Soil Sensor `_TZE284_0ints6wl` | New Device |
| [#1393](https://github.com/JohanBendz/com.tuya.zigbee/issues/1393) | PJ-1203A Energy Meter `_TZE204_81yrt3lo` | New Device |
| [#1389](https://github.com/JohanBendz/com.tuya.zigbee/issues/1389) | Smart Knob Switch `_TZ3000_qja6nq5z` TS004F | New Device |
| [#1388](https://github.com/JohanBendz/com.tuya.zigbee/issues/1388) | Smart Socket with Energy `_TZ3210_5ct6e7ye` | New Device |
| [#1384](https://github.com/JohanBendz/com.tuya.zigbee/issues/1384) | Insoma `_TZE284_fhvpaltk` | New Device |
| [#1382](https://github.com/JohanBendz/com.tuya.zigbee/issues/1382) | Presence sensor `_TZE200_crq3r3la` | New Device |
| [#1381](https://github.com/JohanBendz/com.tuya.zigbee/issues/1381) | Moes Smart thermostat `_TZE204_xalsoe3m` | New Device |

---

## 4. Cross-Repository Issue Tracking

### Bed Sensor (`_TZE200_seq9cm6u` / `_TZE200_sh11h1f5`)

This device has the most persistent issue chain across versions:

| Issue | Repository | Version | Status |
|-------|-----------|---------|--------|
| #328 | dlnraja | v8.1.x | Original report |
| #355 | dlnraja | v8.1.x | Follow-up "not fixed" |
| #360 | dlnraja | v8.1.x | Follow-up "not fixed" |
| #367 | dlnraja | v8.1.92 | Still broken |
| #371 | dlnraja | v8.1.106 | Still broken |
| #378 | dlnraja | v8.1.124 | Still broken |
| #383 | dlnraja | v8.1.141 | Still broken |
| #424 | dlnraja | v9.0.13 | Pairs as Unknown |
| #1403 | JohanBendz | - | Device request |
| #376 | dlnraja | v9.0.x | (bed sensor variant) |

**Root cause**: The bed sensor sends binary battery values (0/1) instead of percentage, and DP1 presence mapping uses inverted logic (0=occupied). The `_TZE200_seq9cm6u` fingerprint is present in `drivers/bed_sensor/driver.compose.json` but pairing may fail if the device firmware version differs.

### Wireless Button (`_TZ3000_yj6k7vfo`)

| Issue | Repository | Status |
|-------|-----------|--------|
| #334 | dlnraja | Fixed in v9.0.1 |
| #410 | dlnraja | Regression, fixed in v9.0.1 |
| #412 | dlnraja | Same regression, fixed in v9.0.1 |

**Root cause**: The `_TZ3000_yj6k7vfo` fingerprint was added to `button_wireless_1` driver but the PhysicalButtonMixin needed adjustment for this specific variant's TS0041 cluster layout.

### Rain Sensor (`_TZE200_u6x1zyv2`, `_TZ3210_p68kms0l`, `_TZ3210_tgvtvdoc`)

| Issue | Repository | Status |
|-------|-----------|--------|
| #326 | dlnraja | Fixed in v9.0.1 |
| #370 | dlnraja | Fixed in v9.0.1 |
| #373 | dlnraja | Fixed in v9.0.1 |
| #394 | dlnraja | Fixed in v9.0.1 |
| #388 | dlnraja | OPEN - TS0207 misclassified |
| #417 | dlnraja | OPEN - water alarm not working |

**Root cause**: TS0207 rain sensors and TS0601 rain sensors use completely different protocols (IAS Zone vs Tuya DP). The `_TZ3210_tgvtvdoc` device is misclassified because TS0207 is shared between water leak sensors and rain sensors.

### Radiator Valve (`_TZE200_9xfjixap`)

| Issue | Repository | Status |
|-------|-----------|--------|
| #339 | dlnraja | Fixed in v9.0.1 |
| #365 | dlnraja | Fixed in v9.0.1 |
| #379 | dlnraja | Fixed in v9.0.1 |
| #381 | dlnraja | Fixed in v9.0.1 |
| #395 | dlnraja | Fixed in v9.0.1 |

**Root cause**: This device uses ME167/AVATTO DP profile (Profile B) which differs from standard MOES TRV. Required new DP profile detection based on manufacturerName.

### Presence Sensor (`_TZE200_ka8l86iu`)

| Issue | Repository | Status |
|-------|-----------|--------|
| #374 | dlnraja | Fixed in v9.0.1 |
| #382 | dlnraja | Fixed in v9.0.1 |
| #399 | dlnraja | Fixed in v9.0.1 |
| #406 | dlnraja | Fixed in v9.0.1 |

---

## 5. Issue Category Summary

### By Category (Open Issues)

| Category | Count | Severity |
|----------|-------|----------|
| Device Recognition | 3 | High |
| Data Reporting | 2 | High |
| Configuration/Settings | 1 | Medium |
| Auto-sync (fingerprints) | 2 | Low |
| Device Requests (JohanBendz) | ~30 | Low |

### By Fix Status

| Status | Count |
|--------|-------|
| Fixed (v9.0.1) | 28 |
| Fixed (v8.1.98) | 4 |
| Open - High Priority | 5 |
| Open - Medium Priority | 1 |
| Open - Auto-sync | 2 |
| Open - Device Requests | ~30 |

---

*Generated by Claude Code - 15 June 2026*
