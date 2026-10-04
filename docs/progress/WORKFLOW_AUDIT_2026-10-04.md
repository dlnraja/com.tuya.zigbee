# Workflow audit — 2026-10-04

Our wording only. Goal: check that free scheduled workflows cover the maintainer checklist, list gaps, and record what was filled this run.

## Coverage matrix

| Area | Covered by | Notes |
|---|---|---|
| Strict fingerprint apply | `oss-lan-source-enrich.yml` → `scripts/leads/strict-apply.js` | Cap via `STRICT_APPLY_MAX` |
| Quirk records | same + `daily-digest` inspiration quirks step | Free local |
| #557 triage | `strict-apply.js --source=issue557` | Tracking issue exists (`bot-digest`) |
| Stable backport | `oss-lan` job `stable-backport` | Device-compat couples only |
| Peer flow inventory | `oss-lan` Homey Store peer probe → `peer-flow-cards.json` | |
| Post-publish check | `verified-publish-and-diagnostics.yml`, `publish-self-heal.yml` | |
| Fork scan | `oss-lan` GitHub leads scan | Incremental |
| Image OCR | `oss-lan` + forum watch tesseract | Free local OCR |
| Coverage audit | `scripts/leads/coverage-audit.js` in `oss-lan` | Cap `COVERAGE_AUDIT_MAX` |
| Dual-couple report | `scripts/leads/dual-couples.js` in `oss-lan` | Report only |
| Gang patterns | `scripts/leads/gang-patterns.js` in `oss-lan` | Report only |
| Legacy enforcement | `tools/ci/enforce-dual-couple-legacy.js` now in `safe-auto-commit` (P2797c) | Also fleet / publish paths |
| Case variants | `ensure-case-variants.js` in auto-enrich / auto-fix / unified-ci / gmail-diag | |
| Johan batches | `johan-thread-intel.yml` + `scripts/scanners/johan-canonical-index.js` (Batch NN parser) | Index exists |
| Forum ingestion | `forum-poll.yml`, `daily-digest` forum job | Topics 140352, 26439, 89271, 146735, 154077, 21313 |
| Diag emails | `gmail-diagnostics.yml`, `fetch-diags.yml` | |
| History sweep | **was missing** → filled this run | `data/leads/sweep-checkpoint.json` + `scripts/progress/advance-sweep.js` wired into `johan-thread-intel` (weekdays) |
| Rules gates | `pr-gate`, `auto-fix-and-publish`, `unified-ci`, `safe-auto-commit` | Shared scripts as SSOT |

## Gaps filled this run

1. **History sweep infrastructure** — checkpoint + resumable free chunk script + weekday hook on `johan-thread-intel.yml`.
2. **CI stash P2797c port** — Pages OIDC one-shot retry; continuous-flow push trigger removed; `safe-auto-commit` runs legacy enforcement + compose/app.json fingerprint sync gate + flow-title gate.
3. **Daily digest self-check** — optional weekday job posts a short status comment on issue #557 when the report fingerprint changes.

## Gaps deferred

1. **Gate duplication across ~5 workflows** — sacred-couple / anti-bot / P214 / fingerprint-sync / flow-title. Keep shared JS gates; no massive YAML merge this run.
2. **Forum thread deep posts beyond lastSeen** — checkpoint has lastPost seeds from digest #557; advancing Discourse post-by-post still needs polite rate-limited harvest (existing `forum-t140352-recent-harvest.js`). Tomorrow chunk can prefer 140352 if GH API is hot.
3. **Ledger wiring into every enrichment workflow** (queue item 7) — still only johan scanner + advance-sweep; broader wiring pending.
4. **Johan canonical index refresh for newest closures** — scanner already parses Batch NN; live refresh is the existing daily job (no gap-fill code needed beyond confirming parser).

## Decisions

- **continuous-flow schedule = always dry-run.** Push trigger removed (P2797c): it produced nothing (~30 dry runs / 48 h). Apply only via `workflow_dispatch` `mode=apply`.
- **Self-check comments** only when fingerprint changes (or FORCE), never on every cron tick.

## Blockers noted

- Master tip analysis already recorded Athom `processing_failed` on 9.0.1331 (socket hang up class) — unrelated to this CI/docs/sweep run; prefer re-upload same version after hang, already mitigated on stable publish workflow.
