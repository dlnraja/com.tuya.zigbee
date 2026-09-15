# P2522 — Forum fine-resolve (2026-09-15)

Silent only. Never Homey forum POST (T157628). Never invent pid.

## Live window

| Source | Highest / tip |
|--------|----------------|
| T140352 | **#2239** Peter (battery OK; History = Homey `class:button` UX) |
| Master tip | **9.0.951** (this pass) |
| Stable tip | **5.12.195+** backport reliability |

## Fine treatments

| User / issue | Couple | Verdict | Code |
|--------------|--------|---------|------|
| Stefan T154092 #37–#43 | OCR `_TZE2841000000_3MZB0SDZ` | **alias** → `_TZE284_3mzb0sdz`+TS0601 → `curtain_motor` (P2514); invent stays doNotLock | `canonicalizeForumMfr` / `stripTuyaOcrZeroPad` |
| GH#547 HiepSVG | `_TZE204_gkfbdvyx`+TS0601 | LOCKED `presence_sensor_radar` — **front-pin** mfr list (Athom match) | compose reorder + sacred-keep |
| GH#533 Salvagr | `_TZE204_5slehgeo`+TS0601 | LOCKED `curtain_motor` — **front-pin** | compose reorder |
| GH#548 crashes @ 9.0.908 | motionsensor class | tip-lag P2481/P2484 — update ≥9.0.914 | already |
| Peter #2239 History | `_TZ3000_mrpevh8p` / `5bpeda8u`+TS0041 | Battery fixed; History tab = Homey button UX (P2512) | HomeyCapabilityUx Insights heal |
| VicHY / Eduard / MIAMO | clrdrnya / fodv6bkr / icka1clh | LOCKED on tip — re-pair if stale | P2490 |
| Cam #2209 | ABSENT | NEED_INTERVIEW | soft |
| SergeP T156967 #86 | MOES competitor app | out-of-scope Universal Tuya | soft |

## Gates

```bash
npm run check:p2522
npm run check:p2514
npm run check:p2507
```

## Dual-app

P2522 = **BOTH** (OCR CI + pairing front-pin + Insights heal).
