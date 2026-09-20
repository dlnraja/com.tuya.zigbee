# Inbox treat report — 2026-09-20

## Inventory
| Channel | Result |
|---------|--------|
| Open PRs | **0** |
| Open issues | **3** (#550 #551 #552) |
| Discussions | **#100** Pressure band (`_TZ3000_pjb1ua0m`+`TS0203`) |
| Gmail (14d) | Homey build creates/testing + Athom `processing_failed` (socket hang / key missing) — **P139 soft-continue**, no spam republish |
| Gmail diags | Older diagnostic threads (Sep 10–13); no new crash UUID tied to open issues today |
| CI notifs | Master P2616 push green; stable syntax failed earlier on mfs apply drift; publish in flight |

## Actions taken (silent + human GH)
| Item | Action |
|------|--------|
| **#550** `_TZE204_gkfbdvyx`+TS0601 | **P2617** tip 9.0.1105 / 5.12.275 — DP103 lux prefer, longer phantom strip, stuckZero ≤0.3m, lux must not clear presence when distance corroborates. Human comment posted. |
| **#551** `_TZ3000_famkxci2`+TS0043 | Already locked `button_wireless_3` (P2604). Follow-up comment: update tip + re-pair. |
| **#552** `_TZ3000_e3vhyirx`+TS130F | Locked `wall_curtain_switch` (not smart_knob). Follow-up comment. |
| **Discussion #100** | Couple already on `contact_sensor`. GraphQL comment attempted. |
| Athom fail #3301–3305 | Transient Athom — wait Auto-Publish; do not force loop. |

## Contre quoi
- `npm run check:p2617`
- Existing `check:p2600` still green

## Dual-app
BOTH reliability (radar + FP locks) → master + stable-v5.
