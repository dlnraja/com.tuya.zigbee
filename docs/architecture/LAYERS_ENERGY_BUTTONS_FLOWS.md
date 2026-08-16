# Energy / Buttons / Flows — layer contracts (P155)

Canonical runtime modules. Improve **one layer at a time**. Homey runtime does **not** self-repair or auto-swap drivers; CI publishes fixes.

## Energy

| Rule | Module |
|------|--------|
| No linear `(V-2.5)/0.5` | `BatteryMasterEngine` |
| No compose `energy.approximation` + `measure_power`/`meter_power` | `tools/ci/energy-compose-gate.js` |
| Virtual estimates never overwrite real metering | `VirtualEnergyMeterMixin` / `VirtualEnergyManager` |
| Timers | `safeSetInterval` + `_cleanupVirtualEnergy()` |
| Mains | `mainsPowered === true`; strip phantom `energy.batteries` |

Gate: `node tools/ci/energy-compose-gate.js` · `node tools/ci/layer-pass-audit.js`

## Buttons

| Rule | Module |
|------|--------|
| Virtual UI | `_safeSetCapability` + `markAppCommand` before ZCL/DP |
| Physical wall | `PhysicalButtonMixin` debounce / sliding window |
| Never raw | `setCapabilityValue('button', …)` without L14 path |
| Visual | `ButtonVisual.js` + `safeSetTimeout` |

Mixin order (switches): `PhysicalButtonMixin(VirtualButtonMixin(UnifiedSwitchBase))`

## Flows

| Rule | Detail |
|------|--------|
| IDs | Globally unique; prefer `{driver}_physical_gang{N}_{on\|off}` for wall |
| No | `titleFormatted` with `[[device]]` |
| Capability filter | Prefer capability-based cards over “every device” |

Audit: `node tools/ci/layer-pass-audit.js` (4843+ cards scanned; zero `[[device]]` as of P155)

## Auto-maintenance (honest scope)

| Layer | Owns |
|-------|------|
| GitHub Actions / `tools/ci/*` | Crawl, gates, Gmail patterns, publish |
| App runtime | Caps, timers, mixins — **not** code mutation |
| Humans / Cursor | Surgical fixes → push → Test soak |

Do **not** build Homey-side “try many drivers” or autonomous full-tree rewrite bots.
