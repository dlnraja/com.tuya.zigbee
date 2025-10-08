# Homey SDK3 Compliance – Conclusions & Reflections

Generated: 2025-10-03T11:25:41+02:00

## Scope
- **[app.json]** and all **drivers/*/driver.compose.json** normalized for SDK3 publish-level validation.
- Validated using `homey app validate --level publish`.

## Image Policy
- **App images** `assets/images/`: small 250x175, large 500x350, xlarge 1000x700.
- **Driver images** `drivers/<id>/assets/`: small 75x75, large 500x500, xlarge 1000x1000.
- **Manifests**: `images.small` → `./assets/small.png`, `images.large` → `./assets/large.png`.
- **app.json drivers**: `images.small` → `/drivers/<id>/assets/small.png`, `images.large` → `/drivers/<id>/assets/large.png`.
- **Learnmode image**: `zigbee.learnmode.image` → `<driver>/assets/large.png`.
- Regenerated missing icons via `ultimate_system/scripts/fix_all_driver_assets.js`.

## Capabilities & Classes
- Replace invalid capability `measure_voc` → `measure_tvoc`.
- Remove unsupported `measure_formaldehyde`.
- Map invalid class `switch` heuristically to `light` | `socket` | `button` | `sensor` based on capabilities.
- Bump app compatibility to `">=12.2.0"` for advanced capabilities (e.g. `measure_distance`).

## Clusters (Zigbee)
- All `clusters` and `bindings` must be numeric.
- Conversion applied: names (e.g. `basic`, `identify`, `onoff`) and hex (`0xXXXX`) → numbers, unique + sorted.
- Tuya EF00 mapped to 61184.

## Batteries
- If `measure_battery` present, `energy.batteries` is required.
- Allowed: AA, AAA, C, D, CR2032, CR2430, CR2450, CR2477, CR3032, CR2, CR123A, CR14250, CR17335, PP3, INTERNAL, OTHER.
- Map Li-ion / LiFePO4 variants → INTERNAL.
- Default: `CR2032` if missing.

## Manufacturer & Product IDs
- Enforce `zigbee.manufacturerName` as a single string (remove arrays/move from root if needed).
- Enforce mono-manufacturer per driver.
- `zigbee.productId` normalized to array of strings.
- Normalization: `TS*` upper-case, `0x*` lower-case, deduplicated.

## Orchestration Pipeline (Implemented)
- `ultimate_system/scripts/scrape_aggregate_enrich.js` orchestrates:
  1. `forum_scraper_v2.js` → `ultimate_system/data_sources/forum_data_v2.json`.
  2. `deep_web_scraper_mini.js` → `ultimate_system/data_sources/web_data_mini.json`.
  3. `Data_Enricher.js` → `ultimate_system/orchestration/state/data_enrichment.json`.
  4. `Driver_Classifier_Corrector.js` → `ultimate_system/orchestration/state/driver_classifier_state.json`.
  5. `sdk3_quick_autofix.js` (capabilities/classes/images/clusters/batteries/manufacturer/productId).
  6. `fix_all_driver_assets.js` (75x75, 500x500).
  7. Purge `.homeybuild` and validate publish.
- Reports:
  - `ultimate_system/orchestration/state/scrape_enrich_report.json` (all steps ok).
  - `ultimate_system/orchestration/state/data_enrichment.json`.
  - `ultimate_system/orchestration/state/driver_classifier_state.json`.

## Scripts (entry points)
- Autofix: `ultimate_system/scripts/sdk3_quick_autofix.js`.
- Orchestrator: `ultimate_system/scripts/scrape_aggregate_enrich.js`.
- Assets: `ultimate_system/scripts/fix_all_driver_assets.js`.

## Next Steps (Recommended)
- Commit & push after validation OK.
- Add pre-commit/CI: run `sdk3_quick_autofix.js` + `homey app validate --level publish`.
- Optionally schedule orchestrator to refresh enrichment periodically.

## References
- Rules JSON: `references/SDK3_compliance_rules.json`.
- Pipeline JSON: `references/ORCHESTRATION_PIPELINE.json`.
