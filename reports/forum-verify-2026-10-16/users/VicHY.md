# User impact — VicHY

Generated: 2026-10-16T00:53:40 · silent enrichment only

## Forum posts (actionable)

| Topic | Post | Date | Issues | Couples | Action |
|-------|------|------|--------|---------|--------|
| T140352 | #2255 | 2026-09-21 | presence | — | user-update-repair |
| T140352 | #2254 | 2026-09-21 | presence,no data,lux,curtain,button | — | user-update-repair |
| T140352 | #2252 | 2026-09-18 | presence,lux | — | user-update-repair |
| T140352 | #2250 | 2026-09-18 | presence,curtain,lux | — | user-update-repair |
| T140352 | #2247 | 2026-09-17 | button,presence | — | user-update-repair |
| T140352 | #2246 | 2026-09-17 | presence,curtain | — | user-update-repair |
| T140352 | #2240 | 2026-09-15 | flow,presence | — | user-update-repair |
| T140352 | #2227 | 2026-09-02 | curtain,battery | — | code-fix-stable-candidate |
| T140352 | #2224 | 2026-09-02 | — | _TZE204_CLRDRNYA+TS0601 | user-update-repair |
| T140352 | #2222 | 2026-09-02 | presence,blind | — | user-update-repair |

## Diagnostic lineage

| Log ID | Date | App | Notes |
|--------|------|-----|-------|
| `undefined` | undefined | undefined | undefined |
| `undefined` | undefined | undefined | undefined |

## Impacted devices (cross-source)

| Tile / role | Driver | Device UUID | Couple | Symptoms | Fix shipped | User action |
|-------------|--------|-------------|--------|----------|-------------|-------------|
| Presencia baño principal | presence_sensor_radar | — | _TZE204_clrdrnya+TS0601 | blind/curtain UI after update; stuck presence; Homey flood timeline ~196 msg/min; phantom low battery on mains MTG | P2340 sacred-keep force-inject clrdrnya; P2379/P2386 phantom curtain strip; P2389/P2401 radar flood calm (no Homey alert); P2391 mains battery heal + energy clear | Update Test ≥9.0.802 + restart app; re-pair only if still curtain UI |
| Forum T140352 #2224 | presence_sensor_radar | — | _TZE204_CLRDRNYA+TS0601 |  |  | Update Universal Tuya Test to latest soak build; re-pair only if driver/EP changed |

---
Regenerate: `npm run user:impact -- --user=VicHY`

