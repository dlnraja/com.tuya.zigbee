# Forum T140352 Michaelp #2253 — ZG253 TRV (silent)

**Couple:** `_TZE284_ogx8u5z6` + `TS0601` → `device_radiator_valve` (me167 / thermostat_3)

## Symptom @ 9.0.1055
- Pairing OK as radiator TRV (P2569 EF00-only)
- Caps empty/null (temp, battery, mode) — **all values disappeared**
- Setpoint → `tuya.datapoint: value is an unexpected property`
- Diag: `6eabd9c4-cd9c-4090-ba8d-3937d35de7ca`
- Interview EF00 present

## Root cause
1. **TX (P2593):** `_sendTuyaDP` called Homey cluster with `{ dp, value, type }` — zigbee-clusters expects `datatype` + Buffer `data`.
2. **RX (P2594):** `UnifiedThermostatBase` skips `TuyaZigbeeDevice` super.onNodeInit → `tuyaEF00Manager` never created → `_setupTuyaDPMode` no-op → `dpReport` never hooked → all caps stay null. Same Contre quoi as Cover P2363/P2467.
3. **Maps:** ManufacturerVariationManager could wipe me167 sacred DP maps; smart TRV `dpProfile` missed `ogx8u5z6` / self-includesCI bug.

## Fix
- **P2593** tip ≥9.0.1068: EF00Manager / UniversalDriverInit TX + soft DP refresh
- **P2594** tip ≥9.0.1069: `attachPrimary` + `launchOnce` + cluster fallback; me167 maps win; re-lock after identity; complementary battery DP13/15; smart TRV aligned

## User action
Update Universal Tuya Test ≥**9.0.1069** → Repair TRV → wait ~10s for temps/battery → try setpoint again.

## Dual-app
BOTH (reliability TX+RX)

## Forum
Silent only (T157628) — no auto-POST.
