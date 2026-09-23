# L99 residual treat — 2026-09-23 (silent) — P2705

## Live open
| ID | Couple | Tip | Fix |
|----|--------|-----|-----|
| GH **#550** HiepSVG | `_TZE204_gkfbdvyx`+`TS0601` | ≥**9.0.1210** | **P2705** (+ P2690) |

## Latest @ 9.0.1207
- Alarms OK but sometimes hung after leave
- Lux nearly dead; distance flaky
- No detect beyond ~3.5m

## P2705 root causes
1. Cold-stream AND-gate skipped lux re-arm when distance still moved
2. Ceiling DP map had no Homey `setting:` → MCU never got range/sensitivity/delay
3. Sticky/survival watchdogs not armed on ceiling (gated on floodCalm)

See `reports/gmail-hiepsvg-550-2026-09-23/TREAT.md`

## User action
Update Test ≥9.0.1210 → Repair radar. No forum POST.
