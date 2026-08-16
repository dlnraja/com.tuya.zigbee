# SESSION HANDOFF — 2026-08-16 (~15:00 CET)

> Dual-app BOTH when in doubt. Silent forum (T157628). Shared App ID = one Test slot.
> Compass: `docs/rules/PRAGMATIC_ROADMAP.md` (internal only).

## Live versions

| Track | Branch | Code tip | Homey Test |
|-------|--------|----------|------------|
| Preview | `master` | **P193** workflow estate + soak guard | Test still **9.0.558**; draft **9.0.562 #2884** |
| Stable | `stable-v5` | PR #530 lineage | do **not** overwrite master Test while soaking |

App ID: `com.dlnraja.tuya.zigbee` · https://homey.app/a/com.dlnraja.tuya.zigbee/test/

## Priority

**doublons > GitHub docs > surgical refactor**

## Just shipped

- **P168** — all 17 Homey classes audited; **0** `_TZ*` dual-claim conflicts
- Tools: `audit-sacred-couple-by-class.js`, `apply-class-scale-sacred-fixes.js`
- CI: registry + dual-claim + class-scale + energy in `syntax-check.yml`
- False `energy.mains` stripped on 24 battery-primary drivers

## User leftovers

- Peter: Test **≥9.0.541**, new diag only if still OOM
- Re-pair if device landed on wrong tile before P167/P168
- Stable backport of compose locks **after** soak only

## Commands

```bash
node tools/ci/audit-sacred-couple.js --from-registry
node tools/ci/audit-sacred-couple-by-class.js
node tools/ci/dual-claim-compose-gate.js
node tools/ci/energy-compose-gate.js
```
