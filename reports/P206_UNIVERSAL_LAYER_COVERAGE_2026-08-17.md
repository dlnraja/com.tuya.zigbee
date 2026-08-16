# P206 — Universal layer coverage (master)

**Date:** 2026-08-17  
**Track:** `MASTER_ONLY` (spine enrichment; do not wholesale to stable-v5)

## Problem

Docs/rules describe L0–L14 (DP/ZCL → translators → L14 `safeSet` → flows), but several lineages still extended bare `ZigBeeDevice` and skipped proprietary protocol layers (`ProtocolAutoOptimizer`, `IntelligentProtocolRouter`, EF00 time sync).

## Changes

1. **`lib/layers/UniversalLayerBootstrap.js`** — idempotent soft-attach of optimizer + protocol router + EF00 `GlobalTimeSyncEngine`.
2. **`TuyaZigbeeDevice.onNodeInit`** — calls bootstrap after universal bridge.
3. **Bases → `TuyaZigbeeDevice`:**
   - `lib/TuyaZigBeeLightDevice.js` (~15 stub lights)
   - `lib/tuya/TuyaSpecificClusterDevice.js` + root `lib/TuyaSpecificClusterDevice.js`
   - `drivers/generic_diy`, `drivers/ir_blaster`
4. **Orphan** `lib/GlobalTimeSyncEngine.js` → re-export `lib/tuya/GlobalTimeSyncEngine.js`.
5. **EF00 capability write** prefers `safeSetCapabilityValue`.
6. **Gate** `tools/ci/layer-coverage-gate.js` · **test** `test/critical/layer-coverage.test.js`.
7. **Docs** `docs/architecture/LAYERS_CAPABILITY_PROTOCOL.md` updated with L0–L6 + lineage table.

## Verify

```bash
node tools/ci/layer-coverage-gate.js
node --test test/critical/layer-coverage.test.js
```

## Out of scope

- Forum posts
- `stable-v5` full sync
- Migrating every `Unified*` duplicate optimizer call (bootstrap is idempotent)
