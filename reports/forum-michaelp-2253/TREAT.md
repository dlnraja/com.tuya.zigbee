# Forum T140352 Michaelp #2253 — ZG253 TRV (silent L99)

**Couple:** `_TZE284_ogx8u5z6` + `TS0601` → `device_radiator_valve` (me167 / thermostat_3)  
**Post:** [#2253](https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352/2253) · diag `6eabd9c4` · tip reported **9.0.1055**

## Symptom
- Pairing OK as radiator TRV (after P2569)
- Caps empty/null (target/measure temp, battery, mode)
- Setpoint → `tuya.datapoint: value is an unexpected property`
- Interview has EF00 `61184`

## Root cause stack (verified)
1. **TX P2593:** Homey cluster rejects `{value,type}` — need datatype+Buffer via EF00Manager
2. **RX P2594:** UnifiedThermostatBase skipped EF00 attach → no dpReport → all null
3. **Query P2596:** battery+passive skipped DATA-QUERY 0/10
4. **P2598 residual (this pass):** me167 DP4/5 used `smartDivisor` (Z2M#25199 = ÷10 fixed); TX listeners closed over stale `profile`; sleepy wake needed re-query

## Fix tip
- ≥**9.0.1068** P2593 · ≥**9.0.1069/1070** P2594 · ≥**9.0.1072** P2596 · ≥**9.0.1076** P2598

## User action (no forum POST)
Update Universal Tuya Test **≥9.0.1076** → Device **Repair** (or wake TRV) → wait ~10s → set setpoint again.

## Dual-app
BOTH reliability. Silent only (T157628).
