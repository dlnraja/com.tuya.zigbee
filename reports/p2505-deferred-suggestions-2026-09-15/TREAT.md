# P2505 — Treat ALL deferred suggestions from prior prompts (2026-09-15)

Silent only. Never forum POST. Never invent pid.

## Open suggestions → disposition

| Suggestion (prior replies) | Disposition |
|----------------------------|-------------|
| Publish Stable after P2504 | **DONE** — Gmail Build **#116** testing; workflow Publish Stable success |
| Master tip ≥9.0.933 | **DONE** — Gmail Build **#3193** testing; Auto-Publish success |
| Stable backport **P2485** EF00 multi-gang | **DONE this pass** → tip **5.12.182** (P2505) |
| **P2486b** launchOnce on stable | **DONE** — injected into `TuyaEF00Manager` |
| VicHY DynCap residual `c5165a37` | **Already shipped** P2477 on both tracks — tip-lag only |
| Phase B MCU `mcuSyncTime` / Phase C WiFi | **Already on master tip** (P2467/P2475 / P2485 WiFi local-first) — no new invent |
| Forum human draft | **Updated** `scratch/forum-draft-140352-human-2026-09-15.txt` — **you paste**; bot never POSTs |
| Force republish spam (P139) | **SKIP** — tips healthy; no socket-hang spam |
| Stefan `_TZE2841000000_*` | **SKIP** — junk FP, do not lock |
| Soft GH #533/#547/#548 | Tip-lag / sacred-keep — silent; no AI comments |

## Homey tips (Gmail live)

| App | Build | Expect |
|-----|-------|--------|
| Universal Tuya | **#3193** testing | ≥**9.0.933** (next push **9.0.934** TITAN) |
| Tuya Unified Stable | **#116** testing | **5.12.181** then **5.12.182** after this push |

## Code this pass

### Master (P2505)
- `HomeyButtonUiCharter.js` — Buffer `JSON.parse` (TITAN utf8 forbid)
- test lock in `p2492-…`
- tip **9.0.934**

### Stable (P2505 BOTH)
- Rehome `hewlydpz`/`7ytnacie` → `wall_switch_4_gang_tuya`
- Rehome `rkbxtclc` → `switch_3gang`
- `Ef00MultiGangProfiles.js` + device wiring
- `launchOnce` peer-skip (P2486b)
- misattribution cases + `check:p2505`
- tip **5.12.182**

## User action (silent)

Update Universal Tuya Test **≥9.0.934** (or current #3193 tip) / Stable **≥5.12.182**; re-pair misrouted 4/3-gang + curtains/radar if needed.
