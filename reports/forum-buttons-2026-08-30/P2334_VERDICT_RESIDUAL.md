# P2334 — Verdict residual (flow-fire) — 2026-08-31

Silent forum. BOTH.

## Audit vs tip (P2331/P2332 already covered)
| Claimed P0 | Tip status |
|------------|------------|
| fingerbot compose hashed | Compose OK since P2331 |
| fingerbot/contact/air `_triggerIds` | OK since P2331 |
| wall_switch_4_gang physical_gang + RX arm | OK since P2331/32 |
| button_wireless_4 release invent | OK since P2331 |

## Real residual fixed here
1. **app.json** still published hashed `physi_*` / `power_*` for fingerbot — Homey binds from app.json → single/double/long/triple never registered. Synced from compose.
2. **CoreCapabilityMixin** / **UnifiedSwitchBase** missing `_1gang_turned_*` and `_Ngang_gangN_turned_*` candidates → many turned_on/off cards never fired (declared-only skipped invent).
3. **FlowCardHeuristics** + `${did}_switch_1gang_physical_*` for fingerbot-class compose.

## Not treated as fire-blockers
- catch-string `_switch_switch_` in contact/air driver.js
- app-level `virtual_button_pressed`
