# P197 — Deep investigation + enrichment (2026-08-16)

> Internal. Forum silent (T157628). Classify BOTH / MASTER_ONLY.

## Live truth

| Item | Value |
|------|--------|
| Homey Test | 9.0.x soak (do not overwrite with 5.12) |
| Open issues / PRs | none |
| Auto-Enrich `31970511437` | failed at `3e-anti-bot-gate` after enrich re-place; commit also lacked git identity |

## Findings → actions

| Finding | Class | Action |
|---------|-------|--------|
| Auto-Enrich re-injects forbidden mfrs then hard-fails | MASTER_ONLY | strip-then-detect in closed loop; `isForbiddenPlacement` in Blakadder/forum appliers; git config before commit |
| Publish Stable still uploaded 5.12 drafts while Test is 9.x | BOTH | soak-first: skip **draft** + promote; soak-summary job |
| `wifi_camera` timers / `_destroyed` never set | MASTER_ONLY | safe-timers + destroy flag + protocol `auto` → 3.3 |
| Mandate / investigation plan still claim `com.dlnraja.tuya.zigbee.stable` | BOTH (docs) | correct live agent-entry docs only (not historical reports) |
| Energy compose notes (AA + meter) | — | leave; legitimate / catch-alls |

## Not done (deliberate)

- Mass-rewrite of July corpus counts (P183: they drift on every bump).
- Forum posts.
- Stable feature backport (WiFi protocol auto, enrichers).
- Athom republish loop (P139).

## Verify

```bash
node tools/ci/anti-bot-regression-gate.js
node tools/ci/firmware-updates-gate.js
node tools/ci/wifi-local-first-gate.js
node --test test/critical/p197-enrich-soak-identity.test.js
```
