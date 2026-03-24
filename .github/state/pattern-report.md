## Pattern Detection Report

| Pattern | Reports | Priority | Top Fingerprints |
|---|---|---|---|
| False Battery Alert / Missing Battery | 28 | **high** | `vision` (22x), `TS0601` (13x), `router` (5x) |
| Pairing Failure | 8 | **high** | `vision` (5x), `TS0601` (4x), `example` (3x) |
| Device Shows Unknown | 5 | **high** | `TS0601` (3x), `_TZE284_aa03yzhs` (2x), `test` (2x) |
| Ring/Alarm Wrong | 5 | **high** | `vision` (5x), `TS011F` (3x), `_TZ3000_j1v25l17` (2x) |
| Device Not Responding | 4 | **medium** | `vision` (3x), `test` (2x), `TS0601` (2x) |
| Double Division (wrong sensor values) | 2 | **medium** | `vision` (2x), `TS0601` (2x), `_TZE204_qyr2m29i` (1x) |
| Inverted Sensor State | 1 | **low** | `_TZE200_wfxuhoea` (1x), `deconz` (1x), `vision` (1x) |
| Wrong Voltage | 1 | **low** | `_TZ3000_xr3htd96` (1x), `vision` (1x), `TS0201` (1x) |
| Wrong Energy | 1 | **low** | `_TZE204_clrdrnya` (1x), `router` (1x), `vision` (1x) |

### False Battery Alert / Missing Battery (28 reports)
**Fix:** Set `get mainsPowered() { return true; }` and remove measure_battery in onNodeInit
**Files:** `drivers/{driver}/device.js`
**Most affected:** `vision` (22x), `TS0601` (13x), `router` (5x), `test` (4x), `example` (3x), `TS0202` (3x), `generic` (3x), `TS0044` (3x), `lumi` (3x), `_TZ3000_o4mkahkc` (2x)

### Pairing Failure (8 reports)
**Fix:** Check driver.compose.json fingerprints, verify manufacturerName + productId
**Files:** `drivers/{driver}/driver.compose.json`
**Most affected:** `vision` (5x), `TS0601` (4x), `example` (3x), `generic` (3x), `_TZ3000_o4mkahkc` (2x), `test` (2x), `_TZ3000_o4mkahk` (2x), `TS0202` (2x), `_TZE284_hdml1aav` (2x), `_TZE204_ahwvlkpy` (1x)

### Device Shows Unknown (5 reports)
**Fix:** Check settings keys: zb_model_id (not zb_modelId), zb_manufacturer_name (not zb_manufacturerName)
**Files:** `drivers/{driver}/device.js`
**Most affected:** `TS0601` (3x), `_TZE284_aa03yzhs` (2x), `test` (2x), `tuya` (2x), `generic` (2x), `vision` (2x), `dlnraja` (1x), `example` (1x), `_TZE200_3p5ydos3` (1x), `_TZE204_n9ctkb6j` (1x)

### Ring/Alarm Wrong (5 reports)
**Fix:** Check alarm DP map
**Most affected:** `vision` (5x), `TS011F` (3x), `_TZ3000_j1v25l17` (2x), `_TZE204_clrdrnya` (1x), `router` (1x), `lumi` (1x), `TS0601` (1x), `_TZ3000_gjnozsaz` (1x), `_TZ3000_g` (1x), `_TZ3210_ol1uhvza` (1x)

### Device Not Responding (4 reports)
**Fix:** Check Zigbee mesh, device routing, and cluster bindings
**Most affected:** `vision` (3x), `test` (2x), `TS0601` (2x), `_TZ3210_w0qqde0g` (1x), `TS011F` (1x), `_TZ3000_zutizvyk` (1x), `TS0203` (1x), `HOBEIAN` (1x), `ZG-204Z` (1x), `ZG-204ZL` (1x)

### Double Division (wrong sensor values) (2 reports)
**Fix:** Check TuyaEF00Manager.js:1912 — skip auto-convert when dpMappings has divisor !== 1
**Files:** `lib/tuya/TuyaEF00Manager.js`
**Most affected:** `vision` (2x), `TS0601` (2x), `_TZE204_qyr2m29i` (1x), `test` (1x), `tuya` (1x), `_TZE204_clrdrnya` (1x), `router` (1x), `lumi` (1x)

### Inverted Sensor State (1 reports)
**Fix:** Add manufacturerName to invertedByDefault in HybridSensorBase.js + device.js
**Files:** `lib/devices/HybridSensorBase.js`, `drivers/{driver}/device.js`
**Most affected:** `_TZE200_wfxuhoea` (1x), `deconz` (1x), `vision` (1x), `tuya` (1x), `TS0601` (1x)

### Wrong Voltage (1 reports)
**Fix:** Check voltage divisor
**Most affected:** `_TZ3000_xr3htd96` (1x), `vision` (1x), `TS0201` (1x)

### Wrong Energy (1 reports)
**Fix:** Check energy divisor
**Most affected:** `_TZE204_clrdrnya` (1x), `router` (1x), `vision` (1x), `lumi` (1x), `TS0601` (1x)

