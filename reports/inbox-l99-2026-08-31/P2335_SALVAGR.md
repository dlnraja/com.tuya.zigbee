# P2335 — Salvagr #533 + diag inbox L99 (2026-08-31)

Silent forum. BOTH reliability.

## Diags
| UUID | Tip in log | Finding |
|------|------------|---------|
| `e5d19878` | **9.0.719** | Cover Controller → Unknown Zigbee Device; no curtain_motor init; interview clusters 0/4/5/61184 |
| `c137a5d7` | 9.0.719 | Still on `device_radiator_valve` empty-mfr Generic |
| `7a6f2ca1` | 9.0.714 | Same family |

## Root cause (already P2329 on tip ≥9.0.721-ish, confirmed in 9.0.730)
Homey refused `curtain_motor` match because compose required OnOff(6)+WindowCovering(258). Moes ZTS-EUR-C only exposes Basic/Groups/Scenes/EF00.

## P2335 extras
1. **MVM** — `_TZE284_*` curtains no longer fall through to legacy ZCL 6/258; EF00 family clusters `[0,4,5,61184]`.
2. **diag-resolver** — couple-first via `DeviceFingerprintDB.lookup(mfr,pid)` so `#533` cannot auto-resolve to radiator again.
3. GitHub clear comments for #533 / #532 pointing at tip ≥ **9.0.731**.

## User action
Update Universal Tuya Test ≥ tip, remove Unknown/Zigbee/Radiator tile, re-pair → **Cover Controller**.
