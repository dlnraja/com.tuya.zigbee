# MULTI_SOURCE_SWEEP P134 (sequential)

## Pipeline
1. Status 9.0.503 + publish failure diagnosed
2. Gates green (anti-bot / bare / double-division)
3. Scan: only #513 open; #517 monthly FPs partially missing
4. Fixes + ship 9.0.504

## Fixes
- **climate_sensor_zt08**: voice-safety `capabilitiesOptions.button.1` (getable/setable false, maintenanceAction true) — root cause of Auto-Publish failure on 9.0.503
- **#517 FPs**: TUYATEC climate/motion, `_TZE204/_TZE284_ksz749x8` → climate_sensor; `_TZ3000/_TZ3210_fawk5xjv` → switch_3gang; `_TZE200/_TZE204_8eazvzo6` → switch_wall_6gang
- Kept **hodyryli** exclusive on `climate_sensor_zt08`

## Version
9.0.504
