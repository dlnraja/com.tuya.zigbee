# P2743 — Inbox treat PR/issues/forum (2026-09-25)

Silent only. No forum POST.

## Sources
| Source | Result |
|--------|--------|
| Open PRs | **0** |
| Open issues | **#550** HiepSVG radar · **#551** migueleap famkxci2 |
| Forum silent | 23 topics scanned; 1 FP OCR garbage (`_TZE2841000000_*`) **not** locked |
| Gmail L3 | 55 local; interview gkfbdvyx + iadro9bf |
| CI notifs | stable Auto-Fix FP baseline lag (healed) |

## Fixes shipped (tip **9.0.1259**)
| Patch | Contre quoi | Track |
|-------|-------------|-------|
| P2743 lux→motion re-arm | motion stuck NO after stillness (Δd tiny) | BOTH |
| SanityFilter lux EMA snap on drop | light-off still laggy vs light-on | BOTH |
| `button_wireless_3` productId **TS0043 only** | invent TS0013/TS0215A matrix bloat → Generic | BOTH |
| collision baseline refresh | stable/master Auto-Fix NEW COLLISION spam | BOTH |

## Tip-lag (no new code)
- VicHY #2254/#2255 clrdrnya — already P2577–P2599; update Test ≥9.0.1258 + Repair
- Michaelp #2253 ogx8u5z6 — already P2593–P2598; Repair on ≥9.0.1076
- Forum ROUTED_OK / MISSING_PID — NEED_INTERVIEW only (no invent)

## User action (GH comments, Dylan voice)
- #550: update Universal Tuya Test ≥**9.0.1259**, Repair radar
- #551: update ≥**9.0.1259**, remove Generic, add Wireless Button 3 (TS0043)
