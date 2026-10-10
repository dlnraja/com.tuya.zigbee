# Field notes — curtain_motor "doesn't move" + mmWave class flip (2026-10-10)

## curtain_motor: _TZE200_127x7wnl, _TZE204_5slehgeo, _TZE200_icka1clh

Sources: Homey diagnostics (read-only Gmail, noreply@homey.app), logs ab5aaf04 (01/09, 9.0.775)
and the 15-log thread 11/09–13/09 (48baba36 … ed0de063, app 9.0.874–9.0.908);
Z2M zigbee-herdsman-converters `src/devices/tuya.ts` (Koenkk & contributors) for icka1clh.

What the logs show (rewritten, not quoted):
- 9.0.775: `[TUYA] Failed to send DP1/DP8: Tuya cluster not available` while the TX
  wrapper still logged success → false success, motor never moved. Fixed by P2380
  (fa31ad8575, 02/09) + P2403 soft skip (4e699672c4, 03/09).
- 9.0.874–9.0.908 (5slehgeo / 127x7wnl, "Still not responding"): EF00 is detected,
  Moes ZTS path sends DP1+DP2 with inverted position, Homey reports TX OK, but the
  device never sends anything back; one TX ends with Homey "device unreachable".
  Fixed afterwards by P2467 (f575a24fcd, 11/09: real mcuSyncTime 0x24 + EF00 init
  before first motion), plus single-retry for Moes ZTS (P2480).
- A sibling cover that does report (DP2 119 → 100, DP1 1) shows the RX path works,
  but each frame is processed ~6× (duplicate listeners, suppressed by dedupe).
- icka1clh is Z2M `TS0601_cover_4` (Moes AM43-0.45/40-ES-EB): DP1 control, DP2 set
  position, DP3 reported position, DP5 direction, 101 mode, 105 speed; no ZCL 258.
  Already EF00-only in our ZCL fallback guard (P2461).
- 127x7wnl / 5slehgeo are NOT in Z2M; the "Moes ZTS-EUR-C" label comes from our GitHub #533.

Verdict: every failure pattern in the reports predates fixes already on master,
stable-v5 and bastien-home; no report since 13/09. No new runtime change made.

Ask for a new diag if a user reports it again (app ≥ current): the log must show
`[CURTAIN] P2467 Moes MCU time-sync armed`, the `P2412/P2464/P2467 Moes ZTS TX` line,
and 30 s after one Open press whether any `DP… received` line comes in; plus the
device interview (endpoint clusters) and whether the wall button moves the motor.
No RX + unreachable = mesh/range; RX but no motion = DP mapping/invert issue.

Open: RX listener fan-out (~6× per frame) on curtain_motor — harmless today, audit later.

## mmWave _TZE200_3towulqd class change

Only in `presence_sensor_radar` (class sensor) on all three branches; device.js refuses
any setClass other than `sensor` (P2548, f509fb2e83, 17/09). Reports through 21/09 are
on builds around that fix. Nothing more to change.
