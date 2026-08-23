# Forum / Gmail verify — 2026-08-23

## New diagnostics processed

| Log ID | Date | Couple / topic | Verdict | Action |
|--------|------|----------------|---------|--------|
| `3a1f196d` | 2026-08-23 | `_TZE284_6ocnqlhn` + `TS0601` Tongou TO-Q-SYS-JZT | Mis-paired / not recognized | Move FP to `din_rail_meter`; Tongou DP profile; forbid `smart_rcbo` |
| `31e654a4` | 2026-08-22 | Same Tongou (user typo `60cnqlhn`) | Wrong driver `smart_rcbo` | Same fix; user must re-pair |
| `55e3e591` | 2026-08-21 | `_TZ3000_zgyzgdua` + `TS0044` | Physical 0xFD | Already on `scene_switch_4` ≥9.0.619 — user update + re-pair |
| `0cea6870` | 2026-08-21 | Peter SOS / contact IAS | IAS coerce + battery debounce | Fixed in ≥9.0.621 (`IASZoneEnhanced`, SOS spike guard) |
| `9cbf9eb6` | 2026-08-21 | `_TZ3000_xffhmvhv` + `TS004F` Nobø | TS0044-style multi-EP | Routed to `button_wireless_4`; flow IDs valid in compose |

## Sacred couple locked

- `_TZE284_6ocnqlhn` + `TS0601` → **`din_rail_meter`** only (Z2M Tongou TO-Q-SYS-JZT din rail smart meter)

## Refused / no invent

- Peter #2190: no mfr+pid in post — do not invent couples from tile names
- Forum polluted Johan catalogue FPs — filtered by `isPollutedNewFp`

## User returns (silent — no forum post)

1. **Tongou users**: update Universal Tuya Test ≥9.0.627, remove device, re-pair as **DIN Rail Energy Meter**
2. **meter91 TS0044**: update ≥9.0.619, re-pair, scene mode in device settings
3. **Peter**: update ≥9.0.621 for IAS + SOS battery stability

## Automation (P2210 + P2213 + P2214)

- `npm run forum:process` — post-by-post cross-ref
- `npm run forum:parse-digest` — verify T140352 live highest vs digest (Node + Python twins)
- `npm run user:impact` — per-user device matrix
- Live highest **#2190** (2026-08-21) — confirmed by Discourse API, not a stale bug
- Wired in `forum-poll.yml`, `auto-enrich-closed-loop.yml`, `fetch-diags.yml`
- Output: `.github/state/forum/actionable-processor-report.json` + `PROCESS.md`
- Per-user reports: `reports/forum-verify-2026-08-23/users/*.md` (107 users) + `INDEX.json`
- Curated fleet catalog: `data/user-impact-catalog.json` (Peter, meter91, Gabriel)

## Gates

- `node --test test/critical/p2207-tongou-din-meter.test.js` ✅
- `node tools/ci/p2138-sacred-couple-matrix-gate.js` ✅
- `npm run knowledge:devices` (device-truth regenerated 2026-08-23)
