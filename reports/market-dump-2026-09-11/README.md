# Market dump — 2026-09-11 (silent)

## Zigbee (market-couples-intake --crawl)

| Metric | Value |
|--------|------:|
| Total couples cross-ref | 48715 |
| Market-new | 94 |
| Apply-safe (auto) | 6 |
| Needs review | 88 |

**Apply-safe NOT auto-applied** — several false routes:

| Couple | Rejected route | Why |
|--------|----------------|-----|
| `_TZ3000_fa9mlvja`+TS0041 | button_wireless_1 | Z2M = siren; already on `remote_button_wireless` |
| `_TZ3000_t7ugva7q`+TS0013 | switch_3gang | Already on `switch_1gang`; 3-gang doctrine → wall_switch_3gang_1way |
| `_TZ3000_l9brjwau`+TS0003 | switch_2gang | BSEED zcl_only; already fleet-locked elsewhere |
| `_TZ3000_7dcddnye` | bulb_dimmable | Already on `dimmer_wall_1gang` |
| `_TZ3210_ttkgurpb` | bulb_rgbw | Already on `wall_dimmer_tuya` |
| `_TZB210_rkgngb5o` | bulb_dimmable | Already on `bulb_tunable_white` |

Full list: `ZIGBEE_MARKET_NEW.md` · intake: `.github/state/market-couples/intake.json`

## Tuya WiFi (tuya-local + tinytuya)

| Metric | Value |
|--------|------:|
| tuya-local YAML devices | 500 |
| New brand labels vs local FP | 200 |
| tinytuya DP mappings | 125+ |

See `WIFI_TUYA_MARKET.md`.

## Forum silent (same day)

- Topics scanned: 22 · actionable: 47 · new FP candidate: 1
- Rejected FP: `_TZE2841000000_3MZB0SDZ` (corrupt OCR, not a real mfr)

## Shipped code this dump

P2461 Peter #2230 Smartbutton + MIAMO AM43 harden (BOTH).
