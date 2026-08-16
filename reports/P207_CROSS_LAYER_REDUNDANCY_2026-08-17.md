# P207 — Cross-layer protocol redundancy

**Date:** 2026-08-17  
**Track:** `MASTER_ONLY`

## Why

Layers are not decoration: they **compensate** incompatible ZCL / DP / proprietary clusters, Homey interview gaps (`UNSUPPORTED_ATTRIBUTE`, missing EF00 aliases), and noisy diag/crash evidence — and they **confirm** inbound/outbound values by crossing protocol entry points (ZCL ↔ DP ↔ raw ↔ IAS ↔ UI).

## What landed

| Piece | Change |
|-------|--------|
| `lib/layers/CrossLayerRedundancy.js` | Soft-attach UnsupportedRegistry, SmartCap seeds, ReceptionManager, `confirmInbound` / `confirmOutbound`, FallbackChains helpers, interview gap seed |
| `UniversalLayerBootstrap` | Calls CrossLayer after optimizer/router/time |
| `safeSetCapabilityValue(cap, val, meta?)` | Optional `{ source, confidence }` → SmartCap + RX dedup + ProtocolAutoOptimizer hits |
| EF00 DP writes | Pass `{ source: 'tuya-dp' }` |
| `SmartCapability.update` | Prefer `safeSetCapabilityValue` |
| Docs / gate / tests | Updated |

## Driver usage (new + old)

```js
await this.confirmInbound('measure_temperature', scaled, 'zcl', 0.9);
await this.confirmInbound('measure_temperature', fromDp, 'tuya-dp', 0.85);
// or
await this.safeSetCapabilityValue('onoff', true, { source: 'tuya-dp' });
```

## Verify

```bash
node tools/ci/layer-coverage-gate.js
node --test test/critical/layer-coverage.test.js
```
