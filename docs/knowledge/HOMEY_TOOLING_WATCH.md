# Homey tooling watch

Weekly, automatic (homey-tooling-refresh.js). Sources: npm registry (Athom B.V. packages).

## 2026-10-19
- homey: (new) -> 4.6.0 (engines.node >=24; ours ^4.4.1)
- homey-lib: (new) -> 2.52.3 (engines.node >=12.13.0; ours ^2.51.4)
- homey-zigbeedriver: (new) -> 2.2.18 (engines.node >=22; ours 2.2.17)
- zigbee-clusters: (new) -> 3.8.0 (engines.node >=22; ours ^2.6.0)
- CI: node-version raised to 24 (homey CLI requires node >=24) in activity-monitor.yml, ai-monthly-audit.yml, auto-fix-and-publish.yml, autonomous-verification.yml, build-error-diag.yml, daily-digest.yml, delete-johan-comments.yml, draft-to-test-fleet.yml, draft-to-test.yml, fetch-diags.yml, homey-app-validate.yml, homey-secrets-health.yml, johan-thread-intel.yml, knowledge-graph-sync.yml, monthly-tuya-intelligence.yml, nightly-audit.yml, node22-tests.yml, notifications.yml, offline-crash-analyzer.yml, open-code-review.yml, pr-gate.yml, publish-self-heal.yml, publish-stable.yml, recurrent-orchestrator.yml, safe-sync-stable.yml, shadow-policy-check.yml, smart-update.yml, syntax-check.yml, temporal-monitor.yml, unified-ci.yml, validate.yml, verified-publish-and-diagnostics.yml, version-health.yml, weekly-sovereign-loop.yml
- Proposal only: homey-zigbeedriver 2.2.17 -> 2.2.18 (runtime lib, kept on purpose; port useful fixes instead)
- Proposal only: zigbee-clusters ^2.6.0 -> 3.8.0 (runtime lib, kept on purpose; port useful fixes instead)
