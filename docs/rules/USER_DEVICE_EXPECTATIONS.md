# User Device Expectations (v5.9.23)
**Updated**: 2026-06 (v5.9.23 BSEED group isolation fix for all multi-gang ZCL-only switches)

## v5.9.18: Deep DP Audit — Peter 4x4 Presence Sensor Variants
Sources: Z2M ZG-204ZM/ZV/ZL/ZH/227Z pages, Z2M #21919 #29024 #28529, ZHA #4184 #4452 #4517, Hubitat kkossev, Blakadder, SmartHomeScene, Reddit

| Config | DPs Added | Source |
|--------|-----------|--------|
| ZG_204ZV_MULTISENSOR | DP103 temp_unit, DP104 temp_cal, DP105 hum_cal | Z2M ZG-204ZV page |
| ZG_204ZM_RADAR | DP3 mov_min_dist, DP103 motion_false_det, DP110-113 | Z2M #21919 |
| HOBEIAN_ZG204ZM | DP103 motion_false_det, DP110-113 | Z2M #21919 |

Bugs researched (no code bugs): Z2M #29024 presence-always-true (noIasMotion avoids), _TZE200_kb5noeto stuck (isolated in ZCL_ONLY_RADAR), battery type issue (hardware-only)

## URGENT: 4x4_Pete (5-day deadline)
- **HOBEIAN ZG-204ZM**: HYBRID (0xEF00+IAS+ZCL lux+battery) → HOBEIAN_ZG204ZM config ✅
- **_TZE200_3towulqd TS0601**: ZCL-ONLY (NO 0xEF00!) IAS notEnrolled → 3 bugs fixed v5.8.88
- **Status**: v5.8.88 READY — awaiting publish + diagnostic

## FIXED v5.8.88
| User | Issue | Fix |
|------|-------|-----|
| 4x4_Pete | _setupIASZoneListeners ignoring noIasMotion override | Instance-level _noIasMotionOverride flag |
| 4x4_Pete | ZCL-only _TZE200_3towulqd gets wrong noTemp/noHum | Force noTemp=noHum=true when no 0xEF00 |
| 4x4_Pete | IAS notEnrolled on sleepy battery device | Opportunistic enrollment on wake |
| Lasse_K | Water sensor + contact sensor = unknown | HOBEIAN missing from fingerprints |

## FIXED v5.8.87
| User | Issue | Fix |
|------|-------|-----|
| Hartmut_Dunker | TS0726 virtual button toggles ALL 4 gangs | perEndpointControl + markAppCommandAll |
| DutchDuke | Soil sensor temp ÷10 wrong (_TZE284_oitavov2) | Skip division for raw °C manufacturer |
| 4x4_Pete | noIasMotion skipped IAS for ZCL-only radars | Check _hasTuyaDPCluster before skip |
| GH#127 | _TZE204_e5m9c5hl WZ-M100 not supported | Added to presence_sensor_radar |

## FIXED v5.8.86
| User | Issue | Fix |
|------|-------|-----|
| JJ10 | Radar ghost temp/humidity tiles | ZCL listeners respect noTemp/noHum |
| (crash) | 10 duplicate custom capabilities | Removed from app.json |
| (spam) | TS0044 0x8004 writeAttributes | Skip for non-TS004F |
| GH#126 | Corrupt zutizvykts0203 entries | Removed from contact_sensor |

## FIXED v5.8.27-v5.8.30
| User | Issue | Fix |
|------|-------|-----|
| 4x4_Pete | Battery DP not received | v5.8.30 |
| Karsten_Hille | Temp overwrite | v5.8.29 |
| FinnKje | 5min false motion | v5.8.29 |
| Lasse_K | IAS inactivated | v5.8.28 |
| blutch32 | TS0203 alarm | v5.8.28 |
| Hartmut | TS0726 EP2-4 | v5.8.27 |

## FIXED v5.8.3-v5.8.25
| User | Issue | Fix |
|------|-------|-----|
| Multiple | v5.8.4 RGB crash | v5.8.5 |
| Lasse_K | Unknown sensors | v5.8.21 |
| Hartmut | TS0726 unknown | v5.8.25 |
| FrankP | IR unknown | v5.8.21 |
| Cam | TS0041 presses | v5.8.24 |
| FinnKje | No-motion 20s | v5.8.4 |

## FIXED v5.7.x
| User | Issue | Fix |
|------|-------|-----|
| Peter_vW | ZG-204ZV wrong config | v5.7.34 |
| Freddyboy | TS0044 physical | v5.7.35 |
| blutch32 | _TZE284_81yrt3lo power meter | v5.7.8 |
| Nono-3ric | _TZE284_xnbkhhdr thermostat | v5.7.33 |
| tlink | _TZE204_ztqnh5cg presence | v5.6.0 |
| Patrick_VD | _TZE200_kb5noeto ZCL radar | v5.6.0 |
| Ernst02507 | TS004F ghost triggers GH#113 | v5.6.0 |
| elgato7 | _TZE204_xu4a5rhj curtain GH#122 | v5.5.998 |
| Eftychis | _TZ3000_wkai4ga5 TS004F | v5.5.840 |
| Pieter_P | _TZ3000_l9brjwau TS0002 | v5.5.970 |
| AlbertQ | HOBEIAN ZG-227Z climate | v5.5.695 |

## PENDING
| User | Device | Status |
|------|--------|--------|
| DutchDuke | _TZE284_oitavov2 soil | FIXED v5.8.87 — temp ÷10 + raw °C skip |
| 4x4_Pete | _TZE200_3towulqd ZCL-only PIR | FIXED v5.8.88 — IAS override + enrollment |
| 4x4_Pete | HOBEIAN ZG-204ZM hybrid radar | VERIFIED v5.8.88 — config correct |
| JJ10 | Presence TS0601 | FIXED v5.8.86 |
| Pollepa | Energy Meter TS0601 | ✅ PRESENT in plug_energy_monitor |
| Ricardo_Lenior | Presence 230v wrong caps (p60) | NEEDS FINGERPRINT (diag 77C4CE16 only) |
| Mike_Van_A | ZG-103ZL vibration (p60) | ✅ PRESENT in vibration_sensor |
| Mitch_Vallinga | _TZ3000_5iixzdo7 TS130F (p60) | ✅ PRESENT in curtain_motor |
| LukasT | _TZE284_1wnh8bqp temp/hum (p58) | ✅ PRESENT in climate_sensor (hum÷10) |
| Lasse_K | Water sensor unknown v5.8.65 (p69) | FIXED v5.8.88 — HOBEIAN added to fingerprints |
| Cam | TS0041 _TZ3000_5bpeda8u no presses v5.8.66 (p69) | NEEDS DIAG |
| Freddyboy | TS0044 _TZ3000_zgyzgdua physical no flow v5.8.65 (p69) | NEEDS DIAG |
| Tbao | _TZ3000_bs93npae TS130F wrong caps (p69) | IN CODE, fixed v5.8.41 |
| FrankP | _TZ3290_7v1k4vufotpowp9z TS1201 IR (p69) | IN CODE ✅ |
| GH#123 | 46 new fingerprints community sync | ALL 46 PRESENT ✅ |
| Lasse_K | Contact reversed v5.8.43 (p69) | FIXED v5.9.9 — F1: _iasOriginatedAlarm fix |
| Lasse_K | Water no alarm v5.8.43 (p69) | FIXED v5.8.88 — IAS enrollment improved, needs re-pair |
| blutch32 | _TZ3000_996rpfy6 TS0203 alarm broken (p68) | FIXED v5.8.85 — double-inversion bug |
| Hartmut_Dunker | TS0726 virtual toggles all 4 (p70) | FIXED v5.9.23 — GROUP ISOLATION: remove group memberships + broadcast filter (Z2M #27167, ZHA #2443) |
| DutchDuke | Soil temp ÷10 (1.8 vs 18) (p70) | FIXED v5.8.87 — raw °C skip |
| FinnKje | Presence on/off every minute (p69) | FIXED v5.8.40 — multi-DP frame parser |
| Karsten_Hille | Temp/hum sensor broken (p68) | FIXED v5.8.38 |
| Patrick_Van_Deursen | Device not recognized v5.8.4 (p68) | FIXED v5.8.11 — RGB dep |
| GH#127 Tauno20 | _TZE204_e5m9c5hl WZ-M100 wrong caps | FP COLLISION FIX v5.8.89 — removed from ceiling+mmwave |
| GH#126 azkysmarthome | _TZ3000_zutizvyk TS0203 contact | ✅ PRESENT in contact_sensor |
| GH#124 Lalla80111 | _TZ3000_b4awzgct TS0041 no flow | ACTIVE — re-paired v5.8.77 still broken. E000 on EP1 exists. NEEDS DIAG with button presses |
| GH#98 DVMasters | _TZ3000_famkxci2 TS0043 button no flow | awaiting re-pair+diag |
| GH#110 Pollepa | TS011F metering empty | FIXED v5.8.91 — added rmsVoltage+rmsCurrent reporting + initial reads |
| Tividor (p70) | button_wireless_4 double-press | FIXED v5.9.20 — OnOffBoundCluster bind per EP + cmd 0xFD intercept + v5.9.22 TuyaPressTypeMap safety |
| Piotr_Cetler (p70) | TS0002 2-gang both toggle | DEVICE FIRMWARE — Z2M #14750 confirms dual-toggle is hardware behavior |
| Lasse_K (p70) | Water sensor no alarm (p70) | FIXED v5.9.9 — F4: numeric cluster 0x0500 lookup |
| Cam | _TZ3000_5bpeda8u TS0041 no presses v5.8.66 diag 4b2150c6 | ACTIVE — update v5.9.23 re-pair+diag (v5.9.20 added OnOffBoundCluster bind) |
| JJ10 | Presence v5.8.66 motion 1sec lux broken diag 17c03ea7 | FIXED v5.8.77 motion/lux/distance OK |
| Freddyboy | Moes TS0044 physical no flow v5.8.65 diag 34b9565c | ACTIVE — update v5.9.23 re-pair+diag (v5.9.20 multi-press fix + v5.9.22 safety guard) |

---

## RECURRING USER PROFILES

### 4x4_Pete (URGENT — 5-day deadline from 2026-02-05)
**Devices**: HOBEIAN ZG-204ZM (PIR+24GHz Radar), ZG-204ZL (PIR-only)
**Forum Posts**: #788, #810, #848, #851 + PM thread
**PM Timeline**: Paired 2026-01-28, deadline ~2026-02-10

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| Wrong driver pairing | Duplicate productIds | v5.5.364 |
| Battery spam 100%↔1-2% | Dup DP15 + no throttle | v5.5.983 |
| False temp/humidity | PIR-only showing temp | v5.5.335 |
| ZCL+Tuya hybrid | Not detected | v5.5.512 |
| Battery DP not received | Missing passive listeners | v5.8.30 |

**Sensor Configs**:
- ZG_204ZM_BATTERY: DP1=motion, DP4=battery, DP9=lux, noTemp, noHum
- ZG_204ZL_PIR: DP1=motion, DP4=battery, DP12=lux, noTemp, noHum
- Known fingerprints: `_TZE200_2aaelwxk`, `_TZE204_2aaelwxk`, `_TZE200_kb5noeto`
- ⚠️ `_TZE200_3towulqd` ZCL-only variant: NO 0xEF00, IAS notEnrolled → fixed v5.8.88

### Peter_van_Werkhoven (20+ fixes, v5.5.841-v5.7.45)
**Device**: HOBEIAN ZG-204ZV (5-in-1 Multisensor)
**Status**: STABLE since v5.7.45

| Issue | Fix |
|-------|-----|
| Humidity 9% vs 90% | v5.5.987 multiplier |
| Lux disco lights | v5.5.986 smoothing |
| Missing temp/humidity | v5.5.984 permissive |
| Distance wrong 8 vs 1.5m | v5.5.929 auto-divisor |
| SOS not triggering | v5.5.841 DP17/18 |
| Battery auto-add | v5.5.907 |
| Wrong config DEFAULT | v5.7.34 mfr fallback |

### Lasse_K (8+ fixes, v5.5.645-v5.8.28)
**Devices**: Water leak, Contact, HOBEIAN ZG-222Z, ZG-102Z
**Status**: FIXED v5.8.88 — HOBEIAN added to water_leak_sensor + contact_sensor fingerprints

| Issue | Fix |
|-------|-----|
| Water always on/off | v5.5.713 invert |
| Contact reversed | v5.5.918 auto-invert |
| IAS no alarm | v5.5.645 parsing |
| User override | v5.5.973 XOR |
| Water inactivated | v5.8.28 IAS enroll |

### Hartmut_Dunker (BSEED 4-gang, v5.5.718-v5.8.87)
**Device**: `_TZ3002_pzao9ls1` TS0726
**Status**: FIXED v5.8.87 — virtual button no longer toggles all gangs

| Issue | Fix |
|-------|-----|
| Bidirectional broken | v5.5.718 bindings |
| Unknown device (case) | v5.8.21+v5.8.25 |
| EP2/3/4 not responding | v5.8.27 DP fallback |
| Virtual button toggles ALL 4 gangs | v5.8.87 perEndpointControl + markAppCommandAll |

### Freddyboy (Moes 4-button)
**Device**: `_TZ3000_zgyzgdua` TS0044
**Status**: STILL BROKEN v5.8.65 — physical keys no flow triggers, NEEDS DIAG

| Issue | Fix |
|-------|-----|
| Physical buttons | v5.5.714 E000 |
| Still broken | v5.7.35 universal |
| Ghost presses | v5.7.48 dedup |
| Cluster registration | v5.8.15+v5.8.24 |

### Karsten_Hille (Climate Sensor)
**Issue**: Temp/Hum broken by v5.8.x — permissive mode overwriting correct values
**Fix**: v5.8.29 — skip inference if device already has mapped DPs
**Status**: FIXED

### FinnKje (Presence Sensor)
**Issues**: (1) No-motion every 20-30s (2) False 5min triggers
**Fix**: (1) v5.8.4 holdoff timer (2) v5.8.29 null inversion
**Status**: FIXED

### Eftychis_Georgilas (4-gang scene switches, p38-52)
**Devices**: `_TZ3000_wkai4ga5` + `_TZ3000_5tqxpine` TS004F
**Issues**: Physical buttons broken, curtain robot, luminance only on motion
**Fix**: v5.5.840 fingerprints added
**Status**: FIXED

### Pieter_Pessers (BSEED switches, p55-62)
**Devices**: `_TZ3000_l9brjwau` TS0002, `_TZ3000_blhvsaqf` TS0001, `_TZ3000_qkixdnon` TS0003
**Issues**: Unknown Zigbee device, LED control not working
**Fix**: v5.5.913 PR#118 (packetninja), v5.5.970 fingerprints
**Status**: FIXED

### Ronny_M (HOBEIAN button + presence, p45-62)
**Devices**: HOBEIAN ZG-101ZL, `_TZE284_iadro9bf` presence
**Issues**: Button not working, 10min ghost triggers, no flows
**Fix**: v5.5.715 onOff binding, v5.5.926 button detection
**Status**: FIXED

### blutch32 (Multi-device, p65-68)
**Devices**: `_TZ3000_996rpfy6` TS0203 contact, `_TZE284_81yrt3lo` PJ-1203A power meter, ZG-303Z soil
**Issues**: Contact alarm not working, power meter crash, soil sensor confusion
**Fix**: v5.7.8 power meter, v5.8.22+v5.8.28 IAS contact
**Status**: FIXED (contact + power), soil = ZG-303Z correctly in soil_sensor

### Cam (Smart button, p45-69)
**Devices**: `_TZ3000_5bpeda8u` TS0041
**Issues**: No GUI button, no flows, no battery, not registering presses
**Fix**: v5.8.24 TuyaE000 + v5.8.66 E000 BoundCluster
**Status**: STILL BROKEN v5.8.66 — NEEDS DIAG logs to determine which detection layer fails

### tlink (Presence sensor, p45)
**Device**: `_TZE204_ztqnh5cg` TS0601
**Issue**: Flows don't trigger, presence not detected
**Fix**: v5.6.0 ZCL_ONLY_RADAR config + permissive mode
**Status**: FIXED

### Ricardo_Lenior (Ceiling presence, p60)
**Issue**: 230v sensor showing battery/mmwave options, wrong flow cards
**Status**: NEEDS CONFIG — correct sensor type assignment needed

### Mike_Van_A (Vibration sensor, p60)
**Device**: HOBEIAN ZG-103ZL
**Status**: IN CODE (vibration_sensor driver exists)

### Mitch_Vallinga (Curtain module, p60)
**Device**: `_TZ3000_5iixzdo7` TS130F
**Status**: IN CODE (curtain_motor driver, verified)

### LukasT (Temp/Hum sensor, p58)
**Device**: `_TZE284_1wnh8bqp` TS0601
**Status**: IN CODE (climate_sensor driver, verified)

---

## INTERVIEW DATA CROSS-REFERENCE

**Local files** (docs/data/):
- `DEVICE_INTERVIEWS.json` — 176 interviews, 77 devices (v5.8.30)
- `INTERVIEW_RESEARCH_v5.6.0.md` — 10 deep-dive analyses with Z2M/ZHA research
- `interviews/` — 20 individual JSON interview files

**Key interviews by user**:
| User | Interview IDs | Device |
|------|--------------|--------|
| 4x4_Pete | INT-145 | ZG-204ZM battery radar |
| 4x4_Pete | INT-144 | ZG-204ZL PIR |
| Peter_vW | INT-143, INT-158, INT-160 | ZG-204ZV multisensor |
| Hartmut | INT-146, INT-151 | TS0726 BSEED 4-gang |
| Freddyboy | INT-015, INT-161 | TS0044 MOES 4-button |
| Lasse_K | INT-021, INT-162 | ZG-102Z contact, water |
| blutch32 | INT-159, INT-160 | TS0203 contact, PJ-1203A |
| ManuelKugler | INT-149, INT-164 | ME167 TRV |
| Cam | INT-010, INT-044 | TS0041 button, ZG-204ZL |
| tlink | INT-004, INT-163 | _TZE204_ztqnh5cg presence |
| Ernst02507 | INT-153 | TS004F smart knob |
| Pieter_P | INT-154-156 | BSEED 1/2/3-gang |
| Patrick_VD | INT-148, INT-161, INT-166 | _TZE200_kb5noeto radar |
| Ronny_M | INT-044 | ZG-101ZL, _TZE284_iadro9bf |

**Forum interview posts** (from pages 1-68):
- Page 60: Mitch_Vallinga TS130F, Ricardo_Lenior presence, Hartmut TS0726
- Page 62: Ronny_M ZG-101ZL full interview
- Page 64: Patrick_VD _TZE200_kb5noeto full interview
- Page 65: Peter_vW ZG-204ZV, blutch32 _TZE284_81yrt3lo full interview
- Page 66: blutch32 PJ-1203A full interview

---

## CROSS-REFERENCE VERIFICATION

**Known Inverted Contact Manufacturers** (auto-invert):
```
_TZ3000_26fmupbb, _TZ3000_n2egfsli, _TZ3000_oxslv1c9,
_TZ3000_402jjyro, _TZ3000_2mbfxlzr, _TZ3000_bzxloft2,
_TZ3000_yxqnffam, _TZ3000_996rpfy6
```

**BSEED ZCL-only fingerprints**:
```
_TZ3000_l9brjwau, _TZ3000_blhvsaqf, _TZ3000_ysdv91bk,
_TZ3000_hafsqare, _TZ3000_e98krvvk, _TZ3000_iedbgyxt
```

---

## GITHUB PRs & ISSUES

| # | Author | Description | Status |
|---|--------|-------------|--------|
| JB#1345 | Nono-3ric | _TZE284_xnbkhhdr WT198 thermostat | FIXED v5.8.88 — collision removed from radiator_valve, correct driver=thermostat_tuya_dp |
| #127 | Tauno20 | WZ-M100 radar | FIXED v5.8.87 ✅ |
| #126 | azkysmarthome | TS0203 contact | ✅ PRESENT |
| #124 | Lalla80111 | uppercase TZ | ✅ PRESENT |
| #123 | auto | 46 fingerprints | ✅ ALL PRESENT |
| #122 | elgato7 | Longsam curtain | FIXED v5.8.88 ✅ |
| #121 | DAVID9SE | _TZ3000_an5rjiwd TS0041 btn | FIXED v5.8.88 — wrong driver (was in button_wireless_4/TS0044, moved to button_wireless_1/TS0041) |
| #114 | Lalla80111 | TS0041 button | ✅ PRESENT |
| #113 | Ernst02507 | TS004F knob | ✅ PRESENT |
| #110 | Pollepa | TS011F plug | ✅ PRESENT |
| #98 | DVMasters | TS0043 LoraTap | ✅ PRESENT |
| #97 | NoroddH | TS0225 radar | ✅ PRESENT |
| #120 | packetninja | Physical button flow cards | MERGED |
| #119 | packetninja | HybridSwitchBase refactor | MERGED |
| #118 | packetninja | BSEED switch fingerprints PR | MERGED v5.5.913 |
| #111 | packetninja | Tuya/Bseed dimmer driver | MERGED |

---

## CODE AUDIT (2026-02-06) — COMMIT CROSS-REFERENCE

### Session 1 fixes (settings + enriched mappings):
1. **Settings keys** (11 files): `zb_modelId`→`zb_model_id` fallback in 5 drivers + 6 lib
2. **Duplicate key**: `_TZE200_rhgsbacq` in EnrichedDPMappings — removed HOBEIAN_10G overwrite
3. **Missing profile**: `_TZE284_oitavov2` soil temp ÷100 added to MANUFACTURER_DP_PROFILES

### Session 2 fixes (commit audit — 8022 commits, 200+ changelog entries):
4. **TuyaProfiles.js `_TZE284_oitavov2`**: WRONG DP mappings (had DP1=temp,DP2=soil,DP4=batt) → fixed to DP2=unit,DP3=soil,DP5=temp,DP14=batt_state,DP15=batt%
5. **TuyaProfiles.js `_TZE200_rhgsbacq`**: WRONG DPs (had DP4=battery,DP12=lux) → fixed to DP1=presence,DP101=humidity,DP106=lux,DP111=temp (HOBEIAN 10G ZG-227Z)
6. **TuyaProfiles.js `_TZE200_ztc6ggyl`**: WRONG DPs (had DP4=battery,DP12=lux) → fixed to FP_STYLE (DP2=sensitivity,DP4=distance,DP102=lux)
7. **presence_sensor_radar/device.js**: `_TZE200_rhgsbacq` was in BOTH ZG_204ZV_MULTISENSOR AND HOBEIAN_10G_MULTI — removed from wrong config (ZG-227Z ≠ ZG-204ZV)
8. **`_TZE284_qa4yfxk2`**: Phantom profile in TuyaProfiles.js — no matching driver/fingerprint

### Session 4 enrichments (v5.8.31 — defensive helpers + smart divisors + button fixes):
12. **TuyaZigbeeDevice.js**: Added 6 defensive helper methods: `safeRegisterCapability`, `ensureCapabilityListeners`, `retryIASEnrollment`, `smartDivisorDetect`, `safeAddCapability`, `safeSetCapabilityValue` — prevents crashes from missing capability listeners (FrankP IR remote), stuck IAS enrollment (blutch32/Lasse_K), wrong humidity scaling (Peter_van_Werkhoven)
13. **TuyaEF00Manager.js**: Smart divisor auto-detection for temperature (÷10 vs ÷100 vs raw) and humidity (÷10 vs ÷100 vs raw) based on value ranges — fixes OEM variants using different scales
14. **ButtonDevice.js**: Enhanced E000 cluster detection — tries numeric IDs (57344, 0xE000) + explicit `TuyaE000BoundCluster` binding when cluster not accessible by name — fixes Freddyboy MOES 4-button, Hartmut BSEED, Cam button issues
15. **IASZoneManager.js**: Already robust — 5 retries + exponential backoff + CIE address write + proactive enrollment response + Zigbee startup detection. No changes needed.

### Session 3 fixes (GitHub + forum cross-ref — dlnraja issues + JohanBendz PRs):
9. **`_TZE200_locansqn`**: WRONG DRIVER — was in radiator_valve + radiator_controller, but it's a LCD Temp/Humidity/Clock sensor (SmartThings + JohanBendz PR #1346 pkuijpers). Moved to climate_sensor.
10. **TuyaProfiles.js climate driver**: `climate_monitor_temp_humidity` → `climate_sensor` (driver didn't exist)
11. **TuyaProfiles.js `_TZE284_qa4yfxk2`**: Corrected DPs to standard soil pattern + marked unverified

### GitHub/Forum verifications (all OK):
- **dlnraja #124 (Lalla80111)**: `_TZ3000_fllyghyj`/`_TZ3000_b4awzgct` uppercase — already fixed v5.6.1
- **JohanBendz #1346 (pkuijpers)**: Time sync + `_TZE200_locansqn` — time sync implemented, fingerprint moved
- **JohanBendz #1333 (bmalkow)**: Siren `_TZE200_t1blo2bj` — in siren driver ✅
- **JohanBendz #1332 (NicolasYDDER)**: HOBEIAN ZG-227Z — in presence_sensor_radar ✅
- **JohanBendz #1237 (WJGvdVelden)**: Smoke `_TZE284_gyzlwu5q` — in smoke_detector_advanced ✅
- **JohanBendz #1345 (Nono-3ric)**: AVATTO `_TZE284_xnbkhhdr` — in radiator_valve ✅
- **JohanBendz #1253 (Peter-Celica)**: `_TZE200_pay2byax` + `_TZ3000_mrpevh8p` — both present ✅
- **Forum p68**: Hartmut BSEED `_TZ3002_pzao9ls1` both cases ✅, blutch32 IAS ✅, Cam E000 ✅
- **All 15+ JohanBendz PR fingerprints** verified present in driver.compose.json files
- **JohanBendz #1344 (fjvs1467)**: `_TZ3000_bgsigers` TS0201 — in climate_sensor ✅
- **JohanBendz #1343 (cvh1111)**: `_TZE200_rhgsbacq` 10G — in presence_sensor_radar ✅
- **JohanBendz #1339 (pjmpessers)**: `_TZ3000_blhvsaqf` TS0001 — in switch_1gang ✅
- **JohanBendz #1338 (pjmpessers)**: `_TZ3000_qkixdnon` TS0003 — in switch_3gang ✅
- **JohanBendz #1337 (pjmpessers)**: `_TZ3000_l9brjwau` TS0002 — in switch_2gang ✅
- **JohanBendz #1336 (csmobiel)**: `_TZE284_aa03yzhs` soil — in soil_sensor ✅
- **JohanBendz #1331 (MF-ITuser)**: UFO-R11 `_TZ3290_ot6ewjvmejq5ekhl` TS1201 — in ir_blaster ✅

### Verifications (all OK):
- **Changelog**: No version gaps in v5.6.0+ (complete coverage)
- **Architecture**: 13/13 key components verified (UniversalDP*, SmartBattery/Energy, IASZone, TuyaE000, etc.)
- **Settings keys**: 20 files checked — all use correct fallback pattern
- **IAS enrollment**: water_leak, contact, motion sensors all call `enrollIASZone()`
- **color-space-shim**: Loaded in app.js before zigbeedriver imports
- **TuyaE000Cluster**: Registered in registerClusters.js
- **Interviews**: 0 "investigating" status remaining
- **Namespaces**: 46 drivers, no cross-driver flow card conflicts
- **`_TZE200_ztc6ggyl` multi-driver**: Valid — 30+ different productIds across radar/TRV/thermostat

---

## NOT FIXED (v5.8.46 Analysis)

### Soil Sensor: mcuVersionRequest seq + not responding
- **User**: DutchDuke (`_TZE284_oitavov2`)
- **Root cause**: CR2032 sleepy device, wakes every 30-60min. Active queries fail when asleep.
- **mcuVersionRequest**: cmd 0x10 in TuyaSpecificCluster.js has no seq param (`args: {}`). `UniversalTuyaParser.buildMCUVersionRequest(seq)` exists but unused by cluster method. Similar to mcuSyncTime seq fix (v5.7.47) but lower impact — device doesn't need seq echo for version request.
- **Code status**: CORRECT. All DPs mapped (DP3=moisture, DP5=temp, DP14=batt_state, DP15=batt%). 9 fixes applied (v5.5.155→v5.8.46). Passive reception works.
- **Verdict**: HARDWARE LIMITATION. Users wait 30-60min for first data.

### Motion Sensor / Water Sensors / 8-gang: Boot logs only
- **Motion**: WORKING. Fixes: v5.8.4 holdoff, v5.8.12 random motion, v5.8.29 null inversion. FinnKje FIXED.
- **Water sensors**: WORKING. Fixes: v5.5.713 invert, v5.8.28 IAS enrollment. Lasse_K STABLE.
- **8-gang**: WORKING. Fixes: v5.5.621 DP101/102 mapping, v5.5.962 physical buttons. No active complaints.
- **Verdict**: All three working correctly. Only boot logs in diagnostics — no user-reported issues remain.

---

## VERSION HISTORY (v5.8.x builds)

| Version | Build | Key Fix |
|---------|-------|---------|
| 5.9.9 | — | F1-F5 forum fixes + case-insensitive mfr audit (15 files) |
| 5.8.91 | — | GH#110 ZCL metering fix: rmsVoltage+rmsCurrent configureReporting + initial readAttributes |
| 5.8.90 | — | BSEED FP additions: _TZ3000_qkixdnon→switch_3gang, _TZ3000_blhvsaqf→switch_1gang |
| 5.8.89 | — | GH#127 FP collision fix: _TZE204_e5m9c5hl removed from ceiling+mmwave |
| 5.8.88 | — | Curtain fix + IAS fix + Lasse_K + GH#121 FP fix + JB#1345 collision |
| 5.8.87 | — | TS0726 virtual button fix + Soil sensor temp ÷10 + noIasMotion bug + GH#127 |
| 5.8.86 | — | CRASH FIX (10 dup caps) + BUTTON SPAM + RADAR ghost temp/hum |
| 5.8.31 | — | Defensive helpers + smart divisor + E000 BoundCluster binding |
| 5.8.30 | 1847 | Battery sensor passive DP listeners (4x4_Pete) |
| 5.8.29 | 1846 | Permissive temp overwrite + null presence inversion |
| 5.8.28 | 1843 | IAS Zone enrollment (water/contact/motion) |
| 5.8.27 | — | BSEED TS0726 EP2-4 Tuya DP fallback |
| 5.8.25 | — | color-space-shim fix |
| 5.8.24 | — | TuyaE000 button press detection |
| 5.8.22 | — | IAS Zone binding for TS0203 |
| 5.8.21 | — | Fingerprint uppercase fix (10 drivers) |
| 5.8.15 | — | MOES E000 cluster registration |
| 5.8.12 | — | _TZE204_gkfbdvyx random motion fix |
| 5.8.9 | — | soil_sensor crash + PJ-1203A fallback |
| 5.8.5 | — | Fingerprint case sensitivity restored |
| 5.8.4 | — | Motion holdoff timer + MOES binding |
| 5.8.3 | — | _TZE284_debczeci config + IR fix |

---

## COMMON USER ISSUES

**"Device pairs but shows offline"**: Check mesh, distance, WiFi interference
**"Values wrong/erratic"**: Check scale settings, verify correct driver
**"Battery always null"**: RE-PAIR (bindings at pair time), wait 4h wake
**"Flow cards not working"**: Update app, check driver flow cards, recreate flow
**"Unknown Zigbee device"**: Send diagnostic, check fingerprint case, RE-PAIR
