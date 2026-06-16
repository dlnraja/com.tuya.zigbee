# PositionInvert Pattern for Cover/Curtain Devices

## Overview
Some Tuya curtain motors report position values in an inverted manner:
- **Standard**: 0 = closed, 100 = open
- **Inverted**: 0 = open, 100 = closed

This document describes the positionInvert quirk and how to handle it.

## Affected Devices
- Quoya M515EGBZTN (_TZE200_gubdgai2)
- Quoya M515EGBZTN (_TZE200_vdiuwbkq)
- Other curtains with inverted position reporting

## Implementation

### Cover Profile with positionInvert
```javascript
// In lib/registry/profiles/covers.js
{
  id: 'ts0601_curtain_inverted',
  productId: 'TS0601',
  manufacturerName: [
    '_TZE200_gubdgai2', '_TZE200_vdiuwbkq'
  ],
  deviceType: 'cover',
  protocol: 'tuya_dp',
  dpMappings: {
    1: { capability: null, command: 'control', type: 'enum', values: { open: 0, stop: 1, close: 2 } },
    2: { capability: 'windowcoverings_set', type: 'value', divisor: 1 },
    3: { capability: 'windowcoverings_set', type: 'value', divisor: 1, readOnly: true },
    5: { capability: null, setting: 'direction', type: 'enum', values: { forward: 0, reverse: 1 } },
    16: { capability: null, setting: 'border', type: 'enum', values: { up: 0, down: 1, up_delete: 2, down_delete: 3, remove: 4 } }
  },
  capabilities: ['windowcoverings_set'],
  quirks: { positionInvert: true },  // <-- Key quirk
  timing: {}
}
```

### How positionInvert Works

#### Standard Curtain (positionInvert: false)
- **DP 2 (position)**: Reports 0-100 (0=closed, 100=open)
- **DP 3 (position_set)**: Accepts 0-100 (0=closed, 100=open)
- **Homey capability**: windowcoverings_set (0=closed, 100=open)
- **No transformation needed**

#### Inverted Curtain (positionInvert: true)
- **DP 2 (position)**: Reports 0-100 (0=open, 100=closed)
- **DP 3 (position_set)**: Accepts 0-100 (0=open, 100=closed)
- **Homey capability**: windowcoverings_set (0=closed, 100=open)
- **Transformation**: Invert value (100 - value)

### Code Implementation
```javascript
// In BaseHybridDevice.js or HybridCoverBase.js
handleDP(dpId, dpValue) {
  if (dpId === 2) {
    // Position report
    let position = dpValue;
    if (this.profile.quirks?.positionInvert) {
      position = 100 - position;  // Invert
    }
    this.safesetCapability('windowcoverings_set', position);
  }
}

sendPositionCommand(value) {
  let dpValue = value;
  if (this.profile.quirks?.positionInvert) {
    dpValue = 100 - value;  // Invert
  }
  this.sendTuyaCommand({ dp: 3, value: dpValue });
}
```

## Diagnostic Steps

### 1. Identify Inverted Behavior
- User reports curtain opens when they close it (and vice versa)
- Position slider shows opposite of actual position
- Check logs for DP 2 values vs actual movement

### 2. Verify Manufacturer
- Check manufacturerName against known inverted devices
- Search Z2M/ZHA for positionInvert quirk notes
- Test with both open and close commands

### 3. Check DP Mapping
- DP 2: Current position (read-only)
- DP 3: Target position (write)
- DP 1: Control command (open/stop/close)

### 4. Add to Profile
- If not already in covers.js, add manufacturerName to inverted profile
- Test with actual device
- Update data/fingerprints.json if needed

## Common Issues

### Issue: Curtain calibration lost after power loss
- Some curtains need manual calibration via DP 16 (border setting)
- Calibrate after first pairing or power loss

### Issue: Position jumps to 0 or 100
- Check if positionInvert is correctly applied
- Verify DP 2 value range (some report 0-255 instead of 0-100)

### Issue: Motor direction wrong
- Use DP 5 (direction) to reverse motor if needed
- forward: 0, reverse: 1

## Testing Checklist
1. Open curtain from closed position
2. Close curtain from open position
3. Stop curtain mid-travel
4. Set position to 50%
5. Verify position feedback matches actual position
6. Test after power cycle
7. Verify flow card triggers work correctly

## References
- lib/registry/profiles/covers.js
- lib/tuya/EnrichedDPMappings.js
- lib/tuya/tuya-universal-mapping.js
- lib/ManufacturerVariationManager.js
