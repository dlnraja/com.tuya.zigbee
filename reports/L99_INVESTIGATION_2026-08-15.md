# L99 INVESTIGATION — Cross-prompt synthesis (2026-08-15)

> Mode: **GLOBAL_INVESTIGATION_PLAN** deep diagnostic + dual-app BOTH.
> Sources crossed: SESSION_HANDOFF, transcripts [6eb1e32a](6eb1e32a-de4c-43bd-bb0a-cffbe381b9a3) + [73f0d460](73f0d460-25f5-46a5-a062-6177e0bf227f), diag orchestrator, gmail-crash-pattern-gate, forum silent scan, GH Actions.

## Live truth

| Track | Version | Homey Test |
|-------|---------|------------|
| `master` | **9.0.517** | Auto-Publish **success** (after 9.0.516 Athom hang) |
| `stable-v5` | **5.12.81** | Publish Stable **success** (#525/#526) |

**Peter (#2137):** was v5.12.70 crashed → update Test to **≥5.12.81**.

## Prompt arcs fused

### A — Aug 10 [73f0d460](73f0d460-25f5-46a5-a062-6177e0bf227f)
AI/IDE recovery + dual-app P94/P95 (FPs #2130–2133, energy divisor, HOBEIAN, verify fail-closed).
Versions then 9.0.434 / 5.12.53 → **superseded**.

### B — Aug 15 [6eb1e32a](6eb1e32a-de4c-43bd-bb0a-cffbe381b9a3)
Peter dual-app crash class → PRs **#518–#526**. Capability crash, radar TZE284, Athom changelog keys, combo budget, CI collisions.

## Crash / reliability matrix (L99)

| Pattern | Gate status | Fix locus |
|---------|-------------|-----------|
| SOS `.catch` / sync listener | fixed | #518 |
| `auditCapabilities is not a function` | fixed_p | #519 DCM guard |
| IAS / SOS zoneId / CIE / water | fixed | #520 |
| contact/water `homey.setTimeout` | fixed | #521 |
| ZT08 time sync timer | fixed | BOTH safe timers |
| `capability is not defined` | **fixed_p136** | `generic_tuya._autoMapDP` |
| `_onDeleted` null | **fixed_p349** | `TuyaZigbeeDevice` / `UnifiedSensorBase` super.onDeleted |
| Athom `processing_failed` | mitigated | bump version + tighter Zigbee combos |

## Diag tooling (L99 smoke)

| Tool | Result |
|------|--------|
| `diag:self-test` | 27/27 scripts, 8/8 workflows |
| `gmail-crash-pattern-gate` | verdict **ok**, watch **[]** after p349 |
| free-scrape focus 2137 | OK |
| forum silent multi-scan | 0 new FPs |
| `fp-collision-check` | **0 new** vs baseline |
| Unified CI | success on 9.0.517 |
| Auto-Publish | success on 9.0.517 |
| Syntax Check | was FAIL (`FreeScrapeStack` utf8 JSON) → **fixed Buffer parse** |

## Forum / GH (silent)

| Item | Verdict |
|------|---------|
| #2130–2135 FPs | OK in drivers |
| #2137 Peter | tell update ≥5.12.81 |
| GH #513 ZT08 | dedicated driver + SmartDivisor + timers |
| GH #420 radar | CLOSED; TZE284 relay map |
| GH #439 | CLOSED |

## Remaining (do not invent work)

1. Shared App ID Test flip master↔stable — operational, not a code bug
2. Gmail IMAP/OAuth secrets locally missing — use GHA `diag:gmail`
3. Optional: flesh `diagnostic-auto-heal-radar.js` (**MASTER_ONLY**)
4. Optional: Moes TS004F if forum returns

## Doctrine (unchanged)

Sacred Couple · BOTH for crash/IAS/timer · no full-tree sync · no forum AI paste (T157628).

Generated: 2026-08-15T16:10Z · L99 investigation mode
