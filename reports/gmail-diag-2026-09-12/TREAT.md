# Gmail diag treat — 2026-09-12 (P2472a)

Silent only. No forum posts. No raw excerpts committed.

## Crash logs

| Thread | App | Error | Status |
|--------|-----|-------|--------|
| `1a05be171c701be3` | 9.0.746 | `Invalid Driver ID: light` | Soft-fail via `safe-get-driver-patch.js` (P2351/P2373) — tip ≥9.0.888 |
| `1a0571cc0b50d751` | 9.0.730/743 | `Invalid Driver ID: ZG9101SAC_HP` | Same patch |
| `1a04cd9c7d55e633` | 9.0.677 | virtualdriverzigbee | Same patch |

## Diagnostics thread `1a09051e67db8ee3` (2026-09-11)

| Log ID | App | User msg | Couple | Verdict |
|--------|-----|----------|--------|---------|
| `48baba36` | 9.0.874 | Still not responding | `_TZE204_5slehgeo`+`TS0601` curtain_motor | Pre-P2464 tip: state TX logged `DP2=—`. Fixed on tip ≥9.0.886 (P2464+P2467 initialize/mcuSyncTime/DP2 extremes). Update Test + retry. |
| `d05e6530` | 9.0.874 | Cover still not moving | same Moes ZTS | Same — tip ACK without motor until P2467. |
| `e96f52aa` / `d6245ab2` / `d9f86fed` | 9.0.874 | FrankEver water valve | **ABSENT** mfr+pid | NEED_INTERVIEW (P2468 FK paths ready; no invent pid). FLOW-GUARD noise only. |
| `8afffc76` | 9.0.882 | Smartbutton no response / no battery | button_wireless_1 | P2470 sleepy battery — tip ≥9.0.888 |

## Builds (email)

- Master Test: builds **#3150–#3161** testing (`com.dlnraja.tuya.zigbee`)
- Stable Test: builds **#99–#103** testing (`com.dlnraja.tuya.zigbee.stable`)

## Code shipped this pass (P2472a)

- `presence_sensor_radar` compose + `app.json`: removed `measure_battery` + `energy.batteries` so Homey Energy cannot re-poison 220V clrdrnya on tip update.
- Runtime: mains still `setEnergy({batteries:null,mains:true})`; battery HOBEIAN radars opt-in Energy at runtime; 30min re-heal.
- Gate: `test/critical/p2472a-vichy-compose-no-battery-energy.test.js` · `npm run check:p2472a`

## Dual-app

- Classify: **BOTH** (Energy/compose reliability)
- Backport surgical: radar compose + device.js heal + critical test to `stable-v5`
