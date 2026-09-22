#!/usr/bin/env node
/**
 * ensure-case-variants.js (P99 + P2677)
 *
 * Homey compose fingerprint matching is case-sensitive at the string level.
 * Runtime matching uses TuyaNormalizer (case-insensitive). This script bridges
 * both worlds by ensuring each manufacturerName has Homey-critical forms:
 *   - Tuya: canonical _TZ3000_abcdef + lowercase _tz3000_abcdef
 *   - Brands (HOBEIAN…): Title + UPPER + lower + OCR typos (heobian)
 *   - Retail pids (ZG-301Z-3CH…): exact + lower (+ upper when useful)
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
  pairingProductIdVariants,
  brandAthomForms,
  normalize,
} = require('../../lib/utils/TuyaNormalizer');
const { appendExactIdentityForms } = require('../../lib/enrichment/ComplementaryMerge');

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

function expandProductIds(pids) {
  const out = Array.isArray(pids) ? pids.slice() : [];
  const seen = new Set(out.map(String));
  let added = 0;
  for (const seed of [...out]) {
    for (const v of pairingProductIdVariants(seed)) {
      if (!v || seen.has(v)) continue;
      // Skip pure UPPER of long TS ids (noise); keep ZG-/AY-/WHD retail forms
      if (/^TS[0-9A-Z]+$/i.test(String(seed)) && v === String(seed).toUpperCase() && v !== seed) continue;
      out.push(v);
      seen.add(v);
      added += 1;
    }
  }
  return { list: out, added };
}

function main() {
  console.log('═══════════════════════════════════════════════');
  console.log('  Ensure Homey case variants (P99/P2677)');
  console.log(`  root: ${ROOT}`);
  console.log(`  mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`);
  console.log('═══════════════════════════════════════════════');

  let filesTouched = 0;
  let totalAdded = 0;
  let pidAdded = 0;
  const samples = [];

  for (const driver of listDrivers()) {
    const f = path.join(ROOT, 'drivers', driver, 'driver.compose.json');
    const j = JSON.parse(fs.readFileSync(f, 'utf8'));
    if (!j.zigbee || !Array.isArray(j.zigbee.manufacturerName)) continue;

    const before = j.zigbee.manufacturerName.length;
    const { list, added } = mergeManufacturerCaseVariants(j.zigbee.manufacturerName);

    // WHY(P2677): if any HOBEIAN-family form is present, force full brand Athom set
    const hasHobeian = list.some((m) => normalize(m) === 'hobeian' || normalize(m) === 'heobian');
    let brandExtra = 0;
    let nextList = list;
    if (hasHobeian) {
      const forms = brandAthomForms('HOBEIAN') || [];
      const merged = appendExactIdentityForms(list, forms);
      brandExtra = merged.length - list.length;
      nextList = merged;
    }

    let pidDelta = 0;
    let nextPids = j.zigbee.productId;
    if (Array.isArray(j.zigbee.productId) && (hasHobeian || j.zigbee.productId.some((p) => /^ZG-|^AY|^WHD/i.test(String(p))))) {
      const exp = expandProductIds(j.zigbee.productId);
      pidDelta = exp.added;
      nextPids = exp.list;
    }

    const mfrDelta = (nextList.length - before);
    if (!added && !brandExtra && !pidDelta) continue;

    totalAdded += Math.max(0, mfrDelta);
    pidAdded += pidDelta;
    filesTouched += 1;
    if (samples.length < 16) {
      samples.push(`${driver}: mfr +${mfrDelta} pid +${pidDelta} (mfr ${before}→${nextList.length})`);
    }

    if (APPLY) {
      j.zigbee.manufacturerName = nextList;
      if (pidDelta) j.zigbee.productId = nextPids;
      fs.writeFileSync(f, `${JSON.stringify(j, null, 2)}\n`);
    }
  }

  console.log(`Drivers needing variants: ${filesTouched}`);
  console.log(`Mfr variants to add: ${totalAdded}`);
  console.log(`Pid variants to add: ${pidAdded}`);
  for (const s of samples) console.log(`  · ${s}`);
  if (!APPLY && (totalAdded > 0 || pidAdded > 0)) {
    console.log('\nRe-run with --apply to write.');
  }
  console.log('═══════════════════════════════════════════════');

  // Soft coverage sanity
  const probe = pairingCaseVariants('_TZ3000_ExampleAb');
  if (!probe.includes('_TZ3000_exampleab') || !probe.includes('_tz3000_exampleab')) {
    console.error('Internal probe failed:', probe);
    process.exit(2);
  }
  const hobeian = pairingCaseVariants('HOBEIAN');
  for (const need of ['HOBEIAN', 'hobeian', 'Hobeian', 'heobian']) {
    if (!hobeian.includes(need)) {
      console.error('HOBEIAN brand probe failed:', hobeian);
      process.exit(2);
    }
  }

  process.exit(0);
}

main();
