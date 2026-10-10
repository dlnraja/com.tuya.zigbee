# Lost couples restore — 2026-10-11 (bastien-home)

## Method
- Fresh full clone (`git clone --no-single-branch`, 5438 commits on master). Every distinct blob of `drivers/*/driver.compose.json` **and** `app.json` (pre-compose era) on each branch was parsed; the exact (manufacturerName × productId) cross-product per driver was unioned, case-insensitive.
- Lost = ever-present exact couple absent from every driver at the tip.
- Raw lost exact couples: master 25284, stable-v5 25366, bastien-home 25212. Nearly all are **cross-product artefacts** (a mfr paired with a foreign pid by Homey's cross product, never real hardware); they must not be restored.
- Filter: kept only couples attested **exactly** (same mfr + same pid) by Z2M `tuya.fingerprint(pid,[mfr])`/`modelID+manufacturerName` (zigbee-herdsman-converters, local snapshot of 398 device files) or by Johan's app manifest. Placeholders/probes/dummies (`_ph_`, `dummy`, `xxxx`, `r4clone`, `TS00R4`) excluded.
- Placement: our driver for the Z2M device class, only if the pid is already in the target driver and the mfr is not in any other driver that shares a pid with the target (no new cross-product collision). Additive only. Gates: couple-pin OK, fingerprint integrity OK, golden snapshot rewritten.
- Sources checked here: Z2M (exact), Johan app. ZHA / deCONZ / Blakadder / tuya-local / Hubitat / SmartThings / forum were **not** consulted per couple in this pass — every lead below still needs them.

## Restored on bastien-home
| Couple | Driver | Sources |
|---|---|---|
| `_TZE200_01fvxamo` + `TS0201` | `temphumidsensor` | [Z2M tuya.ts](https://github.com/Koenkk/zigbee-herdsman-converters/blob/master/src/devices/tuya.ts) (Koenkk et al.) — Z2M tuya.ts THS317-ET-TY |
| `_TZ3000_egvb1p2g` + `TS004F` | `smart_knob` | [Z2M moes.ts](https://github.com/Koenkk/zigbee-herdsman-converters/blob/master/src/devices/moes.ts) (Koenkk et al.) — Z2M moes.ts ERS-10TZBVB-AA |
| `_TZ3000_lrfvzq1e` + `TS004F` | `smart_knob` | [Z2M moes.ts](https://github.com/Koenkk/zigbee-herdsman-converters/blob/master/src/devices/moes.ts) (Koenkk et al.) — Z2M moes.ts ERS-10TZBVB-AA |

## Not restored (needs a move, not an add)
The mfr sits in a wrong driver that shares pids with the right one, so adding it would create a collision. Fixing it means removing it from the wrong driver, which is not additive, so these wait for approval:
| Couple | Intended | Blocked by |
|---|---|---|
| `_TYZB01_4mdqxxnn` + `TS0222` | `illuminance_sensor` | collision switch_1gang |
| `_TYZB01_m6ec2pgj` + `TS0222` | `illuminance_sensor` | collision switch_1gang |
| `_TZ3000_j6adk9id` + `TS0222` | `illuminance_sensor` | collision dimmer_wall_1gang |
| `_TZ3290_s6ezpa3j` + `TS1201` | `ir_blaster` | collision climate_sensor |
| `_TZ3210_m3mxv66l` + `TS0202` | `motion_sensor` | collision climate_sensor |
| `_TZ3210_a2erlvb8` + `TS0002` | `switch_2gang` | collision switch_1gang |
| `_TZ3000_kjfzuycl` + `TS004F` | `smart_knob` | collision smart_remote_1_button |
| `_TZ3000_nsa76jai` + `TS0004` | `switch_4gang` | collision climate_sensor |
| `_TZ3000_fa9mlvja` + `TS0041` | `button_wireless_1` | collision remote_button_wireless |
| `_TYZB01_v8gtiaed` + `TS110F` | `dimmer_2_gang` | collision switch_1gang |
| `_TYZB01_qezuin6k` + `TS110F` | `dimmer_wall_1gang` | collision dimmer_1_gang |

## Counts (this branch)
- Z2M-attested lost: 20; Johan-only lost: 62
- Restored: 3; blocked (needs move): 11; rest → `data/leads/lost-couples-2026-10-11.json` (unverified)

## Earlier today (bastien)
- 365a2837ed: `_TZ3000_qgwcxxws`/`_TZ3000_8rppvwda` + TS0041 → button_wireless_1 (parity with master/stable).
- a01bceed66 + c5057950fd: 4 stale fingerprints.json entries realigned to their compose driver (8ygsuhe1→air_quality_co2, pay2byax→contact_sensor_zigbee, b4awzgct→button_wireless_1 canonical case, 7ysdnebc→dimmer_2_gang); collision-safety git path made portable.


## Pass 2 — W4 moves + placement of Z2M-confirmed couples (bastien-home)

Doctrine W4: one exact couple, one driver matching the real hardware. A mfr was removed from an old driver only if none of that driver's pids is a pid Z2M lists for this mfr (so the old placement could never match the hardware; only cross-product pairs are dropped). Each placed couple is pinned in `config/architecture/couple-driver-pins.json`.

Sources searched for every couple: Z2M, ZHA quirks, deCONZ, Blakadder, tuya-local, localtuya, Hubitat (kkossev), our forum dumps / diags / docs. SmartThings was not searched.

| Couple | Driver | Removed from (W4) | Sources |
|---|---|---|---|
| `_tz3000_fa9mlvja` + `ts0041` | `button_wireless_1` | remote_button_wireless (pids there: ts0043, ts0046, ts004f, ts011f, ts0121, ts0215a…) | [Z2M](https://github.com/Koenkk/zigbee-herdsman-converters) (Koenkk et al.); [deCONZ](https://github.com/dresden-elektronik/deconz-rest-plugin) exact (deconz-rest-plugin/devices/tuya/_TZ3000_ja5osu5g_smart_button.json); [Blakadder](https://zigbee.blakadder.com) exact (zigbee/_zigbee/Tuya_IH-K663.md); [Hubitat(kkossev)](https://github.com/kkossev/Hubitat) exact (hubitat/Drivers/Tuya TS004F/TS004F.groovy); ours: forum-scan/cron-2026-09-02-09/app-stable-v5.json, forum-scan/cron-2026-09-03-09/app-stable-v5.json — not found in: ZHA, tuya-local, localtuya |
| `_tz3000_nsa76jai` + `ts0004` | `switch_4gang` | climate_sensor (pids there: ck-tlsr8656-ss5-01(7014), ck-tlsr8656-ss5-02(7014), lumi.sensor_ht, lumi.sensor_ht.agl02, lumi.weather, rh3052…) | [Z2M](https://github.com/Koenkk/zigbee-herdsman-converters) (Koenkk et al.); ours: forum-scan/cron-2026-08-28-09/github/master-climate_sensor.compose.json, forum-scan/cron-2026-08-28-09/github/stable-v5-climate_sensor.compose.json — not found in: ZHA, deCONZ, Blakadder, tuya-local, localtuya, Hubitat(kkossev) |
| `_tz3210_m3mxv66l` + `ts0202` | `motion_sensor` | climate_sensor (pids there: ck-tlsr8656-ss5-01(7014), ck-tlsr8656-ss5-02(7014), lumi.sensor_ht, lumi.sensor_ht.agl02, lumi.weather, rh3052…) | [Z2M](https://github.com/Koenkk/zigbee-herdsman-converters) (Koenkk et al.); ours: mdiag/scripts/data/current-fps.json, mdiag/scripts/data/all_mfrs.json — not found in: ZHA, deCONZ, Blakadder, tuya-local, localtuya, Hubitat(kkossev) |
| `_tz3290_s6ezpa3j` + `ts1201` | `ir_blaster` | climate_sensor (pids there: ck-tlsr8656-ss5-01(7014), ck-tlsr8656-ss5-02(7014), lumi.sensor_ht, lumi.sensor_ht.agl02, lumi.weather, rh3052…) | [Z2M](https://github.com/Koenkk/zigbee-herdsman-converters) (Koenkk et al.); ours: forum-scan/cron-2026-09-02-09/app-master.json, forum-scan/cron-2026-08-31-16/github/master-app.json — not found in: ZHA, deCONZ, Blakadder, tuya-local, localtuya, Hubitat(kkossev) |
| `_tz3000_lbtpiody` + `ts0201` | `temphumidsensor` | — | [Z2M](https://github.com/Koenkk/zigbee-herdsman-converters) (Koenkk et al.); [deCONZ](https://github.com/dresden-elektronik/deconz-rest-plugin) exact (deconz-rest-plugin/devices/tuya/_TZ3000_TS0201_temp_hum_sensor.json); [Blakadder](https://zigbee.blakadder.com) exact (zigbee/_zigbee/Nous_E5.md); [Hubitat(kkossev)](https://github.com/kkossev/Hubitat) exact (hubitat/Drivers/Tuya Temperature Humidity Illuminance LCD Display with a Clock/Tuya_Temperature_Humidity_Illuminance_LCD_Display_with_a_Clock.groovy); ours: forum-scan/cron-2026-09-07-09/github/stable-v5-water_leak_sensor.json, forum-scan/cron-2026-09-07-09/github/master-water_leak_sensor.json — not found in: ZHA, tuya-local, localtuya |
| `_tze200_nkjintbl` + `ts0601` | `switch_2gang` | — | [Z2M](https://github.com/Koenkk/zigbee-herdsman-converters) (Koenkk et al.); [ZHA](https://github.com/zigpy/zha-device-handlers) exact (zha-device-handlers/zhaquirks/tuya/ts0601_switch.py); [Blakadder](https://zigbee.blakadder.com) exact (zigbee/_zigbee/NorkImes_MKS-CM-W5.md); ours: mdiag/tools/ci/enrich-market-colocate.js, mdiag/tools/ci/apply-p102-sacred-lot3.js — not found in: deCONZ, tuya-local, localtuya, Hubitat(kkossev) |
| `_tze200_n8dljorx` + `ts0601` | `contact_sensor_zigbee` | — | [Z2M](https://github.com/Koenkk/zigbee-herdsman-converters) (Koenkk et al.); [ZHA](https://github.com/zigpy/zha-device-handlers) exact (zha-device-handlers/zhaquirks/tuya/tuya_contact.py); [deCONZ](https://github.com/dresden-elektronik/deconz-rest-plugin) exact (deconz-rest-plugin/devices/tuya/_TZE200_pay2byax_openclose_sensor.json); [Blakadder](https://zigbee.blakadder.com) exact (zigbee/_zigbee/Tuya_ZG-102ZL.md); [Hubitat(kkossev)](https://github.com/kkossev/Hubitat) exact (hubitat/Drivers/Tuya Contact Sensor/Tuya Contact Sensor.groovy); ours: forum-scan/cron-2026-08-28-09/github/stable-v5-climate_sensor.compose.json, forum-scan/cron-2026-09-02-09/app-master.json — not found in: tuya-local, localtuya |
| `_tze200_qcasmfan` + `ts0601` | `smoke_sensor` | smoke_sensor3 (pids there: ts0205…) | [Z2M](https://github.com/Koenkk/zigbee-herdsman-converters) (Koenkk et al.); ours: lc-master/docs/knowledge/device-truth.json, forum-scan/cron-2026-08-31-16/github/master-app.json — not found in: ZHA, deCONZ, Blakadder, tuya-local, localtuya, Hubitat(kkossev) |
| `_tyzb01_v8gtiaed` + `ts110f` | `dimmer_2_gang` | switch_1gang (pids there: 01minizb, basiczbr3, s26r2zb, s31zb, ts0001, ts0001_power…) | [Z2M](https://github.com/Koenkk/zigbee-herdsman-converters) (Koenkk et al.); [Blakadder](https://zigbee.blakadder.com) exact (zigbee/_zigbee/Lonsonho_QS-Zigbee-D02-TRIAC-2C-LN.md); [Hubitat(kkossev)](https://github.com/kkossev/Hubitat) exact (hubitat/Tuya.md); ours: forum-scan/cron-2026-09-02-09/app-stable-v5.json, forum-scan/cron-2026-09-02-09/app-master.json — not found in: ZHA, deCONZ, tuya-local, localtuya |
| `_tz3000_j6adk9id` + `ts0222` | `illuminance_sensor` | dimmer_wall_1gang (pids there: ts0001, ts0002, ts0003, ts0011, ts0012, ts0013…) | [Z2M](https://github.com/Koenkk/zigbee-herdsman-converters) (Koenkk et al.); [deCONZ](https://github.com/dresden-elektronik/deconz-rest-plugin) exact (deconz-rest-plugin/devices/tuya/_TZ3000_8uxxzz4b_light_sensor.json); ours: forum-scan/cron-2026-09-01-09/github/app.json.stable-v5, forum-scan/cron-2026-09-01-09/github/stable-v5-app.json.head — not found in: ZHA, Blakadder, tuya-local, localtuya, Hubitat(kkossev) |
| `_tyzb01_4mdqxxnn` + `ts0222` | `illuminance_sensor` | switch_1gang (pids there: 01minizb, basiczbr3, s26r2zb, s31zb, ts0001, ts0001_power…) | [Z2M](https://github.com/Koenkk/zigbee-herdsman-converters) (Koenkk et al.); [deCONZ](https://github.com/dresden-elektronik/deconz-rest-plugin) exact (deconz-rest-plugin/devices/tuya/_TZ3000_8uxxzz4b_light_sensor.json); [Blakadder](https://zigbee.blakadder.com) exact (zigbee/_zigbee/Tuya_ZXZLD-01.md); [Hubitat(kkossev)](https://github.com/kkossev/Hubitat) exact (hubitat/Drivers/Tuya Zigbee Fingerbot/Archives/Tuya_Zigbee_Fingerbot_lib_included.groovy); ours: lc-master/docs/reports/CONFLICTS_RESOLUTIONS.json, lc-master/docs/reports/FULL_RESTORATION_CONFLICTS_ANALYSIS.json — not found in: ZHA, tuya-local, localtuya |
| `_tyzb01_m6ec2pgj` + `ts0222` | `illuminance_sensor` | switch_1gang (pids there: 01minizb, basiczbr3, s26r2zb, s31zb, ts0001, ts0001_power…) | [Z2M](https://github.com/Koenkk/zigbee-herdsman-converters) (Koenkk et al.); [deCONZ](https://github.com/dresden-elektronik/deconz-rest-plugin) exact (deconz-rest-plugin/devices/tuya/_TZ3000_8uxxzz4b_light_sensor.json); ours: forum-scan/raw/stable-v5/app.json, mdiag/scripts/data/z2m-data.json — not found in: ZHA, Blakadder, tuya-local, localtuya, Hubitat(kkossev) |

### Left as leads
| Couple | Why |
|---|---|
| `_tze200_p6fuhvez|ts0225` | same as aj0oxo1i |
| `_tze200_aj0oxo1i|ts0225` | Z2M model block ambiguous (ZG-225Z gas vs presence); needs interview |
| `_tz3210_a2erlvb8|ts0002` | switch_1gang legitimately holds ['ts000f'] shared with switch_2gang |
| `_tze600_ogyg1y6b|ts0105` | no driver has TS0105; adding pid would cross-product a whole curtain driver |
| `_tz3000_fdxihpp7|ts000f` | wall_switch_1gang_1way legitimately holds ['ts0001'] shared with switch_1gang |

### W4 cleanup (same mfr left in a driver none of whose pids Z2M lists for it)
- `_tz3000_egvb1p2g|ts004f`: removed from `climate_sensor` (kept in `smart_knob`)
- `_tze200_01fvxamo|ts0201`: removed from `motion_sensor` (kept in `temphumidsensor`)
- `_tze200_n8dljorx|ts0601`: removed from `contact_sensor` (kept in `contact_sensor_zigbee`)
- `_tz3000_lrfvzq1e|ts004f`: removed from `climate_sensor` (kept in `smart_knob`)
- `_tz3000_lbtpiody|ts0201`: removed from `water_leak_sensor` (kept in `temphumidsensor`)


## Pass 3 — variant placements, second sources, interview requests (bastien-home)

### Placed
- `_TZ3000_fdxihpp7` + `TS000F`: -wall_switch_1gang_1way +switch_1gang — Z2M WHD02 TS0001+TS000F (1 gang); held WHD02 couples live in switch_1gang
- `_TZ3210_a2erlvb8|TS0002` stays a lead here: this branch has no runtime GangCountAdapter, and moving the mfr to `switch_2gang` would give 1ch TS000F units a dead gang 2. Port after master soak.

### Second-source search (GitHub issues + SmartThings Edge code) for couples whose only exact source was Z2M
Matches below are by manufacturerName; issue titles naming the exact couple are the meaningful ones. `wonjj6768/smartthings-zigbee-edge-drivers` = SmartThings Edge family tables.

| Couple | GitHub issues | SmartThings |
|---|---|---|
| `_tz3000_8a833yls|ts011f` | [Koenkk/zigbee2mqtt#27496](https://github.com/Koenkk/zigbee2mqtt/issues/27496); [zigpy/zha-device-handlers#2368](https://github.com/zigpy/zha-device-handlers/issues/2368); [zigpy/zha-device-handlers#2151](https://github.com/zigpy/zha-device-handlers/issues/2151) | wonjj6768/smartthings-zigbee-edge-drivers, wonjj6768/smartthings-zigbee-edge-drivers |
| `_tz3000_8nyaanzb|ts011f` | [Koenkk/zigbee-herdsman-converters#12155](https://github.com/Koenkk/zigbee-herdsman-converters/issues/12155); [Koenkk/zigbee-herdsman-converters#8836](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8836) | wonjj6768/smartthings-zigbee-edge-drivers, wonjj6768/smartthings-zigbee-edge-drivers |
| `_tz3000_egvb1p2g|ts004f` | [Koenkk/zigbee2mqtt#32351](https://github.com/Koenkk/zigbee2mqtt/issues/32351); [sprut/Hub#3703](https://github.com/sprut/Hub/issues/3703); [u236/homed-service-zigbee#227](https://github.com/u236/homed-service-zigbee/issues/227) | wonjj6768/smartthings-zigbee-edge-drivers |
| `_tz3000_fdxihpp7|ts000f` | [romasku/tuya-zigbee-switch#517](https://github.com/romasku/tuya-zigbee-switch/issues/517); [zigpy/zha-device-handlers#3427](https://github.com/zigpy/zha-device-handlers/issues/3427); [zigpy/zha-device-handlers#4544](https://github.com/zigpy/zha-device-handlers/issues/4544) | Mariano-Github/Edge-Drivers-Beta, Mariano-Github/Edge-Drivers-Beta |
| `_tz3000_gazjngjl|ts011f` | [sprut/Hub#4960](https://github.com/sprut/Hub/issues/4960); [Koenkk/zigbee2mqtt#30168](https://github.com/Koenkk/zigbee2mqtt/issues/30168); [Koenkk/zigbee2mqtt#28278](https://github.com/Koenkk/zigbee2mqtt/issues/28278) | wonjj6768/smartthings-zigbee-edge-drivers, wonjj6768/smartthings-zigbee-edge-drivers |
| `_tz3000_iy2c3n6p|ts011f` | [Koenkk/zigbee-herdsman-converters#12155](https://github.com/Koenkk/zigbee-herdsman-converters/issues/12155); [Koenkk/zigbee-herdsman-converters#8836](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8836) | wonjj6768/smartthings-zigbee-edge-drivers, wonjj6768/smartthings-zigbee-edge-drivers |
| `_tz3000_j0ktmul1|ts011f` | [Koenkk/zigbee2mqtt#16992](https://github.com/Koenkk/zigbee2mqtt/issues/16992) | wonjj6768/smartthings-zigbee-edge-drivers, wonjj6768/smartthings-zigbee-edge-drivers |
| `_tz3000_nsa76jai|ts0004` | [JohanBendz/com.tuya.zigbee#1035](https://github.com/JohanBendz/com.tuya.zigbee/issues/1035); [JohanBendz/com.tuya.zigbee#1098](https://github.com/JohanBendz/com.tuya.zigbee/issues/1098); [Koenkk/zigbee2mqtt#30842](https://github.com/Koenkk/zigbee2mqtt/issues/30842) | wonjj6768/smartthings-zigbee-edge-drivers, wonjj6768/smartthings-zigbee-edge-drivers |
| `_tz3000_nzkqcvvs|ts011f` | [Koenkk/zigbee2mqtt#27496](https://github.com/Koenkk/zigbee2mqtt/issues/27496); [home-assistant/core#107200](https://github.com/home-assistant/core/issues/107200); [zigpy/zha-device-handlers#2151](https://github.com/zigpy/zha-device-handlers/issues/2151) | wonjj6768/smartthings-zigbee-edge-drivers, wonjj6768/smartthings-zigbee-edge-drivers |
| `_tz3000_rgpqqmbj|ts011f` | [Koenkk/zigbee-herdsman-converters#12155](https://github.com/Koenkk/zigbee-herdsman-converters/issues/12155); [Koenkk/zigbee-herdsman-converters#8836](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8836) | wonjj6768/smartthings-zigbee-edge-drivers, wonjj6768/smartthings-zigbee-edge-drivers |
| `_tz3000_rqbjepe8|ts011f` | — | wonjj6768/smartthings-zigbee-edge-drivers, wonjj6768/smartthings-zigbee-edge-drivers |
| `_tz3000_rtcrrvia|ts011f` | [zigpy/zha-device-handlers#4611](https://github.com/zigpy/zha-device-handlers/issues/4611); [sprut/Hub#4405](https://github.com/sprut/Hub/issues/4405); [Koenkk/zigbee2mqtt#27496](https://github.com/Koenkk/zigbee2mqtt/issues/27496) | wonjj6768/smartthings-zigbee-edge-drivers, wonjj6768/smartthings-zigbee-edge-drivers |
| `_tz3000_xwh1e22x|ts1002` | [JohanBendz/com.tuya.zigbee#1361](https://github.com/JohanBendz/com.tuya.zigbee/issues/1361); [zigpy/zha-device-handlers#1829](https://github.com/zigpy/zha-device-handlers/issues/1829); [Koenkk/zigbee2mqtt#32301](https://github.com/Koenkk/zigbee2mqtt/issues/32301) | wonjj6768/smartthings-zigbee-edge-drivers |
| `_tz3000_ysiog9xi|ts011f` | [zigpy/zha-device-handlers#4406](https://github.com/zigpy/zha-device-handlers/issues/4406); [Koenkk/zigbee2mqtt#27496](https://github.com/Koenkk/zigbee2mqtt/issues/27496); [Koenkk/zigbee-herdsman-converters#10108](https://github.com/Koenkk/zigbee-herdsman-converters/issues/10108) | wonjj6768/smartthings-zigbee-edge-drivers, wonjj6768/smartthings-zigbee-edge-drivers |
| `_tz3210_a2erlvb8|ts0002` | — | wonjj6768/smartthings-zigbee-edge-drivers, wonjj6768/smartthings-zigbee-edge-drivers |
| `_tz3210_bep7ccew|ts011f` | [romasku/tuya-zigbee-switch#476](https://github.com/romasku/tuya-zigbee-switch/issues/476); [Koenkk/zigbee-herdsman-converters#9490](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9490) | — |
| `_tz3210_m3mxv66l|ts0202` | [Koenkk/zigbee-herdsman-converters#6407](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6407) | wonjj6768/smartthings-zigbee-edge-drivers, wonjj6768/smartthings-zigbee-edge-drivers |
| `_tz3210_nhqka112|ts011f` | [Koenkk/zigbee2mqtt#30889](https://github.com/Koenkk/zigbee2mqtt/issues/30889) | wonjj6768/smartthings-zigbee-edge-drivers, wonjj6768/smartthings-zigbee-edge-drivers |
| `_tz3210_yvxjawlt|ts011f` | [zigpy/zha-device-handlers#2983](https://github.com/zigpy/zha-device-handlers/issues/2983); [Koenkk/zigbee2mqtt#13221](https://github.com/Koenkk/zigbee2mqtt/issues/13221); [Koenkk/zigbee2mqtt#11648](https://github.com/Koenkk/zigbee2mqtt/issues/11648) | wonjj6768/smartthings-zigbee-edge-drivers, wonjj6768/smartthings-zigbee-edge-drivers |
| `_tz3218_ewrxirng|ts0225` | [Koenkk/zigbee2mqtt#29676](https://github.com/Koenkk/zigbee2mqtt/issues/29676) | wonjj6768/smartthings-zigbee-edge-drivers, wonjj6768/smartthings-zigbee-edge-drivers |
| `_tz3290_ixd9mvv4|ts0049` | — | wonjj6768/smartthings-zigbee-edge-drivers, wonjj6768/smartthings-zigbee-edge-drivers |
| `_tz3290_s6ezpa3j|ts1201` | — | wonjj6768/smartthings-zigbee-edge-drivers, wonjj6768/smartthings-zigbee-edge-drivers |
| `_tze200_aj0oxo1i|ts0225` | — | wonjj6768/smartthings-zigbee-edge-drivers, wonjj6768/smartthings-zigbee-edge-drivers |
| `_tze200_p6fuhvez|ts0225` | [sprut/Hub#4328](https://github.com/sprut/Hub/issues/4328) | wonjj6768/smartthings-zigbee-edge-drivers, wonjj6768/smartthings-zigbee-edge-drivers |
| `_tze200_qcasmfan|ts0601` | — | wonjj6768/smartthings-zigbee-edge-drivers, wonjj6768/smartthings-zigbee-edge-drivers |
| `_tze284_cjbofhxw|ts0601` | [Koenkk/zigbee2mqtt#31690](https://github.com/Koenkk/zigbee2mqtt/issues/31690); [Koenkk/zigbee2mqtt#31465](https://github.com/Koenkk/zigbee2mqtt/issues/31465); [Koenkk/zigbee2mqtt#22784](https://github.com/Koenkk/zigbee2mqtt/issues/22784) | wonjj6768/smartthings-zigbee-edge-drivers, wonjj6768/smartthings-zigbee-edge-drivers |
| `_tze600_ogyg1y6b|ts0105` | — | wonjj6768/smartthings-zigbee-edge-drivers, wonjj6768/smartthings-zigbee-edge-drivers |

### Request for interview (kept as leads — do not place without it)
| Couple | Why | What we need |
|---|---|---|
| `_TZE200_aj0oxo1i` + TS0225 | Z2M model block ambiguous (gas vs presence); SmartThings lists it in the safety (gas/smoke) family | Zigbee interview (clusters/endpoints) + 1 DP log |
| `_TZE200_p6fuhvez` + TS0225 | same; sprut/Hub#4328 confirms the couple exists, not its class | interview + DP log |
| `_TZE600_ogyg1y6b` + TS0105 | no driver has TS0105; adding it would pair every mfr of a curtain driver with TS0105 | interview to decide a variant/new profile |
| `_TZ3000_xwh1e22x` + TS1002 | MiBoxer FUT089Z remote (Johan#1361, ZHA#1829); only TS1002 driver is a bulb | interview + button event capture |
| `_TZ3000_j0ktmul1` + TS011F | 5-zone valve controller (Z2M AUT000069); no profile | interview |
| `_TZ3000_gazjngjl` + TS011F | Z2M#30168 says 1-gang socket + USB; endpoint layout unknown | interview (endpoints) |
| `_TZ3000_z6fgd73r` + TS011F | touch switch with metering on TS011F | interview |
