#!/usr/bin/env node
/**
 * audit-ci-failures.js — Audit all CI failure patterns locally
 * Mirrors the checks from syntax-check.yml and code-quality.yml
 */
'use strict';
const fs = require('fs');
const path = require('path');

const results = {
  rawSetCapabilityValue: [],
  consoleLogs: [],
  wildcardFPs: [],
  titleFormatted: [],
  utf16JsonLoading: [],
  bareTimeout: [],
};

function walkDir(dir, ext, callback) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath, ext, callback);
    } else if (!ext || entry.name.endsWith(ext)) {
      callback(fullPath);
    }
  }
}

// Check 1: Raw setCapabilityValue in drivers/*/device.js
walkDir('drivers', '.js', (fp) => {
  if (!fp.includes('device.js')) return;
  const content = fs.readFileSync(fp, 'utf8');
  if (content.includes('this.setCapabilityValue(')) {
    results.rawSetCapabilityValue.push(fp);
  }
});

// Check 2: console.log in drivers/*/device.js
walkDir('drivers', '.js', (fp) => {
  if (!fp.includes('device.js')) return;
  const content = fs.readFileSync(fp, 'utf8');
  if (/console\.(log|error|warn)\(/.test(content)) {
    results.consoleLogs.push(fp);
  }
});

// Check 3: Wildcard fingerprints in drivers/**/*.json
walkDir('drivers', '.json', (fp) => {
  const content = fs.readFileSync(fp, 'utf8');
  if (/_TZE200_\*|_TZ3000_\*|_TZE204_\*/.test(content)) {
    results.wildcardFPs.push(fp);
  }
});

// Check 4: titleFormatted [[device]]
walkDir('drivers', '.json', (fp) => {
  const content = fs.readFileSync(fp, 'utf8');
  if (/titleFormatted.*\[\[device\]\]/.test(content)) {
    results.titleFormatted.push(fp);
  }
});

// Check 5: UTF-16 JSON loading in lib/
walkDir('lib', '.js', (fp) => {
  const content = fs.readFileSync(fp, 'utf8');
  if (content.includes("JSON.parse(fs.readFileSync") && content.includes("'utf8'")) {
    results.utf16JsonLoading.push(fp);
  }
});

// Check 6: Bare setTimeout/setInterval in drivers device.js
walkDir('drivers', '.js', (fp) => {
  if (!fp.includes('device.js')) return;
  const content = fs.readFileSync(fp, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, i) => {
    const trimmed = line.trim();
    // Skip comment lines (single-line comments and block comment lines)
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;
    if ((line.includes('setTimeout') || line.includes('setInterval')) &&
        !line.includes('this.homey.') &&
        !line.includes('this.device.homey.') &&
        !line.includes('homey.setTimeout') &&
        !line.includes('clearTimeout') &&
        !line.includes('clearInterval')) {
      results.bareTimeout.push(`${fp}:${i+1}: ${trimmed.slice(0,100)}`);
    }
  });
});


// Report
console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║  CI FAILURE AUDIT — Local Analysis');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

let hasFailures = false;

if (results.rawSetCapabilityValue.length > 0) {
  hasFailures = true;
  console.log('❌ Raw setCapabilityValue:', results.rawSetCapabilityValue.length, 'files');
  results.rawSetCapabilityValue.forEach(f => console.log('   ', f));
} else {
  console.log('✅ Raw setCapabilityValue: 0');
}

if (results.consoleLogs.length > 0) {
  hasFailures = true;
  console.log('❌ console.log in drivers:', results.consoleLogs.length, 'files');
  results.consoleLogs.forEach(f => console.log('   ', f));
} else {
  console.log('✅ console.log in drivers: 0');
}

if (results.wildcardFPs.length > 0) {
  hasFailures = true;
  console.log('❌ Wildcard fingerprints:', results.wildcardFPs.length, 'files');
  results.wildcardFPs.forEach(f => console.log('   ', f));
} else {
  console.log('✅ Wildcard fingerprints: 0');
}

if (results.titleFormatted.length > 0) {
  hasFailures = true;
  console.log('❌ titleFormatted [[device]]:', results.titleFormatted.length, 'files');
  results.titleFormatted.forEach(f => console.log('   ', f));
} else {
  console.log('✅ titleFormatted [[device]]: 0');
}

if (results.utf16JsonLoading.length > 0) {
  hasFailures = true;
  console.log('❌ UTF-16 JSON loading in lib/:', results.utf16JsonLoading.length, 'files');
  results.utf16JsonLoading.forEach(f => console.log('   ', f));
} else {
  console.log('✅ UTF-16 JSON loading: 0');
}

if (results.bareTimeout.length > 0) {
  hasFailures = true;
  console.log('❌ Bare setTimeout/setInterval:', results.bareTimeout.length, 'occurrences');
  results.bareTimeout.slice(0, 10).forEach(f => console.log('   ', f));
} else {
  console.log('✅ Bare setTimeout/setInterval: 0');
}

console.log('\n' + (hasFailures ? '❌ FAILURES DETECTED — CI will fail' : '✅ ALL CHECKS PASS — CI should succeed'));

// Save report
const report = { timestamp: new Date().toISOString(), results, hasFailures };
fs.writeFileSync('scripts/audit-ci-report.json', JSON.stringify(report, null, 2));
console.log('\nReport saved: scripts/audit-ci-report.json');

process.exit(hasFailures ? 1 : 0);
