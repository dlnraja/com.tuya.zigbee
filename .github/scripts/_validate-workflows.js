#!/usr/bin/env node
'use strict';
const yaml = require('js-yaml'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', '..');
const dir = path.join(__dirname, '..', 'workflows');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.yml'));
let errors = 0, warnings = 0;

// Get all existing scripts across both script dirs
const scripts = new Set();
try { fs.readdirSync(path.join(__dirname)).forEach(f => scripts.add('.github/scripts/' + f)); } catch {}
try { fs.readdirSync(path.join(root, 'scripts', 'automation')).forEach(f => scripts.add('scripts/automation/' + f)); } catch {}
// Also index top-level scripts
try { fs.readdirSync(path.join(root, 'scripts')).filter(f => f.endsWith('.js')).forEach(f => scripts.add('scripts/' + f)); } catch {}

for (const f of files) {
  const doc = yaml.load(fs.readFileSync(path.join(dir, f), 'utf8'));
  if (!doc || !doc.jobs) continue;
  const jobNames = Object.keys(doc.jobs);

  for (const jn of jobNames) {
    const job = doc.jobs[jn];

    // Check needs refs
    if (job.needs) {
      const needs = Array.isArray(job.needs) ? job.needs : [job.needs];
      for (const n of needs) {
        if (!jobNames.includes(n)) {
          console.log('ERR: ' + f + ' job=' + jn + ' needs non-existent job: ' + n);
          errors++;
        }
      }
    }

    if (!job.steps) continue;

    const stepIds = new Set();
    let hasCheckout = false, hasNode = false, hasNpmInstall = false;

    for (const s of job.steps) {
      if (s.id) stepIds.add(s.id);
      if (s.uses && s.uses.startsWith('actions/checkout')) hasCheckout = true;
      if (s.uses && s.uses.startsWith('actions/setup-node')) hasNode = true;
      if (s.run && /npm (ci|install)/.test(s.run)) hasNpmInstall = true;

      // Check script file refs (all paths)
      if (s.run) {
        const re = /node\s+((?:\.github\/scripts|scripts\/automation|scripts)\/[a-z0-9_.-]+\.js)/g;
        let match;
        while ((match = re.exec(s.run)) !== null) {
          const scriptPath = match[1];
          if (!scripts.has(scriptPath)) {
            console.log('ERR: ' + f + ' step="' + (s.name || '?') + '" refs missing script: ' + scriptPath);
            errors++;
          }
        }
      }

      // Check step ID refs in if conditions
      if (typeof s.if === 'string') {
        const refs = s.if.match(/steps\.([a-z_0-9]+)\./gi) || [];
        for (const ref of refs) {
          const m = ref.match(/steps\.([a-z_0-9]+)\./i);
          if (m) {
            const id = m[1];
            // Forward refs are OK in GHA, but collect for review
          }
        }
      }
    }

    // Check if job runs scripts but missing checkout/node/npm
    const runsScripts = job.steps.some(s => s.run && /node\s+\.github\/scripts/.test(s.run));
    if (runsScripts && !hasCheckout) {
      console.log('ERR: ' + f + ' job=' + jn + ' runs scripts but MISSING actions/checkout');
      errors++;
    }
    if (runsScripts && !hasNode) {
      console.log('WARN: ' + f + ' job=' + jn + ' runs node scripts but no setup-node');
      warnings++;
    }
    if (runsScripts && !hasNpmInstall) {
      console.log('WARN: ' + f + ' job=' + jn + ' runs node scripts but no npm install');
      warnings++;
    }
  }

  // Check step ID forward references within each job
  for (const jn of jobNames) {
    const job = doc.jobs[jn];
    if (!job.steps) continue;
    const allIds = new Set();
    job.steps.forEach(s => { if (s.id) allIds.add(s.id); });

    for (const s of job.steps) {
      if (typeof s.if === 'string') {
        const refs = s.if.match(/steps\.([a-z_0-9]+)\./gi) || [];
        for (const ref of refs) {
          const m = ref.match(/steps\.([a-z_0-9]+)\./i);
          if (m && !allIds.has(m[1])) {
            console.log('ERR: ' + f + ' job=' + jn + ' step="' + (s.name || '?') + '" refs non-existent step ID: ' + m[1]);
            errors++;
          }
        }
      }
      // Also check run: blocks for steps. references
      if (typeof s.run === 'string') {
        const refs = s.run.match(/steps\.([a-z_0-9]+)\./gi) || [];
        for (const ref of refs) {
          const m = ref.match(/steps\.([a-z_0-9]+)\./i);
          if (m && !allIds.has(m[1])) {
            console.log('ERR: ' + f + ' job=' + jn + ' step="' + (s.name || '?') + '" run refs non-existent step ID: ' + m[1]);
            errors++;
          }
        }
      }
    }
  }

  // Check cron schedules
  if (doc.on && doc.on.schedule) {
    const scheds = Array.isArray(doc.on.schedule) ? doc.on.schedule : [doc.on.schedule];
    for (const sc of scheds) {
      const cron = sc.cron || sc;
      if (typeof cron === 'string') {
        const parts = cron.trim().split(/\s+/);
        if (parts.length !== 5) {
          console.log('ERR: ' + f + ' invalid cron (need 5 fields): ' + cron);
          errors++;
        }
      }
    }
  }
}

// Check for cron collisions across workflows
const cronMap = new Map();
for (const f of files) {
  const doc = yaml.load(fs.readFileSync(path.join(dir, f), 'utf8'));
  if (!doc || !doc.on || !doc.on.schedule) continue;
  const scheds = Array.isArray(doc.on.schedule) ? doc.on.schedule : [doc.on.schedule];
  for (const sc of scheds) {
    const cron = (sc.cron || sc || '').trim();
    if (!cronMap.has(cron)) cronMap.set(cron, []);
    cronMap.get(cron).push(f);
  }
}
for (const [cron, wfs] of cronMap) {
  if (wfs.length > 1) {
    console.log('WARN: cron collision "' + cron + '" in: ' + wfs.join(', '));
    warnings++;
  }
}

console.log('\n=== Summary ===');
console.log(files.length + ' files, ' + errors + ' errors, ' + warnings + ' warnings');
if (errors > 0) process.exit(1);
