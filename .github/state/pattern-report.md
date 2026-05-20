## Pattern Detection Report

| Pattern | Reports | Priority | Top Fingerprints |
|---|---|---|---|
| False Battery Alert / Missing Battery | 37 | **high** | `vision` (27x), `TS0601` (18x), `_TZE` (16x) |
| Pairing Failure | 18 | **high** | `vision` (13x), `router` (6x), `_TZE` (5x) |
| Device Not Responding | 9 | **high** | `test` (5x), `TS0601` (5x), `vision` (4x) |
| Device Shows Unknown | 7 | **high** | `_TZE` (3x), `TS0601` (3x), `vision` (3x) |
| Ring/Alarm Wrong | 5 | **high** | `vision` (5x), `TS011F` (3x), `_TZ3000_j1v25l17` (2x) |
| Double Division (wrong sensor values) | 2 | **medium** | `_TZE` (2x), `vision` (2x), `TS0601` (2x) |
| No Temperature | 2 | **medium** | `TS0601` (2x), `_TZ3000_tsgqxdb4` (1x), `sonoff` (1x) |
| Inverted Sensor State | 1 | **low** | `_TZE200_wfxuhoea` (1x), `_TZE` (1x), `deconz` (1x) |
| Wrong Voltage | 1 | **low** | `_TZ3000_xr3htd96` (1x), `vision` (1x), `TS0201` (1x) |
| Wrong Energy | 1 | **low** | `_TZE204_clrdrnya` (1x), `_TZE` (1x), `router` (1x) |

### False Battery Alert / Missing Battery (37 reports)
**Fix:** Set `get mainsPowered() { return true; }` and remove measure_battery in onNodeInit
**Files:** `drivers/{driver}/device.js`
**Most affected:** `vision` (27x), `TS0601` (18x), `_TZE` (16x), `router` (6x), `test` (5x), `TS0202` (5x), `tuya` (4x), `example` (3x), `generic` (3x), `_TZ3000_b4awzgct` (3x)

### Pairing Failure (18 reports)
**Fix:** Check driver.compose.json fingerprints, verify manufacturerName + productId
**Files:** `drivers/{driver}/driver.compose.json`
**Most affected:** `vision` (13x), `router` (6x), `_TZE` (5x), `TS0601` (5x), `example` (3x), `generic` (3x), `TS0001` (3x), `_TZ3000_o4mkahkc` (2x), `test` (2x), `_TZ3000_o4mkahk` (2x)

### Device Not Responding (9 reports)
**Fix:** Check Zigbee mesh, device routing, and cluster bindings
**Most affected:** `test` (5x), `TS0601` (5x), `vision` (4x), `_TZE` (3x), `_TZE284_fhvpaltk` (2x), `_TZ3210_w0qqde0g` (1x), `TS011F` (1x), `_TZ3000_zutizvyk` (1x), `TS0203` (1x), `_TZ3000_tsgqxdb4` (1x)

### Device Shows Unknown (7 reports)
**Fix:** Check settings keys: zb_model_id (not zb_modelId), zb_manufacturer_name (not zb_manufacturerName)
**Files:** `drivers/{driver}/device.js`
**Most affected:** `_TZE` (3x), `TS0601` (3x), `vision` (3x), `_TZE284_aa03yzhs` (2x), `tuya` (2x), `test` (2x), `generic` (2x), `router` (2x), `TS0001` (2x), `dlnraja` (1x)

### Ring/Alarm Wrong (5 reports)
**Fix:** Check alarm DP map
**Most affected:** `vision` (5x), `TS011F` (3x), `_TZ3000_j1v25l17` (2x), `_TZE204_clrdrnya` (1x), `_TZE` (1x), `router` (1x), `lumi` (1x), `TS0601` (1x), `_TZ3000_gjnozsaz` (1x), `_TZ3000_g` (1x)

### Double Division (wrong sensor values) (2 reports)
**Fix:** Check TuyaEF00Manager.js:1912 — skip auto-convert when dpMappings has divisor !== 1
**Files:** `lib/tuya/TuyaEF00Manager.js`
**Most affected:** `_TZE` (2x), `vision` (2x), `TS0601` (2x), `_TZE204_qyr2m29i` (1x), `MOES` (1x), `tuya` (1x), `test` (1x), `_TZE204_clrdrnya` (1x), `router` (1x), `lumi` (1x)

### No Temperature (2 reports)
**Fix:** Check DP18 divisor
**Most affected:** `TS0601` (2x), `_TZ3000_tsgqxdb4` (1x), `sonoff` (1x), `debug` (1x), `test` (1x), `TS0201` (1x), `_TZ3000_402vrq2i` (1x), `zigbee2mqtt` (1x), `TS004F` (1x)

### Inverted Sensor State (1 reports)
**Fix:** Add manufacturerName to invertedByDefault in UnifiedSensorBase.js + device.js
**Files:** `lib/devices/UnifiedSensorBase.js`, `drivers/{driver}/device.js`
**Most affected:** `_TZE200_wfxuhoea` (1x), `_TZE` (1x), `deconz` (1x), `vision` (1x), `tuya` (1x), `TS0601` (1x)

### Wrong Voltage (1 reports)
**Fix:** Check voltage divisor
**Most affected:** `_TZ3000_xr3htd96` (1x), `vision` (1x), `TS0201` (1x)

### Wrong Energy (1 reports)
**Fix:** Check energy divisor
**Most affected:** `_TZE204_clrdrnya` (1x), `_TZE` (1x), `router` (1x), `vision` (1x), `lumi` (1x), `TS0601` (1x)

## Pattern Detection Report

No recurring patterns detected.
