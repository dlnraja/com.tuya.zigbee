# Forum silent media sweep — 2026-08-15 (re-scan 21:16 CET)

Policy: silent enrich only (no forum replies). Topics: 140352, 146735, 26439, 89271, 43287, 157628, 157859.

## Scan (fresh)

| Topic | Scanned | Actionable / rich | New FPs | Gaps |
|-------|---------|-------------------|---------|------|
| 140352 | 80 / 50 | 37 / 36 | 0 | 0 |
| 146735 | 80 / 50 | 20 / 22 | 0 | 0 |
| 26439 | 80 / 50 | 24 / 25 | 0 | 0 |
| 89271 | 80 / 50 | 53 / 31 | 0 | 0 |
| 43287 | 80 / 50 | 18 / 32 | 0 | 0 |
| 157628 | 5 | 2 / 3 | 0 | 0 |
| 157859 | 21 | 4 / 11 | 0 | 0 |

T140352 last post still **#2140** (2026-08-15T18:22Z) — no newer messages. Artifacts refreshed under `.github/state/forum/`.

## Image / URL analysis (T140352)

| # | User | Media | Sacred couple | Verdict |
|---|------|-------|---------------|---------|
| 2129 | Welshsmarthome | Socket photo → Homey Zigbee Device Info | **`_TYZB01_hlla45kx` + `TS011F`** (router) | Already on `double_power_point_2`. Update Test → pair **Double Power Point**. |
| 2130 | Kanbros | text + FP | `_TZ3000_w5xztuy7` + TS0002 | On `switch_2gang`; **P139**: forced **ZCL-only** (both gangs). |
| 2131 | TBoy | text | `_TZ3210_imaccztn` + TS0004 | OK → `relay_board_4_channel` (not switch_4gang). |
| 2132 | RoyceRoy | manual screenshot | `_TZE204_clrdrnya` + TS0601 | Settings already in `presence_sensor_radar` (breaker/status/illuminance). |
| 2133/2138 | PresentSky | BSEED product URL + interview | `_TZE284_m1cvyneb` + TS0601 | OK → `wall_dimmer_tuya` only; remove stale climate pair + re-add. |
| 2135 | RoyceRoy | AliExpress PDF | `_TZE28C1000000_jtbgusdc` + TS0601 | OK → `dimmer_2_gang_tuya`. |
| 2137 | Peter | crash screenshots + diag `634f7b19…` | — | Reliability already on Test ≥9.0.528 / stable ≥5.12.82; update + repair. |
| 2140 | Mike_Nono | opinion only | — | No FP / no code action. |

## Johan / archive (links)

- `_TZE284_nt4pquef` / `_TZE284_aao3yzhs` soil (Z2M/ZHA issues) → `soil_sensor` (P138 already shipped).
- Bed presence `seq9cm6u` → `bed_sensor`.

## Code changes this pass

1. `drivers/switch_2gang/device.js` — add `_TZ3000_w5xztuy7` to `ZCL_ONLY_MANUFACTURERS_2G`.
2. `.cursorrules` — BSEED ZCL list updated.
3. `test/critical/forum-routing-regressions.test.js` — #2129 / #2130 asserts.

## User actions (no auto-reply)

1. Welshsmarthome: Test update → pair as **Double Power Point** (`_TYZB01_hlla45kx` + TS011F).
2. Kanbros: Test update → remove/re-pair **2-gang switch** (ZCL-only both channels).
3. PresentSky: remove climate-paired dimmer → pair as **wall dimmer**.
4. TBoy: pair as **4-channel relay board**.
5. Peter: update to latest Test / stable and re-check SOS after repair.
