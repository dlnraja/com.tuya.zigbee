# Shadow forum fixes — 2026-08-23 (P2229)

**Mode:** SHADOW only (passive GET). No Discourse POST / PM / like / AI paste.

## Scan coverage

18 topics (own Universal Tuya + Johan + device-request + Smart Life + Zemismart/Moes/Nous + RF + stop-AI-paste + …). Digest actionable ~236 posts; processor need-action **52**.

Live T140352 tip: **#2192** (tip-only). Actionable tip: Toni **#2191**.

## Code / catalog fixes (silent)

| Issue | Source | Fix |
|-------|--------|-----|
| Pairing shows Smart RCBO for Tongou DIN | Toni #2191 + Gmail `3a1f196d` | `app.json` out of sync with compose: stole `_TZE284_6ocnqlhn` onto `smart_rcbo`. Ran `sync-appjson-zigbee`; couple → `din_rail_meter` only. `mfs_db` driverId/hint → `din_rail_meter` (dropped `TS0601_rcbo`). `DeviceFingerprintDB` lock added. Same on **stable**. |
| Processor maps every couple → `wall_dimmer_tuya` | NEED_ACTION noise | `routeFor` called `normalize(a,b)` (always truthy). Switched to `equalsCI`. SINGLE_DRIVER falls back to compose driver. |
| meter91 physical buttons | #2189 | Already `scene_switch_4` + 0xFD in compose/app; DB lock reinforced. |
| Moes 4-button | T150690 Primordial / Graeme | Route `kfu8zapd`+TS0044/TS004F → `button_wireless_4`. |
| SergeP new FP | T99614 #286 | **Skipped** — Nous/SoPhos Test publish, not our App ID. |
| Soft hypotheses | xabckq1v+TS0001, etc. | No invent / no lock without interview. |

## Already shipped (user: update Test + re-pair)

- Peter #2190: IAS coerce, leftover EF00 skip, battery spike guards (couple absent in post).
- meter91 #2189: scene_switch_4 0xFD.
- Gabriel: `lwthnp7j`+TS0004 → `wall_switch_4gang_1way` (heuristic when pid missing in post).

## Not done (by design)

- No forum replies (T157628).
- No Stable republish (P139).
- No commit/push unless requested.
