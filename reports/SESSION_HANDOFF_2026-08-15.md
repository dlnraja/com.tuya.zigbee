# SESSION HANDOFF — 2026-08-17 (P2138 + HomeSuite reliability)

> Shared App ID `com.dlnraja.tuya.zigbee`. Forum silent (T157628). Dual-track: master=preview, stable=reliability-only. Never Publish Stable→Test while 9.0 soaks.

| Track | Tip (repo) | Homey Test |
|-------|------------|------------|
| master | **9.0.583** — BSEED dimmer lock + MCU brightness clamp + catalog cleanup | Auto-Publish after push; do not overwrite with 5.12 |
| stable-v5 | **5.12.85** (worktree) — surgical BOTH only | soak-skip; do **not** promote onto shared Test |

## P2138 — PresentSky BSEED Click wall-dimmer insert (#2133/#2138)

| Field | Value |
|-------|--------|
| Couple | `_TZE284_m1cvyneb` + `TS0601` (+ TZE204/TZE200 siblings) |
| Canonical | `wall_dimmer_tuya` |
| Symptom | Paired as temperature/climate; on/off/dim dead |
| Interview | EP1 clusters `0,4,5,61184(EF00),60672(0xED00)`; EP242 Green Power ignore; router, mains, appVersion 78 |
| Z2M | `TS0601_dimmer_1_gang_1` — DP1 on/off, DP2 brightness 0–1000, DP6 countdown, DP21 backlight |
| User action | **Remove + re-pair** (Homey cannot hot-swap drivers) |
| Diag | `f20dc4f0` (9.0.491 climate misattr) |

### Catalog pollution found (must stay fixed)
- `mfs_db` had climate_sensor / soil_sensor / false TS0201 for this mfr — **false TS0201 couple removed** (do not remap to dimmer)
- `lib/data/new_fingerprints.json` → was `zigbee_universal`; now dimmer with `modelIds: ["TS0601"]` only
- Runtime compound DB locks `mfr|TS0601` only
- `getDriverId(mfr, 'TS0201')` → `null` (refuses unverified pid on mfr catalog)
- Forbidden: climate*, soil_sensor, zigbee_universal, generic_tuya, ir_blaster
- Do **not** add `0xED00` to compose clusters (bind noise)

### Driver harden (BOTH)
- `await super.onNodeInit` (misattr + layers)
- `lib/tuya/TuyaBrightnessScale.js` clamp (MCU reboot if >1000 — Z2M #32305)
- Strip phantom `measure_battery`; `markAppCommand` on onoff/dim
- Tests: `test/critical/p2138-bseed-wall-dimmer.test.js`

## HomeSuite study (GPL-3.0, ideas only — MIT reimplementation)

Landed on master ~9.0.582 (credits in `CREDITS.md` / `NOTICE`):

| Behaviour | Track |
|-----------|--------|
| Persist `avail_last_seen_ts` + boot grace | MASTER_ONLY |
| `device_rejoined` / noteBootDump | MASTER_ONLY |
| `onUninit` → `_destroyDevice` / switch teardown | BOTH |
| Skip Poll Control 0x0020 on sleepy | BOTH |
| ZBMINIR2 `waitForResponse: false` | BOTH |
| Inching re-apply after power-cut | MASTER_ONLY (UI extras) |
| Battery no invent 50/100% | BOTH |
| TS011F `okaz9tjs`/`fgwhjm9j` → plug_energy_monitor | BOTH |

## Forum silent leftovers
- Peter SOS/smartbutton #2137 / #2167 — still open (not this pass)
- Do **not** auto-reply on #2138 unless human asks for a draft

## P214 — Intelligent ZCL ↔ EF00 (session)

- `lib/protocol/IntelligentProtocolDetect.js` is the single detect order for all Unified* + bootstrap.
- Sacred BSEED `zcl_only` beats any “force DP” heuristic.
- Soft-attach `TuyaEF00Manager` only when EF00 / MCU heuristics warrant it.
- Gate: `tools/ci/p214-intelligent-protocol-gate.js`

## Session re-audit improvement (same day)

- Wall dimmer settings aligned with Z2M #28658: backlight (strings), power-on, light type.
- Full reflection: `reports/SESSION_REFLECTION_2026-08-17.md`
- Interview INT-2138 added to `docs/data/DEVICE_INTERVIEWS.json`


## Docs / knowledge touched this pass
- `.ai/KNOWLEDGE_CACHE.json`
- `.cursor/rules/operational-memory-2026-08-15.mdc`
- `.cursor/rules/dual-app-vision.mdc`
- `.cursorrules`
- `docs/guides/USER_TROUBLESHOOTING.md`
- `docs/rules/PRAGMATIC_ROADMAP.md` · `DUAL_APP_VISION.md`
- `.github/CONTRIBUTING.md` · `AGENTS.md`
- `data/device-knowledge-base.json`
- `reports/P2138_BSEED_WALL_DIMMER_2026-08-17.md`
