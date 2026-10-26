<!-- report-writer:v1 lang=en -->
### GitHub Actions reports — inventory (P3069)

90 workflows: 48 write a job summary, 1 already use the shared report helper and 0 carry our own "about" header. 15 scripts still interpolate third-party titles or bodies, and 46 docs hold long quoted passages to rewrite.

| workflow | about header | job summary | shared helper | writes to GitHub |
| --- | --- | --- | --- | --- |
| activity-monitor.yml | no | yes | - | - |
| agent-reach.yml | no | - | - | - |
| ai-monthly-audit.yml | no | - | - | - |
| athom-build-history.yml | no | - | - | - |
| auto-bot-issue-triage.yml | no | yes | - | - |
| auto-close-supported.yml | no | yes | - | - |
| auto-enrich-closed-loop.yml | no | yes | - | - |
| auto-fix-and-publish.yml | no | yes | - | own repo only (see notes) |
| auto-publish-on-push.yml | no | yes | - | - |
| auto-reopen-on-comment.yml | no | - | - | - |
| automation-loop.yml | no | - | - | - |
| autonomous-verification.yml | no | - | - | - |
| bastien-promote-upstream.yml | no | yes | - | - |
| bastien-publish.yml | no | yes | - | - |
| blakadder-fetch.yml | no | yes | - | - |
| bug-report-auto-pr.yml | no | - | - | - |
| build-error-diag.yml | no | yes | - | - |
| ci-autofix.yml | no | - | - | - |
| ci-self-check.yml | no | - | yes | - |
| code-quality.yml | no | yes | - | - |
| collect-diagnostics.yml | no | - | - | - |
| community-inbox.yml | no | - | - | - |
| continuous-flow.yml | no | yes | - | - |
| daily-digest.yml | no | - | - | - |
| delete-johan-comments.yml | no | - | - | - |
| delete-own-upstream-comments.yml | no | yes | - | - |
| dependabot-auto-merge.yml | no | - | - | - |
| deploy-pages.yml | no | - | - | - |
| doc-coverage.yml | no | yes | - | - |
| draft-to-test-fleet.yml | no | yes | - | - |
| draft-to-test.yml | no | yes | - | - |
| driver-maintenance.yml | no | yes | - | - |
| e2e-dashboard-test.yml | no | yes | - | - |
| fetch-diags.yml | no | yes | - | - |
| fleet-intelligent-enrich.yml | no | yes | - | - |
| flow-publish-self-heal.yml | no | yes | - | - |
| forum-pm-read.yml | no | yes | - | - |
| forum-poll.yml | no | yes | - | - |
| free-scrape-crossref.yml | no | yes | - | - |
| gmail-diagnostics.yml | no | - | - | - |
| gmail-token-keepalive.yml | no | - | - | own repo only (see notes) |
| homey-app-validate.yml | no | yes | - | - |
| homey-knowledge-refresh.yml | no | - | - | - |
| homey-secrets-health.yml | no | - | - | - |
| homey-store-peer-probe.yml | no | - | - | - |
| housekeeping.yml | no | - | - | - |
| johan-thread-intel.yml | no | yes | - | - |
| kb-refresh.yml | no | - | - | - |
| knowledge-graph-sync.yml | no | yes | - | - |
| l99-inbox-intelligence.yml | no | yes | - | - |
| labeler.yml | no | - | - | - |
| market-couples-intake.yml | no | yes | - | - |
| mega-crawl.yml | no | yes | - | - |
| monthly-community-sync.yml | no | yes | - | own repo only (see notes) |
| monthly-device-enrichment.yml | no | yes | - | - |
| monthly-enrichment.yml | no | yes | - | - |
| monthly-scan.yml | no | yes | - | own repo only (see notes) |
| monthly-tuya-intelligence.yml | no | - | - | - |
| nightly-audit.yml | no | yes | - | - |
| node22-tests.yml | no | - | - | - |
| notifications.yml | no | - | - | - |
| offline-crash-analyzer.yml | no | yes | - | - |
| open-code-review.yml | no | - | - | - |
| oss-lan-source-enrich.yml | no | - | - | - |
| peer-complementary-enrich.yml | no | yes | - | - |
| platform-budget.yml | no | - | - | - |
| pr-gate.yml | no | - | - | - |
| project-resilience.yml | no | yes | - | - |
| publish-diagnose.yml | no | yes | - | - |
| publish-self-heal.yml | no | yes | - | - |
| publish-stable.yml | no | yes | - | - |
| publish.yml | no | yes | - | - |
| recurrent-orchestrator.yml | no | yes | - | - |
| repo-autopilot.yml | no | - | - | - |
| safe-sync-stable.yml | no | - | - | - |
| self-improve.yml | no | yes | - | - |
| shadow-policy-check.yml | no | - | - | - |
| smart-pr-merge.yml | no | yes | - | - |
| smart-update.yml | no | yes | - | - |
| stale.yml | no | - | - | - |
| storage-cleanup.yml | no | - | - | - |
| syntax-check.yml | no | - | - | - |
| temporal-monitor.yml | no | - | - | - |
| tuya-deep-diag.yml | no | - | - | - |
| unified-ci.yml | no | - | - | - |
| upstream-guard.yml | no | - | - | own repo only (see notes) |
| validate.yml | no | yes | - | - |
| verified-publish-and-diagnostics.yml | no | - | - | - |
| version-health.yml | no | - | - | - |
| weekly-sovereign-loop.yml | no | yes | - | - |

<details><summary>Scripts that interpolate third-party titles or bodies (to migrate)</summary>

- `.github/scripts/ai-dp-extract.js` — 1 line(s)
- `.github/scripts/community-inbox-digest.js` — 5 line(s)
- `.github/scripts/gmail-local-reader.js` — 1 line(s)
- `.github/scripts/internet-research-tool.js` — 1 line(s)
- `.github/scripts/source-registry.js` — 4 line(s)
- `.github/scripts/triage-run.js` — 2 line(s)
- `.github/scripts/triage-upstream-enhanced.js` — 4 line(s)
- `scripts/analysis/forum_analysis_complete.js` — 1 line(s)
- `scripts/automation/digest.cjs` — 1 line(s)
- `scripts/automation/reply-candidates.cjs` — 1 line(s)
- `scripts/digest/quirks-scan.js` — 1 line(s)
- `scripts/digest/triage.js` — 1 line(s)
- `scripts/research/cross-research.js` — 1 line(s)
- `scripts/scanners/github-leads-scan.js` — 1 line(s)
- `scripts/scanners/issue-image-ocr.js` — 1 line(s)

</details>

<details><summary>Docs with long quoted passages (to rewrite)</summary>

- `docs/knowledge/AOYAN_PADDED_MANUFACTURER.md` — 1
- `docs/knowledge/DEVICE_TRUTH.md` — 1
- `docs/knowledge/FIELD_NOTES_2026-10_X_SCAN.md` — 1
- `docs/knowledge/HOMEY_FIRMWARE.md` — 1
- `docs/knowledge/KB/CODE_REFERENCE.md` — 4
- `docs/knowledge/KB/DP_ENDPOINT_COVERAGE.md` — 4
- `docs/knowledge/KB/UNKNOWN_COMMANDS.md` — 1
- `docs/knowledge/OTA_AUDIT_P2932.md` — 1
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
