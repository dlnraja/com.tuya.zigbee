# Forum multi-thread silent sweep — 2026-08-16

Policy: **silent enrich only** (T157628). No forum replies.

## Scope scanned

| Topic | Name | Result |
|-------|------|--------|
| 140352 | Universal Tuya Zigbee (own) | 100 posts, 0 new FP |
| 146735 | Tuya Smart Life (cloud) | cloud/restart workarounds — not Zigbee app code |
| 26439 | Johan Tuya Zigbee | requests already routed in our drivers |
| 89271 | Device request archive | historical; couples present |
| 106779 / 21313 | Tuya Inc / Tuya Cloud | 0 gaps |
| 156053 | Unknown gang switches | 0 gaps |
| 156792 / 149230 | Finger bot / garage | drivers already exist |
| 155212 / 154092 | Zemismart | boiler/energy couples present |
| 156967 / 150690 | Moes | 0 gaps |
| + media deep scan | images/links/alts | 0 missing mfr |

Sacred-couple cross-ref on ~160 recent couples: **0 missing**.

## Code change from this sweep

**Misroute fix (Z2M-confirmed wall switches were in `button_wireless_2`):**

| Couple | Was | Now |
|--------|-----|-----|
| `_TYZB01_6g8b7at8` + TS0012 | button_wireless_2 | **switch_2gang** |
| `_TYZB01_vzrytttn` + TS0012 | button_wireless_2 | **switch_2gang** |
| `_TYZB01_mqel1whf` + TS0013 | button_wireless_2 | **switch_3gang** |
| `_TYZB01_bagt1e4o` + TS0014 | button_wireless_2 | **switch_4gang** |

Scanner enrichment: `forum-silent-multi-scan.js` + `forum-threads-scan.js` now include satellite Tuya/Smart Life/Moes/Zemismart topics by default.

## Already covered (no code)

- PresentSky dimmer `m1cvyneb` → `wall_dimmer_tuya` (re-pair)
- Royce radar `clrdrnya` → settings already in `presence_sensor_radar`
- Royce Avatto dimmer `jtbgusdc` → `dimmer_2_gang_tuya`
- Soil `myd45weu` / `nt4pquef` → `soil_sensor`
- ZT08 `hodyryli` → P140 DP17 on master (await Test >9.0.531)
- Smart Life thread #146735: cloud lag / app restart flows — out of scope for local Zigbee app

## Dual-app

- **master**: this FP reroute + scanner expand (MASTER_ONLY / pairing correctness).
- **stable-v5**: surgical BOTH backlog = P139 `cancel-in-progress:false` + ZT08 DP17 (separate PR if not already soaked).
