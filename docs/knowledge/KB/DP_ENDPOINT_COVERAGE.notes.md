## Research notes (P3018b)

### One couple = one driver
21 couples that two drivers served now have one owner (specific beats generic, chosen from the Z2M exposes); 9 real soil sensors held by generic drivers moved to `soil_sensor` (`_TZE284_2se8efxh`, Z2M TS0601_soil, stays on water_leak_sensor for now: that driver ships its OTA image v77 and the firmware gate requires the mfr there — moving the OTA is a separate decision). Every move is a `couple-driver-pins.json` pin + a `curated-couple-removals.json` entry (source URL). Already-paired devices keep their driver. Sources: docs/knowledge/KB_SOURCES.md § P3018b.

### Interviewed couples without a driver
- `_TYST11_jeaxp72v` / `eaxp72v` → device_radiator_valve (Siterwell GS361A-H04, Z2M `siterwell.ts`).
- Held on purpose: SONOFF `MINI-ZBRBS`, eWeLight `TS0502B` (A2 publish bisect hold, asserted by tests).
- Open: Signify `RDM001` / `RWL022` (Hue wall module / dimmer switch gen 2, Z2M `philips.ts`) need the Philips 0xFC00 manufacturer cluster decoder; no driver fits without degrading button_wireless_1 → not placed.

### TS130F `_TZ3000_cet6ch1r` EP2 / 0x0102
Z2M `src/lib/tuya.ts` cover_options: for `_TZ3000_cet6ch1r` and `_TZ3000_5iixzdo7` EP1 carries the "to open" and EP2 the "to close" calibration (`moesCalibrationTime` 0xF003 ÷10 s, `tuyaCalibration` 0xF001). EP2 is not a second cover. Runtime (master): EndpointCoverage listens passively on secondary-EP windowCovering — calibration time/mode → store `endpoint_info` (`ep2.calibration_time_s`), lift % → `windowcoverings_set.2` only if that capability exists. Optional: nothing when EP2 is absent; no bind, no write, pairing unchanged.

### air_purifier_soil placeholders
Searched Z2M (`tuya.ts` TS0601_soil, _soil_2, _soil_3, SGS02Z, ZS-300Z/301Z/300TF/SF00, HZ-SL10, QT-07S), ZHA tuya quirks, deCONZ, tuya-local, Blakadder, Johan: no hardware combines an air purifier with a soil probe. Every real Zigbee soil couple is owned by `soil_sensor` (9 moved there in P3018b). The two placeholder ids never match a real device and stay (additive policy).
