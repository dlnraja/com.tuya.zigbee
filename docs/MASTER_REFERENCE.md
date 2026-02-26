# MASTER REFERENCE — Universal Tuya Zigbee
**v5.11.25** | **2026-02-26** | com.dlnraja.tuya.zigbee

---

## 1. PROJECT: 138 drivers, 5646 fingerprints, 1725 flow cards, SDK3

## 2. DATA SOURCES

| Source | Path | Items |
|--------|------|-------|
| App code | tuya_repair/ | 1560 |
| Docs | docs/ | 33 MD + 6 dirs |
| Interviews | docs/data/ | 176 + 21 files |
| Desktop interviews | Desktop/interview/ | 12 TXT |
| Reports | docs/reports/ | 26 files |
| Backup | backup tuya/ | 14 dirs |
| Email | Outlook (cloud) | senetmarne@gmail.com |

**Email note**: New Outlook = cloud-only, no local .pst/.eml.
Classic Outlook .ost at AppData/Local/Microsoft/Outlook/ (binary, not readable).

## 3. INTERVIEW FILES (Desktop/interview/)

| # | Mfr | Model | User/Context |
|---|-----|-------|-------------|
| 1 | _TZE284_vvmbj46n | TS0601 | radar |
| 2 | _TZE284_oitavov2 | TS0601 | DutchDuke soil |
| 3 | HOBEIAN | ZG-204ZM | 4x4_Pete |
| 4 | _TZ3000_bczr4e10 | TS0043 | button 3 |
| 5 | _TZ3000_h1ipgkwn | TS0002 | switch 2gang |
| 6 | _TZE284_iadro9bf | TS0601 | Ronny_M radar |
| 7 | HOBEIAN | ZG-204ZM | 4x4_Pete dup |
| 8 | _TZE204_laokfqwu | TS0601 | presence_sensor_radar (WZ-M100) |
| 9 | _TZ3000_bgtzm4ny | TS0044 | button 4 |
| 10 | _TZ3000_0dumfk2z | TS0215A | SOS |
| 11 | _TZE200_3towulqd | TS0601 | ZCL-only |
| 12 | _TZE200_3towulqd | TS0601 | ZCL-only dup |
| 13 | _TZE200_3towulqd | TS0601 | ZCL-only PIR (new 2026-02-09) |

## 4. GITHUB ISSUES (dlnraja — 12 open, 2026-02-09)

| # | User | Device | Status |
|---|------|--------|--------|
| 127 | Tauno20 | WZ-M100 _TZE204_e5m9c5hl | FIXED v5.8.87 |
| 126 | azkysmarthome | TS0203 _TZ3000_zutizvyk | PRESENT |
| 124 | Lalla80111 | uppercase TZ | PRESENT |
| 123 | auto | 46 fingerprints | ALL PRESENT |
| 122 | elgato7 | Longsam _TZE204_xu4a5rhj | FIXED v5.8.88 |
| 121 | DAVID9SE | _TZ3000_an5rjiwd btn | moved v5.8.84 |
| 114 | Lalla80111 | TS0041 _TZ3000_b4awzgct | PRESENT |
| 113 | Ernst02507 | TS004F _TZ3000_gwkzibhs | PRESENT |
| 110 | Pollepa | TS011F _TZ3210_w0qqde0g | PRESENT |
| 98 | DVMasters | TS0043 _TZ3000_famkxci2 | PRESENT |
| 97 | NoroddH | TS0225 _TZ321C_fkzihaxe8 | PRESENT |
| 120 | packetninja | Physical btn PR | MERGED |

## 5. FORUM USERS TRACKING (community.homey.app)

| User | Device(s) | Status | Ver |
|------|-----------|--------|-----|
| 4x4_Pete | HOBEIAN ZG-204ZM/ZL | FIXED | 5.8.88 |
| Peter_vW | HOBEIAN ZG-204ZV | STABLE | 5.7.45 |
| Lasse_K | Water+Contact HOBEIAN | FIXED | 5.8.88 |
| Hartmut_D | TS0726 BSEED 4gang | FIXED | 5.9.23 |
| DutchDuke | soil _TZE284_oitavov2 | FIXED | 5.8.87 |
| JJ10 | Radar ghost tiles | FIXED | 5.8.86 |
| Karsten_H | Climate temp overwrite | FIXED | 5.8.29 |
| FinnKje | Radar false motion | FIXED | 5.8.29 |
| Cam | TS0041 _TZ3000_5bpeda8u | NEEDS DIAG | — |
| Freddyboy | TS0044 _TZ3000_zgyzgdua | NEEDS DIAG | — |
| Tbao | TS130F _TZ3000_bs93npae | FIXED | 5.8.52 |
| Ronny_M | HOBEIAN btn+radar | FIXED | 5.5.926 |
| blutch32 | Contact+Power meter | FIXED | 5.8.28 |
| Eftychis | TS004F scene switches | FIXED | 5.5.840 |
| Pieter_P | BSEED switches | FIXED | 5.5.970 |

## 6. v5.8.88 FIXES

- **GH#122**: HybridCoverBase missing tuyaEF00Manager → direct cluster fallback
- **IAS**: noIasMotion override + enrollment + ZCL-only noTemp/noHum
- **HOBEIAN**: Added to water_leak + contact fingerprints

## 7. PENDING ACTIONS (updated v5.11.25 — forum scan to #1482)

- Cam TS0041: NEEDS DIAG (update v5.11.25 + re-pair + diag)
- Freddyboy TS0044: NEEDS DIAG (update v5.11.25 + re-pair + diag)
- Lasse_K ZG-102Z contact: **PERSISTENT** — still Unknown Zigbee on v5.11.21 (#1463,#1468,#1472,#1476), needs fresh interview
- FrankP IR remote: **NEW BUG** — learning button turns off immediately (diag b6635c8c) #1471
- Peter_Kawa soil sensor: **ENHANCEMENT** — change measure_humidity.soil → measure_moisture (standard cap) #1473
- 7Hills `_TZE200_vvmbj46n` TS0601: **NEW** — full interview + diag 822fcb89 posted #1482
- Ricardo_Lenior: NEEDS FINGERPRINT (diag only)
- Piotr 2-gang `_TZ3000_cauq1okq`: DEVICE FIRMWARE issue (Z2M #14750 confirms dual toggle — unfixable)
- GH#136/#133: 17+13 new community fingerprints — need device interviews (not in Z2M yet)
- GH#135: _TZE200_xlppj4f5 moved to valve_irrigation v5.11.25 — FIXED
- GH#137: _TZ3210_w0qqde0g voltage divisor — FIXED v5.11.25
- GH#128: _TZE204_nklqjk62 garage door — FP already exists
- ManuelKugler _TZE284_aao3yzhs soil: 100% moisture bug — **FIXED** (confirmed #1469)
- Slawek_Pe _TZ3210_xzhnra8x: voltage/power 10x low — **FIXED v5.11.25**
- Forum #1479 Jocke_Wallen: _TZ3000_u3nv1jwk TS0044 — FP exists, likely sleepy-device first-press
- SkiMattie #1475: button can't pair — likely hardware issue

## 8. VERSION HISTORY (v5.9.9 → v5.9.23)

- **v5.9.9**: F1-F5 forum fixes + 15-file case-insensitive audit
- **v5.9.20**: Multi-press fix all button drivers (Tividor #1408) — OnOffBoundCluster bind
- **v5.9.21**: NEW water_valve_garden driver (TS0049 ZCL onOff)
- **v5.9.22**: Button 0-index safety guard (TuyaPressTypeMap) + soil sensor enrichment
- **v5.9.23**: BSEED GROUP TOGGLE FIX — group isolation + broadcast filter for switch_2gang/3gang/4gang (Z2M #27167, ZHA #2443, Hartmut_Dunker diag 945448b9)

## 9. CROSS-REF RESULTS (2026-02-09)

- GH: 12 issues audited, all fps present, GH#122 FIXED
- Forum: 15 users, 13 FIXED, 2 NEEDS DIAG
- Interviews: 12 files matched to drivers
- Email: Outlook cloud-only, user must paste
- Stale docs updated: PROJECT_STATUS, GITHUB_ISSUES_PR, FORUM_ISSUES

## 10. SESSION 2026-02-09b — DEEP TREATMENT

### dlnraja GitHub (12 open, 0 replied)
- ALL 10 unique fingerprints verified in correct drivers
- 2 FIXED (GH#127 v5.8.87, GH#122 v5.8.88)
- 8 PRESENT/SUPPORTED (need update+re-pair)
- 1 AUTO (GH#123 — 46 fps all present)
- 1 MERGED (GH#120 packetninja)
- Full draft replies in GITHUB_RESPONSES_FULL.md
- **BUG FOUND**: GH#121 _TZ3000_an5rjiwd was in wrong driver
  (button_wireless_4/TS0044 instead of button_wireless_1/TS0041)
  → FIXED: moved fingerprint to correct driver

### JohanBendz cross-ref (8 issues checked)
- JB#1345: _TZE284_xnbkhhdr → **BUG: was in BOTH thermostat_tuya_dp AND radiator_valve (collision!)**
  → FIXED v5.8.88: Removed from radiator_valve. Z2M confirms same DPs as _TZE200_viy9ihs7.
  → Avatto WT198 is wall thermostat, NOT TRV. Battery sleepy device.
- JB#1344: _TZ3000_bgsigers → climate_sensor
- JB#1343: _TZE200_rhgsbacq → presence_sensor_radar
- JB#1339: _TZ3000_blhvsaqf → switch_1gang
- JB#1338: _TZ3000_qkixdnon → switch_3gang
- JB#1337: _TZ3000_l9brjwau → switch_2gang
- JB#1336: _TZE284_aa03yzhs → soil_sensor
- JB#1331: _TZ3290_ot6ewjvmejq5ekhl → ir_blaster
- ALL 8 devices FOUND in dlnraja fork

### Gemini Verification: All claims already fixed or hallucinated
### Fix: _TZE284_xnbkhhdr removed from radiator_valve (collision with thermostat_tuya_dp)

### Forum p68-70 Scan (session 2)
- Lasse_K: water IAS→v5.8.88, contact double-invert→v5.8.85
- blutch32: TS0203 double-invert→v5.8.85
- Freddyboy+Cam: PERSISTENT button bugs, need diag v5.8.88
- Ricardo_Lenior: presence wrong caps, NEEDS fingerprint
- FinnKje/Karsten/Patrick/Hartmut/DutchDuke: ALL FIXED
