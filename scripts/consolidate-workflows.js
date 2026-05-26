#!/usr/bin/env node
/**
 * 🇺‌🇳‌🇮‌🇫‌🇮‌🇪‌🇩‌ ‌🇨‌🇴‌🇳‌🇸‌🇴‌🇱‌🇮‌🇩‌🇦‌🇹‌🇮‌🇴‌🇳‌ ‌🇪‌🇳‌🇬‌🇮‌🇳‌🇪‌ — v8.5.0
 * 
 * Consolidates 63 redundant workflows down to ~15 essential ones.
 * 
 * CRITICAL: This script uses `if: false` to disable workflows rather than 
 * deleting them, preserving history and allowing easy re-activation.
 *
 * Kept workflows:
 *   1. unified-ci.yml           🛡️ Unified CI/CD (primary)
 *   2. publish.yml              🚀 Publish master
 *   3. publish-stable.yml       🚀 Publish stable-v5
 *   4. syntax-purity-gate.yml   🛡️ Syntax purity
 *   5. dependabot-auto-merge.yml 📦 Dependency auto-merge
 *   6. deploy-pages.yml         📄 GitHub Pages
 *   7. stale.yml                ⏰ Stale issue management
 *   8. labeler.yml              🏷️ Auto-label PRs
 *   9. gmail-diagnostics.yml    📧 Email diagnostics
 *   10. gmail-token-keepalive.yml 🔄 IMAP health
 *   11. smart-pr-merge.yml      🤖 Smart PR merge
 *   12. auto-close-supported.yml 📋 Batch close supported
 *   13. auto-reopen-on-comment.yml ↩️ Reopen on comment
 *   14. bug-report-auto-pr.yml  🐛 Bug report auto-PR
 *   15. notifications.yml       🔔 Notifications
 *
 * DISABLED (redundant): auto-publish-on-push, auto-discovery, check-invalid-paths,
 *   code-quality, collect-diagnostics, comprehensive-auto-validation, daily-everything,
 *   daily-maintenance, daily-promote-to-test, diagnostic-anonymizer, draft-to-test,
 *   driver-maintenance, enrich-drivers, fleet-intelligence, github-auto-manage,
 *   issue-crossref, johan-sdk3-sync, master-cicd, monthly-api-discovery,
 *   monthly-community-sync, monthly-comprehensive-sync, monthly-device-enrichment,
 *   monthly-enrichment, monthly-irdb-sync, monthly-scan, monthly-tuya-intelligence,
 *   nightly-auto-process, secure-diagnostics, sync-changelog-readme, sync-johan,
 *   sunday-master, syntax-check, syntax-validation, test-api-keys, tuya-automation-hub,
 *   tuya-deep-diag, unified-intelligence, unified-maintenance, upstream-auto-triage,
 *   validate-drivers, validate, verified-publish-and-diagnostics, weekly-external-sync,
 *   weekly-fingerprint-sync, weekly-verification
 */

const fs = require('fs');
const path = require('path');

const WORKFLOWS_DIR = path.join(__dirname, '..', '.github', 'workflows');

// Workflows to KEEP (not modify)
const KEEP_LIST = new Set([
  'unified-ci.yml',
  'publish.yml',
  'publish-stable.yml',
  'syntax-purity-gate.yml',
  'dependabot-auto-merge.yml',
  'deploy-pages.yml',
  'stale.yml',
  'labeler.yml',
  'gmail-diagnostics.yml',
  'gmail-token-keepalive.yml',
  'smart-pr-merge.yml',
  'auto-close-supported.yml',
  'auto-reopen-on-comment.yml',
  'bug-report-auto-pr.yml',
  'notifications.yml',
]);

// These had extra .gitkeep — leave them alone
const SKIP_FILES = new Set(['.gitkeep']);

/**
 * Disable a workflow by adding `if: false` to the workflow-level trigger
 * (not just job-level), which prevents the workflow from even being scheduled.
 */
function disableWorkflow(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Already disabled?
  if (content.includes('if: false') || content.includes("if: 'false'")) {
    console.log(`  ⏭️  Already disabled: ${path.basename(filePath)}`);
    return false;
  }
  
  // Add a comment at the top + disable trigger
  const headerComment = `# 🇺‌🇳‌🇮‌🇫‌🇮‌🇪‌🇩‌ ‌🇨‌🇴‌🇳‌🇸‌🇴‌🇱‌🇮‌🇩‌🇦‌🇹‌🇮‌🇴‌🇳‌ ‌🇻‌8‌.‌5‌.‌0‌ — DISABLED (redundant)\n# Re-enable by removing 'if: false' below\n`;
  
  // Inject `if: false` right after `on:` block
  content = content.replace(
    /^on:/m,
    `if: false\non:`
  );
  
  // If there's a top-level name, add comment before it
  if (!content.startsWith('#')) {
    content = headerComment + content;
  }
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`  ✅ Disabled: ${path.basename(filePath)}`);
  return true;
}

/**
 * Generate a summary report
 */
function generateReport(kept, disabled) {
  const report = `# 🇺‌🇳‌🇮‌🇫‌🇮‌🇪‌🇩‌ ‌🇨‌🇴‌🇳‌🇸‌🇴‌🇱‌🇮‌🇩‌🇦‌🇹‌🇮‌🇴‌🇳‌ ‌🇷‌🇪‌🇵‌🇴‌🇷‌🇹‌ — v8.5.0

## Summary
- **Total workflows before**: ${kept.length + disabled.length}
- **Total workflows after**: ${kept.length} (kept) + ${disabled.length} (disabled but preserved)
- **Reduction**: ${((disabled.length / (kept.length + disabled.length)) * 100).toFixed(0)}% reduction in active workflows

## 🟢 KEPT Workflows (${kept.length})
${kept.map(f => `- \`${f}\``).join('\n')}

## 🔴 DISABLED Workflows (${disabled.length})
${disabled.map(f => `- \`${f}\``).join('\n')}

## Rationale
The original 63 workflows had massive redundancy:
- Multiple workflows doing the same validation (validate.yml, syntax-check.yml, syntax-validation.yml, syntax-purity-gate.yml, comprehensive-auto-validation.yml, code-quality.yml, master-cicd.yml)
- Multiple workflows doing the same publishing (auto-publish-on-push.yml, publish.yml, daily-everything.yml)
- Multiple workflows doing the same sync (monthly-community-sync.yml, monthly-comprehensive-sync.yml, sync-johan.yml, johan-sdk3-sync.yml)
- Single-purpose workflows better consolidated into unified-ci.yml (driver-maintenance.yml, fleet-intelligence.yml, etc.)

All disabled workflows are preserved with 'if: false' and can be re-enabled by removing that line.
`;

  const reportPath = path.join(__dirname, '..', 'CONSOLIDATION_REPORT.md');
  fs.writeFileSync(reportPath, report, 'utf8');
  console.log(`\n📄 Report written to: CONSOLIDATION_REPORT.md`);
}

// --- MAIN ---
function main() {
  if (!fs.existsSync(WORKFLOWS_DIR)) {
    console.error(`❌ Workflows directory not found: ${WORKFLOWS_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(WORKFLOWS_DIR).filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));
  
  console.log(`\n🔍 Found ${files.length} workflow files\n`);

  const kept = [];
  const disabled = [];

  for (const file of files) {
    const filePath = path.join(WORKFLOWS_DIR, file);
    
    if (SKIP_FILES.has(file)) {
      console.log(`  ⏭️  Skipping: ${file}`);
      continue;
    }

    if (KEEP_LIST.has(file)) {
      console.log(`  🟢 Keeping: ${file}`);
      kept.push(file);
    } else {
      const wasDisabled = disableWorkflow(filePath);
      if (wasDisabled) {
        disabled.push(file);
      } else {
        disabled.push(file + ' (already disabled)');
      }
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`  Kept: ${kept.length}`);
  console.log(`  Disabled: ${disabled.length}`);
  console.log(`  Total: ${kept.length + disabled.length}`);

  generateReport(kept, disabled);
}

main();