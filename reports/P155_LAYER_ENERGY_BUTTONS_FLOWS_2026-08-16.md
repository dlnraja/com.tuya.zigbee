# P155 — Layer pass: energy → buttons → flows (2026-08-16)

## Scope (pragmatic)
Implement/harden **one feature family at a time**. Re-study regressions vs tip.  
**Refuse:** Homey self-repair bots, Z2M multi-driver try, full history rewrite of all versions.

## Audit baseline (`layer-pass-audit.js`)

| Layer | Result |
|-------|--------|
| Energy approx+power conflicts | **0** |
| Linear battery formulas in drivers | **0** |
| Raw `setCapabilityValue('button'` without safe path | **0** |
| Flow `[[device]]` titleFormatted | **0** / 4843 cards |
| Mixin contract virtual/physical | OK |

## Energy (done this pass)

1. `VirtualEnergyMeterMixin` — `safeSetInterval` + `_cleanupVirtualEnergy()`
2. `VirtualEnergyManager` — same safe timer path; drop shebang (library, not CLI)
3. Strip phantom `energy.batteries` from mains compose:  
   `plug_smart`, `switch`, `usb_outlet_advanced`, `module_mini_switch`, `dimmer_wall_1gang`, `switch_usb_dongle`
4. Docs: `docs/architecture/LAYERS_ENERGY_BUTTONS_FLOWS.md`
5. Test: mixin coverage asserts `_cleanupVirtualEnergy`

## Buttons (verified)

- `VirtualButtonMixin` / `PhysicalButtonMixin` / `ButtonVisual` already on L14 + markAppCommand + safe timers (P145/P148).
- No driver raw button setters found — **no code change** this pass.

## Flows (verified + note)

- Zero `[[device]]` bugs.
- Same card id reused as trigger+condition+action inside a few **hybrid** plug drivers — report-only (renaming breaks user flows; hybrids already deprecated path). Next pass: unique IDs only on non-deprecated drivers if Athom complains.

## Explicit non-goals

- Reimplement “everything that disappeared” from all historical versions in one go.
- Autonomous Homey runtime maintenance that mutates drivers.
- Forum feature roadmaps.

## Next layer sessions

1. Dual-claim triage (lights/buttons) — compose
2. Remaining battery+power generics (`device_generic_*`, `climate_sensor_energy`) — case-by-case
3. Stable backport of timer/energy harden after soak
