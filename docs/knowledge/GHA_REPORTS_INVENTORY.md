<!-- report-writer:v1 lang=en -->
### GitHub Actions reports — inventory (P3069)

75 workflows: 44 write a job summary, 1 already use the shared report helper and 75 carry our own "about" header. 0 scripts still interpolate third-party titles or bodies, and 11 docs hold long quoted passages to rewrite.

| workflow | about header | job summary | shared helper | writes to GitHub |
| --- | --- | --- | --- | --- |
| activity-monitor.yml | yes | yes | - | - |
| agent-reach.yml | yes | - | - | - |
| ai-monthly-audit.yml | yes | - | - | - |
| auto-bot-issue-triage.yml | yes | yes | - | - |
| auto-close-supported.yml | yes | yes | - | - |
| auto-enrich-closed-loop.yml | yes | yes | - | - |
| auto-fix-and-publish.yml | yes | yes | - | own repo only (see notes) |
| auto-publish-on-push.yml | yes | yes | - | - |
| auto-reopen-on-comment.yml | yes | - | - | - |
| autonomous-verification.yml | yes | - | - | - |
| bastien-publish.yml | yes | yes | - | - |
| blakadder-fetch.yml | yes | yes | - | - |
| bug-report-auto-pr.yml | yes | - | - | - |
| build-error-diag.yml | yes | yes | - | - |
| ci-self-check.yml | yes | - | yes | - |
| code-quality.yml | yes | yes | - | - |
| collect-diagnostics.yml | yes | - | - | - |
| community-inbox.yml | yes | - | - | - |
| continuous-flow.yml | yes | yes | - | - |
| delete-johan-comments.yml | yes | - | - | - |
| delete-own-upstream-comments.yml | yes | yes | - | - |
| dependabot-auto-merge.yml | yes | - | - | - |
| deploy-pages.yml | yes | - | - | - |
| doc-coverage.yml | yes | yes | - | - |
| draft-to-test-fleet.yml | yes | yes | - | - |
| draft-to-test.yml | yes | yes | - | - |
| driver-maintenance.yml | yes | yes | - | - |
| e2e-dashboard-test.yml | yes | yes | - | - |
| fetch-diags.yml | yes | yes | - | - |
| fleet-intelligent-enrich.yml | yes | yes | - | - |
| forum-pm-read.yml | yes | yes | - | - |
| forum-poll.yml | yes | yes | - | - |
| free-scrape-crossref.yml | yes | yes | - | - |
| gmail-diagnostics.yml | yes | - | - | - |
| gmail-token-keepalive.yml | yes | - | - | own repo only (see notes) |
| homey-app-validate.yml | yes | yes | - | - |
| housekeeping.yml | yes | - | - | - |
| kb-refresh.yml | yes | - | - | - |
| knowledge-graph-sync.yml | yes | yes | - | - |
| l99-inbox-intelligence.yml | yes | yes | - | - |
| labeler.yml | yes | - | - | - |
| market-couples-intake.yml | yes | yes | - | - |
| mega-crawl.yml | yes | yes | - | - |
| monthly-community-sync.yml | yes | yes | - | own repo only (see notes) |
| monthly-device-enrichment.yml | yes | yes | - | - |
| monthly-enrichment.yml | yes | yes | - | - |
| monthly-scan.yml | yes | yes | - | own repo only (see notes) |
| monthly-tuya-intelligence.yml | yes | - | - | - |
| nightly-audit.yml | yes | yes | - | - |
| node22-tests.yml | yes | - | - | - |
| notifications.yml | yes | - | - | - |
| offline-crash-analyzer.yml | yes | yes | - | - |
| platform-budget.yml | yes | - | - | - |
| pr-gate.yml | yes | - | - | - |
| project-resilience.yml | yes | yes | - | - |
| publish-diagnose.yml | yes | yes | - | - |
| publish-self-heal.yml | yes | yes | - | - |
| publish-stable.yml | yes | yes | - | - |
| publish.yml | yes | yes | - | - |
| recurrent-orchestrator.yml | yes | yes | - | - |
| safe-sync-stable.yml | yes | - | - | - |
| self-improve.yml | yes | yes | - | - |
| shadow-policy-check.yml | yes | - | - | - |
| smart-pr-merge.yml | yes | yes | - | - |
| smart-update.yml | yes | yes | - | - |
| stale.yml | yes | - | - | - |
| syntax-check.yml | yes | - | - | - |
| temporal-monitor.yml | yes | - | - | - |
| tuya-deep-diag.yml | yes | - | - | - |
| unified-ci.yml | yes | - | - | - |
| upstream-guard.yml | yes | - | - | own repo only (see notes) |
| validate.yml | yes | yes | - | - |
| verified-publish-and-diagnostics.yml | yes | - | - | - |
| version-health.yml | yes | - | - | - |
| weekly-sovereign-loop.yml | yes | yes | - | - |

<details><summary>Scripts that interpolate third-party titles or bodies (to migrate)</summary>

- none

</details>

<details><summary>Docs with long quoted passages (to rewrite)</summary>

- `docs/knowledge/FIELD_NOTES_2026-10_X_SCAN.md` — 1
- `docs/knowledge/HOMEY_FIRMWARE.md` — 1
- `docs/knowledge/KB/CODE_REFERENCE.md` — 4
- `docs/knowledge/KB/UNKNOWN_COMMANDS.md` — 1
- `docs/knowledge/P3036_ATHOM_PUBLISH_POLICY.md` — 1
- `docs/knowledge/TS004X_BATTERY_REMOTES.md` — 1
- `CREDITS.md` — 1
- `reports/COMMUNITY-INTELLIGENCE.md` — 148
- `reports/kimi-2026-07-28/backport-ondeleted-destroyed.md` — 2
- `reports/kimi-2026-07-28/stable-checkers-pass.md` — 1
- `reports/repomix-architecture.md` — 1555

</details>

<details><summary>Notes on posting</summary>

Workflows flagged "writes to GitHub" only write inside this repository (labelled tracking issues, the digest issue, alerts).
Nothing posts on the Homey Community forum or on upstream repositories; replies stay behind the anti-flood ledger (data/progress/replies-ledger.json).

</details>

**Thanks** — GitHub job-summary documentation, actionlint (rhysd), the Homey Community and Zigbee2MQTT trackers for the link-do-not-quote habit.
