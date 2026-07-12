#!/usr/bin/env node
// audit-workflows.js
const fs = require('fs');
const path = require('path');

const dir = '.github/workflows';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));
console.log('=== EXISTING WORKFLOWS ===');
console.log('Total:', files.length);
console.log();

const scheduleWorkflows = [];
const onDemandWorkflows = [];
for (const f of files) {
  const c = fs.readFileSync(path.join(dir, f), 'utf8');
  const size = c.length;
  const lines = c.split('\n').length;
  const hasSchedule = /schedule:/.test(c);
  const hasPush = /push:/.test(c);
  const hasPR = /pull_request:/.test(c);
  const hasDispatch = /workflow_dispatch:/.test(c);
  const hasWorkflowCall = /workflow_call:/.test(c);
  const hasCron = /cron:/.test(c);
  const concurrency = /concurrency:/.test(c);
  const cronRegex = /cron:\s*['"]([^'"]+)['"]/;
  const cronMatch = c.match(cronRegex);
  const triggers = [];
  if (hasSchedule) triggers.push('schedule');
  if (hasPush) triggers.push('push');
  if (hasPR) triggers.push('PR');
  if (hasDispatch) triggers.push('manual');
  if (hasWorkflowCall) triggers.push('reusable');
  const info = { f, size, lines, triggers: triggers.join('+'), hasCron, hasConcurrency: concurrency };
  if (hasCron) info.cron = cronMatch ? cronMatch[1] : '?';
  if (hasSchedule || hasCron) scheduleWorkflows.push(info);
  else onDemandWorkflows.push(info);
  console.log('  ' + f + ' (' + size + 'B, ' + lines + 'L): ' + triggers.join('+') + (hasCron ? ' cron=' + (cronMatch ? cronMatch[1] : '?') : '') + (concurrency ? ' [concurrency]' : ''));
}
console.log();
console.log('=== SCHEDULED ===');
for (const w of scheduleWorkflows) console.log('  ' + w.f + ': cron=' + w.cron + ' triggers=' + w.triggers);
console.log();
console.log('=== ON-DEMAND ===');
for (const w of onDemandWorkflows) console.log('  ' + w.f + ': triggers=' + w.triggers);
