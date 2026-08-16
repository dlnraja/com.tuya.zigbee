# SESSION HANDOFF — 2026-08-16 (~14:00 CET)

> Dual-app BOTH when in doubt. Silent forum (T157628). Shared App ID = one Test slot.
> Compass: `docs/rules/PRAGMATIC_ROADMAP.md` (internal only).

## Live versions

| Track | Branch | Code tip | Homey Test |
|-------|--------|----------|------------|
| Preview | `master` | **9.0.541+** (P150–P152 docs/registry) | **v9.0.541** build #2862 **test** |
| Stable | `stable-v5` | PR #530 lineage | do not overwrite master Test while soaking |

App ID: `com.dlnraja.tuya.zigbee` · https://homey.app/a/com.dlnraja.tuya.zigbee/test/

## Priority

**doublons > GitHub docs > surgical refactor** — no forum roadmap, no Z2M substitution myth.

## Shipped P142–P152

See `reports/P152_PRAGMATIC_ROADMAP_EXEC_2026-08-16.md`.

## User leftovers

- Peter: install **9.0.541**, new diag if still OOM
- PresentSky: re-pair dimmer if still climate
- Dual-claim gate: 60 warn — triage lights/switches next (not big-bang)

## Commands

```bash
node tools/ci/audit-sacred-couple.js --from-registry
node tools/ci/dual-claim-compose-gate.js
node tools/ci/energy-compose-gate.js
node tools/ci/gmail-crash-pattern-gate.js --json
```
