# Gmail + forum dump & treat — 2026-08-22

Silent only. No forum posts.

## Forum 140352
- Highest still **#2190** (Peter). No #2191+.
- Scan refreshed `multi-silent-digest.json`.
- Refuse polluted new-fps (`_TZE200_ABC123`, Johan catalogue dumps).

## Gmail diagnostics (inbox + CI)

| When UTC | Log ID | Couple / note | App | Treat |
|----------|--------|---------------|-----|-------|
| **23:50** NEW | `9cbf9eb6` | Nobø SWS-IZ `_TZ3000_xffhmvhv` (+TS004F label) | 9.0.621 | Physical RAW EP1/3/4 OK; spam 0x8004 + invalid flow card IDs |
| 19:11 | `0cea6870` | Peter contact/water/SOS (mfr absent) | 9.0.617 | Contact pulse = DP1 vs IAS race; lux DP101 OK; SOS battery glitchy |
| 10:56 | `55e3e591` | meter91 `_TZ3000_zgyzgdua`+TS0044 | 9.0.617 | Already fixed ≥9.0.619 — update+re-pair |

## Code shipped this pass
1. `ButtonDevice._switchToSceneMode` → DeviceOperatingMode + permanent skip after unsupported
2. `_reapplySceneModeOnWake` respects failed store + `writeSceneAttr`
3. `DeviceOperatingMode`: `_TZ3000_xffhmvhv` → ts0044 / no 0x8004
4. `PhysicalButtonMixin` profile for xffhmvhv
5. `LayerSignalFusion`: prefer IAS over DP1 on hybrid contact/water/sos

## User actions (no reply posted)
- meter91: Test ≥9.0.619 + re-pair
- Nobø: next Test build after this push + re-pair; use `*_4gang_button_*` flow cards
- Peter: update Test with IAS-prefer fix; re-pair water if still dead; SOS battery may need couple from dump

## Privacy (P2206)
- `gmail-ci-dump.json` removed from git — keep this TREAT + FINE_ANALYSIS only.
- Local `diag-*-excerpt.txt` stay gitignored; never stage forum user media.
