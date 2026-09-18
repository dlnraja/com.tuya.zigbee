# L99 treat — Gmail + GitHub 2026-09-18 (silent)

## Sources harvested
- Gmail: Homey build mails + processing_failed (P139 soft) + diag `6eabd9c4` (Michaelp TRV)
- Gmail forum digests: VicHY #2250/#2252, Michaelp #2253
- GitHub open: **#547/#550** HiepSVG `_TZE204_gkfbdvyx`+`TS0601`
- GitHub closed: #548 Wuma68 crash @9.0.908 (`97413373…`) tip-lag; #549 TZE200 sibling

## Tip channel
Homey Test **9.0.1070** (#3283) already live after P2594 draft→test.

## Actions shipped this pass

### P2595 BOTH — GH#550 gkfbdvyx (lux OK / presence+distance dead / phantom Channel 1)
Couple: `_TZE204_gkfbdvyx`+`TS0601` → `presence_sensor_radar` (ZY-M100-24GV3)
- DP9 distance locked **÷10** (Z2M), not smartDivisor
- DP10 lux complementary; lux-rate corroborates unreliable DP1 when DP9 silent
- `hasRelay: false` + DynCap strips `onoff`/`button.1` (was kept by mainsPowered/compose)
- `removeCapability` allow-strip for ceiling no-relay family

### P2594 (prior) — Michaelp diag `6eabd9c4` @9.0.1037
Confirmed: Profile **standard** before mfr ensure; DP3 TX; `0/10` queries. Tip ≥1070.

### P139
Do **not** force republish loops on socket hang up — tip 1070 healthy.

## User actions (no forum POST)
- HiepSVG: update Test ≥**9.0.1071** (this tip) → Repair radar → wave; Channel 1 should disappear
- Michaelp: Test ≥1070 → Repair TRV
- VicHY: Test ≥1067 + Repair (Software Shield)

## Dual-app
BOTH reliability → surgical stable backport when publish asked.
