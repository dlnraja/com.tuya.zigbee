# Forum L99 fleet — 2026-09-16 (silent)

**SHADOW only** — never Homey forum POST (T157628). Never invent pid.

## Harvest

| Source | Result |
|--------|--------|
| T140352 live | Highest **#2240** · window #2181–#2240 · 58 posts |
| Silent multi-scan | OK (multi-topic) |
| Media deep | 80/topic · rich posts ok · GAP invent `_TZE200_ABC123` ignored |
| PM read-only | OK |
| Actionable + investigate | `reports/forum-verify-2026-09-16/` |
| L99 inbox | priority GH #533 investigate-code-silent |

## Image / link evidence (downloaded under `img/`)

| Post | User | Image verdict |
|------|------|---------------|
| **#2240** | VicHY | Timeline flip-flop Presence↔No presence + motion on/off @ bathroom radar — **root cause** MTG075 `clearPresenceOnZeroDistance` |
| **#2239** | Peter | Slimmeknop battery **51%** — P2488/P2490 tip OK; History tab = Homey Insights lag (soft) |
| #2227 | VicHY | Prior curtain/battery phantom — already P2472a/P2511 |

Diag locks: VicHY `74e5cae7` · Peter `b8b78521`

## Couples → action

| Couple | Driver | Status |
|--------|--------|--------|
| `_TZE204_clrdrnya`+`TS0601` | `presence_sensor_radar` | **P2534** DP1 owns presence (Z2M); no distance=0 clear |
| `_TZ3000_mrpevh8p`+`TS0041` | `button_wireless_1` | Battery OK on tip ≥9.0.923 |
| `_TZE284_m1cvyneb`+`TS0601` | `wall_dimmer_tuya` | #2236 RESOLVED re-add |
| `_TZE200_icka1clh`+`TS0601` | `curtain_motor` | LOCKED P2490 |
| `_TZE284_fodv6bkr`+`TS0601` | `curtain_motor` | LOCKED |
| `_TZ3000_zgyzgdua`+`TS0044` | `scene_switch_4` | LOCKED |
| Stefan `_TZE2841000000_*` | — | **junk — do not lock** |

## Code shipped this pass

- P2534: MTG075/clrdrnya `clearPresenceOnZeroDistance=false` + `syncPresenceFromDistanceInference=false` (configs + SensorConfigs + TuyaSensorDatabase)
- Warm `presence_sensor_radar_*` trigger cards in driver.onInit
- Contre quoi: `test/critical/p2534-*.test.js` · update `p2511`
- gkfbdvyx keeps zero-distance clear (P2509)
- **P2535** all-topics: `_TZB210_rkgngb5o`+`TS0501B` → `bulb_dimmable` (compose was missing; DB already routed). Sibling TS0502B CCT kept. Cartesian invent Bo #652 skipped.

## Dual-app

P2534 + P2535 reliability = **BOTH** → stable-v5 backport.

## User (silent — no forum reply)

VicHY: update Universal Tuya Test tip after publish; leave room empty once then re-enter so presence edges cleanly. Prefer WHEN **Presence detected** (app card) or AND **is present**.
