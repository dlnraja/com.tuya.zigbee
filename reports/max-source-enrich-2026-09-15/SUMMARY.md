# Multi-source enrich harvest — 2026-09-15 (P2516 / P2517)

## Dual-app
**BOTH** — sacred couple FP locks + misroute rollback (reliability).

## Sources scraped / refreshed
| Source | Status |
|--------|--------|
| Blakadder | OK — 635/635 FPs in drivers; 0 new candidates |
| Z2M | OK (cache) |
| ZHA | OK (retry after mega timeout) |
| deCONZ | OK |
| TinyTuya / Tuya-Local / Hubitat / Domoticz / CSA | OK (cache or scan) |
| openHAB | OK — 0 new FPs |
| SmartThings / Xiaomi MIoT | attempted (mega earlier timeout; retry in scraper pass) |
| Forum silent / Johan / free-scrape | OK via multi-source + mega |
| Market couples | apply-safe → 21 wrote, then **P2517 rollback** of bad routes |

## Verified applies kept (mfr+pid)
- Livarno / LED: `*_TS0501A` / `TS0501B` → `bulb_dimmable` (Z2M desc)
- `TS0504B` → `bulb_rgbw`
- Curtain `TS130F` couples → `curtain_motor` (interview + Z2M)
- `_TZ3210_pfbzs1an`+`TS011F` → `dimmer_wall_1gang`
- `_TZB000_42ha4rsc`+`TS030F` → `curtain_motor`
- `_TZ3000_fa9mlvja`+`TS0041` → `button_wireless_1`

## Corrected / rolled back (Contre quoi)
| Couple | Wrong | Correct |
|--------|-------|---------|
| `_TZE284_a14rjslz`+`TS0601` | infer → climate / mfs climate hint | `energy_meter_3phase` (P2516 + mfs fix; no invent TS0201) |
| `_TZ3000_krwtzhfd`+`TS004F` | water_leak / climate / button_4 invent | `doNotLock` + forbid — NEED_INTERVIEW (P2517) |
| `_TZ3000_t7ugva7q`+`TS0013` | `switch_3gang` | `wall_switch_3gang_1way` |
| `_TZ3000_l9brjwau`+`TS0003` | `switch_2gang` | `wall_switch_3gang_1way` (TS0002 stays wall 2gang p2455) |
| `_TZ3000_7dcddnye` | `dimmer_wall_1gang` | stay `bulb_dimmable` only |
| `_TZ3210_pfbzs1an` | climate paint | strip climate |

## Gates / tests
- `npm run check:p2516` / `check:p2517` / P2138 — green
- Infer invent flood for `_TZE200_J1XL73IW`+many pids — **not** in `curtain_motor` compose (pruned); real lock stays `_TZ3000_j1xl73iw` on `curtain_module_2_gang`

## Policy reminder
Never invent pid. Market `z2m_desc` can false-positive — always couple-audit after apply.
Forum: SHADOW only (no POST).

## Reports
- `reports/infer-misroute-audit-2026-09-15.json`
- `reports/infer-applied-couples-2026-09-15.txt`
- `.github/state/market-couples/apply-report.json`
- `.github/state/multi-source/enrich-report.json`
