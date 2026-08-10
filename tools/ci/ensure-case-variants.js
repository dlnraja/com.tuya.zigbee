#!/usr/bin/env node
/**
 * ensure-case-variants.js (P99)
 *
 * Homey compose fingerprint matching is case-sensitive at the string level.
 * Runtime matching uses TuyaNormalizer (case-insensitive). This script bridges
 * both worlds by ensuring each manufacturerName has Homey-critical forms:
 *   - canonical: _TZ3000_abcdef
 *   - lowercase: _tz3000_abcdef
 *
 * Usage:
 *   node tools/ci/ensure-case-variants.js              # dry-run report
 *   node tools/ci/ensure-case-variants.js --apply       # write drivers
 *   node tools/ci/ensure-case-variants.js --root PATH
 *   node tools/ci/ensure-case-variants.js --driver switch_2gang
 */
'use strict';

const fs = require('fs');
const path = require('path');
const {
  mergeManufacturerCaseVariants,
  pairingCaseVariants,
  normalize,
} = require('../../lib/utils/TuyaNormalizer');

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const rootIdx = args.indexOf('--root');
const ROOT = rootIdx >= 0 ? args[rootIdx + 1] : path.resolve(__dirname, '..', '..');
const driverIdx = args.indexOf('--driver');
const ONLY_DRIVER = driverIdx >= 0 ? args[driverIdx + 1] : null;

function listDrivers() {
  const dir = path.join(ROOT, 'drivers');
  return fs.readdirSync(dir).filter((d) => {
    if (ONLY_DRIVER && d !== ONLY_DRIVER) return false;
    return fs.existsSync(path.join(dir, d, 'driver.compose.json'));
  });
}

function main() {
  console.log('═══════════════════════════════════════════════');
  console.log('  Ensure Homey case variants (P99)');
  console.log(`  root: ${ROOT}`);
  console.log(`  mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`);
  console.log('═══════════════════════════════════════════════');

  let filesTouched = 0;
  let totalAdded = 0;
  const samples = [];

  for (const driver of listDrivers()) {
    const f = path.join(ROOT, 'drivers', driver, 'driver.compose.json');
    const j = JSON.parse(fs.readFileSync(f, 'utf8'));
    if (!j.zigbee || !Array.isArray(j.zigbee.manufacturerName)) continue;

    const before = j.zigbee.manufacturerName.length;
    const { list, added } = mergeManufacturerCaseVariants(j.zigbee.manufacturerName);
    if (!added) continue;

    totalAdded += added;
    filesTouched += 1;
    if (samples.length < 12) {
      samples.push(`${driver}: +${added} (was ${before} → ${list.length})`);
    }

    if (APPLY) {
      j.zigbee.manufacturerName = list;
      fs.writeFileSync(f, `${JSON.stringify(j, null, 2)}\n`);
    }
  }

  console.log(`Drivers needing variants: ${filesTouched}`);
  console.log(`Variants to add: ${totalAdded}`);
  for (const s of samples) console.log(`  · ${s}`);
  if (!APPLY && totalAdded > 0) {
    console.log('\nRe-run with --apply to write.');
  }
  console.log('═══════════════════════════════════════════════');

  // Soft coverage sanity: spot-check that pairingCaseVariants works
  const probe = pairingCaseVariants('_TZ3000_ExampleAb');
  if (!probe.includes('_TZ3000_exampleab') || !probe.includes('_tz3000_exampleab')) {
    console.error('Internal probe failed:', probe);
    process.exit(2);
  }

  process.exit(0);
}

main();
