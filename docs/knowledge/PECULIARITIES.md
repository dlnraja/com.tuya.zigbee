# Device peculiarities — cross-source investigation

Generated 2026-08-19T08:50:15.322Z from registry (54 cases) × compound DB (209 keys) × local Z2M fps.

## Class notes (always)

- Sleepy IAS (SOS / water / contact): enroll on wake, skip boot CIE poll, no leftover EF00 TX.
- Pid TS0207 is shared: k4ej3ww2 = IAS water (Z2M IH-K665); 5k5vh43t family = mains repeater. Default driver is null.
- Pid TS011F is shared: metering plug (okaz9tjs poll fw 1.0.5), double outlet, DIN, USB wall, strip.
- MCU dimmer brightness is 0–1000 (TuyaBrightnessScale). Never write >1000 (Z2M #32305).
- nt4pquef soil: DP2 = light enum, DP3 = moisture, DP5 = temp/10, DP15 = battery. Do not compose 0xED00. Retail SGS02Z is not a pid.
- Local scripts/data/z2m-data.json is a stale FP dump — missing dump ≠ missing device. Prefer issue URLs.

| | Count |
|---|---|
| Cases with compound DB hit | 54 |
| Cases with Z2M pid overlap | 27 |
| Cases still gapped | 0 |

## Gaps

### `p2354-forum-inspiration-ts004f-event` → remotes / CI

- **Threads:** T150690 Steampunk (`_TZ3000_xabckq1v`+TS004F), T156967 Manfred (`kalzta4` typo), T140352 meter91/PresentSky/VicHY/Cam (tip lag)
- **Inspiration:** Z2M Moes TS004F_1 requires `operation_mode=event` for multi-click; Homesuite/Gabriel soft-fail settings; Primordial DIY 0xFD on TS0044
- **Bug:** `xabckq1v` was in DeviceOperatingMode TS0044 skip-0x8004 list → never forced event mode
- **Fix:** force `ts004f` + writeSceneAttr for `xabckq1v`; forum processor typo `kalzta4`→`kaflzta4` → `smart_knob`+TS004F; sacred-keep pin
- **Against:** treating real TS004F like 4-EP TS0044; inventing pid for Manfred without couple

### `p2351-foreign-driver-id-serializer` → runtime (all drivers)

- Symptom: App crash `Invalid Driver ID: ZG9101SAC_HP` (Philips Hue ID) during HomeySerializer flow parse
- Seen: Gmail crashes on **v9.0.730** and **v9.0.743** (build #3046 / #3059)
- Stack: `_getDriverManifest` → `getDriver` → SDK.fromJSON → HomeySerializer
- Fix: `lib/utils/safe-get-driver-patch.js` (P2306 hardened) — soft-fail foreign IDs; re-bind on live `homey.drivers` in `App.onInit`
- Against: treating Hue/virtual IDs as Tuya drivers; crashing whole app for one bad flow token

### `p2351-cartesian-registry-refuse` → gang switches

- Bad case: `p2347-gabriel-zemismart-verified-only` listed OVYAISIP/YWUBFUVT/… + TS0001+2+3 on `wall_switch_1gang_1way`
- Effect: `align-mfs-db-intelligent --check` tried to merge 2gang/3gang onto 1gang (CI red)
- Fix: doc-only enrichOnly case + align skip/refuse Cartesian multi-mfr×multi-gang-pid
- Real locks remain per couple (TB25-1 / NovaDigital 2g / 3g)

### `p2353-flow-button-triggers` → remotes / scene_switch_4

- Symptom: PhysicalButtonMixin candidates for `scene_switch_4` skipped `*_button_4gang_button_N_*` declared cards when treated as “scene_switch 1gang branch”
- Fix: emit both `*_button_N_*` and `*_button_Ngang_button_N_*`; never invent `*_button_N_button_pressed`
- Sacred-keep: `wkai4ga5`+TS0044 scene_switch_4; `dfgbtub0`+TS0044 bw4 / +TS0042 bw2
- Do **not** lock `wkai4ga5`+TS0042 without interview (forum soft only)

### `p2348-salvagr-5slehgeo-curtain` → `curtain_motor`

- Couple: `_TZE204_5slehgeo` + TS0601 (siblings `_TZE284_` / `_TZE200_5slehgeo`, also `_TZE200_nhyj64w2` / `_TZE200_127x7wnl`)
- Retail: Moes ZTS-EUR-C (GitHub #533 Salvagr)
- Protocol: EF00 interview clusters `[0,4,5,61184]` — not OnOff/WindowCovering
- Diag: `724d4bc9` on 9.0.741 — Unknown Device (no driver init; pairing miss)
- Root cause: publish compact lowercased sacred-keep pins → kept `_TZE204_5SLEHGEO` / `_tze204_5slehgeo` but dropped exact `_TZE204_5slehgeo` (Homey case-sensitive)
- Fix: preserve exact `pin.mfr` in compact + sacred-keep pins; trim absurd curtain productIds
- **P2356 (2026-08-31):** post-pair diag `05867379` — position RX + DP3/7/8/10 settings + strip `button.1` (UI errors); `_handleTuyaDP` → `_handleDP`
- **P2363 (2026-09-01):** same diag still **couple ABSENT** (hybrid RX none) — do not invent mfr+pid. Soft-create `TuyaEF00Manager` on `UnifiedCoverBase`, optimistic `windowcoverings_*` after successful TX, skip hybrid protocol-disable for cover/curtain drivers. Added verified Z2M cover motors (`mfr`+`TS0601` only); stripped tilt `_TZE204_r0jdjrvi` from `curtain_motor`.
- **P2380 (2026-09-02):** diag `ab5aaf04` @ 9.0.775 “Cover stop working” — `UniversalDPSender._try` treated `sendDP()===false` as success (`✅DP mgr` while stderr `Tuya cluster not available`). Fix: honor false + multi-EP EF00 scan + ZCL windowCovering fallback on cover TX.

## Cases (1 by 1)

### `hobeian-aubess-k4ej3ww2-ias` → `water_leak_sensor`

- Couple: `_TZ3000_k4ej3ww2` + TS0207
- Protocol: ias_zone
- Retail: HOBEIAN ZG-222ZA, HOBEIAN ZG-222Z, Aubess IH-K665, IH-1218
- Z2M local pids for mfr: (none in dump) 
- Compound `_TZ3000_k4ej3ww2|TS0207`: ias_zone  HOBEIAN/Aubess IH-K665: IAS Zone 1280 sleepy; reports on wet/dry only; never EF00 water, rain, or repeater. Z2M#17685/#19308
- Compose: class=sensor eps=1 EF00=false IAS=true batteries=CR2032/CR2450/AAA
- Notes: Never EF00/Tuya-DP water driver. modelId is always TS0207; ZG-222ZA/IH-K665/IH-1218 are retail labels. Sleepy IAS 1280 reports on wet/dry only (Z2M#17685/#19308). Same pid TS0207 is a mains repeater for 5k5vh43t — lock the couple. Removed from water_leak_sensor_tuya (P144) and gas_sensor productId abuse (P143).
- Sources: z2m#17685, z2m#28181, z2m#19308, forum-140352, P143, P144, P146

### `presentsky-bseed-dimmer-m1cvyneb` → `wall_dimmer_tuya`

- Couple: `_TZE284_m1cvyneb` + TS0601
- Protocol: tuya_ef00
- Z2M local pids for mfr: TS0601 ✓ overlap
- Compound `_TZE284_m1cvyneb|TS0601`: tuya_dp DP {"1":"onoff","2":"dim/1000"} Not climate/soil/universal; MCU brightness 0-1000
- Compound `_TZE204_m1cvyneb|TS0601`: tuya_dp DP {"1":"onoff","2":"dim/1000"}
- Compound `_TZE200_m1cvyneb|TS0601`: tuya_dp DP {"1":"onoff","2":"dim/1000"}
- Compose: class=light eps=1 EF00=true IAS=false batteries=mains?
- Notes: BSEED Click 1-gang EF00 dimmer insert. MCU brightness 0-1000 (never write >1000, Z2M#32305). Stale climate pairing cannot be swapped at runtime — remove and re-add as wall dimmer. Couple is TS0601 only; do not invent TS0201. Interview EP1 clusters: 0/4/5/0xEF00 + proprietary **0xED00 (60672)** — do not compose 0xED00. **#2221** (2026-09-01) claims “updated diagnostic ID and interview” but the post body has **no UUID / no interview** (reply_to #2206 only). Evidence remains `60959c24` @ **9.0.688**: DynCap DP2→humidity + Missing IEEE 404 TX (P2314/P2333); tip ≥9.0.744+ heal/dp map; **P2382** skip HYBRID 15-min disable on EF00 dimmers.
- Sources: forum-140352 #2206/#2221, diag-60959c24, diag-f20dc4f0, P139, P149, P2314, P2333, P2382, z2m#32305

### `tboy-relay-4ch-imaccztn` → `relay_board_4_channel`

- Couple: `_TZ3210_imaccztn` + TS0004
- Protocol: zcl
- Z2M local pids for mfr: (none in dump) 
- Compound `_TZ3210_imaccztn|TS0004`: zcl  TBoy #2131 4ch relay board; not switch_4gang catch-all
- Compose: class=socket eps=4 EF00=false IAS=false batteries=mains?
- Notes: TBoy #2131 — 4-channel relay board, not a simple switch.
- Sources: forum-140352, P139, P149

### `kanbros-bseed-2gang-w5xztuy7` → `switch_2gang`

- Couple: `_TZ3000_w5xztuy7` + TS0002
- Protocol: zcl
- Z2M local pids for mfr: (none in dump) 
- Compound `_TZ3000_w5xztuy7|TS0002`: zcl_only  Kanbros/BSEED ZCL-only 2-gang; leftover 0xEF00 is not MCU; no metering phantoms
- Compose: class=socket eps=2 EF00=false IAS=false batteries=mains?
- Notes: Kanbros #2130 — ZCL-only 2-gang; leftover 0xEF00 is not MCU; no metering phantoms. BSEED zcl_only family.
- Sources: forum-140352, P139, P141

### `welsh-double-outlet-hlla45kx` → `double_power_point_2`

- Couple: `_TYZB01_hlla45kx` + TS011F
- Protocol: zcl
- Z2M local pids for mfr: TS011F ✓ overlap
- Compound `_TYZB01_hlla45kx|TS011F`: zcl  Welsh #2129 dual outlet; not generic socket / energy plug
- Compose: class=socket eps=2 EF00=false IAS=false batteries=mains?
- Notes: Welsh #2129 — double power point, not generic socket.
- Sources: forum-140352, P139

### `soil-nt4pquef` → `soil_sensor`

- Couple: `_TZE284_nt4pquef` + TS0601
- Protocol: tuya_ef00
- Z2M local pids for mfr: TS0601 ✓ overlap
- Compound `_TZE284_nt4pquef|TS0601`: tuya_dp DP {"2":"light_enum","3":"measure_humidity.soil","5":"measure_temperature/10","9":"temperature_unit","15":"measure_battery"} SGS02Z/SG502Z retail labels — pid stays TS0601. DP2 is illuminance enum not moisture. Interview 0xED00 must not be composed. Z2M herdsman#10315 ZHA#4707
- Compose: class=sensor eps=1 EF00=true IAS=false batteries=AAA/CR2032/CR2450
- Notes: Soil moisture MCU — not climate LCD. Z2M SGS02Z/SG502Z are retail labels; pid stays TS0601. DPs: 2=light enum (not moisture), 3=soil %, 5=temp/10, 9=unit, 15=battery. Interview may show 0xED00 — do not compose it. ZHA#4707 / herdsman#10315.
- Sources: forum-140352, P141, z2m-herdsman#10315, zha#4707

### `zt08-hodyryli` → `climate_sensor_zt08`

- Couple: `_TZE284_hodyryli` + TS0601
- Protocol: tuya_ef00
- Z2M local pids for mfr: TS0601 ✓ overlap
- Compound `_TZE284_hodyryli|TS0601`: tuya_dp DP {"1":"measure_temperature/10","2":"measure_humidity","3":"measure_battery","38":"measure_temperature.probe/10"} GH #513 ZT08: DP3 battery_state 0/1/2, DP38 probe ×10
- Compose: class=sensor eps=1 EF00=true IAS=false batteries=AAA/CR2032/CR2450
- Notes: ZT08 weather — unix_1970 time sync + DP17 commit (GH #513).
- Sources: forum-140352, github#513, P140

### `presence-radar-clrdrnya` → `presence_sensor_radar`

- Couple: `_TZE204_clrdrnya` + TS0601
- Protocol: tuya_ef00
- Z2M local pids for mfr: TS0601 ✓ overlap
- Compound `_TZE204_clrdrnya|TS0601`: tuya_dp  MTG235-ZB-RL mmWave+relay (sbyx0lm6 family). Never climate/motion_pir. Z2M#18677 GH#420
- Compound `_TZE284_clrdrnya|TS0601`: tuya_dp  TZE284 sibling of clrdrnya radar; same TS0601 couple only
- Compound `_TZE200_clrdrnya|TS0601`: tuya_dp  TZE200 sibling; Z2M discussion#25712 lost-support reminder — keep compound lock
- **P2340 (diag 4217d5e3 / VicHY):** publish compact dropped `_TZE204_clrdrnya` from app.json — sacred-keep + force-inject restores mfr; user on **9.0.719** must update Test ≥9.0.739 + re-pair `presence_sensor_radar`.
- **Search UX:** Users typing “PIR mmWave” often pick `pir_mmwave_sensor` (`_TZ3000_3towulqd` only). MTG235/clrdrnya must use **Presence Sensor (Radar / mmWave)** tile.
- **P2379 (VicHY):** DynCap invented `windowcoverings_set` from DP2/3/102 (sensitivity/range/departure_delay) → Homey UI showed **curtain + opening slider**; DP102→`alarm_motion` stuck presence true. Fix: disable DynCap invent on presence radars + heal phantom caps.
- **P2386 (VicHY #2222):** Recurring after app updates — store DynCap restore re-applied blind UI. Fix: clear store when DynCap disabled; delayed re-heal 15s/60s/180s; restore `sensor` class if drifted to windowcoverings; heal on settings. Diag `4217d5e3`. User: update Test ≥ tip + restart app (re-pair only if still curtain).

### `valve-dual-fhvpaltk` → `valve_dual_irrigation`

- Couple: `_TZE284_fhvpaltk` + `TS0601` (sibling `_TZE284_eaet5qt5`)
- Insoma 2-way irrigation — `onoff.valve_1` / `onoff.valve_2`
- **Joep #2218:** “repair” on an **unknown** device does not re-run driver matching → remove + re-pair under **Smart 2-Way Irrigation Valve**
- Not GIEX `_TZE284_8zizsafo` (that is `valve_irrigation` 4-zone)

### `button-wireless-1-mrpevh8p` → `button_wireless_1` (P2378)

- Couple: `_TZ3000_mrpevh8p` + `TS0041` (SH-SC07)
- **P2378 (Peter diag `cfbf687f` @ 9.0.779):** 0xFD RX + `button_matrix` OK, but Homey Flows on `*_button_1gang_*` never fired — `triggerButtonPress` gated Ngang cards behind `gangCount > 1`
- **P2381 (same diag, tip-lag):** even after P2378, driver.compose cards were stripped from `app.json` (P2376 dedupe) so `collectDeclaredFlowIds` / `_tryCard` refused them — only app-level `button_matrix` ran. Fix: merge `driver.manifest.flow` (+ getDrivers) into declared set; allow driver-scoped getDeviceTriggerCard.
- Fix BOTH: always try `*_button_1gang_*` + `buildPhysicalFlowCandidates`; late identity overrides for profile

### `presence-radar-cam-zg204zl` / Cam HOBEIAN

- **P2340 (forum Cam / HOBEIAN ZG-204ZL):** compact dropped `HOBEIAN` mfr while pid `ZG-204ZL` remained — sacred-keep pins couple; motion flows need update + re-pair on `presence_sensor_radar`.
- Compose: class=sensor eps=1 EF00=true IAS=false batteries=CR2032/CR2450/AAA/AA/CR123A/INTERNAL
- Notes: MTG235-ZB-RL mmWave + relay — presence_sensor_radar only (GH#420, Z2M#18677 sbyx0lm6 family). Mains. Never climate or PIR motion.
- Sources: forum-140352, github#420, P139, P204, z2m#18677

### `switch-4gang-wkr3jqmr` → `switch_4gang`

- Couple: `_TZ3000_wkr3jqmr` + TS0004
- Protocol: zcl
- Z2M local pids for mfr: (none in dump) 
- Compound `_TZ3000_wkr3jqmr|TS0004`: zcl  ZHA#2538 ZG-003-RF 4-gang; not 1-gang
- Compose: class=socket eps=4 EF00=true IAS=false batteries=mains?
- Notes: ZHA #2538 ZG-003-RF 4-gang — not 1-gang (P168 class scale).
- Sources: zha#2538, P168

### `din-relay-vbfp8eyv-qeuvnohg` → `din_rail_switch`

- Couple: `_TZ3210_vbfp8eyv` + TS011F
- Protocol: zcl
- Z2M local pids for mfr: TS011F ✓ overlap
- Compound `_TZ3210_vbfp8eyv|TS011F`: zcl  Z2M TS011F_din_smart_relay(+polling); not wireless button
- Compound `_TZ3000_qeuvnohg|TS011F`: zcl
- Compound `_TZ3000_ky0fq4ho|TS011F`: zcl
- Compound `_TZ3000_8bxrzyxz|TS011F`: zcl
- Compose: class=socket eps=1 EF00=true IAS=false batteries=mains?
- Notes: Z2M TS011F_din_smart_relay(+polling). Not wireless button / vibration / radar.
- Sources: z2m-herdsman, P167

### `led-strip-obacbukl` → `led_strip_rgbw`

- Couple: `_TZ3000_obacbukl` + TS0503A
- Protocol: zcl
- Z2M local pids for mfr: TS0503A ✓ overlap
- Compound `_TZ3000_obacbukl|TS0503A`: zcl  LED strip controller; not button or E14 CCT
- Compose: class=light eps=1 EF00=false IAS=false batteries=mains?
- Notes: Blakadder/Z2M LED strip controller — not button or E14 CCT.
- Sources: blakadder, z2m, P167

### `usb-switch-mvtclclq` → `usb_outlet_advanced`

- Couple: `_TZE284_mvtclclq` + TS0601
- Protocol: tuya_ef00
- Z2M local pids for mfr: TS0601 ✓ overlap
- Compound `_TZE284_mvtclclq|TS0601`: tuya_dp DP {"1":"onoff.usb1","2":"onoff.usb2","3":"onoff","4":"onoff.socket2"} Z2M DS-1450WN / BSEED USB+sockets (P2279). Forbid wall_dimmer.
- Compound `_TZE204_mvtclclq|TS0601`: tuya_dp DP {"1":"onoff.usb1","2":"onoff.usb2","3":"onoff","4":"onoff.socket2"}
- Compose: class=socket eps=1 EF00=true IAS=false batteries=mains?
- Notes: Z2M DS-1450WN USB/plug switch with power — not TRV, wireless button, or wall dimmer. Metering DP21–23/105.
- Sources: z2m#31275, z2m#28937, P167, P2279

### `rgb-bulb-jaap6jeb` → `bulb_rgbw`

- Couple: `_TZ3210_jaap6jeb` + TS0505B
- Protocol: zcl
- Z2M local pids for mfr: (none in dump) 
- Compound `_TZ3210_jaap6jeb|TS0505B`: zcl  LEDEPLY SG45-E26 RGB+CCT; not door/motion
- Compose: class=light eps=1 EF00=false IAS=false batteries=mains?
- Notes: LEDEPLY SG45-E26 RGB+CCT — not door/motion sensor.
- Sources: z2m-herdsman, P167

### `plug-vzopcetz-1obwwnmq` → `device_plug_energy_monitor`

- Couple: `_TZ3000_vzopcetz` + TS011F
- Protocol: zcl
- Z2M local pids for mfr: (none in dump) 
- Compound `_TZ3000_vzopcetz|TS011F`: zcl  Johan/Silvercrest metering plug/strip; not button or E14
- Compound `_TZ3000_1obwwnmq|TS011F`: zcl
- Compose: class=socket eps=1 EF00=false IAS=false batteries=mains?
- Notes: Johan/Silvercrest TS011F strip/plug — not button or E14 bulb.
- Sources: johan, P167

### `rgb-bulb-iystcadi-ts0505b` → `light_bulb_rgb_led`

- Couple: `_TZ3210_iystcadi` + TS0505B
- Protocol: zcl
- Z2M local pids for mfr: TS0505B ✓ overlap
- Compound `_TZ3210_iystcadi|TS0505B`: zcl  Lidl/Livarno RGB+CCT. Never steal via shared TS0601. z2m#12090
- Compose: class=light eps=1 EF00=false IAS=false batteries=mains?
- Notes: Z2M Lidl/Livarno RGB+CCT bulb (TS0505B). Was dual-claimed with wall_dimmer via shared TS0601 productId — strip mfr from dimmer/strip.
- Sources: z2m#12090, dual-claim-compose-gate, P177

### `hobeian-zg303z-soil` → `soil_sensor`

- Couple: `HOBEIAN` + ZG-303Z, TS0601
- Protocol: tuya_ef00
- Z2M local pids for mfr: CK-BL702-MWS-01(7016), TS0601 ✓ overlap
- Compound `HOBEIAN|ZG-303Z`: tuya_dp  Retail ZG-303Z only — do NOT lock HOBEIAN|TS0601 (other HOBEIAN TS0601 exist)
- Compound `_TZE200_wqashyqo|TS0601`: tuya_dp  HOBEIAN ZG-303Z MCU soil; DP107 moisture family. nt4pquef is a different couple
- Compose: class=sensor eps=1 EF00=true IAS=false batteries=AAA/CR2032/CR2450
- Notes: HOBEIAN ZG-303Z / _TZE200_wqashyqo soil. Lock HOBEIAN|ZG-303Z and wqashyqo|TS0601 only — never HOBEIAN|TS0601 (other HOBEIAN TS0601 exist). nt4pquef stays on soil-nt4pquef.
- Sources: z2m-ZG-303Z, forum-blutch32, P178

### `curtain-r0jdjrvi-tilt` → `curtain_motor_tilt`

- Couple: `_TZE204_r0jdjrvi` + TS0601, TS0601_curtain_tilt
- Protocol: tuya_ef00
- Z2M local pids for mfr: TS0601 ✓ overlap
- Compound `_TZE204_r0jdjrvi|TS0601`: tuya_dp DP {"1":"windowcoverings_state","2":"windowcoverings_set"} Johan #1374 TZE204 variant of r0jdjrvi curtain motor; not presence radar
- Compose: class=windowcoverings eps=1 EF00=true IAS=false batteries=OTHER
- Notes: Curtain/tilt motor — never a plug. _TZE200_r0jdjrvi stays on curtain_motor.
- Sources: johan#1374, forum, P178

### `p189-usb-wall-outlet-not-climate` → `switch_usb_dongle`

- Couple: `_TZ3000_3zofvcaa` + TS011F
- Protocol: zcl
- Z2M local pids for mfr: TS011F ✓ overlap
- Compound `_TZ3000_3zofvcaa|TS011F`: zcl  Z2M TS011F_2_gang_2_usb_wall; no climate endpoint
- Compound `_TZ3000_lqb7lcq9|TS011F`: zcl
- Compound `_TZ3000_pvlvoxvt|TS011F`: zcl
- Compound `_TZ3210_8n4dn1ne|TS011F`: zcl
- Compound `_TZ3210_urjf5u18|TS011F`: zcl
- Compose: class=socket eps=2 EF00=false IAS=false batteries=mains?
- Notes: z2m TS011F_2_gang_2_usb_wall — 2 gang 2 usb wall outlet. No temperature or humidity endpoint; the climate catch-all had claimed it.
- Sources: z2m-herdsman, P189

### `p189-ts0207-repeater-not-motion` → `zigbee_repeater`

- Couple: `_TZ3000_5k5vh43t` + TS0207
- Protocol: zcl
- Z2M local pids for mfr: TS0207 ✓ overlap
- Compound `_TZ3000_5k5vh43t|TS0207`: zcl  TS0207_repeater — no IAS, not water leak. Pid TS0207 is shared with k4ej3ww2 water
- Compound `_TZ3000_gszjt2xx|TS0207`: zcl
- Compound `_TZ3000_misw04hq|TS0207`: zcl
- Compound `_TZ3000_nkkl7uzv|TS0207`: zcl
- Compound `_TZ3000_nlsszmzl|TS0207`: zcl
- Compound `_TZ3000_ufttklsz|TS0207`: zcl
- Compound `_TZ3000_wlquqiiz|TS0207`: zcl
- Compound `_TZ3000_m0vaazab|TS0207`: zcl
- Compose: class=other eps=1 EF00=false IAS=false batteries=mains?
- Notes: z2m TS0207_repeater — a range extender with no IAS zone and no motion capability.
- Sources: z2m-herdsman, P189

### `p189-mg-zg03w-3gang-not-contact` → `switch_3gang`

- Couple: `_TZE200_2imwyigp` + TS0601
- Protocol: tuya_ef00
- Z2M local pids for mfr: TS0601 ✓ overlap
- Compound `_TZE200_2imwyigp|TS0601`: tuya_dp  MG-ZG03W 3-gang MCU; not contact sensor
- Compose: class=socket eps=3 EF00=false IAS=false batteries=mains?
- Notes: z2m MG-ZG03W — 3 gang switch, not a door/window sensor.
- Sources: z2m-herdsman, P189

### `p189-scene-remotes-not-switch1` → `smart_knob`

- Couple: `_TZ3000_g9g2xnch` + TS004F
- Protocol: zcl
- Z2M local pids for mfr: TS004F ✓ overlap
- Compound `_TZ3000_g9g2xnch|TS004F`: zcl  YSR-MINI-Z scene/dim remote; not mains 1-gang
- Compound `_TZ3000_r0o2dahu|TS004F`: zcl
- Compose: class=button eps=1 EF00=false IAS=false batteries=CR2032
- Notes: z2m YSR-MINI-Z 2-in-1 dimming/scene remote and TS004F_6_button. Battery remotes, not mains 1-gang switches.
- Sources: z2m-herdsman, P189

### `p189-smart-button-fa9mlvja-not-wall4gang` → `remote_button_wireless`

- Couple: `_TZ3000_fa9mlvja` + TS0043
- Protocol: zcl
- Z2M local pids for mfr: TS0041 
- Compound `_TZ3000_fa9mlvja|TS0043`: zcl  IH-K663 smart button; not 4-gang wall. Local Z2M dump may list TS0041 for this mfr — do not invent a second pid
- Compose: class=button eps=4 EF00=true IAS=true batteries=CR2032/CR2450
- Notes: z2m IH-K663 smart button. A battery remote, not a mains 4-gang wall switch.
- Sources: z2m-herdsman, P189

### `p190-ers10-knob-uri7ongn-ixla93vd` → `smart_knob`

- Couple: `_TZ3000_uri7ongn` + TS004F
- Protocol: zcl
- Z2M local pids for mfr: TS004F ✓ overlap
- Compound `_TZ3000_uri7ongn|TS004F`: zcl  ERS-10TZBVK-AA / ZG-101ZD rotary; never power_meter
- Compound `_TZ3000_ixla93vd|TS004F`: zcl
- Compose: class=button eps=1 EF00=false IAS=false batteries=CR2032
- Notes: z2m ERS-10TZBVK-AA smart knob (zigbeeModel ZG-101ZD, TS004F, CR2032). Battery rotary remote — never an energy meter, relay board or mains wall switch. power_meter also declares TS004F, so leaving it there is a live dual-claim.
- Sources: z2m-herdsman, johan-enrichment, P190

### `p190-ts130f-curtain-not-climate-or-dimmer` → `wall_curtain_switch`

- Couple: `_TZ3210_ol1uhvza` + TS130F
- Protocol: zcl
- Z2M local pids for mfr: (none in dump) 
- Compound `_TZ3210_ol1uhvza|TS130F`: zcl  TS130F curtain module; not climate or dimmer
- Compound `_TZ3210_dwytrmda|TS130F`: zcl
- Compose: class=curtain eps=1 EF00=false IAS=false batteries=mains?
- Notes: TS130F curtain switch module per Johan enrichment and product-reference (deviceClass windowcoverings). Not a climate sensor and not a dimmer.
- Sources: z2m-herdsman, johan-enrichment, P190

### `p190-ts130f-curtain-vd43bbfq-not-lock` → `curtain_module`

- Couple: `_TZ3000_vd43bbfq` + TS130F
- Protocol: zcl
- Z2M local pids for mfr: (none in dump) 
- Compound `_TZ3000_vd43bbfq|TS130F`: zcl
- Compose: class=windowcoverings eps=1 EF00=false IAS=false batteries=mains?
- Notes: TS130F curtain module per data/fingerprints.json and Johan enrichment. The lock placement came from an mfs_db record reading TS0601_lock back out of our own manifests.
- Sources: z2m-herdsman, johan-enrichment, P190

### `p190-contact-n2egfsli-not-button` → `contact_sensor`

- Couple: `_TZ3000_n2egfsli` + TS0203
- Protocol: zcl
- Z2M local pids for mfr: (none in dump) 
- Compound `_TZ3000_n2egfsli|TS0203`: ias_zone  Door/window IAS; never button_wireless_2
- Compose: class=sensor eps=1 EF00=false IAS=true batteries=CR2032/CR1632/AAA
- Notes: Johan enrichment lists TS0203/RH3001/SNZB-04 with alarm_contact. The button_wireless_2 claim traces to a driver-compose derived record, i.e. circular.
- Sources: z2m-herdsman, johan-enrichment, P190

### `p191-ts130f-curtain-quartet-not-shutter-catchall` → `wall_curtain_switch`

- Couple: `_TZ3000_1dd0d5yi` + TS130F
- Protocol: zcl
- Z2M local pids for mfr: TS130F ✓ overlap
- Compound `_TZ3000_1dd0d5yi|TS130F`: zcl  Moes MS-108ZR family; not shutter catch-all
- Compound `_TZ3000_femsaaua|TS130F`: zcl
- Compound `_TZ3000_e3vhyirx|TS130F`: zcl
- Compound `_TZ3000_jwv3cwak|TS130F`: zcl
- Compose: class=curtain eps=1 EF00=false IAS=false batteries=mains?
- Notes: Johan enrichment gives TS130F for all four (Moes MS-108ZR family, plus LoraTap and Nous rebrands). curtain_motor_shutter does not even declare TS130F, so the placement can never match; its 50-entry productId list has accumulated Hue bulbs, Xiaomi weather sensors and temperature sensors and should not grow further.
- Sources: z2m-herdsman, johan-enrichment, P191

### `p191-ts0501b-dimmer-g01ie5wu` → `wall_dimmer_1gang_1way`

- Couple: `_TZB210_g01ie5wu` + TS0501B
- Protocol: zcl
- Z2M local pids for mfr: TS0501B ✓ overlap
- Compound `_TZB210_g01ie5wu|TS0501B`: zcl  Z2M TS0501B_dimmer_2; not wall_dimmer_tuya (MCU 0-1000 family)
- Compose: class=socket eps=1 EF00=true IAS=false batteries=mains?
- Notes: z2m TS0501B_dimmer_2. wall_dimmer_1gang_1way declares TS0501B; wall_dimmer_tuya does not, so that placement cannot match.
- Sources: z2m-herdsman, johan-enrichment, P191

### `p191-trv-a4bpgplm-not-generic-diy` → `device_radiator_valve`

- Couple: `_TZE200_a4bpgplm` + TS0601
- Protocol: tuya_ef00
- Z2M local pids for mfr: TS0601 ✓ overlap
- Compound `_TZE200_a4bpgplm|TS0601`: tuya_dp  TRV06 family; never generic_diy
- Compose: class=thermostat eps=1 EF00=false IAS=false batteries=AA
- Notes: z2m TRV06 family thermostatic radiator valve. generic_diy is the DIY catch-all (CC2530, PTVO, ESP32) and does not declare TS0601 — a commercial Tuya TRV does not belong there.
- Sources: z2m-herdsman, johan-enrichment, P191

### `zemismart-ts0043-3btn-sticky` → `button_wireless_3`

- Couple: `_TZ3000_a7ouggvs` + TS0043
- Protocol: zcl
- Retail: Zemismart ZB-L03C-H, Zemismart 3-button wireless scene switch
- Z2M local pids for mfr: (none in dump) 
- Compound `_TZ3000_a7ouggvs|TS0043`: zcl
- Compound `_TZ3000_qzjcsmar|TS0043`: zcl
- Compose: class=button eps=4 EF00=true IAS=true batteries=CR2032/CR2450
- Notes: Battery CR2032 sticky 3-button wall remote. Must not pair as 2-gang. Single/double/long press via PhysicalButtonMixin.
- Sources: z2m, forum-140352-2168, aliexpress-3055457170131038

### `zemismart-ts0001-tb25-1` → `wall_switch_1gang_1way`

- Couple: `_TZ3000_ovyaisip` + TS0001
- Protocol: zcl
- Retail: Zemismart TB25-1, NovaDigital 1-gang
- Z2M local pids for mfr: (none in dump) 
- Compound `_TZ3000_ovyaisip|TS0001`: zcl  Johan #1045 NovaDigital 1-gang switch; keep away from climate fallback
- Compound `_TZ3000_pk8tgtdb|TS0001`: zcl  Johan #1048 1-gang switch; keep away from climate fallback
- Compose: class=socket eps=1 EF00=false IAS=false batteries=mains?
- Notes: 1-gang ZCL TS0001. Ignore leftover 0xEF00. Retail TB25-1 from field; do not invent pids for 606/808/ZMS-206.
- Sources: forum-140352-2173, forum-140352-2182

### `novadigital-ts0002-jjdkhueq` → `wall_switch_2gang_1way`

- Couple: `_TZ3000_jjdkhueq` + TS0002
- Protocol: zcl
- Retail: NovaDigital 2-gang, Zemismart 2-gang, Zemismart TB25-2
- Z2M local pids for mfr: (none in dump) 
- Compound `_TZ3000_jjdkhueq|TS0002`: zcl  NovaDigital/Zemismart 2-gang; sub-device tiles; keep off switch_2gang catch-all
- Compose: class=socket eps=2 EF00=false IAS=false batteries=mains?
- Notes: Mains 2-gang TS0002. Pair as sub-devices (standard onoff per gang). Do not steal onto switch_2gang onoff.gang2 catch-all.
- Sources: z2m, forum-140352-2173, forum-140352-2182

### `novadigital-ts0002-ywubfuvt` → `wall_switch_2gang_1way`

- Couple: `_TZ3000_ywubfuvt` + TS0002
- Protocol: zcl
- Retail: NovaDigital 2-gang, Zemismart 2-gang, Zemismart TB25-2
- Z2M local pids for mfr: (none in dump) 
- Compound `_TZ3000_ywubfuvt|TS0002`: zcl  NovaDigital/Zemismart 2-gang; sub-device tiles
- Compose: class=socket eps=2 EF00=false IAS=false batteries=mains?
- Notes: Mains 2-gang TS0002. Sub-device tiles (standard onoff per gang).
- Sources: z2m, forum-140352-2173, forum-140352-2182

### `novadigital-ts0002-kgxej1dv` → `wall_switch_2gang_1way`

- Couple: `_TZ3000_kgxej1dv` + TS0002
- Protocol: zcl
- Retail: NovaDigital 2-gang, Zemismart 2-gang, Zemismart TB25-2
- Z2M local pids for mfr: (none in dump) 
- Compound `_TZ3000_kgxej1dv|TS0002`: zcl  NovaDigital/Zemismart 2-gang; sub-device tiles
- Compose: class=socket eps=2 EF00=false IAS=false batteries=mains?
- Notes: Mains 2-gang TS0002. Sub-device tiles (standard onoff per gang).
- Sources: z2m, forum-140352-2173, forum-140352-2182

### `novadigital-ts0003-ok0ggpk7` → `wall_switch_3gang_1way`

- Couple: `_TZ3000_ok0ggpk7` + TS0003
- Protocol: zcl
- Retail: NovaDigital NFZB-03, Zemismart TB25-3
- Z2M local pids for mfr: TS0003 ✓ overlap
- Compound `_TZ3000_ok0ggpk7|TS0003`: zcl  NovaDigital NFZB-03 / TB25-3; sub-device tiles; not 1-gang
- Compose: class=socket eps=3 EF00=false IAS=false batteries=mains?
- Notes: Z2M sibling of _TZ3000_fawk5xjv. switch_1gang also lists TS0003 so this mfr must not live there. Retail TB25-n from field; 606/808/ZMS-206 SKUs not locked until mfr+pid confirmed.
- Sources: z2m-28204, forum-140352-2173, forum-140352-2182

### `novadigital-ts0003-f09j9qjb` → `wall_switch_3gang_1way`

- Couple: `_TZ3000_f09j9qjb` + TS0003
- Protocol: zcl
- Retail: Zemismart TB25-3
- Z2M local pids for mfr: (none in dump) 
- Compound `_TZ3000_f09j9qjb|TS0003`: zcl  TB25-3 ZCL; not 2-gang or climate
- Compose: class=socket eps=3 EF00=false IAS=false batteries=mains?
- Notes: 3-gang ZCL. Climate compose lists TS0601 so this mfr on climate would steal pairing.
- Sources: forum-140352-2173, forum-140352-2182

### `novadigital-ts0003-vjhcenzo` → `wall_switch_3gang_1way`

- Couple: `_TZ3000_vjhcenzo` + TS0003
- Protocol: zcl
- Retail: Zemismart TB25-3
- Z2M local pids for mfr: (none in dump) 
- Compound `_TZ3000_vjhcenzo|TS0003`: zcl  TB25-3 ZCL; not climate
- Compose: class=socket eps=3 EF00=false IAS=false batteries=mains?
- Notes: 3-gang ZCL, not a climate sensor.
- Sources: forum-140352-2173, forum-140352-2182

### `novadigital-ts0003-eqsair32` → `wall_switch_3gang_1way`

- Couple: `_TZ3000_eqsair32` + TS0003
- Protocol: zcl
- Retail: Zemismart TB25-3
- Z2M local pids for mfr: (none in dump) 
- Compound `_TZ3000_eqsair32|TS0003`: zcl  Johan #1068 Zemismart TB25-3; sub-device tiles
- Compose: class=socket eps=3 EF00=false IAS=false batteries=mains?
- Notes: 3-gang ZCL wall; sub-device tiles. TZ3000 only.
- Sources: forum-140352-2173, forum-140352-2182

### `novadigital-ts0003-qxcnwv26` → `wall_switch_3gang_1way`

- Couple: `_TZ3000_qxcnwv26` + TS0003
- Protocol: zcl
- Retail: Zemismart TB25-3
- Z2M local pids for mfr: TS0003 ✓ overlap
- Compound `_TZ3000_qxcnwv26|TS0003`: zcl  Johan #1058 TB25-3; sub-device tiles
- Compose: class=socket eps=3 EF00=false IAS=false batteries=mains?
- Notes: 3-gang ZCL wall; sub-device tiles.
- Sources: forum-140352-2173, forum-140352-2182

### `novadigital-ts0003-fawk5xjv` → `wall_switch_3gang_1way`

- Couple: `_TZ3000_fawk5xjv` + TS0003
- Protocol: zcl
- Retail: Zemismart TB25-3
- Z2M local pids for mfr: TS0003 ✓ overlap
- Compound `_TZ3000_fawk5xjv|TS0003`: zcl  TB25-3 ZCL; TZ3000 only (TZ3210 stays 1-gang/unconfirmed)
- Compose: class=socket eps=3 EF00=false IAS=false batteries=mains?
- Notes: TZ3000 3-gang. _TZ3210_fawk5xjv is a different couple — do not move.
- Sources: forum-140352-2173, forum-140352-2182

### `novadigital-ts0003-yervjnlj` → `wall_switch_3gang_1way`

- Couple: `_TZ3000_yervjnlj` + TS0003
- Protocol: zcl
- Retail: Zemismart TB25-3
- Z2M local pids for mfr: (none in dump) 
- Compound `_TZ3000_yervjnlj|TS0003`: zcl  Johan #1051 NovaDigital TS0003 switch; keep away from climate fallback
- Compose: class=socket eps=3 EF00=false IAS=false batteries=mains?
- Notes: Already on wall_switch_3gang_1way; keep TS0003/TS0013 only.
- Sources: forum-140352-2173, forum-140352-2182

### `novadigital-ts0601-4gang-aagrxlbd` → `wall_switch_4_gang_tuya`

- Couple: `_TZE204_aagrxlbd` + TS0601
- Protocol: tuya_ef00
- Retail: NovaDigital TB26-4, Zemismart TB25-4
- Z2M local pids for mfr: TS0601 ✓ overlap
- Compound `_TZE204_aagrxlbd|TS0601`: tuya_dp  NovaDigital TB26-4; not climate
- Compound `_TZE284_aagrxlbd|TS0601`: tuya_dp
- Compose: class=socket eps=1 EF00=true IAS=false batteries=CR2032
- Notes: 4-gang MCU DP1-4. climate_sensor also declares TS0601.
- Sources: z2m-herdsman-7133, forum-140352-2173

### `zemismart-ts0601-4gang-shkxsgis` → `wall_switch_4_gang_tuya`

- Couple: `_TZE200_shkxsgis` + TS0601
- Protocol: tuya_ef00
- Retail: Zemismart TB25-4, Zemismart TB26-4
- Z2M local pids for mfr: (none in dump) 
- Compound `_TZE200_shkxsgis|TS0601`: tuya_dp  4-gang EF00 DP1-4; not din-rail/climate
- Compound `_TZE204_shkxsgis|TS0601`: tuya_dp
- Compound `_TZE284_shkxsgis|TS0601`: tuya_dp
- Compose: class=socket eps=1 EF00=true IAS=false batteries=CR2032
- Notes: 4-gang MCU DP1-4. din_rail_meter previously stole the TZE204 sibling.
- Sources: forum-140352-2173, forum-140352-2182

### `zemismart-ts0601-6gang-r731zlxk` → `wall_switch_6_gang_tuya`

- Couple: `_TZE200_r731zlxk` + TS0601
- Protocol: tuya_ef00
- Retail: Zemismart TB25-6, Zemismart TB26-6
- Z2M local pids for mfr: (none in dump) 
- Compound `_TZE200_r731zlxk|TS0601`: tuya_dp  Zemismart 6-gang EF00 DP1-6; not climate
- Compound `_TZE204_r731zlxk|TS0601`: tuya_dp
- Compound `_TZE284_r731zlxk|TS0601`: tuya_dp
- Compose: class=socket eps=1 EF00=true IAS=false batteries=CR2032
- Notes: 6-gang MCU DP1-6 + DP14 power-on. climate_sensor also declares TS0601.
- Sources: z2m-11975, forum-140352-2173, forum-140352-2182

### `interview-ts0043-bczr4e10` → `button_wireless_3`

- Couple: `_TZ3000_bczr4e10` + TS0043
- Protocol: zcl
- Z2M local pids for mfr: (none in dump) 
- Compound `_TZ3000_bczr4e10|TS0043`: zcl  INT-170: 4 OnOff EPs but TS0043 remote — never switch_4gang
- Compose: class=button eps=4 EF00=true IAS=true batteries=CR2032/CR2450
- Notes: INT-170: interview has 4 OnOff endpoints + EP custom 0xE000. ProductId TS0043 is a battery remote, not a wall switch.
- Sources: DEVICE_INTERVIEWS INT-170, desktop-interview-2026-01-31

### `cfnprab5-power-strip-not-remote` → `socket_power_strip_four_three`

- Couple: `_TZ3000_cfnprab5` + TS011F
- Protocol: zcl
- Z2M local pids for mfr: TS011F ✓ overlap
- Compound `_TZ3000_cfnprab5|TS011F`: zcl  4+USB strip; never a TS0042 remote
- Compose: class=socket eps=4 EF00=false IAS=false batteries=mains?
- Notes: 4-outlet + USB strip. Same mfr must not pair as a 2-button remote. Compound lock _TZ3000_cfnprab5|TS011F.
- Sources: z2m-herdsman, P167

### `lwthnp7j-zcl-4gang` → `wall_switch_4gang_1way`

- Couple: `_TZ3000_lwthnp7j` + TS0004
- Protocol: zcl
- Z2M local pids for mfr: (none in dump) 
- Compound `_TZ3000_lwthnp7j|TS0004`: zcl  Zemismart TB25-4 ZCL; sub-device tiles; not EF00 TS0601
- Compose: class=socket eps=4 EF00=false IAS=false batteries=mains?
- Notes: ZCL 4-gang TB25-4 (not EF00 TS0601). Sub-device tiles. Do not invent 606/808/ZMS-206 pids.
- Sources: forum-140352-2173, forum-140352-2182

### `okaz9tjs-ts011f-metering-plug` → `plug_energy_monitor`

- Couple: `_TZ3000_okaz9tjs` + TS011F
- Protocol: zcl
- Z2M local pids for mfr: (none in dump) 
- Compound `_TZ3000_okaz9tjs|TS011F`: zcl  Z2M TS011F_plug_3: fw 1.0.5+ needs electrical poll (no auto report). z2m#13191. Not wireless button
- Compose: class=socket eps=1 EF00=false IAS=false batteries=mains?
- Notes: Metering TS011F plug (Z2M TS011F_plug_3). Firmware 1.0.5+ disabled auto electrical reports — poll voltage/current/power. Not a wireless button. Pid TS011F is also DIN/strip/double-outlet — lock this couple.
- Sources: z2m#13191, homesuite-field

### `p217-wfxuhoea-loratap-garage` → `garage_door`

- Couple: `_TZE200_wfxuhoea` + TS0601
- Protocol: tuya_ef00
- Z2M local pids for mfr: TS0601 ✓ overlap
- Compound `_TZE200_wfxuhoea|TS0601`: tuya_dp DP {"1":"command","2":"garagedoor_closed"} LoraTap garage; never button_wireless_plug
- Compound `_TZE204_wfxuhoea|TS0601`: tuya_dp DP {"1":"command","2":"garagedoor_closed"}
- Compose: class=garagedoor eps=1 EF00=true IAS=false batteries=mains?
- Notes: LoraTap garage opener (JohanBendz #1442). Z2M GARAGE family — not a wireless plug.
- Sources: JohanBendz#1442, z2m-garage

### `p217-k6fvknrr-ts011f-double-outlet` → `double_power_point_2`

- Couple: `_TZ3000_k6fvknrr` + TS011F
- Protocol: zcl
- Z2M local pids for mfr: TS011F ✓ overlap
- Compound `_TZ3000_k6fvknrr|TS011F`: zcl  2-endpoint on/off TS011F; not switch_1gang and not energy plug
- Compose: class=socket eps=2 EF00=false IAS=false batteries=mains?
- Notes: 2-endpoint TS011F without metering clusters (JohanBendz PR #1437).
- Sources: JohanBendz#1437

### `p217-wing-ts0203-contact` → `contact_sensor`

- Couple: `Wing` + TS0203
- Protocol: ias_zone
- Z2M local pids for mfr: (none in dump) 
- Compound `Wing|TS0203`: zcl  Wing TS0203 door/window; not water leak
- Compose: class=sensor eps=1 EF00=false IAS=true batteries=CR2032/CR1632/AAA
- Notes: Wing brand door/window reports manufacturerName Wing (JohanBendz PR #1439).
- Sources: JohanBendz#1439

### `p217-hobeian-zg305z-usb-2gang` → `switch_2gang`

- Couple: `HOBEIAN` + ZG-305Z
- Protocol: zcl
- Z2M local pids for mfr: CK-BL702-MWS-01(7016) 
- Compound `HOBEIAN|ZG-305Z`: zcl  MHCOZY/HOBEIAN 2ch USB switch; not wireless button
- Compose: class=socket eps=2 EF00=false IAS=false batteries=mains?
- Notes: HOBEIAN ZG-305Z MHCOZY dual USB-C switch (JohanBendz PR #1435). Unique pid avoids TS0601 cartesian with other HOBEIAN sensors.
- Sources: JohanBendz#1435

### `pm-rolp-tz3218-7fiyo3kv-ts000f-switch-temp` → `switch_temp_sensor`

- Couple: `_TZ3218_7fiyo3kv` + TS000F
- Protocol: hybrid
- Retail: Mumubiz TYZGTH1CH-D1RF, MHCOZY TYZGTH16A-D1RF
- Z2M local pids for mfr: TS000F ✓ overlap
- Compound `_TZ3218_7fiyo3kv|TS000F`: hybrid DP {"102":"measure_temperature/10"} Mumubiz/MHCOZY TYZGTH1CH-D1RF: ZCL onoff + EF00 DP102 temp; never switch_1gang
- Compound `_TZ3218_ya5d6wth|TS000F`: hybrid DP {"102":"measure_temperature/10"} MHCOZY TYZGTH16A TS000F sibling; ZCL onoff + EF00 temp
- Compose: class=socket eps=1 EF00=true IAS=false batteries=mains?
- Notes: Mains 1-gang switch with DS18B20 probe (ZCL onoff + EF00 DP102). Pairing as switch_1gang hid temperature.
- Sources: z2m-herdsman, JohanBendz#1176, forum-pm-147692

### `fgwhjm9j-ts011f-metering-plug` → `plug_energy_monitor`

- Couple: `_TZ3210_fgwhjm9j` + TS011F
- Protocol: zcl
- Z2M local pids for mfr: (none in dump) 
- Compound `_TZ3210_fgwhjm9j|TS011F`: zcl  HomeSuite field metering plug sibling; ZCL electrical+metering; not climate
- Compose: class=socket eps=1 EF00=false IAS=false batteries=mains?
- Notes: TZ3210 TS011F metering plug sibling of okaz9tjs. ZCL electrical+metering; not climate. Pid TS011F is ambiguous without mfr.
- Sources: homesuite-field

### `p2266-bjawzodf-ty0201-temu` → `lcdtemphumidsensor`

- Couple: `_TZ3000_bjawzodf` + TY0201 (also TS0201 in Z2M WSD500A list)
- Protocol: zcl EP1
- Retail: Temu round white LCD temp/humidity (HACF #38762)
- Compound: EP1 clusters 0/1/3/0x0402/0x0405 — NOT Neo qaaysllp (no lux, no EP2, no 0xE002)
- Notes: Needs Tuya magic 0xFFFE. Sibling `_TZE200_bjawzodf`+TS0601 is EF00 → `climate_sensor` (different couple).
- Sources: hacf-38762, zha-device-handlers#2862, z2m-WSD500A, P2266

### `p2264-qaaysllp-neo-th02b` → `lcdtemphumidluxsensor`

- Couple: `_TZ3000_qaaysllp` + TS0201
- Protocol: zcl (multi-endpoint)
- Retail: Neo NAS-TH02B2 / NAS-TH02B / TH01 / Z2M LCZ030
- Compound `_TZ3000_qaaysllp|TS0201`: EP1 lux+battery+0xE002; undeclared EP2 temp 0x0402 + humidity 0x0405 after Basic magic 0xFFFE
- Compose: class=sensor eps=2 EF00=false batteries=AAA/AAA
- Notes: Abysim Medium layers — (1) lying descriptor (2) reports on EP2 (3) magic 0xFFFE (4) EP2 read → UNSUPPORTED 0x86 so no configureReporting on EP2; unsolicited reports only. E002 `alarm_humidity_max` is **0xD00D** (upstream ZHA wrongly used 0xD00C). Scale /100. Wait ~1–2 min after pair for first temp/hum.
- Sources: zha-device-handlers#862, abysim-medium-ts0201-neo, z2m-LCZ030, P2264, P2265

Regenerate: `node tools/ci/investigate-device-peculiarities.js`


### `nobo-sws-iz-xffhmvhv` → `button_wireless_4` (Gmail 9cbf9eb6 / 2026-08-22)

- Couple: `_TZ3000_xffhmvhv` + TS004F (user) / TS0044 (Z2M Nous wireless 4-button)
- Protocol: ZCL multi-EP OnOff/Level (clusters 5/6/8), **no genOnOff 0x8004**
- Retail: Nobø SWS-IZ
- Notes: Physical presses arrive as `[TS0044-RAW] EPn`; writing 32772 spam kills UX. Prefer `*_button_4gang_button_N_*` Flow cards. Never invent `*_button_N_button_pressed`.
- Sources: gmail-diag-9cbf9eb6, z2m-tuya.ts Nous TS0044

### `meter91-zgyzgdua-ts0044` → `scene_switch_4` (forum #2189 / #2207 / diags 55e3e591, c40705a1)

- Couple: `_TZ3000_zgyzgdua` + TS0044 (Moes TS0044_2 / XH-SY-04Z whitelabel — **not** ERS-10TZBVK knob)
- Protocol: **ZCL** multi-EP genOnOff **0xFD** (payload 0/1/2); E000 on EP1 fallback only; **no EF00**, **no 0x8004**
- Pairing (P2336): compose EP1 `[0,1,6]` ⊆ interview `[0,1,6,57344]`; EP2–4 `[6]` only
- Diag **c40705a1** (2026-08-30): user on **9.0.714** → unknown device = pre-P2336; update Test **≥9.0.738** + remove + re-pair
- Z2M: Moes portable 4-button; `tuya.fz.on_off_action` only

### `p2337-ts0044-routing` (Z2M whitelabel split)

- `_TZ3000_u3nv1jwk` + TS0044 → `button_wireless_4` (Z2M TM-YKQ004 portable remote)
- `_TZ3000_bgtzm4ny` + TS0044 → `button_wireless_4` (HOBEIAN ZG-101ZS Star Ring)
- `_TZ3000_vp6clf9d` / `_TZ3000_ufhtxr59` + TS0044 → `scene_switch_4` only — removed from `wall_remote_4_gang` (P2328 steal)
- MVM `resolveDriverType` must not route u3nv1jwk/bgtzm4ny to scene_switch_4
- Notes: Update Test ≥9.0.733 + re-pair. Skip toast `button_wireless_4`. Physical = 0xFD.
- Sources: forum-140352#2189, gmail-55e3e591, diag c40705a1

### `peter-0cea6870-hybrid-contact` → `contact_sensor` (forum #2190)

- Couple: **ABSENT in post** — do not invent
- Protocol: hybrid IAS Zone + EF00 (DP1 contact, DP101 lux)
- Tiles: Raam onze slpkamer, Raam Computerkamer, Raam Slpkamer voor (UUID `53c35301…`)
- Notes: Prefer IAS over DP1 for `alarm_contact` (pulse open/close). Lux via DP101 (raw ~121–141 in diag) may differ from dedicated window lux sensor — need interview for scale. Water/smartbutton need re-pair on Test with IAS leftover EF00 skip.
- Fleet: `data/user-impact-catalog.json` → `Peter_van_Werkhoven`; report `reports/forum-verify-*/users/Peter_van_Werkhoven.md`
- Sources: forum-140352#2183–2190, gmail-0cea6870, 1cf775a2, 96c19859, 634f7b19

### `p2297-t9ynfz4x-ts0225-mmwave` → `motion_sensor_radar_mmwave` (A_Tas #2199 / T158757)

- Couple: `_TZ3218_t9ynfz4x` + TS0225 (Linptech ES1ZZ / Moes ZSS-LP-HP02-MS whitelabel)
- Protocol: **ZCL hybrid** — presence via IAS/mmwave; settings on **0xE002** attrs 57348/57349/57355 (NOT EF00 DP9)
- Z2M ref: [ES1ZZ(TY)](https://www.zigbee2mqtt.io/devices/ES1ZZ(TY).html) — motion/static sensitivity, motion distance, fading_time DP101, led 57353
- P2289: mfr-only detect when Homey settings omit pid; P2298 onSettings never throws to UI
- Stable: P2343 backport LinptechES1Profile + full device.js (was EF00 DP9 stub — broken settings path)
- User: update Test ≥9.0.738 + re-pair; use Linptech-specific settings group

### `gabriel-zemismart-bulk-2173` (forum #2173 / #2186 / lwthnp7j)

- **#2173 is a Cartesian OEM dump** — each mfr expanded to TS0001|2|3|0601. Lock **one verified pid per mfr** only (HomeSuite + Z2M + Blakadder).
- Verified 1-gang: `_TZ3000_OVYAISIP`+`TS0001`, `_TZ3000_PK8TGTDB`+`TS0001` → `wall_switch_1gang_1way`
- Verified 2-gang: `YWUBFUVT`/`KGXEJ1DV`/`JJDKHUEQ`+`TS0002` → `wall_switch_2gang_1way`
- Verified 3-gang: `YERVJNLJ`/`VJHCENZO`/`QXCNWV26`/`EQSAIR32`/`F09J9QJB`/`FAWK5XJV`/`OK0GGPK7`+`TS0003` → `wall_switch_3gang_1way`
- Verified 4-gang ZCL: `_TZ3000_lwthnp7j`+`TS0004` → `wall_switch_4gang_1way` (never `switch_4gang` / EF00)
- Verified 4-gang MCU: `_TZE200/_TZE284_SHKXSGIS`, `_TZE204_AAGRXLBD`+`TS0601` → `wall_switch_4_gang_tuya`
- Verified 6-gang MCU: `_TZE200/_TZE284_R731ZLXK`+`TS0601` → `wall_switch_6_gang_tuya`
- Soft OEM siblings (compact pins only): `_TZE204_SHKXSGIS`, `_TZE284_AAGRXLBD`, `_TZE204_R731ZLXK`
- **Forbidden:** Cartesian cross-pids; routing to `switch_Ngang` or `wall_dimmer_tuya`; inventing pid onto #2186 when ABSENT
- P2343/P2347 sacred-keep pins prevent compact drop
- Sources: HomeSuite device table, Z2M herdsman, Blakadder TB26-6, forum-140352#2173

### `p2347-cam-smart-button-need-diag` → `button_wireless_1` (Cam T146735 #8)

- Motion locked: `HOBEIAN`+`ZG-204ZL` → `presence_sensor_radar` (P2340)
- Smart button couple **ABSENT** in post; hist diag `4d7b45a5` (#1160) not re-proven
- Soft hypothesis only: `_TZ3000_5bpeda8u`+`TS0041` — NEED_DIAG interview
- Do not invent Cam button pid from Peter / 4x4_Pete radar posts

### `p2347-peter-2190-absent` → multi-tile (Peter_van_Werkhoven)

- Diags `0cea6870` / `1cf775a2` known; extract has **0** mfr/pid lines
- Tiles SOS / contact / water / smartbutton remain `couple: null`
- Do not glue `k4ej3ww2`, `mrpevh8p`, `TS0207` onto #2190
- Reliability BOTH already: IAS coerce, skip IAS-only EF00 TX, SOS battery debounce

