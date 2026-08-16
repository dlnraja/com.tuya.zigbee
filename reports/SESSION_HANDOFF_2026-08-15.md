# SESSION HANDOFF — 2026-08-16 (~23:05 CET)

> Dual-app BOTH when in doubt. Silent forum (T157628). Shared App ID = one Test slot.
> Compass: `docs/rules/PRAGMATIC_ROADMAP.md` · Prompts: `docs/rules/CROSS_APP_PROMPT_RULES.md`

## Live versions

| Track | Branch | Tip | Homey Test |
|-------|--------|-----|------------|
| Preview | `master` | `4477d5f7f` P197 + rule paths | **9.0.x soak** (Auto-Publish in flight) |
| Stable | `stable-v5` | `0fb4ac816` Universal Tuya branding | soak-first **skips draft+promote** |

App ID (both): `com.dlnraja.tuya.zigbee` · https://homey.app/a/com.dlnraja.tuya.zigbee/test/

## Verified this pass

| Check | Result |
|-------|--------|
| Publish Stable `31972114911` | success — draft **skipped**, promote **skipped** |
| dual-claim / anti-bot / regression-lessons | clean |
| Open issues/PRs | none |
| Auto-Enrich failure root | fixed (strip-then-gate + git identity + forbidden placement) |

## Cross-app

| Item | Class | Status |
|------|-------|--------|
| Soak-first skip draft | BOTH | verified green |
| Store name Universal Tuya | STABLE_ONLY | `0fb4ac816` |
| Enrich anti-bot strip | MASTER_ONLY | P197 |
| Agent rules HP→relative paths | MASTER_ONLY docs | `4477d5f7f` |

## Commands

```bash
gh run list --repo dlnraja/com.tuya.zigbee --limit 12
node tools/ci/anti-bot-regression-gate.js
node --test test/critical/p197-enrich-soak-identity.test.js
```
