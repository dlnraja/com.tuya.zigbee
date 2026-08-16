# P179 — Smarter automation (no greenfield) (2026-08-16)

## Intent

Make existing investigation / maintenance **more intelligent** — not a parallel sync-mfs codegen system.

## Changes

1. **HOBEIAN brand cartesian cleanup**
   - Stripped bare `HOBEIAN` from button/scene/plug/temp/7gang/contact_zigbee (kept on soil + water + contact_presence with ZG-* pids).
   - Dropped polluted `TS0601`/`TS0001` from `water_leak_sensor`; dropped `TS0001`/`TS0041*`/`TS004F` from `soil_sensor`.
   - Remaining HOBEIAN multi-claim couples: **0**.

2. **`align-mfs-db-intelligent.js` (P169+)**
   - Merge multi-case same-mfr registry locks (union productIds; no last-wins flip-flop).
   - Stable sorted modelIds compare.
   - Readable logs (`JSON.stringify` for from/to).

3. **`dual-claim-compose-gate.js`**
   - `--include-brands` to surface HOBEIAN/SONOFF cartesian that default skip hides.

4. **`max-coverage-investigate.js`**
   - Brand dual-claim JSON scan + intelligence block.
   - `--strict` exits non-zero on TZ dual-claim / mfs high drift.

5. **Automation wiring**
   - `weekly-sovereign-loop.js`: dual-claim / align / heap / max-coverage gates.
   - `self-improve.yml`: runs max-coverage after align.

## Still refused

Bidirectional driver codegen, QuotaManager, AI_BILLING_MODE, JSON>2MB fail gate (P171–P176).
