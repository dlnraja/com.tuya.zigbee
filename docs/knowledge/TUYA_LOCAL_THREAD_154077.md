# Homey forum 154077 — "[APP][Pro] Tuya Local" (read 2026-10-11)

Source: https://community.homey.app/t/app-pro-tuya-local/154077 — author/dev **Andi Wirz (@andiwirz)**,
app `com.tuyalocal` (MIT, https://github.com/andiwirz/com.tuyalocal). Read-only, posts #1–#509
(501 posts, 2026-04-21 → 2026-10-10) via Discourse JSON. Nothing posted. No code copied: below is
our own summary; each item cites the post it comes from.

## Dev approach (summary)
- 17 dedicated drivers + Generic (manual DP JSON). Dedicated drivers auto-detect DPs at pairing (#1).
- Cloud Lookup (IoT Access ID/Secret) only for Device ID / Local Key and DP *specification*; matching
  by spec codes (`work_state`, `bright_value`…) beats value-pattern guessing (#1, #473).
- Protocols 3.1/3.2/3.3/3.4/3.5/3.22, auto-detect + rotation after firmware updates (#1, #32, #175).
- "Support bundle" (driver, configured vs actual protocol, DP map, live DPs, connection history,
  cloud spec) instead of rounds of questions (#348).

## Lessons → status in our repo
| # | Lesson (thread) | Our status |
|---|---|---|
| #328 | 3.3 has no session handshake: a TCP accept from a 3.4 device counted as success, reset the failure counter, rotation never kicked in (ECONNRESET loop). | **Fixed P2700**: `TuyaLocalClient` confirms a session only on first real DPS; ≥2 drops <10 s without data rotate the protocol (auto only). |
| #337 | "Connected on X" persisted a version that collapsed ms later; user asked for "Lock protocol version". | **Fixed P2700**: `version-resolved` (persists `protocol_version`) fires on first DPS only. Manual version = locked; optional `lock_protocol` setting honoured if present. |
| #296 | After power cut, 3.4/3.5 key exchange never answered → app waited forever, no log. | **Fixed P2700**: connect/handshake wrapped in timeout (≥10 s), logged, counted as early drop, reconnect scheduled. |
| #74, #496 | 1 s polling causes resets; push devices → polling 0. | FixIt note added (P2700). Stale-data watchdog already (P2641). |
| #185, #259, #428 | One local TCP session per device; never pair twice; close Smart Life. | Single-session note existed (P2657); "never pair twice" added. |
| #81, #486 | Outdoor plugs drop TCP on SET → fire-and-forget. | Already (P2642). |
| #323 | Per-device command gap (default 100 ms). | Already (P2619). |
| #389 | Cloud key check must not overwrite a working stored key. | Already safe: `WifiFixIt` only *advises* for unavailable devices, never writes. |
| #433, #446, #453 | Numeric enums need `label=raw` mapping; flow dropdowns must use the same map. | Pending study (OemEnumTokens covers part). |
| #473 | Tuya spec ranges are raw + `scale` (pir_delay 50–36000 = 5–3600.0 s). | Pending check in DPValueParser. |
| #435 | Echo of own SET is not proof the device *reports* that DP. | Pending. |
| #454, #74 | Triggers compare against value persisted across restart → false trigger on reconnect. | Our `_setLocalCapabilityValue` compares to current value; reconnect-specific case pending. |
| #499 | Refresh (cmd 18) request must list measurement DPs only — naming switch DP 1 broke one plug. | Our refresh uses tuyapi default list (no DP 1): OK. |
| #13, #16, #123, #140, #398 | Battery/BLE devices and BLE-behind-gateway are cloud-only. | Already in LAN_LIMITATION_NOTES. |
| #493 | Zigbee/BLE sub-devices via gateway `cid`. | Existing TuyaZigbeeBridge; nothing new. |

## Energy multipliers seen (user reports, NOT yet verified against tuya-local yaml)
- Plug settings dump (#385, #419): `power_scale 0.1`, `current_scale 0.001`, `kwh_scale 0.001` (common Tuya plug: DP19 W×10, DP18 mA, DP17 Wh).
- EV charger phase JSON DP102: V/10, A/10, power ×100 W, `e`/10 kWh, `d` = duration in 1/10 s (#406–#429). Already in `EvChargerPhaseJson` (P2641).
- Meter with `add_ele`/`cur_current`/`cur_power`/`cur_voltage` (DP17–20) (#325).
These stay **pistes** until cross-checked with make-all/tuya-local device yaml + localtuya; no ids added.

## Not done in this pass
DP/device-id extraction (needs per-device cross-check against tuya-local yaml), items marked Pending.
