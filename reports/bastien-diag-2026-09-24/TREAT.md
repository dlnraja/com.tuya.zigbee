# Bastien diag 27b0bd04 — P2718 + P2720

Silent treat. No forum POST. Gmail thread `1a0cee90e628df4b` (3 diags). No newer Bastien diag after 27b0bd04. Build #100 (1.0.91) was testing — tip-lag: house still reported on **1.0.82**.

## Timeline
| When | Tip | UUID | Symptom |
|------|-----|------|---------|
| 23 Sep 15:36Z | 1.0.76 | `1f4dcf2e` | TS0042 latency |
| 23 Sep 22:09Z | 1.0.80 | `e1654535` | TS0042/43 slow |
| **24 Sep 06:56Z** | **1.0.82** | **`27b0bd04`** | **Aucun des 3 boutons** |

## Root cause
1. Presses RX OK (`0xFD` snappy) → heap OOM → SIGABRT (LIVE-DATA junk merge + profile spam).
2. P2718 tip **1.0.91** skips OTA overlay but **did not purge** leftover `live_data_overlay` from ≤1.0.82.
3. If BootBudget `!allowHeavy` after OOM, LiveDataUpdater never started → overlay never cleared.
4. Button press still logged + allocated battery path before skipBatteryReporting return.

## Fix P2720 (BOTH + Bastien)
- LiveDataUpdater Bastien: **unset** `live_data_overlay` + `live_data_version` then return
- Bastien `app.js`: always start LiveDataUpdater for purge; skip PredictiveHealth timers
- ButtonDevice: early return on skipBatteryReporting before “reading battery” log

## Tips
| App | Tip |
|-----|-----|
| Bastien | **1.0.92** |
| Universal | **9.0.1231** |
| Stable | **5.12.330** |

## User (Bastien)
1. Update **Zigbee Bastien** Test → ≥**1.0.92** (not 1.0.82 / not wait on #100 alone if still 1.0.91)
2. Restart app once after update (purge runs at start)
3. Press TS0041 / TS0042 / TS0043 — Flow → relays
4. If still dead: send new diag UUID
