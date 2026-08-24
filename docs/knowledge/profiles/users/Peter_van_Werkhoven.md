# User profile — Peter_van_Werkhoven

> Curated fleet profile

Forum topic: **T140352** · Posts: 2137, 2164, 2167, 2183, 2184, 2190

## Devices

| Tile | Driver | Couple | User action |
|---|---|---|---|
| SOS Peter | button_emergency_sos | **ABSENT** | Update Test ≥9.0.642 (master) / Stable after 5.12.90+ |
| SOS Fariba | button_emergency_sos | **ABSENT** | Update + re-pair if still glitchy |
| Raam onze slpkamer / Raam Computerkamer / Raam Slpkamer voor | contact_sensor | **ABSENT** | Update ≥9.0.642; send interview if lux still wrong — couple unknown |
| Waterdetector | water_leak_sensor | **ABSENT** | Update ≥9.0.642 + remove/re-pair water tile |
| Smartbutton | button_wireless_1 | **ABSENT** | Update ≥9.0.642 + re-pair; need interview for couple |

## Shipped (P2242 BOTH)

- SOS battery spike guard + battery_low flow debounce (0cea6870)
- Contact/water `_reattachIasOnWake` + skip EF00 dataQuery on IAS-only
- Heap-critical DataRecovery defer + BootBudget on stable
- IAS enroll soft-log (no stderr flood while sleepy)

## Do not invent

- Do not glue k4ej3ww2
- Do not glue mrpevh8p
- Do not use TS0207 from other Peter-era posts

---
Regenerate: `npm run enrich:sync` + `npm run enrich:profiles`

