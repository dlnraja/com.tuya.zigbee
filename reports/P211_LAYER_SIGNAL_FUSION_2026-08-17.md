# P211 — LayerSignalFusion (cross-layer anti-dupe / anti-phantom / anti-spam)

Date: 2026-08-17 · Track: **MASTER_ONLY**

## Problem
Hybrid devices often emit the same change on two layers (ZCL attr report + Tuya DP, IAS zone + DP). Existing guards were incomplete:

| Guard | Gap |
|-------|-----|
| ReceptionManager | Result ignored by `confirmInbound`; exact `===` only |
| EventDedup | 300 ms + exact JSON hash (22.1 ≠ 22.05) |
| SmartCap | Debounce/hysteresis but no phantom / priority-hold |
| safeSet `meta.source` | Bookkeeping only — never blocked L14 |

## Solution
`lib/layers/LayerSignalFusion.js` + wiring:

1. **Cross-layer echo** — soft-equal within capability window → suppress second Homey write (still learn agree)
2. **Same-layer spam** — drop repeats
3. **Phantom block** — `estimated`/`cached` cannot overwrite fresh hardware
4. **Priority hold** — lower-trust source cannot thrash higher-trust inside window
5. ReceptionManager soft + cross-channel stats
6. EventDedup window **1200 ms** + soft numeric
7. `confirmInbound` + `safeSetCapabilityValue({ source })` gate on fusion

## Windows (ms)
battery 180s · temp/humidity 8s · power 4s · alarms/onoff 1.5s · default 2s

## Verify
```bash
node --test test/critical/layer-signal-fusion.test.js
node tools/ci/layer-coverage-gate.js
```

## Stable
Do **not** copycat to stable-v5 — feature fusion. Backport only if a BOTH crash appears in EventDedup itself.
