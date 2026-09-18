# Open Code Review (Alibaba) — Homey Universal Tuya

**P2582 / P2592 · MASTER_ONLY tooling** (runtime Homey app unchanged except OCR-found fixes).

Use [alibaba/open-code-review](https://github.com/alibaba/open-code-review) for deterministic review file selection + rule resolution. Under AI forfait we use **Delegation Mode only** (free CLI — no OCR LLM API key).

## Install

```bash
npm install -g @alibaba-group/open-code-review
# Windows PowerShell: use ocr.cmd (execution policy blocks ocr.ps1)
```

Cursor plugin (optional): copy `plugins/open-code-review` → `~/.cursor/plugins/local/open-code-review/` then reload window.

## Project rules

Homey-tuned rules live in [`.opencodereview/rule.json`](../../.opencodereview/rule.json) (sacred couple, safe timers, EF00/ZCL, GHA forfait, P2520).

## Commands

```bash
# Preview what OCR would review (last N commits vs merge-base)
npm run review:ocr

# Resolve rules for critical runtime paths
npm run review:ocr:rules

# Intelligent cron/hook entry (skip if no drivers/lib/workflows changes)
npm run review:ocr:intelligent

# Manual range
ocr.cmd delegate preview --from HEAD~30 --to HEAD --format json
ocr.cmd delegate rule --rule .opencodereview/rule.json drivers/presence_sensor_radar/device.js
```

Full LLM review (`ocr review`) needs a configured provider — **not** default on CI (forfait / `AI_FORCE_LOCAL`).

## Workflows & cron (P2592)

| Trigger | Where | Behaviour |
|---------|--------|-----------|
| Cron Mon+Thu **05:50 UTC** | `open-code-review.yml` | Intelligent delegate + artifact |
| PR (drivers/lib/workflows/tools/ci) | same | Free preview |
| Soft hooks | `code-quality`, `project-resilience`, `recurrent-orchestrator`, `auto-enrich-closed-loop`, `forum-poll` | `continue-on-error`; skip if no interesting paths |

Machine SSOT: [`config/architecture/open-code-review-ssot.json`](../../config/architecture/open-code-review-ssot.json).

## Gate

`npm run check:p2582`
