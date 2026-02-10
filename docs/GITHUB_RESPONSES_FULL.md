# GH Full Responses — dlnraja v5.8.88 (12 open, 0 replied)

## #127 Tauno20 — WZ-M100 FIXED v5.8.87+88
> Fingerprint added v5.8.87. Ghost temp/hum fixed v5.8.88. Update, remove+re-pair. Send diag if still issues.

## #126 azkysmarthome — TS0203 SUPPORTED
> `_TZ3000_zutizvyk` in contact_sensor. Update, remove+re-pair.

## #124 Lalla80111 — uppercase FIXED
> Both `_TZ3000_fllyghyj` (climate_sensor) and `_TZ3000_b4awzgct` (button_wireless_1) present with correct case. Update+re-pair.

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

## Freddyboy PERSISTENT
> TS0044 physical broken v5.5.714→v5.8.65. All layers in code. NEEDS fresh diag on v5.8.88.

## Cam PERSISTENT
> TS0041 _TZ3000_5bpeda8u no presses. BoundCluster+E000 added. NEEDS fresh diag on v5.8.88.

## Ricardo_Lenior (p60)
> 230v presence wrong caps (battery/mmwave on mains). NEEDS fingerprint. Only has diag 77C4CE16.

## GH#127 Tauno20 — _TZE204_e5m9c5hl WZ-M100
> FP collision fixed: removed from ceiling+mmwave drivers. Now only in presence_sensor_radar with WZ_M100 config. Update to v5.8.89, remove+re-pair.

## GH#126 azkysmarthome — _TZ3000_zutizvyk TS0203
> Already in contact_sensor. Update to v5.8.88, remove+re-pair.

## GH#124 Lalla80111 — _TZ3000_b4awzgct TS0041 button no flow
> FP present. EP1 has E000 cluster. Update to v5.8.89, remove+re-pair. If still broken, send diagnostic code.

## GH#123 — 46 fingerprints community sync
> All 46 verified present. Can be closed.
