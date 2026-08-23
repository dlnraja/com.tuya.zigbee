# L99 — Energy / compensatory / estimated capabilities (2026-08-23)

## Verdict

Compensatory stacks for power / energy / conso are **dense but mostly layered correctly**. Hard gaps fixed this pass:

1. `EnergyJumpGuard` sticky divisor now **teaches** `SmartDivisorManager.rememberLearnedDivisor` (via `_energyParseMeta`).
2. `device_air_purifier_din` energy path uses **SmartDivisor + EnergyJumpGuard** (was hardcoded `/ ENERGY_DIVISORS` only → failed energy-divisor gate).
3. SSOT written: `config/architecture/energy-compensation-ssot.json`.
4. Soft inventory notes in `HomeyGapCompensator` (no phantom caps).

## Cartography (where calculated / estimated / compensated)

| Layer | Module | Role | Invents caps? |
|-------|--------|------|---------------|
| Parse scale | `SmartDivisorManager` | KNOWN + LEARNED + range | No |
| Jump defence | `EnergyJumpGuard` | Impossible kWh jump → sticky ×0.1/×0.01 | No |
| Real vs estimate | `SmartEnergyManager` | 5-min audit; promote direct | Candidates only |
| Virtual W/kWh | `VirtualEnergyMeterMixin` | Nominal power after silence | Estimate values only |
| Soft ensure | `HomeyGapCompensator` | Notes battery/L14/energy presence | **Never** |
| Dynamic overlay | `DynamicCapabilityManager` | Speculative climate etc. | Yes — heap/pressure gated |
| Parallel (soft-deprecated) | `VirtualEnergyEstimator`, `VirtualTelemetryCompensationEngine`, `DynamicEnergyManager` | Do not extend | Risk overwrite |

## Power / voltage / current / energy defaults

| Cap | Default divisor | Notes |
|-----|-----------------|-------|
| `measure_power` | 10 (some DP = 1) | Tongou DP125 special ÷8.2 |
| `measure_voltage` | 10 | |
| `measure_current` | 1000 | |
| `meter_power` | 100 (some Wh families 1000) | Jump guard + KNOWN_DIVISORS |

## Gate results (this session)

| Gate | Result |
|------|--------|
| `energy-compose-gate` | OK (4 informational batteries+power) |
| `adaptive-double-division-gate` | soft hits only (`BaseUnifiedDevice`, `TuyaEF00Manager`) |
| `check-energy-divisor` | was FAIL on `device_air_purifier_din` → **fixed** |

## Anti-slop rules (locked)

- No new energy manager.
- Estimates never overwrite `telemetry_*_source=direct`.
- No `energy.approximation` + `measure_power`/`meter_power` compose.
- HomeyGapCompensator stays soft-only for energy.
- CI SSOT under `config/architecture/` — not loaded eagerly on Homey boot.

## Follow-ups (not blocking)

- Migrate remaining meter drivers that only hardcode `/100` to `smartDivisor: true` or `smartDivisorDetect`.
- Soft-deprecate call sites of `VirtualEnergyEstimator` / `DynamicEnergyManager` toward mixin + SmartEnergy.
- Tongou DP125 ÷8.2 stays couple-specific (do not generalize).

## Commands

```bash
node tools/ci/energy-compose-gate.js
node tools/ci/adaptive-double-division-gate.js
node scripts/validation/check-energy-divisor.js
node test/critical/l99-energy-jump-divisor.test.js
```
