# Device peculiarities — cross-source investigation

Generated 2026-09-08T07:29:59.472Z from registry (201 cases) × compound DB (454 keys) × local Z2M fps.

## Live locks (2026-09-12)

- **P2482** Crash harden: never preempt **own** driver IDs that collide with Homey classes (`pirsensor`/`siren`/`doorbell`). Expand class preempt list. GH#547 `_TZE204_gkfbdvyx`+`TS0601` → `presence_sensor_radar` (ZY_M100 mains). Tip **≥9.0.903**. BOTH.
- **P2481** Homey Pro 2026 crash: serializer `getDriver('motionsensor')` — preempt `isForeignDriverId` before Homey (`lib/utils/safe-get-driver-patch.js`). Gmail 9.0.891/895 + Peter #2235 OCR tip **9.0.895** / diag `375def7f`. Tip **≥9.0.902** (Test #3171). BOTH.
- **P2473** Joep Insoma / FrankEver / Moes class: interview `[0,4,5,61184]` — compose must never require OnOff **6** (Unknown). TX/RX: `lib/zigbee/Ef00OnlyInterview.js` max EF00+raw+PFC cascade. Tip **≥9.0.890**.
- **P2472a** VicHY clrdrnya 220V: compose `measure_battery`/`energy.batteries` on hybrid `presence_sensor_radar` re-poisoned Homey Energy after tip update. Removed from compose/`app.json`; mains `setEnergy({batteries:null,mains:true})` + 30min re-heal; battery HOBEIAN opt-in at runtime. Tip **≥9.0.889**.
- **P2470** Peter #2233–#2234 / diag `8afffc76` @ 9.0.881–882: `_TZ3000_mrpevh8p`+`TS0041` → `button_wireless_1`. Battery UI `?` = store 100% then THROTTLE `duplicate_value` + ZCL configure/read storm. Tip **≥9.0.888** (prefer **≥9.0.902**); press once. OCR: Insights empty until paint; no separate “activity history” for `class: button`.
- **P2469** Unit-test anti-régression always-on — every behavior fix ships `test/critical/pNNNN-*.test.js` + `npm run check:pNNNN` / `check:p246x`.
- **P2468** Joep #2218 Insoma `_TZE284_fhvpaltk`+`TS0601`: interview clusters `[0,4,5,61184]` — compose must not require OnOff(6) or Homey pairs Unknown. FrankEver FK_V02 vs FK-BV05 DP split + sacred-keep (NEED_INTERVIEW); VicHY #2232 10min mains radar re-heal (deleted #2231 image — NEED_INTERVIEW soft).
- **P2466** `_TZ3000_vdfwjopk`+`TS0219` → `siren` (Cleverio SA100 / Johan#1455). IAS Zone+WD only; flow `siren_turn_on/off` → `startWarning`. Forbid `handheld_remote_4_buttons`.
- **P2464** Moes ZTS `_TZE204_5slehgeo`+`TS0601`: open/close TX always pairs DP1 + extreme DP2.
- **P2467** Moes ZTS (#533 diag d05e6530): `TuyaEF00Manager.initialize(zclNode)` was never called from cover (start/init missing) → no BoundCluster RX + weak TX; real `mcuSyncTime` + DP2-then-DP1 + calib-end.
- **P2467b** Moes ZTS: force `mainsPowered` (compose phantom `measure_battery`) + skip wake-up ping before EF00 TX.
- **P2465** Moes Star Feather `zo0cfekv`+`TS0601` → `wall_switch_3gang_1way` DP24/25/26 (not climate).
- **P2462** BSEED `blhvsaqf`+`TS0001` → `wall_switch_1gang_1way` (not metering `switch_1gang`).
- **Fleet L99 T140352** (silent OCR 2026-09-12): highest **#2235** — matrix in `reports/forum-l99-2026-09-12/FLEET_L99.md`. Ignore invent gap `_TZE200_ABC123` + Stefan junk `_TZE2841000000_3MZB0SDZ`.

## Class notes (always)

- Sleepy IAS (SOS / water / contact): enroll on wake, skip boot CIE poll, no leftover EF00 TX.
- Pid TS0207 is shared: k4ej3ww2 = IAS water (Z2M IH-K665); 5k5vh43t family = mains repeater. Default driver is null.
- Pid TS011F is shared: metering plug (okaz9tjs poll fw 1.0.5), double outlet, DIN, USB wall, strip.
- MCU dimmer brightness is 0–1000 (TuyaBrightnessScale). Never write >1000 (Z2M #32305).
- nt4pquef soil: DP2 = light enum, DP3 = moisture, DP5 = temp/10, DP15 = battery. Do not compose 0xED00. Retail SGS02Z is not a pid.
- Local scripts/data/z2m-data.json is a stale FP dump — missing dump ≠ missing device. Prefer issue URLs.

| | Count |
|---|---|
| Cases with compound DB hit | 171 |
| Cases with Z2M pid overlap | 92 |
| Cases still gapped | 90 |

## Gaps

- `no_sources`: 66
- `no_compound_db_key`: 30
- `not_in_local_z2m_fps`: 34
- `compose_pid_mismatch`: 5

## Cases (1 by 1)

### `eduard-martirosyan-tze284-fodv6bkr-curtain` → `curtain_motor`

- Couple: `_TZE284_fodv6bkr` + TS0601
- Protocol: tuya_dp
- Z2M local pids for mfr: TS0601 ✓ overlap
- Compound `_TZE284_fodv6bkr|TS0601`: tuya_dp DP {"1":"windowcoverings_state","2":"windowcoverings_set/100","3":"windowcoverings_set/100","5":"reverse_direction","13":"measure_battery"} Forum Eduard_Martirosyan #2228 DC tubular roller blind motor
- Compound `_tze284_fodv6bkr|TS0601`: tuya_dp DP {"1":"windowcoverings_state","2":"windowcoverings_set/100","3":"windowcoverings_set/100","5":"reverse_direction","13":"measure_battery"} Forum Eduard_Martirosyan #2228 DC tubular roller blind motor
- Compound `_TZE284_FODV6BKR|TS0601`: tuya_dp DP {"1":"windowcoverings_state","2":"windowcoverings_set/100","3":"windowcoverings_set/100","5":"reverse_direction","13":"measure_battery"} Forum Eduard_Martirosyan #2228 DC tubular roller blind motor
- Compound `_TZE284_libht6ua|TS0601`: tuya_dp DP {"1":"windowcoverings_state","2":"windowcoverings_set/100","3":"windowcoverings_set/100","5":"reverse_direction","13":"measure_battery"} Roller blind motor sibling to fodv6bkr
- Compound `_tze284_libht6ua|TS0601`: tuya_dp DP {"1":"windowcoverings_state","2":"windowcoverings_set/100","3":"windowcoverings_set/100","5":"reverse_direction","13":"measure_battery"} Roller blind motor sibling to fodv6bkr
- Compound `_TZE284_LIBHT6UA|TS0601`: tuya_dp DP {"1":"windowcoverings_state","2":"windowcoverings_set/100","3":"windowcoverings_set/100","5":"reverse_direction","13":"measure_battery"} Roller blind motor sibling to fodv6bkr
- Compose: class=windowcoverings eps=1 EF00=true IAS=false batteries=OTHER
- Notes: Eduard_Martirosyan #2228 DC tubular roller blind motor; EF00 Tuya cover DPs
- **Gaps:** no_sources

### `vichy-clrdrnya-presence` → `presence_sensor_radar`

- Couple: `_TZE204_clrdrnya` + TS0601
- Protocol: tuya_ef00
- Z2M local pids for mfr: TS0601 ✓ overlap
- Compound `_TZE204_clrdrnya|TS0601`: tuya_dp  MTG235-ZB-RL mmWave+relay (sbyx0lm6 family). Never climate/motion_pir. Z2M#18677 GH#420
- Compound `_tze204_clrdrnya|TS0601`: tuya_dp  VicHY #2224/#2227 MTG075 mmWave radar 220V
- Compound `_TZE204_CLRDRNYA|TS0601`: tuya_dp  VicHY #2224/#2227 MTG075 mmWave radar 220V
- Compound `_TZE200_clrdrnya|TS0601`: tuya_dp  TZE200 sibling; Z2M discussion#25712 lost-support reminder — keep compound lock
- Compound `_tze200_clrdrnya|TS0601`: tuya_dp  VicHY #2224/#2227 MTG075 mmWave radar 220V
- Compound `_TZE200_CLRDRNYA|TS0601`: tuya_dp  VicHY #2224/#2227 MTG075 mmWave radar 220V
- Compound `_TZE284_clrdrnya|TS0601`: tuya_dp  TZE284 sibling of clrdrnya radar; same TS0601 couple only
- Compound `_tze284_clrdrnya|TS0601`: tuya_dp  VicHY #2224/#2227 MTG075 mmWave radar 220V
- Compound `_TZE284_CLRDRNYA|TS0601`: tuya_dp  VicHY #2224/#2227 MTG075 mmWave radar 220V
- Compose: class=sensor eps=1 EF00=true IAS=false batteries=CR2032/CR2450/AAA/AA/CR123A/INTERNAL
- Notes: VicHY #2224/#2227 MTG075 220V AC ceiling mmWave presence radar. Forbid curtain_motor phantom flip.
- **Gaps:** no_sources

### `hobeian-aubess-k4ej3ww2-ias` → `water_leak_sensor`

- Couple: `_TZ3000_k4ej3ww2` + TS0207
- Protocol: ias_zone
- Retail: HOBEIAN ZG-222ZA, HOBEIAN ZG-222Z, Aubess IH-K665, IH-1218
- Z2M local pids for mfr: (none in dump) 
- Compound `_TZ3000_k4ej3ww2|TS0207`: ias_zone  HOBEIAN/Aubess IH-K665: IAS Zone 1280 sleepy; reports on wet/dry only; never EF00 water, rain, or repeater. Z2M#17685/#19308
- Compose: class=sensor eps=1 EF00=false IAS=true batteries=CR2032/CR2450/AAA
- Notes: Never EF00/Tuya-DP water driver. modelId is always TS0207; ZG-222ZA/IH-K665/IH-1218 are retail labels. Sleepy IAS 1280 reports on wet/dry only (Z2M#17685/#19308). Same pid TS0207 is a mains repeater for 5k5vh43t — lock the couple. Removed from water_leak_sensor_tuya (P144) and gas_sensor productId abuse (P143).
- Sources: z2m#17685, z2m#28181, z2m#19308, forum-140352, P143, P144, P146

### `p2240-mwd3c2at-irrigation-valve-ts0202` → `smart_irrigation_valve`

- Couple: `_TZ3000_mwd3c2at` + TS0202
- Protocol: tuya_ef00
- Z2M local pids for mfr: (none in dump) 
- Compose: class=socket eps=1 EF00=true IAS=false batteries=mains?
- Notes: Z2M irrigation/water valve — TS0202 must not cartesian to motion PIR default (P2231 CI-safe without z2m.json index).
- Sources: z2m, P2231, P2240
- **Gaps:** no_compound_db_key

### `presentsky-bseed-dimmer-m1cvyneb` → `wall_dimmer_tuya`

- Couple: `_TZE284_m1cvyneb` + TS0601
- Protocol: tuya_ef00
- Z2M local pids for mfr: TS0601 ✓ overlap
- Compound `_TZE284_m1cvyneb|TS0601`: tuya_dp DP {"1":"onoff","2":"dim/1000"} Not climate/soil/universal; MCU brightness 0-1000
- Compound `_TZE204_m1cvyneb|TS0601`: tuya_dp DP {"1":"onoff","2":"dim/1000"}
- Compound `_TZE200_m1cvyneb|TS0601`: tuya_dp DP {"1":"onoff","2":"dim/1000"}
- Compose: class=light eps=1 EF00=true IAS=false batteries=mains?
- Notes: P2322 PresentSky #2206: pair as wall_dimmer OK but controls were dead — force magic handshake + IEEE heal from node + flow cards must TX via _txCapability (not setCapabilityValue alone). MCU brightness 0-1000. Couple TS0601 only; never invent TS0201. Remove+re-pair after update.
- Sources: forum-140352-2206, forum-140352, diag-60959c24, diag-f20dc4f0, P139, P149, P2314, P2322, z2m#32305, z2m-TS0601_dimmer_1_gang_1

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
- Compound `_tze204_clrdrnya|TS0601`: tuya_dp  VicHY #2224/#2227 MTG075 mmWave radar 220V
- Compound `_TZE284_clrdrnya|TS0601`: tuya_dp  TZE284 sibling of clrdrnya radar; same TS0601 couple only
- Compound `_TZE200_clrdrnya|TS0601`: tuya_dp  TZE200 sibling; Z2M discussion#25712 lost-support reminder — keep compound lock
- Compound `_tze200_clrdrnya|TS0601`: tuya_dp  VicHY #2224/#2227 MTG075 mmWave radar 220V
- **P2340 (diag 4217d5e3 / VicHY):** publish compact dropped `_TZE204_clrdrnya` from app.json — sacred-keep + force-inject restores mfr; user on **9.0.719** must update Test ≥9.0.739 + re-pair `presence_sensor_radar`.
- **Search UX:** Users typing “PIR mmWave” often pick `pir_mmwave_sensor` (`_TZ3000_3towulqd` only). MTG235/clrdrnya must use **Presence Sensor (Radar / mmWave)** tile.
- **P2379 (VicHY):** DynCap invented `windowcoverings_set` from DP2/3/102 (sensitivity/range/departure_delay) → Homey UI showed **curtain + opening slider**; DP102→`alarm_motion` stuck presence true. Fix: disable DynCap invent on presence radars + heal phantom caps.
- **P2386 (VicHY #2222):** Recurring after app updates — store DynCap restore re-applied blind UI. Fix: clear store when DynCap disabled; delayed re-heal 15s/60s/180s; restore `sensor` class if drifted to windowcoverings; heal on settings. Diag `4217d5e3`. User: update Test ≥ tip + restart app (re-pair only if still curtain).
- **P2389 (VicHY flood alert ~196 msg/min):** Tuya mmWave firmware spam (Z2M#14742) — cannot stop airtime. Fix: `radar` RX budget 250/min; no Homey timeline alert for presence radars; MTG075/clrdrnya `floodCalm` coalesces DP9 distance (2.5s/0.15m) + DP104 lux (5s/2lx); presence DP1 stays immediate.
- **P2391 (VicHY #2224 diag `0e28d470` @ 9.0.781):** Interview locks `_TZE204_clrdrnya`+TS0601. Timeline low-battery on mains MTG = compose `energy.batteries` + possible DEFAULT/HOBEIAN config cache before mfr resolves. Fix: upgrade radar config when mfr arrives; heal strips `measure_battery`/`alarm_battery`; `setEnergy({})` clears Homey Energy batteries; block `tuya_dp_value` DIY cap recursion.
- **P2401 (VicHY #2226 ack / update race):** Homey flood + low-battery timeline after update can fire while `driver.id` still empty. `isRadarFloodContext` + `_isRadarFloodCalmDevice` match clrdrnya mfr / `measure_luminance.distance` / `floodCalm` so tip ≥9.0.802 stays quiet without waiting for driver id.
- **P2420 (VicHY #2227 diag `c5165a37` @ 9.0.797):** After tip update, curtain UI again (delete+re-pair works); flood gone; **battery warning still**. Root: (1) `setEnergy({})` only ran when `getEnergy().batteries` non-empty — Homey kept Energy icon from compose; (2) DP2 `cap:null`+`setting` fell through generic DP2→humidity SmartDivisor. Fix: always clear Energy on mains; re-heal at 2s/5s; EF00 treats `setting`/`cap:null` as owned. User: update Test ≥ tip + **restart app** (re-pair only if still curtain).
- **P2459 (VicHY #2227 recurrence + Eduard #2228):** VicHY still saw curtain flip + low-battery after tip bumps (compose re-adds `measure_battery`/`energy.batteries`; late mfr upgrade skipped heal). Fix: refuse phantom `addCapability`; re-heal on DEFAULT→MTG config upgrade; force-mains Energy clear for `clrdrnya`. Eduard `_TZE284_fodv6bkr`+`TS0601` was **Unknown** on **9.0.809** — FP landed **≥9.0.830/837** on `curtain_motor` (sibling `libht6ua`). User: update Test ≥ tip; VicHY restart app (re-pair only if still curtain); Eduard remove+re-pair as **Curtain Motor**.
- **P2460 (GH#546+#545 + forum media):** `_TZ3000_l9brjwau`+`TS0002` RX OK but Homey TX never moved relays — `switch_2gang` ZCL-only used `writeAttributes({onOff})` instead of `setOn`/`setOff`. Fix TX path + markAppCommand; keep canonical driver `wall_switch_2gang_1way`. `_TZ3000_ysdv91bk`+`TS0001` interview `[0,3,4,5,6,57344,57345]` → move FP to `wall_switch_1gang_1way` (leave metering `switch_1gang`). Sacred-keep updated. Users: update Test + **remove+re-pair**.
- **P2462 (GH#540 residual mention):** `_TZ3000_blhvsaqf`+`TS0001` was still locked on metering `switch_1gang` → virtualdriverzigbee. Same wall footprint as ysdv91bk → `wall_switch_1gang_1way`. Users: update Test + **remove+re-pair**.
- **P2463 (GH#542 + Johan#468 + #533):** (1) `ensureGangUiCapabilities` invented `button.N` on every multi-gang → wall_switch Botón spam; skip unless compose already has buttons / scene / `forceGangButtonUi`. (2) `_TZE200_bcusnqt8`+TS0601 SPM01 energy → `power_clamp_meter` (was curtain). (3) Moes ZTS idle-stop guard **40s**. Users: update Test + re-pair wall/SPM01.
- **P2465 (Johan#1457/#1458):** Moes Star Feather `_TZE200_zo0cfekv`/`tzyy0rtq`/`rd8cdssd`+TS0601 → `wall_switch_3gang_1way` DP24/25/26 (was climate). FrankEver `wt9agwf3`/`5uodvhgc` → `water_valve_smart`.
- **P2464 (diag 48baba36/d05e6530 + Frankever):** Moes ZTS state open/close now always pairs extreme **DP2** with DP1 (Z2M moes_cover). FrankEver `_TZE200_1n2zev06`+TS0601 moved thermostat→`water_valve_smart`. Frankever live diag still NEED_INTERVIEW for exact mfr.
- **P2421 (HOBEIAN Z2M internet enrich):** Canonical herdsman DPs for ZG-204ZM (DP2 static sens, DP4 static dist/100 — drop invented large/small/micro map). New configs ZG-204ZH (`vuqzj1ej`/`hdih4foa`), ZG-302ZM/ZL sensing-switch (moved off vibration + climate cartesian). Strip ZG-204*/302* from `power_clamp_meter` / `motion_sensor`. Re-pair if previously matched climate/vibration/clamp.
- **P2423 (mfs_db):** Lock TZE couples to verified drivers/pids; expand `HOBEIAN.byPid` (ZX/302/102ZM/103Z/226Z/228Z). `sync-compose-to-mfs-db` skips `multiCouple` prune. Forbid curtain←`zbfmvj13`, switch_1gang←ZG-103Z mfrs.
- **P2433 (Eduard #2228 + HOBEIAN gaps):** `_TZE284_fodv6bkr`+`TS0601` battery tubular — DP3=position (not dim); strip phantom lux/button/tilt. Compose locks HOBEIAN|ZG-229Z→siren, ZG-204ZP→presence, ZG-301Z/302Z*→switches, ZG-101ZD→button; strip cartesian pid theft.
- **P2434:** HOBEIAN recognized as **manufacturerName + productId** (`HOBEIAN`/`hobeian`/`Hobeian`) and mfs `productNames`/`deviceNames`. Brand-as-modelId normalized. Real type still via byPid ZG-* — never invent pid.
- **P2435:** GH #540–#544 pairing — Homey match needs driver clusters ⊆ device. Drop required EF00 `61184` on `switch_4gang`; remove Basic/Identify from `wall_switch_2gang_1way` ep2; expand ZCL Groups/Scenes on `switch_1gang`/`switch_2gang`; `_TZ3000_ptjcjise`+`TS0002` → `switch_2gang` only; `_TZ3000_xk5udnd6`+`TS0012` → `wall_switch_2gang_1way` (strip water_leak + fix mfs top-level).
- **P2452 (GH #541–#545 + #533 reopen):** Compose pairing already OK on tip (P2435). Residual: stale `fingerprints.json`/`mfs sacredCouples` still routed `l9brjwau`/`ptjcjise`→`switch_1gang`, `5SLEHGEO`→`climate_sensor`+invented `TS0201`, wrong FPDB `ysdv91bk|TS0002`. Fix SSOT + strip `switch_4gang` phantom `button.*` tiles (#541). Users: update Test + **remove + re-pair**.
- **P2455 (GH #544 migueleap):** `_TZ3000_l9brjwau`+`TS0002` is a **wired** BSEED dual-relay (ZCL EP1/EP2), not a wireless/battery 2-gang. Was on `switch_2gang` → 5× `button.*` tiles + broken gang TX. Lock → `wall_switch_2gang_1way` with `onoff`/`onoff.gang2` only; strip `devices.secondSwitch` + button/battery compose clutter. Users: update Test + **remove + re-pair**.
- **P2456 (GH #543 migueleap):** `_TZ3000_ptjcjise`+`TS0002` interview = Moes **2-gang** mains module (EP1/EP2 cluster 6). Same `switch_2gang` button/meter clutter as #544. Remap → `wall_switch_2gang_1way`. Later comment claiming TS0001/1-gang is ignored (no invent). Users: update Test + **remove + re-pair**.
- **P2457 (GH #541 migueleap):** `switch_4gang` compose already had relay-only caps (P2452), but **`app.json` still shipped 9× `button.*` tiles** → Homey UI spam after pairing. Sync app.json from compose + runtime strip leftover button/battery caps; skip virtual-button init. Couple `_TZ3000_enmfaave`+`TS0004` stays on `switch_4gang`. Users: update Test + **remove + re-pair** (or restart app to strip leftovers).
- **P2458 (Athom tip #3140 / #3142):** Homey email `processing_failed` + `socket hang up` on Universal Tuya Test. **P139** — not a driver/compose regression. Publish-size + compacted cartesian OK. Soft-expect / republish-check refuse bump-loop; wait cooldown; one-shot `force_publish` only if human asks. Docs: `docs/architecture/PUBLISH_SSOT.md` §P139.
- **P2436:** `#533` Moes ZTS — soft re-arm `_setupTuyaDPMode` + `_setupTuyaDPListener` + passive EF00/DataQuery after init. CI: Bug Auto-PR + bot triage no longer fire on every issue open/reopen (dispatch / dry-run).
- **P2392 (fleet firmware compensate):** Root cause of `tuya_dp_value` P2308 spam — `TuyaUniversalBridge` added DIY caps on **every** device. Fix: DIY caps only on universal/DIY drivers; `_updateCapability` gated on `hasCapability`; `FirmwareQuirkCompensator` strips DIY + mains battery fleet-wide via HomeyGapCompensator; `safeSetCapabilityValue` refuses ghost caps.

### `hobeian-zg204zh` / `hobeian-zg302z*` (P2421)

- Couples (Z2M only — never invent pid):
  - `_TZE200_vuqzj1ej` / `_TZE200_hdih4foa` + `TS0601` / `ZG-204ZH` → `presence_sensor_radar` (temp+humid+lux+presence)
  - `_TZE200_2aaelwxk` / `kb5noeto` / `tyffvoij` / `yflzeeqj` + `TS0601` / `ZG-204ZM` → `presence_sensor_radar`
  - `_TZE200_kccdzaeo` (+ s7rsrtbg/tmszbtzq/bfmfhxra/ahpcyzth/kijxnb8q) + `TS0601` / `ZG-302ZM` → sensing switch (presence + onoff)
  - `_TZE200_khzbklyh` (+ df04ghrb/toeldckg/cqtamhh5/xlnzk169/llvwkkde) + `TS0601` / `ZG-302ZL` → sensing switch (DP101 presence)
- Forbid: `climate_sensor`, `vibration_sensor`, `power_clamp_meter`, `motion_sensor`
- Clusters: EF00 (0xEF00) + optional ZCL illuminance on ZG-204ZM
- **P2422 (full fleet):** ZE/ZK/ZQ/ZX radar configs; ZG-102ZM contact+vibration DPs; ZG-103Z tilt; ZG-226Z water alarm; ZG-228Z vibration alarm; strip ZG cartesian from illuminance/plug/curtain catch-alls.

### `valve-dual-fhvpaltk` → `valve_dual_irrigation`

- Couple: `_TZE284_fhvpaltk` + `TS0601` (sibling `_TZE284_eaet5qt5`)
- Insoma 2-way irrigation — `onoff.valve_1` / `onoff.valve_2`
- Interview clusters: **`[0, 4, 5, 61184]`** (no OnOff 6) — Joep #2082/#2024
- **Joep #2218:** “repair” on unknown does not rematch; compose requiring cluster **6** refused Homey match → Unknown. **P2468** clusters `[0,4,5,61184]`. User: remove + re-pair under **Smart 2-Way Irrigation Valve**
- Not GIEX `_TZE284_8zizsafo` (that is `valve_irrigation` 4-zone)

### `button-wireless-1-mrpevh8p` → `button_wireless_1` (P2378 / P2461)

- Couple: `_TZ3000_mrpevh8p` + `TS0041` (SH-SC07 / RSH-SC021, Z2M whitelabel + Johan #1120)
- Clusters (Johan interview): EP1 `0,1,6,E000` — **no EF00**; phantom EP2–4 → `mapAllEndpointsToButton1`
- Battery: CR2450; Z2M: not `/get`; **never** configure `batteryPercentageRemaining` reporting ([Z2M #8072](https://github.com/Koenkk/zigbee2mqtt/issues/8072) — hourly drop / LED flash / 2 presses)
- **P2378 (Peter diag `cfbf687f` @ 9.0.779):** 0xFD RX + `button_matrix` OK, but Homey Flows on `*_button_1gang_*` never fired
- **P2440 / P2461 (Peter #2230 diag `048cff91` @ 9.0.836):** disco + battery `?` — 3.4s 0xFD retransmit; FLOW-GUARD invent IDs; EF00 dataQuery fail; THROTTLE blocked store 100%; wake reconfigure powerConfiguration failed. Fix: 4s cross-path, compose-only cards, store-first+skipThrottle, skip EF00 + skip batt reporting reconfigure, soft-fill TS0041, family=`ts0041`, CR2450 lock
- **P2470 (Peter diag `8afffc76` @ 9.0.882):** tip still ZCL-QUERY configure+read Timeout; registerCapability still shipped configureAttributeReporting; log showed 100% then `[THROTTLE] duplicate_value` left UI `?`; energy CR2032. Fix: sleepy-button passive DataQuery, skip batt cfg, null-UI skipThrottle, CR2450 first + runtime setEnergy
- Report: `reports/forum-verify-2230/PETER_DIAG_INTERNET.md`
- User action: Update Test tip ≥9.0.888 (P2470); press once — Insights fills after battery paints (no separate Homey “activity” tab for `class: button`)

### `presence-radar-cam-zg204zl` / Cam HOBEIAN

- **P2340 (forum Cam / HOBEIAN ZG-204ZL):** compact dropped `HOBEIAN` mfr while pid `ZG-204ZL` remained — sacred-keep pins couple; motion flows need update + re-pair on `presence_sensor_radar`.
- Compose: class=sensor eps=1 EF00=true IAS=false batteries=CR2032/CR2450/AAA/AA/CR123A/INTERNAL
- Notes: MTG235-ZB-RL mmWave + relay — presence_sensor_radar only (GH#420, Z2M#18677 sbyx0lm6 family). Mains. Never climate or PIR motion.
- Sources: forum-140352, github#420, P139, P204, z2m#18677

### `valve-dual-fhvpaltk` → `valve_dual_irrigation`

- Couple: `_TZE284_fhvpaltk` + TS0601
- Protocol: tuya_ef00
- Z2M local pids for mfr: TS0601 ✓ overlap
- Compound `_TZE284_fhvpaltk|TS0601`: tuya_dp DP {"1":"onoff.valve_1","2":"onoff.valve_2","15":"measure_battery","59":"measure_battery","101":"measure_battery"} Homey forum #2082 Insoma 2-way valve; not curtain_motor or 4-way dim valve
- Compound `_TZE284_eaet5qt5|TS0601`: tuya_dp DP {"1":"onoff.valve_1","2":"onoff.valve_2","15":"measure_battery","59":"measure_battery","101":"measure_battery"} Insoma 2-way valve variant; not curtain_motor or 4-way dim valve
- Compose: class=other eps=1 EF00=true IAS=false batteries=AA
- Notes: Insoma / Tuya 2-way irrigation — onoff.valve_1 + onoff.valve_2. Joep #2082/#2102/#2218. GIEX 8zizsafo is valve_irrigation (4-zone), not this couple.
- Sources: forum-140352, z2m, P2377

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
- Compound `_TZE284_mvtclclq|TS0601`: tuya_dp DP {"1":"onoff.usb1","2":"onoff.usb2","3":"onoff","4":"onoff.socket2"} Z2M DS-1450WN — forbid wall_dimmer. z2m#31275
- Compound `_TZE204_mvtclclq|TS0601`: tuya_dp DP {"1":"onoff.usb1","2":"onoff.usb2","3":"onoff","4":"onoff.socket2"}
- Compose: class=socket eps=1 EF00=true IAS=false batteries=mains?
- Notes: Z2M DS-1450WN USB/plug switch with power — not TRV or wireless button.
- Sources: z2m#31275, P167

### `rgb-bulb-jaap6jeb` → `bulb_rgbw`

- Couple: `_TZ3210_jaap6jeb` + TS0505B
- Protocol: zcl
- Z2M local pids for mfr: (none in dump) 
- Compound `_TZ3210_jaap6jeb|TS0505B`: zcl  LEDEPLY SG45-E26 RGB+CCT; not door/motion
- Compose: class=light eps=1 EF00=false IAS=false batteries=mains?
- Notes: LEDEPLY SG45-E26 RGB+CCT — not door/motion sensor.
- Sources: z2m-herdsman, P167

### `plug-vzopcetz-1obwwnmq` → `socket_power_strip`

- Couple: `_TZ3000_vzopcetz` + TS011F
- Protocol: zcl
- Z2M local pids for mfr: (none in dump) 
- Compound `_TZ3000_vzopcetz|TS011F`: zcl  Johan/Silvercrest metering plug/strip; not button or E14
- Compound `_TZ3000_1obwwnmq|TS011F`: zcl
- Compose: class=socket eps=3 EF00=false IAS=false batteries=mains?
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

- Couple: `HOBEIAN` + ZG-303Z
- Protocol: tuya_ef00
- Z2M local pids for mfr: CK-BL702-MWS-01(7016) 
- Compound `HOBEIAN|ZG-303Z`: tuya_dp  Retail ZG-303Z only — do NOT lock HOBEIAN|TS0601 (other HOBEIAN TS0601 exist)
- Compose: class=sensor eps=1 EF00=true IAS=false batteries=AAA/CR2032/CR2450
- Notes: HOBEIAN|ZG-303Z soil only. Brand HOBEIAN also owns climate ZG-227Z/ZL, presence ZG-204*, contact ZG-102*, water ZG-222*, switch ZG-305Z — never ban brand from climate mfr-only. nt4pquef / wqashyqo are separate couples.
- Sources: z2m-ZG-303Z, forum-blutch32, P178, P2250

### `wqashyqo-ts0601-soil` → `soil_sensor`

- Couple: `_TZE200_wqashyqo` + TS0601, ZG-303Z
- Protocol: tuya_ef00
- Z2M local pids for mfr: TS0601 ✓ overlap
- Compound `_TZE200_wqashyqo|TS0601`: tuya_dp  HOBEIAN ZG-303Z MCU soil; DP107 moisture family. nt4pquef is a different couple
- Compose: class=sensor eps=1 EF00=true IAS=false batteries=AAA/CR2032/CR2450
- Notes: HOBEIAN ZG-303Z MCU alias _TZE200_wqashyqo|TS0601 — mfr-forbid on climate catch-alls. Do not invent HOBEIAN|TS0601 brand lock.
- Sources: z2m-ZG-303Z, P178, P2250

### `hobeian-zg227z-climate` → `climate_sensor`

- Couple: `HOBEIAN` + ZG-227Z, ZG-227ZL
- Protocol: zcl
- Z2M local pids for mfr: CK-BL702-MWS-01(7016) 
- Compound `HOBEIAN|ZG-227Z`: zcl  Interview INT-031 temp/humidity
- Compound `HOBEIAN|ZG-227ZL`: zcl  P2251 LCD climate sibling of ZG-227Z
- Compose: class=sensor eps=1 EF00=true IAS=false batteries=AAA/CR2032/CR2450
- Notes: HOBEIAN ZG-227Z/ZL temp+humidity (Z2M). Pure ZCL msTemperatureMeasurement+msRelativeHumidity. Case-insensitive brand forms required. Not soil/presence/contact.
- Sources: z2m-ZG-227Z, z2m-ZG-227ZL, P2250

### `hobeian-zg204-presence` → `presence_sensor_radar`

- Couple: `HOBEIAN` + ZG-204Z, ZG-204ZE, ZG-204ZH, ZG-204ZK, ZG-204ZL, ZG-204ZM, ZG-204ZQ, ZG-204ZV, ZG-205Z, ZG-205ZL, ZG-302ZM, ZG-302ZL, ZG-204ZX, ZG-204ZP
- Protocol: tuya_ef00
- Z2M local pids for mfr: CK-BL702-MWS-01(7016) 
- Compound `HOBEIAN|ZG-204Z`: tuya_dp  P2430 HOBEIAN radar 204Z
- Compound `HOBEIAN|ZG-204ZE`: tuya_dp  P2422 ZE
- Compound `HOBEIAN|ZG-204ZH`: tuya_dp  P2421 ZG-204ZH climate+presence
- Compound `HOBEIAN|ZG-204ZK`: tuya_dp  P2422 ZK
- Compound `HOBEIAN|ZG-204ZL`: tuya_dp  P2251 PIR/radar family
- Compound `HOBEIAN|ZG-204ZM`: tuya_dp  Interview / market apply-safe mmWave
- Compound `HOBEIAN|ZG-204ZQ`: tuya_dp  P2422 ZQ climate+PIR
- Compound `HOBEIAN|ZG-204ZV`: tuya_dp  Interview / market apply-safe mmWave
- Compound `HOBEIAN|ZG-205Z`: tuya_dp  P2430 HOBEIAN radar 205Z
- Compound `HOBEIAN|ZG-205ZL`: tuya_dp  P2430 HOBEIAN radar 205ZL
- Compound `HOBEIAN|ZG-302ZM`: tuya_dp  P2421 motion sensing switch 3ch
- Compound `HOBEIAN|ZG-302ZL`: tuya_dp  P2421 motion sensing switch 3ch alt DP
- Compound `HOBEIAN|ZG-204ZX`: tuya_dp  P2422 ZX
- Compound `HOBEIAN|ZG-204ZP`: tuya_dp  P2430 HOBEIAN radar 204ZP
- Compose: class=sensor eps=1 EF00=true IAS=false batteries=CR2032/CR2450/AAA/AA/CR123A/INTERNAL
- Notes: HOBEIAN ZG-204*/ZG-205*/ZG-302Z* radar/presence (+ sensing-switch). Never climate/soil/vibration/clamp cartesian. Z2M herdsman couples.
- Sources: z2m-ZG-204ZM, P2250

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
- Notes: z2m ERS-10TZBVK-AA smart knob (zigbeeModel ZG-101ZD, TS004F, CR2032). Battery rotary remote — never an energy meter, relay board or mains wall switch. power_meter also declares TS004F, so leaving it there is a live dual-claim. **P2448:** must stay `family=knob` + `0x8004=command/dimmer` (levelControl rotation). Never force scene via `/smart_knob/` catch-all — that killed rotate on `uri7ongn`/`ixla93vd`/`smart_knob_rotary`. **P2449:** `SmartKnobRotationMixin` + rotate/brightness flow cards on `smart_knob` / `smart_knob_switch` / `smart_knob_rotary` (press_and_rotate, brightness_changed, set_brightness, scene_recall wired). ButtonDevice no longer strips `dim` for these drivers. `button_mode` setting on `smart_knob` (auto/scene/dimmer). Fleet: `DeclaredFlowCardAutoWire` + ButtonDevice driver-scoped `*_scene_recall` + dim→`*_brightness_changed` for all sacred couples that declare those cards.
- Sources: z2m-herdsman, johan-enrichment, P190, P2448, P2449

### `p2439-p2450-kaflzta4-smart-knob-press` → `smart_knob`

- Couple: `_TZ3000_kaflzta4` + TS004F
- Protocol: zcl (genOnOff 0x8004 event/scene + 0xFD)
- Diags: `a342c411` (9.0.846 press dead), `8adfe4ce` (9.0.857 still not working — log had no knob RX, curtain only)
- Notes: Moes 1-btn TS004F scene remote on `smart_knob` (not rotary ERS-10). **Must** write `0x8004=1` (event). **P2439/P2442:** never classify as `family=knob` / skip 0x8004 when ABSENT at wake. **P2450:** reset stuck `button_mode=dimmer` → auto/scene; on late MFR-ENSURE re-apply scene + re-arm 0xFD. Sibling scene mfr: `ja5osu5g`+TS004F. **P2453:** `an5rjiwd` is TS0041 → `button_wireless_1` (not smart_knob / not button_wireless_4). Rotary `uri7ongn`/`ixla93vd` stay command/dimmer (P2448).
- Sources: Homey diag a342c411/8adfe4ce, Z2M TS004F operation_mode=event, P2439, P2442, P2450, P2453

### `p190-ts130f-curtain-not-climate-or-dimmer` → `wall_curtain_switch`

- Couple: `_TZ3210_ol1uhvza` + TS130F
- Protocol: zcl
- Z2M local pids for mfr: (none in dump) 
- Compound `_TZ3210_ol1uhvza|TS130F`: zcl  ZHA#5226 inverted lift % + mid-travel; invert_position + RX reporting (P2275)
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
- Notes: P2322: HomeSuite interview confirms TS0004 + EP1-4 genOnOff (clusters 3,4,5,6,57344,57345). ZCL TB25-4 touch — not EF00. Sub-device tiles. Forum #2186/#2188 Gabriel.
- Sources: forum-140352-2173, forum-140352-2182, forum-140352-2186, forum-140352-2188, gpm-homesuite-interview-TS0004, P2322

### `p2261-ihseno-debczeci-presence` → `presence_sensor_radar`

- Couple: `_TZE284_debczeci` + TS0601
- Protocol: tuya_dp
- Z2M local pids for mfr: TS0601 ✓ overlap
- Compound `_TZE284_debczeci|TS0601`: tuya_dp  iHseno mmWave DP1 presence; Johan T26439 #5493
- Compound `_TZE204_debczeci|TS0601`: tuya_dp
- Compound `_TZE284_1lvln0x6|TS0601`: tuya_dp  Z2M sibling of debczeci
- Compose: class=sensor eps=1 EF00=true IAS=false batteries=CR2032/CR2450/AAA/AA/CR123A/INTERNAL
- Notes: iHseno mmWave presence — DP1 occupancy DP4 battery. Johan T26439 #5493; Z2M sibling 1lvln0x6.
- Sources: z2m-27773, forum-26439-5493, P2261

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
- Notes: HOBEIAN ZG-305Z MHCOZY dual USB-C switch (JohanBendz PR #1435). Unique pid avoids TS0601 cartesian with other HOBEIAN sensors. forbidMode couple — same brand has climate/soil/radar siblings.
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

### `blitzwolf-amdymr7l-shp13-plug` → `plug_energy_monitor`

- Couple: `_TZ3000_amdymr7l` + TS011F
- Protocol: zcl
- Z2M local pids for mfr: (none in dump) 
- Compound `_TZ3000_amdymr7l|TS011F`: zcl  BlitzWolf BW-SHP13 metering; never button
- Compound `_TZ3210_amdymr7l|TS011F`: zcl  BlitzWolf BW-SHP13 TZ3210 sibling; Phoscon/Z2M
- Compose: class=socket eps=1 EF00=false IAS=false batteries=mains?
- Notes: BlitzWolf BW-SHP13 metering plug (Phoscon/Z2M). Never button driver. Pid TS011F ambiguous without mfr.
- Sources: phoscon-compat, z2m-11703, fork-mmaaikel

### `p2201-pay2byax-zg102zl-contact` → `contact_sensor_zigbee`

- Couple: `_TZE200_pay2byax` + TS0601, ZG-102ZL, ZG-102Z
- Protocol: tuya_dp
- Z2M local pids for mfr: TS0601 ✓ overlap
- Compound `_TZE200_pay2byax|TS0601`: tuya_dp  ZG-102ZL luminance contact; P2201 P126-safe
- Compound `_TZE200_pay2byax|ZG-102ZL`: tuya_dp
- Compound `_TZE204_pay2byax|TS0601`: tuya_dp  TZE204 sibling; P2201 P126-safe
- Compound `_TZE204_pay2byax|ZG-102ZL`: tuya_dp
- Compose: class=sensor eps=1 EF00=false IAS=false batteries=CR2450
- Notes: ZG-102ZL luminance contact. TS0601 pairs via contact_sensor_zigbee (P126 forbids TS0601 on contact_sensor). ZG-102ZL also on contact_sensor.
- Sources: z2m-zg-102zl, p126-contact-no-TS0601, fork-p2200

### `tongou-to-q-sys-jzt-din-meter` → `din_rail_meter`

- Couple: `_TZE284_6ocnqlhn` + TS0601
- Protocol: tuya_ef00
- Retail: Tongou TO-Q-SYS-JZT
- Z2M local pids for mfr: (none in dump) 
- Compound `_TZE284_6ocnqlhn|TS0601`: tuya_dp  Tongou TO-Q-SYS-JZT. DP6 type0 composite V/A/W. Forbid smart_rcbo. Re-pair after update.
- Compose: class=sensor eps=1 EF00=true IAS=false batteries=mains?
- Notes: Gmail diags 3a1f196d + 31e654a4 (Aug 2026). Z2M din rail smart meter — not RCBO. smart_rcbo stole couple; DP6 raw was mapped to measure_humidity. User must update Test and re-pair.
- Sources: gmail-diag-3a1f196d, gmail-diag-31e654a4, z2m-TO-Q-SYS-JZT

### `p2234-gdsvhfao-repeater` → `zigbee_repeater`

- Couple: `_TZ3000_gdsvhfao` + TS0001
- Protocol: unknown
- Z2M local pids for mfr: TS0001 ✓ overlap
- Compound `_TZ3000_gdsvhfao|TS0001`: zcl  Z2M#11207 TS0001_repeater — not switch_1gang
- Compose: class=other eps=1 EF00=false IAS=false batteries=mains?
- Notes: TS0001_repeater — pairing button repeater
- **Gaps:** no_sources

### `p2234-itp8dt7f-dimmer` → `wall_dimmer_tuya`

- Couple: `_TZE200_itp8dt7f` + TS0601
- Protocol: unknown
- Z2M local pids for mfr: (none in dump) 
- Compound `_TZE200_itp8dt7f|TS0601`: tuya_dp DP {"1":"onoff","2":"dim/1000"} Z2M#12213 ION dimmer alias ykgar0ow — not soil
- Compose: class=light eps=1 EF00=true IAS=false batteries=mains?
- Notes: ION touch dimmer alias of ykgar0ow
- **Gaps:** no_sources, not_in_local_z2m_fps

### `p2234-qujphad5-tybac` → `wall_thermostat`

- Couple: `_TZE204_qujphad5` + TS0601
- Protocol: unknown
- Z2M local pids for mfr: (none in dump) 
- Compound `_TZE204_qujphad5|TS0601`: tuya_dp  Z2M#12869 TYBAC-006 FCU — not bulb
- Compose: class=thermostat eps=1 EF00=true IAS=false batteries=mains?
- Notes: TYBAC-006 FCU thermostat
- **Gaps:** no_sources, not_in_local_z2m_fps

### `p2234-apiu8k13-q9qytwfa-water-heater` → `plug_energy_monitor`

- Couple: `_TZE204_apiu8k13` + TS0601
- Protocol: unknown
- Z2M local pids for mfr: (none in dump) 
- Compound `_TZE204_apiu8k13|TS0601`: tuya_dp  Water heater power-monitoring switch
- Compound `_TZE284_q9qytwfa|TS0601`: tuya_dp  Z2M#32883 Nisko — same DPs as apiu8k13
- Compose: class=socket eps=1 EF00=false IAS=false batteries=mains?
- Notes: Power-monitoring water heater controller
- **Gaps:** no_sources, not_in_local_z2m_fps

### `p2234b-tz3000_gdsvhfao` → `zigbee_repeater`

- Couple: `_TZ3000_gdsvhfao` + TS0001
- Protocol: unknown
- Z2M local pids for mfr: TS0001 ✓ overlap
- Compound `_TZ3000_gdsvhfao|TS0001`: zcl  Z2M#11207 TS0001_repeater — not switch_1gang
- Compose: class=other eps=1 EF00=false IAS=false batteries=mains?
- Notes: Z2M#11207 TS0001_repeater only — not every TS0001
- **Gaps:** no_sources

### `p2234b-tze200_itp8dt7f` → `wall_dimmer_tuya`

- Couple: `_TZE200_itp8dt7f` + TS0601
- Protocol: unknown
- Z2M local pids for mfr: (none in dump) 
- Compound `_TZE200_itp8dt7f|TS0601`: tuya_dp DP {"1":"onoff","2":"dim/1000"} Z2M#12213 ION dimmer alias ykgar0ow — not soil
- Compose: class=light eps=1 EF00=true IAS=false batteries=mains?
- Notes: Z2M#12213 ION dimmer — strip fake ZG-303Z soil pid from mfs
- **Gaps:** no_sources, not_in_local_z2m_fps

### `p2234b-tz3000_dershnvx` → `switch_2gang`

- Couple: `_TZ3000_dershnvx` + TS0002
- Protocol: unknown
- Z2M local pids for mfr: (none in dump) 
- Compound `_TZ3000_dershnvx|TS0002`: zcl  Z2M#12246 2-gang no-neutral
- Compose: class=socket eps=2 EF00=false IAS=false batteries=mains?
- Notes: Z2M#32034 / #12246 — ONLY TS0002 (no TS0001/TS0601 invent)
- **Gaps:** no_sources, not_in_local_z2m_fps

### `p2234b-tz3000_icoxotza` → `switch_2gang`

- Couple: `_TZ3000_icoxotza` + TS0726
- Protocol: unknown
- Z2M local pids for mfr: (none in dump) 
- Compound `_TZ3000_icoxotza|TS0726`: zcl  Z2M#11720 TS0726_2_gang
- Compose: class=socket eps=2 EF00=false IAS=false batteries=mains?
- Notes: Z2M#11720 TS0726_2_gang — pid is TS0726 not TS0002
- **Gaps:** no_sources, not_in_local_z2m_fps

### `p2234b-tze204_qujphad5` → `wall_thermostat`

- Couple: `_TZE204_qujphad5` + TS0601
- Protocol: unknown
- Z2M local pids for mfr: (none in dump) 
- Compound `_TZE204_qujphad5|TS0601`: tuya_dp  Z2M#12869 TYBAC-006 FCU — not bulb
- Compose: class=thermostat eps=1 EF00=true IAS=false batteries=mains?
- Notes: TYBAC-006 FCU — sibling mpbki2zm is a SEPARATE couple
- **Gaps:** no_sources, not_in_local_z2m_fps

### `p2300-tz3000_pjb1ua0m-contact-ts0203` → `contact_sensor`

- Couple: `_TZ3000_pjb1ua0m` + TS0203
- Protocol: ias_zone
- Z2M local pids for mfr: TS0203 ✓ overlap
- Compose: class=sensor eps=1 EF00=false IAS=true batteries=CR2032/CR1632/AAA
- Notes: GitHub Discussion #100 Pressure band — IAS contact on contact_sensor; forbid dual-home doorwindowsensor_3 (P2404).
- Sources: discussion-100, P2300, P2404
- **Gaps:** no_compound_db_key

### `p2234b-tze204_mpbki2zm` → `wall_thermostat`

- Couple: `_tze204_mpbki2zm` + TS0601
- Protocol: tuya_ef00
- Z2M local pids for mfr: TS0601 ✓ overlap
- Compound `_TZE204_mpbki2zm|TS0601`: tuya_dp  TYBAC-006 — not TRV
- Compose: class=thermostat eps=1 EF00=true IAS=false batteries=mains?
- Notes: P2295: zigbee pid=TS0601 only — PJ-1203A was invent. TYBAC-006/BAC006 are retail names. Sibling qujphad5 is a separate couple.
- Sources: p2234b-tze204_mpbki2zm, P2295, P2300, TYBAC-006, BAC-006, issue-532

### `p2234b-tze204_apiu8k13` → `plug_energy_monitor`

- Couple: `_TZE204_apiu8k13` + TS0601
- Protocol: unknown
- Z2M local pids for mfr: (none in dump) 
- Compound `_TZE204_apiu8k13|TS0601`: tuya_dp  Water heater power-monitoring switch
- Compose: class=socket eps=1 EF00=false IAS=false batteries=mains?
- Notes: Water-heater monitor — TZE284_q9qytwfa is sibling couple, not same mfr
- **Gaps:** no_sources, not_in_local_z2m_fps

### `p2234b-tze284_q9qytwfa` → `plug_energy_monitor`

- Couple: `_TZE284_q9qytwfa` + TS0601
- Protocol: unknown
- Z2M local pids for mfr: (none in dump) 
- Compound `_TZE284_q9qytwfa|TS0601`: tuya_dp  Z2M#32883 Nisko — same DPs as apiu8k13
- Compose: class=socket eps=1 EF00=false IAS=false batteries=mains?
- Notes: Z2M#32883 — TZE284 ≠ TZE204; lock separately
- **Gaps:** no_sources, not_in_local_z2m_fps

### `p2234b-tze200_7upwjcca` → `curtain_motor`

- Couple: `_TZE200_7upwjcca` + TS0601
- Protocol: unknown
- Z2M local pids for mfr: (none in dump) 
- Compound `_TZE200_7upwjcca|TS0601`: tuya_dp  Z2M#32905 cover motor
- Compose: class=windowcoverings eps=1 EF00=true IAS=false batteries=OTHER
- Notes: Z2M#32905 cover — only TS0601
- **Gaps:** no_sources, not_in_local_z2m_fps

### `p2234b-tz3000_anptztic` → `plug_energy_monitor`

- Couple: `_TZ3000_anptztic` + TS0001
- Protocol: unknown
- Z2M local pids for mfr: (none in dump) 
- Compound `_TZ3000_anptztic|TS0001`: zcl  Z2M#32609 metering TS0001
- Compose: class=socket eps=1 EF00=false IAS=false batteries=mains?
- Notes: Z2M#32609 metering TS0001 — same pid as repeater family but DIFFERENT mfr
- **Gaps:** no_sources, not_in_local_z2m_fps

### `p2234b-tz3000_ly9apzky` → `wall_switch_3gang_1way`

- Couple: `_TZ3000_ly9apzky` + TS0003
- Protocol: unknown
- Z2M local pids for mfr: (none in dump) 
- Compound `_TZ3000_ly9apzky|TS0003`: zcl  Z2M#32810 3ch relay
- Compose: class=socket eps=3 EF00=false IAS=false batteries=mains?
- Notes: Z2M#32810 + doctrine: TS0003 3-gang → wall_switch_3gang_1way NOT switch_3gang
- **Gaps:** no_sources, not_in_local_z2m_fps

### `p2234b-tze204_pkpfn9hc` → `air_quality_co2`

- Couple: `_TZE204_pkpfn9hc` + TS0601
- Protocol: unknown
- Z2M local pids for mfr: (none in dump) 
- Compound `_TZE204_pkpfn9hc|TS0601`: tuya_dp  Z2M#12949 CO2/temp/humidity
- Compose: class=sensor eps=1 EF00=true IAS=false batteries=AAA/OTHER
- Notes: Z2M#12949 CO2 — TS0601 shared pid, mfr locks type
- **Gaps:** no_sources, not_in_local_z2m_fps

### `p2234b-tz3002_y7wpizuw` → `switch_4gang`

- Couple: `_TZ3002_y7wpizuw` + TS0726
- Protocol: unknown
- Z2M local pids for mfr: (none in dump) 
- Compound `_TZ3002_y7wpizuw|TS0726`: zcl  Z2M#32628 4-gang TS0726
- Compose: class=socket eps=4 EF00=true IAS=false batteries=mains?
- Notes: Z2M#32628 4-gang TS0726 — icoxotza+TS0726 is 2-gang (different mfr)
- **Gaps:** no_sources, not_in_local_z2m_fps

### `p2234b-tze284_smcqit2l` → `wall_thermostat`

- Couple: `_TZE284_smcqit2l` + TS0601
- Protocol: unknown
- Z2M local pids for mfr: (none in dump) 
- Compound `_TZE284_smcqit2l|TS0601`: tuya_dp  Z2M#32568 BHT-209W interview mfr
- Compose: class=thermostat eps=1 EF00=true IAS=false batteries=mains?
- Notes: Z2M#32568 — do not conflate with qujphad5/mpbki2zm
- **Gaps:** no_sources, not_in_local_z2m_fps

### `p2234b-tze284_6uyu20xu` → `climate_sensor`

- Couple: `_TZE284_6uyu20xu` + TS0601
- Protocol: unknown
- Z2M local pids for mfr: (none in dump) 
- Compound `_TZE284_6uyu20xu|TS0601`: tuya_dp  Z2M#32491 Chayo TOVTH temp/humidity
- Compose: class=sensor eps=1 EF00=true IAS=false batteries=AAA/CR2032/CR2450
- Notes: Z2M#32491 Chayo TOVTH
- **Gaps:** no_sources, not_in_local_z2m_fps

### `p2236-4upl1fcj-ts0041-button` → `button_wireless_1`

- Couple: `_TZ3000_4upl1fcj` + TS0041
- Protocol: unknown
- Z2M local pids for mfr: (none in dump) 
- Compound `_TZ3000_4upl1fcj|TS0041`: zcl  P2236 SunBeech T156967 — TS0041 remote NOT switch_1gang
- Compose: class=button eps=1 EF00=true IAS=true batteries=CR2032/CR2450
- Notes: SunBeech T156967 — TS0041 wireless remote, NEVER switch_1gang (processor false ROUTED_OK)
- **Gaps:** no_sources, not_in_local_z2m_fps

### `p2236-qeuvnohg-ts011f-din` → `din_rail_switch`

- Couple: `_TZ3000_qeuvnohg` + TS011F
- Protocol: unknown
- Z2M local pids for mfr: TS011F ✓ overlap
- Compound `_TZ3000_qeuvnohg|TS011F`: zcl
- Compose: class=socket eps=1 EF00=true IAS=false batteries=mains?
- Notes: T89271 Erwin3/Zdenek — registry+DeviceFingerprintDB din_rail_switch; strip fake TS0042/TS0601
- **Gaps:** no_sources

### `p2236-amdymr7l-tz3210-energy` → `plug_energy_monitor`

- Couple: `_TZ3210_amdymr7l` + TS011F
- Protocol: unknown
- Z2M local pids for mfr: (none in dump) 
- Compound `_TZ3210_amdymr7l|TS011F`: zcl  BlitzWolf BW-SHP13 TZ3210 sibling; Phoscon/Z2M
- Compose: class=socket eps=1 EF00=false IAS=false batteries=mains?
- Notes: T89271 Bram_B — BlitzWolf SHP13 dual-compose; energy only
- **Gaps:** no_sources, not_in_local_z2m_fps

### `p2236-amdymr7l-tz3000-energy` → `plug_energy_monitor`

- Couple: `_TZ3000_amdymr7l` + TS011F
- Protocol: unknown
- Z2M local pids for mfr: (none in dump) 
- Compound `_TZ3000_amdymr7l|TS011F`: zcl  BlitzWolf BW-SHP13 metering; never button
- Compose: class=socket eps=1 EF00=false IAS=false batteries=mains?
- Notes: Sibling TZ3000 BlitzWolf — TS011F only
- **Gaps:** no_sources, not_in_local_z2m_fps

### `p2236-xabckq1v-ts004f` → `button_wireless_4`

- Couple: `_TZ3000_xabckq1v` + TS004F
- Protocol: unknown
- Z2M local pids for mfr: TS004F ✓ overlap
- Compound `_TZ3000_xabckq1v|TS004F`: zcl  Moes TS004F 4-button scene switch, cross-checked with Z2M/ZHA/deCONZ
- Compose: class=button eps=4 EF00=false IAS=false batteries=CR2032/CR2450/AAA
- Notes: Steampunk soft TS0001 REJECTED — known couple is TS004F only
- **Gaps:** no_sources

### `p2236-kfu8zapd-ts0044f` → `button_wireless_4`

- Couple: `_TZ3000_kfu8zapd` + TS0044, TS004F
- Protocol: unknown
- Z2M local pids for mfr: (none in dump) 
- Compound `_TZ3000_kfu8zapd|TS0044`: zcl  Moes TS0044 4-button scene remote (forum #2098-#2104, JohanBendz #1418), OnOff 0xFD action path, no scenes cluster
- Compound `_TZ3000_kfu8zapd|TS004F`: zcl  Moes TS004F 4-button scene switch, cross-checked with Z2M/ZHA/Hubitat
- Compose: class=button eps=4 EF00=false IAS=false batteries=CR2032/CR2450/AAA
- Notes: Primordial T150690 — Moes 4-btn; mfs must list TS0044/TS004F not TS0001
- **Gaps:** no_sources, not_in_local_z2m_fps

### `p2236-zgyzgdua-ts0044-scene` → `scene_switch_4`

- Couple: `_TZ3000_zgyzgdua` + TS0044
- Protocol: zcl
- Z2M local pids for mfr: (none in dump) 
- Compound `_TZ3000_zgyzgdua|TS0044`: zcl  Moes XH-SY-04Z physical press genOnOff 0xFD; skip 0x8004. Update Test + re-pair.
- Compose: class=button eps=4 EF00=false IAS=false batteries=CR2450/AAA
- Notes: meter91 #2189/#2207 — scene_switch_4 genOnOff 0xFD; diag c40705a1 on 9.0.714 needs Test ≥9.0.734 + re-pair
- **Gaps:** no_sources, not_in_local_z2m_fps

### `p2328-wkai4ga5-ts0044-scene` → `scene_switch_4`

- Couple: `_TZ3000_wkai4ga5` + TS0044
- Protocol: unknown
- Z2M local pids for mfr: (none in dump) 
- Compose: class=button eps=4 EF00=false IAS=false batteries=CR2450/AAA
- Notes: Moes/SunBeech TS0044 — NOT TS004F 0x8004; strip wall_switch steal
- **Gaps:** no_compound_db_key, no_sources, not_in_local_z2m_fps

### `p2332-xffhmvhv-ts004f-nobo` → `button_wireless_4`

- Couple: `_TZ3000_xffhmvhv` + TS004F
- Protocol: unknown
- Z2M local pids for mfr: (none in dump) 
- Compound `_TZ3000_xffhmvhv|TS004F`: zcl  Nobø SWS-IZ — skip 0x8004; OnOff 0xFD path. Update Test + re-pair.
- Compose: class=button eps=4 EF00=false IAS=false batteries=CR2032/CR2450/AAA
- Notes: Nobø SWS-IZ (Z2M #12768); diag 9cbf9eb6 — skip 0x8004 write (firmware rejects); 0xFD/hybrid RX
- **Gaps:** no_sources, not_in_local_z2m_fps

### `p2328-ts0044-remotes-not-wall-switch` → `scene_switch_4`

- Couple: `_TZ3000_ufhtxr59` + TS0044
- Protocol: unknown
- Z2M local pids for mfr: (none in dump) 
- Compound `_TZ3000_ufhtxr59|TS0044`: zcl  P2337 battery scene remote — forbid wall_remote_4_gang steal
- Compound `_TZ3000_vp6clf9d|TS0044`: zcl  P2337 battery scene remote — forbid wall_remote_4_gang steal
- Compose: class=button eps=4 EF00=false IAS=false batteries=CR2450/AAA
- Notes: Battery scene remotes — never pair as wall_switch_4_gang
- **Gaps:** no_sources, not_in_local_z2m_fps

### `p2236-nkcobies-ts011f-plug` → `smartplug`

- Couple: `_TZ3000_nkcobies` + TS011F, TS0121
- Protocol: unknown
- Z2M local pids for mfr: (none in dump) 
- Compound `_TZ3000_nkcobies|TS011F`: zcl  P2251 forum soft lock verified compose/mfs — not TS0001
- Compound `_TZ3000_nkcobies|TS0121`: zcl  P2251 nkcobies alt pid
- Compose: class=socket eps=1 EF00=false IAS=false batteries=mains?
- Notes: Bo_Kjaergaard soft TS0001 REJECTED — compose plug TS011F/TS0121
- **Gaps:** no_sources, not_in_local_z2m_fps

### `p2321-mtnpt6ws-ts0002-2gang` → `switch_2gang`

- Couple: `_TZ3000_mtnpt6ws` + TS0002
- Protocol: zcl
- Retail: Nous L13Z, AVATTO ZWSM16-2, OXT SWTZ22
- Z2M local pids for mfr: TS0002 ✓ overlap
- Compose: class=socket eps=2 EF00=false IAS=false batteries=mains?
- Notes: P2321: HomeSuite switch_2_ch + Z2M TS0002_switch_module. 2-EP ZCL module.
- Sources: homesuite, z2m, P2321
- **Gaps:** no_compound_db_key

### `p2321-ddigca5n-ts011f-nous-a9z` → `plug_energy_monitor`

- Couple: `_TZ3210_ddigca5n` + TS011F
- Protocol: zcl
- Retail: Nous A9Z
- Z2M local pids for mfr: (none in dump) 
- Compose: class=socket eps=1 EF00=false IAS=false batteries=mains?
- Notes: P2321: Johan #1452 + Z2M Nous A9Z metering plug. Complementary from alt-app harvest.
- Sources: JohanBendz#1452, z2m, P2321
- **Gaps:** no_compound_db_key

### `p2251-sergep-nous-sophos-external` → `switch_1gang`

- Couple: `_TZ3000_v5498kdm` + TS0001
- Protocol: zcl
- Z2M local pids for mfr: (none in dump) 
- Compose: class=socket eps=1 EF00=false IAS=false batteries=mains?
- Notes: P2320: user asked to carry SergeP/Antek T99614 Nous/SoPhos TS0001 into Universal Tuya. Lock switch_1gang (mfr+pid). Was doNotTouch external-only.
- Sources: forum-T99614, P2251, P2320
- **Gaps:** no_compound_db_key

### `p2258-linptech-es1zz-ts0225` → `motion_sensor_radar_mmwave`

- Couple: `_TZ3218_t9ynfz4x` + TS0225
- Protocol: hybrid
- Z2M local pids for mfr: (none in dump) 
- Compound `_TZ3218_t9ynfz4x|TS0225`: hybrid  P2261: settings via 0xE002 attrs 57348/57349/57355 (fallback 0xE001) + DP101 fading
- Compound `_TZ3218_awarhusb|TS0225`: hybrid
- Compound `_TZ3218_ewrxirng|TS0225`: hybrid
- Compose: class=sensor eps=1 EF00=true IAS=true batteries=mains?
- Notes: Linptech ES1ZZ / Moes ZSS-LP-HP02-MS — settings via 0xE002 attrs 57348/57349/57355 (fallback 0xE001), not EF00 DP9. A_Tas #2199 / T158757 / P2261.
- Sources: z2m-ES1ZZ, zha-3012, forum-140352, forum-158757, P2258, P2261

### `p2259-hobeian-zg223z-rain` → `rain_sensor`

- Couple: `HOBEIAN` + ZG-223Z
- Protocol: tuya_dp
- Retail: HOBEIAN Raindrop Detection Sensor, ZG-223Z
- Z2M local pids for mfr: CK-BL702-MWS-01(7016) 
- Compound `HOBEIAN|ZG-223Z`: hybrid  IAS rain + ZCL illuminance + CR123A; forbid water_leak_sensor
- Compose: class=sensor eps=1 EF00=true IAS=true batteries=AAA/AA/CR123A
- Notes: Z2M rainwater sensor — alarm_water + rain level, NOT IAS leak. Johan T158754 / forum #1610.
- Sources: z2m-ZG-223Z, forum-158754, P2259

### `p2260-upgcbody-ts0207-water` → `water_leak_sensor`

- Couple: `_TZ3000_upgcbody` + TS0207
- Protocol: ias_zone
- Z2M local pids for mfr: (none in dump) 
- Compound `_TZ3000_upgcbody|TS0207`: ias_zone  Z2M TS0207 water leak IAS; melectro T89271 #651
- Compose: class=sensor eps=1 EF00=false IAS=true batteries=CR2032/CR2450/AAA
- Notes: Z2M TS0207 IAS water leak; melectro T89271 #651
- Sources: z2m#21247, blakadder, P2260

### `p2260-3lbtuxgp-ts0505b-bulb` → `bulb_rgb`

- Couple: `_TZ3210_3lbtuxgp` + TS0505B
- Protocol: zcl
- Z2M local pids for mfr: (none in dump) 
- Compound `_TZ3210_3lbtuxgp|TS0505B`: zcl  Tuya RGBCW downlight Z2M #13579; forbid wall_dimmer_tuya
- Compose: class=light eps=1 EF00=false IAS=false batteries=mains?
- Notes: Tuya RGBCW downlight; late4marshmellow T89271 #667; Z2M #13579
- Sources: z2m#13579, P2260

### `p2264-qaaysllp-neo-th02b` → `lcdtemphumidluxsensor`

- Couple: `_TZ3000_qaaysllp` + TS0201
- Protocol: zcl
- Retail: Neo NAS-TH02B2, Neo NAS-TH02B, Neo TH01, NAS-TH02B, Tuya LCZ030
- Z2M local pids for mfr: TS0201 ✓ overlap
- Compound `_TZ3000_qaaysllp|TS0201`: zcl  Neo NAS-TH02B; virtual EP2 + TuyaMagicPacket; never climate_sensor-only
- Compose: class=sensor eps=2 EF00=false IAS=false batteries=AAA/AAA
- Notes: ZHA #862 + Abysim Medium: (1) interview EP1 only (2) temp/humidity on undeclared EP2 (3) needs Basic 0xFFFE magic (4) EP2 read/CFG → UNSUPPORTED 0x86 — use unsolicited reports. E002 humidity max attr is 0xD00D not 0xD00C. Homey: virtual EP2 + magic + delayed retries.
- Sources: zha-device-handlers#862, abysim-medium-ts0201-neo, z2m-LCZ030, P2264, P2265

### `p2266-bjawzodf-ty0201-temu` → `lcdtemphumidsensor`

- Couple: `_TZ3000_bjawzodf` + TY0201, TS0201
- Protocol: zcl
- Retail: Temu Zigbee temp humidity display, Tuya WSD500A, TH02Z class
- Z2M local pids for mfr: TS0201 ✓ overlap
- Compound `_TZ3000_bjawzodf|TY0201`: zcl  Temu WSD500A-class; magic 0xFFFE; clusters 0/1/3/1026/1029
- Compound `_TZ3000_bjawzodf|TS0201`: zcl  Z2M WSD500A fingerprint sibling of TY0201
- Compose: class=sensor eps=1 EF00=true IAS=false batteries=CR2032/CR2450/AAA
- Notes: HACF #38762 + ZHA #2862: EP1 ZCL temp/humidity (0x0402/0x0405), not Neo qaaysllp EP2/lux. Needs magic 0xFFFE (Z2M WSD500A). Distinct from _TZE200_bjawzodf|TS0601 EF00 climate.
- Sources: hacf-38762, zha-device-handlers#2862, z2m-WSD500A, P2266

### `p2267-e002-alarm-taxonomy` → `lcdtemphumidsensor`

- Couple: `_TZ3210_qkj7rujp` + TS0201
- Protocol: zcl
- Z2M local pids for mfr: (none in dump) 
- Compound `_TZ3210_qkj7rujp|TS0201`: zcl  LCD with E002 alarms; silence via beepSilence 0xD010
- Compose: class=sensor eps=1 EF00=true IAS=false batteries=CR2032/CR2450/AAA
- Notes: P2267 Google 0xE002 sweep: LCD E002 alarms; mute beeper via attr 0xD010=1. Humidity max attr 0xD00D (Z2M). Cluster taxonomy Z2M manuSpecificTuya2=0xE002.
- Sources: ha-community-692449, z2m-ManuSpecificTuya2, zigpy-discussion-823, P2267

### `p2268-cjbofhxw-clamp-not-smoke` → `power_clamp_meter`

- Couple: `_TZE204_cjbofhxw` + TS0601
- Protocol: tuya_dp
- Z2M local pids for mfr: TS0601 ✓ overlap
- Compound `_TZE204_cjbofhxw|TS0601`: tuya_dp  Z2M PJ-MGW1203; forbid smoke
- Compound `_TZE284_cjbofhxw|TS0601`: tuya_dp  Z2M PJ-MGW1203; forbid smoke
- Compound `_TZE200_cjbofhxw|TS0601`: tuya_dp  TZE200 sibling clamp
- Compose: class=sensor eps=1 EF00=true IAS=false batteries=mains?
- Notes: Z2M PJ-MGW1203 clamp meter — was cartesian-stolen by smoke_sensor3 via TS0601
- Sources: z2m-PJ-MGW1203, ha-community-931745, P2268

### `p2268-a14rjslz-3phase-not-climate` → `energy_meter_3phase`

- Couple: `_TZE284_a14rjslz` + TS0601
- Protocol: tuya_dp
- Z2M local pids for mfr: TS0601 ✓ overlap
- Compound `_TZE284_a14rjslz|TS0601`: tuya_dp  Ourtop ATMS10013Z3; forbid climate
- Compose: class=sensor eps=1 EF00=true IAS=false batteries=mains?
- Notes: Z2M ATMS10013Z3 Ourtop 3-phase meter — was on climate_sensor
- Sources: z2m-ATMS10013Z3, zhc-8658, P2268

### `p2268-tonrapsk-ts0002-2gang` → `switch_2gang`

- Couple: `_TZ3000_tonrapsk` + TS0002
- Protocol: zcl
- Z2M local pids for mfr: (none in dump) 
- Compound `_TZ3000_tonrapsk|TS0002`: zcl  ZHA #5260; per-gang needs Tuya magic
- Compose: class=socket eps=2 EF00=false IAS=false batteries=mains?
- Notes: ZHA #5260 Zemismart ZB811 — per-gang needs Tuya magic (UnifiedSwitchBase already sends). Works in Z2M.
- Sources: zha-device-handlers#5260, P2268

### `p2268-cf4b5ktf-moes-3phase-soft` → `energy_meter_3phase`

- Couple: `_TZE284_cf4b5ktf` + TS0601
- Protocol: tuya_dp
- Z2M local pids for mfr: (none in dump) 
- Compound `_TZE284_cf4b5ktf|TS0601`: tuya_dp  ZHA #5117 Moes 3-phase; soft lock pending full DP map
- Compose: class=sensor eps=1 EF00=true IAS=false batteries=mains?
- Notes: ZHA #5117 Moes 3-phase — Z2M converter still absent; soft route only, no invented DPs
- Sources: zha-device-handlers#5117, P2268

### `p2270-402vrq2i-knob-not-4gang` → `smart_knob`

- Couple: `_TZ3000_402vrq2i` + TS004F
- Protocol: zcl
- Z2M local pids for mfr: TS004F ✓ overlap
- Compound `_TZ3000_402vrq2i|TS004F`: zcl  ZHA#5261 / GitHub#1349 rotary knob — not 4-gang metering
- Compose: class=button eps=1 EF00=false IAS=false batteries=CR2032
- Notes: ZHA#5261 rotary knob — was stolen by switch_4_gang_metering cartesian TS004F
- Sources: zha-device-handlers#5261, P2270

### `p2270-hlx9tnzb-dimmer-not-1gang` → `dimmer_1_gang_tuya`

- Couple: `_TZE204_hlx9tnzb` + TS0601
- Protocol: tuya_dp
- Z2M local pids for mfr: TS0601 ✓ overlap
- Compound `_TZE204_hlx9tnzb|TS0601`: tuya_dp  Z2M#32815 dimmer; mesh flap after power cycle
- Compose: class=light eps=1 EF00=true IAS=false batteries=CR2032
- Notes: Z2M#32815 Moes dimmer (mesh flood after reboot) — not switch_1gang
- Sources: zigbee2mqtt#32815, P2270

### `p2270-gnpflcoq-4in1-mmwave` → `motion_sensor_radar_mmwave`

- Couple: `_TZE284_gnpflcoq` + TS0601
- Protocol: tuya_dp
- Z2M local pids for mfr: (none in dump) 
- Compound `_TZE284_gnpflcoq|TS0601`: tuya_dp  ZHA#5252 DP1 inverted presence; DP7 temp/10; DP8 humidity; DP11 lux
- Compose: class=sensor eps=1 EF00=true IAS=true batteries=mains?
- Notes: ZHA#5252 4in1 — DP1 presence inverted (0=occupied). Prefer mmwave driver.
- Sources: zha-device-handlers#5252, P2270

### `p2270-fqm2sfpe-trv-soft` → `device_radiator_valve`

- Couple: `_TZE284_fqm2sfpe` + TS0601
- Protocol: tuya_dp
- Z2M local pids for mfr: (none in dump) 
- Compound `_TZE284_fqm2sfpe|TS0601`: tuya_dp  Z2M#32931 TRV soft lock pending full DP map
- Compose: class=thermostat eps=1 EF00=false IAS=false batteries=AA
- Notes: Z2M#32931 TRV soft lock — no invented DPs
- Sources: zigbee2mqtt#32931, P2270

### `p2271-tdg4ckyh-rf-cloner` → `ir_blaster`

- Couple: `_TZE284_tdg4ckyh` + TS0601
- Protocol: tuya_dp
- Z2M local pids for mfr: (none in dump) 
- Compound `_TZE284_tdg4ckyh|TS0601`: tuya_dp  Z2M RF Cloner / ZRF01 family; soft lock
- Compose: class=remote eps=1 EF00=true IAS=false batteries=CR2450/CR2032
- Notes: Z2M#32756/#32836 Zigbee RF Cloner — soft ir_blaster; no invented RF DPs
- Sources: zigbee2mqtt#32756, zigbee2mqtt#32836, P2271

### `p2271-kq1l5eu5-moes-curtain` → `wall_curtain_switch`

- Couple: `_TZE284_kq1l5eu5` + TS0601
- Protocol: tuya_dp
- Z2M local pids for mfr: (none in dump) 
- Compound `_TZE284_kq1l5eu5|TS0601`: tuya_dp  Z2M#31244 Moes SFC02 curtain switch; soft pending full DP map
- Compose: class=curtain eps=1 EF00=false IAS=false batteries=mains?
- Notes: Z2M#31244 Moes SFC02 curtain wall switch — soft lock pending full DP map
- Sources: zigbee2mqtt#31244, P2271

### `p2272-bjoccxbi-rgb-cct` → `led_controller_rgb`

- Couple: `_TZE284_bjoccxbi` + TS0601
- Protocol: tuya_dp
- Z2M local pids for mfr: (none in dump) 
- Compound `_TZE284_bjoccxbi|TS0601`: tuya_dp DP {"1":"onoff","2":"dim/1000","3":"light_temperature","5":"light_hue"} Z2M#32594 RGB+CCT; MCU brightness 0-1000
- Compose: class=light eps=1 EF00=false IAS=false batteries=mains?
- Notes: Z2M#32594 RGB+CCT controller; brightness MCU 0-1000
- Sources: zigbee2mqtt#32594, P2272

### `p2272-lq0ffndf-dual-gpo-usb` → `usb_outlet_advanced`

- Couple: `_TZE284_lq0ffndf` + TS0601
- Protocol: tuya_dp
- Z2M local pids for mfr: (none in dump) 
- Compound `_TZE284_lq0ffndf|TS0601`: tuya_dp DP {"1":"onoff","2":"onoff.gang2","20":"meter_power/1000","21":"measure_current/1000","22":"measure_power/10","23":"measure_voltage/10","101":"child_lock"} Z2M#32901 MG-AU03GPOZLP; live-tested DPs
- Compose: class=socket eps=1 EF00=true IAS=false batteries=mains?
- Notes: Z2M#32901 MakeGood dual GPO+USB-C; DPs 1/2/20-23/101 live-tested
- Sources: zigbee2mqtt#32901, P2272

### `p2272-hdc8bbha-ts000f-relay` → `switch_1gang`

- Couple: `_TZ3218_hdc8bbha` + TS000F
- Protocol: zcl
- Z2M local pids for mfr: TS000F ✓ overlap
- Compound `_TZ3218_hdc8bbha|TS000F`: zcl  ZHA#5241 QS-Zigbee-SEC01-DC; magic + onOff 0x8001/0x8002; not 7fiyo3kv temp hybrid
- Compose: class=socket eps=1 EF00=false IAS=false batteries=mains?
- Notes: ZHA#5241 1-gang relay — magic enchantment; NOT 7fiyo3kv temp hybrid
- Sources: zha-device-handlers#5241, P2272

### `p2273-guvc7pdy-curtain-not-1gang` → `curtain_motor`

- Couple: `_TZE204_guvc7pdy` + TS0601
- Protocol: tuya_dp
- Z2M local pids for mfr: TS0601 ✓ overlap
- Compound `_TZE204_guvc7pdy|TS0601`: tuya_dp  ZHA#5140 Moes curtain; forbid switch_1gang
- Compound `_TZE200_guvc7pdy|TS0601`: tuya_dp  TZE200 sibling curtain
- Compose: class=windowcoverings eps=1 EF00=true IAS=false batteries=OTHER
- Notes: ZHA#5140 Moes curtain motor — was cartesian-stolen by switch_1gang
- Sources: zha-device-handlers#5140, P2273

### `p2273-hdml1aav-soil-zs300tf` → `soil_sensor`

- Couple: `_TZE284_hdml1aav` + TS0601
- Protocol: tuya_dp
- Z2M local pids for mfr: TS0601 ✓ overlap
- Compound `_TZE284_hdml1aav|TS0601`: tuya_dp  ZHA#5276 ZS-300TF/ZS-301; DP15 battery
- Compound `_TZE2841000000_hdml1aav|TS0601`: tuya_dp  Corrupt interview mfr form
- Compose: class=sensor eps=1 EF00=true IAS=false batteries=AAA/CR2032/CR2450
- Notes: ZHA#5276 Excellux ZS-300TF/ZS-301 soil fertility
- Sources: zha-device-handlers#5276, P2273

### `p2274-6cmeijtd-nous-a11z-strip` → `socket_power_strip`

- Couple: `_TZ3210_6cmeijtd` + TS011F
- Protocol: zcl
- Z2M local pids for mfr: (none in dump) 
- Compound `_TZ3210_6cmeijtd|TS011F`: zcl  Nous A11Z 3-gang strip — magic packet + multi-ep; not usb_dongle_triple (Z2M#30799)
- Compose: class=socket eps=3 EF00=false IAS=false batteries=mains?
- Notes: Nous A11Z 3-gang power strip — magic packet + multi-ep; Z2M#30799 / ZHA#5185
- Sources: zigbee2mqtt#30799, zha-device-handlers#5185, P2274

### `p2276-rccxox8p-smoke-not-climate` → `smoke_sensor2`

- Couple: `_TZE284_rccxox8p` + TS0601
- Protocol: hybrid
- Z2M local pids for mfr: TS0601 ✓ overlap
- Compound `_TZE284_rccxox8p|TS0601`: hybrid  ZHA#4687 PA-44Z smoke IAS+EF00 battery DP15 — NOT climate (P2276)
- Compound `_TZE200_rccxox8p|TS0601`: hybrid  PA-44Z sibling
- Compound `_TZE204_rccxox8p|TS0601`: hybrid
- Compose: class=sensor eps=1 EF00=true IAS=false batteries=AAA/AAA
- Notes: ZHA#4687 PA-44Z smoke IAS+EF00 DP15 battery — was stolen by climate_sensor
- Sources: zha-device-handlers#4687, P2276

### `p2276-dikb3dp6-3phase-not-climate` → `energy_meter_3phase`

- Couple: `_TZE284_dikb3dp6` + TS0601
- Protocol: tuya_dp
- Z2M local pids for mfr: TS0601 ✓ overlap
- Compound `_TZE284_dikb3dp6|TS0601`: tuya_dp  ZHA#3955 Zemismart 3-phase DIN meter — NOT climate (P2276)
- Compound `_TZE200_dikb3dp6|TS0601`: tuya_dp
- Compound `_TZE204_dikb3dp6|TS0601`: tuya_dp
- Compose: class=sensor eps=1 EF00=true IAS=false batteries=mains?
- Notes: ZHA#3955 Zemismart 3-phase energy meter — was stolen by climate_sensor
- Sources: zha-device-handlers#3955, P2276

### `p2277-lpedvtvr-thermostat-not-climate` → `wall_thermostat`

- Couple: `_TZE204_lpedvtvr` + TS0601
- Protocol: tuya_dp
- Z2M local pids for mfr: (none in dump) 
- Compound `_TZE204_lpedvtvr|TS0601`: tuya_dp  ZHA#3666 Moes Star Ring — NOT climate (P2277)
- Compose: class=thermostat eps=1 EF00=true IAS=false batteries=mains?
- Notes: ZHA#3666 Moes Star Ring thermostat — was stolen by climate_sensor
- Sources: zha-device-handlers#3666, P2277

### `p2277-xalsoe3m-bht002-not-trv` → `wall_thermostat`

- Couple: `_TZE204_xalsoe3m` + TS0601
- Protocol: tuya_dp
- Z2M local pids for mfr: TS0601 ✓ overlap
- Compound `_TZE204_xalsoe3m|TS0601`: tuya_dp  Z2M#25372 BHT-002 sibling aoclfnxz — NOT TRV (P2277)
- Compose: class=thermostat eps=1 EF00=true IAS=false batteries=mains?
- Notes: Z2M#25372 Moes BHT-002 sibling of aoclfnxz — was on TRV driver
- Sources: zigbee2mqtt#25372, zha-device-handlers#3788, P2277

### `p2277-te34fjg4-ts1002-scene4` → `scene_switch_4`

- Couple: `_TZ3000_te34fjg4` + TS1002
- Protocol: zcl
- Z2M local pids for mfr: (none in dump) 
- Compound `_TZ3000_te34fjg4|TS1002`: zcl  ZHA#5224 Arlight 4-scene 0xFD panel — not bulb (P2277)
- Compose: class=button eps=4 EF00=false IAS=false batteries=CR2450/AAA
- Notes: ZHA#5224 Arlight 4-button scene panel 0xFD — mains, strip phantom battery
- Sources: zha-device-handlers#5224, P2277

### `p2278-ogx8u5z6-trv-cal-tenths` → `device_radiator_valve`

- Couple: `_TZE204_ogx8u5z6` + TS0601
- Protocol: tuya_dp
- Z2M local pids for mfr: TS0601 ✓ overlap
- Compound `_TZE204_ogx8u5z6|TS0601`: tuya_dp  P2278 me167/thermostat_3 DPs + cal DP47 /10 (ZHA#4124)
- Compound `_TZE284_ogx8u5z6|TS0601`: tuya_dp  P2278 sibling ogx8u5z6
- Compose: class=thermostat eps=1 EF00=false IAS=false batteries=AA
- Notes: P2278 me167 profile + DP47 cal ÷10 (ZHA#4124 / Z2M#25199 user firmware); other ME167 stay whole °C
- Sources: zha-device-handlers#4124, zigbee2mqtt#25199, P2278

### `p2279-1fuxihti-cover-not-climate` → `curtain_motor`

- Couple: `_TZE200_1fuxihti` + TS0601
- Protocol: tuya_dp
- Z2M local pids for mfr: TS0601 ✓ overlap
- Compound `_TZE200_1fuxihti|TS0601`: tuya_dp  P2279 cover — unsteal climate
- Compound `_TZE204_1fuxihti|TS0601`: tuya_dp  P2279 cover sibling
- Compound `_TZE284_1fuxihti|TS0601`: tuya_dp  P2279 Z2M cover; was climate steal
- Compose: class=windowcoverings eps=1 EF00=true IAS=false batteries=OTHER
- Notes: Z2M cover family — TZE284 sibling was stolen by climate_sensor
- Sources: zigbee-herdsman-converters tuya TS0601_cover, P2279

### `p2279-mvtclclq-usb-not-dimmer` → `usb_outlet_advanced`

- Couple: `_TZE204_mvtclclq` + TS0601
- Protocol: tuya_dp
- Z2M local pids for mfr: TS0601 ✓ overlap
- Compound `_TZE204_mvtclclq|TS0601`: tuya_dp DP {"1":"onoff.usb1","2":"onoff.usb2","3":"onoff","4":"onoff.socket2"}
- Compound `_TZE284_mvtclclq|TS0601`: tuya_dp DP {"1":"onoff.usb1","2":"onoff.usb2","3":"onoff","4":"onoff.socket2"} Z2M DS-1450WN — forbid wall_dimmer. z2m#31275
- Compose: class=socket eps=1 EF00=true IAS=false batteries=mains?
- Notes: Z2M DS-1450WN BSEED 2plug+2USB — TZE200 was wrongly on wall_dimmer
- Sources: zigbee2mqtt#31275, zigbee2mqtt#28937, P2279

### `p2291-ogkdpgy2-co2-not-climate` → `air_quality_co2`

- Couple: `_tze200_ogkdpgy2` + TS0601
- Protocol: tuya_ef00
- Z2M local pids for mfr: TS0601 ✓ overlap
- Compound `_TZE200_ogkdpgy2|TS0601`: tuya_dp DP {"2":"measure_co2"} Z2M DCR-LCD NDIR CO2 — Elliot #2204; forbid climate_sensor
- Compound `_TZE204_ogkdpgy2|TS0601`: tuya_dp DP {"2":"measure_co2"} Z2M#24858 mains router CO2-only DP2 — forum T140352 #2204
- Compose: class=sensor eps=1 EF00=true IAS=false batteries=AAA/OTHER
- Notes: P2295: zigbee pid=TS0601 only. Retail/Z2M names stay in deviceNames — never CK-TLSR climate bleed, never TS0601_co2 as Homey productId.
- Sources: forum-140352-2204, Z2M#24858, Z2M-PR-8354, P2291, p2291-ogkdpgy2-co2-not-climate, P2295, TS0601_co2_sensor, TS0601_TZE204_ogkdpgy2, DCR-LCD

### `p2282-mrpevh8p-ts0041-button` → `button_wireless_1`

- Couple: `_tz3000_mrpevh8p` + TS0041
- Protocol: zcl
- Z2M local pids for mfr: (none in dump) 
- Compound `_TZ3000_mrpevh8p|TS0041`: zcl  P2285 Z2M SH-SC07/Johan#1120; 0xFD scene; skip 0x8004; magic packet; no EF00; battery EP1 only
- Compose: class=button eps=1 EF00=true IAS=true batteries=CR2032/CR2450
- Notes: P2295: zigbee pid=TS0041 only. SH-SC07/RSH-SC021 are whiteLabels. Interview may show phantom EP2–4 — still 1 physical button.
- Sources: forum-140352-2202, diag-95a7c6e5, zigbee-herdsman-converters#6225, JohanBendz#1120, Hubitat-kkossev-TS004F, Z2M-TS0041-SH-SC07, P2282, P2285, p2282-mrpevh8p-ts0041-button, P2295, TS0041, SH-SC07

### `p2285-sh-sc07-siblings-ts0041` → `button_wireless_1`

- Couple: `_TZ3000_5bpeda8u` + TS0041
- Protocol: zcl
- Z2M local pids for mfr: (none in dump) 
- Compound `_TZ3000_5bpeda8u|TS0041`: zcl  P2285 Z2M whitelabel SH-SC07 sibling of mrpevh8p
- Compound `_TZ3000_b4awzgct|TS0041`: zcl  P2285 was button_wireless_4_ts0041 misroute — Z2M 1-button SH-SC07
- Compose: class=button eps=1 EF00=true IAS=true batteries=CR2032/CR2450
- Notes: Z2M whitelabel SH-SC07 same as mrpevh8p — 1-button not 4_ts0041
- Sources: zigbee2mqtt-TS0041-whitelabel, P2285

### `p2282-hobeian-3315s-water-not-soil` → `water_leak_sensor`

- Couple: `HOBEIAN` + 3315-S, 3315-Seu
- Protocol: ias_zone
- Z2M local pids for mfr: CK-BL702-MWS-01(7016) 
- Compound `HOBEIAN|3315-S`: ias_zone  P2282 diag 95a7c6e5; IAS water — not soil/rain
- Compound `HOBEIAN|3315-Seu`: ias_zone  P2282 EU sibling of 3315-S under HOBEIAN brand interview
- Compose: class=sensor eps=1 EF00=false IAS=true batteries=CR2032/CR2450/AAA
- Notes: Peter #2202 diag 95a7c6e5 — false MISATTR soil via rain placement. Keep water_leak; never invent k4ej pid onto this tile.
- Sources: forum-140352-2202, diag-95a7c6e5, P2282

### `p2293-zemismart-68nvbio9-curtain-not-trv` → `curtain_motor`

- Couple: `_tze200_68nvbio9` + TS0601
- Protocol: tuya_ef00
- Z2M local pids for mfr: TS0601 ✓ overlap
- Compose: class=windowcoverings eps=1 EF00=true IAS=false batteries=OTHER
- Notes: P2295: Zigbee pid=TS0601; ZM16EL* are retail aliases not productIds.
- Sources: Z2M#29124, Z2M#28655, forum-154092, P2293, p2293-zemismart-68nvbio9-curtain-not-trv, P2295, ZM16EL, TS0601_cover
- **Gaps:** no_compound_db_key

### `p2293-zemismart-cf1sl3tj-curtain-not-trv` → `curtain_motor`

- Couple: `_tze200_cf1sl3tj` + TS0601
- Protocol: tuya_ef00
- Z2M local pids for mfr: TS0601 ✓ overlap
- Compose: class=windowcoverings eps=1 EF00=true IAS=false batteries=OTHER
- Notes: P2295: Zigbee pid=TS0601; ZM85EL-2Z is retail alias.
- Sources: Z2M#18413, forum-154092, P2293, p2293-zemismart-cf1sl3tj-curtain-not-trv, P2295, ZM85EL-2Z, TS0601_cover
- **Gaps:** no_compound_db_key

### `p2293-dfgbtub0-ts0044-wireless-4` → `button_wireless_4`

- Couple: `_TZ3000_dfgbtub0` + TS0044
- Protocol: zcl
- Z2M local pids for mfr: (none in dump) 
- Compose: class=button eps=4 EF00=false IAS=false batteries=CR2032/CR2450/AAA
- Notes: SunBeech Moes T156967 — TS0044 = 4-gang remote; TS0042 stays on button_wireless_2
- Sources: forum-156967-12, P2293
- **Gaps:** no_compound_db_key

### `p2295-3ejwxpmu-co2-sibling` → `air_quality_co2`

- Couple: `_tze200_3ejwxpmu` + TS0601
- Protocol: tuya_ef00
- Z2M local pids for mfr: TS0601 ✓ overlap
- Compose: class=sensor eps=1 EF00=true IAS=false batteries=AAA/OTHER
- Notes: P2295: Z2M same fingerprint group as ogkdpgy2 CO2 — not climate_sensor cartesian bleed.
- Sources: p2295-3ejwxpmu-co2-sibling, P2295, TS0601_co2_sensor
- **Gaps:** no_compound_db_key

### `p2295-zemismart-68nvbi09-typo-curtain` → `curtain_motor`

- Couple: `_tze200_68nvbi09` + TS0601
- Protocol: tuya_ef00
- Z2M local pids for mfr: TS0601 ✓ overlap
- Compose: class=windowcoverings eps=1 EF00=true IAS=false batteries=OTHER
- Notes: P2295: Z2M fingerprint typo sibling of 68nvbio9 — cover not TRV.
- Sources: p2295-zemismart-68nvbi09-typo-curtain, P2295, ZM16EL, TS0601_cover
- **Gaps:** no_compound_db_key

### `p2295-zemismart-cover-siblings` → `curtain_motor`

- Couple: `_tze200_9p5xmj5r` + TS0601
- Protocol: tuya_ef00
- Z2M local pids for mfr: TS0601 ✓ overlap
- Compose: class=windowcoverings eps=1 EF00=true IAS=false batteries=OTHER
- Notes: P2295: Z2M cover fingerprint siblings of 68nvbio9/cf1sl3tj — each couple keeps pid TS0601 only.
- Sources: p2295-zemismart-cover-siblings, P2295, TS0601_cover, ZM16EL, ZM85EL-2Z
- **Gaps:** no_compound_db_key

### `p2297-m6lwazh9-tze210-ts0301-curtain` → `curtain_motor`

- Couple: `_TZE210_m6lwazh9` + TS0301
- Protocol: tuya_ef00
- Z2M local pids for mfr: TS0301 ✓ overlap
- Compose: class=windowcoverings eps=1 EF00=true IAS=false batteries=OTHER
- Notes: Z2M #30273 A-OK AM25 blind — battery DP13; never switch_1gang
- Sources: Z2M#30273, P2297
- **Gaps:** no_compound_db_key

### `p2297-m6lwazh9-tze200-ts0601-curtain` → `curtain_motor`

- Couple: `_TZE200_m6lwazh9` + TS0601
- Protocol: tuya_ef00
- Z2M local pids for mfr: (none in dump) 
- Compose: class=windowcoverings eps=1 EF00=true IAS=false batteries=OTHER
- Notes: Forum T154092 Zemismart Official — cover couple; strip from switch_1gang cartesian bleed
- Sources: forum-154092-26, P2297
- **Gaps:** no_compound_db_key

### `p2297-t9ynfz4x-ts0225-mmwave` → `motion_sensor_radar_mmwave`

- Couple: `_TZ3218_t9ynfz4x` + TS0225
- Protocol: zcl
- Z2M local pids for mfr: (none in dump) 
- Compound `_TZ3218_t9ynfz4x|TS0225`: hybrid  P2261: settings via 0xE002 attrs 57348/57349/57355 (fallback 0xE001) + DP101 fading
- Compose: class=sensor eps=1 EF00=true IAS=true batteries=mains?
- Notes: A_Tas T158757/T140352 — Linptech-class mmWave; posts without pid stay soft; never invent pid
- Sources: forum-158757, forum-140352-2199, P2297

### `p2304-moes-zts-eur-c-curtain` → `curtain_motor`

- Couple: `_TZE200_127x7wnl` + TS0601
- Protocol: unknown
- Z2M local pids for mfr: (none in dump) 
- Compound `_TZE200_127x7wnl|TS0601`: tuya_dp  Moes ZTS-EUR-C family
- Compound `_TZE200_nhyj64w2|TS0601`: tuya_dp  Moes ZTS-EUR-C family
- Compound `_TZE204_5slehgeo|TS0601`: tuya_dp  GitHub #533 Moes ZTS-EUR-C; forbid radiator/generic
- Compound `_TZE284_5slehgeo|TS0601`: tuya_dp  TZE284 sibling ZTS-EUR-C
- Compose: class=windowcoverings eps=1 EF00=true IAS=false batteries=OTHER
- Notes: P2324: Moes ZTS-EUR-C curtain. Expand TRV/generic forbids (coupleMode). Do NOT forbid wall_thermostat — strip_pid would gut TS0601 there.
- **Gaps:** no_sources, not_in_local_z2m_fps

### `p2307-moes-star-feather-upt8lzi0` → `curtain_motor`

- Couple: `_TZE284_upt8lzi0` + TS0601
- Protocol: unknown
- Z2M local pids for mfr: (none in dump) 
- Compose: class=windowcoverings eps=1 EF00=true IAS=false batteries=OTHER
- Notes: Moes Star Feather curtain. DPs same family as ZTS-EUR-C.
- **Gaps:** no_compound_db_key, no_sources, not_in_local_z2m_fps

### `p2312-a4xycprs-ts0044-scene` → `scene_switch_4`

- Couple: `_TZ3000_a4xycprs` + TS0044
- Protocol: unknown
- Z2M local pids for mfr: (none in dump) 
- Compose: class=button eps=4 EF00=false IAS=false batteries=CR2450/AAA
- Notes: P2312 market: Z2M scene remote — not wall switch_4gang
- **Gaps:** no_compound_db_key, no_sources, not_in_local_z2m_fps

### `p2312-jthf7vb6-ts0601-water` → `water_leak_sensor`

- Couple: `_TZE200_jthf7vb6` + TS0601
- Protocol: unknown
- Z2M local pids for mfr: TS0601 ✓ overlap
- Compound `_TZE200_jthf7vb6|TS0601`: tuya_dp DP {"1":"alarm_water"}
- Compose: class=sensor eps=1 EF00=false IAS=true batteries=CR2032/CR2450/AAA
- Notes: P2312: mfr was on water_leak without TS0601 pid
- **Gaps:** no_sources

### `p2317-cvis4qmw-ts0006-6gang` → `switch_wall_6gang`

- Couple: `_TZ3000_cvis4qmw` + TS0006
- Protocol: unknown
- Z2M local pids for mfr: (none in dump) 
- Compose: class=socket eps=6 EF00=true IAS=false batteries=OTHER
- Notes: Market said switch_4gang; Z2M binds EP1-6. P2318: enrichment-first — do not strip shared pids; mfr may remain on other drivers when forbidden pid absent.
- **Gaps:** no_compound_db_key, no_sources, not_in_local_z2m_fps

### `p2317-g9chy2ib-ts0003-3gang` → `wall_switch_3gang_1way`

- Couple: `_TZ3000_g9chy2ib` + TS0003
- Protocol: unknown
- Z2M local pids for mfr: TS0003 ✓ overlap
- Compose: class=socket eps=3 EF00=false IAS=false batteries=mains?
- Notes: Market wrongly said wall_thermostat; Z2M=3-gang backlight. P2318: enrichment-first — do not strip shared pids; mfr may remain on other drivers when forbidden pid absent.
- **Gaps:** no_compound_db_key, no_sources

### `p2317-etufnltx-ts1002-foria` → `button_wireless_4`

- Couple: `_TZ3000_etufnltx` + TS1002
- Protocol: unknown
- Z2M local pids for mfr: TS1002 ✓ overlap
- Compose: class=button eps=4 EF00=false IAS=false batteries=CR2032/CR2450/AAA
- Notes: Battery dimmer/scene remote — not wall switch. P2318: enrichment-first — do not strip shared pids; mfr may remain on other drivers when forbidden pid absent.
- **Gaps:** no_compound_db_key, no_sources

### `p2347-gabriel-zemismart-cartesian-doc-only` → `wall_switch_1gang_1way`

- Couple: `?` + 
- Protocol: zcl
- Z2M local pids for mfr: (none in dump) 
- Compose: class=socket eps=1 EF00=false IAS=false batteries=mains?
- Notes: P2351: DOC ONLY — forum #2173 Cartesian OEM dump must NEVER become a multi-mfr/multi-pid registry_force (was collapsing YWUBFUVT/KGXEJ1DV/JJDKHUEQ/YERVJNLJ onto wall_switch_1gang_1way with TS0001+2+3). Real locks stay per-couple: zemismart-ts0001-tb25-1, novadigital-ts0002-*, novadigital-ts0003-yervjnlj + publish-sacred-keep.
- Sources: forum-140352-2173, P2347, P2351
- **Gaps:** no_compound_db_key, compose_pid_mismatch

### `p2347-cam-smart-button-need-diag` → `button_wireless_1`

- Couple: `_TZ3000_5bpeda8u` + TS0041
- Protocol: zcl
- Z2M local pids for mfr: (none in dump) 
- Compound `_TZ3000_5bpeda8u|TS0041`: zcl  P2285 Z2M whitelabel SH-SC07 sibling of mrpevh8p
- Compose: class=button eps=1 EF00=true IAS=true batteries=CR2032/CR2450
- Notes: Cam T146735 #8 smart button couple ABSENT in post. Soft hypothesis 5bpeda8u+TS0041 NEED_DIAG. Motion is separate HOBEIAN+ZG-204ZL.
- Sources: forum-146735-8, INT-010, P2347

### `p2361-w0qqde0g-ts011f-plug-not-button` → `plug_energy_monitor`

- Couple: `_TZ3210_w0qqde0g` + TS011F
- Protocol: zcl
- Z2M local pids for mfr: (none in dump) 
- Compose: class=socket eps=1 EF00=false IAS=false batteries=mains?
- Notes: WHY(P2361/P2362): Gmail L3 couple _TZ3210_w0qqde0g+TS011F. Z2M TS011F_plug_3. Strip ALL pairing-case forms from button drivers (anti-bot re-bleed).
- Sources: gmail-l3-2026-09-01, z2m-TS011F_plug_3, P2361
- **Gaps:** no_compound_db_key

### `p2363-curtain-ef00-hybrid-timeout` → `curtain_motor`

- Couple: `_TZE204_a2jcoyuk` + TS0601
- Protocol: tuya_ef00
- Z2M local pids for mfr: TS0601 ✓ overlap
- Compound `_TZE284_libht6ua|TS0601`: tuya_dp DP {"1":"windowcoverings_state","2":"windowcoverings_set/100","3":"windowcoverings_set/100","5":"reverse_direction","13":"measure_battery"} Roller blind motor sibling to fodv6bkr
- Compound `_tze284_libht6ua|TS0601`: tuya_dp DP {"1":"windowcoverings_state","2":"windowcoverings_set/100","3":"windowcoverings_set/100","5":"reverse_direction","13":"measure_battery"} Roller blind motor sibling to fodv6bkr
- Compose: class=windowcoverings eps=1 EF00=true IAS=false batteries=OTHER
- Notes: WHY(P2363): diag 05867379 @ 9.0.750 curtain timeout — couple ABSENT in log (do not invent). Soft-create TuyaEF00Manager + optimistic windowcoverings after TX; HybridProtocolManager never disables cover drivers. Harvest Z2M cover motors (mfr+TS0601 only); strip tilt r0jdjrvi from curtain_motor.
- Sources: diag-05867379, z2m-herdsman-cover, P2363

### `p2385-lerlink-r32ctezx-fan-switch` → `fan_controller`

- Couple: `_TZE200_r32ctezx` + TS0601
- Protocol: tuya_ef00
- Retail: Lerlink T2-Z67, Lerlink T2-W67, TS0601_fan_switch
- Z2M local pids for mfr: TS0601 ✓ overlap
- Compose: class=fan eps=1 EF00=true IAS=false batteries=mains?
- Notes: GitHub #536 — Z2M/Blakadder Lerlink 5-speed fan. Was wrongly on water_valve_smart. DP1 on/off, DP3 enum 0-4.
- Sources: z2m:TS0601_fan_switch, blakadder:Lerlink_T2-Z67, github#536, P2385
- **Gaps:** no_compound_db_key

### `tz3000-uw3dadam-ts0202-motion` → `motion_sensor`

- Couple: `_TZ3000_uw3dadam` + TS0202
- Protocol: ias_zone
- Z2M local pids for mfr: (none in dump) 
- Compose: class=sensor eps=1 EF00=false IAS=false batteries=mains?
- Notes: P2402 Gmail unmatched: deCONZ/Z2S IAS TS0202 presence/motion clone — lock motion_sensor only (never invent other pids)
- Sources: gmail-unmatched-fp, deconz#8503, z2s-TS0202
- **Gaps:** no_compound_db_key

### `p2405-0ints6wl-soil-not-curtain` → `soil_sensor`

- Couple: `_TZE284_0ints6wl` + TS0601
- Protocol: tuya_ef00
- Z2M local pids for mfr: TS0601 ✓ overlap
- Compound `_TZE284_0ints6wl|TS0601`: tuya_dp DP {"3":"measure_humidity.soil","5":"measure_temperature/10","15":"measure_battery"} GitHub #428 solid moisture sensor
- Compose: class=sensor eps=1 EF00=true IAS=false batteries=AAA/CR2032/CR2450
- Notes: GH #428 closed — Z2M soil TS0601; was wrongly on curtain_motor
- Sources: issue-428, P2405, z2m-pr-11576

### `p2405-e3oitdyu-dimmer-2gang` → `dimmer_2_gang_tuya`

- Couple: `_TZE200_e3oitdyu` + TS0601
- Protocol: tuya_ef00
- Z2M local pids for mfr: TS0601 ✓ overlap
- Compose: class=socket eps=1 EF00=true IAS=false batteries=mains?
- Notes: GH #88 Moes 2-gang dimmer
- Sources: issue-88, P2405, z2m
- **Gaps:** no_compound_db_key

### `p2405-uj3f4wr5-curtain-motor` → `curtain_motor`

- Couple: `_TZE200_uj3f4wr5` + TS0601
- Protocol: tuya_ef00
- Z2M local pids for mfr: (none in dump) 
- Compose: class=windowcoverings eps=1 EF00=true IAS=false batteries=OTHER
- Notes: GH #79 curtain motor
- Sources: issue-79, P2405
- **Gaps:** no_compound_db_key

### `p2405-u3nv1jwk-button-wireless-4` → `button_wireless_4`

- Couple: `_TZ3000_u3nv1jwk` + TS0044
- Protocol: zcl
- Z2M local pids for mfr: (none in dump) 
- Compound `_TZ3000_u3nv1jwk|TS0044`: zcl  Homey forum TS0044 4-button remote, E000/DP action path
- Compose: class=button eps=4 EF00=false IAS=false batteries=CR2032/CR2450/AAA
- Notes: GH #76 / PECULIARITIES TM-YKQ004
- Sources: issue-76, P2405

### `p2405-otvn3lne-motion-ts0202` → `motion_sensor`

- Couple: `_TZ3000_otvn3lne` + TS0202
- Protocol: ias_zone
- Z2M local pids for mfr: (none in dump) 
- Compose: class=sensor eps=1 EF00=false IAS=false batteries=mains?
- Notes: GH #164 ZMS02 motion
- Sources: issue-164, P2405
- **Gaps:** no_compound_db_key

### `p2405-81yrt3lo-power-clamp` → `power_clamp_meter`

- Couple: `_TZE204_81yrt3lo` + TS0601
- Protocol: tuya_ef00
- Z2M local pids for mfr: TS0601 ✓ overlap
- Compose: class=sensor eps=1 EF00=true IAS=false batteries=mains?
- Notes: GH #318/#323 PJ-1203A — full mfr 81yrt3lo only (truncated 81yrt3l removed)
- Sources: issue-318, issue-323, P2405, z2m
- **Gaps:** no_compound_db_key

### `p2405-tgvtvdoc-rain-sensor` → `rain_sensor`

- Couple: `_TZ3210_tgvtvdoc` + TS0207
- Protocol: ias_zone
- Z2M local pids for mfr: TS0207 ✓ overlap
- Compose: class=sensor eps=1 EF00=true IAS=true batteries=AAA/AA/CR123A
- Notes: GH #388 RB-SRAIN01 — already on rain_sensor; truncated tgvtvdo on water_detector never matches
- Sources: issue-388, P2405, z2m
- **Gaps:** no_compound_db_key

### `p2415-zg204zv-tze200-presence` → `presence_sensor_radar`

- Couple: `?` + 
- Protocol: unknown
- Z2M local pids for mfr: (none in dump) 
- Compose: class=sensor eps=1 EF00=true IAS=false batteries=CR2032/CR2450/AAA/AA/CR123A/INTERNAL
- Sources: Z2M ZG-204ZV, ZHA #4268
- **Gaps:** no_compound_db_key, compose_pid_mismatch

### `p2415-zs301z-soil` → `soil_sensor`

- Couple: `?` + 
- Protocol: unknown
- Z2M local pids for mfr: (none in dump) 
- Compose: class=sensor eps=1 EF00=true IAS=false batteries=AAA/CR2032/CR2450
- Sources: Z2M #27955
- **Gaps:** no_compound_db_key, compose_pid_mismatch

### `hobeian-zg204zh-tze` → `presence_sensor_radar`

- Couple: `_TZE200_vuqzj1ej` + TS0601, ZG-204ZH, AY208Z
- Protocol: tuya_ef00
- Z2M local pids for mfr: TS0601 ✓ overlap
- Compound `_TZE200_vuqzj1ej|TS0601`: tuya_dp  P2421 Z2M ZG-204ZH — was climate cartesian
- Compound `_TZE200_hdih4foa|TS0601`: tuya_dp  P2421 Z2M ZG-204ZH — was climate cartesian
- Compose: class=sensor eps=1 EF00=true IAS=false batteries=CR2032/CR2450/AAA/AA/CR123A/INTERNAL
- Notes: Z2M ZG-204ZH: vuqzj1ej/hdih4foa + TS0601 — presence+temp+humid+lux. Not climate catch-all.
- Sources: z2m-tuya.ts-ZG-204ZH, P2421

### `hobeian-zg204zm-tze` → `presence_sensor_radar`

- Couple: `_TZE200_2aaelwxk` + TS0601, ZG-204ZM, AY205Z, TS0225
- Protocol: tuya_ef00
- Z2M local pids for mfr: TS0225, TS0601 ✓ overlap
- Compound `_TZE200_2aaelwxk|TS0601`: tuya_dp  P2421 Z2M ZG-204ZM
- Compound `_TZE200_kb5noeto|TS0601`: tuya_dp  P2421 Z2M ZG-204ZM
- Compound `_TZE200_tyffvoij|TS0601`: tuya_dp  P2421 Z2M ZG-204ZM
- Compound `_TZE200_yflzeeqj|TS0601`: tuya_dp  P2421 Z2M ZG-204ZM — was climate cartesian
- Compose: class=sensor eps=1 EF00=true IAS=false batteries=CR2032/CR2450/AAA/AA/CR123A/INTERNAL
- Notes: Z2M ZG-204ZM: 2aaelwxk/kb5noeto/tyffvoij/yflzeeqj — PIR+24GHz. DP2=static sens, DP4=static dist/100.
- Sources: z2m-tuya.ts-ZG-204ZM, P2421

### `hobeian-zg302zm-sensing-switch` → `presence_sensor_radar`

- Couple: `_TZE200_kccdzaeo` + TS0601, ZG-302ZM
- Protocol: tuya_ef00
- Z2M local pids for mfr: TS0601 ✓ overlap
- Compound `_TZE200_kccdzaeo|TS0601`: tuya_dp  P2421 Z2M ZG-302ZM — was vibration cartesian
- Compound `_TZE200_s7rsrtbg|TS0601`: tuya_dp  P2421 Z2M ZG-302ZM
- Compound `_TZE200_tmszbtzq|TS0601`: tuya_dp  P2421 Z2M ZG-302ZM
- Compound `_TZE200_bfmfhxra|TS0601`: tuya_dp  P2421 Z2M ZG-302ZM
- Compound `_TZE200_ahpcyzth|TS0601`: tuya_dp  P2421 Z2M ZG-302ZM
- Compound `_TZE200_kijxnb8q|TS0601`: tuya_dp  P2421 Z2M ZG-302ZM
- Compose: class=sensor eps=1 EF00=true IAS=false batteries=CR2032/CR2450/AAA/AA/CR123A/INTERNAL
- Notes: Z2M ZG-302ZM motion sensing switch: presence + switch1/2/3 DPs. Not vibration/clamp.
- Sources: z2m-tuya.ts-ZG-302ZM, P2421

### `hobeian-zg302zl-sensing-switch` → `presence_sensor_radar`

- Couple: `_TZE200_khzbklyh` + TS0601, ZG-302ZL
- Protocol: tuya_ef00
- Z2M local pids for mfr: TS0601 ✓ overlap
- Compound `_TZE200_khzbklyh|TS0601`: tuya_dp  P2421 Z2M ZG-302ZL — was vibration cartesian
- Compound `_TZE200_df04ghrb|TS0601`: tuya_dp  P2421 Z2M ZG-302ZL
- Compound `_TZE200_toeldckg|TS0601`: tuya_dp  P2421 Z2M ZG-302ZL
- Compound `_TZE200_cqtamhh5|TS0601`: tuya_dp  P2421 Z2M ZG-302ZL
- Compound `_TZE200_xlnzk169|TS0601`: tuya_dp  P2421 Z2M ZG-302ZL
- Compound `_TZE200_llvwkkde|TS0601`: tuya_dp  P2421 Z2M ZG-302ZL
- Compose: class=sensor eps=1 EF00=true IAS=false batteries=CR2032/CR2450/AAA/AA/CR123A/INTERNAL
- Notes: Z2M ZG-302ZL motion sensing switch: DP101 presence, DP1-3 switches. Not vibration/clamp.
- Sources: z2m-tuya.ts-ZG-302ZL, P2421

### `hobeian-zg102zm-vibration-contact` → `vibration_sensor`

- Couple: `_TZE200_jfw0a4aa` + TS0601, ZG-102ZM, AY02SZ
- Protocol: tuya_ef00
- Z2M local pids for mfr: TS0601 ✓ overlap
- Compound `_TZE200_jfw0a4aa|TS0601`: tuya_dp  P2422 ZG-102ZM
- Compound `_TZE200_wzk0x7fq|TS0601`: tuya_dp  P2422 ZG-102ZM
- Compose: class=sensor eps=1 EF00=false IAS=false batteries=CR2032/CR2450
- Notes: Z2M ZG-102ZM: DP1 vibration, DP101 contact inverse, DP4 battery, DP6 sensitivity.
- Sources: z2m-ZG-102ZM, P2422

### `hobeian-zg103z-vibration-tilt` → `vibration_sensor`

- Couple: `_TZE200_iba1ckek` + TS0601, ZG-103Z
- Protocol: tuya_ef00
- Z2M local pids for mfr: TS0601 ✓ overlap
- Compound `_TZE200_iba1ckek|TS0601`: tuya_dp  P2422 ZG-103Z
- Compose: class=sensor eps=1 EF00=false IAS=false batteries=CR2032/CR2450
- Notes: Z2M ZG-103Z: vibration+tilt+xyz; not illuminance presence.
- Sources: z2m-ZG-103Z, P2422

### `hobeian-zg226z-water-alarm` → `water_leak_sensor`

- Couple: `HOBEIAN` + ZG-226Z
- Protocol: tuya_ef00
- Z2M local pids for mfr: CK-BL702-MWS-01(7016) 
- Compound `HOBEIAN|ZG-226Z`: tuya_dp  P2422 water alarm
- Compose: class=sensor eps=1 EF00=false IAS=true batteries=CR2032/CR2450/AAA
- Notes: Z2M ZG-226Z water leak alarm with siren DPs.
- Sources: z2m-ZG-226Z, P2422

### `hobeian-zg228z-vibration-alarm` → `vibration_sensor`

- Couple: `HOBEIAN` + ZG-228Z
- Protocol: tuya_ef00
- Z2M local pids for mfr: CK-BL702-MWS-01(7016) 
- Compound `HOBEIAN|ZG-228Z`: tuya_dp  P2422 vibration alarm
- Compose: class=sensor eps=1 EF00=false IAS=false batteries=CR2032/CR2450
- Notes: Z2M ZG-228Z vibration alarm/siren.
- Sources: z2m-ZG-228Z, P2422

### `hobeian-zg301z-switch` → `switch_1gang`

- Couple: `HOBEIAN` + ZG-301Z, ZG-302Z1
- Protocol: unknown
- Z2M local pids for mfr: CK-BL702-MWS-01(7016) 
- Compound `HOBEIAN|ZG-301Z`: zcl  P2430 HOBEIAN 1-gang in-wall switch
- Compound `HOBEIAN|ZG-302Z1`: zcl  P2430 HOBEIAN 1-gang wall switch
- Compose: class=socket eps=1 EF00=false IAS=false batteries=mains?
- Notes: P2430: HOBEIAN 1-gang switch couple lock. Never cartesian to radar/soil/dimmer.
- **Gaps:** no_sources

### `hobeian-zg301z-2ch-switch` → `switch_2gang`

- Couple: `HOBEIAN` + ZG-301Z-2CH, ZG-302Z2
- Protocol: unknown
- Z2M local pids for mfr: CK-BL702-MWS-01(7016) 
- Compound `HOBEIAN|ZG-301Z-2CH`: zcl  P2430 HOBEIAN 2-gang in-wall switch
- Compound `HOBEIAN|ZG-302Z2`: zcl  P2430 HOBEIAN 2-gang wall switch
- Compose: class=socket eps=2 EF00=false IAS=false batteries=mains?
- Notes: P2430: HOBEIAN 2-gang switch couple lock.
- **Gaps:** no_sources

### `hobeian-zg302z3-switch` → `switch_3gang`

- Couple: `HOBEIAN` + ZG-302Z3
- Protocol: unknown
- Z2M local pids for mfr: CK-BL702-MWS-01(7016) 
- Compound `HOBEIAN|ZG-302Z3`: zcl  P2430 HOBEIAN 3-gang wall switch
- Compose: class=socket eps=3 EF00=false IAS=false batteries=mains?
- Notes: P2430: HOBEIAN 3-gang switch couple lock.
- **Gaps:** no_sources

### `hobeian-zg101zs-scene` → `scene_switch_4`

- Couple: `HOBEIAN` + ZG-101ZS
- Protocol: unknown
- Z2M local pids for mfr: CK-BL702-MWS-01(7016) 
- Compound `HOBEIAN|ZG-101ZS`: zcl  P2430 HOBEIAN Star Ring 4-gang scene switch
- Compose: class=button eps=4 EF00=false IAS=false batteries=CR2450/AAA
- Notes: P2430: HOBEIAN Star Ring 4-gang scene switch couple lock.
- **Gaps:** compose_pid_mismatch, no_sources

### `hobeian-zg229z-siren` → `siren`

- Couple: `HOBEIAN` + ZG-229Z
- Protocol: unknown
- Z2M local pids for mfr: CK-BL702-MWS-01(7016) 
- Compound `HOBEIAN|ZG-229Z`: tuya_dp  P2430 HOBEIAN smart siren light/sound
- Compose: class=other eps=1 EF00=false IAS=false batteries=OTHER/OTHER
- Notes: P2430: HOBEIAN smart siren couple lock.
- **Gaps:** compose_pid_mismatch, no_sources

### `hobeian-zg225z-gas` → `gas_sensor`

- Couple: `HOBEIAN` + ZG-225Z
- Protocol: unknown
- Z2M local pids for mfr: CK-BL702-MWS-01(7016) 
- Compound `HOBEIAN|ZG-225Z`: tuya_dp  P2430 HOBEIAN gas sensor
- Compose: class=sensor eps=1 EF00=true IAS=false batteries=mains?
- Notes: P2430: HOBEIAN gas sensor couple lock.
- **Gaps:** no_sources

### `p2432-dze200-dfxkcots-rotary-dimmer` → `wall_dimmer_tuya`

- Couple: `_TZE200_dfxkcots` + TS0601
- Protocol: tuya_dp
- Z2M local pids for mfr: TS0601 ✓ overlap
- Compound `_TZE200_dfxkcots|TS0601`: tuya_dp DP {"1":"onoff","2":"dim/1000"} Tuya TS0601 rotary smart dimmer
- Compound `_tze200_dfxkcots|TS0601`: tuya_dp DP {"1":"onoff","2":"dim/1000"} Tuya TS0601 rotary smart dimmer
- Compound `_TZE200_DFXKCOTS|TS0601`: tuya_dp DP {"1":"onoff","2":"dim/1000"} Tuya TS0601 rotary smart dimmer
- Compose: class=light eps=1 EF00=true IAS=false batteries=mains?
- Notes: Rotary smart dimmer TS0601; forbidden from wall_switch_5_gang_tuya & air_purifier
- **Gaps:** no_sources

### `p2432-dze200-p0gzbqct-rotary-knob-dimmer` → `wall_dimmer_tuya`

- Couple: `_TZE200_p0gzbqct` + TS0601
- Protocol: tuya_dp
- Z2M local pids for mfr: TS0601 ✓ overlap
- Compound `_TZE200_p0gzbqct|TS0601`: tuya_dp DP {"1":"onoff","2":"dim/1000"} Forum Henk de Boom #671 Rotary smart knob dimmer TS0601
- Compound `_tze200_p0gzbqct|TS0601`: tuya_dp DP {"1":"onoff","2":"dim/1000"} Forum Henk de Boom #671 Rotary smart knob dimmer TS0601
- Compound `_TZE200_P0GZBQCT|TS0601`: tuya_dp DP {"1":"onoff","2":"dim/1000"} Forum Henk de Boom #671 Rotary smart knob dimmer TS0601
- Compose: class=light eps=1 EF00=true IAS=false batteries=mains?
- Notes: Henk de Boom #671 Rotary knob dimmer TS0601; forbidden from wall_switch_5_gang_tuya & air_purifier
- **Gaps:** no_sources

### `p2432-dze200-fjjbhx9d-dimmer-2gang` → `dimmer_2_gang_tuya`

- Couple: `_TZE200_fjjbhx9d` + TS0601
- Protocol: tuya_dp
- Z2M local pids for mfr: TS0601 ✓ overlap
- Compound `_TZE200_fjjbhx9d|TS0601`: tuya_dp DP {"1":"onoff.1","2":"dim.1/1000","7":"onoff.2","8":"dim.2/1000"} Tuya TS0601 2-gang smart dimmer switch
- Compound `_tze200_fjjbhx9d|TS0601`: tuya_dp DP {"1":"onoff.1","2":"dim.1/1000","7":"onoff.2","8":"dim.2/1000"} Tuya TS0601 2-gang smart dimmer switch
- Compound `_TZE200_FJJBHX9D|TS0601`: tuya_dp DP {"1":"onoff.1","2":"dim.1/1000","7":"onoff.2","8":"dim.2/1000"} Tuya TS0601 2-gang smart dimmer switch
- Compose: class=socket eps=1 EF00=true IAS=false batteries=mains?
- Notes: 2-gang smart dimmer TS0601; forbidden from wall_switch_5_gang_tuya
- **Gaps:** no_sources

### `p2432-dze200-aqnazj70-switch-4gang` → `switch_4gang`

- Couple: `_TZE200_aqnazj70` + TS0601
- Protocol: tuya_dp
- Z2M local pids for mfr: TS0601 ✓ overlap
- Compound `_TZE200_aqnazj70|TS0601`: tuya_dp DP {"1":"onoff.1","2":"onoff.2","3":"onoff.3","4":"onoff.4"} Tuya TS0601 4-gang switch module
- Compound `_tze200_aqnazj70|TS0601`: tuya_dp DP {"1":"onoff.1","2":"onoff.2","3":"onoff.3","4":"onoff.4"} Tuya TS0601 4-gang switch module
- Compound `_TZE200_AQNAZJ70|TS0601`: tuya_dp DP {"1":"onoff.1","2":"onoff.2","3":"onoff.3","4":"onoff.4"} Tuya TS0601 4-gang switch module
- Compose: class=socket eps=4 EF00=true IAS=false batteries=mains?
- Notes: 4-gang switch TS0601; forbidden from wall_switch_5_gang_tuya
- **Gaps:** no_sources

### `p2432-dze200-mexisfik-switch-4gang` → `switch_4gang`

- Couple: `_TZE200_mexisfik` + TS0601
- Protocol: tuya_dp
- Z2M local pids for mfr: TS0601 ✓ overlap
- Compound `_TZE200_mexisfik|TS0601`: tuya_dp DP {"1":"onoff.1","2":"onoff.2","3":"onoff.3","4":"onoff.4"} Tuya TS0601 4-gang wall switch
- Compound `_tze200_mexisfik|TS0601`: tuya_dp DP {"1":"onoff.1","2":"onoff.2","3":"onoff.3","4":"onoff.4"} Tuya TS0601 4-gang wall switch
- Compound `_TZE200_MEXISFIK|TS0601`: tuya_dp DP {"1":"onoff.1","2":"onoff.2","3":"onoff.3","4":"onoff.4"} Tuya TS0601 4-gang wall switch
- Compose: class=socket eps=4 EF00=true IAS=false batteries=mains?
- Notes: 4-gang wall switch TS0601; forbidden from wall_switch_5_gang_tuya
- **Gaps:** no_sources

### `p2432-tyzb01-qeqvmvti-switch-1gang` → `switch_1gang`

- Couple: `_TYZB01_qeqvmvti` + TS0011
- Protocol: zcl
- Z2M local pids for mfr: (none in dump) 
- Compound `_TYZB01_qeqvmvti|TS0011`: zcl  Tuya TS0011 1-gang light switch
- Compound `_tyzb01_qeqvmvti|TS0011`: zcl  Tuya TS0011 1-gang light switch
- Compound `_TYZB01_QEQVMVTI|TS0011`: zcl  Tuya TS0011 1-gang light switch
- Compose: class=socket eps=1 EF00=false IAS=false batteries=mains?
- Notes: 1-gang light switch TS0011; forbidden from wall_switch_5_gang_tuya
- **Gaps:** no_sources, not_in_local_z2m_fps

### `p2432-dze200-mja3fuja-air-quality` → `air_quality_comprehensive`

- Couple: `_TZE200_mja3fuja` + TS0601
- Protocol: tuya_dp
- Z2M local pids for mfr: TS0601 ✓ overlap
- Compound `_TZE200_mja3fuja|TS0601`: tuya_dp DP {"2":"measure_pm25","18":"measure_temperature/10","19":"measure_humidity","21":"measure_voc","22":"measure_co2"} Forum #1379 / #31079 Smart Air House Keeper
- Compound `_tze200_mja3fuja|TS0601`: tuya_dp DP {"2":"measure_pm25","18":"measure_temperature/10","19":"measure_humidity","21":"measure_voc","22":"measure_co2"} Forum #1379 / #31079 Smart Air House Keeper
- Compound `_TZE200_MJA3FUJA|TS0601`: tuya_dp DP {"2":"measure_pm25","18":"measure_temperature/10","19":"measure_humidity","21":"measure_voc","22":"measure_co2"} Forum #1379 / #31079 Smart Air House Keeper
- Compose: class=sensor eps=1 EF00=true IAS=false batteries=mains?
- Notes: Topic 1 #1379 Smart Air House Keeper; forbidden from air_purifier
- **Gaps:** no_sources

### `p2432-dze200-2ekuz3dz-thermostat` → `wall_thermostat`

- Couple: `_TZE200_2ekuz3dz` + TS0601
- Protocol: tuya_dp
- Z2M local pids for mfr: TS0601 ✓ overlap
- Compound `_TZE200_2ekuz3dz|TS0601`: tuya_dp DP {"16":"target_temperature/10","24":"measure_temperature/10"} Forum Melectro #650 Beok/Moes X5H-GB-B smart thermostat
- Compound `_tze200_2ekuz3dz|TS0601`: tuya_dp DP {"16":"target_temperature/10","24":"measure_temperature/10"} Forum Melectro #650 Beok/Moes X5H-GB-B smart thermostat
- Compound `_TZE200_2EKUZ3DZ|TS0601`: tuya_dp DP {"16":"target_temperature/10","24":"measure_temperature/10"} Forum Melectro #650 Beok/Moes X5H-GB-B smart thermostat
- Compose: class=thermostat eps=1 EF00=true IAS=false batteries=mains?
- Notes: Melectro #650 Beok/Moes X5H-GB-B thermostat; forbidden from air_purifier
- **Gaps:** no_sources

### `p2432-dze204-qasjif9e-presence` → `presence_sensor_radar`

- Couple: `_TZE204_qasjif9e` + TS0601
- Protocol: tuya_dp
- Z2M local pids for mfr: TS0601 ✓ overlap
- Compound `_TZE204_qasjif9e|TS0601`: tuya_dp DP {"1":"alarm_motion","104":"measure_luminance"} Forum G4nd41f #654 ZY-M100 mmWave radar presence
- Compound `_tze204_qasjif9e|TS0601`: tuya_dp DP {"1":"alarm_motion","104":"measure_luminance"} Forum G4nd41f #654 ZY-M100 mmWave radar presence
- Compound `_TZE204_QASJIF9E|TS0601`: tuya_dp DP {"1":"alarm_motion","104":"measure_luminance"} Forum G4nd41f #654 ZY-M100 mmWave radar presence
- Compose: class=sensor eps=1 EF00=true IAS=false batteries=CR2032/CR2450/AAA/AA/CR123A/INTERNAL
- Notes: G4nd41f #654 ZY-M100 radar; forbidden from air_purifier
- **Gaps:** no_sources

### `p2432-dze204-sxm7l9xa-presence` → `presence_sensor_radar`

- Couple: `_TZE204_sxm7l9xa` + TS0601
- Protocol: tuya_dp
- Z2M local pids for mfr: TS0601 ✓ overlap
- Compound `_TZE204_sxm7l9xa|TS0601`: tuya_dp DP {"1":"alarm_motion","104":"measure_luminance"} Forum G4nd41f ZY-M100-S mmWave radar presence
- Compound `_tze204_sxm7l9xa|TS0601`: tuya_dp DP {"1":"alarm_motion","104":"measure_luminance"} Forum G4nd41f ZY-M100-S mmWave radar presence
- Compound `_TZE204_SXM7L9XA|TS0601`: tuya_dp DP {"1":"alarm_motion","104":"measure_luminance"} Forum G4nd41f ZY-M100-S mmWave radar presence
- Compose: class=sensor eps=1 EF00=true IAS=false batteries=CR2032/CR2450/AAA/AA/CR123A/INTERNAL
- Notes: G4nd41f ZY-M100-S radar; forbidden from air_purifier
- **Gaps:** no_sources

### `p2432-dze200-3towulqd-presence` → `presence_sensor_radar`

- Couple: `_TZE200_3towulqd` + TS0601
- Protocol: tuya_dp
- Z2M local pids for mfr: TS0601 ✓ overlap
- Compound `_TZE200_3towulqd|TS0601`: tuya_dp DP {"1":"alarm_motion","104":"measure_luminance"} Forum Janderek #663 ZG-204ZL motion & lux radar/PIR
- Compound `_tze200_3towulqd|TS0601`: tuya_dp DP {"1":"alarm_motion","104":"measure_luminance"} Forum Janderek #663 ZG-204ZL motion & lux radar/PIR
- Compound `_TZE200_3TOWULQD|TS0601`: tuya_dp DP {"1":"alarm_motion","104":"measure_luminance"} Forum Janderek #663 ZG-204ZL motion & lux radar/PIR
- Compose: class=sensor eps=1 EF00=true IAS=false batteries=CR2032/CR2450/AAA/AA/CR123A/INTERNAL
- Notes: Janderek #663 ZG-204ZL motion & lux radar; forbidden from air_purifier
- **Gaps:** no_sources

### `p2432-dze200-3p5ydos3-dimmer` → `wall_dimmer_tuya`

- Couple: `_TZE200_3p5ydos3` + TS0601
- Protocol: tuya_dp
- Z2M local pids for mfr: TS0601 ✓ overlap
- Compound `_TZE200_3p5ydos3|TS0601`: tuya_dp DP {"1":"onoff","2":"dim/1000"} Forum Ferenc_Szasz #660 BSEED smart dimmer switch
- Compound `_tze200_3p5ydos3|TS0601`: tuya_dp DP {"1":"onoff","2":"dim/1000"} Forum Ferenc_Szasz #660 BSEED smart dimmer switch
- Compound `_TZE200_3P5YDOS3|TS0601`: tuya_dp DP {"1":"onoff","2":"dim/1000"} Forum Ferenc_Szasz #660 BSEED smart dimmer switch
- Compose: class=light eps=1 EF00=true IAS=false batteries=mains?
- Notes: Ferenc_Szasz #660 BSEED dimmer; forbidden from air_purifier
- **Gaps:** no_sources

### `p2432-tz3000-mmkbptmx-switch-4gang` → `switch_4gang`

- Couple: `_TZ3000_mmkbptmx` + TS0004
- Protocol: zcl
- Z2M local pids for mfr: TS0004 ✓ overlap
- Compound `_TZ3000_mmkbptmx|TS0004`: zcl  Forum Melectro #646 4-gang wall switch TS0004
- Compound `_tz3000_mmkbptmx|TS0004`: zcl  Forum Melectro #646 4-gang wall switch TS0004
- Compound `_TZ3000_MMKBPTMX|TS0004`: zcl  Forum Melectro #646 4-gang wall switch TS0004
- Compose: class=socket eps=4 EF00=true IAS=false batteries=mains?
- Notes: Melectro #646 4-gang switch TS0004
- **Gaps:** no_sources

### `p2432-tz3000-ruxexjfz-switch-2gang` → `switch_2gang`

- Couple: `_TZ3000_ruxexjfz` + TS0002
- Protocol: zcl
- Z2M local pids for mfr: TS0002 ✓ overlap
- Compound `_TZ3000_ruxexjfz|TS0002`: zcl  Forum Melectro #647 2-gang wall switch TS0002
- Compound `_tz3000_ruxexjfz|TS0002`: zcl  Forum Melectro #647 2-gang wall switch TS0002
- Compound `_TZ3000_RUXEXJFZ|TS0002`: zcl  Forum Melectro #647 2-gang wall switch TS0002
- Compose: class=socket eps=2 EF00=false IAS=false batteries=mains?
- Notes: Melectro #647 2-gang switch TS0002
- **Gaps:** no_sources

### `p2432-tz3000-3dfewsk1-water-leak` → `water_leak_sensor`

- Couple: `_TZ3000_3dfewsk1` + TS0207
- Protocol: zcl
- Z2M local pids for mfr: (none in dump) 
- Compound `_TZ3000_3dfewsk1|TS0207`: zcl  Forum Roy1 #649 Water flood sensor TS0207
- Compound `_tz3000_3dfewsk1|TS0207`: zcl  Forum Roy1 #649 Water flood sensor TS0207
- Compound `_TZ3000_3DFEWSK1|TS0207`: zcl  Forum Roy1 #649 Water flood sensor TS0207
- Compose: class=sensor eps=1 EF00=false IAS=true batteries=CR2032/CR2450/AAA
- Notes: Roy1 #649 Water flood sensor TS0207
- **Gaps:** no_sources, not_in_local_z2m_fps

### `p2432-tz3000-wkai4ga5-button-2` → `button_wireless_2`

- Couple: `_TZ3000_wkai4ga5` + TS0042
- Protocol: zcl
- Z2M local pids for mfr: (none in dump) 
- Compound `_TZ3000_wkai4ga5|TS0042`: zcl  Forum Rob_G #653 2-gang wireless button/scene switch TS0042
- Compound `_tz3000_wkai4ga5|TS0042`: zcl  Forum Rob_G #653 2-gang wireless button/scene switch TS0042
- Compound `_TZ3000_WKAI4GA5|TS0042`: zcl  Forum Rob_G #653 2-gang wireless button/scene switch TS0042
- Compose: class=button eps=2 EF00=true IAS=true batteries=CR2032/CR2450
- Notes: Rob_G #653 2-gang wireless button TS0042
- **Gaps:** no_sources, not_in_local_z2m_fps

### `p2432-tze204-zenj4lxv-dimmer-2gang` → `dimmer_2_gang_tuya`

- Couple: `_TZE204_zenj4lxv` + TS0601
- Protocol: tuya_dp
- Z2M local pids for mfr: TS0601 ✓ overlap
- Compound `_TZE204_zenj4lxv|TS0601`: tuya_dp DP {"1":"onoff.1","2":"dim.1/1000","7":"onoff.2","8":"dim.2/1000"} Forum Anders_Lim #661 Moes Star Ring 2-gang dimmer ZS-SR-EUD-2
- Compound `_tze204_zenj4lxv|TS0601`: tuya_dp DP {"1":"onoff.1","2":"dim.1/1000","7":"onoff.2","8":"dim.2/1000"} Forum Anders_Lim #661 Moes Star Ring 2-gang dimmer ZS-SR-EUD-2
- Compound `_TZE204_ZENJ4LXV|TS0601`: tuya_dp DP {"1":"onoff.1","2":"dim.1/1000","7":"onoff.2","8":"dim.2/1000"} Forum Anders_Lim #661 Moes Star Ring 2-gang dimmer ZS-SR-EUD-2
- Compose: class=socket eps=1 EF00=true IAS=false batteries=mains?
- Notes: Anders_Lim #661 Star Ring 2-gang dimmer
- **Gaps:** no_sources

### `p2432-tzb210-rkgngb5o-cct` → `bulb_tunable_white`

- Couple: `_TZB210_rkgngb5o` + TS0502B
- Protocol: zcl
- Z2M local pids for mfr: TS0501B 
- Compound `_TZB210_rkgngb5o|TS0502B`: zcl  Forum radiothieves #662 CCT tunable white bulb TS0502B
- Compound `_tzb210_rkgngb5o|TS0502B`: zcl  Forum radiothieves #662 CCT tunable white bulb TS0502B
- Compound `_TZB210_RKGNGb5O|TS0502B`: zcl  Forum radiothieves #662 CCT tunable white bulb TS0502B
- Compose: class=light eps=1 EF00=false IAS=false batteries=mains?
- Notes: radiothieves #662 CCT tunable bulb
- **Gaps:** no_sources

### `p2432-tyzb01-6g8b7at8-switch-2gang` → `switch_2gang`

- Couple: `_TYZB01_6g8b7at8` + TS0012
- Protocol: zcl
- Z2M local pids for mfr: (none in dump) 
- Compound `_TYZB01_6g8b7at8|TS0012`: zcl  Forum Johan_Rossouw #665 2-gang switch TS0012
- Compound `_tyzb01_6g8b7at8|TS0012`: zcl  Forum Johan_Rossouw #665 2-gang switch TS0012
- Compound `_TYZB01_6G8B7AT8|TS0012`: zcl  Forum Johan_Rossouw #665 2-gang switch TS0012
- Compose: class=socket eps=2 EF00=false IAS=false batteries=mains?
- Notes: Johan_Rossouw #665 2-gang switch
- **Gaps:** no_sources, not_in_local_z2m_fps

### `p2432-tz3210-0zabbfax-bulb-rgb` → `light_bulb_rgb`

- Couple: `_TZ3210_0zabbfax` + TS0503B
- Protocol: zcl
- Z2M local pids for mfr: (none in dump) 
- Compound `_TZ3210_0zabbfax|TS0503B`: zcl  Forum RezaRose #666 USB RGB LED strip controller TS0503B
- Compound `_tz3210_0zabbfax|TS0503B`: zcl  Forum RezaRose #666 USB RGB LED strip controller TS0503B
- Compound `_TZ3210_0ZABBFAX|TS0503B`: zcl  Forum RezaRose #666 USB RGB LED strip controller TS0503B
- Compose: class=light eps=1 EF00=false IAS=false batteries=mains?
- Notes: RezaRose #666 USB RGB strip
- **Gaps:** no_sources, not_in_local_z2m_fps

### `p2432-tze204-ex3rcdha-presence` → `presence_sensor_radar`

- Couple: `_TZE204_ex3rcdha` + TS0601
- Protocol: tuya_dp
- Z2M local pids for mfr: TS0601 ✓ overlap
- Compound `_TZE204_ex3rcdha|TS0601`: tuya_dp DP {"1":"alarm_motion","104":"measure_luminance"} Forum #1379 / #31079 / Riccardo_Baro #5460 Human presence radar + luminance
- Compound `_tze204_ex3rcdha|TS0601`: tuya_dp DP {"1":"alarm_motion","104":"measure_luminance"} Forum #1379 / #31079 / Riccardo_Baro #5460 Human presence radar + luminance
- Compound `_TZE204_EX3RCDHA|TS0601`: tuya_dp DP {"1":"alarm_motion","104":"measure_luminance"} Forum #1379 / #31079 / Riccardo_Baro #5460 Human presence radar + luminance
- Compose: class=sensor eps=1 EF00=true IAS=false batteries=CR2032/CR2450/AAA/AA/CR123A/INTERNAL
- Notes: Topic 1 #1379 / #31079 radar
- **Gaps:** no_sources

### `p2432-tze200-yjjdcqsq-climate` → `climate_sensor`

- Couple: `_TZE200_yjjdcqsq` + TS0601
- Protocol: tuya_dp
- Z2M local pids for mfr: TS0601 ✓ overlap
- Compound `_TZE200_yjjdcqsq|TS0601`: tuya_dp DP {"1":"measure_temperature/10","2":"measure_humidity"} Forum #1379 / #31079 Temperature & humidity sensor TS0601
- Compound `_tze200_yjjdcqsq|TS0601`: tuya_dp DP {"1":"measure_temperature/10","2":"measure_humidity"} Forum #1379 / #31079 Temperature & humidity sensor TS0601
- Compound `_TZE200_YJJDCQSQ|TS0601`: tuya_dp DP {"1":"measure_temperature/10","2":"measure_humidity"} Forum #1379 / #31079 Temperature & humidity sensor TS0601
- Compose: class=sensor eps=1 EF00=true IAS=false batteries=AAA/CR2032/CR2450
- Notes: Topic 1 #1379 temp/humidity sensor
- **Gaps:** no_sources

Regenerate: `node tools/ci/investigate-device-peculiarities.js`



## P2445 — AM43 / `_TZE200_icka1clh` / `_TZE200_zah67ekd` (multi-pid OK)

- **Couples**: `(icka1clh|zah67ekd|TZE204_icka1clh) × (TS0601 | AM43-0.45/40-ES-EB | AM43-0.45/40-ES-EZ)` → `curtain_motor` only.
- **Z2M**: `TS0601_cover_4` (same DP family). Battery/solar AM43; EF00 cover.
- **Forbidden**: `curtain_motor_shutter`, `curtain_motor_tilt` for these couples.
- **Do not invent**: TS0301 / TS0726 for `icka1clh` (auto-sync pollution).
- **Doctrine**: one `manufacturerName` may list many verified `productId` / OEM variants — lock each couple, never prune mfr across drivers for a different pid.

## P2447 — Forum soft-hypothesis / multi-pid (2026-09-10)

- Soft MISSING_PID must prefer `mfs_db.modelIds` + registry `productId` over polluted compose lists (e.g. `01MINIZB` on `button_wireless_4`).
- `_TZ3000_xabckq1v` → **TS004F** (`button_wireless_4`) — never soft-lock `01MINIZB`.
- `_TZ3000_zgyzgdua` → **TS0044 only** (Moes XH-SY-04Z). Do **not** invent TS0043 for this mfr.
- Fake OCR `_TZE2841000000_*` — never lock.
