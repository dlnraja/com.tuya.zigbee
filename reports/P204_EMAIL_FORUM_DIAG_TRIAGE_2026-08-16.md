# P204 — Latest Homey/GitHub emails + forum + diags (2026-08-16)

## Sources
- Gmail CI artifact `31974051072` (100 emails: Homey system + 3 Diagnostics Reports + GitHub noise)
- GitHub notifications (CI failures, closed #420 state_change)
- Forum silent scan topics 140352 / 26439 / 89271

## Verdicts

| Signal | Finding | Action |
|--------|---------|--------|
| Peter #2167 | Water detector + no crash after recent builds | Confirm only — OOM/IAS already P203 |
| PresentSky `m1cvyneb` | Wrong driver pairing | Already P203 misattr guard |
| GH #420 `clrdrnya` | Correct driver = `presence_sensor_radar`; spam comments were pre-P202 | Expand forbiddenDrivers (+ mmwave); registry note MTG235 |
| 13× Athom `processing_failed` | Transient Athom (P139) | **No bump-loop** |
| `battery_anomaly_detected` | Flow/telemetry category, not crash | No runtime change |
| Auto-Publish hard-fail dirty tree | `::error::Uncommitted…` → exit 1 | Soften to warning + skip/retry (P204) |
| Sacred dry-gate ENOENT | `issue-439-fps.json` / `mfr-pid-cross-ref.json` | Soft-skip apply scripts |
| Forum `_TZE200_ABC123` | Placeholder in maintainer post | Ignore |

## Sacred couples re-checked (OK)
- `_TZE204_clrdrnya`+TS0601 → `presence_sensor_radar` only
- `_TZE284_m1cvyneb`+TS0601 → `wall_dimmer_tuya` only
- `_TZE284_nt4pquef` / `_TZE284_aao3yzhs` / `_TZE284_myd45weu` → `soil_sensor`

## Classification
- Auto-Publish + CI apply soft-skips: **MASTER_ONLY** (workflow/tooling)
- Misattribution registry clrdrnya expansion: **BOTH** (reliability pairing guard)
