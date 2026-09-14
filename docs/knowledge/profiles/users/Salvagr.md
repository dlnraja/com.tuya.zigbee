# Salvagr (GitHub #533)

## Couple
`_TZE204_5slehgeo` + `TS0601` → `curtain_motor` (Moes ZTS-EUR-C)
Also on same Homey: `_TZE200_127x7wnl` + `TS0601` → `curtain_motor` (Persiana Comedor)

## Status
OPEN — motor moves on tip ≥9.0.893; crashes / settings hang on **≤9.0.908** = EF00 double-manager + re-init OOM (**P2484/P2486**). Need Test tip **≥9.0.916**.

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
| 2026-09-11 | Tip stuck 9.0.874 + wake-ping before every DP `48baba36` | **P2467b** force mains for Moes |
| 2026-09-12 | Mid-% → full open/close + timeout `f177ecd4` @ 9.0.891 | **P2478** DP2-only mid + soft timeout |
| 2026-09-12 | % crash `cbff8de4` @ 9.0.895 | tip lag + **P2481** motionsensor |
| 2026-09-13 | Still crash / settings hang `ed0de063` @ 9.0.908 | **P2484** idempotent init + **P2486** no EF00 manager replace |

## TinyTuya DPs (user 2026-09-03)
DP1 control open/stop/close · DP2 percent_control · DP3 calib · DP7 backlight · DP8 reverse · DP10 calib seconds · DP14 light_mode

## GitHub voice (P2394)
Human Dylan replies only. No reopen-bot / diag-resolver walls on this thread.
User message: update Universal Tuya Test to **≥9.0.916**, no re-pair if already Curtain Motor; fresh diag if settings still hang.
