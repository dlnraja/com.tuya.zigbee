<!-- report-writer:v1 lang=en -->
### GitHub Actions reports — inventory (P3069)

75 workflows: 71 write a job summary, 72 already use the shared report helper and 75 carry our own "about" header. 21 scripts still interpolate third-party titles or bodies, and 0 docs hold long quoted passages to rewrite.

| workflow | about header | job summary | shared helper | writes to GitHub |
| --- | --- | --- | --- | --- |
| activity-monitor.yml | yes | yes | yes | - |
| agent-reach.yml | yes | yes | yes | - |
| ai-monthly-audit.yml | yes | - | - | - |
| auto-bot-issue-triage.yml | yes | yes | yes | - |
| auto-close-supported.yml | yes | yes | yes | - |
| auto-enrich-closed-loop.yml | yes | yes | yes | - |
| auto-fix-and-publish.yml | yes | yes | yes | own repo only (see notes) |
| auto-publish-on-push.yml | yes | yes | yes | - |
| auto-reopen-on-comment.yml | yes | yes | yes | - |
| autonomous-verification.yml | yes | - | - | - |
| bastien-publish.yml | yes | yes | yes | - |
| blakadder-fetch.yml | yes | yes | yes | - |
| bug-report-auto-pr.yml | yes | yes | yes | - |
| build-error-diag.yml | yes | yes | yes | - |
| ci-self-check.yml | yes | - | yes | - |
| code-quality.yml | yes | yes | yes | - |
| collect-diagnostics.yml | yes | yes | yes | - |
| community-inbox.yml | yes | yes | yes | - |
| continuous-flow.yml | yes | yes | yes | - |
| delete-johan-comments.yml | yes | yes | yes | - |
| delete-own-upstream-comments.yml | yes | yes | yes | - |
| dependabot-auto-merge.yml | yes | yes | yes | - |
| deploy-pages.yml | yes | yes | yes | - |
| doc-coverage.yml | yes | yes | yes | - |
| draft-to-test-fleet.yml | yes | yes | yes | - |
| draft-to-test.yml | yes | yes | yes | - |
| driver-maintenance.yml | yes | yes | yes | - |
| e2e-dashboard-test.yml | yes | yes | yes | - |
| fetch-diags.yml | yes | yes | yes | - |
| fleet-intelligent-enrich.yml | yes | yes | yes | - |
| forum-pm-read.yml | yes | yes | yes | - |
| forum-poll.yml | yes | yes | yes | - |
| free-scrape-crossref.yml | yes | yes | yes | - |
| gmail-diagnostics.yml | yes | yes | yes | - |
| gmail-token-keepalive.yml | yes | yes | yes | own repo only (see notes) |
| homey-app-validate.yml | yes | yes | yes | - |
| housekeeping.yml | yes | yes | yes | - |
| kb-refresh.yml | yes | yes | yes | - |
| knowledge-graph-sync.yml | yes | yes | yes | - |
| l99-inbox-intelligence.yml | yes | yes | yes | - |
| labeler.yml | yes | yes | yes | - |
| market-couples-intake.yml | yes | yes | yes | - |
| mega-crawl.yml | yes | yes | yes | - |
| monthly-community-sync.yml | yes | yes | yes | own repo only (see notes) |
| monthly-device-enrichment.yml | yes | yes | yes | - |
| monthly-enrichment.yml | yes | yes | yes | - |
| monthly-scan.yml | yes | yes | yes | own repo only (see notes) |
| monthly-tuya-intelligence.yml | yes | yes | yes | - |
| nightly-audit.yml | yes | yes | yes | - |
| node22-tests.yml | yes | yes | yes | - |
| notifications.yml | yes | yes | yes | - |
| offline-crash-analyzer.yml | yes | yes | yes | - |
| platform-budget.yml | yes | yes | yes | - |
| pr-gate.yml | yes | yes | yes | - |
| project-resilience.yml | yes | yes | yes | - |
| publish-diagnose.yml | yes | yes | yes | - |
| publish-self-heal.yml | yes | yes | yes | - |
| publish-stable.yml | yes | yes | yes | - |
| publish.yml | yes | yes | yes | - |
| recurrent-orchestrator.yml | yes | yes | yes | - |
| safe-sync-stable.yml | yes | yes | yes | - |
| self-improve.yml | yes | yes | yes | - |
| shadow-policy-check.yml | yes | yes | yes | - |
| smart-pr-merge.yml | yes | yes | yes | - |
| smart-update.yml | yes | yes | yes | - |
| stale.yml | yes | yes | yes | - |
| syntax-check.yml | yes | yes | yes | - |
| temporal-monitor.yml | yes | yes | yes | - |
| tuya-deep-diag.yml | yes | yes | yes | - |
| unified-ci.yml | yes | - | - | - |
| upstream-guard.yml | yes | yes | yes | own repo only (see notes) |
| validate.yml | yes | yes | yes | - |
| verified-publish-and-diagnostics.yml | yes | yes | yes | - |
| version-health.yml | yes | yes | yes | - |
| weekly-sovereign-loop.yml | yes | yes | yes | - |

<details><summary>Scripts that interpolate third-party titles or bodies (to migrate)</summary>

- `.github/scripts/athom-login-cartography.js` — 1 line(s)
- `.github/scripts/generate-dashboards-page.js` — 1 line(s)
- `.github/scripts/internet-research-tool.js` — 2 line(s)
- `.github/scripts/scan-johan-full.js` — 1 line(s)
- `.github/scripts/variant-scanner.js` — 1 line(s)
- `tools/ci/auto-bot-issue-triage.js` — 1 line(s)
- `tools/ci/button-issues-deep.js` — 3 line(s)
- `tools/ci/check-open-buttons.js` — 1 line(s)
- `tools/ci/device-investigator.js` — 1 line(s)
- `tools/ci/fetch-all-activity.js` — 1 line(s)
- `tools/ci/fetch-dlnraja-comments-public.js` — 1 line(s)
- `tools/ci/find-no-oninit.js` — 1 line(s)
- `tools/ci/forum-temporal-collect.js` — 1 line(s)
- `tools/ci/generate-docs-index.js` — 2 line(s)
- `tools/ci/parse-forum-digest.js` — 1 line(s)
- `tools/ci/regression-lessons-gate.js` — 1 line(s)
- `tools/ci/search-forum-v2.js` — 4 line(s)
- `tools/ci/search-forum.js` — 1 line(s)
- `tools/ci/session-start.js` — 1 line(s)
- `tools/ci/temporal-cross-ref.js` — 1 line(s)
- `tools/shadow-mode/shadow-mode-v2.js` — 1 line(s)

</details>

<details><summary>Docs with long quoted passages (to rewrite)</summary>

- none

</details>

<details><summary>Notes on posting</summary>

Workflows flagged "writes to GitHub" only write inside this repository (labelled tracking issues, the digest issue, alerts).
Nothing posts on the Homey Community forum or on upstream repositories; replies stay behind the anti-flood ledger (data/progress/replies-ledger.json).

</details>

**Thanks** — GitHub job-summary documentation, actionlint (rhysd), the Homey Community and Zigbee2MQTT trackers for the link-do-not-quote habit.
