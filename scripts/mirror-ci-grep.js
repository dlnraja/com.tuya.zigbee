#!/usr/bin/env node
/**
 * mirror-ci-grep.js — Exact mirror of syntax-check.yml TITAN lifecycle grep
 * to reproduce CI behavior locally
 */
'use strict';
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Windows doesn't have bash grep, but we can mimic with Node.js
let bareTimeout = 0;
let bareTimeoutLib = 0;

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

// Check 7: bare setTimeout in device.js (exact CI grep logic)
// grep -rn "setTimeout\|setInterval" drivers/ --include="device.js"
// | grep -v "this\.homey\." | grep -v "clearTimeout\|clearInterval" | grep -v "// "
walkDir('drivers', '.js', (fp) => {
  if (!path.basename(fp).endsWith('device.js')) return;
  const content = fs.readFileSync(fp, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, i) => {
    if (/(setTimeout|setInterval)/.test(line)) {
      // Apply same grep -v filters as CI
      if (line.includes('this.homey.')) return;
      if (/clearTimeout|clearInterval/.test(line)) return;
      if (line.includes('// ')) return;
      // NOT filtering block comment lines (* ) — that's what the CI does!
      bareTimeout++;
      console.log(`[BARE-DRIVER] ${fp}:${i+1}: ${line.trim().slice(0,100)}`);
    }
  });
});

// Check 8: bare setTimeout in lib/*.js (exact CI grep logic)
// grep -rn "setTimeout\|setInterval" lib/ --include="*.js"
// | grep -v "this\.homey\." | grep -v "this\.device\.homey\." | grep -v "homey\.setTimeout\|homey\.setInterval"
// | grep -v "clearTimeout\|clearInterval" | grep -v "// "
walkDir('lib', '.js', (fp) => {
  const content = fs.readFileSync(fp, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, i) => {
    if (/(setTimeout|setInterval)/.test(line)) {
      if (line.includes('this.homey.')) return;
      if (line.includes('this.device.homey.')) return;
      if (/homey\.setTimeout|homey\.setInterval/.test(line)) return;
      if (/clearTimeout|clearInterval/.test(line)) return;
      if (line.includes('// ')) return;
      // NOT filtering block comment lines (* ) — CI doesn't either!
      bareTimeoutLib++;
      console.log(`[BARE-LIB] ${fp}:${i+1}: ${line.trim().slice(0,100)}`);
    }
  });
});

console.log('\n=== Results ===');
console.log('Bare setTimeout in drivers/device.js:', bareTimeout);
console.log('Bare setTimeout in lib/*.js:', bareTimeoutLib);

if (bareTimeout > 0 || bareTimeoutLib > 0) {
  console.log('\n❌ CI WILL FAIL — bare timers found');
  process.exit(1);
} else {
  console.log('\n✅ CI lifecycle check should PASS');
}
