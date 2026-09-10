# Knob + declared flow wiring SSOT (P2448 / P2449)

Machine SSOT: [`config/architecture/rotary-knob-ssot.json`](../../config/architecture/rotary-knob-ssot.json)  
Dual-app: **BOTH** (`config/architecture/dual-app-tracks.json` → `p2448_*` / `p2449_*`)  
Resilience: `config/resilience/critical-gaps.json` → `rotary_knob_command_mode` + `declared_flow_card_wiring`

## WHY (P215)

| | |
|--|--|
| **Pourquoi** | Homey forced TS004F scene (`0x8004=1`) while rotation RX is levelControl; compose declared flow cards with no `registerRunListener` / no device trigger |
| **Comment** | `DeviceOperatingMode` + `SmartKnobRotationMixin` + `DeclaredFlowCardAutoWire` at app boot |
| **Pour qui** | Homey users (rotate/press flows) + CI bots |
| **Quand** | Pair / wake / rotate / dim change / enrich cron |
| **Contre quoi** | Gates `npm run check:p244x` — regression = dead rotate or dead Flow cards |

## Rotary command mode (P2448)

- Sacred couples in `rotary-knob-ssot.json` → `family=knob`, `defaultMode=dimmer`, write `0x8004=0`
- Drivers: `smart_knob_rotary`, `smart_knob_switch`; ERS-10 mfrs on `smart_knob`
- **Stay scene (P2439):** `kaflzta4` / `ja5osu5g` / `an5rjiwd`
- **Never** add `abrsvsou` / `4fjiwweb` to `KNOB_MFR` (locked `button_wireless_4`)
- Parallel RX: levelControl step/move + genOnOff `0xFC`

## Declared flow wiring (P2449)

| Card pattern | Wire path |
|--------------|-----------|
| `*_rotate_*` / `*_press_and_rotate_*` | `SmartKnobRotationMixin` + autoWire trigger listener |
| `*_scene_recall` | `ButtonDevice` `_tryCard` driver-scoped + `FlowCardHelper` |
| `*_set_brightness` / `*_set_dim` | `DeclaredFlowCardAutoWire` + `registerBrightnessFlowCards` (0–100→0–1) |
| `*_brightness_changed` | autoWire listener + emit on `dim` via TuyaZigbeeDevice / SafeCapabilityMixin |
| `*_brightness_above` | autoWire condition |

### SDK3 rules

- `homey.flow.getDeviceTriggerCard(id)` — **one argument only**
- Never invent rotate caps on non-knob ButtonDevice drivers
- Knob subclasses may keep `dim` (mixin strips it from `_forbiddenCapabilities`)

## Gates / CI

```bash
npm run check:p2448
npm run check:p2449
npm run check:p244x
```

Hard in: `unified-ci.yml`, `syntax-check.yml`, `pr-gate.yml`, `validate.yml`, `code-quality.yml`  
Soft in: `project-resilience.yml`

## Related docs

- [`LAYERS_ENERGY_BUTTONS_FLOWS.md`](./LAYERS_ENERGY_BUTTONS_FLOWS.md)
- [`docs/knowledge/PECULIARITIES.md`](../knowledge/PECULIARITIES.md) — `p190-ers10-knob-*`
- [`.github/WORKFLOW_GUIDELINES.md`](../../.github/WORKFLOW_GUIDELINES.md) §P2448/P2449
