# SESSION HANDOFF — 2026-08-16 (~01:02 CET)

> Dual-app BOTH when in doubt. Silent forum (T157628). Shared App ID = one Test slot.
> Cursor rule: `.cursor/rules/operational-memory-2026-08-15.mdc` (alwaysApply).

## Live versions

| Track | Branch | Code tip | Homey Test |
|-------|--------|----------|------------|
| Preview | `master` | **9.0.531** | **9.0.531** ✅ (`31911574815`, SDK verify) |
| Stable | `stable-v5` | **5.12.82** | 5.12.82 |

App ID (both): `com.dlnraja.tuya.zigbee`.

## Sources status (this pass)

| Source | Result |
|--------|--------|
| Auto-Publish | success — Test **9.0.531** |
| Unified CI / Syntax / Auto-Fix / Pages / Forum Poll | success |
| Gmail (`31911087154`) | verdict **ok**, 0 unknown fatals, 9/9 FPs |
| Forum silent | 0 new FPs (last T140352 still #2140) |
| Anti-bot | clean |
| Open PRs | none |
| Open issues | **#513** only (ZT08 — user verify) |

## Athom notes
- **9.0.530** `processing_failed` / socket hang up — superseded by **9.0.531** on Test (P139: do not loop).
- Historical 525/526 same class.

## Do not redo
P139 anti-loop · publish size 50 MB · forum soil/ZCL BSEED · Gmail known fatals fixed · version skew sync.

## Commands
```bash
git pull --ff-only origin master
gh run list --repo dlnraja/com.tuya.zigbee --limit 12
node tools/ci/gmail-crash-pattern-gate.js
node tools/ci/anti-bot-regression-gate.js
```

Updated: 2026-08-16T01:02Z
