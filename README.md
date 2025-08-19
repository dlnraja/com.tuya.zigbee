# 🌐 Tuya Zigbee Drivers for Homey

[![CI](https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/ci.yml/badge.svg)](https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/ci.yml)
[![Pages](https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/pages.yml/badge.svg)](https://dlnraja.github.io/com.tuya.zigbee/)
[![SDK3](https://img.shields.io/badge/SDK-3-green)](https://apps.developer.homey.app/)

## Overview

This Homey app provides **100% local Zigbee drivers** for Tuya devices. No cloud API, no network dependencies at runtime.

## How We Differ from Upstream

This is a fork of [JohanBendz/com.tuya.zigbee](https://github.com/JohanBendz/com.tuya.zigbee) with significant architectural improvements:

- **Clean architecture**: Drivers organized by product type (not TSxxxx codes)
- **Overlay system**: Vendor/firmware specifics in JSON overlays (only confirmed ones at runtime)
- **Offline scoring**: Confidence-based device proposal system
- **Performance**: FIFO DP queue, debouncing, retry logic with jitter
- **Fixed writeInteger**: Implements the missing Tuya cluster write with retry (#1263)

We thank JohanBendz and all contributors to the original project. This fork is MIT licensed.

### Key Features
- **SDK3 + Homey Compose** - Modern architecture
- **Runtime 100% local** - No network calls
- **Offline scoring** - Confidence-based overlay system
- **4 device families** - Plug, TRV, Curtain, Remote
- **Robust runtime** - FIFO DP queue, debouncing, retry logic

## Innovation: Offline Reliability Scoring

Our unique scoring system evaluates device configurations based on multiple sources:

### How it works
1. **Manual data ingestion** from trusted sources (no web scraping)
2. **Confidence calculation** based on source reliability (0.0 to 1.0)
3. **Automatic proposals** when confidence ≥ 0.60
4. **Confirmation** after real-world testing + confidence ≥ 0.85
5. **Runtime safety** - only confirmed overlays are active

### Source Weights
- Official manufacturer: 0.92
- Zigbee certification: 0.86
- Upstream repos: 0.85
- Local logs: 0.90+
- Forums: 0.75
- Retailers: 0.55

### Bonuses & Penalties
- Multi-source agreement: +0.10
- DP evidence: +0.15
- Contradictions: -0.20
- Single source: -0.10

## Supported Devices

### Plugs (class: socket)
- **TS011F** - Single socket with power monitoring
- **TS0115** - Multi-socket (up to 5 channels)
- Capabilities: `onoff`, `measure_power`, `meter_power`

### Thermostats (class: thermostat)
- **TS0601** - Radiator valves (TRV)
- Capabilities: `target_temperature`, `measure_temperature`, `locked`, `alarm_battery`
- Temperature range: 5-30°C (step 0.5°C)

### Curtains (class: windowcoverings)
- **TS0601**, **TS130F** - Motor controllers
- Capabilities: `windowcoverings_set`, `windowcoverings_state`, `alarm_battery`

### Remotes (class: sensor)
- **TS004x** - Scene controllers (1-4 buttons)
- Flow triggers: `button_pressed`, `button_double`, `button_held`

## Installation

### From Homey App Store
Coming soon...

### From Source
```bash
git clone https://github.com/dlnraja/tuya-zigbee.git
cd tuya-zigbee
npm install
npm run build:homey
npm run validate:homey
```

## Development

### Architecture
```
drivers/
  plug-tuya-universal/     # Readable names by type
  climate-trv-tuya/        # No TSxxxx in folder names
  cover-curtain-tuya/
  remote-scene-tuya/
lib/
  common/                  # Shared helpers
  zigbee/                  # Interview, reporting
  tuya/                    # DP conversion, overlays
research/
  manual/*.jsonl           # Manual data input
  configs/                 # Scoring configuration
tools/
  cli.js                   # Unified Node.js CLI
```

### Commands
```bash
npm run audit              # Check structure & network usage
npm run lint               # Enforce naming conventions
npm run test               # Run unit tests
npm run build:homey        # Generate app.json
npm run validate:homey     # Validate manifest
npm run ingest             # Process manual data
npm run infer              # Calculate confidence scores
npm run propose            # Generate overlay proposals
```

### Contributing

#### Requesting New Device Support
1. Pair your device with Homey
2. Collect the Zigbee interview log:
   - Developer Tools → Zigbee → Interview
   - Copy manufacturerName, productId, endpoints
3. Monitor DP values during device operation
4. Open an issue with:
   - Interview data
   - DP observations
   - Device manual/links

#### Data Format (research/manual/*.jsonl)
```json
{
  "manufacturerName": "_TZ3000_xxxxxxxx",
  "productId": "TS011F",
  "typeHints": ["plug", "meter"],
  "capabilityHints": ["onoff", "measure_power"],
  "dpEvidence": {
    "1": "onoff",
    "16": "measure_power/10"
  },
  "source": {
    "type": "local_pairing_log",
    "url": "local://homey/logs/2025-01-19",
    "date": "2025-01-19"
  }
}
```

## Runtime Robustness

### FIFO DP Queue
- Max 100 items per device
- Drop & warn on overflow
- Sequential processing

### Debouncing
- 150-300ms per capability
- Prevents Zigbee flooding

### Tuya Write Retry
- 2 attempts with jitter (50-120ms)
- Error classification: Timeout/Unsupported/Range

### Safe Mode
- ≥5 write errors/60s → read-only mode
- Auto-recovery after cooldown

## Links

- [Dashboard](https://dlnraja.github.io/tuya-zigbee/)
- [GitHub](https://github.com/dlnraja/tuya-zigbee)
- [Homey Community](https://community.homey.app/t/tuya-zigbee-app/26439)

## Sources & References

### Official
- [Tuya IoT Platform](https://developer.tuya.com/en/docs/iot)
- [Homey Apps SDK](https://apps.developer.homey.app/)
- [Zigbee Cluster Library](https://csa-iot.org/developer-resources/zigbee/)

### Community
- [JohanBendz/com.tuya.zigbee](https://github.com/JohanBendz/com.tuya.zigbee)
- [Zigbee2MQTT Converters](https://github.com/Koenkk/zigbee-herdsman-converters)
- [ZHA Device Handlers](https://github.com/zigpy/zha-device-handlers)

## License

MIT

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.

---

*Built with ❤️ for the Homey community*