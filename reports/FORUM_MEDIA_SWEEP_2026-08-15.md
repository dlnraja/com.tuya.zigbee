# Forum silent media sweep — 2026-08-15

Policy: silent enrich only (no forum replies). Sources: T140352, T26439, T89271, T146735, T43287, T157628, T157859.

## Scan summary

| Topic | Scanned | Actionable | New FPs | Media/FP rich |
|-------|---------|------------|---------|---------------|
| 140352 | 100 | 54 | 0 | 60 |
| 146735 | 100 | 22 | 0 | — |
| 26439 | 100 | 26 | 0 | 41 |
| 89271 | 100 | 67 | 0 | 50 |
| 43287 | 100 | 28 | 0 | — |
| 157628 | 5 | 2 | 0 | — |
| 157859 | 21 | 4 | 0 | — |

Artifacts: `.github/state/forum/multi-silent-digest.json`, `forum-media-deep.json`.

## Recent T140352 (images / links / diags)

| # | User | Media / links | Sacred couple | Verdict |
|---|------|---------------|---------------|---------|
| 2120/2132 | RoyceRoy | WhatsApp imgs | `_TZE204_clrdrnya`+TS0601 | OK → `presence_sensor_radar` (settings ask = MASTER feature later) |
| 2121/2134/2137 | Peter | many screenshots | diags `9b0b5d26…`, `f1e5b12d…`, `634f7b19…` | Crash class already hard-fixed on stable ≥5.12.81 / master; update Test + repair |
| 2122 | blutch32 | contact/soil imgs | diag `517c1a34…` | Soil/contact already fixed earlier |
| 2129 | Welshsmarthome | socket photo (Scolmore Click) | no mfr in text | Need interview mfr+pid (image alone insufficient) |
| 2131 | TBoy | — | `_TZ3210_imaccztn`+TS0004 | OK → `relay_board_4_channel` (not switch_4gang); re-pair after Test update |
| 2133/2138 | PresentSky | interview + diag `f20dc4f0…` | `_TZE284_m1cvyneb`+TS0601 | OK → `wall_dimmer_tuya` only; stale climate pair — remove + re-add as dimmer |
| 2135 | RoyceRoy | **AliExpress PDF manual** | `_TZE28C1000000_jtbgusdc`+TS0601 | OK → `dimmer_2_gang_tuya` |
| 2139 | Dijker | tip link | — | formatting tip only |

## Johan / archive cross-check

- `_TZE284_nt4pquef` + TS0601 advertised as **SGS02Z soil** (Z2M/ZHA) but lived on `climate_sensor` → **moved to `soil_sensor`** + anti-bot/re-inject guards (P138).

## Gmail

- Local secrets missing; GHA `gmail-diagnostics` re-triggered.
- Last local crash gate: `verdict: ok`, `unknownFatals: []`.

## User actions (no forum auto-reply)

1. PresentSky: remove device, update Test, pair as **wall dimmer** (`wall_dimmer_tuya`).
2. TBoy: update Test, pair as **4-channel relay board**.
3. Peter: update Test ≥5.12.82 (stable) or latest master Test once Athom accepts a build after 9.0.524.
4. Welshsmarthome: post interview `manufacturerName` + `productId`.
