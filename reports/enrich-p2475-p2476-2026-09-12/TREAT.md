# Silent treat — GitHub issues + forum L99 (2026-09-12)

Policy: **no forum POST** (T157628). Homey **publish** = App Store Test.

## Open issues (already locked in compose)

| Issue | Couple | Driver | Action |
|-------|--------|--------|--------|
| #544 | `_TZ3000_l9brjwau`+`TS0002` | `wall_switch_2gang_1way` (BSEED zcl_only) | Tip ≥**9.0.891** + remove/re-pair if Unknown |
| #543 | `_TZ3000_ptjcjise`+`TS0002` | `wall_switch_2gang_1way` | Same |
| #533 | `_TZE204_5slehgeo`+`TS0601` | `curtain_motor` (P2467 MCU) | Tip ≥**9.0.891** (P2475 ensure TX) + re-pair |

Do **not** invent pid. FP already present — tip lag / wrong driver class.

## Forum fleet (T140352 #2210–#2233)

VicHY / Joep / Peter / meter91 / Eduard / MIAMO / PresentSky → update Test tip + re-pair as per `reports/forum-l99-2026-09-12/FLEET_L99.md`. Silent only.

## This tip (9.0.891)

- **P2475 BOTH** — EF00 `_ensureEf00ReadyForTx` before DP/mcuSyncTime; epoch-aware mcuSyncTime; rejoin re-sync
- **P2476 MASTER_ONLY** — Easy Login email/phone + SmartLink QR wording (not EZ SmartConfig)
