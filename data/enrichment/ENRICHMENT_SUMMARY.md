# Tuya Zigbee App Enrichment Summary
**Date**: 2025-12-06
**Version**: v5.4.8

## Overview

Conducted systematic research across Zigbee2MQTT, ZHA quirks, Hubitat drivers, and community sources to enrich device support and correct critical DP mapping errors.

## Critical Fixes Applied

### 1. Climate Sensor DP Mapping Correction (v5.4.8)

**CRITICAL ERROR FOUND & FIXED**: v5.4.7 incorrectly mixed soil sensor DPs with climate sensor DPs!

#### What Was Wrong:
```javascript
// WRONG (v5.4.7):
3: { capability: 'measure_humidity', divisor: 1 },  // For _TZE284_vvmbj46n
5: { capability: 'measure_temperature', divisor: 10 }, // For _TZE284_vvmbj46n
15: { capability: 'measure_battery', divisor: 1 },   // For _TZE284_vvmbj46n
```

#### What It Should Be:
```javascript
// CORRECT (v5.4.8):
// Climate sensors (_TZE284_vvmbj46n TH05Z LCD):
1: { capability: 'measure_temperature', divisor: 10 },  // Temperature
2: { capability: 'measure_humidity', divisor: 1 },      // Humidity
4: { capability: 'measure_battery', divisor: 1, transform: (v) => Math.min(v * 2, 100) },

// Soil sensors (_TZE284_oitavov2) - DIFFERENT DEVICE TYPE:
3: { capability: 'measure_humidity', divisor: 1 },      // Soil moisture
5: { capability: 'measure_temperature', divisor: 10 },  // Temperature
15: { capability: 'measure_battery', divisor: 1 },      // Battery
```

**Impact**: _TZE284_vvmbj46n users were likely getting NO data because the driver was listening to the WRONG DPs!

### 2. Configuration DPs Added for TH05Z LCD Climate Monitor

Added complete DP9-20 mappings for _TZE284_vvmbj46n / _TZE200_vvmbj46n (TH05Z):

| DP | Function | Usage |
|----|----------|-------|
| 9 | temperature_unit | 0=Celsius, 1=Fahrenheit |
| 10 | max_temp_alarm | Max temperature threshold (°C÷10) |
| 11 | min_temp_alarm | Min temperature threshold (°C÷10) |
| 12 | max_humidity_alarm | Max humidity threshold (%) |
| 13 | min_humidity_alarm | Min humidity threshold (%) |
| 14 | temp_alarm_status | Temp alarm state (enum: cancel/lower/upper) |
| 15 | humidity_alarm_status | Humidity alarm state (NOT battery!) |
| 17 | temp_report_interval | Temperature reporting interval (1-120 min) |
| 18 | humidity_report_interval | Humidity reporting interval (1-120 min) |
| 19 | temp_sensitivity | Temperature reporting sensitivity (0.3-1.0°C) |
| 20 | humidity_sensitivity | Humidity reporting sensitivity (3-10%) |

## Research Sources

### Zigbee2MQTT (Z2M)
- Issue #26078: Complete _TZE284_vvmbj46n TH05Z specification
- Issue #27501: _TZE284_oitavov2 soil sensor DP mapping
- Official docs: Support new Tuya devices

### ZHA (Zigpy Home Assistant)
- Device signature/fingerprint structures for _TZE284 variants
- Battery multiplier quirks (DP4 x2 confirmed)

### Community Drivers
- Hubitat driver by kkossev: Complete DP reference implementation
- Home Assistant forums: Real-world testing feedback

## Device Matrix Enrichment

Created comprehensive enrichment database at:
`data/enrichment/z2m-climate-sensor-dps.json`

Contains verified DP mappings for:
- _TZE284_vvmbj46n (TH05Z LCD climate monitor)
- _TZE200_vvmbj46n (ONENUO TH05Z - identical)
- _TZE284_oitavov2 (Tuya QT-07S soil sensor)
- Standard TS0601 climate sensors (most _TZE200_*, _TZE204_*)

## Verified Manufacturer Coverage

**Extracted**: 2107 unique manufacturer names from project
**GitHub scraped data**: 137 manufacturer IDs with PR/issue references
**Forum scraped data**: Community reports and device requests

## Key Learnings

### DP Mapping Best Practices
1. **Never assume DPs are standardized** - even within same model family
2. **DP3/5/15 confusion is common** - climate sensors vs soil sensors use different mappings
3. **Battery DP4 multiplier varies** - some devices report half value (x2 needed), others direct %
4. **Alarm DPs are NOT alarm_generic** - Homey doesn't have this capability (use `capability: null`)

### Device Variant Patterns
- **TS0601 + _TZE200_*** = Standard Tuya protocol
- **TS0601 + _TZE204_*** = Newer Tuya devices (usually same DPs as _TZE200)
- **TS0601 + _TZE284_*** = v2.84 protocol (may have different DPs!)
- **TS0201 + _TZ3000_*** = ZCL-based (use standard Zigbee clusters, not Tuya DPs)

### Z2M vs ZHA Differences
- Z2M uses converter files (`devices/tuya.ts`)
- ZHA uses Python quirks with device signatures
- Both often have same DP info, but different presentation
- Hubitat Groovy drivers are most detailed (community-tested)

## Testing Recommendations

### For _TZE284_vvmbj46n Users
1. Re-pair device or force data refresh
2. Check logs for "TUYA DATA RECEIVED!" messages
3. Verify DP1 (temp), DP2 (humidity), DP4 (battery) are being received
4. If still no data, check if device needs time sync (cluster 0x000A)

### For Soil Sensor Users
- Verify DP3 (soil moisture), DP5 (temp), DP15 (battery) working
- Soil sensor driver was already correct - no changes needed

## Files Modified

### Core Driver Changes
- `drivers/climate_sensor/device.js` - Fixed DP mappings, added v5.4.8 corrections
- `drivers/soil_sensor/device.js` - No changes (was already correct)

### Documentation Created
- `data/enrichment/z2m-climate-sensor-dps.json` - Complete DP database
- `data/enrichment/ENRICHMENT_SUMMARY.md` - This file
- `data/all-manufacturer-names.txt` - 2107 unique manufacturer IDs

## Next Steps for Full Enrichment

1. **Systematic manufacturer lookup** (2107 remaining)
   - Use scrapers: `scripts/enrichment/forum-scraper.js`
   - Use scrapers: `scripts/github_scraper.py`
   - Web search for each manufacturer variant

2. **Fingerprint database**
   - Extract device signatures from Z2M converters
   - ZHA quirk fingerprints
   - Add to driver.compose.json files

3. **Flow card enrichment**
   - Document trigger/condition/action cards per device
   - Add missing capabilities that have flow cards

4. **Settings enhancement**
   - Add DP9-20 configuration settings to climate_sensor driver
   - Enable user-configurable alarm thresholds

## References

All sources documented in:
- [Z2M Issue #26078](https://github.com/Koenkk/zigbee2mqtt/issues/26078) - TH05Z complete spec
- [Z2M Issue #27501](https://github.com/Koenkk/zigbee2mqtt/issues/27501) - Soil sensor DPs
- [Hubitat driver](https://raw.githubusercontent.com/kkossev/Hubitat/main/Drivers/Tuya Temperature Humidity Illuminance LCD Display with a Clock/Tuya_Temperature_Humidity_Illuminance_LCD_Display_with_a_Clock.groovy)
- [Z2M Tuya devices docs](https://www.zigbee2mqtt.io/advanced/support-new-devices/02_support_new_tuya_devices.html)

---

**Status**: v5.4.8 critical DP mapping fix complete ✅
**Build**: Successful ✅
**Validation**: Required - user testing needed
