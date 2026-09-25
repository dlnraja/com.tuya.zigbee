# P2744 — HiepSVG GH#550 complete fine-read resolve (2026-09-25)

Couple: `_TZE204_gkfbdvyx`+`TS0601` → `presence_sensor_radar` (ZY-M100-24GV3, IEEE a4:c1:38:86:ef:fe:6b:3c)

## Fine read (14 HiepSVG comments) — latest C14 @ 9.0.1250

| # | Tip | His words → root cause |
|---|-----|------------------------|
| C14.1 | 9.0.1250 | Lux ignores light changes but fluctuates when stable → SanityFilter same-ms ROC ate real steps; EventDedup let Δ&lt;8 noise through |
| C14.2 | 9.0.1250 | Step closer → distance increases then corrects → sticky cm poison on dm frames + multipath ghost |
| C14.3 | 9.0.1250 | Hang minutes → find_switch / cold stream 60s too slow |
| C10–12 | 1232–1243 | Motion NO after stillness; lux lag light-off → P2722/P2740/P2743 |
| C9 | 1222 | Departure delay ignored → P2719 sticky + settings→DP105 |
| C4 | 1112 | Distance ~1.2× tape → displayScale 0.9 |

## Shipped tip **9.0.1260** / Stable **5.12.342**
- `TuyaRadarRangeScale`: preferDivisor=10 never honors sticky cm in (maxM,100)
- `_gateGhostFartherDistance`: reject upward spikes while trending closer + human
- SanityFilter: lux abs≥15 bypasses ROC (not only drops)
- EventDedup: lux soft-skip Δ&lt;8 noise
- Cold/hang watchdog 30s + 90s silence heal
- Contre quoi: `test/critical/p2744-hiepsvg-550-complete-resolve.test.js`

Silent enrich + Dylan GH comment. No forum POST.
