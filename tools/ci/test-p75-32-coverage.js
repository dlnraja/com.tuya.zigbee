#!/usr/bin/env node
// test-p75-32-coverage.js - P75.32: Master test runner for new coverage tests
// Runs all coverage tests and reports a summary
const { execSync } = require('child_process');
const path = require('path');

const tests = [
  { name: 'test-mixin-coverage.js', desc: 'Mixins (SafeCapability, VirtualEnergy, Button, etc.)' },
  { name: 'test-flow-card-coverage.js', desc: 'Flow card modules (Advanced, Feature, Manager, etc.)' },
];

console.log('=== P75.32 Coverage Test Suite ===\n');

let totalPass = 0, totalFail = 0, totalTests = 0;
const failed = [];

for (const t of tests) {
  console.log(`Running ${t.name} (${t.desc})...`);
  try {
    const out = execSync(`node tools/ci/${t.name}`, { encoding: 'utf8', cwd: path.resolve(__dirname, '../..') });
    const lines = out.trim().split('\n');
    // Find final "X passed, Y failed" line
    const lastLine = lines.reverse().find(l => /\d+ passed/.test(l));
    if (lastLine) {
      const m = lastLine.match(/(\d+)\s+passed,\s+(\d+)\s+failed/);
      if (m) {
        const pass = parseInt(m[1]);
        const fail = parseInt(m[2]);
        totalPass += pass;
        totalFail += fail;
        totalTests++;
        if (fail > 0) failed.push(t.name);
        console.log(`  ✓ ${pass} passed, ${fail} failed\n`);
      } else {
        console.log(`  ? (couldn't parse: ${lastLine})\n`);
      }
    } else {
      console.log(`  ? (no result line found)\n`);
    }
  } catch (e) {
    totalFail++;
    failed.push(t.name);
    console.log(`  ✗ ERROR: ${e.message.split('\n')[0]}\n`);
  }
}

console.log('=== P75.32 Coverage Summary ===');
console.log(`Tests run: ${totalTests}`);
console.log(`Total passed: ${totalPass}`);
console.log(`Total failed: ${totalFail}`);
if (failed.length > 0) {
  console.log(`Failed: ${failed.join(', ')}`);
}
process.exit(totalFail > 0 ? 1 : 0);
