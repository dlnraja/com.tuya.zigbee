# Athom AggregateError on master — bisect result (2026-10-10)

- First failing build: 9.0.1331 (#3442). Manifest diff 1330 -> 1331 = new driver `led_controller_spi_tuya`.
- Two separate causes found:
  1. `lib/wifi/WifiFixIt.js` inline `require('../../package.json')` (fixed fd5500a61b / 578843d3d3). Tests H/I passed only with the 1330 versions.
  2. `led_controller_spi_tuya`: J3 #3478 (I + spi + whd02 + sub_dim_set, publish.yml) and J4 #3479 (I + spi only) = AggregateError. I #3468 without it = Test.
- Pipeline (auto-publish-on-push vs publish.yml): NOT the cause. Same composite publish action. J2 #3475 / J2b #3477 (exact I content via auto-publish) = `socket hang up`, not AggregateError. Only payload difference: job env HOMEY_ZIGBEE_MAX_TOTAL_COMBOS=14000 (vs 17000 default) -> fewer couples, no empty drivers.
- Fix: `config/publish-hold-drivers.json` + prepare-publish step 5a2 leave the never-published driver out of the upload (source, tests, sacred-keep gates untouched). Its couples stay on switch_1gang.
- Note: J4 also lacked lib/tuya/DpCoalescer.js (I runtime), so J4 alone is not proof of the root cause inside the driver; the 1331 manifest diff + J3 make the driver the prime suspect. Stable 5.12.367 processes the same driver fine -> interaction with the master manifest, cause inside the driver still open.
- Re-enable: remove the entry, publish a dedicated bisect build first.
