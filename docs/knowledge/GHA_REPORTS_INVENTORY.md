<!-- report-writer:v1 lang=en -->
### GitHub Actions reports — inventory (P3069)

77 workflows: 45 write a job summary, 1 already use the shared report helper and 77 carry our own "about" header. 0 scripts still interpolate third-party titles or bodies, and 43 docs hold long quoted passages to rewrite.

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
| bastien-promote-upstream.yml | yes | yes | - | - |
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
| open-code-review.yml | yes | - | - | - |
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

- `docs/knowledge/DEVICE_TRUTH.md` — 1
- `docs/knowledge/FIELD_NOTES_2026-10_X_SCAN.md` — 1
- `docs/knowledge/HOMEY_FIRMWARE.md` — 1
- `docs/knowledge/KB/CODE_REFERENCE.md` — 4
- `docs/knowledge/KB/UNKNOWN_COMMANDS.md` — 1
- `docs/knowledge/P3036_ATHOM_PUBLISH_POLICY.md` — 1
- `docs/knowledge/TS004X_BATTERY_REMOTES.md` — 1
- `CREDITS.md` — 1
- `reports/AUDIT_HOMEY_2026-07-27.md` — 1
- `reports/COMMUNITY-INTELLIGENCE.md` — 148
- `reports/GLOBAL_IMPROVEMENT_PLAN.md` — 23
- `reports/GMAIL_CRASH_SWEEP_2026-08-15.md` — 1
- `reports/HISTORY_PURGE.md` — 1
- `reports/INVESTIGATION_2026-07-10.md` — 5
- `reports/L99_INVESTIGATION_2026-08-15.md` — 1
- `reports/MULTI_SOURCE_FORUM_INVESTIGATION_2026-08-15.md` — 1
- `reports/P180_BATTERY_BUTTON_VARIANT_2026-08-16.md` — 2
- `reports/PR_DRAFT_HEGEL_FIXES.md` — 1
- `reports/SESSION_HANDOFF_2026-08-15.md` — 1
- `reports/bastien-live-2026-09-21-force/PID_MFS_AUDIT_LIVE.md` — 1
- `reports/forum-full-digest.md` — 1
- `reports/forum-l99-four-threads-2026-09-14/FLEET_L99.md` — 1
- `reports/grok-bot-import/FORUM_LATEST_2190.md` — 2
- `reports/grok-bot-import/FROM_THE_BEGINNING.md` — 1
- `reports/grok-bot-import/NEXT_PATCHES.md` — 1
- `reports/grok-bot-import/ZIGBEE_PARALLEL_CROSS.md` — 1
- `reports/grok-bot-import/cursor-todos-import.md` — 3
- `reports/inbox-l99-2026-08-31/DIAG_BATCH_NEW.md` — 1
- `reports/kimi-2026-07-28/destroyed-guard-fixes.md` — 1
- `reports/kimi-2026-07-28/master-backlog-fixes.md` — 2
- `reports/kimi-2026-07-28/missing-devices-applied.md` — 2
- `reports/kimi-2026-07-28/publish-pruning-rootcause.md` — 1
- `reports/kimi-2026-07-28/scripts-catalog-phase1.md` — 2
- `reports/kimi-2026-07-28/sources-crawl.md` — 1
- `reports/kimi-2026-07-28/wifi-local-first.md` — 2
- `reports/kimi-2026-07-29/forum-13-users-triage.md` — 2
- `reports/kimi-2026-07-29/forum-bugs-reliquats-solo.md` — 2
- `reports/kimi-2026-07-29/github-pages-wifi.md` — 2
- `reports/kimi-2026-07-30/RAPPORT_TESTS_AUDITS.md` — 1
- `reports/removed-personal-dir/ANDROID_BOUYGUES_FINE_TUNE.md` — 1
- `reports/removed-personal-dir/removed-personal-file.md` — 6
- `reports/p2234b-sacred-couple-refine-2026-08-24.md` — 1
- `reports/repomix-architecture.md` — 1555

</details>

<details><summary>Notes on posting</summary>

Workflows flagged "writes to GitHub" only write inside this repository (labelled tracking issues, the digest issue, alerts).
Nothing posts on the Homey Community forum or on upstream repositories; replies stay behind the anti-flood ledger (data/progress/replies-ledger.json).

</details>

**Thanks** — GitHub job-summary documentation, actionlint (rhysd), the Homey Community and Zigbee2MQTT trackers for the link-do-not-quote habit.
