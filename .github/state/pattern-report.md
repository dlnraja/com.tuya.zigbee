## Pattern Detection Report

| Pattern | Reports | Priority | Top Fingerprints |
|---|---|---|---|
| False Battery Alert / Missing Battery | 34 | **high** | `vision` (25x), `TS0601` (16x), `_TZE` (15x) |
| Pairing Failure | 9 | **high** | `_TZE` (5x), `TS0601` (5x), `vision` (5x) |
| Device Not Responding | 6 | **high** | `vision` (3x), `_TZ3000_` (3x), `TS0601` (3x) |
| Device Shows Unknown | 5 | **high** | `_TZE` (3x), `TS0601` (3x), `_TZE284_aa03yzhs` (2x) |
| Ring/Alarm Wrong | 5 | **high** | `vision` (5x), `_TZ3000_` (3x), `TS011F` (3x) |
| Double Division (wrong sensor values) | 2 | **medium** | `vision` (2x), `_TZE` (2x), `_TZE204_` (2x) |
| Inverted Sensor State | 1 | **low** | `_TZE200_wfxuhoea` (1x), `deconz` (1x), `vision` (1x) |
| Wrong Voltage | 1 | **low** | `_TZ3000_xr3htd96` (1x), `vision` (1x), `_TZ3000_` (1x) |
| No Temperature | 1 | **low** | `_TZ3000_tsgqxdb4` (1x), `sonoff` (1x), `_TZ3000_` (1x) |
| Wrong Energy | 1 | **low** | `router` (2x), `_TZE204_clrdrnya` (1x), `vision` (1x) |

### False Battery Alert / Missing Battery (34 reports)
**Fix:** Set `get mainsPowered() { return true; }` and remove measure_battery in onNodeInit
**Files:** `drivers/{driver}/device.js`
**Most affected:** `vision` (25x), `TS0601` (16x), `_TZE` (15x), `_TZ3000_` (12x), `sensor` (12x), `router` (12x), `_TZE204_` (6x), `TS0202` (5x), `button` (5x), `test` (5x)

### Pairing Failure (9 reports)
**Fix:** Check driver.compose.json fingerprints, verify manufacturerName + productId
**Files:** `drivers/{driver}/driver.compose.json`
**Most affected:** `_TZE` (5x), `TS0601` (5x), `vision` (5x), `example` (3x), `_TZ3000_` (3x), `generic` (3x), `button` (3x), `sensor` (3x), `_TZE284_` (3x), `_TZ3000_o4mkahkc` (2x)

### Device Not Responding (6 reports)
**Fix:** Check Zigbee mesh, device routing, and cluster bindings
**Most affected:** `vision` (3x), `_TZ3000_` (3x), `TS0601` (3x), `sensor` (3x), `test` (3x), `_TZ3210_w0qqde0g` (1x), `_TZ3210_` (1x), `TS011F` (1x), `_TZ3000_zutizvyk` (1x), `TS0203` (1x)

### Device Shows Unknown (5 reports)
**Fix:** Check settings keys: zb_model_id (not zb_modelId), zb_manufacturer_name (not zb_manufacturerName)
**Files:** `drivers/{driver}/device.js`
**Most affected:** `_TZE` (3x), `TS0601` (3x), `_TZE284_aa03yzhs` (2x), `_TZE284_` (2x), `generic` (2x), `sensor` (2x), `test` (2x), `vision` (2x), `dlnraja` (1x), `example` (1x)

### Ring/Alarm Wrong (5 reports)
**Fix:** Check alarm DP map
**Most affected:** `vision` (5x), `_TZ3000_` (3x), `TS011F` (3x), `router` (2x), `_TZ3000_j1v25l17` (2x), `_TZE204_clrdrnya` (1x), `_TZE` (1x), `_TZE204_` (1x), `TS0601` (1x), `sensor` (1x)

### Double Division (wrong sensor values) (2 reports)
**Fix:** Check TuyaEF00Manager.js:1912 — skip auto-convert when dpMappings has divisor !== 1
**Files:** `lib/tuya/TuyaEF00Manager.js`
**Most affected:** `vision` (2x), `_TZE` (2x), `_TZE204_` (2x), `TS0601` (2x), `router` (2x), `_TZE204_qyr2m29i` (1x), `MOES` (1x), `Moes` (1x), `test` (1x), `_TZE204_clrdrnya` (1x)

### Inverted Sensor State (1 reports)
**Fix:** Add manufacturerName to invertedByDefault in UnifiedSensorBase.js + device.js
**Files:** `lib/devices/UnifiedSensorBase.js`, `drivers/{driver}/device.js`
**Most affected:** `_TZE200_wfxuhoea` (1x), `deconz` (1x), `vision` (1x), `_TZE` (1x), `_TZE200_` (1x), `TS0601` (1x)

### Wrong Voltage (1 reports)
**Fix:** Check voltage divisor
**Most affected:** `_TZ3000_xr3htd96` (1x), `vision` (1x), `_TZ3000_` (1x), `TS0201` (1x)

### No Temperature (1 reports)
**Fix:** Check DP18 divisor
**Most affected:** `_TZ3000_tsgqxdb4` (1x), `sonoff` (1x), `_TZ3000_` (1x), `TS0201` (1x), `TS0601` (1x), `debug` (1x), `sensor` (1x), `test` (1x)

### Wrong Energy (1 reports)
**Fix:** Check energy divisor
**Most affected:** `router` (2x), `_TZE204_clrdrnya` (1x), `vision` (1x), `_TZE` (1x), `_TZE204_` (1x), `TS0601` (1x), `sensor` (1x), `relay` (1x)

