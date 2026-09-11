# User profile — Peter_van_Werkhoven

> Curated fleet profile

Forum topic: **T140352** · Posts: 2137, 2164, 2167, 2183, 2184, 2190, 2193, 2202, 2203, 2230

## Devices

| Tile | Driver | Couple | User action |
|---|---|---|---|
| SOS Peter | button_emergency_sos | **ABSENT** | Update Test tip; send interview if still glitchy |
| SOS Fariba | button_emergency_sos | **ABSENT** | Update + re-pair if still glitchy |
| Raam onze slpkamer / Raam Computerkamer / Raam Slpkamer voor | contact_sensor | **ABSENT** | Update tip; send interview if lux still wrong — couple unknown |
| Waterdetector | water_leak_sensor | **ABSENT** | Update tip + remove/re-pair water tile |
| Smartbutton | button_wireless_1 | **`_TZ3000_mrpevh8p`+`TS0041`** | Update Test **≥9.0.874** (P2461). Diag `048cff91` @ 9.0.836 + `cfbf687f` |

## Smartbutton (#2230 / P2461)

- Locked couple: `_TZ3000_mrpevh8p` + `TS0041` → `button_wireless_1` (SH-SC07 / RSH-SC021)
- Symptoms @ 9.0.836: lights disco on click/double/hold; battery UI `?`
- Root: multi-path + ~3.4s firmware retransmit outside 1100ms window; FLOW-GUARD invent IDs; EF00 battery query on no-EF00 device; throttle blocked store-restore paint
- Fix: 4s cross-path dedup; compose-only 1gang cards; skip EF00 battery; force battery UI when null

## Do not invent

- Do **not** glue mrpevh8p / TS0207 / k4ej3ww2 onto **#2190** tiles that still lack interview
- Smartbutton alone is the locked mrpevh8p couple — other Peter tiles stay ABSENT until interview
- Historical HOBEIAN ZG-204ZV / vvmbj46n are pre-#2190 — do not attach

---
Regenerate: `npm run enrich:sync` + `npm run enrich:profiles`
