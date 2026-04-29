# Zigbee & Tuya Technical Rules

## 1. Tuya Protocol Stack
- Cluster 0xEF00: Tuya-specific ZCL cluster
- DP Types: Raw(0x00), Bool(0x01), Value(0x02), String(0x03), Enum(0x04), Bitmap(0x05)
- Commands: 0x00(DP report), 0x02(DP set), 0x24(time sync)

## 2. Manufacturer Name Rules
- One manufacturerName can have MULTIPLE productIds, device types, DP mappings
- manufacturerName + productId = BOTH required for fingerprint matching
- No wildcards in SDK3
- Case-insensitive matching via CaseInsensitiveMatcher

## 3. Physical Button Detection
- Physical press: attr.onOff reports from device (RX path)
- App press: setOn()/setOff() calls (TX path)
- Suppression window: _suppressUntil prevents echo detection
- Multi-gang: onoff.1, onoff.2, etc.

## 4. Energy & Battery
- Dual power devices: mains + battery backup
- Do NOT remove measure_battery from mains devices
- BVB filter for invalid readings

## 5. Time Sync
- Cluster 0x000A (Time)
- TuyaTimeSyncHandler centralizes logic
- MCU devices need periodic sync (24h)

## 6. SDK3 Rules
| Rule | Description |
|------|-------------|
| 21 | Multi-gang flow cards use capability filtering |
| 24 | Case-insensitive matching |
| 26 | NaN Guard (safeParse) |
| 27 | Flow card IDs globally unique |
| 28 | Clean ALL refs when removing drivers |
| 29 | [[device]] in ALL language variants |
| 30 | No wildcards in manufacturerName |
| 31 | TuyaZigbeeDevice from lib/tuya/ |
| 32 | Settings keys use snake_case |

## 7. Error Handling
- NaN Safety: safeParse(data.value, 0)
- Flow Card Safety: try-catch on all triggers
- Circuit Breaker: 3 failures = skip 5min

## 8. Silent Operation Doctrine
- NO automatic forum posting
- Project continues silently
- All enrichment done without notifying forum
