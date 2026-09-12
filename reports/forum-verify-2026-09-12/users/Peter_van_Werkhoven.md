# User impact — Peter_van_Werkhoven

Generated: 2026-09-12T22:11:35 · silent enrichment only

## Forum posts (actionable)

| Topic | Post | Date | Issues | Couples | Action |
|-------|------|------|--------|---------|--------|
| T140352 | #2235 | 2026-09-12 | crash (motionsensor) | — | **tip ≥9.0.902** P2481 (OCR tip 9.0.895 Gecrasht) |
| T140352 | #2234 | 2026-09-12 | battery | mrpevh8p+TS0041 | tip ≥9.0.902 P2470 |
| T140352 | #2233 | 2026-09-11 | battery | mrpevh8p+TS0041 | tip ≥9.0.902 P2470 |
| T140352 | #2230 | 2026-09-06 | button,battery | — | tip ≥9.0.902 |
| T140352 | #2203 | 2026-08-27 | wrong driver,flow | — | user-update-repair |
| T140352 | #2202 | 2026-08-26 | wrong driver,flow | — | user-update-repair |

## Diagnostic lineage

| Log ID | Date | App | Notes |
|--------|------|-----|-------|
| `375def7f` | 2026-09-12 | **9.0.895** | Forum #2235 crash — class = Gmail `motionsensor` (P2481). Tip **≥9.0.902** |
| `1e071a86` | 2026-09-12 | 9.0.881 | #2234 Smartbutton OK; battery `?` |
| `8afffc76` | 2026-09-11 | 9.0.882 | #2233 P2470 battery UI |
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
| Smartbutton | button_wireless_1 | 28c1e9fd… | _TZ3000_mrpevh8p+TS0041 | lights disco / flicker on click-double-hold; battery UI ?; pid ABSENT on wake (mfr known) | P2440 cross-path dedup; P2461 4s window + compose-only flows + battery skipThrottle/noEf00; MFR-ENSURE soft-fill TS0041 | Update Test ≥9.0.874 (P2461); press button once after update |

## Drivers seen in local diag excerpts

- **contact_sensor**: `53c35301…`, `37f88e53…`, `d10c36b7…`
- **water_leak_sensor**: `61bc597b…`
- **button_wireless_1**: `28c1e9fd…`
- **button_emergency_sos**: `5814761c…`

## Inbox snippets

- **Peter_van_Werkhoven** (2026-09-06) :  Hi Dylan Good evening, the Smartbutton is responding now but not very consistent, connected lights are switching on and off or flickering o
- **Peter_van_Werkhoven** (2026-09-11) :  Hi Dylan Good evening, after update to your latest app and reading the changelog where you wrote that you’ve changed things to the Smartbut

## Do not invent

- Do not glue k4ej3ww2 onto #2190 tiles without interview
- Do not glue mrpevh8p onto non-Smartbutton Peter tiles (#2190 ABSENT)
- Do not use TS0207 from other Peter-era posts onto ABSENT tiles
- Smartbutton alone is locked mrpevh8p+TS0041 (diags 048cff91 / cfbf687f)
- Historical HOBEIAN ZG-204ZV / vvmbj46n are pre-#2190 — do not attach

---
Regenerate: `npm run user:impact -- --user=Peter_van_Werkhoven`

