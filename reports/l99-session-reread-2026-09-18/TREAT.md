# L99 re-read session prompts — 2026-09-18 (silent)

## Prompt themes re-audited
1. VicHY MTG075 / Software Shield / occupied overlay / bathroom worse
2. Empty caps / data / pid not reporting (Michaelp TRV)
3. HiepSVG GH#547/#550 lux OK / presence+distance dead / Missing onoff
4. Memory / lazy / BootBudget (P2586 already Buffer+RSS)
5. Draft→test autonome + push/publish
6. Deep Z2M/ZHA/herdsman cross-ref

## Fresh harvest
- Forum T140352 highest **#2253** (VicHY #2250/#2252, Michaelp #2253)
- GitHub open **#547/#550** only (HiepSVG gkfbdvyx @ tip 9.0.1059 lag)
- Homey Test was **9.0.1073** (1072 Athom socket hang — P139 soft)

## Root causes still open after P2595/P2596
| Couple | Gap | Fix |
|--------|-----|-----|
| `_TZE204_gkfbdvyx`+`TS0601` | Z2M DP101 `find_switch` OFF → lux floods, distance null | **P2597** auto-ON DP101 + query 1/9/103 |
| same | lux→presence too strict while DP9 silent | lower rate + abs-delta + warm present |
| same | compose `onoff` Missing Listener | soft no-op listener + strip |
| `_TZE204_clrdrnya`+`TS0601` | Z2M#24831 range &lt;2.5m unstable | clamp `mtg24gMinDetectionRangeM` on TX |
| `_TZE284_ogx8u5z6`+`TS0601` | empty caps | already P2594/P2596 — tip ≥1073 |

## Dual-app
BOTH reliability. Silent only (T157628). No forum POST.

## Tip
Ship **9.0.1074** → Auto-Publish draft→test.
