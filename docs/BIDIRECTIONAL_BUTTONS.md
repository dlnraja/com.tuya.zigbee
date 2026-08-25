# Bidirectional Button System - Implementation Guide

## Overview

The Tuya Unified Zigbee app implements a **bidirectional button system** that prevents double-triggering and maintains state synchronization between physical button presses and virtual app button presses.

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

### TS004F Scene Mode (NOT TS0044)

**TS004F** has two hardware modes:
- **Dimmer Mode**: Buttons control brightness (up/down/step)
- **Scene Mode**: Buttons send scene commands (single/double/long press)

**TS0041–TS0044** are multi-endpoint OnOff remotes. They stay in scene/multi-press behaviour **without** software 0x8004. Writing attr 32772 on TS0044 logs `not a valid attribute` and kills physical presses (meter91 / P2253).

### Mode Switching (TS004F only)

Automatic mode switching via attribute 0x8004 on onOff cluster:
```javascript
const MODE_ATTRIBUTE = 0x8004; // 32772
const SCENE_MODE = 1;
await onOffCluster.writeAttributes({ [MODE_ATTRIBUTE]: SCENE_MODE });
```

### Affected Devices (0x8004 write — TS004F family)

From `lib/managers/ManufacturerVariationManager.js` (TS004F scene-capable IDs).
Known **exceptions** that reject 0x8004 even if labelled TS004F: `_TZ3000_xffhmvhv`, `_TZ3000_kfu8zapd`, `_TZ3000_xabckq1v` (see DeviceOperatingMode).

TS0044 sacred couples (`_TZ3000_zgyzgdua`, `_TZ3000_wkai4ga5`) → `scene_switch_4`, `writeSceneAttr: false`.

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

### TS004F Scene Mode (NOT TS0044)

**TS004F** has two hardware modes:
- **Dimmer Mode**: Buttons control brightness (up/down/step)
- **Scene Mode**: Buttons send scene commands (single/double/long press)

**TS0041–TS0044** are multi-endpoint OnOff remotes. They stay in scene/multi-press behaviour **without** software 0x8004. Writing attr 32772 on TS0044 logs `not a valid attribute` and kills physical presses (meter91 / P2253).

### Mode Switching (TS004F only)

Automatic mode switching via attribute 0x8004 on onOff cluster:
```javascript
const MODE_ATTRIBUTE = 0x8004; // 32772
const SCENE_MODE = 1;
await onOffCluster.writeAttributes({ [MODE_ATTRIBUTE]: SCENE_MODE });
```

### Affected Devices (0x8004 write — TS004F family)

From `lib/managers/ManufacturerVariationManager.js` (TS004F scene-capable IDs).
Known **exceptions** that reject 0x8004 even if labelled TS004F: `_TZ3000_xffhmvhv`, `_TZ3000_kfu8zapd`, `_TZ3000_xabckq1v` (see DeviceOperatingMode).

TS0044 sacred couples (`_TZ3000_zgyzgdua`, `_TZ3000_wkai4ga5`) → `scene_switch_4`, `writeSceneAttr: false`.

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
- Fallback chain: ZCL  Tuya DP  Direct value set

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
