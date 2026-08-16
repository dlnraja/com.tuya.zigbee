# SESSION HANDOFF — 2026-08-16 (~14:40 CET)

> Dual-app BOTH when in doubt. Silent forum (T157628). Shared App ID = one Test slot.
> Compass: `docs/rules/PRAGMATIC_ROADMAP.md` (internal only).

## Live versions

| Track | Branch | Code tip | Homey Test |
|-------|--------|----------|------------|
| Preview | `master` | tip + **P167** dual-claim/energy (pending Auto-Publish bump) | soak **≥9.0.541** (OOM LiveData); tip was **9.0.543+** |
| Stable | `stable-v5` | PR #530 lineage | do **not** overwrite master Test while soaking |

App ID: `com.dlnraja.tuya.zigbee` · https://homey.app/a/com.dlnraja.tuya.zigbee/test/

## Priority

**doublons > GitHub docs > surgical refactor** — no forum roadmap, no Z2M substitution myth.

## Just shipped (this session)

- **P167** — absurd dual-claims + mains phantom batteries (`reports/P167_DUAL_CLAIM_BATTERY_TRIAGE_2026-08-16.md`)
- Refuse ledgers P154, P159–P166 (no auto-* packs)
- Heap gate already on CI (`homey-heap-json-gate.js`)

## User leftovers

- Peter: Test **≥9.0.541**, new diag only if still OOM
- PresentSky: re-pair dimmer if still climate
- Dual-claim gate: **48** warn remaining (light/strip overlaps — next surgical pass)
- Stable backport of OOM/registry/P167 **after** soak only

## Commands

```bash
node tools/ci/audit-sacred-couple.js --from-registry
node tools/ci/dual-claim-compose-gate.js
node tools/ci/energy-compose-gate.js
node tools/ci/homey-heap-json-gate.js
node tools/ci/gmail-crash-pattern-gate.js --json
```
