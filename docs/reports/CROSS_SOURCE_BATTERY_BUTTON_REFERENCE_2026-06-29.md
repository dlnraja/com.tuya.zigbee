# Cross-source reference - batteries, buttons, soil routing

Generated: 2026-06-29 Europe/Paris

Privacy rule: this reference intentionally keeps only public source links, local rule references, symptoms, root causes, and code decisions. It does not copy private email bodies, crash dumps, secrets, dashboard tokens, diagnostic payloads, or raw user logs.

## Sources checked

| Date/Time | Source | Signal |
| --- | --- | --- |
| 2026-05-24 onward | dlnraja GitHub issue [#333](https://github.com/dlnraja/com.tuya.zigbee/issues/333) | `_TZ3000_b4awzgct` / `TS0041`: user reports button flow cards missing and battery not shown. Later interview shows endpoints 1-4 and ZCL powerConfiguration values. |
| 2026-06-09 onward | dlnraja GitHub issues [#410](https://github.com/dlnraja/com.tuya.zigbee/issues/410) and [#412](https://github.com/dlnraja/com.tuya.zigbee/issues/412) | `_TZ3000_yj6k7vfo` / `TS0041`: no button press detected despite fingerprint presence. Interview shows four endpoints, sleepy end-device, ZCL OnOff + powerConfiguration. |
| 2026-06-21 | Homey forum topic [Universal Tuya Zigbee device app test](https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-lite-version/140352/162) and nearby posts | User reports TS0041/TS004F button devices stop working after Lite transition. Maintainer notes missing fingerprints and re-pair requirement because driver binding happens at pairing. |
| 2026-06-22, reopened 2026-06-28 | dlnraja GitHub issue [#428](https://github.com/dlnraja/com.tuya.zigbee/issues/428) | Soil sensor `_TZE284_0ints6wl` / `TS0601` still unknown in v9.0.142. Local manifest had `_TZE284_0INTS6W` without the final `l`, and `ZG-303Z` was also claimed by climate fallback drivers. |
| 2026-06-25 to 2026-06-28 | JohanBendz issue [#1418](https://github.com/JohanBendz/com.tuya.zigbee/issues/1418) | `_TZ3000_kfu8zapd` / `TS0044`: four-button remote, endpoints 1-4, battery reporting succeeds. Needs explicit 4-button route. |
| 2026-06-21 | JohanBendz issue [#1407](https://github.com/JohanBendz/com.tuya.zigbee/issues/1407) | `_TZ3000_b4awzgct` / `TS0041`: bot previously mapped it to one-button/generic paths, but open feedback plus dlnraja #333 show it needs 4-endpoint handling. |
| 2026-06-21 to 2026-06-28 | JohanBendz issue [#1415](https://github.com/JohanBendz/com.tuya.zigbee/issues/1415) | HOBEIAN `ZG-303Z` soil sensor was incorrectly associated with scene/fallback logic. Correct route is soil sensor by model/product, not broad HOBEIAN fallback. |
| 2026-06-27 | JohanBendz issue [#1420](https://github.com/JohanBendz/com.tuya.zigbee/issues/1420) | `_TZ3000_qja6nq5z` / `TS004F` Moes rotary knob was mapped to `switch_4_gang_metering`; correct route is rotary smart knob. |
| 2026-06-28 21:11-21:12 Europe/Paris | Private crash emails, v9.0.141 | Motion sensor crash in `_handleMotionWithHoldoff`: detached/unsafe timer path led to `_destroyed` access after scheduler callback. |
| 2026-06-29 05:49 Europe/Paris | Latest Homey forum diagnostic follow-up | Moes 4-button pairing issue correlated with private v9.0.144 diagnostic: TS004x routing fixed in v9.0.145, but runtime warnings remained. |
| 2026-06-29 morning Europe/Paris | Private v9.0.144 diagnostics | Startup warnings: generated drivers calling `_getFlowCard` without a driver helper, duplicate run listeners, optional GreenPower custom registration failure, `api.js` without manifest API section, and feature module `setInterval` missing scheduler context. |
| 2026-06-20 15:28 Europe/Paris | Private stable v5.11.216 diagnostic | Stable warnings: stale `_hybrid_` flow IDs and `smart_knob_rotary` class-load crash; later crash emails matched the motion holdoff timer pattern. |
| Local rules | [PROJECT_INDEX.md](../../PROJECT_INDEX.md), [CORE_RULES.md](../../CORE_RULES.md), [CRITICAL_MISTAKES.md](../rules/CRITICAL_MISTAKES.md) | Enforce no `measure_battery` + `alarm_battery` on the same driver; virtual/physical buttons need flow-safe paths; HOBEIAN must be isolated by product/model instead of global brand capture. |

## Evolution and regression chain

1. Early button fixes focused on recognition. `_TZ3000_b4awzgct` was added to a one-button driver so pairing would stop failing. That solved recognition but lost functional behavior for variants exposing four endpoints.
2. Later TS0041 reports (#333, #410, #412, #1407) showed a different root cause: the device is a sleepy 4-endpoint button remote with ZCL OnOff/powerConfiguration on multiple endpoints. One-button routing makes Homey miss per-button flows and exposes only `button.1`.
3. The Lite/app test transition increased reliance on driver binding at pairing. Forum feedback from 2026-06-21 confirms that after fingerprint fixes, users must re-pair because a wrong driver cannot be corrected in-place by adding a fingerprint.
4. Battery handling was over-defensive: ZCL `batteryPercentageRemaining=200` was treated as an unknown sentinel by default, but for TS004x remotes it is the standard 100% value. That explains stable devices showing `?` battery even when interviews contain valid powerConfiguration data.
5. Soil support suffered from two independent issues: `_TZE284_0ints6wl` had an exact-string mismatch, and `ZG-303Z` remained in climate fallback drivers. This made support look present in docs/bot replies while pairing still failed or routed wrong.
6. `_TZ3000_qja6nq5z` was a semantic routing bug: `TS004F` can mean a scene remote/knob, not a metered four-gang switch. Routing it to `switch_4_gang_metering` created wrong capabilities and wrong UI expectations.
7. The latest v9 diagnostics showed a second class of regressions after routing was fixed: generated driver files assumed `_getFlowCard` existed on `ZigBeeDriver`, while the helper only existed on device/capability mixins. That produced noisy startup errors and prevented generated trigger listeners from registering.
8. Feature module startup failed because `SolarElevation` used `this.homey.setInterval` without receiving `homey`. The exception stopped all feature flow registrations in the same try block.
9. The `api.js` warning was a manifest mismatch: the API handlers existed, but `.homeycompose/app.json` and generated `app.json` did not declare the top-level `api` section.

## Root causes

| Area | Root cause | User-visible result | Fix applied |
| --- | --- | --- | --- |
| TS0041 buttons | Fingerprint routed to one-button driver despite four endpoints | Missing button flow cards; no per-button press detection | `_TZ3000_b4awzgct` moved to `button_wireless_4_ts0041`; physical profile added with `buttonCount: 4`. |
| TS0041/TS0044/TS004F battery | ZCL value `200` filtered as sentinel | Battery remains `?` despite valid interview values | TS004x profiles now mark `zcl200IsPercent`; normalization returns 100%. |
| Soil `_TZE284_0ints6wl` | Missing exact trailing-`l` manufacturer variant | Known sensor still unknown on pairing | Exact case variants added to `soil_sensor`. |
| HOBEIAN `ZG-303Z` | Product claimed by climate fallback; broad brand history caused wrong route | Soil sensor can be treated as climate/scene/fallback | `ZG-303Z` removed from climate fallbacks; HOBEIAN + `ZG-303Z` retained in soil route. |
| Moes `_TZ3000_qja6nq5z` | Rotary knob mapped to 4-gang metering switch | Wrong Homey capabilities, wrong UI, wrong flow surface | `_TZ3000_qja6nq5z` moved to `smart_knob_rotary`; removed from `switch_4_gang_metering`; `TS004F` removed from that metering switch. |
| Runtime battery bridge | Legacy ZCL bridge wrote both `measure_battery` and `alarm_battery` | SDK v3 capability conflict risk | Bridge now writes `measure_battery` when present, otherwise `alarm_battery`. |
| Generated driver flow listeners | `_getFlowCard` helper existed on device mixins, not on driver prototypes | Startup logs show `_getFlowCard is not a function`; generated flow triggers do not register | Added driver-level `_getFlowCard` support and flow-card run-listener guard. |
| Duplicate flow listener warnings | Flow cards can be registered by both global managers and driver-local code | `Run listener was already registered` warning storm | Wrapped Homey flow card getters so duplicate listener registration is skipped quietly in production. |
| Feature flow modules | `SolarElevation` lacked a Homey scheduler reference | `Feature modules failed: ... setInterval` and all feature cards skipped | Injected `homey` into `SolarElevation` and added scheduler fallback helpers. |
| App API manifest | `api.js` existed without top-level `api` declaration | Homey warning at startup | Added `getDevices` and `replaceDevice` API declarations to compose and generated manifests. |
| GreenPower custom cluster | 0x0021 is standard/native; broad custom registration is optional and noisy | Non-critical startup error from `GreenPowerCluster` registration | Skipped custom registration and let Homey SDK/native cluster path handle 0x0021. |
| Base battery paths | Some direct reads still treated ZCL `200` as unavailable | Batteries can remain unknown even though normalized handler accepts `200` | Updated direct BaseUnifiedDevice and smart knob reads to keep `200 => 100%`. |

## Files changed by this pass

| File | Change |
| --- | --- |
| [app.json](../../app.json) | Final Homey manifest synchronized for all routing changes. |
| [drivers/soil_sensor/driver.compose.json](../../drivers/soil_sensor/driver.compose.json) | Added exact `_TZE284_0ints6wl` variants, HOBEIAN route, `measure_battery`, and `energy.batteries`; no `alarm_battery`. |
| [drivers/sensor_climate_temphumidsensor/driver.compose.json](../../drivers/sensor_climate_temphumidsensor/driver.compose.json) | Removed `ZG-303Z` fallback claim. |
| [drivers/climate_sensor_energy/driver.compose.json](../../drivers/climate_sensor_energy/driver.compose.json) | Removed `ZG-303Z` fallback claim. |
| [drivers/button_wireless_1/driver.compose.json](../../drivers/button_wireless_1/driver.compose.json) | Removed `_TZ3000_b4awzgct` from one-button route. |
| [drivers/button_wireless_4_ts0041/driver.compose.json](../../drivers/button_wireless_4_ts0041/driver.compose.json) | Added `_TZ3000_b4awzgct` variants to 4-endpoint TS0041 driver. |
| [drivers/button_wireless_4/driver.compose.json](../../drivers/button_wireless_4/driver.compose.json) | Added `_TZ3000_kfu8zapd` variants for TS0044 four-button remotes. |
| [drivers/smart_knob_rotary/driver.compose.json](../../drivers/smart_knob_rotary/driver.compose.json) | Added `_TZ3000_qja6nq5z` variants for Moes rotary knob. |
| [drivers/switch_4_gang_metering/driver.compose.json](../../drivers/switch_4_gang_metering/driver.compose.json) | Removed `_TZ3000_qja6nq5z` and generic `TS004F` claim. |
| [lib/battery/UnifiedBatteryHandler.js](../../lib/battery/UnifiedBatteryHandler.js) | Added source-aware battery profiles and TS004x `200 => 100%` normalization. |
| [lib/mixins/PhysicalButtonMixin.js](../../lib/mixins/PhysicalButtonMixin.js) | Added physical profiles for the affected TS0041/TS0044/TS004F devices. |
| [lib/ZigbeeClusterManager.js](../../lib/ZigbeeClusterManager.js) | Prevented dual battery capability writes. |
| [scripts/validation/app-json-dual-layer-validator.js](../../scripts/validation/app-json-dual-layer-validator.js) | Removed false `sdkVersion` AggregateError gate; the repo uses canonical `sdk: 3`, with `sdkVersion` only treated as legacy by other validators. |
| [test/critical/cross-source-routing.test.js](../../test/critical/cross-source-routing.test.js) | Added regression tests for the public GitHub/forum cases above. |
| [lib/flow/DriverFlowCardSupport.js](../../lib/flow/DriverFlowCardSupport.js) | Added driver-level flow helper and duplicate run-listener guard. |
| [app.js](../../app.js) | Installs flow safety early and injects Homey into feature schedulers. |
| [lib/features/SolarElevation.js](../../lib/features/SolarElevation.js) | Uses injected Homey scheduler with native fallback. |
| [lib/zigbee/registerClusters.js](../../lib/zigbee/registerClusters.js) | Skips custom GreenPower 0x0021 registration. |
| [api.js](../../api.js) plus manifests | API handlers now have manifest declarations. |
| [lib/devices/BaseUnifiedDevice.js](../../lib/devices/BaseUnifiedDevice.js) and [drivers/smart_knob_rotary/device.js](../../drivers/smart_knob_rotary/device.js) | Direct battery reads now treat ZCL `200` as 100%. |

## Re-pair note

The code can correct future pairings and new interviews. Existing devices paired to the wrong driver still need to be re-paired after the fixed test build, because Homey binds a Zigbee device to a driver during pairing.
