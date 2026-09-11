# Salvagr (GitHub #533)

## Couple
`_TZE204_5slehgeo` + `TS0601` → `curtain_motor` (Moes ZTS-EUR-C)

## Status
OPEN — pairs as Curtain Motor but **no move / no RX** on tip ≤9.0.874 (diag `d05e6530`).
Need Test tip **≥ 9.0.885** (P2467).

## Thread (resolved in code)
| Date | Symptom | Fix |
|------|---------|-----|
| 2026-08-29 | Radiator / wrong driver | Sacred couple lock |
| 2026-08-30 | Unknown Zigbee Device | P2329 clusters 0/4/5/61184 |
| 2026-08-31 | Exact mfr dropped by compact | P2348 |
| 2026-08-31 | button.1 errors + DP 3/7/8/10 | P2356 |
| 2026-09-01 | Cover stop working `ab5aaf04` @ 9.0.775 | P2380 false-success TX |
| 2026-09-02 | Pairs OK, no motion `a9e4d712` @ 9.0.784 | **P2393** Homey idle cancels down |
| 2026-09-11 | ACK on DP1/DP2, motor silent, no physical RX `d05e6530` @ 9.0.874 | **P2467** EF00 `initialize(zclNode)` + real `mcuSyncTime` + DP2→DP1 |

## TinyTuya DPs (user 2026-09-03)
DP1 control open/stop/close · DP2 percent_control · DP3 calib · DP7 backlight · DP8 reverse · DP10 calib seconds · DP14 light_mode

## GitHub voice (P2394)
Human Dylan replies only. No reopen-bot / diag-resolver walls on this thread.
