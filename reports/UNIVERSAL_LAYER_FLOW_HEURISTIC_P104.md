# P104 — Universal layers / flow / heuristic coverage

Elevate into bases (not 430× paste):

| Layer | Elevation |
|-------|-----------|
| Flow IDs (physical/button/hybrid) | `lib/flow/FlowCardHeuristics.js` + `PhysicalButtonMixin._safeTriggerFlow` |
| Flow getters | existing `safeGetFlowCard` / stubs |
| Driver mapping | `DriverMappingLoader.getDeviceInfo` via `mfr_index`∩`pid_index` + CI |
| Bare Tuya DP / lights | `installDeviceIO` on `TuyaSpecificClusterDevice` + `TuyaZigBeeLightDevice` |
| WiFi channel | `DeviceIOFacade.resolveWifi` → LocalFirstResolver |
| Missing flow compose | boiler_switch_energy, dimmer_0_10v, dimmer_4ch, scene_switch_6ch |

Still out of scope: mass FP dump into `generic_tuya`; auto-map unknown clusters → caps.
