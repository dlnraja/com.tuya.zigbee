# Gmail Homey email sweep — 2026-08-15/16 (~00:10 CET)

> Fresh GHA: [`31911087154`](https://github.com/dlnraja/com.tuya.zigbee/actions/runs/31911087154) (success).
> Local IMAP: unavailable — mailbox processed via CI secrets only.

## Gate

| Check | Result |
|-------|--------|
| `gmail-crash-pattern-gate` | **`verdict: ok`** |
| `unknownFatals` | `[]` |
| `watch` | `[]` |
| Gmail FPs in drivers | **9/9** (`missingCount: 0`) |
| New fingerprints | **[]** |

## Homey crash / diag emails (chronology)

All recent Athom crash patterns map to **already-shipped** fixes:

| When | Signature | Status |
|------|-----------|--------|
| Aug 14–15 | `auditCapabilities is not a function` / `catch` / TS0041 | **fixed_p108 / p101** — update Test ≥9.0.528 or stable ≥5.12.82 |
| Aug 14 | `capability is not defined` | **fixed_p136** |
| Aug 5–8 | `_destroyed` / `getDeviceActionCard` / readonly `error` | **fixed_p100 / p137** |
| Aug 3–4 | `health_battery_replacement_predicted` Invalid token | Guarded in `FeatureFlowCards` (MASTER) |
| Jul–Aug | `Invalid Flow Card ID: smart_irrigation_valve_turned_*` | Cards present in compose/app; stale diag from older builds |
| Aug 11 | Athom “build has failed processing” | **P139** — do not bump-loop; Test healthy on 9.0.528+ |

## Sacred couples from mailbox (all owned)

| MFR | Driver |
|-----|--------|
| `_TZ3000_99rpfy6` | `contact_sensor` |
| `_TZ3000_fllyghyj` | `climate_sensor` |
| `_TZ3000_w5xztuy7` | `switch_2gang` (ZCL-only) |
| `_TZ3210_imaccztn` | `relay_board_4_channel` |
| `_TZE200_pay2byax` | `contact_sensor` |
| `_TZE204_clrdrnya` | `presence_sensor_radar` |
| `_TZE284_8se38w3c` | `climate_sensor` |
| `_TZE284_hodyryli` | `climate_sensor_zt08` (#513) |
| `_TZE284_m1cvyneb` | `wall_dimmer_tuya` |

## Forum-notification emails (Homey Community)

Device-issue digests for T140352 (#2129–#2140) — already treated in forum media sweep; no extra FP work.

## Code actions this pass

**None required.** No unknown fatals, no missing FPs. Users on old builds should update Homey Test / stable as above.

Artifacts: `tmp/gmail-art-new/`, `.github/state/gmail-crash-patterns.json`, `diagnostics/summary.json`.
