# Inbox L99 r2 — 2026-08-31

## Homey
| Track | Tip | Note |
|-------|-----|------|
| Master Test | **9.0.744** / build **#3060** | P2348 Salvagr exact-mfr compact |
| Stable Test | **5.12.106** / #42 | P2348 backport published earlier |

## GitHub
| Issue | Status |
|-------|--------|
| **#532** Adam FCU | **CLOSED** — diag `e3bf7ffc` on 9.0.743 confirms OK (DP36 valve, DynCap skip DP24) |
| **#533** Salvagr curtain | OPEN — tip ≥**9.0.744** required for exact `_TZE204_5slehgeo` |

## Gmail / Athom
- Build create/test mails through #3060 (master) + Stable #42
- No new crash mail beyond known UUIDs

## Forum (silent — T157628 no posts)
| User | Post | Verdict |
|------|------|---------|
| VicHY | #2208/#2211 `clrdrnya` | Diag `4217d5e3` on **9.0.719** (stale). Couple locked + sacred-keep exact. **Update ≥9.0.744 + re-pair Presence Radar** |
| PresentSky | #2206 m1cvyneb | Pair OK / TX dead already fixed P2322 (`wall_dimmer_tuya` magic+heal). Update + re-pair |
| meter91 | #2207 TS0044 | Locked `scene_switch_4`; tip ≥9.0.738 |
| Cam | #2209 | HOBEIAN motion + button NEED_DIAG (prior P2347) |
| A_Tas | T158757 | `_TZ3218_t9ynfz4x`+TS0225 LOCKED_OK (processor MISSING_PID = mfr-only post) |
| Gabriel | T158757 | Verified-only OEM pins (P2347) |

## Code this pass
- Fix P2288 test for exact-case sacred pins (CI regression from P2348)
- Sync `app.json` version → 9.0.744
- Compact still keeps exact `_TZE204_5slehgeo` + `_TZE204_clrdrnya`
