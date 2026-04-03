# LLM Project Reference

> **Version**: Read from `app.json` (single source of truth)

## Critical Rules
- Settings: `zb_model_id`, `zb_manufacturer_name` (NOT zb_modelId)
- Flow cards: NO `titleFormatted` with `[[device]]`
- Backlight values: `"off"`, `"normal"`, `"inverted"` (strings)

## Key Base Classes
- `HybridSwitchBase.js` - Switches
- `HybridSensorBase.js` - Sensors  
- `HybridPlugBase.js` - Plugs
- `ButtonDevice.js` - Buttons

## Tuya DP Protocol
- Cluster 0xEF00 (61184)
- DP1-8: gang states
- DP14: power-on behavior
- DP15: backlight mode

## Soil Sensor DPs (TS0601)
- DP3=soil_moisture, DP5=temp(÷10), DP9=temp_unit
- DP14=battery_state(enum), DP15=battery_%
- DP101=air_humidity, DP102=lux, DP103=hum_cal, DP104=interval
- **Fertilizer/EC**: Unknown DP — `_TZE284_hdml1aav` needs log discovery

## ZCL-Only Manufacturers
`_TZ3000_blhvsaqf`, `_TZ3000_l9brjwau`, `_TZ3000_qkixdnon`
