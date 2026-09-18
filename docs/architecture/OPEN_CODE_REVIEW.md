# Open Code Review (Alibaba) — Homey Universal Tuya

**P2582 · MASTER_ONLY tooling** (runtime Homey app unchanged except OCR-found radar watchdog fix).

Use [alibaba/open-code-review](https://github.com/alibaba/open-code-review) for deterministic review file selection + rule resolution. Under AI forfait we prefer **Delegation Mode** (Cursor reviews; no OCR LLM API key).

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

# Manual range
ocr.cmd delegate preview --from HEAD~30 --to HEAD --format json
ocr.cmd delegate rule --rule .opencodereview/rule.json drivers/presence_sensor_radar/device.js
```

Full LLM review (`ocr review`) needs a configured provider — **not** default on CI (forfait / `AI_FORCE_LOCAL`).

## Workflow

`.github/workflows/open-code-review.yml` — `workflow_dispatch` only. Runs delegate preview + uploads JSON artifact. Optional `ocr review` only if `OCR_LLM_AUTH_TOKEN` is set (`continue-on-error`).

## Gate

`npm run check:p2582`
