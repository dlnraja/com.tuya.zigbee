#!/usr/bin/env node
/**
 * mirror-ci-grep.js - shared TITAN lifecycle timer gate.
 *
 * Blocks true bare setTimeout/setInterval calls while accepting Homey-managed
 * timers, optional chaining (homey?.setTimeout), and documented module-level
 * native timers where no Homey instance exists.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const jsonMode = process.argv.includes('--json');
const violations = [];
const warnings = [];
const BARE_CALL_RE = /(?<![.$\w])set(?:Timeout|Interval)\s*\(/;
const COMMENT_RE = /^\s*(?:\/\/|\/\*|\*)/;
const NATIVE_TIMER_CONTEXT_RE = /module-level|no device|no homey|native set(?:Timeout|Interval)|process exit|script utility|for API calls in scripts/i;

function walkDir(dir, ext, callback) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !fullPath.includes('node_modules')) {
      walkDir(fullPath, ext, callback);
    } else if (!ext || entry.name.endsWith(ext)) {
      callback(fullPath);
    }
  }
}

function hasNativeTimerContext(lines, index) {
  const start = Math.max(0, index - 4);
  return lines.slice(start, index + 1).some(line => NATIVE_TIMER_CONTEXT_RE.test(line));
}

function inspectFile(fp, scope) {
  const content = fs.readFileSync(fp, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, i) => {
    if (!BARE_CALL_RE.test(line)) return;
    if (COMMENT_RE.test(line)) return;
    if (/clearTimeout|clearInterval/.test(line)) return;

    const entry = {
      scope,
      file: fp.replace(/\\/g, '/'),
      line: i + 1,
      code: line.trim().slice(0, 160)
    };

    if (scope === 'lib' && hasNativeTimerContext(lines, i)) {
      warnings.push(entry);
      return;
    }

    violations.push(entry);
  });
}

walkDir('drivers', '.js', fp => {
  if (path.basename(fp) === 'device.js') inspectFile(fp, 'drivers');
});
walkDir('lib', '.js', fp => inspectFile(fp, 'lib'));

const counts = {
  drivers: violations.filter(v => v.scope === 'drivers').length,
  lib: violations.filter(v => v.scope === 'lib').length,
  documentedNativeLib: warnings.length
};

if (jsonMode) {
  console.log(JSON.stringify({ counts, violations, warnings }, null, 2));
  process.exit(violations.length ? 1 : 0);
}

console.log('\n=== Results ===');
console.log('Bare setTimeout/setInterval in drivers/device.js:', counts.drivers);
console.log('Bare setTimeout/setInterval in lib/*.js:', counts.lib);
console.log('Documented native lib timers:', counts.documentedNativeLib);

for (const warning of warnings) {
  console.log(`[NATIVE-LIB] ${warning.file}:${warning.line}: ${warning.code}`);
}
for (const violation of violations) {
  console.log(`[BARE-${violation.scope.toUpperCase()}] ${violation.file}:${violation.line}: ${violation.code}`);
}

if (violations.length > 0) {
  console.log('\n❌ CI WILL FAIL - bare timers found');
  process.exit(1);
}

  console.log('\n✅ CI lifecycle check should PASS');
