# Add Bseed Touch Dimmer Driver

## Overview
This PR adds a dedicated driver for Bseed touch dimmer wall switches, which were previously incorrectly handled by the generic `dimmer_wall_1gang` driver meant for retrofit modules.

## Devices Supported
- **Bseed Touch Dimmer Switch** 
  - Manufacturer IDs: `_TZE200_3p5ydos3`, `_TZE204_n9ctkb6j`
  - Model: TS0601

## Features
### Basic Functionality
- ✅ On/Off control
- ✅ Dimming (0-100%)
- ✅ State synchronization with physical button presses

### Flow Cards (NEW)
**Triggers:**
- Device turned on (physical button)
- Device turned off (physical button)
- Brightness increased (physical button)
- Brightness decreased (physical button)

**Conditions:**
- Is on/off (auto-generated from capabilities)

**Actions:**
- Turn on/off (auto-generated from capabilities)
- Set brightness (auto-generated from capabilities)

## Use Case
These flow triggers enable automation scenarios like:
- When physical dimmer is turned on → turn on other smart lights
- When brightness is increased → increase brightness of Hue lights
- Sync wall switch with lights not physically connected to it

## Technical Implementation
- Extends `TuyaSpecificClusterDevice` base class
- Uses Tuya-specific cluster (0xEF00) with datapoint protocol
- Datapoints:
  - DP 1: On/Off state (boolean)
  - DP 2: Brightness level (value, 10-1000 range)
- Detects physical button presses via Tuya 'reporting' events

## Bug Fixes Included
Fixed systematic issue with duplicate flow card IDs across the app:
- Multiple drivers had flow cards with generic IDs like `turn_on`, `turn_off`
- Homey validation now enforces unique IDs across the entire app
- Updated all `driver.flow.compose.json` files to namespace IDs with driver prefix
- Example: `turn_on` → `air_purifier_turn_on`, `dimmer_3gang_turn_on`, etc.

## Files Changed
### New Driver
- `drivers/switch_dimmer_1gang/device.js`
- `drivers/switch_dimmer_1gang/driver.js`
- `drivers/switch_dimmer_1gang/driver.flow.compose.json`
- `drivers/switch_dimmer_1gang/assets/images/*`

### Fingerprint Updates
- `lib/NewDevices2025.js`
- `lib/tuya/DeviceFingerprintDB.js`
- `lib/data/new_fingerprints.js`
- `lib/data/smart_fingerprints.js`

### Flow Card Fixes
- Updated multiple `drivers/*/driver.flow.compose.json` files
- `app.json` (generated from compose files)

## Testing
- ✅ Device pairing successful
- ✅ On/Off control works
- ✅ Dimming works (full range 0-100%)
- ✅ Physical button presses detected
- ✅ Flow triggers fire correctly
- ✅ No validation errors

## Breaking Changes
None. Existing devices will continue to work. Users with these devices can migrate to the new driver for better functionality.

## Screenshots
[Add screenshots of the device in Homey and flow examples]

## Related Issues
- User report: Bseed dimmers not working since v5.5.690
- Devices were pairing as generic/unknown

---

**Reviewer Notes:**
The bulk of the diff is the flow card ID fixes which affect many drivers. The core new functionality is isolated to `/drivers/switch_dimmer_1gang/`.
