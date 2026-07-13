#!/usr/bin/env node
/**
 * predictive-health.js - Master Predictive Health Dashboard
 * Combines outputs from all diagnostic scripts to predict potential issues
 * before they happen and generate a unified health score with recommendations.
 *
 * Sources:
 *   - bug-hunter.js output (code quality risks)
 *   - validate-drivers.js output (driver structural health)
 *   - audit-flowcards.js output (flow card completeness)
 *   - diagnostic-report.js output (build, fingerprint, workflow, security)
 *   - fix-fingerprint-conflicts.js output (collision risks)
 *   - diagnostic-history-gate.js output (Gmail/Homey crash history)
 *
 * Features:
 *   - Unified health score (0-100) with per-dimension breakdown
 *   - Predictive issue detection across all subsystems
 *   - Trend analysis via historical state files
 *   - Correlation analysis (e.g., many broken drivers + many conflicts = systemic issue)
 *   - Prioritized actionable recommendations
 *   - JSON output for CI integration
 *
 * Usage:
 *   node scripts/ci/predictive-health.js [--json] [--output <path>] [--verbose]
 *
 * Exit codes: 0 = healthy, 1 = needs attention, 2 = critical
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const STATE_DIR = path.join(ROOT, '.github', 'state');
const SCRIPTS_DIR = path.resolve(__dirname, '..');

const JSON_OUTPUT = process.argv.includes('--json');
const VERBOSE = process.argv.includes('--verbose');
const OUTPUT_IDX = process.argv.indexOf('--output');
const OUTPUT_PATH = OUTPUT_IDX !== -1 ? process.argv[OUTPUT_IDX + 1] : null;

// ---- Master health report structure ----
const report = {
  timestamp: new Date().toISOString(),
  version: '1.0.0',
  overall: {
    score: 100,
    grade: 'A',
    status: 'healthy',
    trend: 'stable',
    previousScore: null,
  },
  dimensions: {
    codeQuality: { score: 100, weight: 0.18, issues: 0, details: '' },
    driverHealth: { score: 100, weight: 0.22, issues: 0, details: '' },
    flowCompleteness: { score: 100, weight: 0.14, issues: 0, details: '' },
    fingerprintStability: { score: 100, weight: 0.14, issues: 0, details: '' },
    workflowIntegrity: { score: 100, weight: 0.10, issues: 0, details: '' },
    securityPosture: { score: 100, weight: 0.12, issues: 0, details: '' },
    diagnosticHistory: { score: 100, weight: 0.10, issues: 0, details: '' },
  },
  predictions: [],
  correlations: [],
  recommendations: [],
  subsystems: {},
};

// ---- Helper: run a script and capture JSON output ----
function runScript(scriptPath, args = []) {
  const fullPath = path.resolve(ROOT, scriptPath);
  if (!fs.existsSync(fullPath)) {
    return null;
  }
  try {
    const cmd = `node "${fullPath}" --json ${args.join(' ')}`;
    const output = execSync(cmd, {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: 120000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return JSON.parse(output);
  } catch (e) {
    // Some scripts exit with code 1 when issues found; that's expected
    if (e.stdout) {
      try {
        return JSON.parse(e.stdout);
      } catch { /* not valid JSON */ }
    }
    return null;
  }
}

// ---- Helper: load historical state ----
function loadHistoricalState(name) {
  const statePath = path.join(STATE_DIR, `${name}-state.json`);
  try {
    if (fs.existsSync(statePath)) return JSON.parse(Buffer.from(fs.readFileSync(statePath)).toString('utf8'));
  } catch { /* no state */ }
  return null;
}

// ---- Collect data from all subsystems ----
function collectSubsystemData() {
  if (!JSON_OUTPUT) console.log('Collecting diagnostic data from all subsystems...\n');

  // 1. Bug Hunter (code quality)
  if (!JSON_OUTPUT) console.log('  [1/6] Running bug-hunter...');
  const bugHunter = runScript('scripts/ci/bug-hunter.js', ['--predictive']);
  if (bugHunter) {
    report.subsystems.bugHunter = bugHunter;
    const score = bugHunter.health?.overallScore ?? 100;
    report.dimensions.codeQuality.score = score;
    report.dimensions.codeQuality.issues = bugHunter.totalIssues || 0;
    report.dimensions.codeQuality.details = `${bugHunter.critical || 0} critical, ${bugHunter.warnings || 0} warnings`;
  }

  // 2. Validate Drivers (driver structural health)
  if (!JSON_OUTPUT) console.log('  [2/6] Running validate-drivers...');
  const validateDrivers = runScript('scripts/automation/validate-drivers.js', ['--predictive']);
  if (validateDrivers) {
    report.subsystems.validateDrivers = validateDrivers;
    const score = validateDrivers.health?.overallScore ?? 100;
    report.dimensions.driverHealth.score = score;
    report.dimensions.driverHealth.issues = (validateDrivers.totalErrors || 0) + (validateDrivers.totalWarnings || 0);
    report.dimensions.driverHealth.details = `${validateDrivers.driversValidated || 0} validated, ${validateDrivers.driversWithIssues || 0} with issues`;
  }

  // 3. Audit Flow Cards (flow card completeness)
  if (!JSON_OUTPUT) console.log('  [3/6] Running audit-flowcards...');
  const auditFlowcards = runScript('scripts/automation/audit-flowcards.js', ['--predictive']);
  if (auditFlowcards) {
    report.subsystems.auditFlowcards = auditFlowcards;
    const score = auditFlowcards.health?.overallScore ?? 100;
    report.dimensions.flowCompleteness.score = score;
    report.dimensions.flowCompleteness.issues = (auditFlowcards.errors || 0) + (auditFlowcards.warnings || 0);
    const coverage = auditFlowcards.health?.coverageStats;
    if (coverage) {
      report.dimensions.flowCompleteness.details = `${coverage.coveredCaps}/${coverage.totalCaps} capabilities covered`;
    }
  }

  // 4. Diagnostic Report (build, fingerprints, workflows, security)
  if (!JSON_OUTPUT) console.log('  [4/6] Running diagnostic-report...');
  const diagnosticReport = runScript('scripts/ci/diagnostic-report.js', ['--predictive']);
  if (diagnosticReport) {
    report.subsystems.diagnosticReport = diagnosticReport;
    const dims = diagnosticReport.health?.dimensions;
    if (dims) {
      // Override specific dimensions from diagnostic report
      if (dims.fingerprints) {
        report.dimensions.fingerprintStability.score = dims.fingerprints.score;
        report.dimensions.fingerprintStability.details = `${diagnosticReport.fingerprints?.duplicates || 0} collisions, ${diagnosticReport.fingerprints?.orphaned || 0} orphaned`;
      }
      if (dims.workflows) {
        report.dimensions.workflowIntegrity.score = dims.workflows.score;
        report.dimensions.workflowIntegrity.details = `${diagnosticReport.workflows?.unpinnedActions || 0} unpinned, ${diagnosticReport.workflows?.secretExposure || 0} secret exposure`;
      }
      if (dims.security) {
        report.dimensions.securityPosture.score = dims.security.score;
        report.dimensions.securityPosture.details = `${diagnosticReport.security?.hardcodedSecrets || 0} secrets, ${diagnosticReport.security?.forbiddenFiles || 0} forbidden files`;
      }
    }
  }

  // 5. Diagnostic History (Gmail/Homey crash and processing history)
  if (!JSON_OUTPUT) console.log('  [5/6] Running diagnostic-history-gate...');
  const diagnosticHistory = runScript('scripts/ci/diagnostic-history-gate.js');
  if (diagnosticHistory) {
    report.subsystems.diagnosticHistory = diagnosticHistory;
    report.dimensions.diagnosticHistory.score = diagnosticHistory.score ?? 100;
    report.dimensions.diagnosticHistory.issues = diagnosticHistory.categories?.reduce((sum, c) => sum + (c.count || 0), 0) || 0;
    report.dimensions.diagnosticHistory.details = `${diagnosticHistory.diagnosticsAnalyzed || 0} entries, ${diagnosticHistory.categories?.length || 0} categories`;
  }

  // 6. Fingerprint Conflicts (collision prediction)
  if (!JSON_OUTPUT) console.log('  [6/6] Running fix-fingerprint-conflicts...');
  const fingerprintConflicts = runScript('scripts/automation/fix-fingerprint-conflicts.js', ['--report-only', '--predictive']);
  if (fingerprintConflicts) {
    report.subsystems.fingerprintConflicts = fingerprintConflicts;
    // Use the health score from conflict analysis if available
    if (fingerprintConflicts.health) {
      // Blend fingerprint stability score
      const fpScore = fingerprintConflicts.health.overallScore;
      report.dimensions.fingerprintStability.score = Math.round(
        (report.dimensions.fingerprintStability.score * 0.5) + (fpScore * 0.5)
      );
      report.dimensions.fingerprintStability.details += `, ${fingerprintConflicts.total || 0} conflicts`;
    }
  }
}

// ---- Correlation analysis ----
function analyzeCorrelations() {
  const correlations = [];

  // Correlation 1: Many code quality issues + many driver issues = systemic maintenance debt
  const codeIssues = report.dimensions.codeQuality.issues;
  const driverIssues = report.dimensions.driverHealth.issues;
  if (codeIssues > 20 && driverIssues > 10) {
    correlations.push({
      type: 'maintenance-debt',
      severity: 'high',
      message: `High code quality issues (${codeIssues}) combined with driver issues (${driverIssues}) suggests systemic maintenance debt. A focused cleanup sprint would yield the highest ROI.`,
      affectedDimensions: ['codeQuality', 'driverHealth'],
    });
  }

  // Correlation 2: Fingerprint collisions + driver invalids = pairing failures
  const fpScore = report.dimensions.fingerprintStability.score;
  const drvScore = report.dimensions.driverHealth.score;
  if (fpScore < 70 && drvScore < 80) {
    correlations.push({
      type: 'pairing-failure-prediction',
      severity: 'high',
      message: `Low fingerprint stability (${fpScore}/100) combined with driver health issues (${drvScore}/100) predicts a high rate of device pairing failures in the field.`,
      affectedDimensions: ['fingerprintStability', 'driverHealth'],
    });
  }

  // Correlation 3: Security issues + workflow exposure = active risk
  const secScore = report.dimensions.securityPosture.score;
  const wfScore = report.dimensions.workflowIntegrity.score;
  if (secScore < 80 && wfScore < 80) {
    correlations.push({
      type: 'active-security-risk',
      severity: 'critical',
      message: `Security issues (${secScore}/100) combined with workflow integrity gaps (${wfScore}/100) create an active attack surface. Secrets may be exposed in CI/CD pipelines.`,
      affectedDimensions: ['securityPosture', 'workflowIntegrity'],
    });
  }

  // Correlation 4: Low flow completeness + high driver count = incomplete user experience
  const flowScore = report.dimensions.flowCompleteness.score;
  const drvCount = report.subsystems.validateDrivers?.driversValidated || 0;
  if (flowScore < 60 && drvCount > 50) {
    correlations.push({
      type: 'incomplete-ux',
      severity: 'medium',
      message: `Low flow card completeness (${flowScore}/100) with ${drvCount} drivers means most devices cannot be controlled via Homey flows. Users will be confused.`,
      affectedDimensions: ['flowCompleteness', 'driverHealth'],
    });
  }

  // Correlation 5: Field diagnostics confirm local audit risk
  const diagCats = report.subsystems.diagnosticHistory?.categories || [];
  const fieldButtonBattery = diagCats.some(c => ['button_flow', 'battery_unknown', 'missing_capability_listener'].includes(c.id));
  if (fieldButtonBattery && (flowScore < 85 || drvScore < 85)) {
    correlations.push({
      type: 'field-confirmed-ux-regression',
      severity: 'high',
      message: 'Historical diagnostics include button, battery, or capability-listener failures and local audits are below target. Prioritize flow/capability coverage before publishing.',
      affectedDimensions: ['diagnosticHistory', 'flowCompleteness', 'driverHealth'],
    });
  }

  report.correlations = correlations;
}

// ---- Generate unified predictions ----
function generateUnifiedPredictions() {
  const predictions = [];
  const recommendations = [];

  // Collect predictions from all subsystems
  for (const [subsystem, data] of Object.entries(report.subsystems)) {
    if (data.health?.predictions) {
      for (const pred of data.health.predictions) {
        predictions.push({
          ...pred,
          source: subsystem,
        });
      }
    }
  }

  // Collect recommendations and deduplicate by action
  const seenActions = new Set();
  for (const [subsystem, data] of Object.entries(report.subsystems)) {
    if (data.health?.recommendations) {
      for (const rec of data.health.recommendations) {
        if (!seenActions.has(rec.action)) {
          seenActions.add(rec.action);
          recommendations.push({
            ...rec,
            source: subsystem,
          });
        }
      }
    }
  }

  // Sort recommendations by priority (lower number = higher priority)
  recommendations.sort((a, b) => a.priority - b.priority);

  // Add correlation-based predictions
  for (const corr of report.correlations) {
    if (corr.severity === 'critical' || corr.severity === 'high') {
      predictions.push({
        type: corr.type,
        severity: corr.severity,
        message: corr.message,
        source: 'correlation',
      });
    }
  }

  report.predictions = predictions;
  report.recommendations = recommendations;
}

// ---- Calculate overall health score ----
function calculateOverallScore() {
  let weightedScore = 0;
  for (const [, dim] of Object.entries(report.dimensions)) {
    weightedScore += dim.score * dim.weight;
  }
  report.overall.score = Math.round(weightedScore);

  // Grade mapping
  const score = report.overall.score;
  if (score >= 95) report.overall.grade = 'A+';
  else if (score >= 90) report.overall.grade = 'A';
  else if (score >= 80) report.overall.grade = 'B';
  else if (score >= 70) report.overall.grade = 'C';
  else if (score >= 50) report.overall.grade = 'D';
  else report.overall.grade = 'F';

  // Status
  if (score >= 80) report.overall.status = 'healthy';
  else if (score >= 50) report.overall.status = 'needs_attention';
  else report.overall.status = 'critical';

  // Check for critical predictions that override status
  const criticalPreds = report.predictions.filter(p => p.severity === 'critical');
  if (criticalPreds.length > 0 && report.overall.status === 'healthy') {
    report.overall.status = 'needs_attention';
    if (criticalPreds.length >= 3) {
      report.overall.status = 'critical';
    }
  }
}

// ---- Trend analysis ----
function analyzeTrend() {
  const prevState = loadHistoricalState('predictive-health');
  const currentScore = report.overall.score;

  if (prevState) {
    report.overall.previousScore = prevState.score;
    const delta = currentScore - prevState.score;
    if (delta > 3) report.overall.trend = 'improving';
    else if (delta < -3) report.overall.trend = 'degrading';
    else report.overall.trend = 'stable';
  } else {
    report.overall.trend = 'baseline';
  }

  // Save state for next run
  try {
    if (!fs.existsSync(STATE_DIR)) fs.mkdirSync(STATE_DIR, { recursive: true });
    fs.writeFileSync(path.join(STATE_DIR, 'predictive-health-state.json'), JSON.stringify({
      timestamp: new Date().toISOString(),
      score: currentScore,
      dimensions: Object.fromEntries(
        Object.entries(report.dimensions).map(([k, v]) => [k, v.score])
      ),
    }, null, 2));
  } catch { /* non-fatal */ }
}

// ---- Display report ----
function displayReport() {
  const d = report.dimensions;
  const bar = (score) => {
    const filled = Math.round(score / 10);
    return '█'.repeat(filled) + '░'.repeat(10 - filled);
  };

  console.log('\n' + '='.repeat(70));
  console.log('  PREDICTIVE HEALTH DASHBOARD v' + report.version);
  console.log('  ' + report.timestamp);
  console.log('='.repeat(70));

  console.log(`\n  OVERALL: ${report.overall.score}/100 (Grade: ${report.overall.grade}) | Status: ${report.overall.status.toUpperCase()} | Trend: ${report.overall.trend.toUpperCase()}${report.overall.previousScore ? ` (was ${report.overall.previousScore})` : ''}`);

  console.log('\n  Dimension Breakdown:');
  for (const [name, dim] of Object.entries(d)) {
    const displayName = name.replace(/([A-Z])/g, ' $1').trim();
    console.log(`    ${displayName.padEnd(25)} ${bar(dim.score)} ${String(dim.score).padStart(3)}/100 (w:${(dim.weight * 100).toFixed(0)}%) ${dim.details}`);
  }

  if (report.predictions.length > 0) {
    console.log('\n  Predictions (' + report.predictions.length + '):');
    const grouped = { critical: [], high: [], medium: [], low: [] };
    for (const p of report.predictions) {
      const level = p.severity || 'low';
      if (!grouped[level]) grouped[level] = [];
      grouped[level].push(p);
    }
    for (const [level, preds] of Object.entries(grouped)) {
      if (preds.length > 0) {
        console.log(`    [${level.toUpperCase()}] (${preds.length})`);
        for (const p of preds.slice(0, VERBOSE ? preds.length : 3)) {
          console.log(`      - ${p.message}`);
        }
        if (!VERBOSE && preds.length > 3) {
          console.log(`      ... and ${preds.length - 3} more`);
        }
      }
    }
  }

  if (report.correlations.length > 0) {
    console.log('\n  Correlations:');
    for (const c of report.correlations) {
      console.log(`    [${c.severity.toUpperCase()}] ${c.message}`);
    }
  }

  if (report.recommendations.length > 0) {
    console.log('\n  Recommendations (top 10):');
    for (const r of report.recommendations.slice(0, 10)) {
      console.log(`    P${r.priority} [${r.source}]: ${r.action}`);
    }
    if (report.recommendations.length > 10) {
      console.log(`    ... and ${report.recommendations.length - 10} more`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log(`  VERDICT: ${report.overall.status === 'healthy'
    ? 'System is healthy. Continue monitoring.'
    : report.overall.status === 'needs_attention'
      ? 'System needs attention. Review recommendations above.'
      : 'CRITICAL: System has serious issues. Address immediately.'}`);
  console.log('='.repeat(70));
}

// ---- Main ----
try {
  collectSubsystemData();
  analyzeCorrelations();
  generateUnifiedPredictions();
  calculateOverallScore();
  analyzeTrend();

  if (JSON_OUTPUT) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    displayReport();
  }

  // Write output file if requested
  if (OUTPUT_PATH) {
    const outDir = path.dirname(OUTPUT_PATH);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(report, null, 2));
    if (!JSON_OUTPUT) console.log('\nReport written to: ' + OUTPUT_PATH);
  }

  // Exit code: 0 = healthy, 1 = needs attention, 2 = critical
  const exitCode = report.overall.status === 'healthy' ? 0
    : report.overall.status === 'needs_attention' ? 1 : 2;
  process.exit(exitCode);
} catch (e) {
  console.error('[PREDICTIVE-HEALTH] Fatal error: ' + e.message);
  if (VERBOSE) console.error(e.stack);
  process.exit(2);
}
