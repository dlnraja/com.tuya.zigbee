# Zigbee parallel cross-research vs locked Homey couples

**When:** 2026-08-21 ~23:10 PT (Europe/Paris, UTC+2)  
**Mode:** READ / WEB ONLY. No Homey clone patch. No invented pid. No forum post. No CloudAgent.  
**Z2M tree fetched:** `Koenkk/zigbee-herdsman-converters` `master` `src/devices/tuya.ts` (~30149 lines, 2026-08-21).  
**Doctrine:** identity = `manufacturerName` + `productId`. Quote only strings seen in a source.

Rank: **(A)** confirms our patch · **(B)** contradicts Homey compose · **(C)** new evidence we must **not** apply yet (missing couple / cosmetic / SKU rename).

---

## Ranked summary (locked 10)

| # | Couple (locked) | Rank | One-line |
|---|---|---|---|
| 1 | `_TZ3000_zgyzgdua`+`TS0044` meter91 | **A** protocol; **C** SKU rename | Still `tuya.fz.on_off_action` EP 0xFD 0/1/2, **no** `tz.operation_mode` / no 0x8004 write. Whitelabel **moved** XH-SY-04Z → `TS0044_2` (cosmetic). Homey mfr still on `scene_switch_4` not `button_wireless_4`. |
| 2 | `_TZ3000_k4ej3ww2`+`TS0207` Peter | **A** | IAS 1280 / `fz.ias_water_leak_alarm_1`. **Not** EF00. JohanBendz `water_detector` clusters `[0,1,3,1280]`. Stable Homey still hole. |
| 3 | `_TZ3000_mrpevh8p`+`TS0041` | **A** | Z2M `SH-SC07` on TS0041 `on_off_action` (`single`/`double`/`hold`). No 0x8004. JohanBendz `smart_button_switch` **lacks** this mfr. |
| 4 | TB25 `ywubfuvt` TS0002 / `fawk5xjv` TS0003 / `lwthnp7j` TS0004 | **A** protocol; **C** SKU | All ZCL multi-EP OnOff. Z2M names **TB26-2** / **NFZB-03** / generic **TS0004**. Homey stable steal onto `switch_Ngang` still (B). |
| 5 | `_TZ3000_w5xztuy7`+`TS0002` Kanbros | **A** (generic) | **No named fingerprint** in current `tuya.ts`. Falls into generic `zigbeeModel: ["TS0002"]` → model `TS0002` 2-gang ZCL. Do not invent a second pid. |
| 6 | `_TZ3210_imaccztn`+`TS0004` TBoy | **A** | Z2M 2026-03-31 added to MHCOZY **TYWB 4ch-RF** with `_TZ3000_imaccztn`. JohanBendz has **only** `_TZ3000_imaccztn`. |
| 7 | IR `TS1201` / Zosung / `_TZ3290_7v1k4vufotpowp9z` | **A** | Z2M model **ZS06**, pid **TS1201** (not TS0601). Clusters `0xED00`/`0xE004`. ZHA `ZosungIRBlaster_ZS06` lists the full 16-char mfr. Current ZS06 fingerprint **list omits** that mfr (zigbeeModel catch-all still TS1201). |
| 8 | Sleepy IAS leftover DP | **A** | Z2M: IAS converter has **no** `tuyaBase({dp:true})`. `queryOnDeviceAnnounce` default **false**. JohanBendz splits IAS `water_detector` vs EF00 `water_leak_sensor_tuya`. |
| 9 | TS004F vs TS0044 0x8004 | **A** | 0x8004 write **only** on TS004F (`tuya.tz.operation_mode`, configure `tuyaOperationMode: 1`). TS0044 fromZigbee is `on_off_action` only. |
| 10 | ZG-303Z / `_TZE284_nt4pquef` | **A** soil | Two **different** couples. `nt4pquef`+`TS0601` = Z2M **SGS02Z** soil (DP 2/3/5/9/15). ZG-303Z = HOBEIAN soil via `_TZE200_wqashyqo`+TS0601 **or** zigbeeModel `ZG-303Z`. Neither is climate. JohanBendz soil list **lacks both**. |

---

## 1. meter91 `_TZ3000_zgyzgdua`+`TS0044`

### Current Z2M converter (2026-08-21 master)

`src/devices/tuya.ts` L7330–L7376 — definition `model: "TS0044"`, `zigbeeModel: ["TS0044"]`:

```
fromZigbee: [tuya.fz.on_off_action],
whiteLabel: [
  ...
  tuya.whitelabel("Moes", "XH-SY-04Z", "4 button portable remote control", ["_TZ3000_kfu8zapd"]),
  ...
  tuya.whitelabel("Tuya", "TS0044_2", "Wireless switch with 4 buttons", ["_TZ3000_zgyzgdua"]),
],
extend: [tuyaBase(), m.battery({voltage: true, percentageReporting: false})],
exposes: [ e.action(["1_single", ... "4_hold"]) ],
```

**No** `toZigbee: [tuya.tz.operation_mode]`. **No** `endpoint.write({tuyaOperationMode: 1})`. **No** 0x8004.

`tuya.fz.on_off_action` (`src/lib/tuya.ts` L3899–L3910):

```
cluster: "genOnOff",
type: "commandTuyaAction",
clickMapping: {0: "single", 1: "double", 2: "hold"}
button = endpoint.ID  (unless TS0041 / single-EP)
return {action: `${button}_${clickMapping[msg.data.value]}`}
```

`addTuyaGenOnOffCluster` (`src/lib/tuya.ts` L5384–L5407) **registers** (does not write):

- attr `tuyaOperationMode` ID **`0x8004`** ENUM8
- cmd `tuyaAction` ID **`0xfd`**, params `value` UINT8 **plus** `data` BUFFER
- cmd `tuyaAction2` ID **`0xfc`**

### History (do not treat 3678dec as current SKU)

| When | Commit | What |
|---|---|---|
| 2025-08-11 | [3678dec](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3678decae864aec1475c50ff4c99cb40a286e202) | Added `tuya.whitelabel("Moes", "XH-SY-04Z", ..., ["_TZ3000_zgyzgdua"])` onto the **same** TS0044 converter (`fromZigbee: [tuya.fz.on_off_action, fz.battery]`). Issue [#28224](https://github.com/Koenkk/zigbee2mqtt/issues/28224) interview: `manufName":"_TZ3000_zgyzgdua"`, `modelId":"TS0044"`, `epList:[1,2,3,4]`, EP1 `inClusterList:[1,6,57344,0]`, `devId:0`, Battery. |
| 2025-09-29 | [77115d2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/77115d2101c6a30c1bc3c44d7c5a9ffbcdd28661) PR [#10109](https://github.com/Koenkk/zigbee-herdsman-converters/pull/10109) | XH-SY-04Z remapped to `_TZ3000_kfu8zapd`. [#28468](https://github.com/Koenkk/zigbee2mqtt/issues/28468) Koenkk: same mfr reused; detection cosmetic. |
| 2026-04-30 | [70d44ff](https://github.com/Koenkk/zigbee-herdsman-converters/commit/70d44ff147b69d68b63c3949e73ab577c9c3acd6) `feat(add): TS0044_2 (#12052)` | **Adds** `tuya.whitelabel("Tuya", "TS0044_2", ..., ["_TZ3000_zgyzgdua"])`. Converter still `on_off_action`. Drops explicit `toZigbee: []` / `configure: tuya.configureMagicPacket` in favour of `tuyaBase()` + voltage battery. |

Device pages: [XH-SY-04Z](https://www.zigbee2mqtt.io/devices/XH-SY-04Z.html) (now kfu8zapd) · [TS0044_2](https://www.zigbee2mqtt.io/devices/TS0044_2.html) (zgyzgdua) · [TS0044](https://www.zigbee2mqtt.io/devices/TS0044.html). TS0044_2 notes: Telink, CR2430, **non-standard commands**, bind appears to succeed but **is not effective**, ~0.3s to distinguish single/double/hold. That is 0xFD event encoding, not 0x8004 dual-mode.

### ZHA

[zhaquirks/tuya/ts0044.py](https://github.com/zigpy/zha-device-handlers/blob/dev/zhaquirks/tuya/ts0044.py) — MODEL `"TS0044"`, 4 EP OnOff. `TuyaSmartRemote0044TOPlusA` signature EP1 in `[Basic, PowerCfg, OnOff, TuyaZBE000Cluster]` = **57344 / 0xE000** — matches 3678dec interview of zgyzgdua.

`TuyaSmartRemoteOnOffCluster` ([zhaquirks/tuya/__init__.py](https://github.com/zigpy/zha-device-handlers/blob/dev/zhaquirks/tuya/__init__.py)):

- `press_type` cmd **`0xFD`**, `{0: SHORT, 1: DOUBLE, 2: LONG}`
- `rotate_type` cmd **`0xFC`**
- attr `switch_mode` **`0x8004`** `SwitchMode` Command=0 Event=1 — **defined**, TS0044 quirks are `CustomDevice` (not Enchanted write-on-join)
- **must** send default response or remote repeats

No mfr string `_TZ3000_zgyzgdua` in the quirk (match is model+endpoint shape).

### deCONZ DDF (reachable)

[devices/tuya/_TZ3000_TS0044_4gang_remote.json](https://github.com/dresden-elektronik/deconz-rest-plugin/blob/master/devices/tuya/_TZ3000_TS0044_4gang_remote.json) **includes** `"_TZ3000_zgyzgdua"` with `modelid` `"TS0044"`. `sleeper: true`. Binds **0x0006** EP1–4. Battery 0x0001/0x0021. **No** 0x8004 item.

Locked variant [\_TZ3000_TS0044_4gang_remote_locked.json](https://github.com/dresden-elektronik/deconz-rest-plugin/blob/master/devices/tuya/_TZ3000_TS0044_4gang_remote_locked.json) is `kfu8zapd` / `a4xycprs` / `u3nv1jwk` only (2026-03 PR [#8550](https://github.com/dresden-elektronik/deconz-rest-plugin/pull/8550)).

### JohanBendz SDK3

[drivers/wall_remote_4_gang/driver.compose.json](https://raw.githubusercontent.com/JohanBendz/com.tuya.zigbee/SDK3/drivers/wall_remote_4_gang/driver.compose.json): productId `TS0044`, mfrs `vp6clf9d`/`ufhtxr59`/`ee8nrt2l`/`a4xycprs` — **no zgyzgdua**. Clusters EP1–4 OnOff bind 6. README “4 Gang Wall Remote” also omits zgyzgdua; “4 Gang Wall Switch” wrongly lists other TS0044 as actuators.

### Homey vs this

**(A)** 0xFD payload 0/1/2 EP1–4, skip 0x8004 write, not a knob.  
**(B)** Homey live mfr on `scene_switch_4` only (`docs-bugs-cross.md` #2).  
**(C)** Do **not** rename Homey driver to XH-SY-04Z or TS0044_2; Z2M SKU moved. Fingerprint stays `_TZ3000_zgyzgdua`+`TS0044`.

---

## 2. Peter water `_TZ3000_k4ej3ww2`+`TS0207`

### Z2M

`tuya.ts` L4610–L4667 `model: "TS0207_water_leak_detector"`:

```
zigbeeModel: ["TS0207", "FNB54-WTS08ML1.0", "ZG-222Z", "AY222Z"],
fromZigbee: [fz.ias_water_leak_alarm_1, fz.battery],
whiteLabel: tuya.whitelabel("HOBEIAN", "ZG-222ZA", "Water leak sensor", ["_TZ3000_k4ej3ww2", "_TZ3000_abaplimj"]),
configure: bind genPowerCfg + batteryPercentageRemaining
exposes: water_leak, battery_low, battery; tamper omitted for "_TZ3000_k4ej3ww2"
```

**No** `tuya.fz.datapoints`. **No** `manuSpecificTuya`. Separate rain converter L4670 uses `tuya.fz.datapoints` **only** for `_TZ3210_tgvtvdoc` / `_TZ3210_p68kms0l`.

Interview [#17685](https://github.com/Koenkk/zigbee2mqtt/issues/17685): `manufName":"_TZ3000_k4ej3ww2"`, `modelId":"TS0207"`, `inClusterList:[1,3,1280,0]`, `ssIasZone`. [#28181](https://github.com/Koenkk/zigbee2mqtt/issues/28181): same couple, `deviceID: 770`, `inputClusters: [0,1,3,1280]`, configure **`Bind … genPowerCfg … INVALID_EP`**, states stay null until a wet trigger.

Page: [TS0207_water_leak_detector](https://www.zigbee2mqtt.io/devices/TS0207_water_leak_detector.html).

### ZHA

No dedicated k4ej quirk found. Generic IAS Zone (cluster 0x0500 / 1280). ZHA `tuya_spell_data_query` default **false** (`BaseEnchantedDevice.tuya_spell_data_query: bool = False`).

### deCONZ

[\_TZ3000_TS0207_water_leak_sensor.json](https://github.com/dresden-elektronik/deconz-rest-plugin/blob/master/devices/tuya/_TZ3000_TS0207_water_leak_sensor.json) lists `"_TZ3000_k4ej3ww2"` + `"TS0207"`. Fingerprint in: `0x0000, 0x0001, 0x0003, 0x0500`. Type `$TYPE_WATER_LEAK_SENSOR`. Binds 0x0001 **and** 0x0500. 2026-04 clone sibling `_TZ3000_abaplimj` PR [#8586](https://github.com/dresden-elektronik/deconz-rest-plugin/pull/8586).

### JohanBendz SDK3

[drivers/water_detector/driver.compose.json](https://raw.githubusercontent.com/JohanBendz/com.tuya.zigbee/SDK3/drivers/water_detector/driver.compose.json):

```
manufacturerName: [ ..., "_TZ3000_k4ej3ww2", ... ]
productId: ["TS0207", "q9mpfhw"]
clusters: [0, 1, 3, 1280]
bindings: [1, 1280]
```

[drivers/water_leak_sensor_tuya/driver.compose.json](https://raw.githubusercontent.com/JohanBendz/com.tuya.zigbee/SDK3/drivers/water_leak_sensor_tuya/driver.compose.json): **only** `_TZE200_qq9mpfhw` / `_TZE200_jthf7vb6` + `TS0601`, clusters `[0,4,5,61184]`. **No k4ej. No TS0207.**

**(A)** Confirms Homey lock: IAS `water_leak_sensor`, forbid `water_leak_sensor_tuya`.  
**(B)** Stable Homey: k4ej stuffed as productId, IAS clusters `[0,6]`, tuya driver has mfr+EF00.  
Residual (both Z2M and JohanBendz): PowerCfg bind — Z2M #28181 `INVALID_EP`. Do not copy that bind as a “fix”.

---

## 3. Smartbutton `_TZ3000_mrpevh8p`+`TS0041`

### Z2M

`tuya.ts` L7236–L7254 `model: "TS0041"`:

```
whiteLabel: tuya.whitelabel("Tuya", "SH-SC07", "Button scene switch",
  ["_TZ3000_mrpevh8p", "_TZ3000_5bpeda8u", "_TZ3000_b4awzgct"]),
fromZigbee: [tuya.fz.on_off_action, fz.battery],
toZigbee: [],
exposes: e.action(["single", "double", "hold"]),
configure: tuya.configureMagicPacket,
```

`on_off_action` special-cases `TS0041`: button prefix empty → `single`/`double`/`hold` (not `1_single`). Added 2023-10-04 [465413a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/465413a49df8ae413ca1605b841525620a9da5cc) PR [#6225](https://github.com/Koenkk/zigbee-herdsman-converters/pull/6225).

Pages: [TS0041](https://www.zigbee2mqtt.io/devices/TS0041.html) · [SH-SC07](https://www.zigbee2mqtt.io/devices/SH-SC07.html).

### ZHA

[ts0041.py](https://github.com/zigpy/zha-device-handlers/blob/dev/zhaquirks/tuya/ts0041.py) MODEL `"TS0041"`, `TuyaSmartRemoteOnOffCluster` 0xFD. No mfr `mrpevh8p` (shape match). No 0x8004 write.

### JohanBendz

[smart_button_switch](https://raw.githubusercontent.com/JohanBendz/com.tuya.zigbee/SDK3/drivers/smart_button_switch/driver.compose.json): pid `TS0041`, mfrs `fa9mlvja`/`yj6k7vfo`/`qgwcxxws` — **no `_TZ3000_mrpevh8p`**. EP1 clusters `[0,6]` bind 6.

**(A)** TS0041 0xFD, no 0x8004.  
**(C)** Do not copy JohanBendz mfr list; they never listed this couple.

---

## 4. TB25 gangs `ywubfuvt`/`fawk5xjv`/`lwthnp7j`

| Couple | Z2M (tuya.ts) | Page | Protocol |
|---|---|---|---|
| `_TZ3000_ywubfuvt`+`TS0002` | L8226 `tuya.whitelabel("Zemismart", "TB26-2", "2 Gang switch with backlight, countdown, inching", ["_TZ3000_ywubfuvt"])` on generic `model: "TS0002"` L8197–L8241. `tuyaOnOff` EP l1/l2, bind genOnOff 1+2, `configureMagicPacket`. | [TB26-2](https://www.zigbee2mqtt.io/devices/TB26-2.html) | ZCL 2-gang |
| `_TZ3000_fawk5xjv`+`TS0003` | L8307 `fingerprint: tuya.fingerprint("TS0003", ["_TZ3000_fawk5xjv", "_TZ3000_bvij6kod", "_TZ3000_aracgljk", "_TZ3210_fawk5xjv"])` `model: "NFZB-03"` vendor Nova Digital. `tuyaOnOff` l1–l3. | [NFZB-03](https://www.zigbee2mqtt.io/devices/NFZB-03.html) · issue [#28204](https://github.com/Koenkk/zigbee2mqtt/issues/28204) | ZCL 3-gang |
| `_TZ3000_lwthnp7j`+`TS0004` | **No named hit** in fetched `tuya.ts`. Generic `zigbeeModel: ["TS0004"]` L12859 `model: "TS0004"` 4-gang OnOff l1–l4. Issue [#26220](https://github.com/Koenkk/zigbee2mqtt/issues/26220) inventory lists `_TZ3000_lwthnp7j` as present on a user mesh (not a converter add). | [TS0004](https://www.zigbee2mqtt.io/devices/TS0004.html) | ZCL 4-gang |

JohanBendz README “2 Gang Switch Module” / “3 Gang” / “4 Channel Relay” **do not** list these three mfrs.

**(A)** All three are ZCL multi-endpoint switches, not EF00 `generic_tuya`.  
**(B)** Homey stable compose still steals them onto `switch_2gang` / `switch_3gang` / `switch_4gang` vs locks `wall_switch_Ngang_1way`.  
**(C)** Do **not** rename Homey to TB26-2 / NFZB-03. Do not invent a pid for lwthnp7j (already TS0004). `_TZ3210_fawk5xjv` seen in Z2M fingerprint — **do not add** unless Homey interview shows it.

---

## 5. Kanbros `_TZ3000_w5xztuy7`+`TS0002`

**Not present** as a named `whitelabel` / `fingerprint` in fetched `tuya.ts`.

Generic block L8197–L8241:

```
model: "TS0002",
zigbeeModel: ["TS0002"],
description: "2-Gang switch with backlight, countdown and inching",
extend: [ tuyaBase(), tuyaOnOff({ endpoints: ["l1","l2"], switchType, powerOnBehavior2, ... }) ],
```

Z2M model string for this couple, if it interviews as `TS0002`, is **`TS0002`**. Page: [TS0002](https://www.zigbee2mqtt.io/devices/TS0002.html).

**(A)** Confirms Homey lock `zcl_only` `switch_2gang` (2× genOnOff).  
**(C)** No extra pid. No Z2M-specific SKU to copy.

---

## 6. TBoy `_TZ3210_imaccztn`+`TS0004`

`tuya.ts` L12859–L12886 `model: "TS0004"`:

```
whiteLabel: tuya.whitelabel("MHCOZY", "TYWB 4ch-RF", "4 channel relay",
  ["_TZ3000_u3oupgdy", "_TZ3000_imaccztn", "_TZ3210_imaccztn"]),
```

Added 2026-03-31 [b87c1e3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b87c1e3e507b6f9c30d140856a470c396a667522) PR [#11851](https://github.com/Koenkk/zigbee-herdsman-converters/issues/11851) / release 26.28.0. Same 4-ch ZCL OnOff as `_TZ3000_imaccztn`. Page: [TYWB 4ch-RF](https://www.zigbee2mqtt.io/devices/TYWB_4ch-RF.html). Jan 2026 [#11274](https://github.com/Koenkk/zigbee-herdsman-converters/issues/11274) restored `powerOnBehavior2` after it was dropped.

JohanBendz [relay_board_4_channel](https://raw.githubusercontent.com/JohanBendz/com.tuya.zigbee/SDK3/drivers/relay_board_4_channel/driver.compose.json): pid `TS0004`, mfrs include `_TZ3000_imaccztn` **only** (no `_TZ3210_imaccztn`). Clusters EP1–4 OnOff bind 6, sub-devices second/third/fourthSwitch.

**(A)** 4ch ZCL relay. Homey master lock for `_TZ3210_imaccztn`+TS0004 stands.  
**(C)** Do not drop `_TZ3000_imaccztn` or invent TS0004 variants. JohanBendz missing `_TZ3210_` prefix is a gap, not a reason to remove ours.

---

## 7. IR TS1201 / Zosung / ZS06 `_TZ3290_7v1k4vufotpowp9z`

### Z2M

`tuya.ts` L15248–L15285:

```
zigbeeModel: ["TS1201"],
model: "ZS06",
fingerprint: tuya.fingerprint("TS1201", [
  "_TZ3290_rlkmy85q4pzoxobl", "_TZ3290_gnl5a6a5xvql7c2a",
  "_TZ3290_jxvzqatwgsaqzx1u", "_TZ3290_lypnqvlem5eq1ree",
  "_TZ3290_yac64inudpovoaba", "_TZ3290_uc8lwbi2",
  "_TZ3290_8xzb2ghn", "_TZ3290_s6ezpa3j",
  "_TZ3290_acv1iuslxi3shaaj",
]),
extend: [zosung.zosungExtend.addZosungIRTransmitCluster(),
         zosung.zosungExtend.addZosungIRControlCluster()],
fromZigbee: [fzZosung.zosung_send_ir_code_00 .. _05],
toZigbee: [tzZosung.zosung_ir_code_to_send, tzZosung.zosung_learn_ir_code],
exposes: learn_ir_code, learned_ir_code, learned_ir_timings, ir_code_to_send, ir_emitter
```

**`_TZ3290_7v1k4vufotpowp9z` is not in that fingerprint array.** Historic issue [#17240](https://github.com/Koenkk/zigbee2mqtt/issues/17240) (2023): `manufacturer name '_TZ3290_7v1k4vufotpowp9z'` + `Zigbee model 'TS1201'` was ZS06; later matched via `zigbeeModel: ["TS1201"]`.

`src/lib/zosung.ts`:

- `zosungIRTransmit` cluster **`ID: 0xed00`** (L108–L110)
- `zosungIRControl` cluster **`ID: 0xe004`** (L201–L203), cmd 0x00 JSON `{"study":0|1}`

2026-07-15 [c6af2f9](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c6af2f956c3ed09d04780cfcc59eea5c59ff4334) PR [#12689](https://github.com/Koenkk/zigbee-herdsman-converters/issues/12689): TS1201 discovery fix + `learned_ir_timings()`.

Page: [ZS06](https://www.zigbee2mqtt.io/devices/ZS06.html) — model **ZS06**, not TS0601.

### ZHA (official, still on `dev`)

[zhaquirks/tuya/ts1201.py](https://github.com/zigpy/zha-device-handlers/blob/dev/zhaquirks/tuya/ts1201.py) class `ZosungIRBlaster_ZS06`:

```
MODELS_INFO: [
  ("_TZ3290_7v1k4vufotpowp9z", "TS1201"),
  ("_TZ3290_acv1iuslxi3shaaj", "TS1201"),
  ("_TZ3290_gnl5a6a5xvql7c2a", "TS1201"),
  ("_TZ3290_rlkmy85q4pzoxobl", "TS1201"),
  ("_TZ3290_nba3knpsarkawgnt", "TS1201"),
]
```

Clusters `ZosungIRTransmit` **0xED00**, `ZosungIRControl` **0xE004**. Learn = `{"study":0}`; send = chunked 0xED00 cmd 0x00 with `clusterid=0xE004`. **No 0xEF00.** OnOff is learn, not TV power. Mains ZS06 signature has EP242 GreenPowerProxy, **no** PowerConfiguration (USB).

### deCONZ

Issue [#6814](https://github.com/dresden-elektronik/deconz-rest-plugin/issues/6814) DDF draft `manufacturername: "_TZ3290_7v1k4vufotpowp9z"`, `modelid: "TS1201"`. Not verified as a Gold DDF file in this pass.

### Homey vs this

**(A)** Use **TS1201** not TS0601; Zosung 0xED00/0xE004; full mfr string is real (ZHA + historic Z2M). Truncated `_tz3290_7v1k4vuf` in Homey `ir_blaster` compose is a **compose truncation**, not a new pid.  
**(B)** Homey `ir_blaster` still lists cluster **61184** and pid `TS0601` cartesian.  
**(C)** Do not add Z2M fingerprint-only mfrs (`8xzb2ghn`, `s6ezpa3j`, …) that are not already in Homey compose.

---

## 8. How Z2M avoids EF00 query on IAS-only sleepy

`tuya.modernExtend.tuyaBase` (`src/lib/tuya.ts` L4432–L4598):

```
dp = false                    // default
queryOnDeviceAnnounce = false // default
queryOnConfigure = false      // default
```

`dataQuery` on `manuSpecificTuya` runs **only if** `queryOnDeviceAnnounce` or `queryIntervalSeconds` is set (L4538–L4545). `tuyaFz.datapoints` is pushed **only if** `dp: true` (L4596–L4598).

TS0207 water: `fromZigbee: [fz.ias_water_leak_alarm_1, fz.battery]` — **never** `tuyaBase({dp:true})`.

TS0041/TS0044: `tuyaBase()` without `dp` — magic packet + custom genOnOff cluster (0xFD decode), **no** EF00 query.

MCU soil / IR leftover: `tuyaBase({dp: true})` is opt-in per definition (SGS02Z L5156, ZG-303Z L22212).

ZHA: `tuya_spell_data_query` default false; soil `_TZE284_nt4pquef` uses `.skip_configuration()` **without** `.tuya_enchantment(data_query_spell=True)` (`tuya_sensor.py`). Contrast: some TH sensors **do** set `data_query_spell=True`.

JohanBendz: IAS water vs EF00 water are **two drivers**. That is the split Homey stable lost.

**(A)** Never query 61184 on IAS-only. Homey leftover EF00 on `TS02*` is the bug.  
Do not “fix” by adding a DP query on announce for Peter.

---

## 9. TS004F vs TS0044 dual-mode 0x8004

### TS004F (true dual-mode)

`tuya.ts` L7377–L7454 `model: "TS004F"` fingerprint includes `_TZ3000_xabckq1v`, `_TZ3000_czuyt8lz`, `_TZ3000_b3mgfu0d`, … (**not** zgyzgdua):

```
fromZigbee: [tuya.fz.on_off_action, tuya.fz.operation_mode, fz.command_on, fz.command_off,
             fz.command_step, fz.command_move, fz.command_stop, fz.command_step_color_temperature],
toZigbee: [tuya.tz.operation_mode],
configure: write genOnOff {tuyaOperationMode: 1}; read tuyaOperationMode;
           bind genOnOff EP 1–4 if present
exposes: operation_mode command|event + 0xFD actions + level/on/off
```

`tuya.tz.operation_mode` (`lib/tuya.ts` L3338–L3346): write `tuyaOperationMode` lookup `{command: 0, event: 1}` = attr **0x8004**.

Page [TS004F](https://www.zigbee2mqtt.io/devices/TS004F.html): hold **2+4 ~6 s** or set `operation_mode`. Event = 0xFD 12 actions; command = standard On/Off/Level.

ZHA [ts004f.py](https://github.com/zigpy/zha-device-handlers/blob/dev/zhaquirks/tuya/ts004f.py): `TuyaSmartRemote004FDMS` for `_TZ3000_xabckq1v`/`czuyt8lz`/`b3mgfu0d` (4-btn); `TuyaSmartRemote004FROK` for knob mfrs `_TZ3000_4fjiwweb`/`uri7ongn`/`ixla93vd`/`qja6nq5z`/… **EnchantedDevice**. Same 0xFD cluster. `switch_mode` 0x8004 on the cluster.

### Knobs (same 0x8004, stay command)

`tuya.ts` L14557–L14621 `model: "ERS-10TZBVK-AA"` fingerprint `_TZ3000_4fjiwweb`, `_TZ3000_uri7ongn`, `_TZ3000_ixla93vd`, `_TZ3000_qja6nq5z`, … **also writes `tuyaOperationMode: 1`** in configure (Z2M forces event). Homey lock: knobs default **dimmer / writeSceneAttr false**. That Z2M write is **not** something to copy onto Homey knobs.

### TS0044

No `operation_mode` expose. No configure write. Page TS0044_2: messages are non-standard; bind useless.

**(A)** Homey `DeviceOperatingMode` `writeSceneAttr: false` for model TS0044 is correct. Only true TS004F (not knobs, not TS0044) may raw-write 0x8004=1.  
**(B)** Mixing TS004F + TS0044 on Homey `scene_switch_4` compose pid list is the dual-mode landmine (`NEXT_PATCHES.md` #4).

---

## 10. ZG-303Z vs `_TZE284_nt4pquef` soil

**Two couples. Do not merge.**

### `_TZE284_nt4pquef` + `TS0601` → soil (not climate)

Z2M `tuya.ts` L5151–L5182:

```
fingerprint: tuya.fingerprint("TS0601", ["_TZE284_nt4pquef"]),
model: "SGS02Z",
description: "Soil sensor",
extend: [tuya.modernExtend.tuyaBase({dp: true})],
tuyaDatapoints: [
  [2, "illuminance_level", lookup low-/low/nor/high/high+],
  [3, "soil_moisture", raw],
  [5, "temperature", divideBy10],
  [9, "temperature_unit", temperatureUnitEnum],
  [15, "battery", raw],
]
```

Issue [#10315](https://github.com/Koenkk/zigbee-herdsman-converters/issues/10315): box SKU HZ-SL09Z / Haozee; also seen as SGS02Z vs TS0601. Page: [SGS02Z](https://www.zigbee2mqtt.io/devices/SGS02Z.html) — **soil_moisture**, not humidity-as-climate.

ZHA `tuya_sensor.py`:

```
TuyaQuirkBuilder("_TZE284_nt4pquef", "TS0601")  # SG502Z
  .tuya_temperature(dp_id=5, scale=10)
  .tuya_enum(dp_id=2, light_level)
  .tuya_soil_moisture(dp_id=3)
  .tuya_enum(dp_id=9, display_unit)
  .tuya_battery(dp_id=15)
  .skip_configuration()
```

ZHA issue [#4707](https://github.com/zigpy/zha-device-handlers/issues/4707) / PR #4819 (in [releases](https://github.com/zigpy/zha-device-handlers/releases) Mar 2026). Signature clusters include **0xEF00 and 0xED00** — MCU soil, not climate.

JohanBendz README soil list: `_TZE200_myd45weu` / `_TZE284_aao3yzhs` / … — **no nt4pquef, no ZG-303Z**.

**(A)** Homey lock `soil_sensor`.  
**(B)** Stable Homey `climate_sensor` has the couple.  
**(C)** Do not add box SKU `SGS02Z` / `SG502Z` / `HZ-SL09Z` as a Homey productId.

### HOBEIAN `ZG-303Z`

Z2M `tuya.ts` L22207–L22212:

```
fingerprint: tuya.fingerprint("TS0601", ["_TZE200_wqashyqo"]),
model: "ZG-303Z",
vendor: "HOBEIAN",
description: "Soil moisture sensor",
extend: [tuya.modernExtend.tuyaBase({dp: true})],
exposes: water_warning, temperature, humidity, soil_moisture, ...
```

Second definition L24652 `zigbeeModel: ["ZG-303Z", "AY-303Z", "AY-302Z"]` `model: "CS-201Z"` vendor COOLO, fingerprint `_TZE200_npj9bug3`, `_TZE200_wrmhp6b3`.

Page: [ZG-303Z](https://www.zigbee2mqtt.io/devices/ZG-303Z.html) vendor HOBEIAN, soil.

**(A)** Soil, not `climate_sensor_energy`. Homey master lock HOBEIAN+ZG-303Z on `soil_sensor` stands.  
**(B)** Stable `climate_sensor_energy` productId includes `ZG-303Z`.  
**(C)** `CS-201Z` / `AY-303Z` zigbeeModel path is a **different** converter — do not invent those pids into Homey.

---

## 2026 Z2M / ZHA changes that can break Homey assumptions

### Cluster 6 command 0xFD (`tuyaAction` / `commandTuyaAction`)

| Change | When | Risk for Homey |
|---|---|---|
| `addTuyaGenOnOffCluster` now defines `tuyaAction` **0xFD** with **two** params: `value` UINT8 **and** `data` BUFFER (`lib/tuya.ts` L5401–L5407). Also `tuyaAction2` **0xFC**. | current master (pulled 2026-08-21); cluster extend rides `tuyaBase()` onto TS0044 after 70d44ff (2026-04-30) | Homey `parseZclHeader` that assumes **1-byte** payload at `data[5]` still matches `value` = 0/1/2. Extra BUFFER must be ignored, not treated as a second press. |
| ZHA `press_type` 0xFD + **default response required** (`TuyaSmartRemoteOnOffCluster.handle_cluster_request`) | long-standing; still current | Homey raw interceptor that swallows the frame **without** a default rsp will make remotes repeat / lag (ZHA #2415 class). |
| TS0044_2 notes ~0.3 s delay to distinguish click types | 2026-04-30 docs | Not a Homey parser bug. Do not “fix” by writing 0x8004. |

**Does not break:** 0/1/2 = single/double/hold; button = endpoint. Confirmed current `on_off_action`.

### `tuya_operation_mode` / 0x8004

| Change | When | Risk |
|---|---|---|
| 0x8004 still ENUM8 `tuyaOperationMode` / ZHA `switch_mode` Command=0 Event=1 | unchanged | Homey named `writeAttributes({tuyaOperationMode})` still hits zigbee-clusters schema wall. |
| `tuyaBase()` **registers** 0x8004 on genOnOff for **all** TS004x that use tuyaBase, including TS0044 | 70d44ff 2026-04-30 | Register ≠ device implements. TS0044 converter still **does not write**. Do not start writing because the cluster schema now lists the attr. |
| TS004F configure still `write {tuyaOperationMode: 1}` (event) | current | Copy **only** onto true TS004F, once, while awake. |
| ERS-10TZBVK-AA configure **also** writes `tuyaOperationMode: 1` | current | **Contradicts** Homey knob lock (stay command/dimmer). Do not copy. |
| zgyzgdua SKU `XH-SY-04Z` → `TS0044_2` | 2026-04-30 | Cosmetic. Converter same. Do not retarget Homey driver by Z2M model string. |

### Other 2026 landmines (locked couples only)

| Change | Risk |
|---|---|
| `respondToMcuVersionResponse` default **false** (`tuyaBase` L4456–L4458, issue 28367) | Homey leftover MCU version ping on sleepy IAS is the anti-pattern Z2M just disabled. |
| TS0207 `INVALID_EP` on genPowerCfg bind (#28181, still open behaviour) | Master Homey `water_leak_sensor` bindings `[1,1280]` still bind PowerCfg. Z2M does the same and it **fails** on some k4ej firmware. Prefer skip PowerCfg bind. |
| TS1201 discovery + `learned_ir_timings` (#12689, 2026-07) | Homey sequential Zosung→EF00 fallback is the opposite of Z2M (Zosung only, no EF00). Adding EF00 query will not match Z2M. |
| `_TZ3210_imaccztn` added to TYWB 4ch-RF (2026-03-31) | Confirms prefix change `_TZ3000_` → `_TZ3210_` on **same** TS0004. Keep both if both are in Homey compose; do not invent a third. |
| TS0004 `powerOnBehavior2` restored Jan 2026 (#11274) after accidental removal | Homey 4-ch relay power-on is ZCL `moesStartUpOnOff` 0x8002, **not** 0x8004. |
| ZHA soil `nt4pquef` quirk Mar 2026 (#4819) | Confirms soil DPs. Signature has 0xED00 **and** 0xEF00 — do not treat 0xED00 here as IR. |

---

## JohanBendz SDK3 vs Homey compose (driver map)

Default branch **SDK3** (updated 2026-03-29). Master `app.json` 0.0.10 is a stub.

| Locked couple | JohanBendz driver | Clusters | In compose? |
|---|---|---|---|
| k4ej+TS0207 | `water_detector` | `[0,1,3,1280]` bind `[1,1280]` | **yes** mfr+pid |
| k4ej+TS0207 | `water_leak_sensor_tuya` | `[0,4,5,61184]` | **no** (only `_TZE200_qq9mpfhw`/`jthf7vb6`+TS0601) |
| zgyzgdua+TS0044 | `wall_remote_4_gang` | EP1–4 OnOff bind 6 | **no** this mfr |
| mrpevh8p+TS0041 | `smart_button_switch` | EP1 `[0,6]` bind 6 | **no** this mfr |
| `_TZ3210_imaccztn`+TS0004 | `relay_board_4_channel` | EP1–4 OnOff | **no** (`_TZ3000_imaccztn` only) |
| nt4pquef / ZG-303Z | `soilsensor` | README list | **no** these mfrs |

JohanBendz is the **pattern** to copy for Peter (IAS water vs EF00 water), not a fingerprint source to cartesian-fill.

---

## Home Assistant core

No extra converter logic beyond ZHA quirks above. HA issues that only restate 0xFD / 0x8004 / IAS were skipped unless they quoted a converter.

---

## What we must not do from this research

1. Invent productIds (`SGS02Z`, `SG502Z`, `XH-SY-04Z`, `TB26-2`, `NFZB-03`, `TYWB 4ch-RF`, `ZS06`, `ERS-10TZBVK-AA` as pid, truncated IR suffixes).
2. Write 0x8004 because tuyaBase/ZHA now **define** the attribute.
3. Query EF00 on IAS TS0207 or TS004x.
4. Copy Z2M knob configure (`tuyaOperationMode: 1`) onto Homey knobs.
5. Bind genPowerCfg on k4ej just because Z2M/JohanBendz/deCONZ still try (INVALID_EP).
6. Treat Z2M whitelabel **model string** as a Homey driver id.

---

## Source index (URLs)

**Z2M converters (raw master):**  
https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/tuya.ts  
https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/lib/tuya.ts  
https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/lib/zosung.ts  

**Z2M commits / issues:**  
https://github.com/Koenkk/zigbee-herdsman-converters/commit/3678decae864aec1475c50ff4c99cb40a286e202  
https://github.com/Koenkk/zigbee-herdsman-converters/commit/70d44ff147b69d68b63c3949e73ab577c9c3acd6  
https://github.com/Koenkk/zigbee-herdsman-converters/commit/b87c1e3e507b6f9c30d140856a470c396a667522  
https://github.com/Koenkk/zigbee-herdsman-converters/commit/c6af2f956c3ed09d04780cfcc59eea5c59ff4334  
https://github.com/Koenkk/zigbee2mqtt/issues/28224  
https://github.com/Koenkk/zigbee2mqtt/issues/28468  
https://github.com/Koenkk/zigbee2mqtt/issues/17685  
https://github.com/Koenkk/zigbee2mqtt/issues/28181  
https://github.com/Koenkk/zigbee2mqtt/issues/17240  
https://github.com/Koenkk/zigbee-herdsman-converters/issues/10315  
https://github.com/Koenkk/zigbee-herdsman-converters/issues/11851  
https://github.com/Koenkk/zigbee-herdsman-converters/issues/12689  

**Z2M device pages:**  
https://www.zigbee2mqtt.io/devices/TS0044.html  
https://www.zigbee2mqtt.io/devices/TS0044_2.html  
https://www.zigbee2mqtt.io/devices/XH-SY-04Z.html  
https://www.zigbee2mqtt.io/devices/TS004F.html  
https://www.zigbee2mqtt.io/devices/TS0041.html  
https://www.zigbee2mqtt.io/devices/SH-SC07.html  
https://www.zigbee2mqtt.io/devices/TS0207_water_leak_detector.html  
https://www.zigbee2mqtt.io/devices/TS0002.html  
https://www.zigbee2mqtt.io/devices/TB26-2.html  
https://www.zigbee2mqtt.io/devices/NFZB-03.html  
https://www.zigbee2mqtt.io/devices/TS0004.html  
https://www.zigbee2mqtt.io/devices/TYWB_4ch-RF.html  
https://www.zigbee2mqtt.io/devices/ZS06.html  
https://www.zigbee2mqtt.io/devices/SGS02Z.html  
https://www.zigbee2mqtt.io/devices/ZG-303Z.html  

**ZHA:**  
https://github.com/zigpy/zha-device-handlers/blob/dev/zhaquirks/tuya/ts0044.py  
https://github.com/zigpy/zha-device-handlers/blob/dev/zhaquirks/tuya/ts0041.py  
https://github.com/zigpy/zha-device-handlers/blob/dev/zhaquirks/tuya/ts004f.py  
https://github.com/zigpy/zha-device-handlers/blob/dev/zhaquirks/tuya/ts1201.py  
https://github.com/zigpy/zha-device-handlers/blob/dev/zhaquirks/tuya/tuya_sensor.py  
https://github.com/zigpy/zha-device-handlers/blob/dev/zhaquirks/tuya/__init__.py  
https://github.com/zigpy/zha-device-handlers/issues/4707  

**deCONZ:**  
https://github.com/dresden-elektronik/deconz-rest-plugin/blob/master/devices/tuya/_TZ3000_TS0044_4gang_remote.json  
https://github.com/dresden-elektronik/deconz-rest-plugin/blob/master/devices/tuya/_TZ3000_TS0207_water_leak_sensor.json  
https://github.com/dresden-elektronik/deconz-rest-plugin/pull/8550  
https://github.com/dresden-elektronik/deconz-rest-plugin/pull/8586  

**JohanBendz SDK3:**  
https://github.com/JohanBendz/com.tuya.zigbee/tree/SDK3  
https://raw.githubusercontent.com/JohanBendz/com.tuya.zigbee/SDK3/README.md  
https://raw.githubusercontent.com/JohanBendz/com.tuya.zigbee/SDK3/drivers/water_detector/driver.compose.json  
https://raw.githubusercontent.com/JohanBendz/com.tuya.zigbee/SDK3/drivers/water_leak_sensor_tuya/driver.compose.json  
https://raw.githubusercontent.com/JohanBendz/com.tuya.zigbee/SDK3/drivers/wall_remote_4_gang/driver.compose.json  
https://raw.githubusercontent.com/JohanBendz/com.tuya.zigbee/SDK3/drivers/smart_button_switch/driver.compose.json  
https://raw.githubusercontent.com/JohanBendz/com.tuya.zigbee/SDK3/drivers/relay_board_4_channel/driver.compose.json  
