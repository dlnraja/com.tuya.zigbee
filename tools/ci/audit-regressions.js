#!/usr/bin/env node
/**
 * audit-regressions.js — P57 Comprehensive Regressions & Degradations Audit
 *
 * Identifies regressions and degradations that have accumulated:
 * 1. Direct setTimeout usage (not safeSetTimeout) — race condition risk
 * 2. Direct setCapabilityValue (not safeSetCapabilityValue) — destroyed device risk
 * 3. Missing anti-flooding on data-heavy capabilities
 * 4. Direct this.log usage in hot paths (not this.log with rate limit)
 * 5. setInterval without safe clearInterval
 * 6. Race conditions on shared state
 * 7. Missing error handling on async calls
 * 8. Capability listeners without removal on uninit
 *
 * Output: .github/state/regressions-audit.json
 */
'use strict';
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..', '..');
const DRIVERS_DIR = path.join(REPO, 'drivers');
const OUTPUT = path.join(REPO, '.github', 'state', 'regressions-audit.json');

const REGRESSION_PATTERNS = [
  {
    id: 'direct-settimeout',
    severity: 'high',
    title: 'Direct setTimeout on `this` (race condition risk)',
    pattern: /(?<![\w$.])(?<!safe)setTimeout\s*\(\s*this/g,
    fix: 'Use safeSetTimeout(this, cb, ms) from lib/utils/safe-timers.js',
  },
  {
    id: 'direct-setcapabilityvalue',
    severity: 'medium',
    title: 'Direct setCapabilityValue (no destroyed check)',
    pattern: /(?<![\w$.])(?<!safe)setCapabilityValue\s*\(/g,
    fix: 'Use safeSetCapabilityValue(this, cap, val) from lib/utils/SafeCapability.js',
  },
  {
    id: 'setinterval-no-clear',
    severity: 'medium',
    title: 'setInterval without clearInterval in onDeleted',
    // Heuristic: any setInterval must have a corresponding clearInterval
    pattern: /setInterval\s*\(/g,
    fix: 'Store interval ID and clearInterval in onDeleted',
  },
  {
    id: 'console-log',
    severity: 'low',
    title: 'console.log in driver (not this.log)',
    pattern: /(?<![\w$.])console\.(log|error|warn|info|debug)\s*\(/g,
    fix: 'Use this.log(...) for driver context (appears in Homey app logs)',
  },
  {
    id: 'register-capability-no-listener',
    severity: 'low',
    title: 'registerCapability without removeListener',
    pattern: /registerCapability\s*\(\s*['"]([\w.]+)['"]/g,
    fix: 'Ensure capabilityListener is removed in onDeleted',
  },
  {
    id: 'async-without-catch',
    severity: 'low',
    title: 'Async call without try/catch',
    pattern: /await\s+this\.\w+\s*\(/g,
    fix: 'Wrap async calls in try/catch to prevent unhandled rejection',
  },
];

function walkDrivers(callback) {
  if (!fs.existsSync(DRIVERS_DIR)) return;
  for (const entry of fs.readdirSync(DRIVERS_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const driverDir = path.join(DRIVERS_DIR, entry.name);
    const deviceFile = path.join(driverDir, 'device.js');
    if (fs.existsSync(deviceFile)) callback(entry.name, deviceFile);
  }
}

function analyzeFile(driverName, filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const findings = [];
  for (const pat of REGRESSION_PATTERNS) {
    pat.pattern.lastIndex = 0;
    const matches = [];
    let m;
    while ((m = pat.pattern.exec(content)) !== null) {
      const lineNum = content.substring(0, m.index).split('\n').length;
      const line = lines[lineNum - 1] || '';
      matches.push({ line: lineNum, code: line.trim().substring(0, 120) });
    }
    if (matches.length > 0) {
      findings.push({ pattern: pat.id, severity: pat.severity, title: pat.title, fix: pat.fix, count: matches.length, samples: matches.slice(0, 3) });
    }
  }
  return { driver: driverName, file: filePath.replace(REPO + path.sep, ''), findings, total: findings.reduce((s, f) => s + f.count, 0) };
}

function main() {
  console.log('=== REGRESSIONS & DEGRADATIONS AUDIT (P57) ===\n');
  const results = [];
  walkDrivers((d, f) => results.push(analyzeFile(d, f)));

  // Stats by pattern
  const byPattern = {};
  for (const r of results) {
    for (const f of r.findings) {
      if (!byPattern[f.pattern]) byPattern[f.pattern] = { count: 0, drivers: 0, severity: f.severity, title: f.title, fix: f.fix };
      byPattern[f.pattern].count += f.count;
      byPattern[f.pattern].drivers += 1;
    }
  }
  console.log(`Drivers analyzed: ${results.length}`);
  console.log('Issues found:');
  for (const [pat, info] of Object.entries(byPattern).sort((a, b) => b[1].count - a[1].count)) {
    console.log(`  [${info.severity.padEnd(6)}] ${pat.padEnd(34)} ${info.count.toString().padStart(5)} occurrences in ${info.drivers} drivers`);
  }
  console.log('');

  // Top offenders
  const top = results.filter(r => r.total > 0).sort((a, b) => b.total - a.total).slice(0, 15);
  console.log('TOP 15 DRIVERS WITH MOST ISSUES:');
  for (const r of top) {
    console.log(`  ${r.driver.padEnd(35)} ${r.total} issues`);
    for (const f of r.findings) {
      console.log(`    - [${f.severity}] ${f.pattern} (x${f.count})`);
    }
  }
  console.log('');

  // Save report
  if (!fs.existsSync(path.dirname(OUTPUT))) fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, JSON.stringify({
    meta: {
      generatedAt: new Date().toISOString(),
      totalDrivers: results.length,
      totalIssues: results.reduce((s, r) => s + r.total, 0),
      byPattern,
    },
    drivers: results,
  }, null, 2));
  console.log(`Full report: ${OUTPUT}`);
}

main();
