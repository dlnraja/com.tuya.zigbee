# P205 — Energy / Battery / Button Flow enrichment (2026-08-17)

## Goal
Unify energy, battery %, and button commits behind L14 `safeSetCapabilityValue`, plus app-level Flow parity and targeted `physical_gang*` codegen.

## Changes
1. **L14 writers** — `UnifiedBatteryHandler` `_safeSetCap`; battery cascade/system/fallback/v3/icon via `lib/utils/safe-capability.js`; SmartBatteryManager fires `battery_percent_changed`.
2. **Button parity** — `PhysicalButtonMixin._triggerAppLevelButtonFlows` always tries `button_pressed` / `button_double_press` / `button_long_press`; VirtualButtonMixin records `virtual_button_pressed` on asymmetric path; removed `titleFormatted [[device]]` from `button_pressed`.
3. **Feature flow cards** — `battery_percent_changed`, `energy_power_above` (+ existing `battery_percent_below`, `virtual_press_button`).
4. **Codegen** — `tools/ci/ensure-physical-flow-cards.js` (dry-run default; applied on mixin drivers).
5. **Virtual energy** — `VirtualEnergyMeterMixin` assigned onto `UnifiedSwitchBase` for plug/socket/switch without real metering.
6. **Tests/gate** — `test/critical/energy-battery-button-flows.test.js`, `tools/ci/l14-capability-writers-gate.js`.

## Classification
MASTER_ONLY for flow compose / FeatureFlowCards / mixin wiring (preview soak). Battery L14 writers are BOTH-safe if backported later.
