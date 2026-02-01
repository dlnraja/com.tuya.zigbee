# Zigbee Proprietary Overlays Guide - v5.7.50

> Complete reference for all Zigbee proprietary protocols and custom clusters

## Overview

This app supports **30+ proprietary protocols** on top of Zigbee 3.0, handling **300+ manufacturers** and **28,000+ device fingerprints**.

---

## Proprietary Cluster Map

| Cluster | Hex | Name | Brands | Description |
|---------|-----|------|--------|-------------|
| 61184 | 0xEF00 | Tuya DP | Tuya, Moes, Lidl, Zemismart | Standard Tuya DataPoint tunnel |
| 57344 | 0xE000 | Tuya Extended | BSEED, multi-gang | Manufacturer specific 0 |
| 57345 | 0xE001 | Tuya Switch Type | BSEED | External switch mode |
| 60672 | 0xED00 | Tuya Proprietary | Curtain motors | TS0601 specific |
| 64704 | 0xFCC0 | Xiaomi/Aqara | Lumi, Aqara | Custom attributes |
| 64636 | 0xFC7C | IKEA | TRÅDFRI | OTA, scenes |
| 64512 | 0xFC00 | Philips Hue | Signify | Entertainment mode |
| 64527 | 0xFC0F | OSRAM | Ledvance | Lightify |
| 64513 | 0xFC01 | Legrand | Netatmo | Wiring mode |
| 64515 | 0xFC03 | Schneider | Wiser | TRV control |
| 64516 | 0xFC04 | Danfoss | Ally | External temp |
| 64528 | 0xFC10 | Develco | Frient | VOC sensing |
| 64529 | 0xFC11 | Sonoff | eWeLink | Inching mode |
| 64641 | 0xFC81 | Heiman | Safety sensors | Smoke/CO/Gas |
| 65281 | 0xFF01 | Sinopé | Heating | Floor heating |

---

## Protocol Detection Matrix

| Manufacturer Pattern | Protocol | Cluster | DP? |
|---------------------|----------|---------|-----|
| `_TZE200_*` | Tuya DP | 0xEF00 | ✅ |
| `_TZE204_*` | Tuya DP | 0xEF00 | ✅ |
| `_TZE284_*` | Tuya DP | 0xEF00 | ✅ |
| `_TZ3000_*` | Tuya Mixed | ZCL + 0xEF00 | ❌ |
| `_TZ3210_*` | Tuya ZCL | Standard | ❌ |
| `_TZ3400_*` | Tuya ZCL | Standard | ❌ |
| `_TYZB01_*` | Tuya Legacy | 0xEF00 | ❌ |
| `LUMI` | Xiaomi | 0xFCC0 | ❌ |
| `IKEA of Sweden` | IKEA | 0xFC7C | ❌ |
| `Philips` | Hue | 0xFC00 | ❌ |
| `SONOFF` | Sonoff | 0xFC11 | ❌ |
| `HEIMAN` | Heiman | 0xFC81 | ❌ |

---

## Key Files

| File | Purpose |
|------|---------|
| `lib/protocol/ZigbeeProtocolComplete.js` | All protocols + manufacturers |
| `lib/ManufacturerVariationManager.js` | Per-mfr config |
| `lib/tuya/TuyaDataPointsComplete.js` | Tuya clusters + commands |
| `lib/clusters/TuyaBoundCluster.js` | 0xEF00 handler |
| `lib/clusters/TuyaE000BoundCluster.js` | 0xE000 handler |
| `lib/protocol/IntelligentProtocolRouter.js` | Smart routing |

---

## Hybrid Detection Strategy

1. **Manufacturer prefix detection** - `_TZE*` = Tuya DP
2. **Model ID detection** - `TS0601` = Tuya DP
3. **Cluster availability** - Check for 0xEF00
4. **Fallback to ZCL** - Standard clusters

---

## Supported Brands (Selection)

### Tuya Ecosystem
- Tuya, Smartlife, MOES, Lidl/Silvercrest, Zemismart
- Lonsonho, BlitzWolf, Girier, Nous/Aubess, BSEED

### Major Brands
- Xiaomi/Aqara, IKEA, Philips Hue, OSRAM/Ledvance
- Legrand/Netatmo, Schneider/Wiser, Danfoss, Bosch
- Sonoff/eWeLink, Heiman, Innr, Sengled, Develco

### Other
- Eurotronic, Salus, Sinopé, Gledopto, Third Reality
- Trust, Namron, Paulmann, Müller-Licht, Yale
