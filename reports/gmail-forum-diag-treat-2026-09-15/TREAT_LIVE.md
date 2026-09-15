# L99 TREAT — Gmail diags + forum + GitHub (2026-09-15)

Silent only. Never forum POST. Never invent pid.

## Live tip (Gmail Athom)

| Build | App | State |
|-------|-----|--------|
| **#3195** | **9.0.935** Universal | testing (healthy tip) |
| Stable **#116** | 5.12.181 | testing (Athom #117/#118 PF — P139 no spam) |

## Gmail crash mails (recent)

| Vers | Error | Treat |
|------|-------|--------|
| 9.0.891 / 9.0.895 | `Driver Not Initialized: motionsensor` / `Invalid Driver ID: motionsensor` | **P2481** preempt in `safe-get-driver-patch.js` — **tip-lag** (fixed ≥9.0.914). Re-verify on tip. |
| 9.0.730 / 743 | Invalid Driver ID ZG9101… | **P2351** already |

## Gmail diagnostics (Peter thread)

| UUID | Vers | Signal | Treat |
|------|------|--------|--------|
| `a5304ce8` | 9.0.916 | ZCL `batteryPercentageRemaining: 76` → `capability_id_not_available_on_device` | **P2488/P2490** rehydrate — tip ≥9.0.923 |
| `77394256` | **9.0.926** | Press paints `measure_battery=0`; later ZCL raw=2; UI blank / no History | **P2507** (this pass): refuse 0% placeholder, reject ZCL 0/253, force getable/insights, forceUi when previous=0 |
| `375def7f` / `8278ec79` | crash era | MaxListeners / OOM | **P2484** — tip-lag; Peter later stable @ #2237 |

## Forum T140352 (highest #2238)

| Post | Couple | Status |
|------|--------|--------|
| #2238 Peter | `_TZ3000_mrpevh8p`+`TS0041` | **P2507** code + tip ≥**9.0.937** + press button once after update |
| #2236 PresentSky | `m1cvyneb`+TS0601 | RESOLVED |
| VicHY / Eduard / MIAMO | clrdrnya / fodv6bkr / icka1clh | LOCKED on tip; re-pair if stale |

## GitHub open

| Issue | Couple | Treat |
|-------|--------|--------|
| #548 crash @ 9.0.908 | MaxListeners/`motionsensor` class | tip ≥9.0.914 (**P2481/P2484**) |
| #547 `_TZE204_gkfbdvyx`+TS0601 | in `presence_sensor_radar` + sacred-keep | tip + **re-pair** (issue shows left network / virtual driver) |
| #533 `_TZE204_5slehgeo`+TS0601 | in `curtain_motor` + **P2503** forbid climate | tip + remove Unknown + re-pair as curtain |

## Code this pass (P2507 BOTH)

1. `lib/devices/ButtonDevice.js` — `_ensureBatteryCapabilityUi`, ignore 0%, reject ZCL 0/253, forceUi on previous=0
2. `lib/intelligent/IntelligentDeviceAdapter.js` — skip non-positive battery paint
3. `drivers/button_wireless_1/driver.compose.json` — `measure_battery.getable:true`, `preventInsights:false`
4. `test/critical/p2507-peter-battery-ui-diag-treat.test.js`

## Dual-app

P2507 = **BOTH** (battery UI reliability). Port to stable same session.

## User action (silent — no forum reply)

Update Universal Tuya Test to tip ≥**9.0.937**, open Smartbutton, press once (wake ZCL). History appears after first successful Insights write.

## Gates

```bash
node --test test/critical/p2507-peter-battery-ui-diag-treat.test.js
npm run check:p2488
npm run check:p2499
```
