# Fleet treat — 2026-09-24 (silent)

Silent only. No Homey forum POST (T157628).

## GitHub
| Item | Action |
|------|--------|
| Open PRs | none |
| #550 HiepSVG `gkfbdvyx` | Comment → tip **9.0.1220+** Repair (P2690/P2705/P2710/P2711) |
| #551 Miguel `famkxci2`+TS0043 | Comment → tip **9.0.1220+** pick Wireless Button 3; learnmode fixed Universal |
| CI notifs | Stale failures before P2710 green; latest Auto-Publish/Stable success |

## Forum T140352 (highest #2256)
| Post | User | Couple | Status |
|------|------|--------|--------|
| #2253 | Michaelp | `_TZE284_ogx8u5z6`+TS0601 | P2593 TX + P2711 frame — tip ≥**9.0.1220** (was 9.0.1055) |
| #2254/#2255 | VicHY | `_TZE204_clrdrnya`+TS0601 | Tip lag / DynCap — update ≥**9.0.1220** + Repair; no forum POST |
| #2256 | dlnraja | — | acknowledged |

## Code shipped (BOTH)
- P2711: full EF00 `datapoint` frame (status/transid/length/data) — kill `value` unexpected property
- NamedButtonFallback feed TX fixed
- Learnmode per track (Universal / Bastien / Stable)

## Tips
| App | Tip |
|-----|-----|
| Universal | **9.0.1220** |
| Bastien | **1.0.88** |
| Stable | **5.12.327** |
