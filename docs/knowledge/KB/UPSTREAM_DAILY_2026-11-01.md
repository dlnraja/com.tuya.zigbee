# Upstream daily, 2026-11-01 (light run after failed runs 28–31/10)

Likely cause of the failed runs: the box inode exhaustion of 31/10 wiped /workspace/kb/zhc-pkg/node_modules, so the Z2M source could not load. Reinstalled zigbee-herdsman-converters 26.125.0 there. Note: pass no `--zhc-pkg` (the script expects the package dir itself, default path is right).

Clones moved: zhc c18c32d (27/10), herdsman c1a54e3, ZHA 862124c, tuya-local dcb0d40, SmartThings 4fa6683, st-mariano 88f56fd, tinytuya c0eb2ee, Tasmota 9107ce7, Domoticz-cert 0093b8a, z2m-site a55fd7d, Koenkk OTA f57c8a3.

Coverage matrix (all sources, master): total 3573→3578, absent 520→528, complete 673→680, wrong class 1→1. stable-v5 absent 544→547, bastien-home 471→474. The +8 absent on master are 5 deliberate P3077 moves of invented pid forms (q9mpfhw, TS0502B, commits 39af707353, 62fee51b9d) plus 3 new upstream couples.

New upstream couples, parked as leads (one source each = Z2M):
- Vareo HYT001ZB `_TZE284_48ye65rk`/TS0601, floor-heating/boiler thermostat (Z2M src/devices/tuya.ts). Candidate: floor_heating_thermostat family; DPs to map from the Z2M definition before placing.
- Moes SFL02-Z-1 `_TZE284_stvgmdjz`/TS0601, 1-gang touch switch with scene mode, backlight, indicator, induction and vibration settings (Z2M src/devices/moes.ts). Candidate: a TS0601 1-gang DP switch driver.
- AOYAN AY-223Z (modelID AY-223Z, manufacturer AOYAN), white label of HOBEIAN ZG-223Z rain sensor (Z2M src/devices/hobeian.ts). rain_sensor already serves HOBEIAN/ZG-223Z; adding AOYAN there would cross-multiply with TS0601/TS0207, so it needs the exact-couple placer and the AOYAN padding rule (see AOYAN_PADDED_MANUFACTURER).
No new unknown commands found this run. Forum sweep is already covered by the GHA sweep (checkpoint 01/11 05:14Z, 140352 still at #2269).
