# Homey tooling watch

Weekly, automatic (homey-tooling-refresh.js). Sources: npm registry (Athom B.V. packages).

## 2026-10-26
- homey: (new) -> 4.6.1 (engines.node >=24; ours ^4.4.1)
- homey-lib: (new) -> 2.52.3 (engines.node >=12.13.0; ours ^2.51.4)
- homey-zigbeedriver: (new) -> 2.2.18 (engines.node >=22; ours 2.2.17)
- zigbee-clusters: (new) -> 3.9.1 (engines.node >=22; ours ^2.6.0)
- Proposal only: homey CLI 4.6.1 asks for node >=24; 49 workflow(s) still set a lower node-version (activity-monitor.yml, ai-monthly-audit.yml, athom-build-history.yml, auto-bot-issue-triage.yml, auto-enrich-closed-loop.yml, auto-fix-and-publish.yml, automation-loop.yml, autonomous-verification.yml, build-error-diag.yml, ci-autofix.yml, ci-self-check.yml, daily-digest.yml, delete-johan-comments.yml, doc-coverage.yml, draft-to-test-fleet.yml, draft-to-test.yml, fetch-diags.yml, fleet-intelligent-enrich.yml, forum-poll.yml, gmail-diagnostics.yml, homey-app-validate.yml, homey-secrets-health.yml, johan-thread-intel.yml, kb-refresh.yml, knowledge-graph-sync.yml, monthly-tuya-intelligence.yml, nightly-audit.yml, node22-tests.yml, notifications.yml, offline-crash-analyzer.yml, open-code-review.yml, platform-budget.yml, pr-gate.yml, publish-self-heal.yml, publish-stable.yml, publish.yml, recurrent-orchestrator.yml, repo-autopilot.yml, safe-sync-stable.yml, shadow-policy-check.yml, smart-update.yml, storage-cleanup.yml, syntax-check.yml, temporal-monitor.yml, unified-ci.yml, validate.yml, verified-publish-and-diagnostics.yml, version-health.yml, weekly-sovereign-loop.yml). Not changed automatically: review by hand, node22-tests and validate stay on the Node the app targets.
- Proposal only: homey-zigbeedriver 2.2.17 -> 2.2.18 (runtime lib, kept on purpose; port useful fixes instead)
- Proposal only: zigbee-clusters ^2.6.0 -> 3.9.1 (runtime lib, kept on purpose; port useful fixes instead)
