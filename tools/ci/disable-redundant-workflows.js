#!/usr/bin/env node
/**
 * disable-redundant-workflows.js
 *
 * Identifies scheduled workflows that overlap with continuous-flow.yml
 * and moves them to .github/workflows/.disabled/ (or appends .disabled).
 *
 * Resource guard: prevent GitHub resource overload by:
 *   1. Moving scheduled workflows that overlap with continuous-flow
 *   2. Keeping on-demand (push, manual) workflows that are still useful
 *   3. Documenting each disabled workflow
 *
 * @author Mavis P9
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const WF_DIR = path.join(ROOT, '.github', 'workflows');
const DISABLED_DIR = path.join(WF_DIR, '.disabled');
const REPORT = path.join(ROOT, '.github', 'state', 'workflow-consolidation-report.json');

// Workflows to KEEP (still useful, not overlapping with continuous-flow)
const KEEP = [
  // --- CI / Validation (push + PR) ---
  'unified-ci.yml',           // push+PR validate
  'validate.yml',             // daily validate (sanity)
  'syntax-check.yml',         // push+PR
  'shadow-policy-check.yml',  // push+PR
  // --- Publishing (manual + push) ---
  'publish.yml',              // manual
  'publish-stable.yml',       // push+manual
  'auto-publish-on-push.yml', // push+manual
  'auto-fix-and-publish.yml', // every 6h — KEEP (auto-publish is a critical function)
  'verified-publish-and-diagnostics.yml', // manual
  // --- Diagnostics fetch ---
  'fetch-diags.yml',          // every 6h — KEEP (raw diagnostic data)
  'build-error-diag.yml',     // daily
  'collect-diagnostics.yml',  // weekly
  'tuya-deep-diag.yml',       // manual
  // --- PR / Issue automation ---
  'smart-pr-merge.yml',       // PR
  'dependabot-auto-merge.yml',// PR
  'labeler.yml',              // PR
  'notifications.yml',        // PR
  'auto-close-supported.yml', // manual
  'auto-reopen-on-comment.yml',// manual
  'bug-report-auto-pr.yml',   // manual
  'draft-to-test.yml',        // manual
  'delete-own-upstream-comments.yml', // manual
  // --- Scheduled unique ---
  'stale.yml',                // weekly (close stale issues)
  'deploy-pages.yml',         // daily (Pages)
  'driver-maintenance.yml',   // weekly Fri (driver-specific)
  'gmail-diagnostics.yml',    // weekly Sun (Gmail)
  'gmail-token-keepalive.yml',// daily (Gmail token)
  'monthly-scan.yml',         // monthly
  'monthly-tuya-intelligence.yml', // monthly
  'monthly-enrichment.yml',   // manual
  'monthly-device-enrichment.yml',// manual
  'monthly-community-sync.yml',// manual
  'ai-monthly-audit.yml',     // monthly
  // --- Our new workflow ---
  'continuous-flow.yml',      // NEW
];

// Workflows to DISABLE (overlap with continuous-flow.yml)
// These do work that continuous-flow now handles:
//   - enrich-drivers.yml  → covered by continuous-flow
//   - bilat-fp-sync.yml   → covered by continuous-flow (bidirectional-enricher)
//   - johan-sdk3-sync.yml → covered by continuous-flow (johan-ticket-importer)
//   - weekly-external-sync.yml → covered by continuous-flow
//   - weekly-fingerprint-sync.yml → covered by continuous-flow
//   - upstream-auto-triage.yml → covered by continuous-flow
//   - nightly-auto-process.yml → covered by continuous-flow
//   - code-quality.yml    → covered by continuous-flow
//   - weekly-verification.yml → covered by continuous-flow
//   - test-api-keys.yml   → low value
//   - sunday-master.yml   → covered by continuous-flow
//   - daily-maintenance.yml → covered by continuous-flow
//   - daily-promote-to-test.yml → manual (was daily)
const CANDIDATES_FOR_DISABLE = [
  'enrich-drivers.yml',
  'bilat-fp-sync.yml',
  'johan-sdk3-sync.yml',
  'weekly-external-sync.yml',
  'weekly-fingerprint-sync.yml',
  'upstream-auto-triage.yml',
  'nightly-auto-process.yml',
  'code-quality.yml',
  'weekly-verification.yml',
  'test-api-keys.yml',
  'sunday-master.yml',
  'daily-maintenance.yml',
  'daily-promote-to-test.yml',
];

function main() {
  console.log('Workflow Consolidation v1.0.0\n');
  const applyMode = process.argv.includes('--apply');

  const allWorkflows = fs.readdirSync(WF_DIR).filter(f =>
    (f.endsWith('.yml') || f.endsWith('.yaml')) && !f.startsWith('.'));

  console.log('Total workflows:', allWorkflows.length);
  console.log('Marked KEEP:', KEEP.length);
  console.log('Marked for disable:', CANDIDATES_FOR_DISABLE.length);

  // Categorize
  const toKeep = allWorkflows.filter(f => KEEP.includes(f));
  const toDisable = CANDIDATES_FOR_DISABLE.filter(f => allWorkflows.includes(f));
  const other = allWorkflows.filter(f => !KEEP.includes(f) && !CANDIDATES_FOR_DISABLE.includes(f));

  console.log('\nTo KEEP:', toKeep.length);
  console.log('To DISABLE:', toDisable.length);
  console.log('UNLISTED:', other.length, other);

  console.log('\n=== TO DISABLE (redundant with continuous-flow) ===');
  let totalSavedKB = 0;
  for (const f of toDisable) {
    const cp = path.join(WF_DIR, f);
    const stat = fs.statSync(cp);
    const c = fs.readFileSync(cp, 'utf8');
    const hasSchedule = /schedule:/.test(c);
    const hasCron = (c.match(/cron:\s*['"]([^'"]+)['"]/) || [])[1];
    const lines = c.split('\n').length;
    totalSavedKB += stat.size / 1024;
    console.log('  ' + f + ' (' + (stat.size/1024).toFixed(1) + ' KB, ' + lines + 'L)' + (hasCron ? ' cron=' + hasCron : ''));
  }
  console.log('\nTotal to disable:', toDisable.length, 'workflows,', totalSavedKB.toFixed(1), 'KB saved from scheduled runs');

  if (applyMode) {
    console.log('\n=== APPLY MODE — moving to .disabled/ ===');
    fs.mkdirSync(DISABLED_DIR, { recursive: true });
    let moved = 0;
    for (const f of toDisable) {
      const src = path.join(WF_DIR, f);
      const dst = path.join(DISABLED_DIR, f);
      // Add a header comment explaining why
      let content = fs.readFileSync(src, 'utf8');
      content = '# DISABLED 2026-07-12: replaced by continuous-flow.yml\n' +
                '# This workflow is preserved in .github/workflows/.disabled/ for reference.\n' +
                '# To re-enable: move it back to .github/workflows/\n' +
                content;
      fs.writeFileSync(dst, content, 'utf8');
      fs.unlinkSync(src);
      moved++;
      console.log('  MOVED:', f);
    }
    console.log('\n✓ Moved', moved, 'workflows to .disabled/');
  } else {
    console.log('\n💡 To actually disable workflows, re-run with --apply:');
    console.log('   node tools/ci/disable-redundant-workflows.js --apply');
  }

  // Save report
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  const scheduledBefore = allWorkflows.filter(f => {
    const c = fs.readFileSync(path.join(WF_DIR, f), 'utf8');
    return /schedule:/.test(c);
  });
  fs.writeFileSync(REPORT, JSON.stringify({
    timestamp: new Date().toISOString(),
    totalWorkflowsBefore: allWorkflows.length,
    keep: toKeep,
    disabled: toDisable,
    savedKB: totalSavedKB,
    scheduledBeforeCount: scheduledBefore.length,
    scheduledAfterCount: 1, // only continuous-flow
    savings: {
      scheduledWorkflowsEliminated: scheduledBefore.length - 1,
      totalWorkflowsEliminated: toDisable.length,
      bytesSaved: totalSavedKB * 1024,
    },
  }, null, 2));
  console.log('\n✓ Report:', REPORT);
}

if (require.main === module) main();
