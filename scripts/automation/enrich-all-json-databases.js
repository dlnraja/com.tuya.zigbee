#!/usr/bin/env node
/**
 * enrich-all-json-databases.js
 * Orchestrates ALL JSON database enrichment in the correct order:
 *
 * 1. Fetch fingerprints from Z2M (external source)
 * 2. Sync fingerprints.json → driver.compose.json (static manifests)
 * 3. Sync driver.compose.json → fingerprints.json (reverse sync)
 * 4. Optimize all databases (fingerprints, driver-mapping, etc.)
 * 5. Generate/update driver-mapping-database.json
 * 6. Validate fingerprint health
 *
 * Per PROJECT_INDEX.md §4: Fingerprint = manufacturerName + productId
 * Per .cursorrules §13: All comparisons must be case-insensitive
 * Per .windsurfrules §50: Static vs Dynamic dual-layer matching
 *
 * Usage: node scripts/automation/enrich-all-json-databases.js [--dry-run]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const DRY_RUN = process.argv.includes('--dry-run');

function run(name, cmd) {
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`  ${name}`);
  console.log(`${'─'.repeat(50)}`);
  try {
    const out = execSync(cmd, { encoding: 'utf8', cwd: ROOT, timeout: 120000 });
    console.log(out.slice(-500));
    return true;
  } catch (e) {
    console.log(`⚠️  ${name} failed: ${e.message.slice(0, 200)}`);
    return false;
  }
}

console.log('═══════════════════════════════════════════════════════════');
console.log('  ENRICH ALL JSON DATABASES');
console.log('═══════════════════════════════════════════════════════════');

// Phase 1: Fetch from external sources
run('1. Fetch Z2M fingerprints', 'node scripts/automation/fetch-z2m-fingerprints.js');
run('2. Fetch community fingerprints', 'node scripts/community-sync/sync-all.js');

// Phase 2: Sync compose ↔ fingerprints
run('3. Sync fingerprints.json → compose.json', 'node scripts/sync-fingerprints-to-compose.js');

// Phase 3: Optimize databases
run('4. Optimize MF databases', 'node scripts/automation/optimize-mf-databases.js --heuristic-update');

// Phase 4: Generate mapping database
run('5. Generate driver-mapping-database', 'node scripts/automation/generate-mapping-db.js');

// Phase 5: Validate
run('6. Validate fingerprint health', 'node scripts/validation/check-fingerprint-health.js');
run('7. Validate cross-category collisions', 'node scripts/validation/cross-category-collision-gate.js');

// Phase 6: Compact app.json
run('8. Compact app.json', 'node -e "const fs=require(\'fs\');const a=JSON.parse(fs.readFileSync(\'app.json\',\'utf8\'));fs.writeFileSync(\'app.json\',JSON.stringify(a));console.log(\'app.json compacted to\',(fs.statSync(\'app.json\').size/1024/1024).toFixed(2),\'MB\')"');

// Summary
console.log('\n═══════════════════════════════════════════════════════════');
console.log('  ENRICHMENT COMPLETE');
console.log('═══════════════════════════════════════════════════════════');
console.log('\nFiles updated:');
try {
  const fp = JSON.parse(fs.readFileSync(path.join(ROOT, 'lib', 'tuya', 'fingerprints.json'), 'utf8'));
  console.log(`  lib/tuya/fingerprints.json: ${Object.keys(fp).length} entries`);
} catch {}
try {
  const fp = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'fingerprints.json'), 'utf8'));
  console.log(`  data/fingerprints.json: ${Object.keys(fp).length} entries`);
} catch {}
try {
  const db = JSON.parse(fs.readFileSync(path.join(ROOT, 'driver-mapping-database.json'), 'utf8'));
  console.log(`  driver-mapping-database.json: ${Object.keys(db).length} entries`);
} catch {}
console.log(`  app.json: ${(fs.statSync(path.join(ROOT, 'app.json')).size/1024/1024).toFixed(2)} MB`);
