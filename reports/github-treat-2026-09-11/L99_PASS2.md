# L99 GitHub treat — 2026-09-11 (pass 2)

## Inventory
- Open PRs: **0**
- Open issues (own repo): **#542**, **#533** (others closed earlier same day)
- Johan mentions: 13 open device requests — all couples already in Universal Tuya (silent; no Johan comments)
- Assigned elsewhere (BlockProject3D): ignore (unrelated 2020)

## Root causes found & fixed (local — need push/publish)

### P2463 GH#542 `_TZ3000_xk5udnd6`+`TS0012`
- User saw Botón tiles on wall_switch_2gang
- **Not** a wrong driver: compose already onoff-only
- **Bug:** `ensureGangUiCapabilities` (P2397) re-added `button.1/2` every boot
- Fix: skip inventing button.N unless compose already has buttons / scene / force
- wall_switch_* + switch_4gang: `skipGangButtonUi` + strip-after-super

### P2463 Johan#468 `_TZE200_bcusnqt8`+`TS0601`
- Was on **curtain_motor** (wrong) — Z2M SPM01 energy monitor
- Moved → `power_clamp_meter` + sacred-keep + mfs + FPDB

### P2463 #533 Moes ZTS
- Idle-stop guard **25s → 40s**
- Still NEED_USER confirm on tip after publish

### P2462 (prior) `_TZ3000_blhvsaqf`+`TS0001`
- Still in working tree → wall_switch_1gang_1way

## Dual-app
P2462/P2463 = **BOTH** (pairing/TX/UI reliability)

## Tests
`p2397` + `p2460` — 11/11 pass
