# Fine analysis — chaque message (2026-08-22)

Silent. No forum posts.

## Forum #2189 — meter91
**Text:** TS0044 + `_TZ3000_zgyzgdua`, physical dead, in-app OK, toast `button_wireless_4`.
**Diag twin:** `55e3e591` @ 9.0.617, driver `scene_switch_4`, model also `ERS-10TZBVK-AA`.
**Root causes:**
1. Physical = genOnOff **0xFD** (not toast driver).
2. Spam write **0x8004** (32772 not valid).
3. FLOW-GUARD: invented `scene_switch_4_button_1gang_button_pressed`.
**Fix status:** 0xFD + EP1–4 shipped ≥9.0.619; 0x8004 skip + flow ID hygiene in this pass.
**User:** update Test + **re-pair**.

## Forum #2190 — Peter
**Text:** SOS OK but battery glitchy; contact pulse; luminance wrong vs other tile; water/smartbutton still dead (from prior).
**Diag:** `0cea6870` @ 9.0.617.
**Root causes:**
1. Contact hybrid: DP1 open then IAS closed → pulse (prefer IAS).
2. Lux DP101 works but Flow `contact_sensor_illuminance_changed` was missing from compose.
3. SOS battery 11%→20% <100ms → double `battery_low`.
4. Water only `DATA-RECOVERY` in slice — sleepy IAS, needs update+re-pair with leftover-EF00 skip.
5. mfr **absent** in post — do not invent couples.
**Fix status:** IAS prefer + lux Flow + SOS debounce/spike this pass.

## Gmail NEW `9cbf9eb6` — Nobø SWS-IZ
**Text:** TS004F `_TZ3000_xffhmvhv`, single EP clusters 5/6/8, “only button 1 usable”.
**Reality in log:** `[TS0044-RAW] EP4/3/1` all fire; usable cards are `*_4gang_button_N_*`. Spam 0x8004 + invented `*_button_N_button_pressed` caused FLOW-GUARD noise / user confusion.
**Fix status:** skip 0x8004 for mfr; flow ID hygiene; mixin profile.

## Forum #2186/#2188 — Gabriel
`_TZ3000_lwthnp7j` 4-gang — already `wall_switch_4gang_1way`+TS0004. No invent.

## Polluted scanner FPs
Refuse: `_TZE200_ABC123`, Johan 26439 catalogue dumps.

## Code this pass
- PhysicalButtonMixin: no flow fire on `_internalTrigger`; no `1gang_button_pressed`
- ButtonDevice: real compose IDs only
- contact illuminance Flow
- SOS battery spike + flow debounce
- peculiarities + `test/critical/p2205-flow-id-hygiene.test.js`
