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
- **Fertilizer/EC**: Unknown DP  `_TZE284_hdml1aav` needs log discovery

## ZCL-Only Manufacturers
`_TZ3000_blhvsaqf`, `_TZ3000_l9brjwau`, `_TZ3000_qkixdnon`

## Multi-Driver Fingerprints
- Same mfr CAN be in multiple drivers (mfr+productId = match)
- Never remove mfr from driver just because it's in another

## SONOFF/eWeLink Mixins (v5.11.107)
- Cluster 0xFC11, manufacturer code 0x1286
- `SonoffEwelinkMixin.js`  switch features (LED, turbo, detach, trigger)
- `SonoffSensorMixin.js`  tamper, temp/hum calibration
- `SonoffEnergyMixin.js`  current/voltage/power (attrs 0x7004-0x7006)
- Safe PIDs: SNZB-*, ZBMINI*, S31ZB, S[46]0ZBT*, BASICZBR*, TRVZB, SWV-*

## Immediate Data (v5.11.99)
- dataQuery cmd 0x03 with seq on init
- Retry: 2s10s30s60s
