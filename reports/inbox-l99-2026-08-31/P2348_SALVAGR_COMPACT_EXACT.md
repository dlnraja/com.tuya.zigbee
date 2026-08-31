# P2348 — Salvagr #533 Unknown Device (compact exact-case)

## Diag recovered

| Field | Value |
|-------|-------|
| UUID | `724d4bc9-229b-46ba-bad7-fc61af93865d` |
| Build | #3057 **v9.0.741** |
| Homey | 13.4.1 |
| Message | Still Unknown Device |
| Driver init | none (`curtain_motor` / `5slehgeo` absent) |

Earlier: `a000e0a5` (9.0.730), `e5d19878`, `c137a5d7`, `7a6f2ca1`.

## Couple

`_TZE204_5slehgeo` + `TS0601` → `curtain_motor` (Moes ZTS-EUR-C). Clusters `[0,4,5,61184]`.

## Root cause

1. `curtain_motor` cartesian was huge → compact cut mfrs.
2. Sacred-keep loaded with **`mfr.toLowerCase()`** → inject/`assert` used `_tze204_5slehgeo`.
3. Homey pairing is **case-sensitive** → device `_TZE204_5slehgeo` ≠ published variants → Unknown Device.

## Fix (BOTH tracks)

- `loadSacredKeepCouples`: keep exact `pin.mfr`
- Re-assert exact sacred after pass2 + final `assertSacredCouplesPresent` (exact)
- Sacred-keep pins for 5slehgeo siblings + nhyj64w2 / 127x7wnl
- Trim `curtain_motor` productIds to curtain-relevant set
- Test: `test/critical/p2348-salvagr-curtain-compact-exact.test.js`

## User action (after Test tip ≥ fix)

1. Update Universal Tuya Test app
2. Remove Unknown Device tile
3. Add device → Cover Controller / Curtain motor
4. Re-pair Moes ZTS-EUR-C

No forum post (T157628). GitHub #533 comment OK after publish.
