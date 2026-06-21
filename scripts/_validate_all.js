#!/usr/bin/env node
'use strict';
// _validate_all.js — Wrapper de validation pour nightly-auto-process.yml
// Lancé par le workflow nightly. Exécute les validations critiques.
const { execSync } = require('child_process');
const path = require('path');

const checks = [
  { name: 'Mandatory', cmd: 'node scripts/validate/homey-mandatory-check.js' },
  { name: 'Broken requires', cmd: 'node scripts/validation/find-broken-requires.js' },
  { name: 'Driver mesh', cmd: 'node scripts/validation/validate-driver-mesh.js' },
];

let failed = 0;
for (const check of checks) {
  console.log(`\n▶ ${check.name}...`);
  try {
    execSync(check.cmd, { cwd: path.resolve(__dirname, '..'), stdio: 'inherit', timeout: 30000 });
    console.log(`  ✅ ${check.name} OK`);
  } catch (e) {
    console.error(`  ❌ ${check.name} FAILED`);
    failed++;
  }
}

console.log(`\n═══════════════════════════════════════════════`);
console.log(`  ${checks.length - failed}/${checks.length} checks passed`);
console.log(`═══════════════════════════════════════════════`);
process.exit(failed > 0 ? 1 : 0);
