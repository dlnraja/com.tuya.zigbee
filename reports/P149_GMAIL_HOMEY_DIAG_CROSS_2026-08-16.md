# P149 — Gmail + Homey crash/diag cross-fix (2026-08-16)

## Sources scanned
- Gmail crash gate: `verdict ok` (known fatals already mapped)
- Gmail Diagnostics workflow: re-triggered `31944054112`
- Local Homey App diags under `.github/state/homey-app-diag/`
- Forum Peter #2160 / #2164

## Cross table

| UUID / source | Version | Symptom | Status |
|---|---|---|---|
| `96c19859…` (Peter) | 9.0.537 | **heap OOM** during LIVE-DATA segment merge + settings stringify | **Fixed P148** (`LiveDataUpdater` caps + DataRecovery DP skip) |
| `f20dc4f0…` (PresentSky) | 9.0.491 | `_TZE284_m1cvyneb`+TS0601 shown as climate_sensor | FP already on `wall_dimmer_tuya`; added misattribution registry (needs **re-pair**) |
| `634f7b19…` (Peter era) | **5.12.70 stable** | `auditCapabilities`, `setTimeout` undefined, `.catch` on undefined | Master already guarded (P100/P108/P19); stable soak/backport separately |
| `f1e5b12d…` | 9.0.434 | SOS `.catch` + getDiscoveries | Fixed earlier (async SOS + `_safeGetDiscoveries`) |
| Gmail patterns | mixed | flow/readonly/destroyed/auditCapabilities… | All `knownFixed` in gate |

## Code changes (this pass)
1. `gmail-crash-pattern-gate.js` — detect `heap_oom_live_data` + scan `homey-app-diag/*.sanitized.json`
2. `user-misattribution-registry.json` — PresentSky dimmer + TBoy relay 4ch

## Do not
- Spam Athom republish (P139) — last tip already uploading OOM fix
- Paste AI forum roadmap
- Treat stable `5.12.70` fatals as master regressions without surgical backport
