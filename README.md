# Tuya Zigbee — Unified Smart Home Engine for Homey

[![Version](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fdlnraja%2Fcom.tuya.zigbee%2Fmaster%2Fapp.json&query=%24.version&label=version&color=blue)](https://homey.app/a/com.dlnraja.tuya.zigbee/)
[![Drivers](https://img.shields.io/badge/drivers-412-brightgreen)](https://homey.app/a/com.dlnraja.tuya.zigbee/)
[![SDK](https://img.shields.io/badge/SDK-3-orange)](https://homey.app/a/com.dlnraja.tuya.zigbee/)
[![Homey Pro](https://img.shields.io/badge/Homey-Pro%202023%2B-blueviolet)](https://homey.app/a/com.dlnraja.tuya.zigbee/)
[![License](https://img.shields.io/badge/license-GPL--3.0-red)](LICENSE)

> **Local-first, cloud-free control for Tuya Zigbee devices on Homey Pro.**

A community-driven app supporting **412 drivers** and **33,235+ device fingerprints** — switches, sensors, lights, thermostats, covers, locks, energy monitors and more.

---

## Install

| Channel | Link |
|---------|------|
| App Store | [homey.app/a/com.dlnraja.tuya.zigbee](https://homey.app/a/com.dlnraja.tuya.zigbee/) |
| Test version | [homey.app/a/com.dlnraja.tuya.zigbee/test](https://homey.app/a/com.dlnraja.tuya.zigbee/test/) |
| GitHub Releases | [Releases](https://github.com/dlnraja/com.tuya.zigbee/releases) |

---

## Supported Devices

<!-- CHANGELOG_START - Auto-updated from .homeychangelog.json -->
### ✨ Recent Changes (May 2026)

| Version | Feature |
|---------|---------|
| **v8.5.39** | v8.5.39: CRITICAL FIX - category must be string not array (Athom server requi... |
| **v8.5.38** | v8.5.38: Fix Processing failed — remove invalid icon field from app.json, use... |
| **vv8_5_30** |  |
| **v8.5.37** | v8.5.36: Critical fix, Root cleanup, New device support, Fingerprint database... |
| **v8.5.36** | v8.5.36: Critical fix for app crash on startup (AggregateError). Restored all... |
| **v8.5.35** | v8.5.34: Critical fix, Fingerprint conflicts, Empty manufacturer names, Drive... |
| **v8.5.34** | v8.5.34: Critical fix restores all 360 Zigbee driver manufacturer names, reso... |
| **v8.5.33** | CRITICAL FIX: Restore all static manufacturerName fingerprints in driver.comp... |
| **v8.5.30** | v8.5.29: Garage Door Opener, 122 new fingerprints, Plug Energy Monitor, Garag... |
| **v8.5.29** | Garage door opener fix: DP3 state now properly applied to Homey. 122 new fing... |
<!-- CHANGELOG_END -->






## Statistics

| Metric | Value |
|--------|-------|
| **App Version** | v8.5.38 |
| **Device Fingerprints** | 33,235+ |
| **Unique Product IDs** | 566 |
| **Drivers** | 412 (362 Zigbee + 50 WiFi) |
| **Flow Cards** | 4,073 |
| **Unique Capabilities** | 155 |
| **SVG Icons** | 705 |
| **Languages** | EN, FR, NL, DE |
| **SDK Version** | 3 |
| **Homey Compatibility** | >=12.2.0 |
| **Last Updated** | 2026-05-28 |

### Top 20 Drivers by Fingerprint Count

| # | Driver | Fingerprints |
|---|--------|-------------|
| 1 | `climate_sensor` | 2,036 |
| 2 | `climate_sensor_gas` | 2,036 |
| 3 | `climate_sensor_plug` | 2,036 |
| 4 | `climate_sensor_smart` | 2,036 |
| 5 | `climate_sensor_switch` | 2,036 |
| 6 | `sensor_climate_lcdtemphumidsensor` | 2,036 |
| 7 | `sensor_climate_presence` | 2,036 |
| 8 | `sensor_climate_smart` | 2,036 |
| 9 | `sensor_climate_temphumidsensor` | 2,036 |
| 10 | `switch_1gang` | 1,233 |
| 11 | `wall_switch_5_gang_tuya` | 1,233 |
| 12 | `bulb_dimmable` | 628 |
| 13 | `presence_sensor_radar` | 502 |
| 14 | `radiator_valve` | 481 |
| 15 | `dimmer_wall_switch` | 380 |
| 16 | `dimmer_wall_water` | 380 |
| 17 | `wall_dimmer_tuya` | 380 |
| 18 | `curtain_motor` | 366 |
| 19 | `generic_tuya` | 357 |
| 20 | `motion_sensor` | 265 |

### Drivers by Device Class

| Class | Count |
|-------|-------|
| sensor | 122 |
| socket | 113 |
| other | 44 |
| light | 42 |
| thermostat | 25 |
| remote | 18 |
| fan | 16 |
| windowcoverings | 9 |
| lock | 5 |
| doorbell | 4 |
| heater | 4 |
| garagedoor | 3 |
| button | 2 |
| curtain | 2 |
| camera | 1 |
| vacuumcleaner | 1 |
| speaker | 1 |
| Category | Examples |
|----------|---------|
| Switches | 1–6 gang wall switches, dimmers, scene switches |
| Sensors | Motion, presence, contact, smoke, water leak, air quality |
| Climate | Thermostats, radiator valves, fans, AC controllers |
| Lighting | Bulbs (RGBW, CCT), LED strips, light panels |
| Covers | Blinds, curtains, shutters, garage doors |
| Plugs | Smart plugs, energy monitors, power strips |
| Security | Door locks, alarms, keypads |

---

## Features

<!-- CHANGELOG_START - Auto-updated from .homeychangelog.json -->

| Version | Changes |
|---------|---------|
| **vv8_5_30** | [object Object] |
| **v8.5.38** | v8.5.38: Fix Processing failed — remove invalid icon field from app.json, use assets/icon.svg as per Athom SDK3 spec ... |
| **v8.5.37** | v8.5.36: Critical fix, Root cleanup, New device support, Fingerprint database, CI |
| **v8.5.36** | v8.5.36: Critical fix for app crash on startup (AggregateError). Restored all 360 Zigbee manufacturer names. New soil... |
| **v8.5.35** | v8.5.34: Critical fix, Fingerprint conflicts, Empty manufacturer names, Driver count, App.json |
| **v8.5.34** | v8.5.34: Critical fix restores all 360 Zigbee driver manufacturer names, resolving the AggregateError crash. 4,361 fi... |
| **v8.5.33** | CRITICAL FIX: Restore all static manufacturerName fingerprints in driver.compose.json (156 drivers fixed). Fix catego... |
| **v8.5.30** | v8.5.29: Garage Door Opener, 122 new fingerprints, Plug Energy Monitor, Garage Door Opener, Updated to **412 drivers*... |
| **v8.5.29** | Garage door opener fix: DP3 state now properly applied to Homey. 122 new fingerprints added from community sync.  total. |
| **v8.5.28** | v8.5.28: . New soil sensor support (_TZE284_0ints6wl). General stability improvements. |
| **v8.5.27** | Removed SmartThings 2 integration. Monthly  adds 413 drivers and 3306 validated fingerprints. Bug fix for AggregateEr... |
| **v8.5.26** | v8.5.26: 122 new fingerprints from community sync. Fixed 2Client crash.  total. |
| **v8.5.24** | v8.5.24: 122 new fingerprints from community sync, crash fix for app initialization, and general stability improvements. |
| **v8.5.22** | v8.5.22: 122 new fingerprints from community sync. New devices: soil sensor (_TZE284_0ints6wl). Bug fixes: auto-off t... |
| **v8.5.21** | v8.5.21: . New soil sensor support (_TZE284_0ints6wl). Fixed 39 broken YAML . |

<!-- CHANGELOG_END -->

---

## Key Features

### Dual Protocol Support
- **Tuya DP Protocol** (Cluster 0xEF00) - For Tuya-specific devices
- **Standard ZCL** - For native Zigbee 3.0 devices
- **Auto-Detection** - Observes device for 15 min, then picks the best protocol

### Smart Battery Management
- 8 battery chemistries supported
- 4 calculation algorithms
- Voltage-based fallback when percentage unavailable

### Energy Monitoring
- Full kWh, W, V, A support
- Configurable ZCL energy divisors
- Auto-removal of unused energy capabilities after 15 min

### Physical Button Detection
- 2000ms timeout-based detection
- Flow triggers for physical button presses per gang
- Deduplication to prevent duplicate triggers

---

## Supported Device Categories

| Category | Examples | Protocol |
|----------|---------|----------|
| **Switches** (1-8 gang) | Wall switches, smart relays, BSEED, Zemismart | ZCL + Tuya DP |
| **Dimmers** | Wall dimmers, LED dimmers, rotary knobs | ZCL + Tuya DP |
| **Lights** | RGB, RGBW, CCT bulbs, LED strips | ZCL |
| **Plugs & Sockets** | Smart plugs, energy monitors, power strips | ZCL + Tuya DP |
| **Sensors** | Temp/humidity, motion, contact, water leak, smoke, air quality | ZCL + Tuya DP |
| **Presence Radars** | mmWave, PIR+radar hybrid, HOBEIAN ZG-204ZM | ZCL + Tuya DP |
| **Thermostats & TRVs** | Radiator valves, floor heating, AVATTO, Moes | Tuya DP |
| **Covers** | Curtain motors, roller blinds, garage doors | Tuya DP + ZCL |
| **Buttons & Remotes** | Scene switches (1-4 button), SOS buttons, rotary | ZCL |
| **Locks** | Smart door locks, fingerprint locks | Tuya DP |
| **Climate** | Air purifiers, fans, IR blasters, humidifiers | Tuya DP |
| **Water** | Valves, tank monitors, garden timers | Tuya DP |
| **WiFi Devices** | Tuya WiFi switches, plugs, sensors (via cloud API) | WiFi/Cloud |

### Supported Brands

> BSEED, Zemismart, Moes, AVATTO, Lonsonho, HOBEIAN, Lidl/Silvercrest, eWeLink/SONOFF, Girier, Benexmart, Owon, and **hundreds more** via Tuya OEM fingerprints.
- **Local-only** — no cloud, no internet required after pairing
- **Dual-layer matching** — static fingerprints + dynamic runtime database
- **Hybrid protocol** — auto-detects Tuya DP or standard Zigbee ZCL
- **Smart battery** — voltage-to-percentage for devices without native reporting
- **Flow cards** — 4,073+ triggers, conditions, actions in EN/FR/NL/DE
- **Auto-repair** — self-healing configuration on startup

---

## Architecture

```
Layer 1 (Static)   driver.compose.json → app.json → Homey pairing
Layer 2 (Dynamic)  data/fingerprints.json → runtime enrichment (lazy-loaded)
```

---

## Development

```bash
# Validate before push (checks Athom server requirements O17–O20)
node scripts/validate/validate-app-json.js

# Check dual-layer integrity (no AggregateError)
node scripts/validation/app-json-dual-layer-validator.js
```

---

## Community & Support

- **Forum:** [community.homey.app/t/140352](https://community.homey.app/t/140352)
- **Issues:** [github.com/dlnraja/com.tuya.zigbee/issues](https://github.com/dlnraja/com.tuya.zigbee/issues)
- **Donate:** [paypal.me/dlnraja](https://paypal.me/dlnraja)

---

## License

GPL-3.0 — see [LICENSE](LICENSE)
