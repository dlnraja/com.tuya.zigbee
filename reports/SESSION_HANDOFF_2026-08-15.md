# SESSION HANDOFF — 2026-08-16 (~23:15 CET)

> Dual-app BOTH when in doubt. Silent forum (T157628). Shared App ID = one Test slot.

## Live versions

| Track | Branch | Tip | Homey Test |
|-------|--------|-----|------------|
| Preview | `master` | P198 Auto-Fix race + curtain timers + forum-silent crawler | **9.0.565+** |
| Stable | `stable-v5` | P198 curtain timers + Auto-Fix race; soak-first skip draft | do not overwrite 9.x |

App ID (both): `com.dlnraja.tuya.zigbee`

## Verified

- Publish Stable soak-first skip draft: green twice
- Auto-Fix race hardening: push retry + per-branch concurrency
- Open issues/PRs: none
