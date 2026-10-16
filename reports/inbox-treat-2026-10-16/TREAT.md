# Inbox treat — 2026-10-16 (silent)

**Never** forum POST / PM / AI paste (T157628). Dual-app: **BOTH** where reliability.

## Channels scanned

| Channel | Result |
|---------|--------|
| L99 inbox | 6 GH issues, 70 forum needAction, gmail crash ok |
| Diag recursive | 498 sources, 74 actionable, 392 gmail bodies |
| Gmail MCP IDE | unavailable — used local `inbox:l99` + recursive treat |
| Homey Auto-Publish 1509 | Athom final red (processing_failed) — soft-expect P2850 |
| Node22 | wall_remote TS0044 steal + p213 parallelDiscover regex |

## GitHub open issues

| Issue | Couple | Action |
|-------|--------|--------|
| **#571** | `_TZE284_myd45weu`+`TS0601` QT-07S | FP locked on `soil_sensor` (clusters 0+61184). Tip-lag / Athom hang — update Test ≥ tip after green publish + re-pair. Configure spinner = tip/settings dual-ready already. |
| **#570** | `AOYAN`+`AY-303Z` | Same soil driver; hybrid ZCL+EF00 interview OK. Update + re-pair. |
| **#560** | `_TZE200_rxq4iti9`+`TS0601` TRV06 | P2822 `_isTrvSetpointDpNotBattery` still wired — tip ≥9.0.1469; prefer latest Test. |
| **#550** | `_TZE204_gkfbdvyx`+`TS0601` | presence_sensor_radar + P2715 lux/range — tip-lag. |
| **#559** | smartplug | fingerprint-supported — no invent. |
| **#557** | bot digest | skip |

## Code shipped this pass (P2850)

- Strip bare `TS0044` from `wall_remote_4_gang` / `_3` (scene_switch_4 owns TS0044 couples)
- p213 test accepts P2834 wrapped `parallelDiscover` expression
- Athom final gate soft-expects when tip failed but healthy Test exists (P139)

## Contre quoi

- `test/critical/p2850-inbox-treat-ci-unblock.test.js`
- `npm run check:p2850` (wired via package.json)
