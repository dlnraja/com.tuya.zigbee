# Treat 2026-09-24 — P2722 + 3-app publish

Silent only. No forum POST.

## Harvest
| Source | Finding |
|--------|---------|
| GH#550 HiepSVG @ 9.0.1232 | Motion stuck NO after stillness (human YES, distance moves); distance ~1.2× tape |
| GH#551 famkxci2 | Already in `button_wireless_3` compose |
| Bastien | Tip-lag “rien ne marche” — remotes OOM/dead-window; tip ≥**1.0.93**, now **1.0.94** |
| Homey Developer Zigbee tools | Browser needs Athom OAuth session for tools.developer.homey.app (accounts.athom.com logged as Dylan, tools cookie separate) |

## Fix P2722 (BOTH)
- `_rearmMotionFromDistanceDelta`: while `alarm_human` YES and motion NO, Δd ≥0.15m → motion YES
- Ceiling `distanceDisplayScale: 0.9` (UI only; soft-clear uses pre-scale)
- Contre quoi: `test/critical/p2722-*.test.js` · `npm run check:p2722`

## Tips pushed
| App | Tip | Publish |
|-----|-----|---------|
| Universal | **9.0.1236** | P2723 + Auto-Publish |
| Bastien | **1.0.95** | Retry after **1.0.94** Athom `processing_failed` (socket hang) — box still **1.0.93** |
| Stable | **5.12.334** | Published earlier (p2509 align) |

## Bastien house (Chrome WebBridge live)
1. Root tip-lag: Athom rejected 1.0.94 #104 — Homey correctly stays on Test **1.0.93**
2. Update when **1.0.95** lands on Test + restart
3. Press TS0041/42/43 → Flow → relays
4. P2723: settings energy-opt must not battery-configureReporting on remotes
5. Unknown mesh nodes 14/15/19 = unpaired orphans (not in Devices)
