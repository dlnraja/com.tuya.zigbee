# ⏰ TIME SYNCHRONIZATION - TUYA ZIGBEE DEVICES

## Overview
Tuya Zigbee devices require time synchronization for proper operation, especially:
- Thermostats
- Climate sensors
- Scheduled devices
- Devices with logs/history

## Technical Details

### Zigbee Time Cluster (0x000A)
- **Attribute 0x0000**: time (uint32) - Seconds since 2000-01-01 00:00:00 UTC
- **Attribute 0x0001**: timeStatus (bitmap8) - Master/Synchronized status

### Implementation
```javascript
// Calculate Zigbee epoch time
const zigbeeEpochStart = new Date('2000-01-01T00:00:00Z').getTime();
const currentTime = Date.now();
const zigbeeTime = Math.floor((currentTime - zigbeeEpochStart) / 1000);

// Write to device
await this.zclNode.endpoints[1].clusters.time.writeAttributes({
  time: zigbeeTime,
  timeStatus: {
    master: true,
    synchronized: true
  }
});
```

### Periodic Sync
Time is re-synchronized every 24 hours to prevent drift.

## Affected Drivers
24 critical drivers + 135 universal implementation

## Benefits
✅ Accurate scheduling
✅ Proper timestamps in logs
✅ Thermostat programs work correctly
✅ Energy tracking accurate
✅ Device stability improved

## Non-Critical
Time sync failures are non-blocking. Devices will still function if time cluster not supported.

---
*Implemented: 2025-10-25T16:31:41.956Z*
