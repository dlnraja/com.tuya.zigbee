# P3077 — phantom couples: one couple, one driver

Owner request t614u (dlnraja, 27/10/2026 Paris): check online whether each mfr+pid couple is real and decide keep / move / edit / remove.

## Method

- `scripts/leads/p3077-phantom-audit.js` lists every couple that Homey's per-driver manufacturerName x productId product puts on 2+ drivers (618 after P3055).
- Attestation index: `data/kb/couples.json` (exact couples with a URL from Z2M/zhc, ZHA quirks, deCONZ, Johan Bendz), the herdsman cache, couple-guard, diag ids, sacred pins and the user-misattribution registry.
- An mfr is dropped from a driver only when none of its couples on that driver is attested, and only when another driver of the right device class keeps it **with its real productId**. A TS0601 pid is never dropped and never used alone to decide.
- Manifest removal does not unpair anything: Homey keeps the driver id of devices already paired.
- Baseline (P3024b) couples lost by a move get an exemption with reason, approvedBy t614u and date.

## Batch 1 — 18 mfr moves (wrong class, unattested on the source driver)

| mfr | removed from | stays on | real pid | hardware | source | author |
|---|---|---|---|---|---|---|
| `_TZ3000_nbnmw9nc` | dimmer_wall_1gang | bulb_dimmable | TS0501A | Lidl/Livarno dimmable bulb | [link](https://github.com/zigpy/zha-device-handlers/blob/d54cf9e80b9b2709d3294684d485eee83a0a8fe0/zhaquirks/lidl/TS0501A.py) | zigpy ZHA quirks contributors |
| `_TZ3000_nosnx7im` | dimmer_wall_1gang | bulb_dimmable | TS0501A | Lidl/Livarno dimmable bulb | [link](https://github.com/zigpy/zha-device-handlers/blob/d54cf9e80b9b2709d3294684d485eee83a0a8fe0/zhaquirks/lidl/TS0501A.py) | zigpy ZHA quirks contributors |
| `_TZ3210_dbilpfqk` | dimmer_wall_1gang | bulb_dimmable | TS0501B | single-colour dimmable LED (ts0501bs) | [link](https://github.com/zigpy/zha-device-handlers/blob/d54cf9e80b9b2709d3294684d485eee83a0a8fe0/zhaquirks/tuya/ts0501bs.py) | zigpy ZHA quirks contributors |
| `_TZ3210_dxroobu3` | dimmer_wall_1gang | bulb_dimmable | TS0501B | single-colour dimmable LED (ts0501bs) | [link](https://github.com/zigpy/zha-device-handlers/blob/d54cf9e80b9b2709d3294684d485eee83a0a8fe0/zhaquirks/tuya/ts0501bs.py) | zigpy ZHA quirks contributors |
| `_TZ3000_qd7hej8u` | dimmable_led_strip | bulb_rgb | TS0505A/TS0505B/ZB-CL01 | RGB E27 bulb | [link](https://github.com/JohanBendz/com.tuya.zigbee/blob/61577d8ec2572bf8c7c4c2ff210284575acd295b/drivers/rgb_bulb_E27/driver.compose.json) | Johan Bendz |
| `_TZ3210_mja6r5ix` | dimmable_led_strip | bulb_rgb | TS0505A/TS0505B/ZB-CL01 | RGB E27 bulb | [link](https://github.com/JohanBendz/com.tuya.zigbee/blob/61577d8ec2572bf8c7c4c2ff210284575acd295b/drivers/rgb_bulb_E27/driver.compose.json) | Johan Bendz |
| `_TZ3000_q50zhdsc` | dimmable_led_strip | bulb_rgb | TS0505A/TS0505B/ZB-CL01 | RGB E27 bulb | [link](https://github.com/JohanBendz/com.tuya.zigbee/blob/61577d8ec2572bf8c7c4c2ff210284575acd295b/drivers/rgb_bulb_E27/driver.compose.json) | Johan Bendz |
| `_TZB210_zdvrsts8` | bulb_rgbw | bulb_rgb | TS0503B | Skydance WZ5 RGB controller (RGB only, no white channel) | [link](https://github.com/Koenkk/zigbee-herdsman-converters/blob/7462b541b367c301057aee995e6e6756e5f7e985/src/devices/skydance.ts#L59) | Koenkk / zigbee-herdsman-converters contributors |
| `_TZ3210_ttkgurpb` | wall_dimmer_tuya | bulb_rgbw | TS0504B | MiBoxer FUT038Z RGBW LED controller | [link](https://github.com/Koenkk/zigbee-herdsman-converters/blob/7462b541b367c301057aee995e6e6756e5f7e985/src/devices/miboxer.ts#L286) | Koenkk / zigbee-herdsman-converters contributors |
| `_TZ3210_huzkzqyk` | wall_dimmer_tuya | lcdtemphumidluxsensor | TS0201/TS0222 | LCD temperature/humidity/lux sensor | [link](https://github.com/JohanBendz/com.tuya.zigbee/blob/61577d8ec2572bf8c7c4c2ff210284575acd295b/drivers/lcdtemphumidluxsensor/driver.compose.json) | Johan Bendz |
| `_TZ3210_k1pe6ibm` | wall_dimmer_tuya | rgb_led_strip_controller | TS0503A/TS0503B/TS0504B/TS0505B | RGB LED strip controller | [link](https://github.com/JohanBendz/com.tuya.zigbee/blob/61577d8ec2572bf8c7c4c2ff210284575acd295b/drivers/rgb_led_strip_controller/driver.compose.json) | Johan Bendz |
| `_TZ3210_r0xgkft5` | led_controller_cct | rgb_mood_light | TS0505A/TS0505B | RGB mood light | [link](https://github.com/JohanBendz/com.tuya.zigbee/blob/61577d8ec2572bf8c7c4c2ff210284575acd295b/drivers/rgb_mood_light/driver.compose.json) | Johan Bendz |
| `_TZ3000_cymsnfvf` | button_wireless_2 | plug | TS011F | ZP-LZ-FR2U smart plug | [link](https://www.zigbee2mqtt.io/devices/ZP-LZ-FR2U.html) | Koenkk / zigbee-herdsman-converters contributors |
| `_TZ3000_ew31dmgx` | button_wireless_2 | plug | TS011F | TS011F smart plug | [link](https://github.com/JohanBendz/com.tuya.zigbee/blob/61577d8ec2572bf8c7c4c2ff210284575acd295b/drivers/plug/driver.compose.json) | Johan Bendz |
| `_TZ3000_hyfvrar3` | button_wireless_2 | plug | TS011F | SM0212 smart plug | [link](https://www.zigbee2mqtt.io/devices/SM0212.html) | Koenkk / zigbee-herdsman-converters contributors |
| `_TZ3000_kdi2o9m6` | button_wireless_2 | plug | TS011F | TS011F smart plug | [link](https://github.com/JohanBendz/com.tuya.zigbee/blob/61577d8ec2572bf8c7c4c2ff210284575acd295b/drivers/plug/driver.compose.json) | Johan Bendz |
| `_TZ3000_plyvnuf5` | button_wireless_2 | plug | TS011F | Lidl HG06337 plug | [link](https://www.zigbee2mqtt.io/devices/HG06337.html) | Koenkk / zigbee-herdsman-converters contributors |
| `_TZ3000_upjrsxh1` | button_wireless_2 | plug | TS011F | Lidl HG06337 plug | [link](https://www.zigbee2mqtt.io/devices/HG06337.html) | Koenkk / zigbee-herdsman-converters contributors |

Note: the local KB labelled `_TZ3210_ttkgurpb` as FUT089Z; the zhc source (miboxer.ts) says FUT038Z RGBW controller, so it stays on bulb_rgbw.

## Kept on purpose (same device class on both drivers, or attested on both)

- `_TZ3000_c8ozah8n`, `_TZ3000_mmtwjmaq` TS0202 (motion_sensor and pir_sensor_2, both PIR).
- `_TZ3000_dpo1ysak`, `_TZ3000_wamqdr3f`, `_TZ3000_fqoynhku`, `_TZ3000_gjnozsaz`, `_TZ3000_cehuw1lw`, `_TZ3000_u5u4cakc` (plug-class duals).
- HOBEIAN TS000x/TS001x (Johan switch_2_gang lists the `hobeian` form for wall switches); `_TZ3000_skueekg3`, `_TZ3000_9ni6xxld` (pinned), `_TZ3008_reatplte` (pinned).
- `_TZ3000_yi0n4xfd`, `_TZ3000_46vasa5h`, `_TYZB01_v8gtiaed` (switch_1gang), `_TZ3000_nsa76jai`, `_TZ3000_kmsbwdol` (climate_sensor) and `_TZ3000_xwh1e22x` (bulb_rgbw): their real couple is already on the right driver (smartPlug_DinRail, double_power_point_2, dimmer_2_gang, switch_4gang, curtain_module_2_gang, button_wireless_4), but data/native-matrix-reviewed-duals.json records an earlier owner decision to keep the old entry (FUT089Z: until a real-device soak). Moves dropped; they need an explicit owner override.
- `_TZE284_xpq2rzhq` TS0601 stays on climate_sensor and presence_sensor_radar: it is a reviewed dual in data/native-matrix-reviewed-duals.json (user decision 2026-10-04), so the move was dropped.
- 505 unattested duals are collateral: dropping them would cost an attested couple on the same driver (needs a driver split, left pending).

## Publish budget (publish caps 15500)

Porting P3055 and batch 1 to master first pushed the capped publish payload to 15662 combos (limit 15500).
The cause was not the new guard pins: 31 `_TZ3000_9ni6xxld` couples (x2 case forms) that P3055 had removed
from `gas_sensor_switch` as parasites were still "owned" by `plug_energy_monitor`, where the mfr sits next to
77 productIds. The baseline resolver re-pinned them there, adding 28 productIds x 12 mfrs (+336 combos).

Fix: `resolveBaselinePins` now honours an exemption before it looks for a new owner (the gate already keys
exemptions on mfr+pid), and the 62 P3055 `9ni6xxld` removals got their exemption. No exempted couple is
attested (checked against data/kb/couples.json). Result: 15497 combos, P3024b all 14227 couples present,
no sacred pin missing, no attested couple lost (973 attested couples in the capped payload vs 959 before).

`_TZE284_6ycgarab + TS0205`: P3067 gave it a single owner (`smoke_sensor`); the P3055 decision rows now say so.

## Pending

- `hobeian` on gas_sensor/siren/ir_blaster, `_TZ3000_pzui3skt` on smart_knob_rotary, `_TZB000_42ha4rsc` cover duplicate, `_TZ3290_ixd9mvv4` valve duplicate, HEIMAN on universal_zigbee: need more evidence before any change.
- TS0601 duals on bulb_rgb/bulb_rgbw/button_wireless_*: never dropped by pid; per-mfr review only.
