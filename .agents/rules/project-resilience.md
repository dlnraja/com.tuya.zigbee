---
description: Fleet-wide Homey-gap resilience + feature/bug inventory (critical-first)
globs:
  - config/resilience/**
  - lib/resilience/**
  - tools/ci/project-resilience-orchestrator.js
  - tools/ci/inventory-features-bugs.js
  - docs/architecture/COMPLEMENTARY_ENRICHMENT.md
  - .github/workflows/project-resilience.yml
alwaysApply: false
---

# Project resilience (P2222 / P2224 / P2225)

Same methodology as bidirectional buttons (P2221), applied to **all feature domains**, completed by complementary enrichment, then **inventoried + critical-first in workflows**.

## SSOT

| Path | Role |
|------|------|
| `config/resilience/manifest.json` | Wiring + evolution refs |
| `config/resilience/domains.json` | Domains + Homey gaps + parallel stacks |
| `config/resilience/bug-classes.json` | Historical FIXED/PARTIAL/OPEN |
| `config/resilience/critical-gaps.json` | Prio-1 gaps + discoveries + workflow hooks |
| `config/resilience/layer-glossary.json` | Crosswalk layer schemes |
| `docs/architecture/COMPLEMENTARY_ENRICHMENT.md` | Doctrine |
| `tools/ci/inventory-features-bugs.js` | → `INVENTORY.md` |
| `tools/ci/project-resilience-orchestrator.js` | → `RESILIENCE.md` |
| `lib/resilience/HomeyGapCompensator.js` | Runtime soft ensure |

## Commands

```bash
npm run resilience:inventory
npm run resilience:critical
npm run resilience:all
npm run resilience:audit
npm run enrich:silent
```

## Rules

1. **SHADOW forum** — never POST; intelligence = code/CI.
2. **Per domain**: Homey gap → parallel complementary stack.
3. **Never invent sacred couple** — softHypothesis ≠ lock.
4. **Status honesty** in bug-classes.json.
5. **P2224**: do not collapse parallel layer vocabularies.
6. **P2225**: workflows run inventory + critical-first (prio-1) systematically.

## Workflows

`project-resilience.yml` (cron 05:20 UTC) · `forum-poll.yml` · `auto-enrich-closed-loop.yml` · `fetch-diags.yml`
