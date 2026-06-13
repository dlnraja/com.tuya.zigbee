#!/usr/bin/env node
/**
 * bug-hunter.js - Enhanced bug detection with predictive analysis for Tuya Zigbee codebase
 * Run: node scripts/ci/bug-hunter.js [--json] [--predictive]
 *
 * Scans for common bugs and regressions:
 * - Hardcoded /app/ paths
 * - Legacy crashy battery handler
 * - Async forEach (unawaited promises)
 * - Missing await on setCapabilityValue
 * - Unbound error handlers
 * - Direct process.exit in non-CI scripts
 * - console.log in CI scripts (should use structured output)
 * - Missing error handling on fs operations
 * - Undefined variable references in common patterns
 * - Missing 'use strict' in scripts
 * - Potential null reference errors
 * - Empty catch blocks
 * - Hardcoded paths that should use config
 *
 * Predictive analysis:
 * - Risk scoring per file (0-100)
 * - Regression probability estimation
 * - Complexity-based failure prediction
 * - Trend analysis via historical state files
 * - Actionable recommendations with priority
 *
 * Exit codes: 0 = no bugs, 1 = critical bugs found, 2 = script failure
 */
'use strict';

const fs = require('fs');
const path = require('path');

const JSON_OUTPUT = process.argv.includes('--json');
const PREDICTIVE = process.argv.includes('--predictive') || process.argv.includes('--json');

const DRIVERS_DIR = path.resolve(__dirname, '../../drivers');
const LIB_DIR = path.resolve(__dirname, '../../lib');
const SCRIPTS_DIR = path.resolve(__dirname, '../../scripts');
const STATE_DIR = path.resolve(__dirname, '../../.github/state');

const issues = [];
let filesScanned = 0;

// ---- Predictive analysis infrastructure ----

/** Per-file risk profiles for predictive scoring */
const fileRiskProfiles = new Map();

/** Aggregate predictive health report */
const predictiveReport = {
  overallScore: 100,
  riskDistribution: { low: 0, medium: 0, high: 0, critical: 0 },
  topRisks: [],
  predictions: [],
  recommendations: [],
  trend: 'stable', // 'improving' | 'stable' | 'degrading'
  previousScore: null,
};

function addIssue(severity, file, message) {
  const entry = {
    severity,
    file: path.relative(path.resolve(__dirname, '../..'), file),
    message,
  };
  issues.push(entry);
  if (!JSON_OUTPUT) {
    const icon = severity === 'critical' ? 'ERROR' : severity === 'warning' ? 'WARN' : 'INFO';
    console.log(`[${icon}] ${entry.file}: ${message}`);
  }
}

/** Initialize a risk profile for a file */
function initRiskProfile(filePath) {
  const relPath = path.relative(path.resolve(__dirname, '../..'), filePath);
  if (!fileRiskProfiles.has(relPath)) {
    fileRiskProfiles.set(relPath, {
      file: relPath,
      criticalCount: 0,
      warningCount: 0,
      infoCount: 0,
      totalSeverity: 0,
      complexity: 0,
      lineCount: 0,
      predictedRisk: 0,
      riskFactors: [],
    });
  }
  return fileRiskProfiles.get(relPath);
}

/** Calculate predicted risk score for a file (0 = safe, 100 = extremely risky) */
function calculateFileRisk(profile) {
  let score = 0;
  const weights = { critical: 30, warning: 10, info: 2 };

  score += profile.criticalCount * weights.critical;
  score += profile.warningCount * weights.warning;
  score += profile.infoCount * weights.info;

  // Complexity penalty: files over 200 lines with issues are more risky
  if (profile.lineCount > 200 && (profile.criticalCount + profile.warningCount) > 0) {
    score += Math.min(15, profile.lineCount / 100);
    profile.riskFactors.push('high-complexity-with-issues');
  }

  // Multiple criticals in same file = exponential risk
  if (profile.criticalCount >= 3) {
    score += 20;
    profile.riskFactors.push('multiple-criticals');
  }

  // Cap at 100
  profile.predictedRisk = Math.min(100, Math.round(score));
  return profile.predictedRisk;
}

/** Classify risk level from score */
function riskLevel(score) {
  if (score >= 70) return 'critical';
  if (score >= 40) return 'high';
  if (score >= 15) return 'medium';
  return 'low';
}

/** Generate predictive analysis based on discovered issues */
function generatePredictions() {
  const predictions = [];
  const recommendations = [];

  // Pattern: recurring issues across files suggest systemic problems
  const issuesByType = new Map();
  for (const issue of issues) {
    const type = issue.message.replace(/\(line \d+\)/, '').trim();
    if (!issuesByType.has(type)) issuesByType.set(type, []);
    issuesByType.get(type).push(issue);
  }

  for (const [type, typeIssues] of issuesByType) {
    if (typeIssues.length >= 3) {
      predictions.push({
        type: 'systemic-issue',
        severity: 'high',
        message: `Systemic pattern detected: "${type}" found in ${typeIssues.length} files. Likely to cause widespread regressions if not addressed.`,
        affectedFiles: typeIssues.length,
      });
    }
  }

  // Predict: async forEach without await will cause silent failures
  const asyncForEachIssues = issues.filter(i => i.message.includes('async forEach'));
  if (asyncForEachIssues.length > 0) {
    predictions.push({
      type: 'silent-failure',
      severity: 'high',
      message: `${asyncForEachIssues.length} file(s) use async forEach. These will silently skip awaited promises, causing intermittent data loss and race conditions.`,
    });
    recommendations.push({
      priority: 1,
      category: 'correctness',
      action: 'Replace .forEach(async ...) with for...of loops and await each iteration.',
      affectedCount: asyncForEachIssues.length,
      estimatedEffort: 'low',
    });
  }

  // Predict: unbound error handlers will lose context
  const unboundErrors = issues.filter(i => i.message.includes('without binding'));
  if (unboundErrors.length > 0) {
    predictions.push({
      type: 'error-swallowing',
      severity: 'medium',
      message: `${unboundErrors.length} file(s) have unbound error handlers. Errors will be logged with wrong context, making debugging difficult.`,
    });
    recommendations.push({
      priority: 2,
      category: 'maintainability',
      action: 'Use .catch(err => this.error(err)) or .catch(this.error.bind(this)) instead.',
      affectedCount: unboundErrors.length,
      estimatedEffort: 'low',
    });
  }

  // Predict: empty catch blocks mask bugs
  const emptyCatches = issues.filter(i => i.message.includes('Empty catch block'));
  if (emptyCatches.length > 0) {
    predictions.push({
      type: 'masked-bugs',
      severity: 'medium',
      message: `${emptyCatches.length} file(s) silently swallow errors. Bugs in these code paths will never surface, leading to mysterious failures.`,
    });
    recommendations.push({
      priority: 2,
      category: 'observability',
      action: 'Add at minimum a console.error or this.error() call in each empty catch block.',
      affectedCount: emptyCatches.length,
      estimatedEffort: 'low',
    });
  }

  // Predict: hardcoded /app/ paths break outside Homey runtime
  const hardcodedPaths = issues.filter(i => i.message.includes('Hardcoded /app/'));
  if (hardcodedPaths.length > 0) {
    predictions.push({
      type: 'portability-risk',
      severity: 'critical',
      message: `${hardcodedPaths.length} file(s) use hardcoded /app/ paths. These will crash immediately outside the Homey runtime.`,
    });
    recommendations.push({
      priority: 0,
      category: 'correctness',
      action: 'Replace with `const Homey = require(\"homey\")` and use Homey.env.PATH or runtime APIs.',
      affectedCount: hardcodedPaths.length,
      estimatedEffort: 'medium',
    });
  }

  // Predict: missing await on setCapabilityValue causes race conditions
  const missingAwaits = issues.filter(i => i.message.includes('missing await on setCapabilityValue'));
  if (missingAwaits.length > 0) {
    predictions.push({
      type: 'race-condition',
      severity: 'medium',
      message: `${missingAwaits.length} file(s) may not await setCapabilityValue. Rapid capability updates can overwrite each other.`,
    });
    recommendations.push({
      priority: 2,
      category: 'correctness',
      action: 'Add `await` before `this.setCapabilityValue()` calls to ensure sequential updates.',
      affectedCount: missingAwaits.length,
      estimatedEffort: 'low',
    });
  }

  // Predict: fingerprint collisions will cause device pairing failures
  const collisionIssues = issues.filter(i => i.message.includes('Fingerprint collision'));
  if (collisionIssues.length > 0) {
    predictions.push({
      type: 'pairing-failure',
      severity: 'high',
      message: `${collisionIssues.length} cross-driver fingerprint collision(s) detected. New device pairings may bind to the wrong driver.`,
    });
    recommendations.push({
      priority: 1,
      category: 'user-experience',
      action: 'Run `node scripts/automation/fix-fingerprint-conflicts.js --dry-run` to see resolution options.',
      affectedCount: collisionIssues.length,
      estimatedEffort: 'medium',
    });
  }

  // Predict: missing 'use strict' in scripts increases accidental global leaks
  const missingStrict = issues.filter(i => i.message.includes('Missing "use strict"'));
  if (missingStrict.length > 5) {
    predictions.push({
      type: 'global-leak-risk',
      severity: 'low',
      message: `${missingStrict.length} scripts lack 'use strict'. Accidentally leaked variables will create global state instead of throwing errors.`,
    });
  }

  return { predictions, recommendations };
}

/** Load previous health state for trend analysis */
function loadPreviousState() {
  const statePath = path.join(STATE_DIR, 'bug-hunter-state.json');
  try {
    if (fs.existsSync(statePath)) {
      return JSON.parse(fs.readFileSync(statePath, 'utf8'));
    }
  } catch { /* no previous state */ }
  return null;
}

/** Save current health state for future trend analysis */
function saveState(score, issueCounts) {
  try {
    if (!fs.existsSync(STATE_DIR)) fs.mkdirSync(STATE_DIR, { recursive: true });
    const statePath = path.join(STATE_DIR, 'bug-hunter-state.json');
    const state = {
      timestamp: new Date().toISOString(),
      score,
      issues: issueCounts,
    };
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
  } catch { /* non-fatal */ }
}

/** Determine trend from previous and current scores */
function determineTrend(previousScore, currentScore) {
  if (previousScore === null) return 'baseline';
  const delta = currentScore - previousScore;
  if (delta > 3) return 'improving';
  if (delta < -3) return 'degrading';
  return 'stable';
}

function hunt(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.git', 'temp', 'tmp'].includes(entry.name)) continue;
      hunt(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      scanFile(fullPath);
    }
  }
}

function scanFile(filePath) {
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch {
    return;
  }
  filesScanned++;
  const profile = initRiskProfile(filePath);
  profile.lineCount = content.split('\n').length;

  // 1. Hardcoded /app/ path
  if (/require\(['"]\/app\//.test(content)) {
    addIssue('critical', filePath, 'Hardcoded /app/ require path found');
    profile.criticalCount++;
    profile.riskFactors.push('hardcoded-runtime-path');
  }

  // 2. Legacy crashy battery handler (only check driver device.js files)
  if (filePath.includes(path.join('drivers', '')) && content.includes('onBatteryPercentageRemainingAttributeReport')) {
    addIssue('critical', filePath, 'Legacy crashy battery handler found');
    profile.criticalCount++;
    profile.riskFactors.push('legacy-crash-handler');
  }

  // 3. Async forEach (unawaited promises)
  if (content.includes('.forEach(async')) {
    addIssue('warning', filePath, 'async forEach detected (promises might not be awaited)');
    profile.warningCount++;
    profile.riskFactors.push('async-forEach');
  }

  // 4. Missing await on setCapabilityValue
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    // Skip comments
    if (line.startsWith('//') || line.startsWith('*')) continue;
    if (/this\.setCapabilityValue\(/.test(line) && !/await\s+this\.setCapabilityValue/.test(line) && !/return\s+this\.setCapabilityValue/.test(line) && !/\.then\(/.test(line)) {
      addIssue('info', filePath, `Possible missing await on setCapabilityValue (line ${i + 1})`);
      profile.infoCount++;
      profile.riskFactors.push('missing-await-setcap');
      break; // report once per file
    }
  }

  // 5. Unbound error handler: .catch(this.error) without .bind
  if (/.catch\(this\.error\)/.test(content) && !/.catch\(this\.error\.bind/.test(content) && !/.catch\(\(.*\)\s*=>/.test(content)) {
    addIssue('warning', filePath, '.catch(this.error) without binding (may lose context)');
    profile.warningCount++;
    profile.riskFactors.push('unbound-error-handler');
  }

  // 6. Empty catch blocks
  if (/catch\s*\([^)]*\)\s*\{\s*\}/.test(content)) {
    addIssue('warning', filePath, 'Empty catch block (errors silently swallowed)');
    profile.warningCount++;
    profile.riskFactors.push('empty-catch');
  }

  // 7. console.log in CI scripts
  if (filePath.includes('scripts/ci/') && !filePath.includes('node_modules')) {
    if (/console\.log\(/.test(content) && !JSON_OUTPUT) {
      // Only warn if the script doesn't have --json support
      if (!content.includes('--json') || !content.includes('JSON_OUTPUT')) {
        addIssue('info', filePath, 'CI script uses console.log without --json support');
        profile.infoCount++;
      }
    }
  }

  // 8. process.exit without proper exit code handling (only in lib, not scripts)
  if (!filePath.includes('scripts/') && /process\.exit\(\)/.test(content)) {
    addIssue('warning', filePath, 'process.exit() called without exit code');
    profile.warningCount++;
  }

  // 9. fs.readFileSync without try/catch (top-level)
  if (/^const\s+\w+\s*=\s*fs\.readFileSync/m.test(content) && !content.includes('try')) {
    addIssue('info', filePath, 'Top-level fs.readFileSync without error handling');
    profile.infoCount++;
  }

  // 10. Missing 'use strict' in automation/CI scripts (not drivers, they may use SDK conventions)
  if (filePath.includes('scripts/automation/') || filePath.includes('scripts/ci/')) {
    if (!filePath.includes('node_modules')) {
      if (!content.trimStart().startsWith("'use strict'") && !content.trimStart().startsWith('"use strict"') && !content.startsWith('#!')) {
        // Allow shebang-only files that have use strict on line 2
        const firstLines = content.split('\n').slice(0, 3).join('\n');
        if (!firstLines.includes("'use strict'") && !firstLines.includes('"use strict"')) {
          addIssue('info', filePath, 'Missing "use strict" directive');
          profile.infoCount++;
        }
      }
    }
  }

  // 11. Potential null reference: accessing property on possibly null/undefined
  // Look for common patterns like config.zigbee.xxx without null checks
  if (/\.zigbee\.(manufacturerName|productId)\b/.test(content)) {
    const hasNullSafety = content.includes('?.') || content.includes('|| []') || content.includes('|| {}');
    if (!hasNullSafety) {
      addIssue('info', filePath, 'Accessing zigbee properties without null safety');
      profile.infoCount++;
      profile.riskFactors.push('null-unsafe-zigbee-access');
    }
  }

  // 12. Hardcoded temp/tmp paths
  if (/['"]\/tmp\//.test(content) || /['"]\\tmp\\/.test(content)) {
    addIssue('warning', filePath, 'Hardcoded /tmp/ path (may not exist in CI)');
    profile.warningCount++;
  }

  // 13. Unused imports / require statements
  if (filePath.endsWith('.js')) {
    const requireMatches = content.match(/(?:const|let|var)\s+(\w+)\s*=\s*require\(/g);
    if (requireMatches) {
      for (const req of requireMatches) {
        const varName = req.match(/(?:const|let|var)\s+(\w+)/)?.[1];
        if (varName) {
          // Count all occurrences of the variable name (word boundary)
          const declPattern = new RegExp(`\\b${varName}\\b`, 'g');
          const count = (content.match(declPattern) || []).length;
          if (count <= 1) {
            addIssue('warning', filePath, `Unused import: "${varName}" is required but never referenced`);
            profile.warningCount++;
          }
        }
      }
    }
  }

  // 14. Duplicate property in object literal (only in actual object definitions, not all : occurrences)
  // This check is limited to avoid false positives from map/object patterns
  // We only look for patterns like: { ... prop: val, ... prop: val ... }
  // Skip files that are likely to have many legitimate : uses (e.g., ternaries, labels)
  if (content.includes('{') && content.includes('}')) {
    // Simple heuristic: look for repeated property names in object literals
    const objLiteralPattern = /\{\s*\n(\s+\w+\s*:)/g;
    let match;
    const fileProps = new Set();
    const dupesInFile = new Set();
    while ((match = objLiteralPattern.exec(content)) !== null) {
      const prop = match[1].trim().split(':')[0].trim();
      if (fileProps.has(prop) && !prop.startsWith('_') && prop !== 'constructor') {
        dupesInFile.add(prop);
      }
      fileProps.add(prop);
    }
    for (const prop of dupesInFile) {
      addIssue('info', filePath, `Possible duplicate object property: "${prop}"`);
      profile.infoCount++;
    }
  }

  // Calculate file-level risk
  calculateFileRisk(profile);
}

// JSON-only scans (driver.compose.json files)
function scanDriverCompose(filePath) {
  let comp;
  try {
    comp = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    addIssue('critical', filePath, 'Invalid JSON in driver.compose.json');
    return;
  }

  const relPath = path.relative(path.resolve(__dirname, '../..'), filePath);

  // 15. Empty manufacturerName array (causes AggregateError on Zigbee init)
  if (comp.zigbee && Array.isArray(comp.zigbee.manufacturerName) && comp.zigbee.manufacturerName.length === 0) {
    // Only flag if fingerprints exist (meaning it IS a zigbee device that needs mfr names)
    if (comp.zigbee.fingerprints && comp.zigbee.fingerprints.length > 0) {
      addIssue('critical', filePath, 'Empty manufacturerName[] with existing fingerprints (causes AggregateError)');
    }
  }

  // 16. Missing required fields in driver.compose.json
  const requiredTopLevel = ['id', 'version', 'compatibility'];
  for (const field of requiredTopLevel) {
    if (!comp[field]) {
      addIssue('warning', filePath, `Missing required field: "${field}"`);
    }
  }

  // 17. Missing required driver fields
  if (!comp.connectivity) {
    addIssue('warning', filePath, 'Missing "connectivity" array (required by Homey SDK)');
  }
  if (!comp.leader) {
    addIssue('info', filePath, 'Missing "leader" field in driver.compose.json');
  }

  // 18. Case-sensitivity issues in manufacturer names
  if (comp.zigbee && comp.zigbee.manufacturerName) {
    const names = comp.zigbee.manufacturerName;
    const seenLower = new Map();
    for (const name of names) {
      const lower = name.toLowerCase();
      if (seenLower.has(lower) && seenLower.get(lower) !== name) {
        addIssue('warning', filePath, `Case-sensitivity conflict: "${name}" vs "${seenLower.get(lower)}" (same lowercase)`);
      }
      seenLower.set(lower, name);
    }
  }

  // 19. Duplicate fingerprints (collision detection)
  if (comp.zigbee && comp.zigbee.fingerprints) {
    const fpSet = new Set();
    for (const fp of comp.zigbee.fingerprints) {
      const key = `${fp.profileId || ''}:${fp.endpoint || ''}:${fp.clusterId || ''}`;
      if (fpSet.has(key)) {
        addIssue('warning', filePath, `Duplicate fingerprint entry: profileId=${fp.profileId} endpoint=${fp.endpoint} cluster=${fp.clusterId}`);
      }
      fpSet.add(key);
    }
  }
}

// Scan driver.compose.json files for JSON-specific issues
function huntJson(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.git', 'temp', 'tmp'].includes(entry.name)) continue;
      huntJson(fullPath);
    } else if (entry.isFile() && entry.name === 'driver.compose.json') {
      scanDriverCompose(fullPath);
    }
  }
}

// Cross-driver fingerprint collision scan
function scanCrossDriverCollisions() {
  const fpMap = new Map(); // key -> [{ driver, profileId, endpoint, clusterId }]
  if (!fs.existsSync(DRIVERS_DIR)) return;

  const driverDirs = fs.readdirSync(DRIVERS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => path.join(DRIVERS_DIR, d.name, 'driver.compose.json'));

  for (const fp of driverDirs) {
    let comp;
    try {
      comp = JSON.parse(fs.readFileSync(fp, 'utf8'));
    } catch { continue; }

    if (!comp.zigbee || !comp.zigbee.fingerprints) continue;
    const driverDir = path.basename(path.dirname(fp));

    for (const f of comp.zigbee.fingerprints) {
      const key = `${f.profileId || ''}:${f.endpoint || ''}:${f.clusterId || ''}:${f.deviceId || ''}`;
      if (!fpMap.has(key)) fpMap.set(key, []);
      fpMap.get(key).push({ driver: driverDir, profileId: f.profileId, endpoint: f.endpoint, clusterId: f.clusterId, deviceId: f.deviceId });
    }
  }

  for (const [key, entries] of fpMap) {
    if (entries.length > 1) {
      const drivers = [...new Set(entries.map(e => e.driver))];
      if (drivers.length > 1) {
        addIssue('warning', 'cross-driver', `Fingerprint collision: ${key} shared by ${drivers.join(', ')}`);
      }
    }
  }
}

// Main
try {
  if (!JSON_OUTPUT) console.log('Bug Hunter scanning...\n');

  hunt(DRIVERS_DIR);
  hunt(LIB_DIR);
  hunt(SCRIPTS_DIR);
  huntJson(DRIVERS_DIR);
  scanCrossDriverCollisions();

  const criticalIssues = issues.filter(i => i.severity === 'critical');
  const warningIssues = issues.filter(i => i.severity === 'warning');
  const infoIssues = issues.filter(i => i.severity === 'info');

  // ---- Predictive Health Score ----
  // Weighted formula: start at 100, deduct per issue severity
  let healthScore = 100;
  healthScore -= criticalIssues.length * 12;
  healthScore -= warningIssues.length * 4;
  healthScore -= infoIssues.length * 1;
  healthScore = Math.max(0, Math.min(100, healthScore));

  // Risk distribution from file profiles
  const riskDistribution = { low: 0, medium: 0, high: 0, critical: 0 };
  for (const [, profile] of fileRiskProfiles) {
    const level = riskLevel(profile.predictedRisk);
    riskDistribution[level]++;
  }

  // Top riskiest files
  const topRisks = [...fileRiskProfiles.values()]
    .sort((a, b) => b.predictedRisk - a.predictedRisk)
    .filter(p => p.predictedRisk > 0)
    .slice(0, 10)
    .map(p => ({
      file: p.file,
      riskScore: p.predictedRisk,
      level: riskLevel(p.predictedRisk),
      factors: p.riskFactors,
      criticals: p.criticalCount,
      warnings: p.warningCount,
    }));

  // Generate predictions and recommendations
  const { predictions, recommendations } = generatePredictions();

  // Load previous state for trend analysis
  const prevState = loadPreviousState();
  const trend = determineTrend(prevState?.score || null, healthScore);

  // Save state for next run
  saveState(healthScore, {
    critical: criticalIssues.length,
    warning: warningIssues.length,
    info: infoIssues.length,
  });

  predictiveReport.overallScore = healthScore;
  predictiveReport.riskDistribution = riskDistribution;
  predictiveReport.topRisks = topRisks;
  predictiveReport.predictions = predictions;
  predictiveReport.recommendations = recommendations;
  predictiveReport.trend = trend;
  predictiveReport.previousScore = prevState?.score || null;

  if (JSON_OUTPUT) {
    const output = {
      timestamp: new Date().toISOString(),
      filesScanned,
      totalIssues: issues.length,
      critical: criticalIssues.length,
      warnings: warningIssues.length,
      issues,
      health: predictiveReport,
      exitCode: criticalIssues.length > 0 ? 1 : 0,
    };
    console.log(JSON.stringify(output, null, 2));
  } else {
    console.log(`\nScanned ${filesScanned} files.`);
    if (issues.length === 0) {
      console.log('[BUG-HUNTER] No bugs found.');
    } else {
      console.log(`[BUG-HUNTER] Found ${issues.length} issue(s): ${criticalIssues.length} critical, ${warningIssues.length} warnings.`);
    }

    // Print health report
    console.log('\n' + '='.repeat(60));
    console.log('  PREDICTIVE HEALTH REPORT');
    console.log('='.repeat(60));
    console.log(`  Health Score:  ${healthScore}/100 (${healthScore >= 80 ? 'GOOD' : healthScore >= 50 ? 'NEEDS ATTENTION' : 'CRITICAL'})`);
    console.log(`  Trend:         ${trend.toUpperCase()}${prevState ? ` (was ${prevState.score})` : ' (baseline)'}`);
    console.log(`  Risk Files:    ${riskDistribution.critical} critical, ${riskDistribution.high} high, ${riskDistribution.medium} medium, ${riskDistribution.low} low`);
    if (topRisks.length > 0) {
      console.log('\n  Top Risky Files:');
      for (const r of topRisks.slice(0, 5)) {
        console.log(`    [${r.riskScore}] ${r.file} (${r.level})`);
      }
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
        console.log(`    P${r.priority}: ${r.action} (effort: ${r.estimatedEffort}, affects ${r.affectedCount} files)`);
      }
    }
    console.log('='.repeat(60));
  }

  process.exit(criticalIssues.length > 0 ? 1 : 0);
} catch (e) {
  if (!JSON_OUTPUT) console.error(`[BUG-HUNTER] Fatal error: ${e.message}`);
  process.exit(2);
}
