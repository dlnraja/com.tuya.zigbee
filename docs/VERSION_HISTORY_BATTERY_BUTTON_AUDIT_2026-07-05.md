# Battery, Energy, and Button Version Audit - 2026-07-05

This reference captures the version-by-version findings used for the July 5 battery/button enrichment pass.

## Scope

- Runtime paths: `UnifiedBatteryHandler`, `SmartBatteryManager`, `BatteryRouter`, `TuyaLocalDevice`, `PhysicalButtonMixin`, `VirtualButtonMixin`, and button flow routing tests.
- Main risk: different historical code paths had different battery DP lists, default values, voltage parsing, and button dispatch rules.
- Result of this pass: the secondary managers now reuse the same unified battery cascade and the button rules documentation matches the current direct protocol dispatch architecture.

## Version Findings

| Date | Version / Commit | Finding | Current Action |
| --- | --- | --- | --- |
| 2026-01-31 | v5.7.14 `201b41bf96` | Introduced bidirectional virtual/physical button deduplication. | Preserved through `markAppCommand`, `isAppCommand`, and `getLastVirtualButtonEvent`. |
| 2026-02-01 | v5.7.16 `1cd54e210f` | Virtual button UI needed explicit handling for Homey interaction. | Current rule keeps UI commands routed through protocol-aware mixins, not raw capability writes. |
| 2026-02-01 | v5.7.19 `2b1f514484` | Scene mode moved into `ButtonDevice` for TS004x and related remotes. | Kept in button runtime tests and routing guards. |
| 2026-02-01 | v5.7.24 `2c6c9bc58c` | Multi-endpoint buttons needed shared state to stop ghost presses. | Preserved by broad multi-endpoint routing checks. |
| 2026-02-01 | v5.7.38 `38c7c1046c` | BSEED 4-gang virtual buttons needed direct ZCL first plus retry. | Preserved in `VirtualButtonMixin`; docs updated to allow direct ZCL/Tuya-DP dispatch. |
| 2026-02-08 | v5.8.67 `67d7f1620c` | Non-linear battery curves and the divide-by-two bug were fixed. | Reused through `UnifiedBatteryHandler.calculateFromVoltage()` and normalized DP/ZCL parsing. |
| 2026-02-08 | v5.8.69 `f33d82e427` | `?` battery display required store restore, DP fallback, and invalid-value filtering. | Extended to `SmartBatteryManager` and `BatteryRouter` in this pass. |
| 2026-02-08 | v5.8.69 `13c35f8342` | Sleeping device battery values must persist to store. | Secondary paths now store `last_battery_percentage`, `last_battery_time`, `last_battery_source`, and `last_battery_estimated`. |
| 2026-02-11 | v5.8.92 `94b70bc36c` | Button wake-up was a useful time to read battery. | Kept in button battery routing tests and unified cascade behavior. |
| 2026-06-23 | v9.0.76 `53550844cb` | Linear battery formulas and battery halving had reappeared in generated drivers. | Secondary managers now call unified non-linear voltage and sentinel-aware parsing. |
| 2026-06-24 | v9.0.88 `c43ea8f377` | ZCL voltage fallback and anti-broadcast dedup were needed for dynamic devices. | ZCL voltage is normalized before percent conversion in all battery paths. |
| 2026-06-24 | v9.0.89 `4c2f0fc640` | Z2M quirks, 0-50 scale and anomaly alerts were added. | Preserved in `UnifiedBatteryHandler`; secondary paths defer to it. |
| 2026-06-24 | v9.0.90 `14406267af` | Multi-endpoint battery support was added to the universal engine. | `SmartBatteryManager` and `BatteryRouter` now scan all endpoints, not only endpoint 1. |
| 2026-06-24 | v9.0.92 `5751e98a1a` | Sentinel filtering and duplicate-listener prevention were required. | Secondary tests now verify `255` does not overwrite existing battery. |
| 2026-06-25 | v9.0.103 | `triggerCapabilityListener()` echo loops were replaced by direct protocol routing. | `RULES_PHYSICAL_BUTTONS.md` updated to match this architecture. |
| 2026-07-05 | PR #501 `6b9312acc2` | Unified cascade restored on main and Wi-Fi local battery was normalized. | This pass extends the same logic to `SmartBatteryManager` and `BatteryRouter`. |

## Gaps Fixed In This Pass

| Gap | Risk | Fix |
| --- | --- | --- |
| `SmartBatteryManager` used a private DP list missing DP3/DP121 and profile-only DPs. | Battery reports could be ignored outside the main handler. | It now calls `UnifiedBatteryHandler.getTuyaBatteryDPs({ includeProfileOnly: true })`. |
| `BatteryRouter` used `[4, 10, 14, 15, 101, 105]` only. | Extended batteries and state DPs were missed. | It now shares the unified DP matrix and voltage DP list. |
| Secondary paths wrote default `100%`. | A false full battery hid unknown/sleeping-device states. | Default is now marked `50%` estimate and replaced by real values. |
| ZCL report parser used `value / 2` directly. | `255` could become a fake valid percentage. | Parser now uses `normalizeZigbeeValue()`. |
| Tuya DP listeners clamped raw values. | Sentinels and voltage-looking values could overwrite true battery. | Listeners now use `normalizeTuyaBatteryValue()` and ignore invalid values. |
| Battery detection assumed endpoint 1. | Multi-endpoint remotes/buttons could lose battery. | Managers now scan all endpoints for power and IAS clusters. |
| Button docs still mandated `triggerCapabilityListener()`. | Future automation could reintroduce echo loops. | Rule now requires protocol-aware dispatch with `markAppCommand`, using listeners only as fallback. |

## Regression Tests

- `test/critical/unified-battery-cascade.test.js`
- `test/critical/wifi-local-battery-normalization.test.js`
- `test/critical/battery-secondary-paths.test.js`
- `test/button-flow-runtime-routing.test.js`

## Rules Going Forward

1. Battery DP lists must come from `UnifiedBatteryHandler`.
2. Unknown/sentinel values must never overwrite a previous real battery value.
3. Estimates must be explicitly marked in store.
4. Voltage must be normalized before curve conversion.
5. Battery and IAS clusters must be discovered across all endpoints.
6. Button UI/Flow commands must enter a protocol-aware router with `markAppCommand` before physical dispatch.
