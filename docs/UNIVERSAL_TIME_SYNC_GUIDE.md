# Universal Time Sync Guide - v5.7.50

> Complete reference for Tuya DP, ZCL, and hybrid time sync protocols

## Protocols Summary

| Protocol | Cluster | Payload | Epoch | Devices |
|----------|---------|---------|-------|---------|
| Tuya mcuSyncTime | 0xEF00 cmd 0x24 | 10 bytes | 1970 | LCD sensors |
| Tuya DP Time | 0xEF00 DP103 | 8 bytes | 2000 | Thermostats |
| ZCL Time | 0x000A | 4 bytes | 2000 | Standard ZCL |
| Tuya 7-byte | 0xEF00 | 7 bytes | N/A | Simple displays |

## 1. mcuSyncTime (0x24) - LCD Sensors

**Request:** `[seq:2]` (2 bytes)
**Response:** `[seq:2][UTC:4][Local:4]` (10 bytes) - **MUST echo seq!**

```javascript
const payload = Buffer.alloc(10);
payload.writeUInt16BE(seqNum, 0);
payload.writeUInt32BE(utcTimestamp, 2);
payload.writeUInt32BE(localTimestamp, 6);
```

Devices: `_TZE284_vvmbj46n`, `_TZE284_oitavov2`, TH05Z, ZG227C

## 2. Tuya Dual Timestamp (8 bytes, epoch 2000)

**Format:** `[Local:4 BE][UTC:4 BE]` - epoch 2000
```javascript
const EPOCH_2000 = 946684800;
const zigbeeUtc = Math.floor(Date.now()/1000) - EPOCH_2000;
```

Devices: `_TZE200_yjjdcqsq`, `_TZE204_*` thermostats

## 3. ZCL Time Cluster (0x000A)

**Epoch:** 2000-01-01 UTC (offset 946684800 from Unix)
```javascript
await timeCluster.writeAttributes({ time: zigbeeTime });
```

Devices: `_TZ3000_*`, TS0201, standard Zigbee sensors

## 4. Tuya 7-byte Date Format

**Format:** `[YY][MM][DD][HH][MM][SS][Weekday]`
- Year: 2000 + value
- Weekday: 1=Mon, 7=Sun

## Device Type Matrix

| Manufacturer Pattern | Format | Notes |
|---------------------|--------|-------|
| `_TZE284_*` | mcuSyncTime 10-byte | LCD with clock |
| `_TZE200_*` | Dual 8-byte or 7-byte | TS0601 devices |
| `_TZE204_*` | Dual 8-byte | Enhanced TS0601 |
| `_TZ3000_*` | ZCL 0x000A | Standard Zigbee |
| `_TZ3210_*` | ZCL 0x000A | Standard Zigbee |

## Key Files

| File | Purpose |
|------|---------|
| `lib/tuya/TuyaTimeSyncManager.js` | Main manager with hybrid strategy |
| `lib/tuya/TuyaTimeSyncFormats.js` | All payload formats + manufacturer map |
| `lib/tuya/UniversalTimeSync.js` | Universal 3-phase sync helper |
| `lib/clusters/TuyaSpecificCluster.js` | mcuSyncTime command handler |
| `lib/clusters/TuyaBoundCluster.js` | Incoming time request handler |

## Hybrid Strategy (v5.5.960)

1. **NO immediate push at init** - causes device confusion
2. **Respond to device requests** - primary method
3. **Intelligent delayed push (15 min)** - fallback for passive devices
4. **Echo sequence number** - CRITICAL for mcuSyncTime

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Clock shows wrong time | Wrong epoch (1970 vs 2000) | Check `TuyaTimeSyncFormats.detectFormat()` |
| Time sync fails silently | Missing sequence echo | Use 10-byte response with seq |
| Z2M error "Failed to sync" | Delivery failure | Device may be sleeping |
| LCD shows 00:00 | Passive device never asked | Enable intelligent delayed sync |

## Sources

- Tuya Developer Docs: developer.tuya.com
- Z2M GitHub: #28486, #28755, #30054
- ZCL Time Cluster: MCUXpresso SDK docs
- Community research: ZHA, deCONZ
