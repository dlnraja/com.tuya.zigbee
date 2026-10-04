# Johan branch gaps resolved 2026-10-04 (research notes, our wording)

| couple | what it is (sources) | before | after |
|---|---|---|---|
| `_TZ3000_o9f2zqln` / TS0207 | MOWE MW815R rain sensor, standard IAS (Johan physical interview #473, profile #1288, merged PR #1505 `rain_sensor_mowe`) | mfr on `water_leak_sensor_tuya`, whose pids never include TS0207 (no working couple) | mfr on `rain_sensor` (has TS0207 + native IAS rain path). Runtime hint in lib/tuya fingerprints updated. |
| `_TZ3000_p26flek3` / TS0001 | 1-channel relay/switch (Johan #1172 interview; Z2M generic TS0001 entry with per-mfr options; zigpy/zha test device `tz3000-p26flek3-ts0001`; homed tuya.json) | mfr on `climate_sensor` (TS0201/TS0222/TS0601 — no working couple) | mfr on `switch_1gang` (TS0001, native onOff). Runtime hint updated. |
| `_TZ3210_iystcadi` / TS0505B | Lidl Livarno Lux RGB+CCT light bar (Z2M `lidl.ts`, ioBroker, SmartThings Edge multifunction light) | on `light_bulb_rgb_led` (TS0505B) | unchanged — already correct. |
| `_TZ3210_iystcadi` / TS0505A | only appears as a cross-product of Johan's `rgb_led_light_bar` (TS0505A+TS0505B); no interview | — | deferred until a real TS0505A report (would need an exact driver; never invent a couple). |

Credits: Johan Bendz and the reporters of JohanBendz #473/#1288/#1172; Koenkk (zigbee-herdsman-converters); zigpy/zha; u236/homed; ioBroker.zigbee; Mariano Colmenarejo (SmartThings Edge).
