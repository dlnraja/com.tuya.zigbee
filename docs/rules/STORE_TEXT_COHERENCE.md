# Store text and changelog coherence (P3363, t996u, t998u)

SSOT: `config/architecture/store-text-coherence-ssot.json`.

## What must stay true
- Each app's `.homeychangelog.json` only lists versions of that app (master 9.x, stable 5.x, Bastien 1.x) and has an entry for the current package version.
- Notes are built from commits since the previous version really published for that app (ledger), otherwise since the previous bump. Always English and French. No personal names, no internal ticket ids.
- Driver names are unique per locale and written in that locale (accents from the known word list; characters up to U+00FF only in the fixer).
- Two flow cards in one driver must not render the same title. Retitle; never delete or rename a published driver, flow-card or capability id, and never drop a mfr+pid couple.
- Bastien `app.json` is the official HomeyCompose output (P3079). Do not run `normalise()` on the committed file.
- Never commit the built root `app.json` that `homey app validate` writes (pretty-printed, driver flow cards merged, P2920). Sync titles into the compact source form only.

## Automation
- Workflow: `.github/workflows/store-text-coherence.yml` (weekly Tuesday 05:10 UTC and `workflow_dispatch`).
- Kill switch: repo variable `STORE_TEXT_COHERENCE_DISABLED=true`.
- Token: `GITHUB_TOKEN` only. Concurrency group `store-text-coherence`. Job timeout 25 minutes.
- Auto-commit uses `scripts/ci/safe-auto-commit.js` (rebase, never force, `[skip ci]`, no issue comments). Anything the fixer will not touch is a report artifact under `reports/p3363-coherence-report.json`.
- Runner: `node scripts/automation/p3363-coherence-run.js [--fix]`.
