# Raw Mode Documentation

> Last updated: 2026-06-15

When and why raw mode is needed for Tuya Zigbee devices, and how it is implemented in this app.

---

## 1. What is Raw Mode?

Raw mode (also called "active Tuya mode" or "forceActiveTuyaMode") bypasses the standard ZCL cluster handling and directly communicates with the Tuya EF00 cluster (0xEF00 = 61184) for DP (Data Point) exchange.

### When ZCL Works
- Standard Zigbee devices (OnOff, LevelControl, Metering, etc.)
- Devices that use standard ZCL clusters for all functions
- TS011F, TS0041, TS004F, TS0203, TS0202, TS0201 (basic models)

### When Raw Mode is Needed
- TS0601 devices (all Tuya DP-based)
- Devices with proprietary clusters (0xE000, 0xE001)
- Devices with non-standard DP mappings
- Devices that need active polling
- Devices with firmware quirks

---

## 2. Proprietary Clusters

### Cluster 0xE000 (Tuya EF00 / TuyaSpecificCluster)
- **Purpose**: Primary Tuya DP communication channel
- **Direction**: Bidirectional (device sends reports, coordinator sends commands)
- **Implementation**: `lib/clusters/TuyaE000Cluster.js`
- **Bound cluster**: `lib/clusters/TuyaE000BoundCluster.js`

This cluster carries all Tuya-specific Data Point (DP) commands:
- DP Report (device -> coordinator): Device sends sensor data
- DP Set (coordinator -> device): Device sends commands
- DP Get (coordinator -> device): Request current DP value
- DP Query (coordinator -> device): Request all DP values

### Cluster 0xE001 (Tuya Extended)
- **Purpose**: Extended Tuya functions (time sync, OTA, etc.)
- **Implementation**: `lib/clusters/TuyaE001Cluster.js`
- **Time sync**: Used by `GlobalTimeSyncEngine.js` for DP 0x24 time synchronization

### Cluster 0xEF00 (Tuya DP Standard)
- **Purpose**: Standard Tuya DP cluster (newer firmware)
- **Note**: Same function as 0xE000, different cluster ID used by newer Tuya modules
- **Implementation**: Handled by `TuyaEF00Manager.js`

---

## 3. Active Polling Devices

Some devices do not send periodic reports and require active polling to receive data.

### Devices That Need Active Polling
| Device Type | Polling Interval | Reason |
|-------------|-----------------|--------|
| mmWave Radar (ZY-M100) | 30-60 seconds | Radar does not send reports autonomously |
| Some TS0601 sensors | 60-120 seconds | Firmware does not enable auto-report |
| TRV (Radiator Valves) | 300 seconds | Battery saving, reports on change only |
| Smart Plugs (some variants) | 60 seconds | ZCL reporting not configured |

### Implementation
Active polling is triggered via:
1. `forceActiveTuyaMode` getter in device class
2. `TuyaEF00Manager.startPolling()` method
3. DP Get commands sent at configured intervals

### Example: Soil Sensor
```javascript
// drivers/soil_sensor/device.js
get forceActiveTuyaMode() { return true; }
get hybridModeEnabled() { return true; }
```

---

## 4. Firmware Quirk Devices

### Devices with Non-Standard DP Layouts

#### `_TZE200_9xfjixap` - ME167/AVATTO TRV
- **Quirk**: Uses completely different DP IDs than standard MOES TRV
- **Standard DP**: 1-10, 13-15, 101-109
- **ME167 DP**: 2-5, 7, 35, 36, 39, 47, 101-102
- **Detection**: Profile detection via manufacturerName in `radiator_valve/device.js`

#### `_TZE200_seq9cm6u` - Bed Sensor
- **Quirk**: DP1 presence is inverted (0=occupied, 1=unoccupied)
- **Quirk**: DP4 battery is binary (0/1) not percentage
- **Quirk**: DP104 is work_state, NOT battery
- **Fix**: Custom `_handleBatteryDP()` and `_handleCommonDP()` overrides

#### `_TZE200_u6x1zyv2` - Rain Sensor (TS0601)
- **Quirk**: DP1 rain alarm uses different boolean encoding
- **Quirk**: DP2 maps to rain level (as humidity), not standard water detection
- **Fix**: Custom dpMappings in `rain_sensor/device.js`

#### `_TZE204_clrdrnya` - mmWave Radar
- **Quirk**: 16 DPs, some are settings-only (not readable)
- **Quirk**: Mains-powered but may report battery DPs
- **Fix**: `MAINS_POWERED_RADAR` config suppresses battery capability

---

## 5. How Raw Mode Works in This App

### The 11-Layer Zigbee Pipeline

```
L0: TuyaZigbeeDevice.js (handleFrame)
    -> Raw frame interception, catches ALL cluster frames

L1: UniversalThrottleManager.js
    -> Flow control: 120 RX/min, 30 TX/min per device

L2: IntelligentProtocolRouter.js
    -> Routes ZCL frames to standard handler
    -> Routes Tuya EF00 frames to DP handler

L3: TuyaBoundCluster.js
    -> Captures Tuya-specific commands
    -> Binds to cluster 0xEF00

L4: TuyaEF00Manager.js / AdaptiveDataParser.js
    -> Decodes DP reports
    -> Parses Tuya data types (bool, value, enum, string, raw)

L5: GlobalTimeSyncEngine.js
    -> Time sync via DP 0x24
    -> Required for devices that need time-stamped data

L6: PhysicalButtonMixin.js
    -> Button deduplication (200ms debounce)
    -> Hold detection (1.5s window)

L7: BaseHybridDevice.js
    -> Maps DPs to Homey capabilities
    -> Handles capability value updates

L8: DynamicCapabilityManager.js
    -> Auto-discovers capabilities from DP reports
    -> Adds/removes capabilities dynamically

L9: SessionManager
    -> Handles fragmented IR packets
    -> Reassembles multi-part data

L10: HealthMonitor
    -> Heartbeat tracking
    -> Connection quality monitoring

L11: SanityFilter.js
    -> EMA (Exponential Moving Average) filtering
    -> Rate-of-change noise filtering
```

### Key Components for Raw Mode

#### TuyaEF00Manager (`lib/tuya/TuyaEF00Manager.js`)
- Primary DP report handler
- Decodes incoming DP values
- Routes DPs to device-specific handlers
- Manages DP polling for active-mode devices

#### AdaptiveDataParser (`lib/tuya/AdaptiveDataParser.js`)
- Detects data type from raw bytes
- Handles Tuya-specific type encoding
- Supports bool, value (int32), enum, string, and raw types

#### IntelligentProtocolRouter (`lib/protocol/IntelligentProtocolRouter.js`)
- Auto-detects whether device uses ZCL or Tuya DP
- Routes frames to appropriate handler
- Falls back to raw mode for unknown clusters

---

## 6. Device Families and Their Mode

### ZCL Only (No Raw Mode Needed)
| Family | Model | Clusters |
|--------|-------|----------|
| Switches | TS0041/TS004F/TS0044 | OnOff (0x0006) |
| Plugs | TS011F | OnOff + Electrical (0x0B04) + Metering (0x0702) |
| Door/Window | TS0203 | IAS Zone (0x0500) |
| Motion | TS0202 | IAS Zone (0x0500) |
| Temp/Humidity | TS0201 | Temperature (0x0402) + Humidity (0x0405) |
| Dimmers | TS1101 | OnOff + Level (0x0008) |

### Tuya DP (Raw Mode Required)
| Family | Model | Cluster | DPs |
|--------|-------|---------|-----|
| All TS0601 | TS0601 | 0xEF00 | 1-114+ |
| Curtain | TS0601 | 0xEF00 | DP1 (position), DP2 (motor) |
| TRV | TS0601 | 0xEF00 | DP1-DP109 (varies by profile) |
| Dimmer | TS0601 | 0xEF00 | DP1 (onoff), DP2 (brightness) |
| IR Remote | TS0601/TS1201 | 0xEF00 | DP1 (system), DP2 (IR code) |
| Air Purifier | TS0601 | 0xEF00 | DP1-DP102 (fan, filter, air quality) |

### Hybrid (ZCL + Tuya DP)
| Family | Model | ZCL Clusters | DP Clusters |
|--------|-------|-------------|-------------|
| Some Sensors | TS0601 | Basic (0x0000) | 0xEF00 |
| Some Plugs | TS011F | OnOff + Metering | 0xEF00 (for config) |
| Some Switches | TS0002 | OnOff (multi-endpoint) | 0xEF00 (for mode) |

---

## 7. How to Identify Raw Mode Devices

### In Device Interview
Look for these indicators:
- Endpoint 1 has input cluster `61184` (0xEF00)
- Model ID is `TS0601`
- ManufacturerName starts with `_TZE200_`, `_TZE204_`, `_TZE284_`, `_TYZB01_`

### In Code
Check if the device class extends:
- `TuyaUnifiedDevice` (always raw mode)
- `UnifiedSensorBase` with `dpMappings` (raw mode for DP data)
- `TuyaZigbeeDevice` (raw frame interception)

### In Logs
Look for:
```
[EF00] DP report: dp=1, type=bool, value=true
[DP] Received: DP1 = 1 (presence)
[TUYA] Active mode polling started
```

---

## 8. Raw Mode vs ZCL Performance

| Metric | ZCL | Raw Mode (Tuya DP) |
|--------|-----|-------------------|
| Latency | ~50ms | ~100-200ms |
| Battery impact | Low | Medium (polling) |
| Data richness | Standard attributes | Custom DPs (up to 114+) |
| Setup complexity | Automatic | Requires DP mapping |
| Reliability | High | Medium (firmware dependent) |

---

## 9. Common Raw Mode Issues and Solutions

### Issue: Device sends DPs but no capabilities update
**Solution**: Check `dpMappings` in device.js. Ensure DP IDs match what the device actually sends.

### Issue: Device needs polling but doesn't respond
**Solution**: Check `forceActiveTuyaMode` is true. Verify polling interval is reasonable (30-120s).

### Issue: Battery drains quickly in raw mode
**Solution**: Increase polling interval. Use `needsPolling: false` for devices that report autonomously.

### Issue: Data type mismatch (bool vs value vs enum)
**Solution**: Check Z2M converter for correct type. Use `AdaptiveDataParser` auto-detection or explicit type in dpMappings.

---

*Generated by Claude Code - 15 June 2026*
