---
description: P2437 — Cap Cursor/Grok burn on forfait; no paid models, minimal Task/subagents
alwaysApply: true
---

# Cursor AI forfait limit (P2437)

**Mandate:** Plan inclus is NOT enough for Grok / cloud / parallel bots. Soft-stop hard.

## Forbidden (unless user sets `AI_ALLOW_PAID=true` in env AND asks explicitly)
- Any **Grok** model (`cursor-grok-*`, grok-*)
- Opus / o1 / o3 / paid overage models for Task or chat
- **Cloud** Task agents (`environment: cloud`)
- Parallel Task fan-out (max **1** subagent)
- Spawning `generalPurpose`, `bugbot`, `security-review`, `best-of-n-runner`, `ci-investigator` by default
- Cursor Automations / Autopilot loops that re-prompt agents on cron without human ask

## Required defaults
- Model for any Task: **`inherit` only** (never pass `model: cursor-grok-...`)
- Prefer **direct tools** (Grep/Read/Shell) over Task
- Prefer **`explore`** only when truly needed, serial, inherit
- Cap: see `config/security/ai-plan-forfait.json` → `cursorIde`
- CI: `npm run ai:plan-guard` + `npm run check:p2491` — slim context / skip remote when soft-stop
- Prefer project smart map (`config/architecture/project-smart-map.json`) over dumping full docs into prompts

## WHY (P215)
- **Pourquoi:** Forfait quota burns on Grok Task + cloud agents + fat GHA context before useful Homey work finishes
- **Comment:** Project rule + hooks deny + P2491 compress SSOT + lower daily caps
- **Pour qui:** Dylan / Cursor IDE + GHA bots
- **Quand:** Every prompt / every Task spawn / every cron AI step
- **Contre quoi:** Silent OOM of included tokens → empty agent mid-fix

## Agent behaviour
1. Do the work yourself. Do **not** launch Grok subagents.
2. If a Task is unavoidable: `model: "inherit"`, `run_in_background: false`, one at a time.
3. Never suggest upgrading to paid; skip AI and use local heuristics / scripts.
4. Forum / PM: still SHADOW only (unchanged).
5. When summarizing project state for bots: use **smart map pointers**, not full PECULIARITIES/GIP dumps.