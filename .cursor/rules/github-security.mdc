---
description: GitHub Actions elementary security + data-leak / anonymization rules (P2206)
globs:
  - .github/workflows/**
  - .github/scripts/**
  - reports/**
  - diagnostics/**
alwaysApply: false
---

# GitHub security & data-leak (P2206)

## Workflows
- Every `.yml` needs top-level `permissions:` (start `contents: read`).
- Never echo `${{ secrets.* }}` into logs or artifacts.
- Prefer `GITHUB_TOKEN`; `GH_PAT` only for documented cross-repo.
- `pull_request_target`: do not checkout PR head; if used, comment `P2206-ALLOW-PRT`.
- Guard missing secrets; optional secret steps `continue-on-error: true`.

## Data / anonymization
- Keep technical facts: `_TZE…` / `_TZ…`, `TS####`, DP/cluster IDs, app version, error class.
- Redact: emails, phones, IPs/MACs, local paths, Homey UUIDs, tokens, passwords, IMAP UIDs.
- Before commit/upload of dumps: `node .github/scripts/privacy-redactor.js <files…>`.
- **Never commit**: `gmail-ci-dump.json`, `diag-*-excerpt.txt`, `gmail-dumps/`, `diagnostics/raw/`, forum user images under `reports/forum-*/`.
- Public notes: sanitized `TREAT.md` / FP couples only.

## Gates
```bash
npm run security-scan
npm run security:github
npm run security:full
```

Doctrine: `docs/rules/SECURITY_RULES.md` · `.github/WORKFLOW_GUIDELINES.md` §O · `.github/SECRETS.md`.
