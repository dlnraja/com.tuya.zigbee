# RAW_MODE.md - Raw Data Mode & Debug Reference

> **Last Updated**: 2026-06-15 | **Version**: 9.0.36

## Overview

Raw Mode allows developers and advanced users to inspect the raw Zigbee frames and Tuya DP data flowing between the app and devices. This is essential for debugging device communication issues, mapping new DPs, and diagnosing protocol-level problems.

## Accessing Raw Data

### Via Homey Developer Tools

1. Open [Homey Developer Tools](https://tools.developer.homey.app/tools/zigbee)
2. Select the device from the dropdown
3. View the device interview (manufacturerName, productId, endpoints, clusters)
4. Monitor real-time Zigbee frames in the frames viewer

### Via App Diagnostics

1. Go to **Settings > Apps > Tuya Unified Zigbee > Send Diagnostics**
2. The diagnostics code contains device states, capabilities, and recent frames
3. Paste the diagnostics code in a GitHub issue for support

### Via Debug Logging

```bash
# Enable debug logging for Tuya protocol
# In Homey: Settings > Apps > Tuya Unified Zigbee > Log Level > Debug

# Key debug areas:
# - L0 (TuyaZigbeeDevice): Raw frame interception
# - L4 (TuyaEF00Manager): DP report decoding
# - L4 (TuyaDPParser): Multi-frame parsing
# - L11 (SanityFilter): Noise filtering decisions
```

## Raw Frame Format

### Zigbee Frame Structure

```
Frame Control: 1 byte
  Bit 0-1: Frame type (00=data, 01=inter-pan)
  Bit 2-3: Security (00=none)
  Bit 4:   Route discovery
  Bit 5:   Group addressing
  Bit 6:   Disable APS security
  Bit 7:   APS frame type

Sequence Number: 1 byte (0-255, wraps)

Cluster ID: 2 bytes (LE)
  0x0006 = OnOff
  0x0008 = LevelControl
  0xEF00 = Tuya DP (61184 decimal)
  0xE000 = BSEED custom
  0xE001 = Extended Tuya (button events)

Profile ID: 2 bytes (LE)
  0x0104 = Home Automation

Source Endpoint: 1 byte
Destination Endpoint: 1 byte

Payload: N bytes (cluster-specific)
```

### Tuya DP Frame (Cluster 0xEF00)

```
ZCL Header:
  [frameControl:1][sequenceNum:1][commandId:1]

Tuya DP Payload:
  [status:1]      -- 0=success, 1=invalid
  [transId:1]     -- Transaction ID
  [dpId:1]        -- Data Point ID (1-255)
  [dpType:1]      -- 0=raw, 1=bool, 2=value, 3=string, 4=enum, 5=bitmap
  [dataLen:2]     -- Data length (BE)
  [data:N]        -- Actual data
```

### Multi-DP Frame

Some devices pack multiple DPs into a single Zigbee frame. TuyaDPParser.parseMultiple() handles this:

```
Frame 1: [dpId1][dpType1][len1][data1]
Frame 2: [dpId2][dpType2][len2][data2]
...
Frame N: [dpIdN][dpTypeN][lenN][dataN]
```

## MCU UART Header Detection

Some devices bridge through an MCU with UART serial communication. The TuyaDPParser detects these:

```
UART Header: 0x55 0xAA
Followed by: [command:1][dataLen:2][data:N][checksum:1]
```

If `0x55 0xAA` is detected at the start of a DP payload, the parser switches to UART mode.

## MCU Time Sync Debugging

### Time Sync Command Flow
```
Device sends time request (cmd 0x24) -> L5 (GlobalTimeSyncEngine)
  -> TuyaTimeSyncFormats.detectFormat() or guessFormat()
  -> Build appropriate payload (23 format variants)
  -> Send response (cmd 0x24) with correct format
  -> If ZT08: write DP17 false as commit trigger
```

### Debugging Time Sync Issues

1. **Check manufacturer format mapping**: `TuyaTimeSyncFormats.MANUFACTURER_FORMAT_MAP`
2. **Check guessFormat() output**: Call `TuyaTimeSyncFormats.guessFormat(deviceInfo)` to see ranked candidates
3. **Check payload size**: MCU v3.3+ requires 10-byte response; v3.1 uses 8-byte
4. **Check sequence echo**: Modern firmware requires sequence number echo in response
5. **Check epoch**: Most devices use epoch 2000 (946684800 offset from 1970)
6. **Check endianness**: Most Tuya MCU uses Big-Endian; some modules use Little-Endian
7. **Check timezone**: LCD sensors may need LOCAL time; smart devices need UTC + TZ DP

### Time Sync Log Messages
```
L5 [TimeSync] Format detected: tuya_dual_2000 (confidence: 85%)
L5 [TimeSync] Building payload for manufacturer: _TZE284_vvmbj46n
L5 [TimeSync] Sending 8-byte dual timestamp: [Local:4BE][UTC:4BE]
L5 [TimeSync] Time sync complete, device clock updated
```

### Common Time Sync Failures
| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Clock still wrong after sync | Wrong format selected | Check guessFormat() output, try fallback chain |
| Device ignores response | Payload size mismatch | v3.3+ needs 10 bytes; check MCU version |
| Clock drifts after sync | Missing DP17 commit | ZT08 devices need DP17 write after time sync |
| 56-year offset | Wrong epoch | Device expects epoch 1970, got 2000 (or vice versa) |
| Time off by timezone | UTC vs LOCAL confusion | Check if device needs UTC or LOCAL time |

## DataQuery Mechanism

Sleepy battery devices may not report data continuously. The ZigbeeDataQuery module sends periodic dataQuery requests to poll the device:

- **Default interval**: 60 seconds for battery devices
- **Configurable per device**: Via device profile in `lib/registry/profiles/`
- **Trigger**: After device init + on capability listener registration

## SanityFilter (L11) Raw Data Processing

The SanityFilter applies noise reduction to raw DP values:

### EMA (Exponential Moving Average)

```javascript
// Alpha = 0.3 (smoothing factor)
filtered = alpha * newValue + (1 - alpha) * previousFiltered
```

Used for: temperature, humidity, pressure, air quality values

### ROC (Rate of Change) Filter

```javascript
// Threshold = 15% max change per update
if (Math.abs(newValue - previousValue) / previousValue > 0.15) {
  // Reject as noise
  return previousValue;
}
```

Used for: position values, battery percentage, power readings

### Filter Configuration

| Parameter | Default | Range | Purpose |
|-----------|---------|-------|---------|
| EMA alpha | 0.3 | 0.1-0.9 | Smoothing factor (higher = more responsive) |
| ROC threshold | 15% | 5-50% | Max allowed change per update |
| Debounce window | 200ms | 100-500ms | Button press deduplication |
| Dedup window | 1.5s | 0.5-5s | Flow trigger deduplication |

## Debugging Common Issues

### Device Not Responding to Commands

1. **Check frame capture**: Are commands being sent on the correct endpoint?
2. **Check cluster binding**: Is the device bound to the correct cluster (0xEF00 vs 0x0006)?
3. **Check throttle limits**: RX: 120/min, TX: 30/min per device
4. **Check markAppCommand**: Are you calling `this.markAppCommand()` before sending?

### Incorrect Values

1. **Check DP type**: Is it Value (÷10), or String (parse needed)?
2. **Check divisor**: Use SmartDivisorManager for auto-detection
3. **Check for double-division**: Both AdaptiveDataParser and dpMappings dividing?
4. **Check SanityFilter**: Is the EMA/ROC filter rejecting valid values?

### Phantom Triggers

1. **Check PhysicalButtonMixin**: Is markAppCommand() being called before app commands?
2. **Check 2000ms window**: Hardware echoes within 2000ms of app commands are filtered
3. **Check deduplication**: 200ms debounce + 1.5s sliding window for flow triggers

## Utility Scripts

```bash
# Analyze device fingerprints
node scripts/automation/auto-enrich-db.js

# Check DP mapping health
node scripts/validation/check-fingerprint-health.js

# Audit flow cards
node scripts/automation/audit-flowcards.js

# Analyze collisions
node scripts/automation/analyze-collisions.js
```

---

*Generated by Claude Code - 15 June 2026 | Version 9.0.36*
