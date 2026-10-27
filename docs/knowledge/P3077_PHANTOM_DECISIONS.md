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

## Batch 2 (27/10/2026, owner t614u)

Each mfr below sat on a second driver only through the mfr x pid product. It stays on the driver of its real hardware.

| mfr | dropped from | stays on (real pid) | hardware | source (author) |
|---|---|---|---|---|
| `_TZ3000_c8ozah8n` | pir_sensor_2 | motion_sensor (TS0202) | battery PIR (ZP01 family) | https://github.com/Koenkk/zigbee2mqtt/issues/26084 (activa73) |
| `_TZ3000_mmtwjmaq` | pir_sensor_2 | motion_sensor (TS0202) | battery PIR | https://github.com/Koenkk/zigbee2mqtt/issues/11663 (jocamane), #7881 (1iverea9er) |
| `_TZ3000_wamqdr3f` | plug_energy_monitor | plug (TS011F) | Lidl Silvercrest HG06337 FR plug, no metering | zigbee-herdsman-converters `lidl.ts` (Koenkk and contributors) |
| `_TZB000_42ha4rsc` | curtain_motor_shutter | curtain_motor (TS030F) | Lidl Livarno HG09648 roller blind | zigbee-herdsman-converters `tuya.ts` whitelabel (Koenkk and contributors) |
| `HOBEIAN` | sensor_contact_zigbee | contact_sensor (ZG-102Z) | HOBEIAN door sensor | zigbee-herdsman-converters `hobeian.ts` (Koenkk and contributors) |
| `_TZ3000_dpo1ysak` | plug | smartplug (TS011F) | TS011F plug with metering | https://github.com/Koenkk/zigbee-herdsman-converters/pull/3076 (dmaasland), #3107 (kloknibor) |

`_TZ3000_42ha4rsc` (a `_TZ3000_` copy of the Lidl `_TZB000_` id that no outside source lists) stays on curtain_motor_shutter: data/mfs_db.json knows it and the anti-purge guard forbids dropping it. Owner review.
Only `dpo1ysak` on plug was in the last Athom package: 12 couples (2 case forms x 6 pids) got a t614u exemption.
Paired devices keep working: Homey does not re-match an existing device.

Kept after review: `HOBEIAN` on gas_sensor (ZG-225Z), siren (ZG-229Z), ir_blaster (ZG-IR01), curtain_motor (ZG-301Z-MOTO),
because hobeian.ts keys these by vendor zigbeeModel and the audit only knew TS pids. `_TZ3290_ixd9mvv4` (TS0049 LYAI-14) stays on
both valve drivers per P3055. `_TZ3000_pzui3skt` is really a TS0041 one-button remote (zigbee2mqtt #8500 by snp88, Johan Bendz
README), but the knob entry is pinned by rotary-knob-ssot (P2448), so it waits for the owner. `9ni6xxld` and `heiman` are reviewed duals.

## Batch 3 (27/10/2026, owner t614u): manufacturer ids used as productIds

`water_leak_sensor` and `water_leak_sensor_tuya` listed `_TZ3000_kyb656no` and `_TZ3000_eit6l5` (both case forms) as productIds.
Homey crossed them with every mfr of the driver: 146 phantom couples (76 + 70), none in the last Athom package.
`_TZ3000_kyb656no` is a real manufacturerName (Meian SW02 whitelabel, TS0207, zigbee-herdsman-converters `tuya.ts`) and stays as a mfr on both drivers;
`_TZ3000_eit6l5` is a cut-off id no source reports. P3055 already dropped the same two pids from gas_sensor_switch.
`q9mpfhw` looks like a cut-off id too but is a real zigbeeModel upstream, so it stays.

## Batch 4 (27/10/2026, owner t614u): TS130F curtain switches off curtain_motor_shutter

Six makers are TS130F curtain/shutter wall switches in zigbee-herdsman-converters `tuya.ts` (Koenkk and contributors):
`_TZ3000_5iixzdo7` (LoraTap SC500ZB-v4), `_TZ3000_bs93npae` (BSEED EC-GL86ZPCRS31), `_TZ3000_74hsp7qy` (Zemismart ZN-LC1E),
`_TZ3000_8h7wgocw` (Danor SK-Z802C-US), `_TZ3000_vw8pawxa` (Zemismart TS130F_ZEMISMART), `_TZ3210_xbpt8ewc` (QA QACZ1).
`curtain_motor` lists TS130F and the runtime map already sends them there; `curtain_motor_shutter` has no TS130F,
so its 24 case forms only produced phantom couples (lights, climate and TS0601 pids). They leave curtain_motor_shutter;
the 72 couples of the last Athom package that came from that product carry t614u exemptions.

## Batch 5 (27/10/2026, owner t614u): heobian is a typo, not a device string

`heobian` / `Heobian` / `HEOBIAN` sat on 18 driver composes (41 entries, about 2090 couples) as "Athom forms" of HOBEIAN.
No device reports that string: zigbee-herdsman-converters `hobeian.ts` (Koenkk and contributors) uses the vendor `HOBEIAN`,
ZHA, deCONZ, Blakadder and Johan list only HOBEIAN, and the one web hit is a spelling slip in a Homey forum message about a
HOBEIAN ZG-222Z (community.homey.app topic 140352). The forms leave every compose and the pairing form list
(`brandAthomForms`) shrinks to HOBEIAN / Hobeian / hobeian. The read-time alias stays: `normalize()` still maps
heobian to hobeian, so lookups, diags and collision tools treat both as one brand. The 10 couples of the last Athom
package (button_wireless_1, heobian/Heobian × 5 pids) carry t614u exemptions; the sacred pin `heobian|ZG-101ZL` is dropped
(it guarded against a bot strip, not a real device).

## Batch 6 (27/10/2026, owner t614u): pzui3skt and the HOBEIAN ZG-101ZD knob

- `_TZ3000_pzui3skt` is a one-button TS0041 remote in every source (zigbee2mqtt issue #8500 by snp88, Johan Bendz SDK3 README "1 Gang Wall Remote", erickvneri edge fingerprints, HA Battery Notes CR2430). Its 4 forms left smart_knob_rotary (18 baseline couples, t614u exemptions) and its rotary-knob-ssot line went too. It also left the KNOB_MFR regex in DeviceOperatingMode and PhysicalButtonMixin, which had forced dimmer mode (0x8004=0) on the button. Fingerprint entry now points to button_wireless_1 / TS0041.
- HOBEIAN `ZG-101ZD` is the HOBEIAN smart knob (zigbee-herdsman-converters `hobeian.ts`). It now pairs on smart_knob_zg101zd (same hardware as `_TZ3000_abrsvsou` TS004F). The pid left button_wireless_1 (not in the baseline, about 300 phantoms gone). HOBEIAN stays on button_wireless_1 for ZG-101ZL. Paired devices keep their driver.
- HEIMAN on universal_zigbee: kept, per the owner decision of 2026-10-21 (generic fallback, see P2927).

## Batch 7 (27/10/2026, owner t614u): `_TZ3000_42ha4rsc` is a parasite

- No outside source lists `_TZ3000_42ha4rsc`. The real device is the Lidl HG09648 blind `_TZB000_42ha4rsc` (TS030F), listed by zigbee-herdsman-converters (commit a118719, Koen Kanters) and by the deCONZ DDF `_TZB000_42ha4rsc_window_blinds`; it stays on curtain_motor.
- The 4 `_TZ3000_` forms left curtain_motor_shutter (none were in the Athom baseline, so no exemptions). The data/mfs_db.json row stays as forbid-only so nothing adds it back, and its fingerprint row is gone.

## Batch 8 (27/10/2026, owner t614u): the Loginovo ZG-101Z SOS button

- `_TZE200_vrcfo4i0` and `_TZE200_nojsjtj2` (TS0601) are the Loginovo ZG-101Z SOS button in zigbee-herdsman-converters `tuya.ts` (Koen Kanters and contributors; zigbee2mqtt.io/devices/ZG-101Z). kkossev's Hubitat TS004F driver lists `_TZE200_nojsjtj2` as a "Tuya SOS Button" with the IAS Zone cluster (0500). Johan #1489 only says "Air Monitor / SOS", unverified.
- So they move to button_emergency_sos: vrcfo4i0 leaves gas_sensor and nojsjtj2 leaves climate_sensor. Neither was in the Athom baseline, so no exemptions are needed. Devices already paired keep their driver.
- button_emergency_sos now also reads DP26 (sos) and DP29 (emergency) as a press, next to the IAS Zone path. The existing 2 s debounce keeps one press as one alarm. Nothing is written at pairing.
- `_TZE204_vrcfo4i0` / `_TZE284_vrcfo4i0` (gas_sensor and presence_sensor_radar, 16 entries) have no source and are dropped. curated-couple-removals blocks bots from adding any of them back.

## Batch 9 (27/10/2026, owner t614u): Nous E8 smoke sensor and the short dcnsggv dimmer id

- `_TZE200_0zaf1cr8` / `_TZE284_0zaf1cr8` (TS0601) are the Nous E8 smoke sensor in zigbee-herdsman-converters `tuya.ts` (TS0601_smoke_1, Koen Kanters and contributors): DP1 smoke, DP4 tamper, DP14 battery low. smoke_sensor_ts0601_dp already reads that exact layout (it holds the sibling `_TZE204_ntcy3xu1`), so the 8 case forms leave switch_3gang and go there. The Athom baseline only had them on smoke_sensor3 x TS0205, which P3055 had already dropped; nothing is lost from it here.
- `_TZE200_dcnsggv` on climate_sensor is not a typo to delete: the same Z2M file lists it in the TS0601_dimmer_5 fingerprint next to `_TZE200_dcnsggvz`. Its 4 forms move to wall_dimmer_tuya (class light, which has dcnsggvz). Not in the baseline.
- `gjnozsaz` (asked as a possible smoke detector) is the NEO NAS-WR01B plug in Z2M (TS011F): it stays on smartplug; its button_wireless_plug listing is reviewed in a later batch.
- Devices already paired keep their driver; nothing is written at pairing.

## Batch 10 (27/10/2026, owner t614u): 4mh6tyyo prefix copies, amp6tsvy pinned

- zigbee-herdsman-converters `tuya.ts` (Koen Kanters and contributors) lists only `_TZE200_4mh6tyyo` in its TS0601 dimmer fingerprint, and ZHA, deCONZ and Hubitat add nothing else. The `_TZE204_` and `_TZE284_` forms (8 case variants each on dimmer_1_gang_tuya and dimmer_wall_1gang) had no source and are dropped. `_TZE200_4mh6tyyo` stays on dimmer_1_gang_tuya, its mfs_db owner. Not in the Athom baseline, so no exemptions are needed.
- `amp6tsvy`: only `_TZE200_amp6tsvy` is sourced (zigpy ZHA quirks `tuya/ts0601_switch.py`). The prefix forms are kept and pinned, because the gang-pattern and dual-couple tooling depends on them. They will be revisited with the switch driver splits.

## Batch 11 (27/10/2026, owner t614u): Zbeacon TS020x no longer duplicated on doorwindowsensor_4

- At publish, `resolveBaselinePins` re-pinned 12 orphan Athom-baseline couples, {CAT0001, cat0001, DSS0010, dss0010} × {TS0201, TS0202, TS0203}, onto doorwindowsensor_4. Because of the cartesian product, the Zbeacon TS020x sensors (owned by temphumidsensor_zcl_th01) then came back as a duplicate. These couples correspond to no real device. In zigbee-herdsman-converters `tuya.ts` (Koen Kanters and contributors), `CAT0001` is the Excellux ZG-102MV contact/vibration sensor and `DSS0010` is the Excellux ZG-101K scene switch, both with modelId `Excellux`. In `sonoff.ts`, `Zbeacon TH01` is the SNZB-02 whitelabel and `zbeacon DS01` is the SNZB-04 whitelabel. They now carry 12 t614u exemptions: restored pins go from 178 to 166, and Zbeacon TS020x is pinned only on temphumidsensor_zcl_th01.
- `lumi.sensor_ht.agl02` and `lumi.weather` are the Aqara WSDCGQ12LM/WSDCGQ11LM temperature/humidity sensors (`lumi.ts`, LUMI only). They are removed as pids from doorwindowsensor_4, where they only formed phantom couples. They stay on the climate drivers. The 2 `zbeacon|lumi.*@doorwindowsensor_4` combos leave the parasitic baseline in the same commit (1825 → 1823).
- Kept: zbeacon × DS01 and CAT0001/DSS0010 × Excellux. DSS0010 (a button) may move to a button driver in a later batch. Already-paired devices keep their driver, and nothing is written at pairing.

## Batch 12 (27/10/2026, owner t614u): TS0502A CCT lights, one driver

- In zigbee-herdsman-converters `tuya.ts` (Koen Kanters and contributors), the `TS0502A` definition (Tuya "Light controller", colour temperature 153-500) lists these whitelabels: `_TZ3000_g1glzzfk` (Aldi LIGHTWAY filament lamp), `_TZ3000_zw7wr5uo` (Mercator Ikuü SMI7040 batten), `_TZB210_0bkzabht` (MiBoxer PZ2), and `_TZB210_ayx58ft5`/`_TZB210_eiwanbeb` (MiBoxer E2-ZR). They are tunable-white CCT lights.
- They were listed on both bulb_dimmable and tunable_bulb_E14. They now stay only on tunable_bulb_E14, which is the CCT driver, their mfs_db owner, and the driver that carries TS0502A in the Athom package. Their 20 case variants are removed from bulb_dimmable.
- Removing them from bulb_dimmable left 36 Athom-baseline couples orphaned: the forms of g1glzzfk and zw7wr5uo crossed with the 9 bulb_dimmable pids (BASICZBR3, GL-B-001Z, E11-N13…). Those couples are pure cartesian products and no device sends them, so they carry t614u exemptions. In `lib/tuya/fingerprints.json`, the runtime owner moves to tunable_bulb_E14 (zw7wr5uo had been marked as a cover/curtain_motor, which was wrong).
- `_TZ3210_claeh5ds` (TS0502A on bulb_dimmable + light_bulb_dimmable_tunable) waits for the driver splits. Already-paired devices keep their driver, and nothing is written at pairing.

## Batch 13 (27/10/2026, owner t614u): ZG-101ZD, a HOBEIAN-only modelId

- In zigbee-herdsman-converters `hobeian.ts` (Koen Kanters and contributors), `ZG-101ZD` is the `zigbeeModel` the HOBEIAN smart knob reports together with manufacturerName `HOBEIAN`. The `_TZ3000_*` copies of the same knob (`_TZ3000_abrsvsou`, `_TZ3000_402vrq2i`, `_TZ3000_gwkzibhs`) report `TS004F`.
- smart_knob and smart_knob_rotary listed `ZG-101ZD`/`zg-101zd` next to 20 and 48 `_TZ3000_*` knob ids, which built cartesian couples no device sends. That pid is removed from both drivers. HOBEIAN+ZG-101ZD still pairs on smart_knob_zg101zd (batch 6), and every `_TZ3000_*`+TS004F couple is kept.
- The pin simulation showed 26 Athom-baseline couples that would be re-pinned (18 on smart_knob: kaflzta4/uri7ongn/ixla93vd/g9g2xnch forms; 8 on smart_knob_rotary: gwkzibhs/qja6nq5z/csflgqj2/ugi8ky6u forms). Each one carries a t614u exemption. Already-paired devices keep their driver, and nothing is written at pairing.

## Batch 14 (27/10/2026, owner t614u): gjnozsaz, a plug and not a button

- In zigbee-herdsman-converters `tuya.ts` (Koen Kanters and contributors), `_TZ3000_gjnozsaz` is the NEO NAS-WR01B, a whitelabel of the metering plug `TS011F_plug_1`. Z2M skips one power-reporting setting for it (zigbee2mqtt issue #28729).
- It was listed in 4 case forms on button_wireless_plug, a driver whose pid list (TS0004, TS0201, TS0601…) only created cartesian couples for it. Those forms are removed. smartplug stays the only driver (3 forms; TS011F/TS0121). The runtime owners move to smartplug: `lib/tuya/fingerprints.json` was pointing at plug_smart with only TS0601, and gets TS011F added; `data/mfs_db.json` was pointing at button_wireless_plug.
- The pin simulation showed 8 Athom-baseline couples to exempt (2 forms × TS0004/TS0111/TS0201/TS0601 on button_wireless_plug). TS011F/TS0121 stay pinned on smartplug. Already-paired devices keep their driver, and nothing is written at pairing.

## Batch 15 (27/10/2026, owner t614u): dfgbtub0, two pids and two drivers

- `_TZ3000_dfgbtub0` covers two attested couples. With `TS0042` it is the Marmitek Push LO 2-button remote (zigbee-herdsman-converters `tuya.ts`, TS0042 whitelabel), which goes on button_wireless_2. With `TS0044` it is a SunBeech/Moes 4-button remote reported on the Homey forum (topic 156967, post 12), which goes on button_wireless_4; that couple is already locked in couple mode in `data/user-misattribution-registry.json`.
- Both couples are kept, so nothing is removed. The runtime hint in `lib/tuya/fingerprints.json` was pointing at switch_1gang (mains, TS0601), the wrong class for a battery remote. It now points at button_wireless_2 (battery), and TS0042/TS0044 are added to its modelIds (additive). The couple registry still sends TS0044 to button_wireless_4.

## Batch 16 (27/10/2026, owner t614u): amp6tsvy belongs on 1-gang only

- Both sources describe `_TZE200_amp6tsvy` + `TS0601` as a 1-gang switch: zigbee-herdsman-converters `moes.ts` lists it as the Moes ZTS-EU 1-gang, and ZHA `ts0601_switch.py` puts it in `TuyaSingleSwitchTO`. The `_TZE204` and `_TZE284` forms have no source of their own. They were listed on switch_1gang and on switch_2gang at the same time, and the `_TZE204` hint pointed at 2-gang without any reference.
- Decision (one couple, one driver): these forms stay on switch_1gang, the driver of their family. That driver already had the repo profile `ts0601_switch_1gang` with gangCount 1, and switch_1gang stays at 1378 forms against a floor of 1370. They are removed from switch_2gang (6 forms, 215 to 209) and the hint now points at switch_1gang. No fixture pin was on switch_2gang, so no exemption is needed.

## Batch 17 (27/10/2026, owner t614u): claeh5ds is a tunable-white bulb

- In zigbee-herdsman-converters `tuya.ts`, `_TZ3210_claeh5ds` is a whitelabel of the TS0502B light controller: the LUUMR 10024773 Smart LED C35 matt E14 4.2 W, with colour temperature 153 to 500 mireds. That makes it a tunable-white bulb.
- light_bulb_dimmable_tunable already had all 4 case forms with `TS0502A` and owned the runtime hint, so it keeps them. bulb_dimmable is dim-only, so it drops the 4 forms (152 to 148).
- The 18 couples in the Athom fixture on bulb_dimmable paired this id with other brands' modelIds (01MINIZB, BASICZBR3, CK-BL702, E11/E12-N13/N14, FE-GU10-5W, GL-B-001Z). They are pure cartesian combos and are exempted with approval t614u.

## Batch 18 (27/10/2026, owner t614u): three reviewed duals, fixing the runtime hints only

These three manufacturers are in `data/native-matrix-reviewed-duals.json`, where the owner decided on 2026-10-04 to keep the old entry next to the exact couple. Nothing is removed from any compose here. Only the runtime hints are corrected to point at the attested driver. Removing the old entries needs an explicit override from the owner.

- `_TZ3008_reatplte` is the Nous A7Z metering socket (TS011F; zigbee-herdsman-converters `tuya.ts`, TS011F_plug_1 whitelabel). Its exact couple is on plug_energy_monitor, and the old entry stays on button_wireless_4. The hints in `fingerprints.json` and `mfs_db` pointed at generic_diy and now point at plug_energy_monitor (TS011F added).
- `_TYZB01_4lwqwyqn` is a 3-gang TS0013 switch: the interview on JohanBendz/com.tuya.zigbee#1330 (PhilbyD) shows endpoints 1 to 3. Its exact couple is on switch_3gang, and the old entry stays on switch_1gang. The `fingerprints.json` hint pointed at switch_1gang and now points at switch_3gang. TS0013 is added to `mfs_db`.
- `_TYZB01_v8gtiaed` is the Lonsonho QS-Zigbee-D02-TRIAC-2C-LN, a 2-gang TRIAC dimmer (TS110F, `lonsonho.ts`). Its exact couple is on dimmer_2_gang, and the old entry stays on switch_1gang. The `mfs_db` hint pointed at switch_1gang and now points at dimmer_2_gang. `_TZ3000_v8gtiaed` has no source and stays pinned.

## Batch 19 (27/10/2026, owner t614u): water-leak trio on water_leak_sensor

- `_TZ3000_kyb656no` (Meian SW02) and `_TZ3000_kstbkt6a` (Aubess IH-K665) are whitelabels of `TS0207_water_leak_detector` in zigbee-herdsman-converters `tuya.ts`. deCONZ lists `_TZ3000_fxvjhdyl` in its TS0207 water-leak DDF, and JohanBendz's README lists it under Water Detector as TS0207.
- water_leak_sensor carries `TS0207`. water_leak_sensor_tuya does not (its pids are TS0601, q9mpfhw and other brands' models), so on that driver these 3 ids could only form cartesian couples that no real device can pair with. The 12 case forms are removed from water_leak_sensor_tuya (137 to 125) and stay on water_leak_sensor (one couple, one driver). No pin in the Athom fixture, so no exemption. The `mfs_db` hints (and the `fingerprints.json` one for fxvjhdyl) now point at water_leak_sensor.

## Batch 20 (27/10/2026, owner t614u): two bulbs and a dimmer back on their drivers

- `_TZ3000_j2w1dw29` is the Lidl Livarno Lux HG06463A filament bulb, and `_TZ3000_juq7i1fr` is the Mercator Ikuu SMFL20W-ZB floodlight. zigbee-herdsman-converters `tuya.ts` lists them as TS0501A and TS0501B whitelabels; the Mercator one came in via samuelabj's PR #6401. A Homey forum request by Rickert1993 and a Hubitat thread back them up. bulb_dimmable carries TS0501A and TS0501B, and dimmer_wall_1gang does not. On the wall dimmer they could only form cartesian couples, so the 8 case forms are removed there (74 to 66). The 12 Athom fixture couples (TS0601, TS0601_dim1, TS011F) get exemptions. The `mfs_db` hint now points at bulb_dimmable, and `fingerprints.json` gains the real pid.
- `_TZE200_5cuocqty`: only `_TZE204_5cuocqty` is attested upstream, as the Avatto ZDMS16-1 dimmer (`avatto.ts`, ZHA `ts0601_dimmer`). The `_TZE200` copy stays with its sibling on dimmer_1_gang_tuya, and its 4 forms leave switch_1gang (1378 to 1374). No pin.
- `_TZ3000_bzzgvet0` (Moes ZS-US1-LN, TS0001) and `_TZ3000_jqge2fjx` (TS0210 vibration, zigbee2mqtt #20272) are reviewed duals from 04/10, so they are left as they are.
- Batch 19 stays as it is. The CI routine (f3ac571337) updated `data/native-matrix-reviewed-duals.json`, so water_leak_sensor_tuya is no longer listed for the TS0207 trio. From now on, every move also updates the reviewed-duals list in the same commit, and the full mocha suite runs before each push.
- No decision is possible yet for `_TZE284_a8sdabtg` (only `_TZE200_a8sdabtg` = ZG-227Z is attested), `_TZ3000_iystcadi` (only the `_TZ3210_` Lidl TS0505B is attested), or eWeLink and LUMI on TS0601. These stay pinned or kept until a source says which side owns them.

## Flow batch 1 (orphan WiFi triggers)

- `scripts/diag/flow-trigger-reach.js` listed 7 declared WiFi trigger cards that no code ever fired:
  `wifi_switch_2gang_g1/g2_on/off`, `wifi_power_strip_socket1_on/off` and `wifi_dehumidifier_water_full`.
- They are now auto-wired through the P2803 map (`config/flow/dead-flow-autowire.json`), which fires from `TuyaLocalDevice` on a capability change:
  - gang/socket 1 → `onoff` (DP1);
  - gang 2 → `onoff.gang2` (DP2);
  - tank full → `alarm_water` (DP11 in the driver).
- The new rules are limited to these exact ids. The Zigbee `switch` driver has look-alike cards that `FlowCardHeuristics` already reaches, so they are left alone to avoid double firing.
- No card was removed and no user flow breaks. The manifest is unchanged, because the map is not in app.json. Orphans went from 111 to 105.
- Left alone on purpose:
  - cards that need a missing capability, a threshold or a timer: battery low on mains bulbs, temperature/humidity too high/low, "left open for", tilt/drop;
  - the robot-vacuum cards.

## Flow batch 2 (radar distance, soil temperature)

- 5 more orphan triggers are now wired through the same map, on capabilities the drivers already have:
  - "detection/target distance changed" on `climate_sensor_presence`, `device_air_purifier_presence` and `sensor_motion_radar` (2 cards) → `measure_luminance.distance`;
  - "soil temperature changed" on `sensor_lcdtemphumidsensor_soil` → `measure_temperature`.
- The distance token on the two presence drivers said "(cm)" while the capability is declared in metres. Since nothing ever fired the card, the label was corrected to "(m)" (example 2). The manifest gets slightly smaller.
- Phantom queue status:
  - `_TZ3290_ixd9mvv4` stays on both valve drivers: batch 2 keptOnPurpose (P3055, owner t555u). Upstream id: TS0049 LYAI-14, Z2M discussion #28060 (Stepyon), zigbee2mqtt.io PR #4205 (cruelacid).
  - The other unattested rows are reviewed duals (left as is), the HOBEIAN collateral (batch 2), or the 3 couples with no source either way.

## Pending

- ~480 collateral duals need driver splits (next batches).
- TS0601 duals on bulb_rgb/bulb_rgbw/button_wireless_*: never dropped by pid; per-mfr review only.
