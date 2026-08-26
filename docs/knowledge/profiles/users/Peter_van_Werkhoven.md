# User profile — Peter_van_Werkhoven

> Curated fleet profile · **P2282** (forum #2202 / diag `95a7c6e5`)

Forum topic: **T140352** · Posts: 2137, 2164, 2167, 2183, 2184, 2190, **2202**

## Devices

| Tile | Driver | Couple | User action |
|---|---|---|---|
| Waterdetector | water_leak_sensor | **`HOBEIAN`+`3315-S`** (diag) | Update Test ≥P2282; re-pair only if still unavailable |
| Smartbutton | button_wireless_1 | **`_TZ3000_mrpevh8p`+`TS0041`** (SH-SC07) | Update Test ≥P2285; re-pair if wrong driver; press once for 0xFD flows |
| SOS Peter | button_emergency_sos | **ABSENT** | Update Test ≥9.0.642 |
| SOS Fariba | button_emergency_sos | **ABSENT** | Update + re-pair if glitchy |
| Raam … | contact_sensor | **ABSENT** | Update ≥9.0.642; interview if lux wrong |

## Shipped

- **P2282 BOTH:** couple-first MISATTR; IO `handleFrame` arity; 0xFD re-arm; FP soft-locks
- SOS battery spike guard + battery_low debounce (0cea6870)
- Contact/water `_reattachIasOnWake` + skip EF00 on IAS-only

## Do not invent

- Do not invent `k4ej3ww2` / `TS0207` onto Peter water — diag couple is `HOBEIAN`+`3315-S`
- `mrpevh8p`+`TS0041` is locked from diag (no longer ABSENT)

---
Regenerate: `npm run enrich:sync` + `npm run enrich:profiles`
