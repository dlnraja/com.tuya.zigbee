---
layout: default
title: Tuya Zigbee Drivers for Homey
---

# Tuya Zigbee Drivers for Homey

## Overview

This Homey app provides **100% local Zigbee drivers** for Tuya devices with no cloud dependencies.

## Features

- ✅ **SDK3 + Homey Compose** - Modern architecture
- ✅ **100% Local Runtime** - No network calls
- ✅ **Smart Overlays** - Device-specific configurations
- ✅ **Offline Scoring** - Confidence-based proposals
- ✅ **Robust Performance** - FIFO queue, debouncing, retry logic

## Supported Device Families

| Family | Devices | Capabilities | Status |
|--------|---------|--------------|--------|
| **Plugs** | TS011F, TS0115 | Power on/off, Energy monitoring | ✅ Stable |
| **Thermostats** | TS0601 TRV | Temperature control, Child lock | ✅ Stable |
| **Curtains** | TS0601, TS130F | Position control, Battery | 🔄 Beta |
| **Remotes** | TS004x | Scene control, Battery | 🔄 Beta |

## Innovation: Offline Inference System

Our unique **confidence scoring system** evaluates device configurations without any network calls:

1. **Manual data ingestion** - No web scraping
2. **Weighted scoring** - Based on source reliability
3. **Automatic proposals** - When confidence ≥ 0.60
4. **Runtime safety** - Only confirmed overlays active

### Confidence Weights

- Official docs: 0.90
- Upstream repos: 0.85
- Community forums: 0.70
- Product pages: 0.55

## Quick Start

```bash
# Clone repository
git clone https://github.com/dlnraja/com.tuya.zigbee.git
cd com.tuya.zigbee

# Install dependencies
npm install

# Build and validate
npm run build:homey
npm run validate:homey

# Run tests
npm test
```

## Contributing

See [CONTRIBUTING.md](https://github.com/dlnraja/com.tuya.zigbee/blob/master/docs/CONTRIBUTING.md) for guidelines.

## Links

- [GitHub Repository](https://github.com/dlnraja/com.tuya.zigbee)
- [Homey Community Forum](https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-lite-version/140352)
- [Upstream Project](https://github.com/JohanBendz/com.tuya.zigbee)

---

*MIT Licensed - Built with ❤️ for the Homey community*
