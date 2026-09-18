# Forum T140352 Michaelp #2253 — ZG253 TRV (silent)

**Couple:** `_TZE284_ogx8u5z6` + `TS0601` → `device_radiator_valve` (me167 / thermostat_3)

## Symptom @ 9.0.1055
- Pairing OK as radiator TRV (P2569 EF00-only)
- Caps empty/null (temp, battery, mode)
- Setpoint → `tuya.datapoint: value is an unexpected property`
- Diag: `6eabd9c4-cd9c-4090-ba8d-3937d35de7ca`
- Interview EF00 present

## Root cause
`_sendTuyaDP` called Homey cluster with `{ dp, value, type }` — zigbee-clusters schema expects `datatype` + Buffer `data` (and status/transid/length).

## Fix P2593 (tip ≥9.0.1068)
- Prefer `tuyaEF00Manager.sendDP` / `io.sendDP` / `UniversalDriverInit.sendTuyaDP`
- Soft DP refresh 5s after init (query 2,3,4,5,7,35 for me167)
- Same TX fix on `device_radiator_valve_smart`

## User action
Update Universal Tuya Test ≥**9.0.1068** → Repair TRV → wait ~10s for temps → try setpoint again.

## Dual-app
BOTH (reliability TX)
