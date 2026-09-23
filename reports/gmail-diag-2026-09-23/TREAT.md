# TREAT FINAL — L99 Gmail diags + GH + forum (2026-09-23)

Silent only. Never forum POST (T157628). Dual-app noted per row.

Generated: 2026-09-23 · Live tips after this treat:
- **Universal** `9.0.1198` Homey Test (P2691 pile + P2692 publish heal)
- **Stable** `5.12.311` Test (P2691/P2692 BOTH)
- **Bastien** `1.0.68` Test (P2691 pile + P2692 publish heal)

## Gmail diagnostics harvest (senetmarne)

| Log ID | App | User signal | Verdict | Action |
|--------|-----|-------------|---------|--------|
| **149bc1a5** | Universal 9.0.1165 | SIGABRT boot / unresponsive | **P2674** tip-lag | Update ≥**9.0.1196** (GH#553 closed) |
| **9a2f232b** | Universal | `_TZE200_p3dbf6qs`+TS0601 Unknown TRV | **P2686** sacred-keep | Update ≥**9.0.1196**, remove Unknown, add **Radiator valve** |
| **af98752d** | Universal | presence_sensor_radar (EF00 RX) | Tip / #550 family | Update ≥**9.0.1196** + re-pair if lux/distance cold |
| **cb3c0c87** | Bastien | MODULE_NOT_FOUND zigbeedriver | **P2676** tip-lag | Bastien ≥**1.0.66** |
| **885a9901** | Bastien | TS0042 latency + **pile drain** (powerCfg EP1+EP2 Timeout) | **P2691** class skip | Bastien ≥**1.0.67**, update Test |
| **8f0915fa** | Bastien | TS0042 slow / TS0043 dead | Tip-lag P2683/85/86 | Bastien ≥**1.0.66** |
| **f37e8a91** | Bastien | thank-you + CPU / switches | Tip-lag | Bastien ≥**1.0.66** |
| **be119f76** | Bastien | « channel » + `sub_capability_changed` boolean token | **P2659** already ships `String(value)` | Bastien ≥**1.0.66** |
| **52ef684a** / **4c0d232b** / **4d4e1684** | Bastien | 3ch remote dead / wrong device | Tip-lag + pairing class | Bastien ≥**1.0.66**; pick Wireless Button 3 — not Homey Zigbee |
| **e8d98608** | Bastien | wrong device / flow | Tip-lag | Bastien ≥**1.0.66** |

Source: `reports/gmail-diag-2026-09-23/HARVEST.json` (Gmail MCP threads).

## GitHub

| Issue | State | Treat |
|-------|-------|-------|
| **#553** SIGABRT 9.0.1165 | **CLOSED** | Tip-lag P2674 → ≥9.0.1192 / live 9.0.1196 |
| **#550** gkfbdvyx lux/distance cold | OPEN | **P2690** live on 9.0.1196 + Stable 5.12.309 — user update + re-add |
| **#551** famkxci2 Generic | OPEN | Sacred-keep since 9.0.1134+; tip-lag comment — user update + re-pair Wireless 3 |
| Open PRs | **none** | — |

## Forum (SHADOW)

- Silent scan + actionable processor: 217 posts / 49 need-action — all **alreadyInCatalog** / **fixShipped** / tip-lag.
- Do **not** invent garbled FP `_TZE2841000000_3MZB0SDZ` (OCR); real couple `_TZE284_3MZB0SDZ` ROUTED_OK.
- VicHY Advanced Flow lag mention (forum mail): no POST; tip soak + P2687 Flow cards on Universal.

## Code shipped this cycle

| Patch | Track | Contre quoi |
|-------|-------|-------------|
| **P2692** | BOTH + Bastien | Auto-Publish unblock: heobian≡hobeian, strip invent brand-as-pid, ZG-301Z curtain strip |
| **P2691** | BOTH + Bastien | Sleepy remotes powerCfg TX storm → CR2032 drain (diag 885a9901) |
| **P2690** | BOTH | Ceiling radar lux+distance cold while DP1 alive → find_switch re-arm (poll/presence/watchdog) |
| **P2687** | MASTER_ONLY | Interaction Flow cards partout (already on tip ≥9.0.1194) |
| **P2689** | BOTH | Adaptive battery precision (already on tip ≥9.0.1195 / Bastien 1.0.66 / Stable 5.12.308→309) |
| **P2521** | master | Baseline intentional dual-claim `p3dbf6qs` so Auto-Publish can ship |

Gates: `npm run check:p2692` · `check:p2691` · `check:p2690` · `check:p2687` · `check:p2689` · `check:p2521`.

## Energy (fleet)

- `energy.approximation` ∩ `measure_power`/`meter_power` = **0** (Homey Energy v3 safe)
- Battery class: P2685/P2689/P2691 — no coin-cell powerCfg TX storm

## User action (no forum reply)

1. Universal Test → **9.0.1198**.
2. Stable Test → **5.12.311** if on Stable track.
3. Bastien Test → **1.0.68** (pile drain + publish heal).
4. #550: remove radar, re-add after tip.
5. #551 / remotes: remove Generic, add Wireless Button 3; never plain Homey Zigbee.
6. TRV `p3dbf6qs`: remove Unknown → Radiator valve.
