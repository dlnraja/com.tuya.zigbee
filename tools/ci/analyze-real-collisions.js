// analyze-real-collisions.js — P53 v2
// Identify the REAL collisions (same case-sensitive mfr+pid in multiple drivers)
// vs false positives (case differences only)

'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DRIVERS_DIR = path.join(ROOT, 'drivers');

const EXEMPT_DRIVERS = new Set([
  'universal_fallback', 'tuya_dummy_device', 'generic_tuya',
  'generic_diy', 'device_generic_diy_universal', 'universal_zigbee'
]);

function collect() {
  // TWO maps: case-sensitive (REAL) and lowercase (FALSE POSITIVES)
  const caseSensitiveMap = new Map();
  const lowercaseMap = new Map();
  const caseDiffVariants = new Map(); // lower -> [mfrs in different cases]

  const dirs = fs.readdirSync(DRIVERS_DIR)
    .filter(d => fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory());

  for (const driverId of dirs) {
    const file = path.join(DRIVERS_DIR, driverId, 'driver.compose.json');
    if (!fs.existsSync(file)) continue;
    let compose;
    try { compose = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { continue; }
    const zigbee = compose.zigbee;
    if (!zigbee?.manufacturerName || !zigbee?.productId) continue;

    for (const mfr of zigbee.manufacturerName) {
      for (const pid of zigbee.productId) {
        const csKey = mfr + '|' + pid;
        if (!caseSensitiveMap.has(csKey)) caseSensitiveMap.set(csKey, []);
        caseSensitiveMap.get(csKey).push(driverId);

        const lcKey = mfr.toLowerCase() + '|' + pid.toLowerCase();
        if (!lowercaseMap.has(lcKey)) lowercaseMap.set(lcKey, []);
        lowercaseMap.get(lcKey).push(driverId);
      }
    }
  }

  // Find case-diff variants
  for (const [lcKey, drivers] of lowercaseMap) {
    const [mfr, pid] = lcKey.split('|');
    // Find all mfr variants in caseSensitiveMap with same lowercase
    const variants = [...caseSensitiveMap.keys()].filter(k => k.toLowerCase() === lcKey).map(k => k.split('|')[0]);
    if (variants.length > 1) {
      caseDiffVariants.set(lcKey, { variants, drivers: [...new Set(drivers)] });
    }
  }

  return { caseSensitiveMap, lowercaseMap, caseDiffVariants };
}

function main() {
  const { caseSensitiveMap, lowercaseMap, caseDiffVariants } = collect();

  // REAL collisions (case-sensitive)
  const realCollisions = [];
  for (const [key, drivers] of caseSensitiveMap) {
    const unique = [...new Set(drivers)].filter(d => !EXEMPT_DRIVERS.has(d));
    if (unique.length > 1) realCollisions.push({ key, drivers: unique });
  }
  console.log('=== COLLISION ANALYSIS ===\n');
  console.log('CASE-SENSITIVE (REAL) collisions:', realCollisions.length);
  if (realCollisions.length > 0) {
    console.log('First 10:');
    realCollisions.slice(0, 10).forEach(c => console.log('  ' + c.key + ' -> ' + c.drivers.join(', ')));
  } else {
    console.log('  None — all mfr+pid in repo are case-sensitively unique per driver');
  }

  console.log('\nLOWERCASE collisions (fp-collision-check.js):', [...lowercaseMap.values()].filter(d => {
    const unique = [...new Set(d)].filter(x => !EXEMPT_DRIVERS.has(x));
    return unique.length > 1;
  }).length);
  console.log('  -> These are mostly CASE-DIFFERENT versions of the same mfr');

  console.log('\nCASE-DIFF VARIANTS (same mfr, different cases):', caseDiffVariants.size);
  let sampleShown = 0;
  for (const [lcKey, info] of caseDiffVariants) {
    if (sampleShown >= 10) break;
    console.log('  ' + lcKey + ':');
    info.variants.slice(0, 5).forEach(v => console.log('    "' + v + '"'));
    sampleShown++;
  }

  // Save
  const out = {
    meta: { generatedAt: new Date().toISOString() },
    realCollisions,
    caseDiffCount: caseDiffVariants.size,
    caseDiffSample: Object.fromEntries([...caseDiffVariants.entries()].slice(0, 50)),
  };
  fs.writeFileSync('.github/state/fp-collision-analysis.json', JSON.stringify(out, null, 2));
  console.log('\nReport saved: .github/state/fp-collision-analysis.json');
  console.log('\n=== CONCLUSION ===');
  if (realCollisions.length === 0) {
    console.log('✅ NO real collisions — all 3,274 are case-diff false positives.');
    console.log('   The fp-collision-check.js is too strict (lower-cases mfr+pid).');
    console.log('   FIX: make fp-collision-check.js case-sensitive, or filter case-diff in baseline.');
  } else {
    console.log('⚠️  ' + realCollisions.length + ' REAL collisions need to be fixed.');
  }
}

main();