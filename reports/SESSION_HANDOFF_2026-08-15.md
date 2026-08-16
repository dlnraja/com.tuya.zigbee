# SESSION HANDOFF — 2026-08-16 (~21:50 CET)

> Dual-app BOTH when in doubt. Silent forum (T157628). Shared App ID = one Test slot.
> Compass: `docs/rules/PRAGMATIC_ROADMAP.md` (internal only).
> Prompts: `docs/rules/CROSS_APP_PROMPT_RULES.md` · `.windsurf/workflows/per-prompt-yaml-improvement.md`

## Live versions

| Track | Branch | Code tip | Homey Test |
|-------|--------|----------|------------|
| Preview | `master` | P193 + local P194/P196 | **9.0.563** |
| Stable | `stable-v5` | `01606ba6f` P195 soak | do **not** overwrite 9.0 Test |

App ID: `com.dlnraja.tuya.zigbee` · https://homey.app/a/com.dlnraja.tuya.zigbee/test/

## Cross-app

| Item | Class | Status |
|------|-------|--------|
| Soak guard / self-heal / draft poller | BOTH | on master + stable P195 |
| Missing changelog 5.12.83 (CLI auto-bump) | BOTH | P196 `ensure-next-changelog.js` |
| OTA path + tight productIds | BOTH | P194 master; do not mass-copy bins to stable unless Validate fails |
| WiFi protocol auto / IP refresh | MASTER_ONLY | P194 local |
| Open issues / PRs | — | none |
| Human-reported unclaimed mfrs | — | 0 |

## Commands

```bash
node tools/ci/firmware-updates-gate.js
node tools/ci/wifi-local-first-gate.js
node tools/ci/energy-compose-gate.js
node tools/ci/anti-bot-regression-gate.js
```
