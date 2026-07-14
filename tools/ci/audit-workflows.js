// audit-workflows.js — P54 Source of truth audit
// Find cron schedule conflicts, timeout issues, rate limit problems in workflows
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const gitExe = 'C:\\Program Files\\Git\\cmd\\git.exe';
function git(args) { return execFileSync(gitExe, args, { cwd: process.cwd(), encoding: 'utf8' }).toString(); }

const DIR = '.github/workflows';
const files = fs.readdirSync(DIR).filter(f => f.endsWith('.yml'));

console.log('=== Workflow cron schedule audit ===\n');

const cronSchedules = [];

for (const f of files) {
  const content = fs.readFileSync(path.join(DIR, f), 'utf8');
  // Find cron schedules
  const cronRegex = /cron:\s*['"]([^'"]+)['"]/g;
  let match;
  while ((match = cronRegex.exec(content)) !== null) {
    cronSchedules.push({ file: f, cron: match[1] });
  }
}

// Parse cron to find which minute they run
const byMinute = {};
for (const s of cronSchedules) {
  // Format: '0 2 * * *' or similar
  const parts = s.cron.split(/\s+/);
  if (parts.length >= 2) {
    const min = parts[0];
    const hour = parts[1];
    const key = `${hour}:${min === '*' ? '*' : min.padStart(2, '0')}`;
    if (!byMinute[key]) byMinute[key] = [];
    byMinute[key].push(s.file);
  }
}

const sortedKeys = Object.keys(byMinute).sort();
for (const key of sortedKeys) {
  if (byMinute[key].length > 1) {
    console.log(`WARNING: ${byMinute[key].length} workflows at ${key} UTC:`);
    byMinute[key].forEach(f => console.log('  -', f));
  }
}
if (Object.values(byMinute).every(arr => arr.length === 1)) {
  console.log('No cron schedule conflicts detected (no exact-time overlaps)');
}

console.log('\n=== Workflow timeout audit ===\n');
for (const f of files) {
  const content = fs.readFileSync(path.join(DIR, f), 'utf8');
  const tm = content.match(/timeout-minutes:\s*(\d+)/);
  if (tm) {
    console.log(`  ${f}: ${tm[1]} min`);
  }
}

console.log('\n=== Last 5 runs per workflow ===\n');
// Get recent runs
try {
  const runs = git(['log', '--oneline', '--since=1 day ago', '--', '.github/workflows/']);
  console.log('  Workflow changes in last 24h:', (runs.match(/\n/g) || []).length, 'commits');
} catch (e) {
  console.log('  (could not check recent changes)');
}
