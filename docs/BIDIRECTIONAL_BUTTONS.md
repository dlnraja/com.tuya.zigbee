# Bidirectional Button System - Implementation Guide

> Canonical runtime doctrine for Universal Tuya Zigbee (`com.dlnraja.tuya.zigbee`).
> Cross-ref: `docs/knowledge/TS004X_BATTERY_REMOTES.md` · P2220–P2221 · P2235 · P2253/P2254 · **P2283** · **P2284**.

## Overview

The Universal Tuya Zigbee app implements a **bidirectional button system** that prevents double-triggering and keeps state synchronized between physical presses and virtual Homey app presses.

## P2283 — Permanent SSOT (`lib/utils/BidirectionalButtonState.js`)

| Helper | Rule |
|--------|------|
| `resolveGangCount(device)` | `Math.max(gangCount, buttonCount)` — remotes + wall switches |
| `stampVirtual` / `stampPhysical` | Always stamp `_virtualPhysicalDedup` (2s window) |
| `markAppCommand` + `_recordVirtualButtonEvent` | **Must** call `stampVirtual` (closes UI→physical echo) |
| `wrapHandleFrame(node, tag, handler)` | Append-only `handleFrame` chain — never blind overwrite (0xFD + IO + scene_switch) |
| NamedButtonFallback | `markAppCommand` + `safeSetCapabilityValue` (never raw setCapability alone) |
| `scene_switch_4` fallback IDs | `scene_switch_4_button_{N}_{pressed\|double\|long}` — prefer `triggerButtonPress` |

Gate: `test/critical/p2283-bidirectional-buttons-permanent.test.js` · `npm run check:p2283`

### P2284 — Chain must never orphan

| Layer tag | Role |
|-----------|------|
| `raw-l0-fallback` | Dedup/shed still calls `next(...args)`; `keepAlways` OnOff/IAS/EF00 |
| `io-passive-ef00` | Passive-arity EF00 passive |
| `physical-onoff-fd` | Manufacturer 0xFD catcher |
| `tuya-unified-p0-ef00` / `unified-sensor-p0-ef00` | Low-level EF00 parse |
| `universal-zigbee-l0` | Deep parser path always forwards |

Gate: `npm run check:p2284` · report `reports/weakness-vectors-2026-08-26/SUMMARY.md`

## Architecture

### Key Components

1. **VirtualButtonMixin** (`lib/mixins/VirtualButtonMixin.js`)
   - Handles app-initiated button presses
   - Registers capability listeners for `button.toggle`, `button_dim_up`, etc.
   - Records virtual button events with timestamps + **`stampVirtual` (P2283)**
   - **Must** route capability updates through `safeSetCapabilityValue()` / markAppCommand

2. **PhysicalButtonMixin** (`lib/mixins/PhysicalButtonMixin.js`)
   - Detects physical presses (ZCL / **mfr 0xFD** / E000 / optional EF00 RX)
   - `resolveGangCount` for EP listeners; `wrapHandleFrame('physical-onoff-fd')`
   - Scene-mode **writes** only when `DeviceOperatingMode.writeSceneAttr === true` (TS004F)
   - Profile flag `skip8004` is an **active gate** (P2254)

3. **ButtonDevice** (`lib/devices/ButtonDevice.js`)
   - Central `triggerButtonPress()` + reverse_button_order
   - Scene mode switching for **TS004F only** (never TS0041–44)

### Deduplication System

```javascript
const { ensureDedup, stampVirtual, stampPhysical } = require('../utils/BidirectionalButtonState');
// dedupWindow: 2000ms
// Physical within window of virtual → skip physical (echo)
// Virtual within window of physical → skip virtual (double)
```

**Every** virtual path (`markAppCommand`, `_recordVirtualButtonEvent`, UI `button.N`, NamedButtonFallback) must `stampVirtual`.

## Scene Mode (TS004F vs TS0041–44 — writeSceneAttr is for TS004F, NOT TS0044)

| Pid | Write genOnOff 0x8004? | Homey `button_mode` |
|-----|------------------------|---------------------|
| TS0041–44 | **No** | Default **scene** |
| TS004F | Yes (0=dimmer, 1=scene) | Auto / scene / dimmer |
| Exceptions | `_TZ3000_xffhmvhv`, `_TZ3000_kfu8zapd`, `_TZ3000_xabckq1v` | Skip write |

### Sacred couples

| Couple | Driver | Note |
|--------|--------|------|
| `_TZ3000_zgyzgdua` + TS0044 | `scene_switch_4` | meter91 — no 0x8004 |
| `_TZ3000_wkai4ga5` + TS0044 | `scene_switch_4` | Moes — no 0x8004 |
| `_TZ3000_kfu8zapd` + TS0044 | `button_wireless_4` | skip 0x8004 |
| `_TZ3000_mrpevh8p` + TS0041 | `button_wireless_1` | Peter #2202 / P2282 / **P2285** SH-SC07 |

## Virtual Button Flow

1. Homey UI / flow presses virtual control
2. `_handleVirtualToggle` or NamedButtonFallback / `button.N`
3. `_recordVirtualButtonEvent` → **`stampVirtual`**
4. `markAppCommand` → **`stampVirtual`** / ZCL or DP TX
5. `safeSetCapabilityValue()`

## Physical Button Flow

1. Device sends **0xFD** / E000 / ZCL / optional EF00
2. OnOffBoundCluster + `wrapHandleFrame('physical-onoff-fd')` (+ driver layers)
3. Dedup vs last virtual stamp
4. `triggerButtonPress` → declared flow cards only (FLOW-GUARD)
5. Re-arm 0xFD catcher on `onEndDeviceAnnounce` (P2282/P2283)

Dominant path for TS0041–44: **genOnOff manufacturer cmd 0xFD** per endpoint.

## Flow Card Naming

- Wall: `{driver}_physical_gang{N}_{on|off|…}`
- Remotes: `{driver}_button_{N}gang_button_{i}_{pressed|double|long}` or short `{driver}_button_pressed`
- `scene_switch_4`: `scene_switch_4_button_{N}_{pressed|double|long}` (+ short matrix)
- Never invent speculative IDs (FLOW-GUARD)

## Common Issues

| Symptom | Cause | Fix |
|---------|--------|-----|
| Virtual dead | Missing listeners | `initVirtualButtons` + `safeSetCapabilityValue` |
| Physical dead (TS004x) | Missing 0xFD / orphaned handleFrame | BoundCluster + wrapHandleFrame + magic packet; **not** 0x8004 |
| Double triggers | Missing virtual stamp | P2283 `stampVirtual` on all virtual paths |
| First press after sleep | Sleepy rebind / chain lost | Magic packet + announce re-arm |

## References

- Local: `lib/utils/BidirectionalButtonState.js` · `docs/knowledge/TS004X_BATTERY_REMOTES.md` · `lib/zigbee/DeviceOperatingMode.js`
- Z2M TS004F / ZHA / Hubitat TS004F drivers (external — implement silently)
