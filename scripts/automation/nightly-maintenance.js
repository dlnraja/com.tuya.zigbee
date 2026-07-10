#!/usr/bin/env node
/**
 * nightly-maintenance.js - Comprehensive Nightly Maintenance Orchestrator
 * Run: node scripts/automation/nightly-maintenance.js [--json] [--fix] [--quick]
 *
 * Orchestrates all health checks, detects changes, auto-fixes issues, and
 * generates a consolidated nightly report.
 *
 * Runs:
 * 1. Change detection (change-detector.js)
 * 2. Fingerprint diff (fingerprint-diff.js)
 * 3. Driver health check (driver-health.js)
 * 4. Dependency check (dep-check.js)
 * 5. Performance monitor (perf-monitor.js)
 *
 * Auto-fix mode (--fix):
 * - Runs driver-health with --fix
 * - Fixes empty manufacturer/productId entries
 * - Fixes common JSON formatting issues
 *
 * Quick mode (--quick):
 * - Skips expensive checks (git log, perf monitoring)
 * - Only runs driver health + dep check
 *
 * Output:
 * - .github/state/nightly-report.json (machine-readable)
 * - .github/state/nightly-report.md (human-readable summary)
 * - Console output with pass/fail status per check
 *
 * Exit codes: 0 = all clean, 1 = issues found, 2 = script failure
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const SCRIPTS_DIR = __dirname;
const STATE_DIR = path.join(ROOT, '.github', 'state');
const REPORT_JSON = path.join(STATE_DIR, 'nightly-report.json');
const REPORT_MD = path.join(STATE_DIR, 'nightly-report.md');
const PREV_REPORT = path.join(STATE_DIR, 'nightly-report.json');

const JSON_OUTPUT = process.argv.includes('--json');
const FIX_MODE = process.argv.includes('--fix');
const QUICK_MODE = process.argv.includes('--quick');

function log(msg) {
  if (!JSON_OUTPUT) console.log('[NIGHTLY] ' + msg);
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ── Run a sub-script and capture output ─────────────────────────────────────
function runScript(scriptName, extraArgs = []) {
  const scriptPath = path.join(SCRIPTS_DIR, scriptName);
  if (!fs.existsSync(scriptPath)) {
    return { success: false, output: '', error: `Script not found: ${scriptName}`, elapsed: 0 };
  }

  const args = ['--json', ...extraArgs];
  const start = Date.now();

  try {
    const output = execSync(`node "${scriptPath}" ${args.join(' ')}`, {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: 120000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const elapsed = Date.now() - start;
    let parsed = null;
    try { parsed = JSON.parse(output); } catch (_) { /* plain text output */ }
    return { success: true, output, parsed, elapsed };
  } catch (e) {
    const elapsed = Date.now() - start;
    // Exit code 1 usually means "issues found" not "script failure"
    const output = (e.stdout || '') + (e.stderr || '');
    let parsed = null;
    try { parsed = JSON.parse(e.stdout || '{}'); } catch (_) { /* plain text */ }
    return {
      success: e.status === 0 || e.status === 1,
      exitCode: e.status,
      output,
      parsed,
      elapsed,
      error: e.status > 1 ? e.message.split('\n')[0] : null,
    };
  }
}

// ── Quick health checks (no external scripts) ───────────────────────────────
function quickChecks() {
  const results = {
    syntaxCheck: { passed: 0, failed: 0, errors: [] },
    jsonValidation: { passed: 0, failed: 0, errors: [] },
    memoryCheck: { heapUsed: 0, rss: 0 },
  };

  // Syntax check key files
  const keyFiles = [
    'app.js',
    'lib/tuya/TuyaZigbeeDevice.js',
    'lib/devices/BaseHybridDevice.js',
  ];

  for (const file of keyFiles) {
    const fullPath = path.join(ROOT, file);
    if (!fs.existsSync(fullPath)) continue;
    try {
      execSync(`node --check "${fullPath}"`, { cwd: ROOT, stdio: 'pipe', timeout: 10000 });
      results.syntaxCheck.passed++;
    } catch (e) {
      results.syntaxCheck.failed++;
      results.syntaxCheck.errors.push(file);
    }
  }

  // Validate all driver.compose.json files
  const driversDir = path.join(ROOT, 'drivers');
  if (fs.existsSync(driversDir)) {
    for (const name of fs.readdirSync(driversDir)) {
      const dcj = path.join(driversDir, name, 'driver.compose.json');
      if (!fs.existsSync(dcj)) continue;
      try {
        JSON.parse(fs.readFileSync(dcj));
        results.jsonValidation.passed++;
      } catch (e) {
        results.jsonValidation.failed++;
        results.jsonValidation.errors.push(name);
      }
    }
  }

  // Memory check
  if (global.gc) global.gc();
  const mem = process.memoryUsage();
  results.memoryCheck.heapUsed = mem.heapUsed;
  results.memoryCheck.rss = mem.rss;

  return results;
}

// ── Auto-fix known issues ───────────────────────────────────────────────────
function autoFix() {
  const fixes = [];
  const driversDir = path.join(ROOT, 'drivers');

  if (!fs.existsSync(driversDir)) return fixes;

  for (const name of fs.readdirSync(driversDir)) {
    const dcjPath = path.join(driversDir, name, 'driver.compose.json');
    if (!fs.existsSync(dcjPath)) continue;

    try {
      const raw = fs.readFileSync(dcjPath, 'utf8');
      const config = JSON.parse(raw);
      let changed = false;

      // Fix: Remove empty manufacturerName entries
      if (config.zigbee?.manufacturerName) {
        const origLen = config.zigbee.manufacturerName.length;
        config.zigbee.manufacturerName = config.zigbee.manufacturerName.filter(
          m => m && typeof m === 'string' && m.trim() !== ''
        );
        if (config.zigbee.manufacturerName.length < origLen) {
          fixes.push(`${name}: Removed ${origLen - config.zigbee.manufacturerName.length} empty manufacturerName entries`);
          changed = true;
        }
      }

      // Fix: Remove empty productId entries
      if (config.zigbee?.productId) {
        const origLen = config.zigbee.productId.length;
        config.zigbee.productId = config.zigbee.productId.filter(
          p => p && typeof p === 'string' && p.trim() !== ''
        );
        if (config.zigbee.productId.length < origLen) {
          fixes.push(`${name}: Removed ${origLen - config.zigbee.productId.length} empty productId entries`);
          changed = true;
        }
      }

      // Fix: Ensure consistent JSON formatting (normalize to 2-space indent)
      if (changed) {
        const normalized = JSON.stringify(config, null, 2) + '\n';
        if (normalized !== raw) {
          fs.writeFileSync(dcjPath, normalized);
        }
      }
    } catch (_) { /* skip broken JSON - driver-health will catch it */ }
  }

  return fixes;
}

// ── Generate markdown report ────────────────────────────────────────────────
function generateMarkdown(report) {
  const lines = [];
  lines.push('# Nightly Maintenance Report');
  lines.push(`Generated: ${report.timestamp}`);
  lines.push('');

  // Overall status
  const statusIcon = report.overallStatus === 'pass' ? 'PASS' : 'ISSUES FOUND';
  lines.push(`**Overall Status: ${statusIcon}**`);
  lines.push('');

  // Summary table
  lines.push('## Summary');
  lines.push('| Check | Status | Time |');
  lines.push('|-------|--------|------|');
  for (const check of report.checks) {
    const status = check.status === 'pass' ? 'PASS' : check.status === 'warn' ? 'WARN' : 'FAIL';
    lines.push(`| ${check.name} | ${status} | ${check.elapsed}ms |`);
  }
  lines.push('');

  // Fixes applied
  if (report.fixes && report.fixes.length > 0) {
    lines.push('## Auto-Fixes Applied');
    for (const fix of report.fixes) {
      lines.push(`- ${fix}`);
    }
    lines.push('');
  }

  // Change detection summary
  if (report.results?.changeDetection) {
    const cd = report.results.changeDetection;
    lines.push('## Changes Detected');
    lines.push(`- Commits: ${cd.commitsAnalyzed || 0}`);
    lines.push(`- New drivers: ${cd.newDriverCount || 0}`);
    lines.push(`- New Z2M manufacturers: ${cd.externalManufacturers?.z2m?.new || 0}`);
    lines.push(`- New ZHA manufacturers: ${cd.externalManufacturers?.zha?.new || 0}`);
    lines.push('');
  }

  // Driver health summary
  if (report.results?.driverHealth) {
    const dh = report.results.driverHealth;
    lines.push('## Driver Health');
    lines.push(`- Total drivers: ${dh.totalDrivers || 0}`);
    lines.push(`- Fleet average score: ${dh.fleetHealth?.averageScore || 'N/A'}`);
    lines.push(`- Healthy (>=80): ${dh.fleetHealth?.healthy || 0}`);
    lines.push(`- Warning (50-79): ${dh.fleetHealth?.warning || 0}`);
    lines.push(`- Critical (<50): ${dh.fleetHealth?.critical || 0}`);
    lines.push(`- Errors: ${dh.totalErrors || 0}`);
    lines.push(`- Warnings: ${dh.totalWarnings || 0}`);
    lines.push('');
  }

  // Dependency check summary
  if (report.results?.depCheck) {
    const dc = report.results.depCheck;
    lines.push('## Dependencies');
    lines.push(`- Missing require() paths: ${dc.missingRequires?.length || 0}`);
    lines.push(`- Circular dependencies: ${dc.circularDependencies?.length || 0}`);
    lines.push(`- Missing npm packages: ${dc.packageJson?.missingInstalled?.length || 0}`);
    lines.push('');
  }

  // Performance summary
  if (report.results?.performance) {
    const pf = report.results.performance;
    lines.push('## Performance');
    lines.push(`- Memory used: ${pf.memory?.end || 'N/A'}`);
    lines.push(`- Bundle size: ${pf.bundle?.projectSizeMB || 'N/A'} MB`);
    lines.push(`- Optimization suggestions: ${pf.suggestions?.length || 0}`);
    if (pf.suggestions && pf.suggestions.length > 0) {
      for (const s of pf.suggestions.slice(0, 5)) {
        lines.push(`  - [${s.priority}] ${s.message}`);
      }
    }
    lines.push('');
  }

  // Quick checks summary
  if (report.results?.quickChecks) {
    const qc = report.results.quickChecks;
    lines.push('## Quick Checks');
    lines.push(`- Syntax: ${qc.syntaxCheck?.passed} passed, ${qc.syntaxCheck?.failed} failed`);
    lines.push(`- JSON validation: ${qc.jsonValidation?.passed} passed, ${qc.jsonValidation?.failed} failed`);
    lines.push('');
  }

  lines.push('---');
  lines.push('*Generated by nightly-maintenance.js*');

  return lines.join('\n');
}

// ── Load previous report for comparison ─────────────────────────────────────
function loadPreviousReport() {
  try {
    return JSON.parse(fs.readFileSync(PREV_REPORT));
  } catch (_) {
    return null;
  }
}

// ── Main ────────────────────────────────────────────────────────────────────
function main() {
  const startTime = Date.now();
  log('Starting nightly maintenance...');

  ensureDir(STATE_DIR);

  const report = {
    timestamp: new Date().toISOString(),
    mode: QUICK_MODE ? 'quick' : (FIX_MODE ? 'fix' : 'full'),
    overallStatus: 'pass',
    checks: [],
    fixes: [],
    results: {},
  };

  // Run quick checks first (always)
  const quickResult = quickChecks();
  report.results.quickChecks = quickResult;
  report.checks.push({
    name: 'Quick Checks',
    status: quickResult.syntaxCheck.failed > 0 || quickResult.jsonValidation.failed > 0 ? 'fail' : 'pass',
    elapsed: 0,
    details: {
      syntaxPassed: quickResult.syntaxCheck.passed,
      syntaxFailed: quickResult.syntaxCheck.failed,
      jsonPassed: quickResult.jsonValidation.passed,
      jsonFailed: quickResult.jsonValidation.failed,
    },
  });

  // Auto-fix if requested
  if (FIX_MODE) {
    log('Running auto-fix...');
    report.fixes = autoFix();
    log(`Applied ${report.fixes.length} auto-fix(es)`);
  }

  // Full mode checks
  if (!QUICK_MODE) {
    // 1. Change detection
    log('Running change detection...');
    const cdResult = runScript('change-detector.js');
    report.checks.push({
      name: 'Change Detection',
      status: cdResult.success ? (cdResult.exitCode === 1 ? 'warn' : 'pass') : 'fail',
      elapsed: cdResult.elapsed,
    });
    if (cdResult.parsed) report.results.changeDetection = cdResult.parsed;

    // 2. Fingerprint diff
    log('Running fingerprint diff...');
    const fpResult = runScript('fingerprint-diff.js');
    report.checks.push({
      name: 'Fingerprint Diff',
      status: fpResult.success ? (fpResult.exitCode === 1 ? 'warn' : 'pass') : 'fail',
      elapsed: fpResult.elapsed,
    });
    if (fpResult.parsed) report.results.fingerprintDiff = fpResult.parsed;
  }

  // 3. Driver health (always run, this is core)
  log('Running driver health check...');
  const dhArgs = FIX_MODE ? ['--fix'] : [];
  const dhResult = runScript('driver-health.js', dhArgs);
  report.checks.push({
    name: 'Driver Health',
    status: dhResult.success ? (dhResult.exitCode === 1 ? 'fail' : 'pass') : 'fail',
    elapsed: dhResult.elapsed,
  });
  if (dhResult.parsed) report.results.driverHealth = dhResult.parsed;

  // 4. Dependency check
  log('Running dependency check...');
  const dcResult = runScript('dep-check.js');
  report.checks.push({
    name: 'Dependency Check',
    status: dcResult.success ? (dcResult.exitCode === 1 ? 'fail' : 'pass') : 'fail',
    elapsed: dcResult.elapsed,
  });
  if (dcResult.parsed) report.results.depCheck = dcResult.parsed;

  if (!QUICK_MODE) {
    // 5. Performance monitor
    log('Running performance monitor...');
    const pfResult = runScript('perf-monitor.js');
    report.checks.push({
      name: 'Performance Monitor',
      status: pfResult.success ? 'pass' : 'fail',
      elapsed: pfResult.elapsed,
    });
    if (pfResult.parsed) report.results.performance = pfResult.parsed;
  }

  // Determine overall status
  const hasFailures = report.checks.some(c => c.status === 'fail');
  const hasWarnings = report.checks.some(c => c.status === 'warn');
  report.overallStatus = hasFailures ? 'fail' : (hasWarnings ? 'warn' : 'pass');

  // Compute total elapsed time
  report.totalElapsed = Date.now() - startTime;

  // Compare with previous run
  const prev = loadPreviousReport();
  if (prev) {
    report.previousRun = {
      timestamp: prev.timestamp,
      status: prev.overallStatus,
      driverHealthScore: prev.results?.driverHealth?.fleetHealth?.averageScore,
    };
  }

  // Output
  if (JSON_OUTPUT) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    log('');
    log('========================================');
    log('  NIGHTLY MAINTENANCE REPORT');
    log('========================================');
    log(`Timestamp: ${report.timestamp}`);
    log(`Mode: ${report.mode}`);
    log(`Total elapsed: ${report.totalElapsed}ms`);
    log('');

    for (const check of report.checks) {
      const icon = check.status === 'pass' ? 'PASS' : check.status === 'warn' ? 'WARN' : 'FAIL';
      const elapsedStr = check.elapsed > 0 ? ` (${check.elapsed}ms)` : '';
      log(`  [${icon}] ${check.name}${elapsedStr}`);
    }

    if (report.fixes.length > 0) {
      log('');
      log(`Auto-fixes applied: ${report.fixes.length}`);
      for (const fix of report.fixes) {
        log(`  - ${fix}`);
      }
    }

    log('');
    log(`Overall: ${report.overallStatus.toUpperCase()}`);

    if (prev) {
      const prevDriverScore = prev.results?.driverHealth?.fleetHealth?.averageScore;
      const currDriverScore = report.results?.driverHealth?.fleetHealth?.averageScore;
      if (prevDriverScore != null && currDriverScore != null) {
        const diff = currDriverScore - prevDriverScore;
        log(`Driver health trend: ${prevDriverScore} -> ${currDriverScore} (${diff >= 0 ? '+' : ''}${diff})`);
      }
    }
  }

  // Save reports
  ensureDir(STATE_DIR);
  fs.writeFileSync(REPORT_JSON, JSON.stringify(report, null, 2));
  fs.writeFileSync(REPORT_MD, generateMarkdown(report));

  process.exit(hasFailures ? 1 : 0);
}

main();
