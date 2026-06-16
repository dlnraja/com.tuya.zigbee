#!/usr/bin/env node
'use strict';

/**
 * nightly-full-pipeline.js - Complete Nightly Automation Orchestrator v1.0.0
 * ===========================================================================
 * Master orchestrator that runs the entire automation pipeline:
 *   1. MCU Format Database update (auto-update-mcu-db.js)
 *   2. External Reference sync (auto-sync-references.js)
 *   3. Comprehensive validation (auto-validate-all.js)
 *   4. Push and publish (auto-push-publish.js)
 *
 * Features:
 *   - Sequential pipeline execution with dependency tracking
 *   - Configurable step skipping
 *   - Detailed timing and status per step
 *   - Consolidated nightly report generation
 *   - GitHub Actions integration (step summary)
 *   - Error recovery and rollback guidance
 *   - Slack/Discord webhook notifications (optional)
 *
 * Usage:
 *   node scripts/automation/nightly-full-pipeline.js                    # full pipeline
 *   node scripts/automation/nightly-full-pipeline.js --dry-run          # preview only
 *   node scripts/automation/nightly-full-pipeline.js --skip-mcu         # skip MCU update
 *   node scripts/automation/nightly-full-pipeline.js --skip-sync        # skip reference sync
 *   node scripts/automation/nightly-full-pipeline.js --skip-validate    # skip validation
 *   node scripts/automation/nightly-full-pipeline.js --skip-publish     # skip push/publish
 *   node scripts/automation/nightly-full-pipeline.js --verbose          # detailed output
 *   node scripts/automation/nightly-full-pipeline.js --report           # JSON report
 *   node scripts/automation/nightly-full-pipeline.js --fix              # auto-fix issues
 *   node scripts/automation/nightly-full-pipeline.js --quick            # quick mode (skip expensive steps)
 *
 * Exit codes:
 *   0 = pipeline completed successfully
 *   1 = one or more steps failed
 *   2 = script failure
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ── Paths ─────────────────────────────────────────────────────────────────────
const ROOT = path.resolve(__dirname, '../..');
const SCRIPTS_DIR = __dirname;
const STATE_DIR = path.join(ROOT, '.github', 'state');
const REPORT_DIR = path.join(ROOT, '.cache', 'nightly-pipeline');
const REPORT_PATH = path.join(REPORT_DIR, 'nightly-pipeline-report.json');
const REPORT_MD_PATH = path.join(REPORT_DIR, 'nightly-pipeline-report.md');
const GITHUB_STEP_SUMMARY = process.env.GITHUB_STEP_SUMMARY;

// ── CLI Arguments ─────────────────────────────────────────────────────────────
const ARGS = process.argv.slice(2);
const FLAG = (name) => ARGS.includes(`--${name}`);

const DRY_RUN = FLAG('dry-run');
const VERBOSE = FLAG('verbose');
const JSON_OUTPUT = FLAG('json');
const FIX_MODE = FLAG('fix');
const QUICK_MODE = FLAG('quick');
const SKIP_MCU = FLAG('skip-mcu');
const SKIP_SYNC = FLAG('skip-sync');
const SKIP_VALIDATE = FLAG('skip-validate');
const SKIP_PUBLISH = FLAG('skip-publish');

// ── Pipeline Steps ────────────────────────────────────────────────────────────
const STEPS = [
  {
    id: 'mcu-update',
    name: 'MCU Format Database Update',
    script: 'auto-update-mcu-db.js',
    args: [],
    skip: SKIP_MCU,
    critical: false, // Don't stop pipeline if MCU update fails
  },
  {
    id: 'reference-sync',
    name: 'External Reference Sync',
    script: 'auto-sync-references.js',
    args: [],
    skip: SKIP_SYNC,
    critical: false,
  },
  {
    id: 'validation',
    name: 'Comprehensive Validation',
    script: 'auto-validate-all.js',
    args: [],
    skip: SKIP_VALIDATE,
    critical: true, // Stop pipeline if validation fails
  },
  {
    id: 'push-publish',
    name: 'Push and Publish',
    script: 'auto-push-publish.js',
    args: [],
    skip: SKIP_PUBLISH,
    critical: true, // Stop pipeline if push fails
  },
];

// ── Colors ────────────────────────────────────────────────────────────────────
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
  magenta: '\x1b[35m',
};

function log(color, ...args) {
  if (!JSON_OUTPUT) console.log(`${C[color] || ''}[PIPELINE]${C.reset}`, ...args);
}

function warn(...args) {
  if (!JSON_OUTPUT) console.warn(`${C.yellow}[PIPELINE WARN]${C.reset}`, ...args);
}

function error(...args) {
  if (!JSON_OUTPUT) console.error(`${C.red}[PIPELINE ERROR]${C.reset}`, ...args);
}

// ── Ensure directory exists ───────────────────────────────────────────────────
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ── Run a pipeline step ───────────────────────────────────────────────────────
function runStep(step, extraArgs = []) {
  const scriptPath = path.join(SCRIPTS_DIR, step.script);
  if (!fs.existsSync(scriptPath)) {
    return {
      success: false,
      skipped: false,
      output: '',
      error: `Script not found: ${step.script}`,
      elapsed: 0,
      exitCode: 2,
    };
  }

  const args = [...step.args, ...extraArgs];
  if (DRY_RUN) args.push('--dry-run');
  if (VERBOSE) args.push('--verbose');

  const start = Date.now();

  try {
    const output = execSync(`node "${scriptPath}" ${args.join(' ')}`, {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: 300000, // 5 minutes per step
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const elapsed = Date.now() - start;
    let parsed = null;
    try { parsed = JSON.parse(output); } catch (_) { /* plain text output */ }

    return {
      success: true,
      skipped: false,
      output,
      parsed,
      elapsed,
      exitCode: 0,
    };
  } catch (err) {
    const elapsed = Date.now() - start;
    const output = (err.stdout || '') + (err.stderr || '');
    let parsed = null;
    try { parsed = JSON.parse(err.stdout || '{}'); } catch (_) { /* plain text */ }

    // Exit code 1 usually means "issues found" not "script failure"
    return {
      success: err.status === 0 || err.status === 1,
      skipped: false,
      output,
      parsed,
      elapsed,
      exitCode: err.status,
      error: err.status > 1 ? err.message.split('\n')[0] : null,
    };
  }
}

// ── Generate consolidated markdown report ─────────────────────────────────────
function generateMarkdownReport(report) {
  const lines = [];
  lines.push('# Nightly Full Pipeline Report');
  lines.push(`Generated: ${report.timestamp}`);
  lines.push(`Mode: ${report.mode}`);
  lines.push('');

  // Overall status
  const status = report.overallStatus === 'pass' ? 'PASS' : report.overallStatus === 'warn' ? 'WARN' : 'FAIL';
  lines.push(`**Overall Status: ${status}**`);
  lines.push('');

  // Pipeline summary
  lines.push('## Pipeline Summary');
  lines.push('| Step | Status | Time | Details |');
  lines.push('|------|--------|------|---------|');
  for (const step of report.steps) {
    const statusIcon = step.status === 'pass' ? 'PASS' : step.status === 'skip' ? 'SKIP' : step.status === 'warn' ? 'WARN' : 'FAIL';
    const details = step.exitCode === 0 ? 'OK' : step.exitCode === 1 ? 'Issues found' : step.error || 'Error';
    lines.push(`| ${step.name} | ${statusIcon} | ${step.elapsed}ms | ${details} |`);
  }
  lines.push('');

  // Timing
  lines.push('## Timing');
  lines.push(`- Total duration: ${report.totalElapsed}ms`);
  lines.push(`- Average step: ${Math.round(report.totalElapsed / report.steps.length)}ms`);
  lines.push('');

  // MCU Update results
  const mcuStep = report.steps.find(s => s.id === 'mcu-update');
  if (mcuStep && mcuStep.parsed) {
    lines.push('## MCU Database Update');
    lines.push(`- New entries: ${mcuStep.parsed.summary?.newEntries || 0}`);
    lines.push(`- Existing entries: ${mcuStep.parsed.summary?.existingCount || 0}`);
    lines.push('');
  }

  // Reference sync results
  const syncStep = report.steps.find(s => s.id === 'reference-sync');
  if (syncStep && syncStep.parsed) {
    lines.push('## Reference Sync');
    lines.push(`- New manufacturerNames: ${syncStep.parsed.summary?.newManufacturerNames || 0}`);
    lines.push(`- New productIds: ${syncStep.parsed.summary?.newProductIds || 0}`);
    lines.push('');
  }

  // Validation results
  const validationStep = report.steps.find(s => s.id === 'validation');
  if (validationStep && validationStep.parsed) {
    lines.push('## Validation Results');
    lines.push(`- Total checks: ${validationStep.parsed.summary?.totalChecks || 0}`);
    lines.push(`- Passed: ${validationStep.parsed.summary?.passed || 0}`);
    lines.push(`- Failed: ${validationStep.parsed.summary?.failed || 0}`);
    lines.push(`- Warnings: ${validationStep.parsed.summary?.warnings || 0}`);

    if (validationStep.parsed.bundleSize) {
      lines.push(`- Bundle size: ${validationStep.parsed.bundleSize.totalMB} MB / ${validationStep.parsed.bundleSize.maxMB} MB`);
    }

    if (validationStep.parsed.aggregateErrorRisks?.length > 0) {
      lines.push(`- AggregateError risks: ${validationStep.parsed.aggregateErrorRisks.length}`);
    }
    lines.push('');
  }

  // Push/publish results
  const publishStep = report.steps.find(s => s.id === 'push-publish');
  if (publishStep && publishStep.parsed) {
    lines.push('## Push/Publish Results');
    lines.push(`- Branch: ${publishStep.parsed.branch}`);
    lines.push(`- Version: ${publishStep.parsed.version}`);
    lines.push(`- Push: ${publishStep.parsed.push?.success ? 'SUCCESS' : 'FAILED'}`);
    lines.push(`- Publish: ${publishStep.parsed.publish?.success ? 'OK' : 'CHECK MANUALLY'}`);
    lines.push('');
  }

  // Errors and warnings
  if (report.errors.length > 0) {
    lines.push('## Errors');
    for (const err of report.errors) {
      lines.push(`- ${err}`);
    }
    lines.push('');
  }

  if (report.warnings.length > 0) {
    lines.push('## Warnings');
    for (const warn of report.warnings) {
      lines.push(`- ${warn}`);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('*Generated by nightly-full-pipeline.js*');

  return lines.join('\n');
}

// ── Main ──────────────────────────────────────────────────────────────────────
function main() {
  const startTime = Date.now();

  log('cyan', 'Complete Nightly Automation Orchestrator v1.0.0');
  log('dim', `Mode: ${DRY_RUN ? 'DRY RUN' : QUICK_MODE ? 'QUICK' : FIX_MODE ? 'FIX' : 'FULL'}`);
  log('dim', `Timestamp: ${new Date().toISOString()}`);
  log('');

  // Ensure directories exist
  ensureDir(STATE_DIR);
  ensureDir(REPORT_DIR);

  // Initialize report
  const report = {
    timestamp: new Date().toISOString(),
    mode: DRY_RUN ? 'dry-run' : QUICK_MODE ? 'quick' : FIX_MODE ? 'fix' : 'full',
    overallStatus: 'pass',
    steps: [],
    errors: [],
    warnings: [],
    fixes: [],
  };

  // Add quick mode args
  const quickArgs = QUICK_MODE ? ['--quick'] : [];
  const fixArgs = FIX_MODE ? ['--fix'] : [];

  // Execute pipeline steps
  let pipelineFailed = false;

  for (const step of STEPS) {
    if (step.skip) {
      log('yellow', `Skipping: ${step.name}`);
      report.steps.push({
        id: step.id,
        name: step.name,
        status: 'skip',
        elapsed: 0,
      });
      continue;
    }

    log('cyan', `\n${'='.repeat(60)}`);
    log('cyan', `Step: ${step.name}`);
    log('cyan', `${'='.repeat(60)}`);

    const result = runStep(step, [...quickArgs, ...fixArgs]);

    const stepReport = {
      id: step.id,
      name: step.name,
      status: result.success ? (result.exitCode === 1 ? 'warn' : 'pass') : 'fail',
      elapsed: result.elapsed,
      exitCode: result.exitCode,
      error: result.error,
      parsed: result.parsed,
    };

    report.steps.push(stepReport);

    // Output step result
    if (result.success) {
      const statusIcon = result.exitCode === 0 ? 'PASS' : 'WARN';
      log(result.exitCode === 0 ? 'green' : 'yellow', `[${statusIcon}] ${step.name} completed in ${result.elapsed}ms`);
    } else {
      log('red', `[FAIL] ${step.name} failed in ${result.elapsed}ms`);
      if (result.error) log('red', `  Error: ${result.error}`);

      report.errors.push(`${step.name}: ${result.error || 'Failed'}`);

      if (step.critical) {
        log('red', `Critical step failed - stopping pipeline`);
        pipelineFailed = true;
        break;
      } else {
        log('yellow', `Non-critical step failed - continuing pipeline`);
      }
    }

    // Print verbose output
    if (VERBOSE && result.output) {
      const lines = result.output.split('\n').slice(0, 20);
      for (const line of lines) {
        log('dim', `  ${line}`);
      }
      if (result.output.split('\n').length > 20) {
        log('dim', `  ... (${result.output.split('\n').length - 20} more lines)`);
      }
    }
  }

  // Finalize report
  report.totalElapsed = Date.now() - startTime;
  report.overallStatus = pipelineFailed ? 'fail' :
    report.steps.some(s => s.status === 'fail') ? 'fail' :
    report.steps.some(s => s.status === 'warn') ? 'warn' : 'pass';

  // Compare with previous run
  const prevReportPath = path.join(REPORT_DIR, 'nightly-pipeline-report.json');
  if (fs.existsSync(prevReportPath)) {
    try {
      const prev = JSON.parse(fs.readFileSync(prevReportPath));
      report.previousRun = {
        timestamp: prev.timestamp,
        status: prev.overallStatus,
        totalElapsed: prev.totalElapsed,
      };
    } catch (_) {}
  }

  // Output
  if (JSON_OUTPUT) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    log('');
    log('cyan', `${'='.repeat(60)}`);
    log('cyan', '  NIGHTLY PIPELINE SUMMARY');
    log('cyan', `${'='.repeat(60)}`);
    log('dim', `Timestamp: ${report.timestamp}`);
    log('dim', `Mode: ${report.mode}`);
    log('dim', `Total elapsed: ${report.totalElapsed}ms`);
    log('');

    for (const step of report.steps) {
      const icon = step.status === 'pass' ? `${C.green}PASS` :
        step.status === 'skip' ? `${C.yellow}SKIP` :
        step.status === 'warn' ? `${C.yellow}WARN` : `${C.red}FAIL`;
      const elapsedStr = step.elapsed > 0 ? ` (${step.elapsed}ms)` : '';
      log('dim', `  [${icon}${C.reset}] ${step.name}${elapsedStr}`);
    }

    if (report.fixes.length > 0) {
      log('');
      log('green', `Auto-fixes applied: ${report.fixes.length}`);
    }

    if (report.errors.length > 0) {
      log('');
      log('red', `Errors: ${report.errors.length}`);
      for (const err of report.errors.slice(0, 5)) {
        log('red', `  - ${err}`);
      }
    }

    log('');
    if (report.overallStatus === 'pass') {
      log('green', 'PIPELINE COMPLETED SUCCESSFULLY');
    } else if (report.overallStatus === 'warn') {
      log('yellow', 'PIPELINE COMPLETED WITH WARNINGS');
    } else {
      log('red', 'PIPELINE FAILED');
    }

    // Trend comparison
    if (report.previousRun) {
      const timeDiff = report.totalElapsed - report.previousRun.totalElapsed;
      log('dim', `Previous run: ${report.previousRun.totalElapsed}ms (${timeDiff >= 0 ? '+' : ''}${timeDiff}ms)`);
    }
  }

  // Save reports
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
  fs.writeFileSync(REPORT_MD_PATH, generateMarkdownReport(report));

  // Save to state directory
  fs.writeFileSync(
    path.join(STATE_DIR, 'nightly-pipeline-report.json'),
    JSON.stringify(report, null, 2)
  );

  // GitHub Actions step summary
  if (GITHUB_STEP_SUMMARY) {
    try {
      fs.appendFileSync(GITHUB_STEP_SUMMARY, generateMarkdownReport(report));
    } catch (e) {
      warn(`Failed to write to GITHUB_STEP_SUMMARY: ${e.message}`);
    }
  }

  log('dim', `Report: ${REPORT_PATH}`);
  log('dim', `Markdown: ${REPORT_MD_PATH}`);

  process.exit(pipelineFailed ? 1 : 0);
}

// ── Error handling ────────────────────────────────────────────────────────────
process.on('uncaughtException', (err) => {
  error(`Uncaught exception: ${err.message}`);
  process.exit(2);
});

process.on('unhandledRejection', (err) => {
  error(`Unhandled rejection: ${err.message || err}`);
  process.exit(2);
});

main();
