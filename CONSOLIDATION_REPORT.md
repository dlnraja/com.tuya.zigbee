# 🇺‌🇳‌🇮‌🇫‌🇮‌🇪‌🇩‌ ‌🇨‌🇴‌🇳‌🇸‌🇴‌🇱‌🇮‌🇩‌🇦‌🇹‌🇮‌🇴‌🇳‌ ‌🇷‌🇪‌🇵‌🇴‌🇷‌🇹‌ — v8.5.0

## Summary
- **Total workflows before**: 60
- **Total workflows after**: 15 (kept) + 45 (disabled but preserved)
- **Reduction**: 75% reduction in active workflows

## 🟢 KEPT Workflows (15)
- `auto-close-supported.yml`
- `auto-reopen-on-comment.yml`
- `bug-report-auto-pr.yml`
- `dependabot-auto-merge.yml`
- `deploy-pages.yml`
- `gmail-diagnostics.yml`
- `gmail-token-keepalive.yml`
- `labeler.yml`
- `notifications.yml`
- `publish-stable.yml`
- `publish.yml`
- `smart-pr-merge.yml`
- `stale.yml`
- `syntax-purity-gate.yml`
- `unified-ci.yml`

## 🔴 DISABLED Workflows (45)
- `auto-discovery.yml`
- `auto-publish-on-push.yml`
- `check-invalid-paths.yml`
- `code-quality.yml`
- `collect-diagnostics.yml`
- `comprehensive-auto-validation.yml`
- `daily-everything.yml`
- `daily-maintenance.yml`
- `daily-promote-to-test.yml`
- `diagnostic-anonymizer.yml`
- `draft-to-test.yml`
- `driver-maintenance.yml`
- `enrich-drivers.yml`
- `fleet-intelligence.yml`
- `github-auto-manage.yml`
- `issue-crossref.yml`
- `johan-sdk3-sync.yml`
- `master-cicd.yml`
- `monthly-api-discovery.yml`
- `monthly-community-sync.yml`
- `monthly-comprehensive-sync.yml`
- `monthly-device-enrichment.yml`
- `monthly-enrichment.yml`
- `monthly-irdb-sync.yml`
- `monthly-scan.yml`
- `monthly-tuya-intelligence.yml`
- `nightly-auto-process.yml`
- `secure-diagnostics.yml`
- `sunday-master.yml`
- `sync-changelog-readme.yml`
- `sync-johan.yml`
- `syntax-check.yml`
- `syntax-validation.yml`
- `test-api-keys.yml`
- `tuya-automation-hub.yml`
- `tuya-deep-diag.yml`
- `unified-intelligence.yml`
- `unified-maintenance.yml`
- `upstream-auto-triage.yml (already disabled)`
- `validate-drivers.yml`
- `validate.yml`
- `verified-publish-and-diagnostics.yml`
- `weekly-external-sync.yml`
- `weekly-fingerprint-sync.yml`
- `weekly-verification.yml`

## Rationale
The original 63 workflows had massive redundancy:
- Multiple workflows doing the same validation (validate.yml, syntax-check.yml, syntax-validation.yml, syntax-purity-gate.yml, comprehensive-auto-validation.yml, code-quality.yml, master-cicd.yml)
- Multiple workflows doing the same publishing (auto-publish-on-push.yml, publish.yml, daily-everything.yml)
- Multiple workflows doing the same sync (monthly-community-sync.yml, monthly-comprehensive-sync.yml, sync-johan.yml, johan-sdk3-sync.yml)
- Single-purpose workflows better consolidated into unified-ci.yml (driver-maintenance.yml, fleet-intelligence.yml, etc.)

All disabled workflows are preserved with 'if: false' and can be re-enabled by removing that line.
