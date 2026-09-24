# Treat 2026-09-24 — P2725 HiepSVG + Bastien Athom land

Silent only. No forum POST.

## Harvest
| Source | Finding |
|--------|---------|
| GH#550 HiepSVG @ **9.0.1236** | Everything slow/locked; motion NO; lux laggy/wrong; human YES locked; distance locked |
| GH#550 prior @ 9.0.1232 | Motion stuck NO after stillness (P2722); distance ~1.2× |
| GH#551 famkxci2+TS0043 | Already locked `button_wireless_3` + sacred-keep; tip-lag / Generic = update+re-pair |
| Gmail L3 | Interview couple `_TZE204_gkfbdvyx`+TS0601 present |
| Bastien Athom | #104/#105 socket hang; **#106 invalid_state** on 1.0.96 (P2724 prune left 1500+ orphan flows) — Homey still **1.0.93** |

## Fix P2725 (BOTH — Universal + Stable; Bastien soak)
- Soft-clear: `splitMotionPresence && d>1m` skip stagnant/micro-jitter (sitting ≠ bathroom ghost)
- Motion re-arm: sticky-DP1 no longer blocks `_rearmMotionFromDistanceDelta`
- Ceiling: `motionThrottleMs` 10s→2s; `ultraAggressiveDebounce: false`
- Contre quoi: `test/critical/p2722-*.test.js` (P2725 asserts)

## Fix P2726 Bastien publish (Bastien-only)
- Flow prune: keep cards **only** for kept driver ids (no soft orphan keep)
- SSOT: empty `alwaysKeepPrefixes` → **27** drivers, ~645 triggers, ~781KB app.json
- Workflow: `wait-athom-draft-ready` before promote; skip promote on fail; verify fails loudly on tip-lag

## Tips
| App | Tip | Note |
|-----|-----|------|
| Universal | **9.0.1238** | P2725 radar |
| Bastien | **1.0.97** | P2725 + P2726 slim publish |
| Stable | **5.12.335** | P2725 reliability backport |
