# Time Sync - Technical Documentation

## Overview

Tuya TS0601 LCD climate sensors (like `_TZE284_vvmbj46n` TH05Z) require time synchronization for their LCD display to show correct date/time.

## Zigbee Architecture

| Cluster | Direction | Role |
|---------|-----------|------|
| Time (0x000A) INPUT | Server | Provides time to clients |
| Time (0x000A) OUTPUT | Client | **Requests** time from server |
| Tuya (0xEF00) | Bidirectional | mcuSyncTime (0x24) commands |

### Device Interview Analysis

```
outputClusters: [25, 10]
```

- Cluster 10 = ZCL Time = Device **REQUESTS** time (client role)
- Device does NOT accept passive time writes
- **Must respond to device requests**

## Implementation (v5.5.448)

### 1. Tuya BoundCluster (0xEF00)

```javascript
// Listen for mcuSyncTime (0x24) requests
class TimeSyncBoundCluster {
  mcuSyncTime(payload) {
    // Device requests time  respond with [UTC:4][Local:4]
    respondToTimeSyncRequest();
  }
}
endpoint.bind('tuya', new TimeSyncBoundCluster());
```

### 2. ZCL Time BoundCluster (0x000A)

```javascript
// Listen for ZCL Time attribute reads
class ZclTimeBoundCluster {
  time(payload) {
    // Device reads time attribute  write current time
    writeZclTimeAttribute();
  }
}
endpoint.bind('time', new ZclTimeBoundCluster());
```

### 3. Time Payload Format

Per Zigbee2MQTT `tuya.ts`:

```
[UTC:4 bytes BE][Local:4 bytes BE]
```

- UTC: Seconds since 2000-01-01 00:00:00 (Tuya epoch)
- Local: UTC + timezone offset

```javascript
const TUYA_EPOCH = 946684800; // 2000-01-01
const utcTimeTuya = Math.floor(Date.now() / 1000) - TUYA_EPOCH;
const localTimeTuya = utcTimeTuya + (timezoneOffset * 60);
```

## Firmware Behavior Cases

###  Case A: Cooperative Firmware (Best)

```
[TIME-SYNC]  mcuSyncTime REQUEST received!
[TIME-SYNC]  Sent via mcuSyncTime command
 LCD displays correct time 
```

###  Case B: Hybrid Firmware (Common)

```
[TIME-SYNC]  mcuSyncTime REQUEST received!
[TIME-SYNC]  Sent via mcuSyncTime command
 Logs OK, LCD still wrong 
```

Device requests time but ignores non-Tuya gateway responses.

###  Case C: Cloud-Only Firmware

```
(No TIME-SYNC logs)
 LCD cannot be synced locally 
```

Time cluster is cosmetic; MCU only accepts cloud sync.

## Diagnostic Logs

###  Success Indicators

```
[TIME-SYNC]  mcuSyncTime REQUEST received from device!
[TIME-SYNC]  Sent via mcuSyncTime command
```

or

```
[TIME-SYNC]  ZCL Time cluster read request!
[TIME-SYNC]  ZCL Time attribute written
```

###  Warning Indicators

```
[TIME-SYNC]  No Tuya cluster - trying TuyaEF00Manager
```

 RE-PAIR device to initialize clusters properly

###  Failure Indicators

No `[TIME-SYNC]` logs at all  firmware doesn't request time

## Troubleshooting

### LCD Not Syncing

1. **RE-PAIR the device** (mandatory after app update)
2. Check logs for `mcuSyncTime REQUEST`
3. If no request logs  firmware limitation (not fixable)

### Logs Show Request But LCD Wrong

1. Verify timezone settings in device settings
2. Some firmwares ignore non-Tuya gateway responses
3. Document as "firmware limitation"

## References

- [Zigbee2MQTT Tuya Support](https://www.zigbee2mqtt.io/advanced/support-new-devices/02_support_new_tuya_devices.html)
- [Z2M Issue #26078](https://github.com/Koenkk/zigbee2mqtt/issues/26078)
- [ZHA Tuya Quirks](https://github.com/zigpy/zha-device-handlers/blob/dev/zhaquirks/tuya/__init__.py)
- [Tuya EF00 Protocol](https://github.com/zigbeefordomoticz/wiki/blob/master/en-eng/Technical/Tuya-0xEF00.md)

## Version History

| Version | Change |
|---------|--------|
| v5.5.446 | Fixed payload order [UTC:4][Local:4] |
| v5.5.447 | Added Tuya BoundCluster for mcuSyncTime |
| v5.5.448 | Added ZCL Time BoundCluster (0x000A) |
