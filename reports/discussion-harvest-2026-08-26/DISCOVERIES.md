# P2270 Discussion harvest

Count: **74** (SHADOW · mfr+pid only · never invent pid)

| ID | Tier | Impl | Couple | Summary |
|----|------|------|--------|---------|
|D001|A|done|_TZE204_cjbofhxw+TS0601|Power clamp meter misrouted as smoke|
|D002|A|done|_TZE284_cjbofhxw+TS0601|Power clamp sibling TZE284|
|D003|A|done|_TZE284_a14rjslz+TS0601|3-phase energy meter misrouted as climate|
|D004|A|done|_TZ3000_tonrapsk+TS0002|Zemismart ZB811 2-gang needs magic|
|D005|B|done|_TZE284_cf4b5ktf+TS0601|Moes 3-phase soft lock energy meter|
|D006|B|done|_TZE284_gnpflcoq+TS0601|4in1 mmWave presence DP1 inverted 0=occupied; DP7 temp/10; DP8 humidity; DP11 lux — AlarmPolarity + device.js|
|D007|A|done|_TZ3000_402vrq2i+TS004F|Rotary knob stolen by 4-gang metering — lock smart_knob|
|D008|B|done|_TZE204_hlx9tnzb+TS0601|Moes dimmer mesh flood after power cycle; remove from switch_1gang|
|D009|A|done|_TZ3210_6cmeijtd+TS011F|Nous A11Z 3-gang strip — unsteal usb_dongle_triple + magic packet multi-ep|
|D010|A|done|_TZE204_mpbki2zm+TS0601|Wall thermostat already locked|
|D011|B|done|_TZ3210_ol1uhvza+TS130F|TS130F ol1uhvza invert_position TX/RX + reporting (ZHA#5226)|
|D012|C|done|_TZE284_aao3yzhs+TS0601|MCU time sync via GlobalTimeSyncEngine.guessFormat (soil locked)|
|D013|B|done|_TZ3210_jrhczaaa+TS130F|TS130F curtain variant|
|D014|D|done|_TZ3218_hdc8bbha+TS000F|TS000F hdc8bbha locked switch_1gang (P2272) — not switch_temp|
|D015|A|done|_TZ3000_te34fjg4+TS1002|te34fjg4+TS1002 locked scene_switch_4 0xFD (ZHA#5224)|
|D016|A|done|_TZE204_pkpfn9hc+TS0601|CO2 sensor locked air_quality_co2|
|D017|A|done|_TZE200_tyffvoij+TS0601|24GHz presence locked|
|D018|A|done|_TZE200_xu4a5rhj+TS0601|Leisguar curtain motor present|
|D019|A|done|_TZE200_a4bpgplm+TS0601|GTZ06/AVATTO TRV07 locked|
|D020|B|done|_TZE284_fqm2sfpe+TS0601|TRV support request — soft lock radiator valve|
|D021|A|done|_TZE284_q9qytwfa+TS0601|Nisko water heater / power monitor locked|
|D022|A|done|_TZE200_7upwjcca+TS0601|External converter curtain — present in curtain_motor|
|D023|D|done|_TZE284_tdg4ckyh+TS0601|tdg4ckyh soft-locked ir_blaster (P2272)|
|D024|D|watch||TH05-z / ZTH05 = ZigbeeTLc custom flash — watch upstream; do not invent pid|
|D025|C|done||Make Tuya time sync configurable — aligns GlobalTimeSyncEngine|
|D026|C|done||Sprinkler timestamp correction — MCU time formats|
|D027|A|done|_TZE284_q9qytwfa+TS0601|ZHC mirrors Nisko water heater DPs|
|D028|D|done|_TZE284_lq0ffndf+TS0601|lq0ffndf soft-locked usb_outlet_advanced (P2272)|
|D029|D|done|_TZE284_kq1l5eu5+TS0601|kq1l5eu5 soft-locked wall_curtain_switch (P2272)|
|D030|C|done|TH01Z|Failed to sync time TH01Z — time format fallback chain|
|D031|C|done|TS1201|IR TS1201 chunked Zosung + EF00 DP201 fallback + _sendIR aliases|
|D032|C|done||Scaling SSOT = SmartDivisorManager (PARSER_SSOT)|
|D033|C|done|TS130F|TS130F backlight_switch 0x5000 wired via wall_curtain_switch settings|
|D034|C|done||0xE002=manuSpecificTuya2; E001=Tuya3; E000=Tuya4 taxonomy|
|D035|A|done|_TZ3000_qaaysllp+TS0201|Neo lux LCD E002 D00D humidity max + virtual EP2 magic|
|D036|A|done|_TZ3000_bjawzodf+TY0201|Temu LCD TY0201+TS0201 magic path|
|D037|C|done||LowLevelBridge bypass Homey SDK gaps — now thin→ProtocolFallbackChain|
|D038|C|done||DeviceIOFacade unified driver I/O|
|D039|C|done||SmartDivisor anti double-division|
|D040|C|done||Double-division CI gate|
|D041|C|done||IntelligentProtocolDetect ZCL↔EF00 tree|
|D042|C|done||ProtocolRxTxChain path table|
|D043|C|done||FallbackChains pathfinding unsupported→alt|
|D044|C|done||Sacred couple mfr+pid never invent pid|
|D045|C|done||Forum silent T157628 SHADOW only|
|D046|C|done||Ban linear battery (V-2.5)/0.5 — UnifiedBatteryHandler|
|D047|C|done||BSEED zcl_only never force EF00|
|D048|C|done||MCU brightness 0-1000 clamp TuyaBrightnessScale|
|D049|A|done|HOBEIAN+ZG-204ZK|Presence sensor HOBEIAN couple-aware|
|D050|D|done||cjbofhxw clamp family already on power_clamp_meter (P2268)|
|D051|B|done|_TZ3000_anptztic+TS0001|External converter 1gang — soft present plug/switch catalogs|
|D052|D|done|_TZE284_bjoccxbi+TS0601|bjoccxbi soft-locked led_controller_rgb (P2272)|
|D053|D|done|_TZE284_u15pabbc+TS0601|u15pabbc soft-locked switch_1gang (P2272)|
|D054|C|done||ZclDefaultResponsePolicy skips wait for Tuya TS000x/TS011F/TS130F|
|D055|C|done||Discussion harvest pipeline + CommunicationPathFinder|
|D056|B|done|_TZE284_gnpflcoq+TS0601|AlarmPolarityManager inverted motion lock|
|D057|B|done|_TZE204_tdg4ckyh+TS0601|Soft lock ir_blaster|
|D058|B|done|_TZE204_kq1l5eu5+TS0601|Soft lock wall_curtain_switch|
|D059|B|done|_TZE204_bjoccxbi+TS0601|Soft lock led_controller_rgb|
|D060|B|done|_TZE204_lq0ffndf+TS0601|Soft lock usb_outlet_advanced + couple DP map|
|D061|A|done|_TZE204_guvc7pdy+TS0601|Unstolen from switch_1gang → curtain_motor|
|D062|C|done||DeviceFusionHooks split + UniversalTuyaParser quarantine + SSOT docs|
|D063|A|done|_TZE284_rccxox8p+TS0601|PA-44Z smoke unstolen from climate → smoke_sensor2|
|D064|A|done|_TZE284_dikb3dp6+TS0601|Zemismart 3-phase meter unstolen from climate → energy_meter_3phase|
|D065|A|done|_TZE204_lpedvtvr+TS0601|Moes Star Ring unstolen climate→wall_thermostat|
|D066|A|done|_TZE204_xalsoe3m+TS0601|BHT-002 unstolen TRV→wall_thermostat|
|D067|A|done|_TZE204_ogx8u5z6+TS0601|P2278 me167 + DP47 cal ÷10 TX/RX (sibling _TZE284_ogx8u5z6)|
|D068|A|done|_TZE284_1fuxihti+TS0601|P2279 cover unstolen from climate (+ TZE200/204 siblings)|
|D069|A|done|_TZE284_mvtclclq+TS0601|P2279 DS-1450WN USB+plugs — unsteal wall_dimmer TZE200 + DP1-4 profile|
|D070|C|done||Dual-app inconsistency sweep: stable unsteal P2274–P2279 + BOTH TX/RX backport|
|D071|C|done||Workflow lineage: P102 forum silent → P2138 sacred matrix → P2206 privacy → P2228 CI vs Homey → P2267 E002 → P2268 parallel|
|D072|C|done||Keep ZclClusterLexicon E002=manuSpecificTuya2 + CommunicationPathFinder sacredZclOnly penalties + WHY headers|
|D073|C|done||Workflow discovery lineage SSOT — past P102–P2266 + recent P2267/P2268 + present P2269+ wired in GHA|
|D074|A|done|_TZ3000_mrpevh8p+TS0041|Peter #2202: false HOBEIAN water MISATTR soil + Smartbutton 0xFD handleFrame arity|

## Keep (plan previous)

- `ZclClusterLexicon` — E000/E001/E002 taxonomy (P2267)
- `CommunicationPathFinder` + `PROTOCOL_PATHS` + `COMM_PATHFINDING.md`
- SSOT: PROTOCOL / BATTERY / TIME / PARSER + `SPAGHETTI_MAP.md`
- WHY comments on hotspots (P215)
