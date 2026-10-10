# Gledopto GL-SPI-206P (`led_controller_spi_tuya`) — runtime fix + Athom status (2026-10-10)

Sources (rewritten, credited): zigbee-herdsman-converters `src/devices/gledopto.ts` (Koen Kanters and
contributors) `GL-SPI-206P` + `tzLocal.glspi206p_light`; Koenkk/zigbee2mqtt#32754 (bursts freeze the MCU).

## Fingerprints (verified, unchanged)
ZHC fingerprint: TS0601 + `_TZE204_8fffc3kb`, `_TZE284_gt5al3bl`, `_TZE28C1000000_gt5al3bl`. Nothing invented.
Couples also stay on `switch_1gang` (reviewed exception in data/native-matrix-reviewed-duals.json).

## Runtime fixes (master)
- One EF00 frame per change (`lib/tuya/TuyaMultiDpFrame.js`): seq16 + `[dp,type,len16,data]...`, like ZHC
  `sendDataPoints`. Per-DP max fallback only when no single-frame path exists (was: one frame per DP, each
  through a 6-path cascade = the burst Z2M warns about).
- Profile lists all 6 manifest capabilities: base `TuyaDpProfileDevice` used to REMOVE `light_temperature`
  / `light_mode` at each boot (then device re-added them) -> broken Flow cards / insights.
- Brightness in colour mode goes inside DP61 (DP3 alone is ignored in colour mode); white mode sends DP4 + DP3
  together (as ZHC). dim 0 -> DP1 off (DP3 floor 10). DP2 written only when the mode really changes.
- RX: DP2 work mode -> `light_mode`, DP4 -> `light_temperature` (0 = warm). DP61 stays write-only (h/s in memory + store).
- onoff TX through the coalescer too (DP1 in the same frame). Timers are Homey-managed (DpCoalescer).
- `driver.flow.compose.json` explicit empty `{triggers:[],conditions:[],actions:[]}` (the old fleet-enrich trigger
  with `{brightness}` titleFormatted was dropped earlier, e777baa3b6).
- energy.approximation (usageOn 15 / usageOff 0.5), no fake measure_power.

## Athom status — IMPORTANT
- Master #3480 v9.0.1361 (run 38070570358) WITH the hold active (`[publish-hold] held back 1 driver(s)
  [led_controller_spi_tuya]`) = processing_failed AggregateError. So this driver is NOT the (only) cause on
  master. Earlier: Test D #3463 (master without the driver) also failed.
- J4 #3479 (I + this driver) lacked lib/tuya/DpCoalescer.js, so it is not clean proof against the driver.
- Local payload simulation (Node 22, prepare-publish, hold removed): driver manifest is well formed, 6 mfr forms,
  no empty driver; no new unresolvable relative require vs 9.0.1330.
- Remaining I -> master payload deltas to bisect: switch_module_whd02 (+2 triggers), action sub_dim_set,
  energy.approximation on 18 drivers, class socket->light (dimmer_2_gang_tuya, wall_dimmer_1gang_1way).
- Hold stays until a build with this driver reaches Test.
