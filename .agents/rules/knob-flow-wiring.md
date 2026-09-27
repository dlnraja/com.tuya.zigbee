---
description: P2448/P2449 rotary knob command mode + declared flow card wiring (fleet)
globs:
  - drivers/smart_knob*/**
  - drivers/button_wireless*/**
  - lib/mixins/SmartKnobRotationMixin.js
  - lib/flow/DeclaredFlowCardAutoWire.js
  - lib/zigbee/DeviceOperatingMode.js
  - lib/devices/ButtonDevice.js
  - lib/FlowCardHelper.js
  - config/architecture/rotary-knob-ssot.json
alwaysApply: false
---

# Knob + declared flow wiring (P2448 / P2449)

Full SSOT: `docs/architecture/KNOB_FLOW_WIRING_SSOT.md` · machine: `config/architecture/rotary-knob-ssot.json`

## Absolute rules

1. **Sacred couple only** — lock `manufacturerName` + `productId`. Never invent pid.
2. **Rotary = command/dimmer** — ERS-10 / ZG-101ZD / `smart_knob_rotary` → `0x8004=0` + levelControl. Never scene-force via `/smart_knob/` catch-all.
3. **P2439 exception** — `kaflzta4` / `ja5osu5g` / `an5rjiwd` stay **scene**.
4. **SDK3** — `getDeviceTriggerCard(id)` one arg only. Never `(id, 'trigger')`.
5. **Declare ⇒ wire** — every `scene_recall` / `set_brightness` / `brightness_changed` / `rotate_*` in `driver.flow.compose.json` must be registered and fired from device/driver or `DeclaredFlowCardAutoWire`.
6. **No rotate invent** — do not add `button.rotate_*` to plain button remotes; knobs only.
7. **dim on knobs** — ButtonDevice forbids `dim` by default; knob devices use `SmartKnobRotationMixin` to allow it.
8. **Dual-app BOTH** — reliability; backport to `stable-v5` surgically when publishing.
9. **Forum** — SHADOW only; never auto-post.

## Commands

```bash
npm run check:p244x
```

## Anti-patterns

- Writing `32772: 1` / scene-force on rotary drivers
- Putting `abrsvsou`/`4fjiwweb` in `KNOB_MFR`
- Compose flow cards with empty `registerRunListener` forever
- `set_brightness` passing 0–100 into Homey `dim` without `/100`
