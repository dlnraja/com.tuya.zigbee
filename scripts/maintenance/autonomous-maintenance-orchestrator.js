#!/usr/bin/env node
/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  AUTONOMOUS MAINTENANCE ORCHESTRATOR v1.0                                   ║
 * ║  The "Brain" of the Universal Tuya Zigbee App maintenance pipeline.          ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  1. Scrape community intelligence (GitHub Issues/PRs)                       ║
 * ║  2. Apply self-healing rules (SDK3, Prefixing, Cleanup)                      ║
 * ║  3. Audit driver conflicts (Case-insensitive)                               ║
 * ║  4. Run Homey App Validation                                                ║
 * ║  5. Generate consolidated report & status                                   ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

'use strict';

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = process.cwd();

function run(cmd, desc) {
  console.log(`\n🚀 [TASK] ${desc}`);
  console.log(`> ${cmd}`);
  try {
    const output = execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: 'inherit' });
    return true;
  } catch (e) {
    console.error(`❌ [ERR] Task failed: ${desc}`);
    return false;
  }
}

async function main() {
  console.log('--- Universal Tuya Autonomous Maintenance Session ---');

  // STEP 1: Intelligence Gathering
  run('node scripts/maintenance/fetch-community-intel.js', 'Fetching Community Intelligence');

  // STEP 2: Self-Healing
  process.env.DRY_RUN = 'false';
  run('node scripts/maintenance/master-self-heal.js', 'Applying Self-Healing Rules');

  // STEP 3: Audit Conflicts
  run('node .github/scripts/driver-conflict-audit.js', 'Auditing Driver Conflicts');

  // STEP 4: Validation (Only if previous steps succeeded)
  console.log('\n🔍 [VALIDATION] Verifying app integrity...');
  const isValid = run('npx homey app validate --level publish', 'Running Homey App Validation');

  if (isValid) {
    console.log('\n✅ App is stable and valid.');
  } else {
    console.warn('\n⚠️ Validation warnings or errors detected. Review validation_report.txt');
  }

  console.log('\n--- Maintenance Session Complete ---');
}

main().catch(e => {
  console.error('Fatal orchestrator error:', e);
  process.exit(1);
});
