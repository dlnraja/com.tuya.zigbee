# Multi-source treat — P2816 (2026-10-14)

Silent only. No forum POST (T157628).

## Sources re-scanned
| Source | Result |
|--------|--------|
| Forum T140352 | highest #2262 — P2812/P2813 already locked |
| GitHub open | #571/#570 soil P2814+P2815; #560 TRV tip-lag+DP card; #550 gkfbdvyx tip≥locks; #559 plug sacred-keep |
| Gmail | cascade stale/blocked access; icka1clh couple known |
| Button harvest | **real gap**: multi-gang `*_release` heuristic miss |

## Fixes this pass
| ID | Fix |
|----|-----|
| **P2816** | `FlowCardHeuristics` → `${did}_button_Ngang_button_${gang}_release` |
| **P2816** | `triggerDPReceived` prefers `getDeviceTriggerCard` (kills #560 `invalid_flow_card_id`) |
| P2815 | soil couples SSOT already shipped 9.0.1460 |

## Contre quoi
- `npm run check:p2816` · `check:p2815` · `check:p2810`

## Dual-app
**BOTH** (flow reliability + DP trigger)
