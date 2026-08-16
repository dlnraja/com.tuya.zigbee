# P178 — Integral A+B+C pass (2026-08-16)

## Scope

Attack all three axes on existing tooling only (no greenfield codegen).

| Axis | Action | Result |
|------|--------|--------|
| **A Dual-claims / phantoms** | `align-mfs --apply`; strip wrong FPs; registry locks | 0 dual-claims; jaap6jeb/qeuvnohg/iystcadi aligned |
| **B Peter soak** | Code + pattern verify | DRM skip sleepy IAS = true; gmail `heap_oom_live_data` + `ERR_IAS_SLEEPY_TIMEOUT` mapped; Homey tip **9.0.547** |
| **C FP dry-run** | blakadder dry + max-coverage path | Dry-run ready; apply only after human review |

## Surgical compose / registry

1. **align-mfs (P169)** applied high drifts:
   - `_TZ3210_jaap6jeb` stripped from `contact_sensor` → `bulb_rgbw`
   - `_TZ3000_qeuvnohg` stripped from `lcdtemphumidsensor_plug_energy` → `din_rail_switch`
   - `_tz3210_iystcadi` mfs forced → `light_bulb_rgb_led` / TS0505B
   - `_TZ3210_PWAUW3G2` compose-exclusive → `light_bulb_rgb_led`
2. **ZG-303Z** removed from `climate_sensor_energy` + `sensor_climate_temphumidsensor` productIds (soil only).
3. **`_TZE204_r0jdjrvi`** removed from `plug` (curtain tilt, not plug).
4. Registry: `hobeian-zg303z-soil`, `curtain-r0jdjrvi-tilt`.

## Peter soak checklist (operator)

Homey Test **≥9.0.541** (tip 9.0.547+):
1. No `Reached heap limit` / LiveData OOM in new diags
2. No EF00 DP recovery spam on IAS sleepy (water/contact/SOS)
3. `IASZoneStatusChangeNotification` still updates alarms
4. Battery % still visible via `safeSetCapabilityValue`

Local smoke: `DataRecoveryManager._shouldSkipAggressiveTuyaDpPoll()` → true on sleepy contact, false on mains EF00.

## Commands

```bash
node tools/ci/max-coverage-investigate.js
node tools/ci/align-mfs-db-intelligent.js --check
node tools/ci/dual-claim-compose-gate.js
node tools/ci/gmail-crash-pattern-gate.js --json
node tools/ci/apply-blakadder-new.js   # dry-run; --apply after review
```

## Open (report-only, no auto-pick)

~30 ambiguous mfs skips (curtain/LED multi, DIY brands, unclaimed bulbs) — human sacred-couple when a real couple arrives.
