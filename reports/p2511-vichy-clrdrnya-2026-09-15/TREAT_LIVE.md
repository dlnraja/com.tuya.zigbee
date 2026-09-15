# P2511 — VicHY clrdrnya residual (blind + sticky presence + phantom battery)

**Classify:** BOTH  
**Couple:** `_TZE204_clrdrnya` + `TS0601` → `presence_sensor_radar` (MTG075 mains)  
**Forum:** T140352 #2222 / #2224 / #2227 / #2232 (SHADOW — no auto reply)  
**Diags:** `4217d5e3` · `0e28d470` · `c5165a37`  
**Interview:** Manufacturer `_TZE204_clrdrnya` · Model `TS0601` · 220V (no battery)

## Symptom map

| User words | Root cause |
|------------|------------|
| “blind / curtain mode” after tip update | DynCap store reinjects `windowcoverings_*` from radar setting DPs (2/3/102) |
| continuous presence/motion | sticky DP1 + distance spam; zero-distance not clearing Homey UI |
| timeline Update → low battery → Zigbee flood → low battery | Homey Energy phantom on mains + firmware DP9/104 flood (~196 msg/min) |
| delete+re-pair works until next update | clears store/DynCap until tip restore race |

## Already on tip (≥9.0.889 / prefer ≥9.0.939)

P2379/P2386 DynCap block + curtain strip · P2389 flood calm · P2391/P2472a/P2477 Energy clear · P2490 staleCaps · re-heal through 30min

## P2511 residual (this patch)

1. **MTG075** same sticky Contre quoi as P2509 gkfbdvyx: DP1 `unreliable` + `useInference`, `clearPresenceOnZeroDistance`, `syncPresenceFromDistanceInference`
2. Mains heal also strips **`tuya_battery_low`** (P2506) and refuses add/paint on mains
3. Mirror in `SensorConfigs.js` + `TuyaSensorDatabase.js`
4. Gate: `npm run check:p2511`

## User action (silent — for human paste if asked)

Update Universal Tuya Test **≥9.0.939** (after this ships: next tip). Restart app. Re-pair only if tile still shows as curtain/blind. No forum POST from bots.
