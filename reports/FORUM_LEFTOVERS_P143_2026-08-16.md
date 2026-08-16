# Forum leftovers P143 — 2026-08-16

## Status matrix

| Item | Verdict | Action |
|------|---------|--------|
| **ZT08 #513** | **DONE** | Closed — Finnamu OK on 9.0.533 |
| **PresentSky dimmer** | **RE-PAIR ONLY** | FP only on `wall_dimmer_tuya` — remove climate pair + re-add |
| **Peter SOS/crashes** | **CODE** | Crash class already tip; P143: `_fireAlarm` + safe-timers |
| **HOBEIAN water leak** | **CODE** | IAS clusters 0/1/1280 + `_TZ3000_k4ej3ww2` as mfr; strip from gas productId |
| **Contact lux** | **CODE** | Stop DP101 battery-steal; lux path + calibration on DP101 |

## User steps after next Test build

1. **PresentSky:** delete dimmer → pair as Wall Dimmer (Tuya).
2. **Peter:** update Test tip → Repair SOS → if mute, set Alarm polarity = Inverted once.
3. **Water ZG-222Z:** update → wake sensor → Maintenance Repair / re-pair while wet-testing.
4. **Contact + lux:** update → open/close + cover lux; if tile inverted use Alarm polarity.

## Files

- `drivers/button_emergency_sos/device.js`
- `drivers/water_leak_sensor/driver.compose.json`
- `drivers/gas_sensor_switch/driver.compose.json`
- `lib/devices/UnifiedSensorBase.js`
- `drivers/contact_sensor/device.js`
