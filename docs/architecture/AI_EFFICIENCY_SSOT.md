# AI Efficiency SSOT (P2491)

Machine SSOTs:
- [`config/security/ai-plan-forfait.json`](../../config/security/ai-plan-forfait.json)
- [`config/security/ai-context-compress-ssot.json`](../../config/security/ai-context-compress-ssot.json)
- [`config/architecture/project-smart-map.json`](../../config/architecture/project-smart-map.json)

Lib: [`tools/ci/ai-context-compress.js`](../../tools/ci/ai-context-compress.js)  
Runtime: [`.github/scripts/ai-helper.js`](../../.github/scripts/ai-helper.js) + [`project-rules.js`](../../.github/scripts/project-rules.js)

**Classify:** `BOTH` (CI cost / reliability). Cursor hooks remain MASTER_ONLY side.

## Problem

Every remote `callAI` used to inject ~**59KB** of rules (`LOADED_RULES` ~54KB). Ensemble + map-reduce + OpenRouter model-list fetch multiplied requests. Cron harvests overlapped (forum / L99 / auto-enrich).

## Defaults (forfait)

| Env | Default | Effect |
|-----|---------|--------|
| `AI_FORCE_LOCAL` | `true` | Skip remote AI |
| `AI_ALLOW_REMOTE` | `false` | Must opt-in for any provider call |
| `AI_FULL_CONTEXT` | `false` | Slim smart-map system prompt only |
| `AI_ENSEMBLE` | `false` | No multi-provider fan-out |
| `AI_MAP_REDUCE` | `false` | No splitTaskAndCombine multiply |
| `AI_OPENROUTER_MODEL_LIST` | `false` | No `/models` probe each call |
| `AI_GLOBAL_DAILY_CAP` | `80` | Soft-stop **60%** |
| `GMAIL_DIAG_AI_MAX` | `0` | Diag bots never AI |

## Prefer local

Use `tools/ci/local-intelligent-solver.js` for GH issues / diags / forum couples before any remote call.

## Cron density (fewer overlapping API hits)

| Workflow | Hint cron |
|----------|-----------|
| forum-poll | `15 2,8,14,20 * * *` (4×/day) |
| l99-inbox | `45 3,11,19 * * *` (3×/day) |
| auto-enrich | `0 */6 * * *` (4×/day) |

## Gates

```bash
npm run check:p2491
npm run ai:plan-guard
node tools/ci/ai-context-compress.js --self-test
```

## Opt-in remote (rare)

Only when a human explicitly needs LLM triage:

```bash
AI_ALLOW_REMOTE=true AI_FORCE_LOCAL=false AI_FULL_CONTEXT=0
```
