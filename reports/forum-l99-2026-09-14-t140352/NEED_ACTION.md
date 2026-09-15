# T140352 NEED_ACTION — 2026-09-14 (silent L99)

Silent only. **Never** Homey forum POST (T157628). Never invent pid.

Live harvest: `reports/forum-l99-2026-09-14-t140352/` (highest **#2237**, window #2199–#2237).
Processor: `reports/forum-verify-2026-09-14/PROCESS.md`.

## Tip / Athom

| Build | Version | State |
|-------|---------|--------|
| **#3183** | **9.0.922** | **test** (live tip — IR) |
| #3184 | 9.0.924 | `processing_failed` (socket hang up) — P139, do not spam |
| Git | 9.0.923+ | P2488 Smartbutton battery keep |

## Image OCR cross-ref (downloaded originals under `img/` — gitignored)

| Post | User | Evidence | Verdict |
|------|------|----------|---------|
| #2237 | Peter | App **9.0.916** Experimental; Smartknop battery **?**; Insights Batterij empty; SOS/Water show 15% | **Tip lag** vs P2488 (≥9.0.923). User not on tip yet. |
| #2227 | VicHY | Timeline @ **9.0.797**: phantom low-battery on mains presence | **P2472a** already strips `measure_battery` on clrdrnya mains — update ≥9.0.889 + re-pair if stale |
| #2224 | VicHY | @ **9.0.781**: Zigbee flood 196 msg/min + battery flip | Same class; flood calm + phantom strip on tip |

## Post → couple → action

| Post | User | Couple | Status | Action |
|------|------|--------|--------|--------|
| **#2238** | Peter | `_TZ3000_mrpevh8p`+`TS0041` | tip-lag UI | Update Test **≥9.0.933** (P2499 getable + P2500 UX). Diag `77394256`. |
| #2237/#2234/#2233/#2230 | Peter | `_TZ3000_mrpevh8p`+`TS0041` Smartbutton | LOCKED | Update Test **≥9.0.923** (P2488 keep-lock). Soft-republish after #3184 PF. |
| #2235 | Peter | — | tip-lag crashes | Diags `375def7f` / `8278ec79` — P2481/P2484 class; #2237 says stable again |
| #2236 | PresentSky | `_TZE284_m1cvyneb`+`TS0601` | LOCKED wall_dimmer | **RESOLVED** by user (works after re-add) |
| #2206/#2221 | PresentSky | same | LOCKED | Was TX dead @ pair — fixed on tip; brightness 0–1000 |
| #2229 | MIAMO | `_TZE200_icka1clh`+`TS0601` | LOCKED curtain_motor | Update + re-pair AM43 |
| #2228 | Eduard | `_TZE284_fodv6bkr`+`TS0601` (+ libht6ua sibling) | LOCKED curtain_motor | Update + re-pair tubular |
| #2227/#2224/#2222 | VicHY | `_TZE204_clrdrnya`+`TS0601` | LOCKED presence_radar | Update ≥9.0.889; strip phantom battery; DynCap no curtain reinject |
| #2218 | Joep | Insoma dual valve (interview class) | P2473 EF00-only | Update ≥9.0.890; pair `valve_dual_irrigation` — NEED full mfr+pid if still unknown |
| #2213/#2207 | meter91 | `_TZ3000_zgyzgdua`+`TS0044` | LOCKED scene_switch_4 | Update + remove + re-pair; never paste networkKey |
| #2209 | Cam | button + motion | NEED_INTERVIEW | Johan issues only — no mfr+pid in post |
| #2204 | Elliot | `_TZE204_ogkdpgy2`+`TS0601` | LOCKED air_quality_co2 | P2291 — update + re-pair CO2 (not climate) |
| #2199 | A_Tas | `_TZ3218_t9ynfz4x` (+TS0225 expected) | LOCKED mmwave | Settings soft-fail P2289/P2298 already; NEED diag if red banner persists on tip |

## Junk / do not lock

- `_TZE200_ABC123` / `_TZE200_xxxxx` / Stefan `_TZE2841000000_*` — invent noise
- Soft only: `_TZ3000_xabckq1v` without pid (known couple is TS004F → `button_wireless_4`)

## URL hosts (recent window)

discourse-cdn (screenshots), github.com/dlnraja#531 (Elliot CO2), bseed.com (PresentSky dimmer product page).

## Dual-app

- P2488 battery keep = **BOTH** (reliability)
- VicHY DynCap / phantom battery = **BOTH**
- IR wizard / Homey IR TX = **MASTER_ONLY** (already on tip 9.0.922)

## Contre quoi (gates)

- `npm run check:p2488` — adapter must not strip `measure_battery` on `button_*`
- `npm run check:p2472a` / p246x — mains radar no phantom battery
- `npm run check:p2473` — EF00-only interview no OnOff 6
