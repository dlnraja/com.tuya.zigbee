# P167 — Dual-claim absurd triage + phantom energy (2026-08-16)

## Scope

Execute post-prompt pragmatic backlog only (not refused AI packs P159–P166):

1. Dual-claim triage for **button/bulb/sensor nonsense** overlaps
2. Case-by-case battery+power compose cleanup
3. Ledger refuse reports + registry routes

## Dual-claim results

| Before | After |
|--------|-------|
| 60 `_TZ*` family conflicts | **48** |

### Surgical routes (Z2M / Blakadder / Johan)

| Couple | Keep | Strip from |
|--------|------|------------|
| `_TZ3210_vbfp8eyv` + TS011F | `din_rail_switch` | button_wireless_4, vibration_sensor |
| `_TZ3000_qeuvnohg` + TS011F | `din_rail_switch` | button_wireless_2, lcdtemphumidsensor_plug_energy |
| `_TZ3000_ky0fq4ho` / `_TZ3000_8bxrzyxz` + TS011F | `din_rail_switch` | vibration_sensor / presence_sensor_radar |
| `_TZ3000_obacbukl` + TS0503A | `led_strip_rgbw` | button_wireless_2, tunable_bulb_E14 |
| `_TZ3000_vzopcetz` / `_TZ3000_1obwwnmq` + TS011F | `device_plug_energy_monitor` | button_wireless_2, tunable_bulb_E14 |
| `_TZE284/204_mvtclclq` + TS0601 | `usb_outlet_advanced` | button_wireless_4, radiator_valve |
| `_TZ3210_jaap6jeb` | `bulb_rgbw` | contact_sensor, motion_sensor |
| Lidl / Mycket lights on hybrid | `tunable_bulb_E14` / `bulb_rgbw` | `hybrid_light_windowcoverings` (+ `dimmable_recessed_led` for zw7wr5uo) |

## Energy phantoms

| Driver | Action |
|--------|--------|
| `energy_meter_3phase`, `power_meter`, `smart_rcbo`, `device_din_rail` | Strip `energy.batteries` + `measure_battery` (mains) |
| `climate_sensor_energy` | Strip phantom power/voltage/current (climate pids) — keep AAA battery |
| `device_generic_*`, `universal_zigbee` | Left (catch-all) |
| `ultrasonic_heat_meter` | Left (battery heat meters exist) |

`energy-compose-gate`: OK · remaining bat+power informational: **4**

## Explicit non-goals (still refused)

Auto-investigate bots, Master Blueprint `.cursorrules`, AI billing lock, naive memory-check, forum roadmaps — see `reports/P159`…`P166_*.md`.

## Next

- Remaining light dual-claims (strip vs strip / bulb vs strip) — research per couple
- `switch_1gang` vs `switch_4gang` `_tz3000_wkr3jqmr` — gang-count verify
- Stable backport only after Test soak
