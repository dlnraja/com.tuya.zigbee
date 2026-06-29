# Diagnostic History Rules

These rules apply to Gmail crash logs, Homey developer dashboard diagnostics, forum/GitHub notification emails, and aggregated Homey device reports.

## Safety

- Never commit raw Gmail, dashboard, crash, or diagnostic payloads.
- Always run `.github/scripts/privacy-redactor.js` before publishing artifacts, summaries, comments, or issues.
- Treat `.github/state/*` and `diagnostics/*` as generated private operational data unless the security scanner explicitly allows the file.
- Scheduled diagnostic jobs must run with `DRY_RUN=true` and `GMAIL_DIAG_AUTO_IMPLEMENT=false`.
- Auto-implementation from email diagnostics is allowed only in an explicit manual run with `--implement` or `GMAIL_DIAG_AUTO_IMPLEMENT=true`.

## Historical Recovery

- Use `npm run diag:gmail:history` or workflow dispatch `all_history=true` to rebuild the chronology from the historical baseline.
- Use `GMAIL_DIAG_SINCE` or `--since YYYY-MM-DD` when a smaller replay window is enough.
- Use `GMAIL_DIAG_MAX_RESULTS` or `--max-results` to bound IMAP fetch size.
- Use `--reprocess` only when rebuilding summaries, not during normal scheduled sweeps.

## Required Checks

- After every Gmail/Homey diagnostic collection, run `npm run security:diagnostics`.
- After redaction, run `npm run check:diag-history`.
- When diagnostics mention AggregateError, run `npm run validate:mfr-empty` and `npm run precommit:full`.
- When diagnostics mention processing failed or publish failures, run `npm run check:yaml`, `npm run validate:publish`, and `npm run diag:build`.
- When diagnostics mention buttons, flows, or missing capability listeners, run `npm run check:flows`, `npm run check:voice`, and `node scripts/automation/audit-flowcards.js --json`.
- When diagnostics mention battery question marks or missing battery values, run `node scripts/ci/bug-hunter.js --json` and `node scripts/automation/validate-drivers.js --json`.

## Cross-App Propagation

- Diagnostic, privacy, CI, publish, battery, button, flow, and capability-listener fixes are cross-app candidates by default.
- Backport low-risk guardrails to `stable-v5` when compatible.
- Do not copy app IDs, publish credentials, branch-specific versions, or store metadata between app tracks.
