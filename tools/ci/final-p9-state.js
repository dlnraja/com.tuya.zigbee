#!/usr/bin/env node
// final-p9-state.js
const fs = require('fs');
const path = require('path');
const wf = '.github/workflows';
const active = fs.readdirSync(wf).filter(f => (f.endsWith('.yml') || f.endsWith('.yaml')) && !f.startsWith('.'));
const disabled = fs.readdirSync(path.join(wf, '.disabled')).filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));
const cfPath = path.join(wf, 'continuous-flow.yml');
const cfSize = fs.existsSync(cfPath) ? fs.statSync(cfPath).size : 0;
console.log('Active workflows:', active.length);
console.log('Disabled workflows:', disabled.length);
console.log('Total (active + disabled):', active.length + disabled.length);
console.log('continuous-flow.yml:', cfSize, 'bytes');
console.log();
console.log('=== ACTIVE WORKFLOWS ===');
for (const f of active.sort()) {
  const c = fs.readFileSync(path.join(wf, f), 'utf8');
  const sched = /schedule:/.test(c);
  const cronRegex = /cron:\s*['"]([^'"]+)['"]/;
  const cronMatch = c.match(cronRegex);
  const cron = cronMatch ? cronMatch[1] : null;
  const size = (fs.statSync(path.join(wf, f)).size / 1024).toFixed(1);
  console.log('  ' + (sched ? '[S]' : '[ ]') + ' ' + f + ' (' + size + ' KB)' + (cron ? ' cron=' + cron : ''));
}
console.log();
console.log('=== SCHEDULED (active) ===');
let sCount = 0;
for (const f of active) {
  const c = fs.readFileSync(path.join(wf, f), 'utf8');
  if (/schedule:/.test(c)) {
    const cronMatch = c.match(/cron:\s*['"]([^'"]+)['"]/);
    console.log('  ' + f + ' cron=' + (cronMatch ? cronMatch[1] : '?'));
    sCount++;
  }
}
console.log('Total scheduled:', sCount);
