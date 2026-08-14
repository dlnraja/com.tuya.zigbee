# MULTI_SOURCE_SWEEP P133 (sequential)

## Root cause (#513)
Interview `_TZE284_hodyryli` + `TS0601` clusters `[0,4,5,61184,60672]` lived only inside bloated `climate_sensor` (2600+ mfrs). Pairing still reported Unknown Zigbee unit.

## Fix
- New thin driver `climate_sensor_zt08` with exact sacred couple + interview clusters
- Removed hodyryli from `climate_sensor` (no dual-home)
- DeviceFingerprintDB → `climate_sensor_zt08`
- Anti-bot REQUIRED/FORBIDDEN rules
- `smartPlug_DinRail` → `TuyaZigbeeDevice` (allowlist now only `ir_blaster`)

## Version
9.0.503
