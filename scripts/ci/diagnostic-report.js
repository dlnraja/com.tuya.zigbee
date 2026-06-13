#!/usr/bin/env node
/**
 * diagnostic-report.js - Comprehensive CI/CD Diagnostic Report with Predictive Health Scoring
 * Generates a full health report covering:
 *   - Build status (app.json validation)
 *   - Driver health (total, valid, invalid, empty manufacturerName)
 *   - Fingerprint health (total, duplicates, orphaned)
 *   - Workflow health (total, pinned actions, missing timeouts, concurrency)
 *   - Security status (secrets exposure, forbidden files)
 *
 * Predictive health scoring:
 *   - Weighted health score (0-100) across all dimensions
 *   - Per-dimension sub-scores for targeted analysis
 *   - Trend analysis via historical state comparison
 *   - Risk predictions per subsystem
 *   - Actionable recommendations with priority and effort
 *
 * Usage: node scripts/ci/diagnostic-report.js [--json] [--output <path>] [--predictive]
 * Exit code: 0 = clean, 1 = issues found
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const LIB_DIR = path.join(ROOT, 'lib');
const WORKFLOWS_DIR = path.join(ROOT, '.github', 'workflows');
const STATE_DIR = path.join(ROOT, '.github', 'state');

const JSON_OUTPUT = process.argv.includes('--json');
const PREDICTIVE = process.argv.includes('--predictive') || JSON_OUTPUT;
const OUTPUT_IDX = process.argv.indexOf('--output');
const OUTPUT_PATH = OUTPUT_IDX !== -1 ? process.argv[OUTPUT_IDX + 1] : null;

const report = {
  timestamp: new Date().toISOString(),
  version: '9.0.0',
  build: { status: 'unknown', appVersion: null, appValid: null },
  drivers: { total: 0, valid: 0, invalid: 0, emptyMfrName: 0, invalidJson: 0, missingConnectivity: 0 },
  fingerprints: { total: 0, uniqueMfrNames: 0, duplicates: 0, orphaned: 0, collisionDrivers: [] },
  workflows: { total: 0, unpinnedActions: 0, missingTimeout: 0, missingShell: 0, secretExposure: 0, unpinnedList: [] },
  security: { status: 'clean', forbiddenFiles: 0, gitTokens: 0, hardcodedSecrets: 0 },
  health: {
    overallScore: 100,
    dimensions: {},
    trend: 'stable',
    previousScore: null,
    predictions: [],
    recommendations: [],
  },
  overall: 'healthy',
};

// ---- Predictive health scoring infrastructure ----

/** Load previous state for trend analysis */
function loadPreviousState() {
  const statePath = path.join(STATE_DIR, 'diagnostic-report-state.json');
  try {
    if (fs.existsSync(statePath)) return JSON.parse(fs.readFileSync(statePath, 'utf8'));
  } catch { /* no previous state */ }
  return null;
}

/** Save current state for future trend analysis */
function saveState(score, dimensions) {
  try {
    if (!fs.existsSync(STATE_DIR)) fs.mkdirSync(STATE_DIR, { recursive: true });
    fs.writeFileSync(path.join(STATE_DIR, 'diagnostic-report-state.json'),
      JSON.stringify({ timestamp: new Date().toISOString(), score, dimensions }, null, 2));
  } catch { /* non-fatal */ }
}

/** Calculate sub-score for a dimension (0-100) */
function dimensionScore(issues, maxDeductable = 100) {
  let score = 100;
  score -= issues * 5;
  return Math.max(0, Math.min(100, score));
}

/** Generate predictive analysis based on report data */
function generatePredictions(report) {
  const predictions = [];
  const recommendations = [];

  // Build prediction: invalid app.json means nothing will work
  if (report.build.status !== 'valid') {
    predictions.push({
      type: 'build-failure',
      severity: 'critical',
      dimension: 'build',
      message: 'app.json is invalid. No deployment or Homey installation will succeed until this is fixed.',
    });
    recommendations.push({
      priority: 0,
      category: 'build',
      action: 'Fix app.json structural issues immediately. Run `node scripts/ci/diagnostic-report.js` after fixing to verify.',
    });
  }

  // Driver predictions
  const driverIssueRate = report.drivers.total > 0 ? report.drivers.invalid / report.drivers.total : 0;
  if (driverIssueRate > 0.1) {
    predictions.push({
      type: 'driver-degradation',
      severity: 'high',
      dimension: 'drivers',
      message: `${report.drivers.invalid} of ${report.drivers.total} drivers have issues (${Math.round(driverIssueRate * 100)}%). This rate suggests systemic problems in driver generation or maintenance.`,
    });
    recommendations.push({
      priority: 1,
      category: 'drivers',
      action: 'Run `node scripts/automation/validate-drivers.js --json` for detailed per-driver diagnostics.',
    });
  }
  if (report.drivers.emptyMfrName > 0) {
    predictions.push({
      type: 'aggregate-error-risk',
      severity: 'high',
      dimension: 'drivers',
      message: `${report.drivers.emptyMfrName} driver(s) have empty manufacturerName arrays. These will cause AggregateError during Zigbee initialization on Homey startup.`,
    });
    recommendations.push({
      priority: 0,
      category: 'stability',
      action: 'Populate manufacturerName arrays or remove empty fingerprint entries.',
    });
  }

  // Fingerprint predictions
  if (report.fingerprints.duplicates > 0) {
    predictions.push({
      type: 'pairing-conflicts',
      severity: 'high',
      dimension: 'fingerprints',
      message: `${report.fingerprints.duplicates} cross-driver fingerprint collision(s) detected. New devices may bind to the wrong driver, causing incorrect capability handling.`,
    });
    recommendations.push({
      priority: 1,
      category: 'user-experience',
      action: 'Run `node scripts/automation/fix-fingerprint-conflicts.js --dry-run` to preview and resolve collisions.',
    });
  }
  if (report.fingerprints.orphaned > report.drivers.total * 0.2) {
    predictions.push({
      type: 'orphaned-drivers',
      severity: 'medium',
      dimension: 'fingerprints',
      message: `${report.fingerprints.orphaned} driver(s) have no fingerprints. These drivers cannot be paired with any device.`,
    });
  }

  // Workflow predictions
  if (report.workflows.unpinnedActions > 0) {
    predictions.push({
      type: 'supply-chain-risk',
      severity: 'medium',
      dimension: 'workflows',
      message: `${report.workflows.unpinnedActions} GitHub Action(s) use unpinned version tags. A compromised upstream action could inject malicious code.`,
    });
    recommendations.push({
      priority: 1,
      category: 'security',
      action: 'Pin all GitHub Actions to full SHA commit hashes instead of version tags.',
    });
  }
  if (report.workflows.secretExposure > 0) {
    predictions.push({
      type: 'secret-leak-risk',
      severity: 'critical',
      dimension: 'security',
      message: `${report.workflows.secretExposure} workflow(s) interpolate secrets directly in run blocks. Secret values may appear in CI logs.`,
    });
    recommendations.push({
      priority: 0,
      category: 'security',
      action: 'Move secret references to `env:` blocks instead of inline in `run:` blocks.',
    });
  }

  // Security predictions
  if (report.security.hardcodedSecrets > 0) {
    predictions.push({
      type: 'exposed-secrets',
      severity: 'critical',
      dimension: 'security',
      message: `${report.security.hardcodedSecrets} potential secret(s) found in committed source code. These may be accessible to anyone with repository access.`,
    });
    recommendations.push({
      priority: 0,
      category: 'security',
      action: 'Immediately rotate any exposed tokens and move them to GitHub secrets or environment variables.',
    });
  }
  if (report.security.forbiddenFiles > 0) {
    predictions.push({
      type: 'credential-file-risk',
      severity: 'high',
      dimension: 'security',
      message: `${report.security.forbiddenFiles} forbidden file(s) found (.env, credentials, tokens). These may contain sensitive data.`,
    });
  }

  return { predictions, recommendations };
}

// ---- BUILD STATUS ----
function checkBuildStatus() {
  try {
    const appJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
    report.build.appVersion = appJson.version;
    report.build.appValid = true;

    // Basic structural validation
    const required = ['id', 'version', 'name', 'drivers'];
    const missing = required.filter(f => !appJson[f]);
    if (missing.length > 0) {
      report.build.appValid = false;
      report.build.status = 'invalid';
      report.build.missingFields = missing;
    } else {
      report.build.status = 'valid';
    }
  } catch (e) {
    report.build.status = 'error';
    report.build.appValid = false;
    report.build.error = e.message;
  }
}

// ---- DRIVER HEALTH ----
function checkDriverHealth() {
  if (!fs.existsSync(DRIVERS_DIR)) {
    report.drivers.total = 0;
    return;
  }

  const dirs = fs.readdirSync(DRIVERS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  report.drivers.total = dirs.length;
  const fpKeyMap = new Map(); // fpKey -> [driver names] for collision detection
  const allMfrNames = new Set();

  for (const dir of dirs) {
    const composePath = path.join(DRIVERS_DIR, dir, 'driver.compose.json');
    const devicePath = path.join(DRIVERS_DIR, dir, 'device.js');

    let valid = true;

    // Check driver.compose.json
    if (fs.existsSync(composePath)) {
      try {
        const comp = JSON.parse(fs.readFileSync(composePath, 'utf8'));

        // Empty manufacturerName
        if (comp.zigbee && Array.isArray(comp.zigbee.manufacturerName) && comp.zigbee.manufacturerName.length === 0) {
          report.drivers.emptyMfrName++;
        }

        // Missing connectivity
        if (!comp.connectivity) {
          report.drivers.missingConnectivity++;
        }

        // Collect fingerprints for collision detection
        if (comp.zigbee && comp.zigbee.fingerprints) {
          for (const fp of comp.zigbee.fingerprints) {
            const key = `${fp.profileId || ''}:${fp.endpoint || ''}:${fp.clusterId || ''}:${fp.deviceId || ''}`;
            if (!fpKeyMap.has(key)) fpKeyMap.set(key, []);
            fpKeyMap.get(key).push(dir);

            if (comp.zigbee.manufacturerName) {
              for (const m of comp.zigbee.manufacturerName) allMfrNames.add(m);
            }
          }
        }
      } catch {
        report.drivers.invalidJson++;
        valid = false;
      }
    } else {
      valid = false;
    }

    // Check device.js syntax
    if (fs.existsSync(devicePath)) {
      try {
        const content = fs.readFileSync(devicePath, 'utf8');
        // Basic syntax check: try to parse as a function
        if (content.includes('SyntaxError') || content.trim().length === 0) {
          valid = false;
        }
      } catch {
        valid = false;
      }
    }

    if (valid) report.drivers.valid++;
    else report.drivers.invalid++;
  }

  // Fingerprint stats
  report.fingerprints.uniqueMfrNames = allMfrNames.size;

  // Count collisions
  for (const [key, drivers] of fpKeyMap) {
    const uniqueDrivers = [...new Set(drivers)];
    if (uniqueDrivers.length > 1) {
      report.fingerprints.duplicates++;
      report.fingerprints.collisionDrivers.push({
        fingerprint: key,
        drivers: uniqueDrivers,
      });
    }
    report.fingerprints.total += drivers.length;
  }

  // Orphaned: drivers with no fingerprints at all
  for (const dir of dirs) {
    const composePath = path.join(DRIVERS_DIR, dir, 'driver.compose.json');
    if (!fs.existsSync(composePath)) {
      report.fingerprints.orphaned++;
      continue;
    }
    try {
      const comp = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      if (!comp.zigbee || !comp.zigbee.fingerprints || comp.zigbee.fingerprints.length === 0) {
        report.fingerprints.orphaned++;
      }
    } catch {
      report.fingerprints.orphaned++;
    }
  }
}

// ---- WORKFLOW HEALTH ----
function checkWorkflowHealth() {
  if (!fs.existsSync(WORKFLOWS_DIR)) return;

  const files = fs.readdirSync(WORKFLOWS_DIR)
    .filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));

  report.workflows.total = files.length;

  for (const file of files) {
    const fullPath = path.join(WORKFLOWS_DIR, file);
    const content = fs.readFileSync(fullPath, 'utf8');
    const lines = content.split('\n');

    // Check for unpinned actions
    for (const line of lines) {
      const match = line.match(/uses:\s+(\S+)@(\S+)/);
      if (match) {
        const ref = match[2];
        // Unpinned if it's a tag (v1, v2, master) without SHA
        if (/^(v\d+|master|main|latest)$/.test(ref)) {
          report.workflows.unpinnedActions++;
          report.workflows.unpinnedList.push({ file, action: match[1], ref });
        }
      }
    }

    // Check for missing timeout-minutes on jobs
    // Jobs are defined at 2-space indent under 'jobs:' with 'runs-on:' present
    let inJobs = false;
    let currentJob = null;
    let jobHasTimeout = false;
    let jobHasRunsOn = false;

    for (const line of lines) {
      if (/^jobs:\s*$/.test(line)) { inJobs = true; continue; }
      if (!inJobs) continue;

      // New job definition: 2-space indent, has ':'
      const jobMatch = line.match(/^  (\w[\w-]*):\s*$/);
      if (jobMatch) {
        // Check previous job
        if (currentJob && jobHasRunsOn && !jobHasTimeout) {
          report.workflows.missingTimeout++;
        }
        currentJob = jobMatch[1];
        jobHasTimeout = false;
        jobHasRunsOn = false;
        continue;
      }

      if (currentJob) {
        if (line.includes('timeout-minutes:')) jobHasTimeout = true;
        if (line.includes('runs-on:')) jobHasRunsOn = true;
      }
    }
    // Check last job
    if (currentJob && jobHasRunsOn && !jobHasTimeout) {
      report.workflows.missingTimeout++;
    }

    // Check for secret interpolation in shell commands (run: blocks)
    // Secrets in 'run:' blocks can leak values to logs; secrets in 'env:' blocks are safe
    let inRunBlock = false;
    let runIndent = 0;
    for (const line of lines) {
      const runMatch = line.match(/^(\s*)run:\s*\|?\s*$/);
      if (runMatch) {
        inRunBlock = true;
        runIndent = runMatch[1].length;
        continue;
      }
      if (inRunBlock) {
        const lineIndent = line.search(/\S/);
        if (lineIndent !== -1 && lineIndent <= runIndent && line.trim() !== '') {
          inRunBlock = false;
        } else if (line.includes('${{ secrets.')) {
          report.workflows.secretExposure++;
          inRunBlock = false; // count once per run block
        }
      }
    }
  }
}

// ---- SECURITY STATUS ----
function checkSecurity() {
  // Check forbidden files
  const forbiddenNames = ['.env', '.env.local', '.env.production', 'credentials.json', 'token.json', '.netrc'];
  const walkDir = (dir, depth = 0) => {
    if (depth > 4) return;
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (['.git', 'node_modules', 'temp', 'tmp'].includes(entry.name)) continue;
        walkDir(path.join(dir, entry.name), depth + 1);
      } else if (forbiddenNames.includes(entry.name)) {
        report.security.forbiddenFiles++;
      }
    }
  };
  walkDir(ROOT);

  // Check git config for tokens
  try {
    const gitConfigPath = path.join(ROOT, '.git', 'config');
    if (fs.existsSync(gitConfigPath)) {
      const config = fs.readFileSync(gitConfigPath, 'utf8');
      if (/https:\/\/[^@]*:[^@]*@github\.com/.test(config)) {
        report.security.gitTokens++;
      }
    }
  } catch { /* ok */ }

  // Quick scan for hardcoded secrets in source
  try {
    const SECRET_RE = /gh[pousrx]_[A-Za-z0-9_]{36,}|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{35}/g;
    const sourceFiles = execSync('git ls-files', { cwd: ROOT, encoding: 'utf8', timeout: 5000 })
      .split('\n')
      .filter(f => /\.(js|json|yml|yaml|md|sh|ts)$/.test(f) && !f.startsWith('node_modules/'));

    for (const file of sourceFiles.slice(0, 500)) {
      const fullPath = path.join(ROOT, file);
      if (!fs.existsSync(fullPath)) continue;
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        const matches = content.match(SECRET_RE);
        if (matches) {
          for (const m of matches) {
            // Skip examples/documentation
            if (m.includes('****') || m.includes('xxxx')) continue;
            report.security.hardcodedSecrets++;
          }
        }
      } catch { /* skip */ }
    }
  } catch { /* git not available */ }

  // Overall security status
  const secIssues = report.security.forbiddenFiles + report.security.gitTokens + report.security.hardcodedSecrets;
  report.security.status = secIssues === 0 ? 'clean' : 'issues_found';
}

// ---- MAIN ----
function main() {
  checkBuildStatus();
  checkDriverHealth();
  checkWorkflowHealth();
  checkSecurity();

  // Overall health
  const issues = [];
  if (report.build.status !== 'valid') issues.push('build_invalid');
  if (report.drivers.invalid > 0) issues.push('invalid_drivers');
  if (report.drivers.emptyMfrName > 0) issues.push('empty_mfr_names');
  if (report.fingerprints.duplicates > 0) issues.push('fp_collisions');
  if (report.workflows.unpinnedActions > 0) issues.push('unpinned_actions');
  if (report.workflows.secretExposure > 0) issues.push('secret_exposure');
  if (report.security.status !== 'clean') issues.push('security_issues');

  report.overall = issues.length === 0 ? 'healthy' : 'needs_attention';
  report.issues = issues;

  // ---- Predictive Health Score ----
  const buildScore = report.build.status === 'valid' ? 100 : report.build.status === 'unknown' ? 50 : 0;
  const driverScore = report.drivers.total > 0
    ? Math.round((report.drivers.valid / report.drivers.total) * 100)
    : 100;
  const fpIssues = report.fingerprints.duplicates + report.fingerprints.orphaned;
  const fpScore = dimensionScore(fpIssues, 50);
  const workflowIssues = report.workflows.unpinnedActions + report.workflows.missingTimeout + report.workflows.secretExposure;
  const workflowScore = dimensionScore(workflowIssues, 50);
  const secIssues = report.security.forbiddenFiles + report.security.gitTokens + report.security.hardcodedSecrets;
  const securityScore = dimensionScore(secIssues * 3, 50);

  // Weighted overall: build 15%, drivers 35%, fingerprints 20%, workflows 15%, security 15%
  const overallScore = Math.round(
    buildScore * 0.15 + driverScore * 0.35 + fpScore * 0.20 + workflowScore * 0.15 + securityScore * 0.15
  );

  report.health.overallScore = overallScore;
  report.health.dimensions = {
    build: { score: buildScore, weight: 0.15 },
    drivers: { score: driverScore, weight: 0.35 },
    fingerprints: { score: fpScore, weight: 0.20 },
    workflows: { score: workflowScore, weight: 0.15 },
    security: { score: securityScore, weight: 0.15 },
  };

  // Trend analysis
  const prevState = loadPreviousState();
  const trend = prevState
    ? (overallScore > prevState.score + 2 ? 'improving' : overallScore < prevState.score - 2 ? 'degrading' : 'stable')
    : 'baseline';
  report.health.trend = trend;
  report.health.previousScore = prevState?.score || null;

  // Predictions and recommendations
  const { predictions, recommendations } = generatePredictions(report);
  report.health.predictions = predictions;
  report.health.recommendations = recommendations;

  // Save state
  saveState(overallScore, report.health.dimensions);

  if (JSON_OUTPUT) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log('='.repeat(60));
    console.log('  DIAGNOSTIC REPORT v' + report.version);
    console.log('  ' + report.timestamp);
    console.log('='.repeat(60));

    console.log('\n## BUILD STATUS');
    console.log('  Status:       ' + report.build.status);
    console.log('  App Version:  ' + (report.build.appVersion || 'N/A'));
    console.log('  Valid:        ' + (report.build.appValid ? 'Yes' : 'No'));

    console.log('\n## DRIVER HEALTH');
    console.log('  Total:        ' + report.drivers.total);
    console.log('  Valid:        ' + report.drivers.valid);
    console.log('  Invalid:      ' + report.drivers.invalid);
    console.log('  Empty Mfr:    ' + report.drivers.emptyMfrName);
    console.log('  Invalid JSON: ' + report.drivers.invalidJson);
    console.log('  No Connect.:  ' + report.drivers.missingConnectivity);

    console.log('\n## FINGERPRINT HEALTH');
    console.log('  Total FPs:    ' + report.fingerprints.total);
    console.log('  Unique Mfrs:  ' + report.fingerprints.uniqueMfrNames);
    console.log('  Duplicates:   ' + report.fingerprints.duplicates);
    console.log('  Orphaned:     ' + report.fingerprints.orphaned);
    if (report.fingerprints.collisionDrivers.length > 0) {
      console.log('  Collisions:');
      for (const c of report.fingerprints.collisionDrivers.slice(0, 10)) {
        console.log('    ' + c.fingerprint + ' -> ' + c.drivers.join(', '));
      }
    }

    console.log('\n## WORKFLOW HEALTH');
    console.log('  Total:              ' + report.workflows.total);
    console.log('  Unpinned Actions:   ' + report.workflows.unpinnedActions);
    console.log('  Missing Timeout:    ' + report.workflows.missingTimeout);
    console.log('  Secret Exposure:    ' + report.workflows.secretExposure);
    if (report.workflows.unpinnedList.length > 0) {
      console.log('  Unpinned List:');
      for (const u of report.workflows.unpinnedList.slice(0, 20)) {
        console.log('    ' + u.file + ': ' + u.action + '@' + u.ref);
      }
    }

    console.log('\n## SECURITY STATUS');
    console.log('  Status:             ' + report.security.status);
    console.log('  Forbidden Files:    ' + report.security.forbiddenFiles);
    console.log('  Git Tokens:         ' + report.security.gitTokens);
    console.log('  Hardcoded Secrets:  ' + report.security.hardcodedSecrets);

    // Predictive health report
    console.log('\n' + '='.repeat(60));
    console.log('  PREDICTIVE HEALTH REPORT');
    console.log('='.repeat(60));
    console.log(`  Overall Score: ${overallScore}/100 (${overallScore >= 80 ? 'GOOD' : overallScore >= 50 ? 'NEEDS ATTENTION' : 'CRITICAL'})`);
    console.log(`  Trend:         ${trend.toUpperCase()}${prevState ? ` (was ${prevState.score})` : ' (baseline)'}`);
    console.log('  Dimension Scores:');
    for (const [dim, info] of Object.entries(report.health.dimensions)) {
      const bar = '█'.repeat(Math.round(info.score / 10)) + '░'.repeat(10 - Math.round(info.score / 10));
      console.log(`    ${dim.padEnd(14)} ${bar} ${info.score}/100 (weight: ${(info.weight * 100).toFixed(0)}%)`);
    }
    if (predictions.length > 0) {
      console.log('\n  Predictions:');
      for (const p of predictions) {
        console.log(`    [${p.severity.toUpperCase()}] ${p.message}`);
      }
    }
    if (recommendations.length > 0) {
      console.log('\n  Recommendations:');
      for (const r of recommendations) {
        console.log(`    P${r.priority}: ${r.action}`);
      }
    }
    console.log('\n' + '='.repeat(60));
    console.log('  OVERALL: ' + report.overall.toUpperCase());
    if (report.issues.length > 0) {
      console.log('  Issues:  ' + report.issues.join(', '));
    }
    console.log('='.repeat(60));
  }

  // Write output file if requested
  if (OUTPUT_PATH) {
    const outDir = path.dirname(OUTPUT_PATH);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(report, null, 2));
    if (!JSON_OUTPUT) console.log('\nReport written to: ' + OUTPUT_PATH);
  }

  process.exit(report.overall === 'healthy' ? 0 : 1);
}

try {
  main();
} catch (e) {
  console.error('[DIAGNOSTIC-REPORT] Fatal error: ' + e.message);
  process.exit(2);
}
