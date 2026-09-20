# P2619 — com.tuyalocal complementary enrich (2026-09-20)

Source: [Homey Tuya Local](https://homey.app/fr-fr/app/com.tuyalocal/Tuya-Local/) · GitHub [andiwirz/com.tuyalocal](https://github.com/andiwirz/com.tuyalocal) tip **1.0.234** (26 LAN drivers).

## Dual-app
**MASTER_ONLY** (WiFi LAN stack). No Zigbee sacred-couple changes. No degrade of existing wifi_* compose (P2520 append-only).

## Gap map (their drivers → our coverage)

| tuyalocal | master |
|-----------|--------|
| smart_plug, wall_switch, light, fan, humidifier, heater, dehumidifier, pet_feeder, garage_door, curtain_motor, thermostat, doorbell, air_quality, ir_blaster, generic | covered (`wifi_*`) |
| heat_pump, kettle, ev_charger, energy_meter, smoke_detector, weather_station, presence_sensor, fan_light, air_conditioner, level_sensor | **no dedicated driver yet** — DP category hints UNION’d into `WiFiDPRegistry` for `wifi_generic` + category auto-map |
| access_panel | deprecated upstream (cloud-bound) — skipped |

## Shipped complementary (no wipe)

1. **Protocol auto order** — `PAIRING_PROTOCOL_ORDER` = `3.3 → 3.4 → 3.1 → 3.5 → 3.2` (frequency-first). `PROTOCOL_VERSIONS` set unchanged.
2. **Offline grace** — `offline_grace_seconds` (default 60) delays unavailable + disconnect flow after brief TCP drops.
3. **Command gap** — `command_gap_ms` (default 100) paces SETs on 3.4/3.5.
4. **Settings** — append-only on 28 Tuya `wifi_*` composes (skip ewelink/sonoff).
5. **WiFiDPRegistry** — UNION categories `rs`/`rsx`/`bh`/`qccdz`/`zndb`/`dlq`/`hjjcy`/`ywbj`(smoke)/`sj`(water)/…

## Gate
`npm run check:p2619`

## Not copied (intentionally)
SafeTuyAPI fork, full heat_pump DP auto-detect UI from tuyalocal.

## Follow-up shipped (P2621)
Dedicated `wifi_heat_pump` / `wifi_kettle` / `wifi_ev_charger` + App Settings **Fix It** tab (redacted support bundle). See `P2621.md`. Gate: `npm run check:p2621`.
