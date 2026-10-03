# JohanBendz/com.tuya.zigbee branches — cross-check 2026-10-03 (inspiration only, no code copied)

Branches: master, develop-0.4 (active, last merge PR #1507 2026-10-03 12:45 Paris), feature/0.4-ias-leak-unknown-cells-1041
(same manifest as develop-0.4), feature/0.4-mowe-ias-rain, feature/0.4-standard-zcl-temphumids-797 (merged via #1506),
modernize-2026-issues (frozen v0.3.1), modernize-2026, refactor/type-based-drivers, SDK3, SDK3-test, dev, sdk-3 (older lines).

Method: only narrow upstream profiles (≤4 mfr × pid combinations, i.e. exact-pair drivers backed by physical
interviews in upstream issues) from develop-0.4 and feature/0.4-mowe-ias-rain were compared with our couples —
165 identities, 161 already on one of our drivers.

## Gaps (leads — need the upstream interview read before acting, D3/C5)
| Identity | Upstream profile | Ours today | Next step |
|---|---|---|---|
| `_TZ3000_o9f2zqln` / TS0207 | IAS rain sensor (alarm_water, battery) | mfr on water_leak_sensor_tuya without TS0207 → not matched | read source issue; dedicated exact driver if it conflicts |
| `_TZ3210_iystcadi` / TS0505A | RGB+CCT light bar | mfr on light_bulb_rgb_led (TS0505B) only | check TS0505A on that driver for cross products; else exact driver |
| `_TZ3000_p26flek3` / TS0001 | 1-channel relay board (upstream #1172, interview) | mfr on **climate_sensor** | likely misroute of the mfr; exact relay couple needed |

Ideas worth reusing (our own implementation): exact-pair isolated manifests to avoid cross products; `energy.batteries`
`OTHER` when the cell is unproven; standard IAS enrollment first with legacy fallback (feature/0.4-mowe-ias-rain).
Credit: Johan Bendz (CREDITS.md, spec 009 section).
