# Tuya Zigbee Time Synchronization Protocol

## Overview

This document describes the Tuya time synchronization protocol used by LCD climate sensors and other Tuya devices that display date/time on their screens.

**Version:** 5.7.47  
**Date:** 2025-02-01  
**Affected Devices:** `_TZE284_vvmbj46n`, `_TZE284_oitavov2`, TH05Z, ZG227C, and similar LCD sensors

---

## The Problem

LCD climate sensors were showing `00:00` for time and `00/00/00` for date because the time synchronization response was not correctly formatted.

### Root Cause

The Tuya mcuSyncTime protocol (command 0x24) requires the **host to echo back the device's sequence number** in the response. Without this, the device ignores the time data.

**Previous (broken) implementation:**
```
Response: [UTC:4 bytes][Local:4 bytes] = 8 bytes
```

**Correct implementation:**
```
Response: [Seq:2 bytes][UTC:4 bytes][Local:4 bytes] = 10 bytes
```

---

## Protocol Specification

### Cluster & Command

| Property | Value |
|----------|-------|
| Cluster | 0xEF00 (61184) - Tuya Manufacturer Specific |
| Command ID | 0x24 (36) - mcuSyncTime |
| Direction | Bidirectional |

### Request (Device → Host)

When the device needs time synchronization, it sends:

```
┌─────────────────┬──────────────────────────────┐
│ Byte(s)         │ Description                  │
├─────────────────┼──────────────────────────────┤
│ 0-1             │ Sequence Number (uint16 BE)  │
│ [optional 2+]   │ Additional payload (rare)    │
└─────────────────┴──────────────────────────────┘
```

The 2-byte sequence number is critical - it must be echoed back!

### Response (Host → Device)

The host must respond with:

```
┌─────────────────┬──────────────────────────────┐
│ Byte(s)         │ Description                  │
├─────────────────┼──────────────────────────────┤
│ 0-1             │ Sequence Number (uint16 BE)  │
│ 2-5             │ UTC Timestamp (uint32 BE)    │
│ 6-9             │ Local Timestamp (uint32 BE)  │
└─────────────────┴──────────────────────────────┘
Total: 10 bytes
```

### Timestamp Format

| Field | Description | Format |
|-------|-------------|--------|
| UTC | Seconds since 1970-01-01 00:00:00 UTC | Unix timestamp |
| Local | UTC + timezone offset | Unix timestamp |

**Example:**
- Current time: 2025-02-01 14:30:00 UTC
- Timezone: GMT+1 (3600 seconds)
- UTC: `1738419000`
- Local: `1738422600` (UTC + 3600)

### Big-Endian Encoding

All multi-byte values use **big-endian** byte order:

```javascript
// JavaScript example
const payload = Buffer.alloc(10);
payload.writeUInt16BE(sequenceNumber, 0);  // Bytes 0-1
payload.writeUInt32BE(utcTimestamp, 2);    // Bytes 2-5
payload.writeUInt32BE(localTimestamp, 6);  // Bytes 6-9
```

---

## Implementation Details

### Files Modified

| File | Changes |
|------|---------|
| `lib/clusters/TuyaBoundCluster.js` | Extract sequence number from mcuSyncTime request |
| `lib/clusters/TuyaSpecificCluster.js` | Update mcuSyncTime args and timeSync() method |
| `lib/tuya/TuyaTimeSyncManager.js` | Build 10-byte payload with sequence number |

### Sequence Number Extraction

The sequence number can be found in different places depending on how the frame is received:

```javascript
// From parsed command args
sequenceNumber = data?.payloadSize ?? 0;

// From raw frame buffer
if (frame.data && Buffer.isBuffer(frame.data) && frame.data.length >= 2) {
  sequenceNumber = frame.data.readUInt16BE(0);
}

// From payload array
if (Array.isArray(payload) && payload.length >= 2) {
  sequenceNumber = (payload[0] << 8) | payload[1];
}
```

### Time Calculation

```javascript
const now = new Date();

// UTC timestamp (seconds since Unix epoch 1970)
const utcTimestamp = Math.floor(now.getTime() / 1000);

// Timezone offset in seconds (positive = east of GMT)
const timezoneOffsetSec = -now.getTimezoneOffset() * 60;

// Local timestamp
const localTimestamp = utcTimestamp + timezoneOffsetSec;
```

---

## Alternative Time Formats

Some Tuya devices use different time formats:

### ZCL Time Cluster (0x000A)

For devices with `outputClusters: [10]`:
- Uses **Zigbee Epoch (2000-01-01 00:00:00 UTC)**
- Delta from Unix: 946684800 seconds

```javascript
const ZIGBEE_EPOCH_OFFSET = 946684800;
const zigbeeTime = Math.floor(Date.now() / 1000) - ZIGBEE_EPOCH_OFFSET;
```

### 7-Byte Date/Time Format

Some LCD devices use a human-readable format:

```
[Year-2000][Month][Day][Hour][Minute][Second][DayOfWeek]
```

Example for 2025-02-01 14:30:00 Saturday:
```
[25][02][01][14][30][00][05]
```

### 9-Byte Extended Format

```
[UTC:4 bytes][TZ Offset:4 bytes signed][DST Flag:1 byte]
```

---

## Research Sources

1. **Tuya Developer Docs** - Serial Communication Protocol
   - https://developer.tuya.com/en/docs/mcu-standard-protocol/mcusdk-zigbee-uart-protocol

2. **Zigbee for Domoticz Wiki** - Tuya 0xEF00 Protocol
   - https://github.com/zigbeefordomoticz/wiki/blob/master/en-eng/Technical/Tuya-0xEF00.md

3. **Zigbee2MQTT Issues**
   - #28486, #28755, #29459 - mcuSyncTime failures
   - #26078 - TZE284_vvmbj46n TH05Z support

4. **Home Assistant ZHA**
   - Tuya quirks implementation

5. **Tuya Time Service Documentation**
   - https://developer.tuya.com/en/docs/iot-device-dev/rvc_time_service

---

## Debugging

### Enable Debug Logging

In device settings, enable "ZCL Time Cluster Debug Mode" to see all time sync attempts.

### Expected Log Output

```
[TIME-SYNC] 📥 EXPLICIT TIME REQUEST (cmd 0x24), seq=0x000b
[TIME-SYNC] 📤 RESPONDING TO DEVICE REQUEST...
[TIME-SYNC]    Sequence: 0x000b
[TIME-SYNC]    UTC: 2025-02-01T14:30:00.000Z
[TIME-SYNC]    Local: 2/1/2025, 3:30:00 PM
[TIME-SYNC]    Timezone: GMT+1
[TIME-SYNC]    Payload10 (with seq): 000b678abcd0678ad450
[TIME-SYNC] ✅ Response sent via TuyaEF00Manager
```

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Time stays at 00:00 | Sequence number not echoed | Update to v5.7.47+ |
| Wrong timezone | DST not handled | Check `time_sync_timezone` setting |
| Time resets after power cycle | Device didn't save time | Normal - device will request time again |

---

## Changelog

- **v5.7.47** - Fixed sequence number echo in mcuSyncTime response (10-byte format)
- **v5.5.960** - Internal version with fix implementation
- **v5.5.623** - Added intelligent delayed sync (15 min fallback)
- **v5.5.619** - Added ZCL Time Cluster support
