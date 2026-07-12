#!/usr/bin/env node
// validate-all-workflows.js
const fs = require('fs');
const path = require('path');

const wfDir = '.github/workflows';
const files = fs.readdirSync(wfDir).filter(f =>
  (f.endsWith('.yml') || f.endsWith('.yaml')) && !f.startsWith('.'));

const checks = [
  ['Has name', /^name:/m],
  ['Has on:', /^on:/m],
  ['Has jobs:', /^jobs:/m],
  ['Has concurrency', /concurrency:/],
  ['Has timeout-minutes', /timeout-minutes:/],
];

let totalOk = 0, totalFail = 0;
const issues = [];

for (const f of files) {
  const c = fs.readFileSync(path.join(wfDir, f), 'utf8');
  const hasSchedule = /schedule:/.test(c);
  const size = c.length;
  let okCount = 0, failCount = 0;
  for (const [name, regex] of checks) {
    if (regex.test(c)) okCount++;
    else failCount++;
  }
  const score = okCount / checks.length;
  const status = failCount === 0 ? '✓' : (score >= 0.5 ? '⚠️' : '❌');
  console.log(status + ' ' + f + ' (' + size + 'B): ' + okCount + '/' + checks.length);
  totalOk += okCount;
  totalFail += failCount;
  if (failCount > checks.length / 2) {
    issues.push({ f, failCount, size });
  }
}

console.log('\n=== TOTAL ===');
console.log('Checks passed:', totalOk);
console.log('Checks failed:', totalFail);
console.log('Workflows with major issues:', issues.length);
if (issues.length) {
  console.log('\nWorkflows needing attention:');
  for (const i of issues) console.log('  ' + i.f);
}
