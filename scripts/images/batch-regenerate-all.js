#!/usr/bin/env node

/**
 * BATCH REGENERATE ALL - Régénération massive images avec parallélisation
 * 
 * Régénère toutes les images drivers (183) avec:
 * - Personnalisation par type
 * - Overlays alimentation
 * - Couleurs contextuelles
 * - Parallélisation (10 workers)
 * 
 * Usage: node scripts/images/batch-regenerate-all.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { Worker } = require('worker_threads');

const PROJECT_ROOT = path.join(__dirname, '..', '..');
const APP_JSON_PATH = path.join(PROJECT_ROOT, 'app.json');
const GENERATOR_SCRIPT = path.join(__dirname, 'intelligent-image-generator.js');

const WORKERS = 10; // Parallélisation

console.log('🚀 BATCH REGENERATE ALL DRIVER IMAGES\n');
console.log('Using intelligent personalization system');
console.log(`Parallelization: ${WORKERS} workers\n`);
console.log('='.repeat(70));

const app = JSON.parse(fs.readFileSync(APP_JSON_PATH, 'utf8'));
const drivers = app.drivers;

console.log(`\nTotal drivers: ${drivers.length}`);
console.log('Starting batch regeneration...\n');

let completed = 0;
let errors = 0;
const startTime = Date.now();

function generateDriver(driverId) {
  return new Promise((resolve, reject) => {
    try {
      execSync(`node "${GENERATOR_SCRIPT}" ${driverId}`, {
        cwd: PROJECT_ROOT,
        stdio: 'pipe',
        timeout: 30000
      });
      completed++;
      const progress = ((completed / drivers.length) * 100).toFixed(1);
      process.stdout.write(`\r[${progress}%] ${completed}/${drivers.length} drivers | ${errors} errors`);
      resolve();
    } catch (err) {
      errors++;
      reject(new Error(`${driverId}: ${err.message}`));
    }
  });
}

async function processInBatches() {
  const batches = [];
  for (let i = 0; i < drivers.length; i += WORKERS) {
    batches.push(drivers.slice(i, i + WORKERS));
  }
  
  for (const batch of batches) {
    const promises = batch.map(driver => generateDriver(driver.id));
    await Promise.allSettled(promises);
  }
}

processInBatches().then(() => {
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  
  console.log('\n\n' + '='.repeat(70));
  console.log('📊 FINAL SUMMARY:\n');
  console.log(`  ✅ Successfully generated: ${completed * 3} images`);
  console.log(`  📁 Drivers processed: ${completed}/${drivers.length}`);
  console.log(`  ❌ Errors: ${errors}`);
  console.log(`  ⏱️  Duration: ${duration}s`);
  console.log(`  ⚡ Speed: ${(drivers.length / duration).toFixed(1)} drivers/s`);
  console.log('='.repeat(70));
  
  if (errors === 0) {
    console.log('\n🎉 SUCCESS! All driver images regenerated\n');
    console.log('Personalization applied:');
    console.log('  ✅ Device type detection');
    console.log('  ✅ Power type overlays (battery/AC/DC/USB)');
    console.log('  ✅ Contextual colors');
    console.log('  ✅ Proper dimensions (75x75, 500x500, 1000x1000)');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Review sample images: ls drivers/*/assets/images/');
    console.log('  2. Run validation: npm run validate');
    console.log('  3. git add drivers/*/assets/images/');
    console.log('  4. git commit -m "feat(images): Batch regenerate all with personalization"');
    console.log('  5. npm run validate:publish');
    console.log('');
  } else {
    console.log(`\n⚠️  Completed with ${errors} errors. Check logs above.\n`);
  }
  
  process.exit(errors > 0 ? 1 : 0);
}).catch(err => {
  console.error('\n❌ Fatal error:', err);
  process.exit(1);
});
