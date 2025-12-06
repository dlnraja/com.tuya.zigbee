# UNIVERSAL TUYA ZIGBEE – MASTER TECH + TODO BLOCK

> **Global context / system prompt for the Universal Tuya Zigbee project (`com.dlnraja.tuya.zigbee`)**

---

## Implementation Status (v5.5.5)

| Spec Item | Status | Notes |
|-----------|--------|-------|
| Button SOS alarm_contact | ✅ DONE | Changed from alarm_tamper |
| Climate Monitor DP mapping | ✅ DONE | DP1/2/4 + time sync |
| Soil Sensor DP mapping | ✅ DONE | DP3/5/15 |
| Radar mmWave logging | ✅ DONE | raw + converted format |
| USB Plugs logging | ✅ DONE | Power/LED/button |
| English-first logging | ✅ DONE | [ZCL-DATA] format |

---

## 0. Global Objectives

- Build a **universal Tuya Zigbee app for Homey**
- Support both **standard Zigbee clusters** and **Tuya DP "EF00" overlay**
- Provide **clean, stable, user-friendly drivers**

---

## 1. Architecture Rules

### 1.1 Driver Structure
```
drivers/<driver_id>/
  ├── driver.js (or driver.compose.json)
  ├── device.js
  └── assets/icon.svg
```

### 1.2 UDH / Tuya DP Parser

Log format (per MASTER BLOCK):
```
[ZCL-DATA] <device>.<capability> raw=<X> converted=<Y>
```

---

## 2. Zigbee Concepts

### 2.1 Standard Clusters
- `temperatureMeasurement` → `measure_temperature` (°C)
- `relativeHumidity` → `measure_humidity` (%)
- `illuminanceMeasurement` → `measure_luminance` (lux)
- `onOff` → `onoff`
- `electricalMeasurement` → `measure_power`, `measure_voltage`, `measure_current`

### 2.2 Tuya EF00 Cluster
- Cluster ID: `0xEF00` = `61184`
- DP Types: `bool`, `value`, `enum`, `string`, `raw`

---

## 3. Specific Devices

### 3.1 TS0601 Climate Monitor `_TZE284_vvmbj46n`
```javascript
DP 1 → measure_temperature (value / 10)
DP 2 → measure_humidity (direct)
DP 4 → measure_battery (value * 2, max 100)
DP 15 → measure_battery (direct, TZE284 variant)
```

Time sync implemented via cluster `0x000A`.

### 3.2 TS0601 Soil Sensor `_TZE284_oitavov2`
```javascript
DP 3 → measure_temperature (value / 10)
DP 5 → measure_humidity (direct)
DP 15 → measure_battery (direct)
```

### 3.3 TS0601 Radar mmWave `_TZE200_rhgsbacq`
```javascript
DP 1 → alarm_motion (boolean)
DP 2 → measure_humidity (direct)
DP 3 → measure_temperature (value / 10)
DP 12/103 → measure_luminance (direct lux)
DP 4/15 → measure_battery (direct)
```

### 3.4 TS0215A SOS Button `_TZ3000_0dumfk2z`
- Uses `alarm_contact` (zone activity compatible)
- NOT `alarm_generic` (invalid) or `alarm_tamper`

### 3.5 USB Plugs / Power Strips
```javascript
DP 16/104 → measure_power (value / 10) W
DP 17/105 → measure_current (value / 1000) A
DP 18/106 → measure_voltage (value / 10) V
DP 19 → meter_power (value / 100) kWh
DP 13/101 → onoff.led
DP 102/103/121 → button press
```

---

## 4. Commit History (Session)

| Version | Description |
|---------|-------------|
| v5.5.5 | MASTER BLOCK COMPLIANCE - Enhanced logging + SOS button fix |
| v5.5.4 | PR Enrichment - JohanBendz PRs |
| v5.5.3 | Extended Enrichment - 29 manufacturers |
| v5.5.2 | Complete Enrichment - Issues #1290-#1320 |
| v5.5.1 | Critical Fixes - Motion sensors + Pairing |
| v5.5.0 | Mega Enrichment - 26 drivers + Issue #83 |

---

*Last updated: 2025-12-06*
