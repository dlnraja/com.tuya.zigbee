# `lib/` — runtime building blocks

Prefer these modules over copying logic into every `drivers/*/device.js`.  
Map: [`docs/architecture/LAYERS_CAPABILITY_PROTOCOL.md`](../docs/architecture/LAYERS_CAPABILITY_PROTOCOL.md) · [`LAYERS_ENERGY_BUTTONS_FLOWS.md`](../docs/architecture/LAYERS_ENERGY_BUTTONS_FLOWS.md)

## Where to change what

| Concern | Start here |
|---------|------------|
| Battery % / voltage / anti-flood | `battery/BatteryMasterEngine.js` |
| Virtual energy estimates | `mixins/VirtualEnergyMeterMixin.js` |
| Virtual / physical buttons | `mixins/VirtualButtonMixin.js`, `mixins/PhysicalButtonMixin.js` |
| Tuya EF00 / DP | `tuya/` (managers), device `dpMappings` |
| Divisors / double-division | `managers/SmartDivisorManager.js` |
| Pairing overlay (capped) | `dynamic/LiveDataUpdater.js` |
| Wrong-driver registry | `pairing/UserMisattributionRegistry.js` + `data/user-misattribution-registry.json` |
| Fingerprint match | `utils/fingerprint-matcher.js` |
| Safe timers | `utils/safe-timers.js` |
| Capability write (L14) | `safeSetCapabilityValue` on device bases |

## Rules of thumb

- Settings: `zb_model_id`, `zb_manufacturer_name` (not camelCase).
- No linear battery `(V - 2.5) / 0.5`.
- No raw `setCapabilityValue('button', …)` for virtual UX — use mixin path + `markAppCommand`.
- Mains: `mainsPowered === true`; do not mix `energy.approximation` with `measure_power`/`meter_power` in compose.
- Homey runtime does **not** self-patch drivers; CI publishes fixes to Test.
