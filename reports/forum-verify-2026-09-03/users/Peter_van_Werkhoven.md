# User impact — Peter_van_Werkhoven

Generated: 2026-09-03T10:34:10 · silent enrichment only

## Forum posts (actionable)

| Topic | Post | Date | Issues | Couples | Action |
|-------|------|------|--------|---------|--------|
| T140352 | #2203 | 2026-08-27 | wrong driver,flow | — | user-update-repair |
| T140352 | #2202 | 2026-08-26 | wrong driver,flow | — | user-update-repair |
| T140352 | #2193 | 2026-08-24 | luminance | — | user-update-repair |
| T140352 | #2190 | 2026-08-21 | sos,button,battery,luminance | — | code-fix-stable-candidate |

## Diagnostic lineage

| Log ID | Date | App | Notes |
|--------|------|-----|-------|
| `634f7b19` | 2026-08-15 | 5.12.70 | Crash auditCapabilities; SOS dead; smartbutton shown as contact — stable era |
| `96c19859` | 2026-08-16 | 9.0.537 | Heap OOM LiveData segments — fixed LiveDataUpdater P148 |
| `1cf775a2` | 2026-08-19 | 9.0.596 | SOS OK after re-pair; water leftover 11 DP; smartbutton HYBRID silent |
| `0cea6870` | 2026-08-21 | 9.0.617 | Contact pulse IAS; lux DP101; SOS battery spike; water/button dead |

## Impacted devices (cross-source)

| Tile / role | Driver | Device UUID | Couple | Symptoms | Fix shipped | User action |
|-------------|--------|-------------|--------|----------|-------------|-------------|
| SOS Peter | button_emergency_sos | 5814761c… | **ABSENT** | SOS OK; battery nervous 11↔20%; battery_low flow spam | button_emergency_sos battery spike guard ≥9.0.621; UnifiedBatteryHandler normalize | Update Test ≥9.0.621 |
| SOS Fariba | button_emergency_sos | — | **ABSENT** | battery flip low↔OK on timeline | same SOS battery debounce | Update + re-pair if still glitchy |
| Raam onze slpkamer / Raam Computerkamer / Raam Slpkamer voor | contact_sensor | 53c35301… | **ABSENT** | pulse not latch open/close; lux plateau vs other window sensor; IAS 0x[object Object] | IASZoneEnhanced coerce ≥9.0.621; LayerSignalFusion IAS>DP1; contact_sensor_illuminance_changed flow | Update ≥9.0.621; send interview if lux still wrong — couple unknown |
| Waterdetector | water_leak_sensor | 61bc597b… | **ABSENT** | no wet/dry; DATA-RECOVERY only in log; IAS sleepy | shouldSkipIasOnlyEf00Tx; P2203 _ensureIasBound; water_leak IAS-only profile | Update ≥9.0.621 + remove/re-pair water tile |
| Smartbutton | button_wireless_1 | 28c1e9fd… | **ABSENT** | no presses; HYBRID none in 1cf775a2 | ButtonDevice wake + deferred DataRecovery P2184; measure_battery getable false | Update ≥9.0.621 + re-pair; need interview for couple |

## Drivers seen in local diag excerpts

- **contact_sensor**: `53c35301…`, `37f88e53…`, `d10c36b7…`
- **water_leak_sensor**: `61bc597b…`
- **button_wireless_1**: `28c1e9fd…`
- **button_emergency_sos**: `5814761c…`

## Do not invent

- Do not glue k4ej3ww2
- Do not glue mrpevh8p
- Do not use TS0207 from other Peter-era posts
- Do not glue k4ej3ww2, mrpevh8p, or TS0207 onto #2190 tiles
- Historical HOBEIAN ZG-204ZV / vvmbj46n are pre-#2190 — do not attach

---
Regenerate: `npm run user:impact -- --user=Peter_van_Werkhoven`

