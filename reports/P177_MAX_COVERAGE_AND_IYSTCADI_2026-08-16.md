# P177 — Max free coverage + dual-claim iystcadi (2026-08-16)

## Intent

Maximize **free** investigation / auto-maintenance / multi-source coverage **without** greenfield codegen (P171–P176 refused).

## Delivered

1. **`tools/ci/max-coverage-investigate.js`** — single entry:
   - dual-claim, align-mfs `--check`, sacred registry + class audit
   - energy / heap / gmail patterns / layer-pass / forum AI-paste gate
   - blakadder dry-run + multi-source enrich orchestrator
   - optional `--with-scan` / `--apply-safe` (known routes only)
2. **multi-source-enrich-orchestrator** — added phases `10c` dual-claim + `10d` align-mfs check
3. **Dual-claim fix** `_TZ3210_iystcadi`:
   - Z2M #12090 → **TS0505B RGB bulb** (Lidl/Livarno), not wall dimmer
   - Removed from `wall_dimmer_tuya` and `led_strip_advanced`
   - Kept on `light_bulb_rgb_led` (+ registry case `rgb-bulb-iystcadi-ts0505b`)

## Still use (existing)

| Layer | Tool / workflow |
|-------|-----------------|
| Daily scrape | `mega-crawl.yml` |
| Weekly health | `weekly-sovereign-loop.yml` |
| mfs align | `align-mfs-db-intelligent.js` (P169) |
| Local diag KB | `analyze-diag-locally.js` (P170) |
| FP dry-run | `apply-blakadder-new.js` |

## Forbidden (unchanged)

Bidirectional mfs→`device.js` generation, JSON>2MB fail gate, `AI_BILLING_MODE`, forum auto-post.
