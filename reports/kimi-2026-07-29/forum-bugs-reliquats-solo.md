# Forum Bugs + Reliquats — Consolidation (2026-07-29, solo)

> Finishing pass done in the main session (subagent quota exhausted). Covers the
> remaining forum-reported bugs and the 3 leftover items from the PR-ports mission.

## Forum bugs (from `forum-tuya-research` WebBridge harvest)

| # | Bug | Status | Detail |
|---|-----|--------|--------|
| 1 | `_TZ3000_mrpevh8p` case/wrong driver | **FIXED** | Device is a TS0041 1-button smart button (verified: [JohanBendz issue #1120](https://github.com/JohanBendz/com.tuya.zigbee/issues/1120), ZHA, Hubitat, Phoscon). Moved (both cases) from `switch_1gang` to `button_wireless_1` in `driver.compose.json` + `app.json`; mfs_db entry corrected (modelIds=[TS0041], deviceType=button, driverHint=button_wireless_1, sources +johan_issue_1120/forum_140352, confidence 0.8). Collision gate: exit 0. |
| 2 | `_TZE200_tzyy0rtq` "missing" | **No action needed** | Already present in `wall_switch_4_gang_tuya` (both cases); the climate_sensor dual-claim is baseline-covered. The forum user's problem was the publish-compactor truncation (fixed by the priority compactor). |
| 3 | Soil sensor overflow (67109120) | **FIXED** (by agent-31 before quota kill) | `drivers/soil_sensor/device.js`: drops any DP report with `abs(value) >= 0x04000000` with a log line. Verified in diff. |
| 4 | Energy scaling ×660 | **Documented** | Needs per-mfr divisor mapping (DP divisor differs by device family); no safe generic fix without the user's device interview. Listed for the next enrichment cycle. |
| 5 | "Missing Capability Listener: Button 1" (`wall_switch_4gang_1way`) | **Already fixed this session** | Root cause was `button.1..4` missing from `app.json` (fixed in the driver-mesh repair). Listeners are registered by `UnifiedSwitchBase._registerButtonCapabilityListeners()` (called from `device.js:63`). Verified by reading the code path. |
| 6 | TS0044 Moes 4-button silent | **Documented** | Needs the scene-DP interview; TS0044 handling exists in `button_wireless_4` but this mfr's DP variant is unconfirmed. |
| 7 | HOBEIAN ZG-222Z pairs but no data | **Documented** | Driver present (water_leak_sensor ×2 + gas_sensor_switch); cause needs the user's interview (IAS vs DP). |
| 8 | Insoma valve shows 4 dim instead of 2 on/off | **Documented** | `valve_dual_irrigation` capability mapping question; needs device interview. |
| 9 | `_TZE200_ka8l86iu` exposes motion not presence | **Documented** | `presence_sensor_radar` DP variant; needs interview. |

## Reliquats (PR-ports leftovers)

| Item | Status |
|------|--------|
| Dooya `_tze200_3ylew7b4` mfs_db mapping → `curtain_motor` | **FIXED** (agent-32 before quota kill) — deviceType=cover, driverHint=curtain_motor, source johan_pr_1431 |
| MOES `_tz3002_vaq2bfcu` interview → mfs_db | **FIXED** (agent-32) — entry present, source johan_pr_1106 |
| `parseTuyaMultiDpFrame` adoption in cover base classes | **FIXED** (agent-32) — present in `lib/devices/UnifiedCoverBase.js` + `lib/devices/BaseTuyaDPDevice.js` |
| 47 no-driver pairs routing | **DONE (this pass)** — 18 merged into existing mfs_db entries with deviceType/driverHint (4 pid-routed: TS1001→bulb_dimmable, TS0219→siren, FE-GU10-5W→bulb, TS0210→vibration_sensor; 14 description-routed: wallsockets→wall_socket, vibration, rain, shade→curtain_motor, keypad/TS004F→button_wireless_4, TS0041→button_wireless_1, floodlight→bulb, 3 repeaters). 85 remaining unrouted documented in `tmp/47pairs-unrouted.txt` (speculative single-source or genuinely unknown category). |

## Validation (after all edits)

- `node scripts/_validate_all.js` → **3/3 checks passed**
- `fp-collision-check.js --baseline` → **exit 0**
- `npx mocha test/critical/*.test.js` → **75 passing, 0 failing**
