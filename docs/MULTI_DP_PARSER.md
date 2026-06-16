# Multi-DP Parser Documentation

## Overview
The TuyaDPParser (L4 in the 11-layer pipeline) handles parsing of Tuya Data Points from raw Zigbee frames. It supports both single and multi-DP frames, as well as MCU UART encapsulation.

## Key Features

### 1. Single DP Parsing
```javascript
const result = TuyaDPParser.parse(buffer);
// Returns: { dpId, dpType, dpValue }
```

### 2. Multi-DP Parsing
```javascript
const results = TuyaDPParser.parseMultiple(buffer);
// Returns: [{ dpId, dpType, dpValue }, ...]
```
Some devices send multiple DPs in a single Zigbee frame for efficiency.

### 3. MCU UART Header Detection
The parser detects Tuya MCU UART frames (0x55 0xAA prefix) and skips the 6-byte header to reach the DP payload.

```javascript
// Standard ZCL payload: [Status] [SeqNum] [DP_ID] [DP_Type] [Len_H] [Len_L] [Data...]
// MCU UART frame: [0x55] [0xAA] [Version] [Command] [Len_H] [Len_L] [DP Payload...]
```

## DP Types
| Type | ID | Description |
|------|----|-------------|
| RAW | 0x00 | Raw bytes |
| BOOL | 0x01 | Boolean true/false |
| VALUE | 0x02 | 4-byte unsigned integer |
| STRING | 0x03 | ASCII string |
| ENUM | 0x04 | 1-byte enum (0-255) |
| BITMAP | 0x05 | Bitmap flags |

## Usage in Drivers

### Standard Single DP Device
```javascript
// In device.js onNodeInit()
this.on('report', 'tuya', 'manuSpecificTuya', (report) => {
  const parsed = TuyaDPParser.parse(report.data);
  this.handleDP(parsed.dpId, parsed.dpValue);
});
```

### Multi-DP Device
```javascript
this.on('report', 'tuya', 'manuSpecificTuya', (report) => {
  const parsed = TuyaDPParser.parseMultiple(report.data);
  parsed.forEach(dp => this.handleDP(dp.dpId, dp.dpValue));
});
```

## TuyaDataQuery Module

### Purpose
Provides periodic dataQuery mechanism for sleepy battery devices that don't report DPs regularly.

### Features
- Generic `tuyaDataQuery()` for any device
- `safeTuyaDataQuery()` for sleepy devices (respects wake windows)
- Configurable delays between queries
- Multiple query methods (getData, dataQuery, mcuVersionRequest)

### Usage
```javascript
const { TuyaDataQueryMixin } = require('../../lib/tuya/TuyaDataQuery');

class MyDevice extends TuyaDataQueryMixin(UnifiedSensorBase) {
  async onNodeInit() {
    await super.onNodeInit();
    
    // Query DPs 1, 2, 3 with 200ms delay between each
    await this.tuyaDataQuery([1, 2, 3], {
      delayBetweenQueries: 200,
      logPrefix: '[MY-DEVICE]'
    });
  }
}
```

### Standalone Usage
```javascript
const { tuyaDataQuery } = require('../../lib/tuya/TuyaDataQuery');

await tuyaDataQuery(device, [1, 2, 3], {
  endpointId: 1,
  delayBetweenQueries: 200,
  silent: false
});
```

## Integration with 11-Layer Pipeline

### L2: IntelligentProtocolRouter
Routes frames to appropriate parser based on cluster ID:
- Cluster 0xEF00 (61184) -> TuyaDPParser
- Standard ZCL clusters -> ZCL parser

### L4: TuyaEF00Manager
- Receives raw frames from L2
- Calls TuyaDPParser.parse() or parseMultiple()
- Routes parsed DPs to capability mapping (L7)

### L7: BaseHybridDevice
- Receives parsed DPs from L4
- Maps DP IDs to Homey capabilities
- Updates device state via safesetCapability()

## Known Multi-DP Devices
- Some Tuya MCU devices send multiple DPs in single frame
- Radar sensors often bundle presence + distance + illuminance
- Energy meters may bundle voltage + current + power

## Troubleshooting

### Missing DPs
- Check if device uses multi-DP frames
- Enable debug logging to see raw frames
- Verify DP ID mapping in EnrichedDPMappings.js

### Incorrect Values
- Check DP type (VALUE vs ENUM vs BITMAP)
- Verify divisor handling (SmartDivisorManager)
- Check for MCU UART header (0x55 0xAA)

### Sleepy Device Issues
- Use TuyaDataQuery for periodic polling
- Respect wake windows (default 20 seconds)
- Use learning period (first 5 minutes) for calibration
