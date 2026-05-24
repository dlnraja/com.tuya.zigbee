#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', '..', '.github', 'workflows');

// Workflows that need concurrency added
const needConcurrency = [
  'auto-discovery.yml',
  'check-invalid-paths.yml',
  'diagnostic-anonymizer.yml',
  'enrich-drivers.yml',
  'fleet-intelligence.yml',
  'notifications.yml',
  'stale.yml',
  'syntax-check.yml',
  'syntax-purity-gate.yml',
  'syntax-validation.yml',
  'sync-johan.yml',
  'test-api-keys.yml',
  'unified-ci.yml',
  'unified-intelligence.yml',
  'validate-drivers.yml',
  'verified-publish-and-diagnostics.yml'
];

let fixed = 0;

for (const file of needConcurrency) {
  const fp = path.join(dir, file);
  if (!fs.existsSync(fp)) continue;
  let c = fs.readFileSync(fp, 'utf8');
  if (c.includes('concurrency:')) continue;

  // Add concurrency after permissions block
  const concurrencyBlock = '\nconcurrency:\n  group: ${{ github.workflow }}-${{ github.ref }}\n  cancel-in-progress: true\n';

  if (c.includes('permissions:')) {
    // Find end of permissions block
    const permIdx = c.indexOf('permissions:');
    const lines = c.substring(permIdx).split('\n');
    let insertAfter = 0;
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].match(/^\S/) && lines[i].trim() !== '') { insertAfter = i; break; }
      if (i === lines.length - 1) insertAfter = i;
    }
    const before = c.substring(0, permIdx) + lines.slice(0, insertAfter).join('\n');
    const after = lines.slice(insertAfter).join('\n');
    c = before + concurrencyBlock + after;
    fs.writeFileSync(fp, c);
    console.log('✅ Added concurrency to ' + file);
    fixed++;
  } else {
    // Add after 'on:' block
    const onIdx = c.indexOf('\non:');
    if (onIdx >= 0) {
      const afterOn = c.substring(onIdx + 1);
      const lines = afterOn.split('\n');
      let insertAfter = 0;
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].match(/^\S/) && lines[i].trim() !== '') { insertAfter = i; break; }
        if (i === lines.length - 1) insertAfter = i;
      }
      const before = c.substring(0, onIdx + 1) + lines.slice(0, insertAfter).join('\n');
      const after = lines.slice(insertAfter).join('\n');
      c = before + concurrencyBlock + after;
      fs.writeFileSync(fp, c);
      console.log('✅ Added concurrency to ' + file);
      fixed++;
    }
  }
}

// Fix enrich-drivers.yml schedule (should be weekly, not manual)
const enrichPath = path.join(dir, 'enrich-drivers.yml');
if (fs.existsSync(enrichPath)) {
  let c = fs.readFileSync(enrichPath, 'utf8');
  if (!c.includes('schedule:') && c.includes('workflow_dispatch')) {
    c = c.replace(
      'on:\n  workflow_dispatch:',
      'on:\n  schedule:\n    - cron: \'0 3 * * 1\' # Monday 03:00 UTC\n  workflow_dispatch:'
    );
    fs.writeFileSync(enrichPath, c);
    console.log('✅ Added weekly schedule to enrich-drivers.yml');
    fixed++;
  }
}

console.log('\nTotal fixes:', fixed);