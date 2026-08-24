# P2236 — Forum integral silent fixes (2026-08-24)

Forum SHADOW — mfr+pid only; TS004x never switch_*gang; no soft invent; Nous/SoPhos do-not-lock

## Applied couples

| Couple | Driver | Notes |
|--------|--------|-------|
| `_TZ3000_4upl1fcj`+`TS0041` | `button_wireless_1` | SunBeech T156967 — TS0041 wireless remote, NEVER switch_1gang (processor false ROUTED_OK) |
| `_TZ3000_qeuvnohg`+`TS011F` | `din_rail_switch` | T89271 Erwin3/Zdenek — registry+DeviceFingerprintDB din_rail_switch; strip fake TS0042/TS0601 |
| `_TZ3210_amdymr7l`+`TS011F` | `plug_energy_monitor` | T89271 Bram_B — BlitzWolf SHP13 dual-compose; energy only |
| `_TZ3000_amdymr7l`+`TS011F` | `plug_energy_monitor` | Sibling TZ3000 BlitzWolf — TS011F only |
| `_TZ3000_xabckq1v`+`TS004F` | `button_wireless_4` | Steampunk soft TS0001 REJECTED — known couple is TS004F only |
| `_TZ3000_kfu8zapd`+`TS0044,TS004F` | `button_wireless_4` | Primordial T150690 — Moes 4-btn; mfs must list TS0044/TS004F not TS0001 |
| `_TZ3000_zgyzgdua`+`TS0044` | `scene_switch_4` | meter91 #2189 — scene_switch_4 0xFD; never invent TS0601-only |
| `_TZ3000_nkcobies`+`TS011F,TS0121` | `smartplug` | Bo_Kjaergaard soft TS0001 REJECTED — compose plug TS011F/TS0121 |

## Do not lock

- _TZ3000_v5498kdm+TS0001 (SergeP/Antek T99614 — Nous/SoPhos app)
- _TZ3000_xabckq1v+TS0001 softHypothesis
- _TZ3000_nkcobies+TS0001 softHypothesis
- Peter/f647 smartbutton ABSENT couple
- _TZ3000_upgcbody+TS0207 (melectro — wait Z2M)
- _TZ3210_3lbtuxgp+TS0505B (late4marshmellow — wait Z2M)

## User action (no forum reply)

Update Universal Tuya Test + re-pair if driver changed.
