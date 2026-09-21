# Couple profile — `_TZE204_clrdrnya+TS0601`

- Driver: **presence_sensor_radar**
- Retail / Z2M: **MTG075-ZB-RL** family + whiteLabel **MTG235-ZB-RL** (24G Wenzhi / WZ-235)
- Case: presence-radar-clrdrnya / vichy-clrdrnya-presence
- Sources: Z2M device page MTG075-ZB-RL; Z2M#18677; Z2M#24831; discussion#25712; SmartHomeScene review; VicHY #2222–#2247
- Retail: **MTG075-ZB-RL** / sibling **MTG235-ZB-RL** (mains mmWave + relay)
- Case: presence-radar-clrdrnya
- Sources: registry; Z2M#18677; VicHY bathrooms; auto-seed-p2247

## Known bugs (P2579 / P2584)

- **sensor_mode=`occupied` (DP115)** forces permanent presence — heal to `on` on soft-clear; optional auto-unlock setting.
- **target_distance** often **quantized** (jumps 0↔~2.8 m) — soft-clear when stagnant.
- 24G **detection_range** avoid &lt;2.5 m (unstable / dead radar).
- Departure delay hint ≥15 s; bathroom anti-FP settings.
- Smart presence under Occupied: Homey may drive `alarm_motion` from distance/lux while firmware stays Occupied.

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

## Known bugs / Contre quoi (P2579 / P2587)

**Two separate VicHY problems (do not conflate):**

1. **Homey Rideau/Curtain type flip** (#2242/#2246) — platform cache restores stale `windowcoverings_*` / class. App heal + tip ≥9.0.995; if still Curtain → delete + re-pair as **Presence Sensor Radar**. Not caused by Occupied mode.
2. **Sticky bathroom presence** — lux/distance still move but Homey never edges off. Causes: VMC/fan micro-motion, long Departure delay, firmware Occupied (DP115), wall reflection. Soft-clear + micro-jitter (P2587) + lower sensitivity / delay.

Other Contre quoi:

1. **sensor=occupied** forces presence forever (Z2M docs) → soft-clear heals DP115→`on` (unless smart overlay keeps Occupied)
2. **Sticky DP1** empty bathroom + wall reflection → antiFalsePositive + soft-clear + sticky-ignore
3. **Distance UI `0 [object Object]`** → units must be string `"m"`
4. **Phantom curtain / missing relay** after tip → heal class + `_ensureRelayOnoffCapability`
5. **Lux/distance flood** → floodCalm coalesce (P2389)
6. **Phantom battery on mains** → strip measure_battery (P2472a)
7. **Duplicate onSettings** historically dropped DP sync — merged (P2579)

## Bathroom tuning (VicHY)

Prefer: Sensor mode **On**; Radar sensitivity **2–4** in bathrooms (7–9 = ghost presence); Departure delay test **5–15s** then **15–45s**; Block time ~5–10s; Detection range ≥2.5m (24G) but not so high it sees the hallway through drywall; raise Shield range to exclude walls. Check extract fan / vibrating mount / PVC water pipes. If lux moves but presence never changes → unplug mains 2–3 min (MCU partial freeze) **or** Flow/settings **Clear presence**. **P2589:** app re-pushes sensitivity/delay on announce (MCU amnesia → 0). **P2590 Stabilizer:** anti-spam distance/lux + survival watchdog (departure_delay+5s force clear) + Clear presence + settings restore.
| DP | Name | Type | Direction | Capability |
|---:|---|---|---|
| 1 | presence | — | rx | alarm_motion |
| 2 | radar_sensitivity | — | rx | — |
| 3 | shield_range | — | rx | — |
| 4 | detection_range | — | rx | — |
| 6 | equipment_status | — | rx | — |
| 9 | target_distance | — | rx | measure_distance |
| 101 | entry_filter_time | — | rx | — |
| 102 | departure_delay | — | rx | — |
| 103 | cline | — | rx | — |
| 104 | illuminance | — | rx | measure_luminance |
| 105 | entry_sensitivity | — | rx | — |
| 106 | entry_distance_indentation | — | rx | — |
| 107 | breaker_mode | — | rx | — |
| 108 | breaker_status | — | rx | — |
| 109 | status_indication | — | rx | — |
| 110 | illuminance_threshold | — | rx | — |
| 111 | breaker_polarity | — | rx | — |
| 112 | block_time | — | rx | — |
| 113 | parameter_setting_result | — | rx | — |
| 114 | factory_parameters | — | rx | — |
| 115 | sensor_mode | enum | rx/tx | (occupied = permanent presence) |

---
See `docs/guides/DP_INTERPRETATION.md`
