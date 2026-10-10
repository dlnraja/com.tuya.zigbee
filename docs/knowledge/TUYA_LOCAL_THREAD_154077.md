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
| #433, #446, #453 | Numeric enums need `label=raw` mapping; flow dropdowns must use the same map. | **P2703**: `OemEnumTokens.parseEnumValueMap / enumLabelToDevice / enumDeviceToLabel / enumFlowOptions` (label=raw, raw tokens accepted, dropdown ids = labels). Library only: our WiFi drivers have fixed DP maps and no user mode lists yet, so no driver consumes it. |
| #473 | Tuya spec ranges are raw + `scale` (pir_delay 50–36000 = 5–3600.0 s). | **P2703**: `DPValueParser.specRangeToReal / realToSpecRaw`. Library only: nothing reads the cloud spec ranges today. |
| #435 | Echo of own SET is not proof the device *reports* that DP. | N/A: we have no 'DP reports itself' fallback; any decrypted packet (echo included) proves only that the protocol is right, which is what P2700 uses it for. |
| #454, #74 | Triggers compare against value persisted across restart → false trigger on reconnect. | **P2702**: first value per capability after init only seeds the baseline (no generic changed trigger); unchanged values never trigger. |
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

## Pass 2 (2026-10-11 ~02:00 Paris)
- **P2701**: `LocalFirstResolver` returned `ipSource:'settings-static'` (P2485) while its contract and
  `wifi-local-first-resolver.test.js` expect `'settings'`. Root fix: `ipSource` keeps `'settings'`,
  pinning is a separate `ipPinned` flag (and in the reason text); P2485 test updated to match.
- **P2704 (root bug found while checking energy hints)**: every `WiFiDPRegistry` hint (category,
  community, curated product) was inert: drivers declare `dpMappings` as a getter returning a fresh
  object, so enrichment wrote into a throwaway copy, and the capability map was warmed before.
  Fixed: instance copy pinned before quirks/enrichment, cache invalidated after. Guard added so
  generic hints never bind a second DP to an already-bound capability (silent write-target hijack).
- **Product verified by two sources**: `gxrtu5vljdthtd3g` (EV Charger "gd version", qccdz):
  start/stop DP140, DP18 absent — make-all/tuya-local `dewall_evcharger.yaml` + forum #411/#426.
- Product ids seen in support bundles (#352 ceBCvy4V2acJ6UsV, #369 5dgguakbmhwzwiko [tuya-local
  ideal_clima_fancoil], #385/#419 ohaebnvyrmgx2sh6, 0oaikegxcfwwfcsr, eljrqdagltsgoycp,
  facdcmf5xlsejeku, #431 nn2ooaacswz6uyi0 [tuya-local: several AC yaml], #465 hpjrxo4jplpgfjpq,
  #474 16sthwpnxt6u7ewz): only one source for most → kept as leads, not added.
- **Energy multipliers (verified)**: tuya-local plug yaml: DP18 mA, DP19 W×10, DP20 V×10 — matches
  our `WIFI_DP_DEFAULTS`. **DP17 differs**: tuya-local declares it `unit: Wh` / `kWh scale 1000`
  (6 yaml, 0 with /100) and as a *measurement* (energy added since last report, `add_ele`), Andi's
  bundles use `kwh_scale 0.001` (#385/#419). Ours: `/100` into cumulative `meter_power`.
  NOT changed: switching it would make every existing plug's kWh counter jump ×10 down and needs
  an accumulation design. Decision needed.
- **OCR** of 246 thread images (tesseract): screenshots are Tuya IoT/app settings and DP tables;
  no new product id or DP mapping beyond the text posts. Category codes seen: cwwsq (feeder),
  cl (curtain), qccdz (EV), wsdcg-like TH sensors.
- #435 (echo ≠ device reports DP): N/A for us — no such fallback exists.

## P2705 — DP17 energy auto-detection (decision 2026-10-11, master only during soak)
- `lib/energy/WifiDp17Energy.js` (pure) + `lib/tuya-local/Dp17EnergyHandler.js`; used by `wifi_plug`, `wifi_power_strip`.
- Auto: meter left untouched while ≥4 reports are observed; votes from raw drops (→ incremental),
  DP19 power×time ≈ raw (→ incremental) or ≈ Δraw (→ cumulative); fallback on monotonicity after 12.
- Incremental: kWh = raw/1000 added to a total starting from the EXISTING meter_power (reports seen
  during detection counted once). Cumulative: legacy smartParse value, never allowed to go down
  (device resets absorbed as offset). Every write is monotonic.
- Persisted per device in store `dp17_energy`; setting `dp17_energy_mode` auto/incremental/cumulative
  (change → restart from current meter); detection logged `[DP17] … detected as …`.
