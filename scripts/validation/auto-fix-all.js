#!/usr/bin/env node
'use strict';
// ═══════════════════════════════════════════════════════════════════
// auto-fix-all.js — Script MAÎTRE d'automatisation
// Exécute TOUS les fixes automatiques en une seule commande.
// À utiliser en pre-commit hook ou CI.
// ═══════════════════════════════════════════════════════════════════
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
let fixes = 0;
let errors = 0;

function run(name, cmd) {
  try {
    execSync(cmd, { cwd: ROOT, stdio: 'pipe', timeout: 30000 });
    console.log(`  ✅ ${name}`);
    fixes++;
  } catch (e) {
    console.log(`  ⚠️  ${name}: ${e.message.slice(0, 80)}`);
    errors++;
  }
}

function fixJSON(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    fixes++;
  } catch (e) {
    console.log(`  ❌ ${name}: ${e.message.slice(0, 80)}`);
    errors++;
  }
}

console.log('═══════════════════════════════════════════════');
console.log('  🤖 AUTO-FIX-ALL — Automated Fixes Pipeline');
console.log('═══════════════════════════════════════════════\n');

// 1. Fix sdk/sdkVersion conflict — canonical SDK3 field is `sdk` (number),
//    per apps.developer.homey.app/the-basics/app/manifest. The earlier
//    "fix" DELETED `sdk` (treating it as the wrong field) which broke
//    validation. Correct behavior: keep `sdk`, drop legacy `sdkVersion`.
fixJSON('sdk/sdkVersion normalization', () => {
  for (const p of ['.homeycompose/app.json', 'app.json']) {
    const fp = path.join(ROOT, p);
    if (!fs.existsSync(fp)) continue;
    const c = JSON.parse(fs.readFileSync(fp, 'utf8'));
    let changed = false;
    if ('sdkVersion' in c && !('sdk' in c)) {
      c.sdk = c.sdkVersion; // promote legacy sdkVersion -> sdk
      delete c.sdkVersion;
      changed = true;
    } else if ('sdkVersion' in c && 'sdk' in c) {
      delete c.sdkVersion; // both present: keep sdk, drop sdkVersion
      changed = true;
    } else if (!('sdk' in c) && !('sdkVersion' in c)) {
      c.sdk = 3; // neither present: default to SDK3
      changed = true;
    }
    // Do NOT delete sdk — it is the canonical field.
    if (changed) fs.writeFileSync(fp, JSON.stringify(c, null, 2) + '\n', 'utf8');
  }
});

// 2. Fix button.X setable:false
fixJSON('button.X setable:false', () => {
  const { execSync } = require('child_process');
  execSync('node scripts/validation/fix-button-capability-options.js --apply', { cwd: ROOT, stdio: 'pipe', timeout: 30000 });
});

// 3. Fix button.X in compiled app.json
fixJSON('app.json button.X setable', () => {
  const fp = path.join(ROOT, 'app.json');
  const c = JSON.parse(fs.readFileSync(fp, 'utf8'));
  let fixed = 0;
  for (const d of c.drivers || []) {
    const opts = d.capabilitiesOptions || {};
    for (const [cap, o] of Object.entries(opts)) {
      if (cap.startsWith('button.') && o.setable !== false) {
        o.setable = false; o.maintenanceAction = true; o.getable = false;
        fixed++;
      }
    }
    for (const cap of (d.capabilities || [])) {
      if (cap.startsWith('button.') && !(cap in opts)) {
        opts[cap] = { setable: false, maintenanceAction: true, getable: false };
        fixed++;
      }
    }
    d.capabilitiesOptions = opts;
  }
  if (fixed > 0) fs.writeFileSync(fp, JSON.stringify(c, null, 2) + '\n', 'utf8');
});

// 4. Fix broken require() paths
run('Broken require() paths', 'node scripts/validation/find-broken-requires.js');

// 5. Fix flow card spam
run('Flow card spam', 'node scripts/validation/fix-flow-card-spam.js --apply');

// 6. Ensure case variants
run('Case variants (HOBEIAN etc)', 'node scripts/validation/ensure-case-variants.js --apply');

// 7. Pre-commit FP sync check
run('FP sync (compose↔app.json)', 'node scripts/validation/pre-commit-fp-sync.js');

// 8. Validate driver mesh (Polos)
run('Driver mesh validator', 'node scripts/validation/validate-driver-mesh.js');

// 9. HOBEIAN consistency
run('HOBEIAN consistency', 'node scripts/diag/hobeian-consistency-check.js');

// 10. Mandatory check
run('Mandatory check (M01-M51)', 'node scripts/validate/homey-mandatory-check.js');

console.log('\n═══════════════════════════════════════════════');
console.log(`  ✅ Fixes appliqués: ${fixes}`);
console.log(`  ❌ Erreurs: ${errors}`);
console.log('═══════════════════════════════════════════════');
process.exit(errors > 0 ? 1 : 0);
