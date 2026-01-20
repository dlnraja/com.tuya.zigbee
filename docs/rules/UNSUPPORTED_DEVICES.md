# Unsupported Devices & Categories

This document lists devices that are NOT compatible with Universal Tuya Zigbee and why.

---

## 🚫 NOT SUPPORTED - Proprietary Zigbee

### APsystems Solar Microinverters (ECU-C/ECU-R)
**Manufacturer**: APsystems
**Protocol**: Proprietary Zigbee (2.4GHz)
**Why Not Supported**:
- Uses custom Zigbee protocol, not Tuya/ZCL standard
- Requires APsystems ECU gateway for communication
- No TS0601 or standard Tuya clusters
- Communication is inverter-to-ECU only

**Alternative**: Use APsystems native monitoring app/cloud

### Enphase Microinverters
**Manufacturer**: Enphase
**Protocol**: Proprietary Envoy communication
**Why Not Supported**: Closed ecosystem, no Zigbee

### SolarEdge Inverters
**Manufacturer**: SolarEdge
**Protocol**: Proprietary (with optional Zigbee module)
**Why Not Supported**: Even Zigbee module uses custom protocol

---

## ⚠️ PARTIALLY SUPPORTED

### EV Chargers (Wallbox/EVSE)
**Status**: No Tuya Zigbee EV chargers found in research
**Notes**: 
- Most EV chargers use WiFi, Modbus, or OCPP
- If a TS0601 EV charger exists, send diagnostic for analysis

### Heat Pumps
**Status**: Limited support via thermostat drivers
**Notes**:
- Most heat pumps use proprietary protocols
- Some Tuya thermostats can control heat pump modes
- Use `thermostat_advanced` driver for compatible units

---

## ✅ ALTERNATIVES FOR SOLAR MONITORING

### Tuya-Compatible Energy Meters
For solar production monitoring, use bidirectional energy meters:

| Device | ManufacturerName | Features |
|--------|------------------|----------|
| DIN Rail Bidirectional | `_TZE204_ac0fhfiq` | 150A clamp, grid+solar |
| 3-Phase Meter | `_TZE200_ves1ycwx` | 3-phase, bidirectional |
| CT Clamp Meter | `_TZE200_byzdayie` | Retrofit, non-invasive |

### How Bidirectional Works
1. Positive power = consumption from grid
2. Negative power = export to grid (solar production)
3. `meter_power.exported` capability tracks total export

---

## 🔍 Research Sources

### For Device Compatibility
1. Check Zigbee2MQTT first: https://www.zigbee2mqtt.io/supported-devices/
2. If device uses `TS0601` model, likely compatible
3. If manufacturer has proprietary gateway requirement, NOT compatible

### Red Flags (NOT Compatible)
- "Requires manufacturer gateway/hub"
- "Works with [Brand] app only"
- "Proprietary wireless protocol"
- No `_TZ*` or `_TZE*` manufacturer prefix
