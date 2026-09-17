# Local Auto-Improve SSOT (P2542)

Machine SSOT: [`config/architecture/local-auto-improve-ssot.json`](../../config/architecture/local-auto-improve-ssot.json)

**Classify:** `BOTH` (CI reliability / token forfait). Cursor hooks remain IDE-side.

## Goal

Maximize **automatic improvement** of the app + workflows **without external AI tokens**:

1. Force **forfait / local-first** on every cron and AI-touching workflow
2. Prefer **local heuristics** (`local-intelligent-solver`, ComplementaryMerge, mfs align, prune collisions, L99 dual gates)
3. Keep Homey Pro runtime **zero-cloud** (BootBudget, HomeyGapCompensator, ProtocolFallbackChain, RawClusterFallback, SmartDivisor)
4. Slim bot context via [`project-smart-map.json`](../../config/architecture/project-smart-map.json) (P2491)

## Commands

```bash
npm run ai:plan-guard
npm run improve:local
npm run improve:local:quick
npm run check:p2542
npm run check:p2491
```

## Orchestrator

[`tools/ci/local-auto-improve-orchestrator.js`](../../tools/ci/local-auto-improve-orchestrator.js)

Runs (forced env `AI_FORCE_LOCAL=true` / `AI_ALLOW_REMOTE=false`):

- `ai-plan-guard --preflight`
- `ai-context-compress --self-test`
- `local-intelligent-solver`
- `prune-fp-collision-bleed --check`
- `align-mfs-db-intelligent --check` (or `--apply` with flag)
- `p2520` complementary gate + L99 dual soft gates
- Optional: case-variant / discovery lineage / battery-button gates

Wired into:

- `.github/workflows/self-improve.yml`
- `.github/workflows/recurrent-orchestrator.yml`

## Cron density (token/API sparing)

| Workflow | Cron hint |
|----------|-----------|
| forum-poll | 4×/day |
| l99-inbox | 3×/day |
| auto-enrich | 4×/day (`*/6`) |
| recurrent | daily 03:30 |
| self-improve | weekly Tue 02:53 |

## Required env on cron / AI-touch workflows

```yaml
env:
  AI_PLAN_MODE: forfait
  AI_FORCE_LOCAL: 'true'
  AI_ALLOW_REMOTE: 'false'
  AI_ALLOW_PAID: 'false'
  AI_ENSEMBLE: 'false'
  AI_MAP_REDUCE: 'false'
  AI_FULL_CONTEXT: 'false'
  GMAIL_DIAG_AI_MAX: '0'
```

Inject helper: `node tools/ci/inject-forfait-env-workflows.js --apply`  
Gate: `node tools/ci/p2542-local-auto-improve-gate.js`

## Homey runtime (no tokens)

| Stack | Path |
|-------|------|
| Heap / boot | `lib/performance/BootBudget.js` |
| Soft gaps | `lib/resilience/HomeyGapCompensator.js` |
| RX/TX alternates | `lib/io/ProtocolFallbackChain.js` + `ProtocolRxTxChain` |
| Raw ZCL listen | `lib/clusters/RawClusterFallback.js` |
| Divisors | `lib/managers/SmartDivisorManager.js` |
| Energy habits | `lib/telemetry/LocalSmartEnergyLearner.js` (P2560) |

## Workflow local learn (P2562)

Every GHA workflow gets `LOCAL_SMART_LEARN=true` + `LOCAL_ENERGY_LEARN=true` (inject).  
CI habit EMA: `tools/ci/LocalWorkflowLearner.js` · CLI `npm run learn:workflow` · gate `npm run check:p2562`.  
SSOT: [`config/architecture/local-workflow-learn-ssot.json`](../../config/architecture/local-workflow-learn-ssot.json).
| Offline engine | `lib/LocalFirstEngine.js` |

## Related

- [`AI_EFFICIENCY_SSOT.md`](./AI_EFFICIENCY_SSOT.md) (P2491)
- [`COMPLEMENTARY_VARIANT_ENRICH.md`](../rules/COMPLEMENTARY_VARIANT_ENRICH.md) (P2520)
- [`complementary-reinstate-notions-ssot.json`](../../config/architecture/complementary-reinstate-notions-ssot.json) (P2541)
- Forum: SHADOW only (T157628) — never POST

## Opt-in remote (rare, human only)

```bash
AI_ALLOW_REMOTE=true AI_FORCE_LOCAL=false AI_ALLOW_PAID=false
```
