# Couple profile — `_TZE204_clrdrnya+TS0601`

- Driver: **presence_sensor_radar**
- Retail / Z2M: **MTG075-ZB-RL** family + whiteLabel **MTG235-ZB-RL** (24G Wenzhi / WZ-235)
- Case: presence-radar-clrdrnya / vichy-clrdrnya-presence
- Sources: Z2M device page MTG075-ZB-RL; Z2M#18677; Z2M#24831; discussion#25712; SmartHomeScene review; VicHY #2222–#2247

## Sacred couple
`manufacturerName=_TZE204_clrdrnya` (+ TZE200/TZE284 siblings) + `productId=TS0601` → `presence_sensor_radar` only. Never curtain/climate/PIR.

## DPs (Z2M herdsman)

| DP | Name | Notes |
|---:|---|---|
| 1 | presence | Binary presence — Homey `alarm_motion`/`alarm_human` |
| 2 | radar_sensitivity | 0–9 |
| 3 | shield_range | Near exclude (m/100) — bathroom walls |
| 4 | detection_range | Far limit (m/100); **24G unstable &lt;~2.5m** |
| 9 | target_distance | Often **quantized** (jumps 0↔~2.8m, Z2M#18677) |
| 101 | entry_filter_time | First-detect debounce (s/10) |
| 102 | departure_delay | Clear confirm; **≥15s recommended** |
| 104 | illuminance | Floody with DP9 (VicHY ~196 msg/min) |
| 108 | breaker_status | Relay → Homey `onoff` |
| 112 | block_time | Re-detect delay after clear (s/10); ~10s works well |
| 115 | sensor | `on`/`off`/`occupied`/`unoccupied` — **occupied = permanent presence** |

## Known bugs / Contre quoi (P2579)

1. **sensor=occupied** forces presence forever (Z2M docs) → soft-clear heals DP115→`on`
2. **Sticky DP1** empty bathroom + wall reflection → antiFalsePositive + soft-clear + sticky-ignore
3. **Distance UI `0 [object Object]`** → units must be string `"m"`
4. **Phantom curtain / missing relay** after tip → heal class + `_ensureRelayOnoffCapability`
5. **Lux/distance flood** → floodCalm coalesce (P2389)
6. **Phantom battery on mains** → strip measure_battery (P2472a)
7. **Duplicate onSettings** historically dropped DP sync — merged (P2579)

## Bathroom tuning (VicHY)

Prefer: Sensor mode **On**; Departure delay ≥30s; Block time ~5–10s; Detection range ≥2.5m (24G); raise Shield range to exclude walls; lower Radar/Entry sensitivity if still sticky.
