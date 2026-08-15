# SESSION HANDOFF — 2026-08-15 (night resume ~23:12 CET)

> Dual-app BOTH when in doubt. Silent forum (T157628). Shared App ID = one Test slot.
> Cursor rule: `.cursor/rules/operational-memory-2026-08-15.mdc` (alwaysApply).
> Transcript: [Peter dual-app](6eb1e32a-de4c-43bd-bb0a-cffbe381b9a3)

## Live versions

| Track | Branch | Code tip | Homey Test (last OK) |
|-------|--------|----------|----------------------|
| Preview | `master` | **9.0.529** (bot bump in flight) | **9.0.528** confirmed on test (`31907131763`) |
| Stable | `stable-v5` | **5.12.82** | 5.12.82 (Publish Stable OK earlier) |

App ID (both): `com.dlnraja.tuya.zigbee`.

## Done this evening (do not redo)

| Item | Ref |
|------|-----|
| Publish size Auto-Fix 35→50 MB | `34741fc91` |
| Forum soil `nt4pquef` → soil_sensor | `da9404698` |
| Soft-exit FP conflict resolve | earlier |
| Homey Test **9.0.528** promote | Auto-Publish `31907131763` |
| Forum media sweep + image OCR Welsh `#2129` | `reports/FORUM_MEDIA_SWEEP_2026-08-15.md` |
| BSEED `w5xztuy7` ZCL-only (both gangs) | `5eeccc3eb` |
| **P139** stop socket-hang republish loops | `c73657de5` |
| Stable surgical #527–#529 | clusterUtils, js-syntax-audit, UTF-8 snapshot |
| Gmail crash gate | known fatals only; `unknownFatals: []` when last checked |

## P139 doctrine (Athom)

- `processing_failed` + `socket hang up` ≠ fixable by patch bump spam.
- Keep Test on last **healthy** build; wait Athom or one human publish.
- Self-heal must **not** Publish Stable→Test over master Test.
- Code: `processing-failure-republish-check.js`, `athom-processing-failure-retry.js`, WORKFLOW_GUIDELINES **§M**.

## Forum / images / URLs (silent)

0 new FP gaps. Couples already owned (see cursor rule table). User actions only: re-pair PresentSky dimmer, Welsh Double Power Point, Kanbros after Test update, TBoy relay board.

## Open

| Item | Status |
|------|--------|
| GH **#513** ZT08 hodyryli | Open — verify on ≥9.0.528; temp=0 if persists |
| Auto-Publish for 9.0.529 | Watch — do not spam if Athom flakes |
| Open PRs | none |

## Commands
```bash
git pull --ff-only origin master
gh run list --repo dlnraja/com.tuya.zigbee --limit 12
node tools/ci/gmail-crash-pattern-gate.js --json
node tools/ci/anti-bot-regression-gate.js
node tools/ci/forum-silent-multi-scan.js --max=40
```

Updated: 2026-08-15T21:12Z
