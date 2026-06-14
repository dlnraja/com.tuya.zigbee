## Pattern Detection Report

| Pattern | Reports | Priority | Top Fingerprints |
|---|---|---|---|
| False Battery Alert / Missing Battery | 35 | **high** | `vision` (27x), `VISION` (27x), `SENSOR` (18x) |
| Pairing Failure | 18 | **high** | `tuya` (15x), `vision` (13x), `VISION` (13x) |
| Device Not Responding | 8 | **high** | `zigbee2mqtt` (7x), `ZIGBEE2MQTT` (7x), `test` (5x) |
| Device Shows Unknown | 7 | **high** | `tuya` (7x), `_TZE` (3x), `example` (3x) |
| Ring/Alarm Wrong | 5 | **high** | `vision` (5x), `VISION` (5x), `_TZ3000_` (3x) |
| Double Division (wrong sensor values) | 2 | **medium** | `_TZE` (2x), `_TZE204_` (2x), `vision` (2x) |
| No Temperature | 2 | **medium** | `_TZ3000_` (2x), `_tz3000_` (2x), `zigbee2mqtt` (2x) |
| Inverted Sensor State | 1 | **low** | `_TZE200_wfxuhoea` (1x), `_TZE` (1x), `_TZE200_` (1x) |
| Wrong Voltage | 1 | **low** | `_TZ3000_xr3htd96` (1x), `_TZ3000_` (1x), `vision` (1x) |
| Wrong Energy | 1 | **low** | `_TZE204_clrdrnya` (1x), `_TZE` (1x), `_TZE204_` (1x) |

### False Battery Alert / Missing Battery (35 reports)
**Fix:** Set `get mainsPowered() { return true; }` and remove measure_battery in onNodeInit
**Files:** `drivers/{driver}/device.js`
**Most affected:** `vision` (27x), `VISION` (27x), `SENSOR` (18x), `TS0601` (18x), `_TZE` (16x), `_tze` (16x), `coordinator` (16x), `_TZ3000_` (15x), `_tz3000_` (15x), `tuya` (13x)

### Pairing Failure (18 reports)
**Fix:** Check driver.compose.json fingerprints, verify manufacturerName + productId
**Files:** `drivers/{driver}/driver.compose.json`
**Most affected:** `tuya` (15x), `vision` (13x), `VISION` (13x), `_TZ3000_` (12x), `_tz3000_` (12x), `coordinator` (12x), `SWITCH` (9x), `RELAY` (7x), `SENSOR` (6x), `router` (6x)

### Device Not Responding (8 reports)
**Fix:** Check Zigbee mesh, device routing, and cluster bindings
**Most affected:** `zigbee2mqtt` (7x), `ZIGBEE2MQTT` (7x), `test` (5x), `TS0601` (5x), `TEST` (5x), `vision` (4x), `VISION` (4x), `_TZE` (3x), `_tze` (3x), `_TZ3000_` (3x)

### Device Shows Unknown (7 reports)
**Fix:** Check settings keys: zb_model_id (not zb_modelId), zb_manufacturer_name (not zb_manufacturerName)
**Files:** `drivers/{driver}/device.js`
**Most affected:** `tuya` (7x), `_TZE` (3x), `example` (3x), `test` (3x), `_tze` (3x), `TS0601` (3x), `TEST` (3x), `_TZ3000_` (3x), `vision` (3x), `_tz3000_` (3x)

### Ring/Alarm Wrong (5 reports)
**Fix:** Check alarm DP map
**Most affected:** `vision` (5x), `VISION` (5x), `_TZ3000_` (3x), `_tz3000_` (3x), `TS011F` (3x), `_TZ3000_j1v25l17` (2x), `_tz3000_j1v25l17` (2x), `_TZE204_clrdrnya` (1x), `_TZE` (1x), `_TZE204_` (1x)

### Double Division (wrong sensor values) (2 reports)
**Fix:** Check TuyaEF00Manager.js:1912 — skip auto-convert when dpMappings has divisor !== 1
**Files:** `lib/tuya/TuyaEF00Manager.js`
**Most affected:** `_TZE` (2x), `_TZE204_` (2x), `vision` (2x), `coordinator` (2x), `VISION` (2x), `_tze204_qyr2m29i` (2x), `_tze` (2x), `_tze204_7bztmfm1` (2x), `_tze204_qpn5q17m` (2x), `_tze204_s8gkrkxk` (2x)

### No Temperature (2 reports)
**Fix:** Check DP18 divisor
**Most affected:** `_TZ3000_` (2x), `_tz3000_` (2x), `zigbee2mqtt` (2x), `ZIGBEE2MQTT` (2x), `TS0601` (2x), `SENSOR` (2x), `_TZ3000_tsgqxdb4` (1x), `sonoff` (1x), `SONOFF` (1x), `_TZ3000_TSGQXDB4` (1x)

### Inverted Sensor State (1 reports)
**Fix:** Add manufacturerName to invertedByDefault in UnifiedSensorBase.js + device.js
**Files:** `lib/devices/UnifiedSensorBase.js`, `drivers/{driver}/device.js`
**Most affected:** `_TZE200_wfxuhoea` (1x), `_TZE` (1x), `_TZE200_` (1x), `deconz` (1x), `vision` (1x), `tuya` (1x), `VISION` (1x), `_tze200_wfxuhoea` (1x), `_tze` (1x), `TS0601` (1x)

### Wrong Voltage (1 reports)
**Fix:** Check voltage divisor
**Most affected:** `_TZ3000_xr3htd96` (1x), `_TZ3000_` (1x), `vision` (1x), `_tz3000_` (1x), `_TZ3000_XR3HTD96` (1x), `tuya` (1x), `VISION` (1x), `TS0201` (1x), `SENSOR` (1x)

### Wrong Energy (1 reports)
**Fix:** Check energy divisor
**Most affected:** `_TZE204_clrdrnya` (1x), `_TZE` (1x), `_TZE204_` (1x), `router` (1x), `vision` (1x), `lumi` (1x), `coordinator` (1x), `VISION` (1x), `_TZE204_CLRDRNYA` (1x), `_tze` (1x)

