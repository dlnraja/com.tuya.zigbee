# DP_MAPPING_REFERENCE.md - Tuya Data Point Mapping Reference

> **Last Updated**: 2026-06-15 | **Version**: 9.0.36

## Overview

Tuya devices communicate via Data Points (DPs) over Cluster 0xEF00 (61184 decimal). Each DP has an ID, type, and value. This document provides the reference for common DP mappings across device categories.

## DP Types

| Type | Value | Size | Description |
|------|-------|------|-------------|
| Raw | 0 | Variable | Binary data (e.g., IR codes, complex payloads) |
| Bool | 1 | 1 byte | True/False |
| Value | 2 | 4 bytes | Unsigned 32-bit integer |
| String | 3 | Variable | Text data |
| Enum | 4 | 1 byte | Discrete values (0-255) |
| Bitmap | 5 | Variable | Bit flags |

## Frame Structure

```
ZCL Frame:  [frameCtrl:1][seqNum:1][cmdId:1][payload:N]
DP Payload: [status:1][transId:1][dp:1][type:1][lenHi:1][lenLo:1][data:N]
```

## Common DP Mappings by Device Category

### Switches (1-8 Gang)

| DP | Function | Type | Divisor | Notes |
|----|----------|------|---------|-------|
| DP1 | Gang 1 on/off | Bool | -- | Primary switch |
| DP2 | Gang 2 on/off | Bool | -- | 2+ gang switches |
| DP3-DP8 | Gangs 3-8 | Bool | -- | Multi-gang switches |
| DP10 | Power-on behavior | Enum | -- | 0=off, 1=on, 2=last state |
| DP14 | Power-on behavior (alt) | Enum | -- | Same as DP10 on some models |
| DP15 | Backlight mode | Enum | -- | 0=off, 1=normal, 2=inverted |
| DP101 | Child lock | Bool | -- | Prevents manual override |

### Dimmers

| DP | Function | Type | Divisor | Notes |
|----|----------|------|---------|-------|
| DP1 | On/off | Bool | -- | Dimmer switch state |
| DP2 | Brightness | Value | -- | 0-255 or 0-1000 (model dependent) |
| DP3 | Color temperature | Value | -- | 2700-6500K (model dependent) |

### Lights (RGB/RGBW)

| DP | Function | Type | Divisor | Notes |
|----|----------|------|---------|-------|
| DP1 | On/off | Bool | -- | Light switch |
| DP2 | Brightness | Value | -- | 0-255 |
| DP3 | Color mode | Enum | -- | 0=white, 1=color, 2=scene |
| DP5 | Color (RGB) | Value | -- | Packed RGB value |
| DP6 | Color temperature | Value | -- | Mired or Kelvin |

### Sensors

| DP | Function | Type | Divisor | Notes |
|----|----------|------|---------|-------|
| DP1 | Generic value | Value | varies | Device-specific |
| DP2 | CO2 | Value | 1 | ppm (air quality sensors) |
| DP4 | Battery percentage | Value | 1 | 0-100% |
| DP12 | PIR status | Bool | -- | Motion detection |
| DP15 | Battery voltage | Value | -- | mV (millivolts) |
| DP18 | Temperature | Value | 10 | Divide by 10 for Celsius |
| DP19 | Humidity | Value | 10 | Divide by 10 for % |
| DP20 | PM2.5 | Value | 1 | ug/m3 |
| DP21 | VOC | Value | 1 | ppb |
| DP22 | Formaldehyde | Value | 100 | Divide by 100 for mg/m3 |
| DP33 | Battery voltage (alt) | Value | -- | Some devices |
| DP35 | Battery voltage (alt2) | Value | -- | Some devices |
| DP100 | Battery (extended) | Value | -- | Battery percentage |
| DP101 | Battery (extended alt) | Value | -- | Battery percentage |

### Covers/Curtains

| DP | Function | Type | Divisor | Notes |
|----|----------|------|---------|-------|
| DP1 | Motor control | Enum | -- | 0=open, 1=close, 2=stop |
| DP2 | Position | Value | -- | 0-100% (standard: 0=closed) |
| DP3 | Position (alt) | Value | -- | Some models use DP3 |
| DP12 | Motor status | Enum | -- | Moving/closed/open |
| DP102 | Position (alt) | Value | -- | Extended position |

**Note**: Some curtains (e.g., Quoya M515EGBZTN) use inverted position (0=open, 100=closed). Use `positionInvert: true` in cover profile.

### Thermostats & TRVs

| DP | Function | Type | Divisor | Notes |
|----|----------|------|---------|-------|
| DP1 | On/off | Bool | -- | Heating enable |
| DP2 | Temperature setpoint | Value | -- | Target temperature |
| DP3 | Mode | Enum | -- | Auto/Manual/Eco/Away |
| DP4 | Temperature (actual) | Value | 10 | Divide by 10 |
| DP5 | Valve position | Value | -- | 0-100% open |
| DP14 | Child lock | Bool | -- | Prevents manual changes |
| DP16 | Window open detection | Bool | -- | Valve opens when window opens |
| DP24 | Temperature calibration | Value | -- | Offset in 0.1C |
| DP35 | Battery percentage | Value | -- | 0-100% |
| DP101 | Programming mode | Enum | -- | Schedule modes |
| DP102-107 | Schedule data | Raw | -- | Week schedule encoded |

### Plugs & Energy Monitors

| DP | Function | Type | Divisor | Notes |
|----|----------|------|---------|-------|
| DP1 | On/off | Bool | -- | Plug switch |
| DP2 | Energy (total) | Value | 100 | Wh (divide by 100 for kWh) |
| DP6 | Power | Value | 10 | Watts (divide by 10) |
| DP11 | Voltage | Value | 10 | Volts (divide by 10) |
| DP12 | Current | Value | 1000 | mA (divide by 1000 for A) |

### Battery (Extended DPs)

| DP | Function | Type | Notes |
|----|----------|------|-------|
| DP4 | Battery percentage | Value | Most common |
| DP10 | Battery percentage | Value | Alternate |
| DP14 | Battery percentage | Value | Alternate |
| DP15 | Battery voltage | Value | mV |
| DP21 | Battery percentage | Value | Alternate |
| DP33 | Battery voltage | Value | Some devices |
| DP35 | Battery voltage | Value | Some devices |
| DP100-105 | Battery (extended) | Value | Newer Tuya modules |
| DP247 | Battery voltage | Value | Some Tuya modules |

## SmartDivisorManager Auto-Detection

The SmartDivisorManager (`lib/managers/SmartDivisorManager.js`) auto-detects divisors for unknown DPs by:

1. Checking the device profile in `lib/registry/profiles/`
2. Cross-referencing with known Tuya DP patterns
3. Analyzing value ranges (e.g., temperature 200-3000 likely means /100)
4. Learning from previous similar devices

### Known Fixed Divisors

| DP Category | Typical Divisor | Example |
|-------------|-----------------|---------|
| Temperature (DP18) | 10 | 206 = 20.6C |
| Humidity (DP19) | 10 | 650 = 65.0% |
| Formaldehyde (DP22) | 100 | 5 = 0.05 mg/m3 |
| Energy (DP2) | 100 | 15000 = 150.00 Wh |
| Power (DP6) | 10 | 1234 = 123.4 W |
| Voltage (DP11) | 10 | 2300 = 230.0 V |
| Current (DP12) | 1000 | 1500 = 1.500 A |

## Manufacturer Prefix Patterns

| Prefix | Module Type | Common DPs | Time Format |
|--------|------------|------------|-------------|
| `_TZ3000_*` | ZCL switches, older | DP1-DP4 (switch), DP15 (backlight) | ZIGBEE_2000 |
| `_TZ3210_*` | ZCL switches | Similar to TZ3000 | ZIGBEE_2000 |
| `_TZE200_*` | Tuya DP modules | Full DP range (1-255) | TUYA_DUAL_2000 (default) |
| `_TZE204_*` | Tuya DP v2 | Same DP range as TZE200 | TUYA_DUAL_2000 |
| `_TZE284_*` | Tuya DP v3 | Same DP range, newer firmware | TUYA_DUAL_2000 |
| `TS0601` | Generic Tuya DP productId | Most common; always uses 0xEF00 | TUYA_MCU (default) |
| `TS0201` | ZCL temp/humidity sensor | ZCL genBasic clusters | ZIGBEE_2000 |
| `TS0203` | ZCL contact sensor | ZCL IAS Zone | ZIGBEE_2000 |
| `TS0207` | ZCL water leak sensor | ZCL IAS Zone | ZIGBEE_2000 |
| `TS130F` | Tuya ZCL curtain motor | ZCL windowCovering cluster | TUYA_STANDARD |

## MCU Time Synchronization DP Mappings

### Time-Related DPs
| DP | Function | Type | Notes |
|----|----------|------|-------|
| DP17 | ZT08 commit trigger | Bool | Write false after time sync (weather stations) |
| DP101 | Time format (12h/24h) | Enum | 0=24h, 1=12h |
| DP102 | Timezone | Value | -12 to +12 hours |
| DP103 | Time sync status | Value | Sync state indicator |
| DP106 | Time valid flag | Bool | Indicates if time is valid |

### MCU Time Sync Commands (Cluster 0xEF00)
| Cmd | Direction | Purpose |
|-----|-----------|---------|
| 0x24 | Both | mcuSyncTime (time request/response, 10-byte seq-aware) |
| 0x64 | Gw->Dev | Gateway push time command |
| 0x28 | Both | Alternative MCU sync (some gateways) |

### MCU UART Protocol Versions
| Version | Response | Key Feature |
|---------|----------|-------------|
| v3.1 | 8 bytes | [UTC:4BE][Local:4BE], no sequence echo |
| v3.2 | 8 bytes | Optional sequence in payloadSize |
| v3.3 | 10 bytes | [Seq:2BE][UTC:4BE][Local:4BE], sequence REQUIRED |
| v3.4 | 10 bytes | + DP17 commit trigger (ZT08 weather station) |
| v3.5 | 10 bytes | Extended TZ or 7-byte date-string fallback |

---

*Generated by Claude Code - 15 June 2026 | Version 9.0.36*
