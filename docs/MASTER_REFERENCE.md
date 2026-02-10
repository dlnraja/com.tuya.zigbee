# MASTER REFERENCE — Universal Tuya Zigbee
**v5.8.88** | **2026-02-09** | com.dlnraja.tuya.zigbee

---

## 1. PROJECT: 111 drivers, 134K mfr IDs, SDK3

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
| Hartmut_D | TS0726 BSEED 4gang | FIXED | 5.8.87 |
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

## 7. PENDING ACTIONS

- Cam TS0041: NEEDS DIAG
- Freddyboy TS0044: NEEDS DIAG
- GH responses: Draft ready, post to GitHub
- Collisions: 2194 remaining (monthly report)

## 8. CROSS-REF RESULTS (2026-02-09)

- GH: 12 issues audited, all fps present, GH#122 FIXED
- Forum: 15 users, 13 FIXED, 2 NEEDS DIAG
- Interviews: 12 files matched to drivers
- Email: Outlook cloud-only, user must paste
- Stale docs updated: PROJECT_STATUS, GITHUB_ISSUES_PR, FORUM_ISSUES
