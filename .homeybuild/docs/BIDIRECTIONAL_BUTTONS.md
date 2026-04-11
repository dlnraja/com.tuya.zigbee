# Bidirectional Button System - Implementation Guide

## Overview

The Universal Tuya Zigbee app implements a **bidirectional button system** that prevents double-triggering and maintains state synchronization between physical button presses and virtual app button presses.

## Architecture

### Key Components

1. **VirtualButtonMixin** (`lib/mixins/VirtualButtonMixin.js`)
   - Handles app-initiated button presses
   - Registers capability listeners for `button.toggle`, `button_dim_up`, etc.
   - Records virtual button events with timestamps
   - v5.5.999: Enhanced with state tracking (packetninja pattern)

2. **PhysicalButtonMixin** (`lib/mixins/PhysicalButtonMixin.js`)
   - Detects physical button presses from device
   - Handles ZCL cluster events (scenes, onOff, multistateInput)
   - Triggers Homey flow cards
   - v5.12.5: Scene mode support

3. **ButtonDevice** (`lib/devices/ButtonDevice.js`)
   - Base class combining both mixins
   - Implements deduplication logic
   - Scene mode switching for TS004F/TS0044

### State Tracking Structure

```javascript
this._virtualButtonState = {
  lastEvent: null,        // Last virtual button event (any)
  totalPresses: 0,        // Total virtual button presses
  gangs: {},              // Per-gang state tracking
  history: []             // Last 10 virtual button events (circular buffer)
};
```

### Deduplication System

```javascript
// v5.7.14: Bidirectional deduplication
this._virtualPhysicalDedup = {
  lastVirtualPress: {},   // { button: timestamp }
  lastPhysicalPress: {},  // { button: timestamp }
  dedupWindow: 1500       // 1.5s window
};
```

## Scene Mode Implementation

### TS004F/TS0044 Scene Mode

These devices have **two modes**:
- **Dimmer Mode**: Buttons control brightness (up/down/step)
- **Scene Mode**: Buttons send scene commands (single/double/long press)

### Mode Switching

Automatic mode switching via attribute 0x8004 on onOff cluster:
```javascript
const MODE_ATTRIBUTE = 0x8004; // 32772
const SCENE_MODE = 1;
await onOffCluster.writeAttributes({ [MODE_ATTRIBUTE]: SCENE_MODE });
```

### Affected Devices

From `lib/managers/ManufacturerVariationManager.js`:
```javascript
const TS004F_SCENE_MODE_IDS = [
  '_TZ3000_xabckq1v', '_TZ3000_czuyt8lz', '_TZ3000_pcqjmcud',
  '_TZ3000_4fjiwweb', '_TZ3000_uri7oadn', '_TZ3000_ixla93vd',
  '_TZ3000_qzjcsmar', '_TZ3000_wkai4ga5', '_TZ3000_5tqxpine',
  '_TZ3000_abrsvsou', '_TZ3000_ja5osu5g', '_TZ3000_kjfzuycl',
  '_TZ3000_owgcnkrh', '_TZ3000_rrjr1dsk', '_TZ3000_vdfwjopk'
];
```

## Virtual Button Flow

1. User presses virtual button in Homey app
2. `VirtualButtonMixin._handleVirtualToggle(gang)` called
3. Event recorded: `_recordVirtualButtonEvent(gang, 'toggle', data)`
4. Timestamp stored in `_virtualPhysicalDedup.lastVirtualPress[gang]`
5. Command sent to device (ZCL or Tuya DP depending on protocol)
6. Capability value updated in Homey

## Physical Button Flow

1. Device sends ZCL event (cluster 4/5/6/18 or Tuya DP)
2. `PhysicalButtonMixin` detects event
3. Check deduplication: if virtual press within 1.5s, skip
4. Trigger flow card: `{driver}_physical_gang{N}_{pressType}`
5. If scene mode enabled, also trigger: `{driver}_gang{N}_scene`

## Multi-Gang Support

### Capability Naming Convention
- Gang 1: `onoff` (NOT `onoff.gang1`)
- Gang 2: `onoff.gang2`
- Gang 3: `onoff.gang3`
- Gang 4: `onoff.gang4`

### Virtual Button Capabilities
- `button.toggle` - Single gang
- `button.toggle_1` through `button.toggle_8` - Multi-gang

## Protocol Detection

### ZCL-Only Mode (BSEED devices)
```javascript
const ZCL_ONLY_MANUFACTURERS_2G = [
  '_TZ3000_l9brjwau', '_TZ3000_blhvsaqf',
  '_TZ3000_ysdv91bk', '_TZ3000_hafsqare'
];
```

### Tuya DP Mode
- Uses `_sendTuyaDP(dp, datatype, value)`
- DP1-8: Gang states
- DP14: Power-on behavior
- DP15: Backlight mode

### Hybrid Mode
- Supports BOTH ZCL and Tuya DP
- ProtocolAutoOptimizer decides best path
- Fallback chain: ZCL → Tuya DP → Direct value set

## Common Issues & Solutions

### "Driver Not Initialized" Error
**Cause**: Exception thrown in `onNodeInit()`
**Solution**: Wrap init chain in try-catch, ensure super.onNodeInit() completes

### Virtual Buttons Not Working
**Cause**: Missing capability listeners or wrong endpoint
**Solution**: Check `initVirtualButtons()` called after `super.onNodeInit()`

### Physical Buttons Not Triggering Flows
**Cause**: Missing cluster bindings or scene mode not activated
**Solution**: Verify `setupButtonDetection()` and `_universalSceneModeSwitch()`

### Double Triggers
**Cause**: Deduplication window too short or not initialized
**Solution**: Ensure `_virtualPhysicalDedup` initialized before any button presses

## Flow Card Naming Patterns

### Physical Button Triggers
- Single gang: `{driver}_physical_{on|off|single|double|long|triple}`
- Multi-gang: `{driver}_physical_gang{N}_{on|off|single|double|long|triple}`

### Scene Mode Triggers
- `{driver}_gang{N}_scene` with tokens: `{ action, gang }`

## References

- Z2M TS004F Issue: https://github.com/Koenkk/zigbee2mqtt/discussions/7158
- ZHA Scene Mode: https://github.com/zigpy/zha-device-handlers/issues/1372
- Hubitat Implementation: https://github.com/kkossev/Hubitat/blob/main/Drivers/Tuya%20TS004F/TS004F.groovy
