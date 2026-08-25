# Bidirectional Button System - Implementation Guide

> Canonical runtime doctrine for Universal Tuya Zigbee (`com.dlnraja.tuya.zigbee`).
> Cross-ref: `docs/knowledge/TS004X_BATTERY_REMOTES.md` · P2253/P2254.

## Overview

The Universal Tuya Zigbee app implements a **bidirectional button system** that prevents double-triggering and keeps state synchronized between physical presses and virtual Homey app presses.

## Architecture

### Key Components

1. **VirtualButtonMixin** (`lib/mixins/VirtualButtonMixin.js`)
   - Handles app-initiated button presses
   - Registers capability listeners for `button.toggle`, `button_dim_up`, etc.
   - Records virtual button events with timestamps
   - v5.5.999: state tracking (packetninja pattern)
   - **Must** route capability updates through `safeSetCapabilityValue()` / markAppCommand (never raw `setCapabilityValue('button', …)`)

2. **PhysicalButtonMixin** (`lib/mixins/PhysicalButtonMixin.js`)
   - Detects physical presses (ZCL scenes / onOff / multistateInput / **mfr 0xFD** / E000 / optional EF00 RX)
   - Triggers Homey flow cards
   - Scene-mode **writes** only when `DeviceOperatingMode.writeSceneAttr === true` (TS004F)
   - Profile flag `skip8004` is an **active gate** (P2254)

3. **ButtonDevice** (`lib/devices/ButtonDevice.js`)
   - Base class combining both mixins
   - Central `triggerButtonPress()` + reverse_button_order
   - Scene mode switching for **TS004F only** (never TS0041–44)

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
// v5.7.14 / P92.115: Bidirectional deduplication
this._virtualPhysicalDedup = {
  lastVirtualPress: {},   // { button: timestamp }
  lastPhysicalPress: {},  // { button: timestamp }
  dedupWindow: 2000       // 2s window (default in ButtonDevice + mixins)
};
```

- Physical press within window of virtual → skip physical flow (avoid echo)
- Virtual press within window of physical → skip virtual (avoid double)

## Scene Mode Implementation

### TS004F Scene Mode (NOT TS0044)

**TS004F** has two hardware modes:
- **Dimmer / command Mode**: brightness up/down/step
- **Scene / event Mode**: single / double / long press

**TS0041–TS0044** are multi-endpoint OnOff remotes. They stay in scene/multi-press behaviour **without** software `0x8004`. Writing attr `32772` on TS0044 logs `not a valid attribute` and **kills physical presses** (meter91 / P2253).

| Pid | Write genOnOff 0x8004? | Homey `button_mode` |
|-----|------------------------|---------------------|
| TS0041–44 | **No** (`writeSceneAttr: false`) | Default **scene** (UI hint) |
| TS004F | Yes (0=dimmer, 1=scene) | Auto / scene / dimmer |
| Exceptions (reject even if labelled TS004F) | `_TZ3000_xffhmvhv`, `_TZ3000_kfu8zapd`, `_TZ3000_xabckq1v` | Skip write |

### Mode Switching (TS004F only)

```javascript
// Prefer DeviceOperatingMode.applyDesiredMode(device, zclNode)
// Raw form (TS004F only):
const MODE_ATTRIBUTE = 0x8004; // 32772
const SCENE_MODE = 1;
await onOffCluster.writeAttributes({ [MODE_ATTRIBUTE]: SCENE_MODE });
```

### Sacred couples (TS0044 → scene_switch_4)

| Couple | Driver | Note |
|--------|--------|------|
| `_TZ3000_zgyzgdua` + TS0044 | `scene_switch_4` | meter91 — no 0x8004 |
| `_TZ3000_wkai4ga5` + TS0044 | `scene_switch_4` | Moes — no 0x8004 |
| `_TZ3000_kfu8zapd` + TS0044 | `button_wireless_4` | skip 0x8004 |

Blue LED on remotes (if present) = pairing / leave-network blink only — **not** Homey-controllable.

## Virtual Button Flow

1. User presses virtual button in Homey app
2. `VirtualButtonMixin._handleVirtualToggle(gang)` (or UI `button.N` → NamedButtonFallback)
3. Event recorded: `_recordVirtualButtonEvent(gang, 'toggle', data)`
4. Timestamp → `_virtualPhysicalDedup.lastVirtualPress[gang]`
5. `markAppCommand` / command sent (ZCL or Tuya DP)
6. Capability updated via `safeSetCapabilityValue()`

## Physical Button Flow

1. Device sends ZCL / Tuya mfr **0xFD** / E000 / optional EF00 RX / raw frame
2. `PhysicalButtonMixin` / `OnOffBoundCluster` / `scene_switch_4` parallel wrappers detect it
3. Dedup: if virtual press within `dedupWindow`, skip
4. `triggerButtonPress` → declared flow cards only (FLOW-GUARD)
5. Typical IDs: `{driver}_physical_gang{N}_{on|off|single|double|long|triple}`

Dominant path for battery remotes (TS0041–44): **genOnOff manufacturer cmd 0xFD** per endpoint — not Homey native toggles.

## Multi-Gang Support

### Capability Naming Convention
- Gang 1: `onoff` (**not** `onoff.gang1`)
- Gang 2: `onoff.gang2`
- Gang 3: `onoff.gang3`
- Gang 4: `onoff.gang4`

### Virtual Button Capabilities
- `button.toggle` — single gang
- `button.toggle_1` … `button.toggle_8` — multi-gang
- UI tiles: `button.1` … `button.N` (TuyaZigbeeDevice listeners + VirtualButtonMixin)

## Protocol Detection

### ZCL-Only Mode (BSEED / zcl_only)
Never force leftover EF00 TX on these:

```javascript
// Sacred zcl_only examples (.cursorrules)
'_TZ3000_l9brjwau', '_TZ3000_blhvsaqf', '_TZ3000_ysdv91bk',
'_TZ3000_hafsqare', '_TZ3000_e98krvvk', '_TZ3000_iedbgyxt',
'_TZ3000_cauq1okq', '_TZ3000_w5xztuy7'
```

### Tuya DP Mode
- `_sendTuyaDP(dp, datatype, value)`
- DP1–8: gang states · DP14: power-on · DP15: backlight (`off`/`normal`/`inverted` strings)

### Hybrid Mode
- Listen on **both** ZCL and Tuya paths (`IntelligentProtocolDetect` HYBRID)
- Cascade TX: ZCL → Tuya DP → safe capability set
- Pure ZCL remotes: **EF00 RX listen OK, never force EF00 TX**

## Common Issues & Solutions

### "Driver Not Initialized"
**Cause:** Exception in `onNodeInit()`  
**Fix:** try/catch around init; ensure `super.onNodeInit()` completes

### Virtual Buttons Not Working
**Cause:** Missing listeners / wrong endpoint  
**Fix:** `initVirtualButtons()` after `super.onNodeInit()`; use `safeSetCapabilityValue`

### Physical Buttons Not Triggering Flows
**Cause (TS0041–44):** Missing **0xFD BoundCluster** / magic `0xFFDE=0x13` / wrong driver — **not** missing 0x8004  
**Cause (TS004F):** Mode stuck in dimmer → `_universalSceneModeSwitch` / `applyDesiredMode`  
**Fix:** Bind OnOff EP1..N + OnOffBoundCluster; skip wake 0x8004 for endpoint remotes

### Double Triggers
**Cause:** Dedup window missing or too short  
**Fix:** Init `_virtualPhysicalDedup` before any press (`dedupWindow: 2000`)

### First Press After Sleep Ignored
**Cause:** Missing Tuya genBasic magic setup  
**Fix:** `TuyaMagicPacket` write `0xFFDE=0x13` on wake/configure

## Flow Card Naming Patterns

### Physical Button Triggers
- Single gang: `{driver}_physical_{on|off|single|double|long|triple}`
- Multi-gang: `{driver}_physical_gang{N}_{on|off|single|double|long|triple}`
- No `titleFormatted` with `[[device]]` (Homey selection bug)

### Scene / matrix (when declared on driver)
- Prefer declared cards only — never invent speculative IDs (FLOW-GUARD spam)

## References

- Z2M TS004F: https://github.com/Koenkk/zigbee2mqtt/discussions/7158
- ZHA scene mode: https://github.com/zigpy/zha-device-handlers/issues/1372
- Hubitat TS004F: https://github.com/kkossev/Hubitat/blob/main/Drivers/Tuya%20TS004F/TS004F.groovy
- Local: `docs/knowledge/TS004X_BATTERY_REMOTES.md` · `lib/zigbee/DeviceOperatingMode.js`
