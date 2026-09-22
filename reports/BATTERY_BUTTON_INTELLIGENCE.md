# Battery / Button Intelligence Gate

Generated: 2026-09-22T08:01:07.799Z

- Errors: **0**
- Warnings: **44**

| Rule | Severity | File | Line | Detail |
|------|----------|------|------|--------|
| B5 | warn | `drivers/motion_sensor/device.js` | 1452 | batteryVoltage scaled by a hardcoded unit divisor — remotes reporting mV read ten times too high; use normalizeZclBatteryVoltagePercent |
| B5 | warn | `drivers/sensor_contact_motion/device.js` | 1442 | batteryVoltage scaled by a hardcoded unit divisor — remotes reporting mV read ten times too high; use normalizeZclBatteryVoltagePercent |
| B5 | warn | `lib/BatteryManagerV4.js` | 513 | batteryVoltage scaled by a hardcoded unit divisor — remotes reporting mV read ten times too high; use normalizeZclBatteryVoltagePercent |
| B5 | warn | `lib/BatteryManagerV4.js` | 641 | batteryVoltage scaled by a hardcoded unit divisor — remotes reporting mV read ten times too high; use normalizeZclBatteryVoltagePercent |
| B5 | warn | `lib/devices/BaseUnifiedDevice.js` | 2008 | batteryVoltage scaled by a hardcoded unit divisor — remotes reporting mV read ten times too high; use normalizeZclBatteryVoltagePercent |
| B5 | warn | `lib/devices/BaseUnifiedDevice.js` | 3437 | batteryVoltage scaled by a hardcoded unit divisor — remotes reporting mV read ten times too high; use normalizeZclBatteryVoltagePercent |
| B5 | warn | `lib/devices/BaseUnifiedDevice.js` | 3780 | batteryVoltage scaled by a hardcoded unit divisor — remotes reporting mV read ten times too high; use normalizeZclBatteryVoltagePercent |
| B5 | warn | `lib/devices/BaseUnifiedDevice.js` | 4524 | batteryVoltage scaled by a hardcoded unit divisor — remotes reporting mV read ten times too high; use normalizeZclBatteryVoltagePercent |
| B5 | warn | `lib/devices/BaseUnifiedDevice.js` | 4979 | batteryVoltage scaled by a hardcoded unit divisor — remotes reporting mV read ten times too high; use normalizeZclBatteryVoltagePercent |
| B5 | warn | `lib/devices/UnifiedSensorBase.js` | 1425 | batteryVoltage scaled by a hardcoded unit divisor — remotes reporting mV read ten times too high; use normalizeZclBatteryVoltagePercent |
| B5 | warn | `lib/devices/UnifiedSensorBase.js` | 4684 | batteryVoltage scaled by a hardcoded unit divisor — remotes reporting mV read ten times too high; use normalizeZclBatteryVoltagePercent |
| B5 | warn | `lib/diagnostics/HealthCheck.js` | 151 | batteryVoltage scaled by a hardcoded unit divisor — remotes reporting mV read ten times too high; use normalizeZclBatteryVoltagePercent |
| B5 | warn | `lib/tuya/DataRecoveryManager.js` | 484 | batteryVoltage scaled by a hardcoded unit divisor — remotes reporting mV read ten times too high; use normalizeZclBatteryVoltagePercent |
| B5 | warn | `lib/tuya/TuyaSyncManager.js` | 234 | batteryVoltage scaled by a hardcoded unit divisor — remotes reporting mV read ten times too high; use normalizeZclBatteryVoltagePercent |
| F1 | warn | `drivers/button_wireless/driver.compose.json` | - | marketing model names used as productId (ZG-101ZL) — the hardware reports TS0601/TS02xx, so these entries never match; real couples are in data/marketing-model-alias-registry.json |
| F1 | warn | `drivers/button_wireless_1/driver.compose.json` | - | marketing model names used as productId (ZG-101ZD, ZG-101ZL) — the hardware reports TS0601/TS02xx, so these entries never match; real couples are in data/marketing-model-alias-registry.json |
| F1 | warn | `drivers/climate_sensor/driver.compose.json` | - | marketing model names used as productId (ZG-227Z, ZG-227ZL, ZG-227ZH, ZG-227ZP) — the hardware reports TS0601/TS02xx, so these entries never match; real couples are in data/marketing-model-alias-registry.json |
| F1 | warn | `drivers/contact_sensor/driver.compose.json` | - | marketing model names used as productId (ZG-102Z, ZG-102ZL, ZG-102ZA) — the hardware reports TS0601/TS02xx, so these entries never match; real couples are in data/marketing-model-alias-registry.json |
| F1 | warn | `drivers/curtain_motor/driver.compose.json` | - | marketing model names used as productId (ZG-301Z, ZG-302Z1, ZG-301Z-MOTO, zg-301z-moto) — the hardware reports TS0601/TS02xx, so these entries never match; real couples are in data/marketing-model-alias-registry.json |
| F1 | warn | `drivers/gas_sensor/driver.compose.json` | - | marketing model names used as productId (ZG-225Z) — the hardware reports TS0601/TS02xx, so these entries never match; real couples are in data/marketing-model-alias-registry.json |
| F1 | warn | `drivers/illuminance_sensor/driver.compose.json` | - | marketing model names used as productId (ZG-106Z) — the hardware reports TS0601/TS02xx, so these entries never match; real couples are in data/marketing-model-alias-registry.json |
| F1 | warn | `drivers/lcdtemphumidsensor/driver.compose.json` | - | marketing model names used as productId (ZG-227Z) — the hardware reports TS0601/TS02xx, so these entries never match; real couples are in data/marketing-model-alias-registry.json |
| C2 | warn | `drivers/motion_sensor/device.js` | - | motion_sensor adds "measure_battery" at runtime but the manifest does not declare it — Homey has no title, unit or energy metadata for it |
| C2 | warn | `drivers/presence_sensor_radar/device.js` | - | presence_sensor_radar adds "onoff" at runtime but the manifest does not declare it — Homey has no title, unit or energy metadata for it |
| F1 | warn | `drivers/presence_sensor_radar/driver.compose.json` | - | marketing model names used as productId (ZG-204Z, ZG-204ZE, ZG-204ZH, ZG-204ZK, ZG-204ZL, ZG-204ZM, ZG-204ZP, ZG-204ZQ, ZG-204ZV, ZG-204ZX, ZG-205Z, ZG-205ZL, ZG-302ZL, ZG-302ZM, ZG-205W, ZG-210Z) — the hardware reports TS0601/TS02xx, so these entries never match; real couples are in data/marketing-model-alias-registry.json |
| F1 | warn | `drivers/rain_sensor/driver.compose.json` | - | marketing model names used as productId (ZG-223Z) — the hardware reports TS0601/TS02xx, so these entries never match; real couples are in data/marketing-model-alias-registry.json |
| F1 | warn | `drivers/scene_switch_4/driver.compose.json` | - | marketing model names used as productId (ZG-101ZS) — the hardware reports TS0601/TS02xx, so these entries never match; real couples are in data/marketing-model-alias-registry.json |
| C2 | warn | `drivers/sensor_contact_motion/device.js` | - | sensor_contact_motion adds "measure_battery" at runtime but the manifest does not declare it — Homey has no title, unit or energy metadata for it |
| F1 | warn | `drivers/sensor_contact_zigbee/driver.compose.json` | - | marketing model names used as productId (ZG-102Z, ZG-102ZL, ZG-102ZA) — the hardware reports TS0601/TS02xx, so these entries never match; real couples are in data/marketing-model-alias-registry.json |
| F1 | warn | `drivers/sensor_illuminance_presence/driver.compose.json` | - | marketing model names used as productId (ZG-106Z) — the hardware reports TS0601/TS02xx, so these entries never match; real couples are in data/marketing-model-alias-registry.json |
| C2 | warn | `drivers/sensor_motion_radar/device.js` | - | sensor_motion_radar adds "onoff" at runtime but the manifest does not declare it — Homey has no title, unit or energy metadata for it |
| C2 | warn | `drivers/sensor_presence_radar/device.js` | - | sensor_presence_radar adds "measure_battery" at runtime but the manifest does not declare it — Homey has no title, unit or energy metadata for it |
| F1 | warn | `drivers/sensor_presence_radar/driver.compose.json` | - | marketing model names used as productId (ZG-204ZL, ZG-204ZM, ZG-204ZV) — the hardware reports TS0601/TS02xx, so these entries never match; real couples are in data/marketing-model-alias-registry.json |
| F1 | warn | `drivers/siren/driver.compose.json` | - | marketing model names used as productId (ZG-229Z) — the hardware reports TS0601/TS02xx, so these entries never match; real couples are in data/marketing-model-alias-registry.json |
| F1 | warn | `drivers/smart_knob/driver.compose.json` | - | marketing model names used as productId (ZG-101ZD, ZG-101Z, ZG-101ZE) — the hardware reports TS0601/TS02xx, so these entries never match; real couples are in data/marketing-model-alias-registry.json |
| F1 | warn | `drivers/smart_knob_rotary/driver.compose.json` | - | marketing model names used as productId (ZG-101ZD, ZG-101Z) — the hardware reports TS0601/TS02xx, so these entries never match; real couples are in data/marketing-model-alias-registry.json |
| F1 | warn | `drivers/soil_sensor/driver.compose.json` | - | marketing model names used as productId (ZG-303Z) — the hardware reports TS0601/TS02xx, so these entries never match; real couples are in data/marketing-model-alias-registry.json |
| F1 | warn | `drivers/switch_1gang/driver.compose.json` | - | marketing model names used as productId (ZG-301Z, ZG-302Z1, zg-301z) — the hardware reports TS0601/TS02xx, so these entries never match; real couples are in data/marketing-model-alias-registry.json |
| F1 | warn | `drivers/switch_2gang/driver.compose.json` | - | marketing model names used as productId (ZG-305Z, ZG-301Z-2CH, ZG-302Z2) — the hardware reports TS0601/TS02xx, so these entries never match; real couples are in data/marketing-model-alias-registry.json |
| F1 | warn | `drivers/switch_3gang/driver.compose.json` | - | marketing model names used as productId (ZG-302Z3, ZG-301Z-3CH, zg-301z-3ch) — the hardware reports TS0601/TS02xx, so these entries never match; real couples are in data/marketing-model-alias-registry.json |
| F1 | warn | `drivers/vibration_sensor/driver.compose.json` | - | marketing model names used as productId (ZG-102ZM, ZG-103Z, ZG-103ZL, ZG-228Z) — the hardware reports TS0601/TS02xx, so these entries never match; real couples are in data/marketing-model-alias-registry.json |
| F1 | warn | `drivers/water_leak_sensor/driver.compose.json` | - | marketing model names used as productId (ZG-222Z, ZG-222ZA, ZG-226Z) — the hardware reports TS0601/TS02xx, so these entries never match; real couples are in data/marketing-model-alias-registry.json |
| F1 | warn | `drivers/water_leak_sensor_tuya/driver.compose.json` | - | marketing model names used as productId (ZG-222Z) — the hardware reports TS0601/TS02xx, so these entries never match; real couples are in data/marketing-model-alias-registry.json |
| C2 | warn | `drivers/wifi_sensor/device.js` | - | wifi_sensor adds "alarm_battery" at runtime but the manifest does not declare it — Homey has no title, unit or energy metadata for it |
