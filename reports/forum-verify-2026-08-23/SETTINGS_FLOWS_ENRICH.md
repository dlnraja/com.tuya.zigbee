# Forum + settings + flows enrichment (2026-08-23)

## Forum (SHADOW — no POST)

- Processor: **204** posts, **52** need-action (mostly `fixShipped` / update Test + re-pair)
- Soft hypotheses only (no invent): `_TZ3000_xabckq1v`, plug TS011F families
- Live tip lineage already covered (Tongou DIN, scene_switch_4, wall 4gang, Peter greyed flows)

## Settings enrichment (`enrich:settings:apply`)

**18 drivers** updated:
- Energy: `power_scale` (+ `bidirectional` when export cap) on DIN meters, clamps, plugs, metered gangs
- `device_din_rail_meter`: replaced wrong battery settings with measurement group
- Backlight strings on `switch_1..4gang`
- Solar Sync checkbox (brand-free) on tunable / RGBW bulbs
- App settings UI: **Universal Tuya** (was “Tuya Unified” on master)

Script: `tools/ci/enrich-driver-settings-intelligent.js`

## Flow fixes

| Issue | Fix |
|-------|-----|
| `sub_capability_toggle` orphan | Registered in `UniversalFlowCardLoader` |
| `resetenergymeter` no device arg | Compose + handler alias |
| Boiler power/temp conditions | Listeners in `boiler_switch_energy/driver.js` |
| `tuya_dp_type_is` | Condition + `lastDPTypes` store |

## Gates

- brand-scrub OK
- flow-card-dup OK (5178)

## User-facing (silent)

Users with open need-action: update **Universal Tuya Test** (≥ tip) and **re-pair** if driver/EP wrong. No forum replies.
