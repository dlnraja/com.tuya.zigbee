# P2970 — Beca BAC-006AZB / BAC-002-ALZB on wall_thermostat

Reported by Umberto Maffii (Homey store suggestion): the Beca BAC-006AZB pairs but shows up as a plain switch, not a thermostat.

## Identity (exact couples)
| mfr | pid | source |
|---|---|---|
| `_TZE204_dzuqwsyg` | TS0601 | Z2M tuya.ts BAC-002-ALZB fingerprint + whitelabel Beca BAC-003; Z2M discussion #25308 (BAC-006AZB) |
| `_TZE200_dzuqwsyg` | TS0601 | Z2M tuya.ts BAC-002-ALZB fingerprint |

Before: `_TZE204_dzuqwsyg` was on `switch_1gang`, `_TZE200_dzuqwsyg` on `device_radiator_valve` (TRV DP map). Both were the wrong device class, so they were moved (not duplicated). This is the one non-additive change, and it is deliberate. Script: `tools/ci/p2970-bac002-wall-thermostat.js` (idempotent, `--check`).

## DP map (Z2M BAC-002-ALZB, in our own words)
| DP | meaning | Homey |
|---|---|---|
| 1 | power bool | `onoff` (off = system_mode off) |
| 2 | system mode enum 0 cool / 1 heat / 2 fan_only | `thermostat_mode` |
| 4 | preset bool, true = manual / false = auto | `thermostat_programming` ('0' manual) |
| 16 | setpoint, **whole °C** | `target_temperature` (TX not ×10; RX ≥100 read as tenths as a safety net) |
| 19 / 26 / 27 | max temp / deadzone / calibration | logged |
| 24 | room temp /10 | `measure_temperature` |
| 28 | fan 0 low / 1 medium / 2 high / 3 auto | `fan_mode` |
| 40 | child lock | `child_lock` |
| 101 | weekly schedule blob (36 bytes) | ignored: never TX'd as a bool (on TYBAC-006 DP101 is the manual bool) |

Existing users with the device on the old driver must re-pair it once so Homey picks the thermostat driver.
