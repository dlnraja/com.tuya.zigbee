#!/usr/bin/env node
// validate-continuous-flow.js
const fs = require('fs');

const c = fs.readFileSync('.github/workflows/continuous-flow.yml', 'utf8');
console.log('Size:', c.length, 'bytes,', c.split('\n').length, 'lines');
const checks = [
  ['Has name', /^name:/m.test(c)],
  ['Has on:', /^on:/m.test(c)],
  ['Has schedule', /schedule:/.test(c)],
  ['Has cron', /cron:/.test(c)],
  ['Has workflow_dispatch', /workflow_dispatch:/.test(c)],
  ['Has push trigger', /push:/.test(c)],
  ['Has concurrency', /concurrency:/.test(c)],
  ['Has cancel-in-progress', /cancel-in-progress: true/.test(c)],
  ['Has timeout-minutes', /timeout-minutes:/.test(c)],
  ['Has jobs:', /^jobs:/m.test(c)],
  ['Has ubuntu-latest', /ubuntu-latest/.test(c)],
  ['Has continue-on-error', /continue-on-error: true/.test(c)],
  ['Has actions/checkout', /actions\/checkout@v4/.test(c)],
  ['Has actions/setup-node', /actions\/setup-node@v4/.test(c)],
  ['Has upload-artifact', /actions\/upload-artifact@v4/.test(c)],
  ['No secrets hardcoded', !/secrets\.[A-Z_]+$/.test(c.replace(/#.*/g, '').replace(/--.*/g, ''))],
  ['Has cache: npm', /cache: 'npm'/.test(c)],
  ['Has max_mfrs input', /max_mfrs/.test(c)],
  ['Has DRY_RUN env', /DRY_RUN/.test(c)],
];
let pass = 0, fail = 0;
for (const [name, ok] of checks) {
  console.log((ok ? '  PASS' : '  FAIL') + ' ' + name);
  if (ok) pass++; else fail++;
}
console.log('Result:', pass + '/' + checks.length, 'passed');
