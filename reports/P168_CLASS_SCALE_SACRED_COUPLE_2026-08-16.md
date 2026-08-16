# P168 — Class-scale sacred-couple audit (ALL Homey classes) (2026-08-16)

## Mandate

Execute P151 scale playbook across **every** driver class — not a 430-driver rewrite.
Couple-first: exclusivity → energy honesty → registry → mfs_db → CI.

## Inventory (431 compose drivers / 17 classes)

| Class | Count |
|-------|------:|
| socket | 117 |
| sensor | 108 |
| light | 60 |
| other | 30 |
| button | 26 |
| thermostat | 26 |
| remote | 18 |
| fan | 13 |
| windowcoverings | 11 |
| lock | 5 |
| doorbell | 4 |
| garagedoor | 4 |
| heater | 4 |
| curtain | 2 |
| camera / vacuum / speaker | 1 each |

## Results (this pass)

| Metric | Before (P167) | After P168 |
|--------|---------------|------------|
| `_TZ*` dual-claim conflicts | 48 | **0** |
| Cross-class absurd duals | (many) | **0** |
| Same-class duals | 86 | **0** |
| Registry audit failures | 0 | **0** |
| Energy approx+power | 0 | **0** |
| False `energy.mains` on battery devices | 24 | **stripped** |

Left intentional: `ultrasonic_heat_meter` AA + meter (real battery heat meters).

## Tools added

```bash
node tools/ci/audit-sacred-couple-by-class.js
node tools/ci/audit-sacred-couple-by-class.js --fix-cross-class [--apply]
node tools/ci/apply-class-scale-sacred-fixes.js [--apply]
node tools/ci/audit-sacred-couple.js --from-registry
node tools/ci/dual-claim-compose-gate.js
```

CI (`syntax-check.yml`): registry + dual-claim + class-scale + energy gates.

## Class pass actions

### socket
- `_TZ3000_wkr3jqmr` → **`switch_4gang` only** (ZHA TS0004 4-gang); stripped from `switch_1gang`
- DIN relays / plugs already locked in P167

### light
- Strip vs bulb exclusivity (led_strip / rgb_led_strip / christmas / dimmable strip vs bulbs)
- Wall dimmer vs E14 CCT → tunable_bulb_E14 (MiBoxer/Lidl CCT family)
- Tuya wall dimmers stay on `wall_dimmer_tuya`

### sensor / button / remote
- Removed false `energy.mains: true` when CR* batteries present (24 drivers)
- IR remotes stripped from `button_wireless_4`
- Motion hybrid dual → `smart_motion_sensor`

### thermostat / climate_ctrl
- Last TRV dual `_TZE200_spyvfeti` → `device_radiator_valve` (strip smart duplicate)

### cover / fan / lock / other
- No intersecting `_TZ*` dual-claims remaining after light/socket/sensor pass
- Multi-mfr across families **without** pid intersection left alone (sacred-couple doctrine)

### mfs_db
- Registry cases realigned (`driverId` + `modelIds`) where object entries exist

## Per-class checklist status

```text
[x] Registry queue green
[x] Dual-claim gate 0 TZ conflicts
[x] Class audit 0 absurd / 0 same-class dual
[x] Energy approximation gate OK
[x] False mains stripped on battery primaries
[x] CI wired
[ ] Stable static backport — after Test soak only
```

## Explicit non-goals (still)

- Auto-PR from Z2M
- Homey runtime self-repair
- Full-tree master→stable
- Mass wipe of intentional `_hybrid_*` sentinels

## Retest

```bash
node tools/ci/dual-claim-compose-gate.js
node tools/ci/audit-sacred-couple-by-class.js
node tools/ci/audit-sacred-couple.js --from-registry
node tools/ci/energy-compose-gate.js
```
