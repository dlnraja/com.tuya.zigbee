# Forum T140352 VicHY #2252 — OCR + silent treat

**Couple:** `_TZE204_clrdrnya` + `TS0601` → `presence_sensor_radar` (MTG075 bathroom)  
**Post:** [#2252](https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352/2252)  
**Tip reported:** 9.0.1053 (tip-lag vs Software Shield)

## OCR (`ocr/2252-device.png`)

| Tile | OCR value |
|------|-----------|
| Alarma de movimiento | **Sí** (stuck) |
| Luminancia | **10 lx** |
| Presencia humana | **Sí** (stuck) |
| Detection Distance | **`0 [object Object]`** ← units object bug |
| Zone 1/2/3 Presence | `-` (phantom compose caps) |
| Zone 1/2/3 Distance | `-` (phantom) |
| Temperatura | `-` (phantom mains) |
| Battery low (app) | **No** (phantom) |

## Root cause
1. Homey capability `units` stored as object → UI `${value} ${units}` = `0 [object Object]` (P2577 partial; P2599 always-force)
2. Tip update re-injects compose multi-zone + climate/battery tiles; strip raced
3. Sticky presence Sí — soft-clear / Occupied shield (P2577–P2591) needs Repair on tip ≥ shield

## Fix P2599
- Always force distance `units: "m"`
- Sanitize corrupt distance value
- Burst strip zones/temp/battery after tip
- Contre quoi: `test/critical/p2599-…`

## User action (no forum POST)
Update Test **≥9.0.1078** → **Repair** both bathroom radars → wait ~2 min for tile sanitize.

## Dual-app
BOTH · Silent (T157628)
