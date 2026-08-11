# P117 — Bug sweep from diag / crash / forum / GitHub

Date: 2026-08-11 · Version: 9.0.477

## Sources scanned

- `.github/state/gmail-crash-patterns.json` (unbound_destroyed residual)
- Forum multi-silent digest (136 actionable across topics)
- Infer-enrich high-confidence misroutes
- `docs/issues/DEVICE_SPECIFIC_ISSUES.md` / KNOWN_ISSUES
- Open GH issues (#439 fingerprint batch only)

## Fixes landed

| Priority | Bug | Fix |
|----------|-----|-----|
| P0 | `.catch(this.error)` unbound (272→0) | `tools/ci/fix-unbound-catch-this-error.js` — 72 files / 289 hits |
| P1 | Rain FPs on contact driver | `_TZ3210_p68kms0l` / `_TZ3210_tgvtvdoc` → `rain_sensor` |
| P1 | Contact claimed by switch_3gang | `_TZE200/204_2imwyigp` → `contact_sensor`; drop `TS0203` from switch |
| P1 | Soil garbled / wrong class | `_TZE284_hdml1aav` → `soil_sensor`; remove `_TZE2841000000_*` |
| P1 | Gas truncated mfr | drop `_TZE204_chbyv06` from `gas_detector` (keep `chbyv06x`) |
| P1 | Settings endless load (#380) | 12s timeout + loading state on `/devices` |

## Deferred (next passes)

- IR learn stickiness / bare ZigBeeDevice mass migrate (~23)
- Bed sensor DP4/settings polish
- mmWave clrdrnya live-data path audit
- Adaptive double-division residual CI gate
