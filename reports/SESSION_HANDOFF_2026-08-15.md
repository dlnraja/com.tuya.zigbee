# SESSION HANDOFF — 2026-08-16 (~22:50 CET)

> Dual-app BOTH when in doubt. Silent forum (T157628). Shared App ID = one Test slot.
> Compass: `docs/rules/PRAGMATIC_ROADMAP.md` (internal only).
> Prompts: `docs/rules/CROSS_APP_PROMPT_RULES.md` · `.windsurf/workflows/per-prompt-yaml-improvement.md`

## Live versions

| Track | Branch | Code tip | Homey Test |
|-------|--------|----------|------------|
| Preview | `master` | P197 soak-first + enrich strip + identity docs | **9.0.x** (last Auto-Publish 9.0.564) |
| Stable | `stable-v5` | soak-first skip **draft** (P197) | do **not** overwrite 9.0 Test |

App ID: `com.dlnraja.tuya.zigbee` · https://homey.app/a/com.dlnraja.tuya.zigbee/test/

## Cross-app

| Item | Class | Status |
|------|-------|--------|
| Soak-first skip draft+promote | BOTH | master + stable-v5 worktree |
| Changelog seed `ensure-next-changelog.js` | BOTH | P196 |
| Auto-Enrich strip-then-gate + git identity | MASTER_ONLY | P197 |
| Forbidden-placement in Blakadder/forum apply | MASTER_ONLY | P197 |
| wifi_camera safe-timers / `_destroyed` | MASTER_ONLY | P197 |
| Live docs: shared App ID (no `.stable` store slot) | BOTH (docs) | P197 |
| Open issues / PRs | — | none |

## Commands

```bash
node tools/ci/anti-bot-regression-gate.js
node tools/ci/firmware-updates-gate.js
node tools/ci/wifi-local-first-gate.js
node --test test/critical/p197-enrich-soak-identity.test.js
```
