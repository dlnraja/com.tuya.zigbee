# GitHub treat pass — 2026-09-11

## Scope
Assigned / involves / notifications for `dlnraja` on `dlnraja/com.tuya.zigbee` (+ mentions).

## Notifications mix
Mostly `ci_activity` (~2400). Actionable: open issues #541–#546, #533; discussion #100; closed mention #540 (blhvsaqf residual).

## Closed (code already on tip 9.0.874 + human reply)

| Issue | Couple | Driver | Notes |
|-------|--------|--------|-------|
| #546 | `l9brjwau`+TS0002 | `wall_switch_2gang_1way` (+ TX fix on legacy `switch_2gang`) | P2460 setOn/setOff |
| #545 | `ysdv91bk`+TS0001 | `wall_switch_1gang_1way` | left metering switch_1gang |
| #544 | `l9brjwau`+TS0002 | `wall_switch_2gang_1way` | P2455 |
| #543 | `ptjcjise`+TS0002 | `wall_switch_2gang_1way` | P2456 |
| #541 | `enmfaave`+TS0004 | `switch_4gang` | P2457; did **not** add EF00/10 fleet-wide |

## Still open
| Issue | Status |
|-------|--------|
| #533 Moes ZTS `5slehgeo` | Curtain motor + 25s stop ignore + DP1/DP2 on tip; asked user for new diag if still broken on **9.0.874+** |

## Discussion
| # | Couple | Action |
|---|--------|--------|
| #100 Pressure band | `pjb1ua0m`+TS0203 | Already `contact_sensor`; replied |

## Local silent enrich (P2462 — not published yet)
`_TZ3000_blhvsaqf`+`TS0001` moved `switch_1gang` → `wall_switch_1gang_1way` (same gap as #545). Compose + app.json + FPDB + sacred-keep + mfs cleaned to pid TS0001 only.

## Tip
Master Test tip **9.0.874** `#3153` = `test`.
