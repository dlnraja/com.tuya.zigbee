# Energy / Buttons / Flows — layer contracts (P155)

Canonical runtime modules. Improve **one layer at a time**. Homey runtime does **not** self-repair or auto-swap drivers; CI publishes fixes.

## Energy

| Rule | Module |
|------|--------|
| Parse scale SSOT | `SmartDivisorManager` (`smartParse` / `rememberLearnedDivisor`) |
| Impossible kWh jumps | `EnergyJumpGuard` → syncs learned divisor when `_energyParseMeta` set |
| Real vs estimated | `SmartEnergyManager` (5-min audit) — never overwrite direct |
| Virtual estimates | `VirtualEnergyMeterMixin` only after silence |
| Soft compensator | `HomeyGapCompensator` notes only — **no** phantom power caps |
| No linear `(V-2.5)/0.5` | `BatteryMasterEngine` / UnifiedBattery |
| No compose `energy.approximation` + `measure_power`/`meter_power` | `tools/ci/energy-compose-gate.js` |
| Timers | `safeSetInterval` + `_cleanupVirtualEnergy()` |
| Mains | `mainsPowered === true`; strip phantom `energy.batteries` |

SSOT: [`config/architecture/energy-compensation-ssot.json`](../../config/architecture/energy-compensation-ssot.json)  
Gates: `node tools/ci/energy-compose-gate.js` · `node tools/ci/adaptive-double-division-gate.js` · `node scripts/validation/check-energy-divisor.js` · `node tools/ci/layer-pass-audit.js`

**Soft-deprecated (do not extend):** `VirtualEnergyEstimator`, `VirtualTelemetryCompensationEngine`, `DynamicEnergyManager` — prefer SmartEnergy + VirtualEnergyMeterMixin.

## Buttons

| Rule | Module |
|------|--------|
| Virtual UI | `_safeSetCapability` + `markAppCommand` before ZCL/DP |
| Physical wall | `PhysicalButtonMixin` debounce / sliding window |
| Never raw | `setCapabilityValue('button', …)` without L14 path |
| Visual | `ButtonVisual.js` + `safeSetTimeout` |
| Cascade L1–L8 | `ButtonCaptureCascade` applies `preferredLevels` (P2395) — skip L7 on TS004x; L5 E000 when preferred |
| Mixin flag | `_hasPhysicalButtonMixin` stamped in phys init so UnifiedSwitchBase skips duplicate ZCL listeners |
| Dead stack | Do **not** extend `UnifiedButtonEngine` — alias vocab to `button_capture_l1_l8` |

Mixin order (switches): inherit via `TuyaZigbeeDevice` / `UnifiedSwitchBase` — **no** double-wrap `PhysicalButtonMixin(VirtualButtonMixin(...))` (B10 / P2395).

Gate: `node tools/ci/button-physical-gang-parity-gate.js`

## Flows

| Rule | Detail |
|------|--------|
| IDs | Globally unique; prefer `{driver}_physical_gang{N}_{on\|off}` for wall |
| No | `titleFormatted` with `[[device]]` |
| Capability filter | Prefer capability-based cards over “every device” |

Audit: `node tools/ci/layer-pass-audit.js` (4843+ cards scanned; zero `[[device]]` as of P155)

## Auto-maintenance (honest scope)

| Layer | Owns |
|-------|------|
| GitHub Actions / `tools/ci/*` | Crawl, gates, Gmail patterns, publish |
| App runtime | Caps, timers, mixins — **not** code mutation |
| Humans / Cursor | Surgical fixes → push → Test soak |

Do **not** build Homey-side “try many drivers” or autonomous full-tree rewrite bots.

## Complementary enrichment (P2224)

Energy / button / flow contracts sit beside pipeline L0–L11 and button capture L1–L8.

- Glossary: [`config/resilience/layer-glossary.json`](../../config/resilience/layer-glossary.json)
- Domains: `battery`, `energy_divisors`, `buttons_bidirectional`, `flows`, `l14_telemetry`
- Doctrine: [`COMPLEMENTARY_ENRICHMENT.md`](./COMPLEMENTARY_ENRICHMENT.md)

