# How other apps handle unknown commands, fallbacks, polling, magic packets, time sync and reporting (P3017)

Studied 2026-10-24 (Europe/Paris). Facts are rewritten in our own words; no code was copied. Commit and branch pointers are in [KB_SOURCES.md](../KB_SOURCES.md#alternative-projects-p3017).

| project | unknown / unsupported commands | fallbacks | polling | magic packet / dataQuery | time sync | reporting quirks | what we adopted (where) |
|---|---|---|---|---|---|---|---|
| Zigbee2MQTT / zigbee-herdsman-converters | Unknown DP: logged with type and value (`tuya.ts` "datapoint not defined"). Private chatter is dropped with `fz.ignore_*` converters | One converter per model. Generic `tuya.fz.datapoints` + `tuyaDatapoints` lookup per couple | `onEvent` poll for TS011F/metering when the device does not report (interval option) | `configureMagicPacket` (Basic read of 0x0004/0x0000/0x0001/0x0005/0x0007/0xFFFE) and `dataQuery` 0x03 at configure | answers `mcuSyncTime` (0x24) with UTC + local seconds; some models also need a periodic push | `tuya.configureMagicPacket` before binding. Reporting is skipped on models that reject it | DP-name catalogue (604 couples) → semantic in the interpreter; ignore rules; magic-query tier; poll tier |
| ZHA (zha-device-handlers, zha) | Quirks remove unsupported attributes and clusters (quirks v2 `.removes()`), Tuya private clusters typed (0xE000/0xE001/0xED00) | `TuyaNewManufCluster` maps DP → attribute. Data-point handlers fall back to the raw value | `poll_control`. HA polls the "main" attribute when reporting fails | `TuyaQuirkBuilder.tuya_enchantment()` = the same Basic magic read | time request answered by `TuyaTimePayload` | Same TSN on button frames is sent twice: the quirk keeps the first one | **TSN dedup** (UnknownCommandEngine), 0xFC value 2 = stop/release, E001 setOptions1-3, private cluster catalogue |
| deCONZ (DDF) | Unknown attribute logged in debug. Items without a parser are not exposed | Per-item `read` function: `zcl:attr`, `tuya`, `ias:zonestatus` with explicit fallback items | `refresh.interval` per item (seconds), i.e. read on a timer when no report arrives | DDF `"md:"` + Tuya `"tuya"` read on join | `tuya` time item | Per-item `"refresh.interval"` replaces broken reporting | Ordered read tiers + timer re-read (poll tier); bounded intervals (backoff) |
| tuya-local / localtuya / hass-localtuya / tinytuya (Wi-Fi) | Unknown DPs exposed as raw entities with their type (tuya-local "unsupported" list, localtuya config UI) | Per-device YAML DP maps with alternative DP ids per product | Heartbeat + `updatedps` / DP refresh when values go stale | `DP_QUERY` (0x0A) / `UPDATEDPS` (0x12), the Wi-Fi twin of Zigbee dataQuery 0x03 | — (cloud time) | Devices only send changed DPs; a refresh is needed after connect | Unknown DP kept with type in the interpreter; dataQuery after startup; per-couple DP maps |
| Hubitat (kkossev drivers) | Unknown clusters/commands logged with `logDebug "unprocessed"`; DP table per model | Model profiles with fallbacks to generic Tuya handling | `refresh()` + health check (ping) every N minutes, offline after 3 misses | Tuya magic spell (Basic attributes read) on configure | answers 0x24 time request | `configure()` falls back to polling when bind/report fails | Health-check style re-probe with bounded backoff, 2-timeout demotion |
| SmartThings Edge (SmartThingsEdgeDrivers) | Unhandled messages ignored silently; per-fingerprint sub-drivers | Sub-driver `can_handle` chain: the first match wins, default handlers after | health check: read the main attribute when no report for a period | Tuya sub-drivers send the magic read | Tuya sub-drivers answer time requests | `configure` with a default reporting config; polling when the device lacks reporting | Remembered winner per device (first working method sticks) |
| ioBroker.zigbee | Uses Z2M converters; unknown keys shown as raw states | Same as Z2M | Polling option per device | Same as Z2M | Same as Z2M | Same as Z2M | (via Z2M) |
| Domoticz / Domoticz-Zigbee | Unknown cluster/attribute logged, "Unknown" widget in debug | Per-model JSON config | Polling per cluster (`PollingSomeOnOff`, etc.) | Tuya magic in model config | Tuya time answered | Reporting re-armed periodically | Per-cluster polling as fallback tier |
| Tasmota (Zigbee2Tasmota) | Every unknown attribute is logged raw `{"0006/F000":...}` with type | Plugin files (`.zb`) map attributes; raw otherwise | `ZbRead` on a timer via rules | `ZbSend` Basic read on demand | Answers Time cluster reads | `ZbConfig` reporting; falls back to rules polling | Raw cluster/attr in the unknown pattern (`f:epX:0xCCCC:cmd:payload`) and diag |
| ESPHome (tuya component) | Unknown DPs logged with type and raw value at boot | Explicit DP mapping per component | `update_interval` polling | Heartbeat + DP query (`QUERY_DATAPOINTS`) at start | MCU time sync (`time_id`) | — | DP query at startup = magic-query tier |
| Johan Bendz app (+ forks) | Unknown frames end up in the SDK default response; issues report DP logs (e.g. #619) | One driver per model, DP switch/case | Some drivers poll electrical attributes | Some drivers read Basic attributes | Some TRVs answer time sync | — | Couple-exact decoders sourced from issues (#619) |

## Adopted, with the place in our code

1. Ordered method chain with failover and remembered winner: `lib/zigbee/MethodChain.js` (Z2M/ZHA/deCONZ/SmartThings).
2. Re-probe with bounded backoff (15 min → 24 h) and timeout demotion after 2 misses: `MethodChain` (kkossev health check, deCONZ refresh.interval).
3. Magic-query tier (dataQuery 0x03 / queryAllDatapoints) only on EF00 devices: `MethodChain.standardReadSteps` (Z2M, ESPHome, tuya-local).
4. Derived values from sibling capabilities as the last tier, never written back: `MethodCoverage.DERIVED`.
5. TSN dedup of repeated button frames: `UnknownCommandEngine.handleFrame` (ZHA).
6. DP-name catalogue per couple → semantic: `lib/zigbee/data/unknown-dp-catalog.json` + `UnknownCommandInterpreter` step 1b (Z2M tuyaDatapoints).
7. Unknown kept with type and raw payload, plus a teach action: `UnknownCommandFlowCards` (tuya-local, Tasmota, ESPHome).
8. Clear "not an error" log for frames the SDK cannot parse but we forward (EF00, Tuya Basic): `ZclFrameHeader.describeFrame` (Z2M ignore converters, #560 logs).

## P3019 review of the "not applicable" cells (2026-10-24)

Every n/a cell of METHOD_COVERAGE.md was checked again for a real, sourced use. Where one exists it is added as an
optional extra layer: never needed at pairing, removes nothing, and the old path stays first.

| family | method | change | source | our code |
|---|---|---|---|---|
| Buttons and remotes | M3 private-cluster read | n/a → yes | Z2M TS004F `tuyaOperationMode` (attr 0x8004 on genOnOff), ZHA `TuyaSmartRemoteOnOffCluster` | `lib/buttons/attachButtonPaths.initModeForNewDevice` |
| Buttons and remotes | M9 attribute write instead of a command | n/a → yes | same (write 0x8004 to switch event/dimmer mode) | `lib/zigbee/DeviceOperatingMode.writeOperationMode` |
| Garden valves | M10 manufacturer-specific write | n/a → yes (opt-in setting) | Z2M tuya.ts HZ-WT02 (`_TZ3000_kz1anoi8` TS0049): cluster 0xE001 command 0xFE, payload `0x0B` + countdown seconds (u32 BE) | `lib/tuya/Ts0049Countdown.js`, `water_valve_garden` setting `ts0049_water_countdown` |

Kept n/a, with the reason in METHOD_COVERAGE.md: M7 everywhere (deriving alarm_battery from measure_battery would put both
capabilities on one device, which the project forbids); soil M8 (writing calibration through two paths risks a double
offset); contact/water/smoke M8–M9 (sensors only, nothing to write); M10 for DIN meters, sirens, fans, TRVs and locks
(no sourced private write found in Z2M, ZHA, deCONZ, kkossev or SmartThings Edge).

Writing through another endpoint: evaluated, not added. The only safe case would be a single-gang device whose command
lands on a different endpoint than the one it reports on; no source shows such a device needing it, and on multi-gang
devices it could switch the wrong gang.
