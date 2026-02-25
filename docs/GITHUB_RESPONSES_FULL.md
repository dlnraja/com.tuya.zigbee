# GH Full Responses — dlnraja v5.9.23 (12 open, 0 replied)

## #127 Tauno20 — WZ-M100 FIXED v5.8.87+88
> Fingerprint added v5.8.87. Ghost temp/hum fixed v5.8.88. Update, remove+re-pair. Send diag if still issues.

## #126 azkysmarthome — TS0203 SUPPORTED
> `_TZ3000_zutizvyk` in contact_sensor. Update, remove+re-pair.

## #124 Lalla80111 — TS0041 button NO FLOW (ACTIVE — v5.8.77)
> **Feb 4**: v5.8.12 fixed climate_sensor. Button_wireless_1 (`_TZ3000_b4awzgct` TS0041) doesn't trigger flows. Interview: 4 EPs, cluster 57344 on EP1.
> **Feb 8**: Re-paired on v5.8.77, buttons pair OK but NO flow works (single or double press).
> **Analysis**: E000 BoundCluster on EP1 exists since v5.8.66. Device needs diagnostic with button presses to see which detection layer fails.
> **Action**: Ask user to update to v5.9.23, re-pair, press buttons, then submit diagnostic report within 60s. (v5.9.20 added OnOffBoundCluster bind for multi-press)

## #123 auto — 46 fps ALL PRESENT
> All 46 verified. No action needed.

## #122 elgato7 — Longsam FIXED v5.8.88
> Root cause: Tuya DP listener silently failed (no tuyaEF00Manager). Direct cluster fallback added. Update, remove+re-pair.

## #121 DAVID9SE — _TZ3000_an5rjiwd FIXED v5.8.88
> Found the bug: your TS0041 fingerprint was placed in the wrong driver (button_wireless_4/TS0044 instead of button_wireless_1/TS0041). Fixed in v5.8.88. Update, remove+re-pair. Note: first press after sleep may be lost (Zigbee limitation for sleepy battery devices).

## #114 Lalla80111 — TS0041 _TZ3000_b4awzgct SUPPORTED
> In button_wireless_1. Update, remove+re-pair.

## #113 Ernst02507 — TS004F _TZ3000_gwkzibhs SUPPORTED
> In smart_knob_rotary. Update, remove+re-pair.

## #110 Pollepa — TS011F _TZ3210_w0qqde0g SUPPORTED
> In plug_energy_monitor. Update, remove+re-pair.

## #98 DVMasters — TS0043 _TZ3000_famkxci2 SUPPORTED
> In button_wireless_3 (LoraTap 3-button). Update, remove+re-pair.

## #97 NoroddH — TS0225 _TZ321C_fkzihaxe8 SUPPORTED
> In presence_sensor_radar. Update, remove+re-pair. If no values, send diagnostic report.

---

# JohanBendz Issues — dlnraja cross-ref

## JB#1345 Nono-3ric — AVATTO WT198 _TZE284_xnbkhhdr TS0601
> BUG FOUND: Was in BOTH thermostat_tuya_dp AND radiator_valve (collision!).
> FIXED v5.8.88: Removed from radiator_valve. Correct driver = thermostat_tuya_dp.
> Z2M confirms same DPs as _TZE200_viy9ihs7. DP16/24=target_temp(÷2), DP2=target_temp(÷10).
> Time sync already implemented in TuyaSyncManager.js (DP 0x24).
> User's "incomplete interview" = sleepy battery device. Must keep awake during pairing.

## JB#1344 fjvs1467 — _TZ3000_bgsigers TS0201 bug
> FOUND in climate_sensor in dlnraja fork. Reply: supported.

## JB#1343 cvh1111 — _TZE200_rhgsbacq 10G sensor
> In presence_sensor_radar in dlnraja fork.

## JB#1339 pjmpessers — _TZ3000_blhvsaqf TS0001
> In switch_1gang (BSEED ZCL-only) in dlnraja fork.

## JB#1338 pjmpessers — _TZ3000_qkixdnon TS0003
> In switch_3gang in dlnraja fork.

## JB#1337 pjmpessers — _TZ3000_l9brjwau TS0002
> In switch_2gang (BSEED ZCL-only) in dlnraja fork.

## JB#1336 csmobiel — _TZE284_aa03yzhs soil
> FOUND in soil_sensor in dlnraja fork. Reply: supported.

## JB#1335 dlnraja — Fork merge proposal
> YOUR issue. Check if needs update/reply.

## JB#1331 MF-ITuser — UFO-R11 _TZ3290_ot6ewjvmejq5ekhl TS1201
> FOUND in ir_blaster in dlnraja fork. Reply: supported.

## JB#1342 geertvanelslander — Zbeacon DS01 door/window
> FOUND: DS01 in contact_sensor, Zbeacon in climate_sensor.

## JB#1341 proisland — _TZE284_aao3yzhs plant sensor
> FOUND in soil_sensor in dlnraja fork.

## JB#1340 xclv-ai — generic device request
> Needs specific modelId/manufacturerName to check.

---

# Forum Posts — New (2026-02-09)

## Forum #1352 Freddyboy — Moes 4-button physical buttons NOT triggering (v5.7.52)
> KNOWN ISSUE. Moes 4-button (TS0044) physical detection uses E000 cluster.
> v5.8.66+ added E000 detection to button_wireless_4. User on old v5.7.52.
> Reply: Update to latest test version (v5.8.88), remove+re-pair.
> If still broken, send new diagnostic report.

## Forum #1353 DutchDuke — _TZE284_oitavov2 soil sensor as unknown
> PRESENT in soil_sensor driver. User likely on old version.
> Soil temp ÷10 fix in v5.8.87. Reply: Update to v5.8.88, remove+re-pair.

## Nono-3ric follow-up — WT198 thermostat interview incomplete
> Root cause: battery sleepy device. Collision FIXED (removed from radiator_valve).
> Time sync implemented. DP mapping correct (DP1/2/3/4/16/24).
> Reply: Update to v5.8.88, keep device awake during pairing, remove+re-pair.

---

# DRAFT REPLIES

## JB#1345 Nono-3ric
> Supported in thermostat_tuya_dp. Fixed collision with radiator_valve in v5.8.88.
> Battery sleepy device — press buttons during pairing. Update, remove, re-pair.

## Forum #1352 Freddyboy
> Physical button fix added in v5.8.66+. You're on v5.7.52. Update to v5.8.88, remove+re-pair.

## Forum #1353 DutchDuke
> _TZE284_oitavov2 is in soil_sensor driver. Update to v5.8.88, remove+re-pair.

## dlnraja#110 Pollepa
> _TZ3210_w0qqde0g TS011F in plug_energy_monitor. Update, remove+re-pair.

## Lasse_K (p69 v5.8.43)
> Water no alarm: IAS enrollment fixed v5.8.88. Contact reversed: double-inversion fixed v5.8.85.

## blutch32 (p68)
> _TZ3000_996rpfy6 TS0203 alarm broken. Double-inversion bug fixed v5.8.85. Update+re-pair.

## Freddyboy PERSISTENT (UPDATED Jun 2026)
> v5.8.65: Still no flow with physical buttons. Diag 34b9565c. E000+scenes+multistate all in code.
> v5.9.20: OnOffBoundCluster bind per EP + cmd 0xFD intercept. v5.9.22: TuyaPressTypeMap safety guard.
> NEEDS update to v5.9.23, re-pair, press all buttons, submit diag.

## Cam PERSISTENT (UPDATED Jun 2026)
> v5.8.66: Still no button presses. Diag 4b2150c6. BoundCluster+E000 on EP1 exists since v5.8.66.
> Same pattern as Lalla80111 (GH#124). v5.9.20: OnOffBoundCluster bind per EP + cmd 0xFD intercept.
> NEEDS update to v5.9.23, re-pair, press buttons, submit diag.

## Ricardo_Lenior (p60)
> 230v presence wrong caps (battery/mmwave on mains). NEEDS fingerprint. Only has diag 77C4CE16.

## GH#127 Tauno20 — _TZE204_e5m9c5hl WZ-M100
> FP collision fixed: removed from ceiling+mmwave drivers. Now only in presence_sensor_radar with WZ_M100 config. Update to v5.8.89, remove+re-pair.

## GH#126 azkysmarthome — _TZ3000_zutizvyk TS0203
> Already in contact_sensor. Update to v5.8.88, remove+re-pair.

## GH#124 Lalla80111 — _TZ3000_b4awzgct TS0041 button NO FLOW (ACTIVE)
> STILL BROKEN v5.8.77. E000 on EP1 exists. v5.9.20: OnOffBoundCluster bind + cmd 0xFD intercept.
> Update v5.9.23, re-pair, press buttons, submit diag.

## GH#110 Pollepa — TS011F metering FIXED v5.8.91
> ZCL plug _TZ3210_w0qqde0g. Root cause: configureReporting only had activePower, missing rmsVoltage+rmsCurrent. Also no initial readAttributes. Fixed in HybridPlugBase. Update v5.8.91, remove+re-pair.

## FORUM: JJ10 — Presence sensor v5.8.66→v5.8.77
> v5.8.66: Found correctly, motion 1sec only, lux/distance not updating, battery '?'. Diag 17c03ea7.
> v5.8.77: Motion/lux/distance WORKING. Temp/hum show but don't change — likely device doesn't support them or ghost caps. No action needed unless user reports again.

## FORUM: Lasse_K — Water sensor TIMELINE
> v5.8.43: Installed as water sensor ✅ → v5.8.65/66/78: Regressed to unknown ❌ → v5.8.88: Installs OK, no alarm.
> IAS enrollment improved v5.8.88. Needs re-pair on v5.8.91 + diag if no alarm.

## FORUM p70: Piotr_Cetler — TS0002 2-gang both toggle
> _TZ3000_cauq1okq in switch_2gang. Update+re-pair v5.8.90.

## FORUM p70: Lasse_K — Water sensor no alarm v5.8.88
> IAS enrollment improved. Needs re-pair + diag.

## GH#123 — 46 fingerprints community sync
> All 46 verified present. Can be closed.


## Nightly Auto-Responses (2026-02-20 v5.11.17)
- **dlnraja/com.tuya.zigbee#128** @Wuma68: `_TZE204_nklqjk62` (template)
- **dlnraja/com.tuya.zigbee#132** @dlnraja: `_TZ3000_tzvbimpq`, `_TZ3000_zgyzgdua`, `_TZE204_9mjy74mp`, `_TZ3002_pzao9ls1` (template)
- **dlnraja/com.tuya.zigbee#131** @dlnraja: `_TZ3002_pzao9ls1`, `_TZ3000_5iixzdo7`, `_TZE204_nklqjk62`, `_TZ3210_xzhnra8x`, `_TZE284_6ycgarab`, `_TZE200_u6x1zyv2`, `_TZE204_gkfbdvyx`, `_TZE204_dwcarsat`, `_TZ3000_zutizvyk`, `_TZE284_xnbkhhdr`, `_TZE200_rhgsbacq`, `_TZE284_aao3yzhs`, `_TZE284_aa03yzhs` (template)
- **dlnraja/com.tuya.zigbee#130** @dlnraja: `_TZ3000_tzvbimpq`, `_TZ3000_zgyzgdua`, `_TZ3000_ja5osu5g` (template)
- **JohanBendz/com.tuya.zigbee#839** @bbrodnik: `_TZE200_znbl8dj5` (template)
- **JohanBendz/com.tuya.zigbee#1331** @MF-ITuser: `_TZ3290_ot6ewjvmejq5ekhl` (template)
- **JohanBendz/com.tuya.zigbee#1065** @slicke: `_TZ3210_j4pdtz9v` (template)
- **JohanBendz/com.tuya.zigbee#1075** @mech78: `_TZ3210_eejm8dcr` (template)
- **JohanBendz/com.tuya.zigbee#1106** @mkoslacz: `_TZ3002_vaq2bfcu` (template)
- **JohanBendz/com.tuya.zigbee#1118** @pbruining: `_TZ3000_ww6drja5` (template)
- **JohanBendz/com.tuya.zigbee#1122** @mikberg: `_TZE200_kb5noeto` (template)
- **JohanBendz/com.tuya.zigbee#1137** @antonhagg: `_TZ3000_c8zfad4a` (template)
- **JohanBendz/com.tuya.zigbee#1166** @chernals: `_TZ3000_c8ozah8n` (template)
- **JohanBendz/com.tuya.zigbee#1195** @YuriEstevan: `_TZE204_bjzrowv2` (template)
- **JohanBendz/com.tuya.zigbee#1209** @crimson7O: `_TZ3000_kfu8zapd` (template)
- **JohanBendz/com.tuya.zigbee#1210** @TKGHill: `_TZE204_lawxy9e2`, `_TZE204_nklqjk62` (template)
- **JohanBendz/com.tuya.zigbee#1218** @Melectro1: `_TZE204_dapwryy7` (template)
- **JohanBendz/com.tuya.zigbee#1219** @Melectro1: `_TZ3000_gjrubzje` (template)
- **JohanBendz/com.tuya.zigbee#1237** @WJGvdVelden: `_TZE284_gyzlwu5q` (template)
- **JohanBendz/com.tuya.zigbee#1253** @Peter-Celica: `_TZE200_pay2byax`, `_TZ3000_mrpevh8p` (template)
- **JohanBendz/com.tuya.zigbee#1346** @pkuijpers: `_TZE200_locansqn` (template)
- **JohanBendz/com.tuya.zigbee#724** @MihaiINW: `_TZE200_3towulqd` (template)
- **JohanBendz/com.tuya.zigbee#740** @maccyber: `_TZE200_3towulqd` (template)


## Nightly Auto-Responses (2026-02-21 v5.11.19)
- **JohanBendz/com.tuya.zigbee#1229** @eeckelaertyannick: `_TZE200_8ygsuhe1` (template)


## Nightly Auto-Responses (2026-02-22 v5.11.19)
- **JohanBendz/com.tuya.zigbee#1327** @Jesse22homey: `_TZ3000_zgyzgdua` (template)
- **JohanBendz/com.tuya.zigbee#1330** @PhilbyD: `_TYZB01_4lwqwyqn` (template)


## Nightly Auto-Responses (2026-02-24 v5.11.22)
- **dlnraja/com.tuya.zigbee#135** @Domingoso: `_TZE200_xlppj4f5` (gh-gpt-4o-mini)


## Nightly Auto-Responses (2026-02-25 v5.11.24)
- **dlnraja/com.tuya.zigbee#136** @github-actions[bot]: `_TZE200_jt50ea5d`, `_TZ3210_jaap6jeb`, `_TZE284_g1enhdsi`, `_TZ3000_qamj2vnn`, `_TZ3000_tw4ztbp4`, `_TZ3000_avotanj3`, `_TZ3290_7v1k4vuf`, `_TZ3290_rlkmy85q`, `_TZ3290_jxvzqatw`, `_TZ3290_lypnqvle`, `_TZ3290_nba3knps`, `_TZ3290_yac64inu`, `_TZE204_2jnoy8dj`, `_TZ3210_iymfxdis`, `_TZ3002_xkxgfxsg`, `_TZ3002_tlsvxhxc`, `_TZE200_seq9cm6u` (gh-gpt-4o-mini)
