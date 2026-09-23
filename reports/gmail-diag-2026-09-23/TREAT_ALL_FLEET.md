# TREAT ALL FLEET — 2026-09-23 (P2697)

Silent only. Never forum POST (T157628). Dual-app: BOTH reliability.

Live tips at treat close:
| Track | Tip | Homey builds (healthy) |
|-------|-----|-------------------------|
| Universal | **9.0.1203** (this tip) | #3343 testing · #3344 created |
| Stable | **5.12.314** (+ backport front-pin) | #228/#229 testing |
| Bastien | **1.0.72** | #81 testing |

## GitHub

| Item | State | Verdict |
|------|-------|---------|
| Open PRs | **none** | — |
| **#551** famkxci2 Generic | OPEN | EP1 already `[0,1,6,57344]`; sacred-keep since 9.0.1134; **P2697** restored case-form **front-pin** (enrich had buried variants). User last tried **9.0.1117** — need ≥**9.0.1203** + re-pair Wireless Button 3 |
| **#550** gkfbdvyx lux/distance | OPEN | Presence+lux OK on 9.0.1112; cold lux/distance @ 9.0.1145 → **P2690** on tip ≥9.0.1196. Distance meter offset (1 vs 3) = residual MCU/÷10 — Z2M path kept; need tape+raw DP9 if chase continues |
| **#553** SIGABRT | CLOSED | tip-lag |

## Gmail diags / crashes / builds

| Log / signal | App | Verdict |
|--------------|-----|---------|
| **cb3c0c87** MODULE_NOT_FOUND zigbeedriver | Bastien 1.0.51 | **P2676** soft-skip — tip-lag → ≥1.0.66 |
| **885a9901** TS0042 latency + pile | Bastien 1.0.60 | **P2691** skipBatteryReporting — ≥1.0.67 |
| **8f0915fa** TS0042 slow / TS0043 dead | Bastien 1.0.53 | P2683/85/86 tip-lag |
| **9a2f232b** `_TZE200_p3dbf6qs`+TS0601 Unknown | Universal 9.0.1182 | **P2686** sacred-keep + **P2697** front-pin radiator_valve → ≥9.0.1203, remove Unknown → Radiator valve |
| Build failed / socket hang | all tracks | **P139** + **P2696** Athom mutex — siblings healthy; do not spam republish |
| TuyaRadarRangeScale crash mails | Stable ~5.12.288 | **P2650** already shipped |
| Homey builds today | U #3341–3344, S #226–229, B #76–81 | **healthy** (created/testing) — no new packing fail |

## Forum (SHADOW)

- 218 posts / 49 need-action — almost all `user-update-repair` / `ROUTED_OK` / tip-lag
- Do **not** invent OCR `_TZE2841000000_3MZB0SDZ` — real `_TZE284_3MZB0SDZ`+TS0601 ROUTED_OK
- VicHY presence / lux / curtain — tip soak + P2490/P2690 class; no POST

## Code this pass (P2697)

| Change | Track | Contre quoi |
|--------|-------|-------------|
| Front-pin `famkxci2` ×4 case forms on `button_wireless_3` | BOTH | `check:p2640` was red — enrich buried GH#551 couple |
| Front-pin `p3dbf6qs` on `radiator_valve` (+ device_radiator_valve) | BOTH | Gmail 9a2f232b Unknown after compact |
| Extend `p2640` / `p2686` Contre quoi | BOTH | baked app.json + front-pin lock |

Gates: `npm run check:p2640` · `check:p2686` · `check:p2690` · `check:p2696`

## User action (no forum reply)

1. Universal Test → **≥9.0.1203**
2. Bastien Test → **≥1.0.72**
3. Stable Test → **≥5.12.314**
4. #551: remove Generic → add **Wireless Button 3**
5. #550: remove radar → re-add; if lux/distance cold send fresh diag UUID
6. TRV p3dbf6qs: remove Unknown → **Radiator valve**
