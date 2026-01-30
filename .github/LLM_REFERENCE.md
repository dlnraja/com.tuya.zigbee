# LLM Project Reference v5.5.991

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

## ZCL-Only Manufacturers
`_TZ3000_blhvsaqf`, `_TZ3000_l9brjwau`, `_TZ3000_qkixdnon`
