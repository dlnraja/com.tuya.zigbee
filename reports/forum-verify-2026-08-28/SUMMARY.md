# Forum / GitHub L99 — 2026-08-28 evening

## Silent harvest
- Forum multi-scan: 22 topics, **1 new FP** `_TZ3000_V5498KDM`+TS0001 (SergeP T99614) — **watch-only** (insufficient Z2M/Blakadder lock; do not invent)
- Actionable processor: 217 posts / 57 need-action; no forum auto-posts

## GitHub issues
| # | Title | Verdict |
|---|-------|---------|
| 531 | ogkdpgy2 CO2 misclass | **DONE** P2291 — `air_quality_co2` + registry; close |
| 532 | TYBAC-006 AC thermostat `mpbki2zm` | **DONE** pairing already wall_thermostat; **P2293** FCU TX/RX fan_mode+system_mode |

## Code shipped (P2293)
- `wall_thermostat`: FCU couple branch for `mpbki2zm`/`qujphad5` — DP2 system_mode, DP28 fan_mode, DP101 programming
- `.homeycompose/capabilities/fan_mode.json`
- Strip Zemismart covers `68nvbio9`/`cf1sl3tj` from TRV + wall bleed → `curtain_motor` + registry
- Moes `DFGBTUB0`+TS0044 → `button_wireless_4`
- Anti-bot re-inject locks

## Watch-only (no invent)
- SergeP Nous / `_TZ3000_V5498KDM`
- A_Tas Linptech `_TZ3218_T9YNFZ4X`+TS0225 already LOCKED_OK when pid present
- Manfred typo posts

## Publish
- Auto-Publish gates green; Athom `processing_failed` / socket hang up — re-push to retry Test upload
