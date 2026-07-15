#!/usr/bin/env node
'use strict';

/**
 * tools/ci/_fix-zg204-mixed-case.js
 *
 * P64.8 — Fix ALL the remaining stale top-level and lowercase fingerprints
 *        entries for the ZG-204 family that point to wrong drivers.
 *
 * After running _add-missing-zg204-mfrs.js and _fix-zg204-zv-zx-sacred.js,
 * some old entries still point to old drivers (generic_diy, climate_sensor).
 * This script makes all the mixed-case ZG-204 family entries consistent
 * with the new presence_sensor_radar mapping.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const MFS_DB = path.join(ROOT, 'data', 'mfs_db.json');
const TUYA_FP = path.join(ROOT, 'lib', 'tuya', 'fingerprints.json');

const MFR_LIST = [
  // ZG-204 family
  '_TZE200_2aaelwxk', '_TZE204_2aaelwxk', '_TZE284_2aaelwxk',
  '_TZE200_kb5noeto', '_TZE204_kb5noeto', '_TZE284_kb5noeto',
  '_TZE200_3towulqd', '_TZE204_3towulqd', '_TZE284_3towulqd',
  '_TZE200_ar0slwnd', '_TZE204_ar0slwnd', '_TZE284_ar0slwnd',
  '_TZE200_mrf6vtua', '_TZE204_mrf6vtua', '_TZE284_mrf6vtua',
  '_TZE200_sfiy5tfs', '_TZE204_sfiy5tfs', '_TZE284_sfiy5tfs',
  '_TZE200_ka8l86iu', '_TZE204_ka8l86iu', '_TZE284_ka8l86iu',
  '_TZE200_ztc6ggyl', '_TZE201_ztc6ggyl', '_TZE202_ztc6ggyl',
  '_TZE203_ztc6ggyl', '_TZE204_ztc6ggyl', '_TZE284_ztc6ggyl',
  '_TZE200_bh3n6gk8', '_TZE204_bh3n6gk8', '_TZE284_bh3n6gk8',
  '_TZE200_ppuj1vem', '_TZE204_ppuj1vem',
  '_TZE200_aao3yzhs', '_TZE284_aao3yzhs',
  '_TZE200_myd45weu', '_TZE204_myd45weu', '_TZE284_myd45weu',
  '_TZE200_npj9bug3', '_TZE204_npj9bug3', '_TZE284_npj9bug3',
  '_TZE200_awepdiwi', '_TZE204_awepdiwi', '_TZE284_awepdiwi',
  '_TZE200_ga1maeof', '_TZE204_ga1maeof', '_TZE284_ga1maeof',
  '_TZE200_g2e6cpnw', '_TZE204_g2e6cpnw', '_TZE284_g2e6cpnw',
  '_TZE200_sgabhwa6', '_TZE204_sgabhwa6', '_TZE284_sgabhwa6',
  '_TZE200_0ints6wl', '_TZE204_0ints6wl', '_TZE284_0ints6wl',
  '_TZE200_2nhqasjh', '_TZE204_2nhqasjh', '_TZE284_2nhqasjh',
  '_TZE200_tgrzpqf4', '_TZE204_tgrzpqf4', '_TZE284_tgrzpqf4',
  '_TZE200_9cqcpkgb', '_TZE204_9cqcpkgb', '_TZE284_9cqcpkgb',
  '_TZE200_2se8efxh', '_TZE204_2se8efxh', '_TZE284_2se8efxh',
  '_TZE200_dfxkcots', '_TZE204_dfxkcots', '_TZE284_dfxkcots',
  '_TZE200_tyffvoij', '_TZE204_tyffvoij', '_TZE284_tyffvoij',
  '_TZE200_uli8wasj', '_TZE204_uli8wasj', '_TZE284_uli8wasj',
  '_TZE200_grgol3xp', '_TZE204_grgol3xp', '_TZE284_grgol3xp',
  '_TZE200_rhgsbacq', '_TZE204_rhgsbacq', '_TZE284_rhgsbacq',
  '_TZE200_y8jijhba', '_TZE204_y8jijhba', '_TZE284_y8jijhba',
  '_TZE200_w0ap83qu', '_TZE204_w0ap83qu', '_TZE284_w0ap83qu',
];

// Map MFR prefix to driver
const MFR_DRIVERS = {
  // presence family
  '_TZE200_2aaelwxk': 'presence_sensor_radar',
  '_TZE204_2aaelwxk': 'presence_sensor_radar',
  '_TZE284_2aaelwxk': 'presence_sensor_radar',
  '_TZE200_kb5noeto': 'presence_sensor_radar',
  '_TZE204_kb5noeto': 'presence_sensor_radar',
  '_TZE284_kb5noeto': 'presence_sensor_radar',
  '_TZE200_3towulqd': 'presence_sensor_radar',
  '_TZE204_3towulqd': 'presence_sensor_radar',
  '_TZE284_3towulqd': 'presence_sensor_radar',
  '_TZE200_ar0slwnd': 'presence_sensor_radar',
  '_TZE204_ar0slwnd': 'presence_sensor_radar',
  '_TZE284_ar0slwnd': 'presence_sensor_radar',
  '_TZE200_mrf6vtua': 'presence_sensor_radar',
  '_TZE204_mrf6vtua': 'presence_sensor_radar',
  '_TZE284_mrf6vtua': 'presence_sensor_radar',
  '_TZE200_sfiy5tfs': 'presence_sensor_radar',
  '_TZE204_sfiy5tfs': 'presence_sensor_radar',
  '_TZE284_sfiy5tfs': 'presence_sensor_radar',
  '_TZE200_ka8l86iu': 'presence_sensor_radar',
  '_TZE204_ka8l86iu': 'presence_sensor_radar',
  '_TZE284_ka8l86iu': 'presence_sensor_radar',
  '_TZE200_ztc6ggyl': 'presence_sensor_radar',
  '_TZE201_ztc6ggyl': 'presence_sensor_radar',
  '_TZE202_ztc6ggyl': 'presence_sensor_radar',
  '_TZE203_ztc6ggyl': 'presence_sensor_radar',
  '_TZE204_ztc6ggyl': 'presence_sensor_radar',
  '_TZE284_ztc6ggyl': 'presence_sensor_radar',
  '_TZE200_bh3n6gk8': 'presence_sensor_radar',
  '_TZE204_bh3n6gk8': 'presence_sensor_radar',
  '_TZE284_bh3n6gk8': 'presence_sensor_radar',
  '_TZE200_ppuj1vem': 'presence_sensor_radar',
  '_TZE204_ppuj1vem': 'presence_sensor_radar',
  '_TZE200_tyffvoij': 'presence_sensor_radar',
  '_TZE204_tyffvoij': 'presence_sensor_radar',
  '_TZE200_uli8wasj': 'presence_sensor_radar',
  '_TZE204_uli8wasj': 'presence_sensor_radar',
  '_TZE200_grgol3xp': 'presence_sensor_radar',
  '_TZE204_grgol3xp': 'presence_sensor_radar',
  '_TZE200_rhgsbacq': 'presence_sensor_radar',
  '_TZE204_rhgsbacq': 'presence_sensor_radar',
  '_TZE200_y8jijhba': 'presence_sensor_radar',
  '_TZE204_y8jijhba': 'presence_sensor_radar',
  '_TZE200_w0ap83qu': 'presence_sensor_radar',
  '_TZE204_w0ap83qu': 'presence_sensor_radar',
  // soil family
  '_TZE200_aao3yzhs': 'soil_sensor',
  '_TZE284_aao3yzhs': 'soil_sensor',
  '_TZE200_myd45weu': 'soil_sensor',
  '_TZE204_myd45weu': 'soil_sensor',
  '_TZE284_myd45weu': 'soil_sensor',
  '_TZE200_npj9bug3': 'soil_sensor',
  '_TZE204_npj9bug3': 'soil_sensor',
  '_TZE284_npj9bug3': 'soil_sensor',
  '_TZE200_awepdiwi': 'soil_sensor',
  '_TZE204_awepdiwi': 'soil_sensor',
  '_TZE284_awepdiwi': 'soil_sensor',
  '_TZE200_ga1maeof': 'soil_sensor',
  '_TZE204_ga1maeof': 'soil_sensor',
  '_TZE284_ga1maeof': 'soil_sensor',
  '_TZE200_g2e6cpnw': 'soil_sensor',
  '_TZE204_g2e6cpnw': 'soil_sensor',
  '_TZE284_g2e6cpnw': 'soil_sensor',
  '_TZE200_sgabhwa6': 'soil_sensor',
  '_TZE204_sgabhwa6': 'soil_sensor',
  '_TZE284_sgabhwa6': 'soil_sensor',
  '_TZE200_0ints6wl': 'soil_sensor',
  '_TZE204_0ints6wl': 'soil_sensor',
  '_TZE284_0ints6wl': 'soil_sensor',
  '_TZE200_2nhqasjh': 'soil_sensor',
  '_TZE204_2nhqasjh': 'soil_sensor',
  '_TZE284_2nhqasjh': 'soil_sensor',
  '_TZE200_tgrzpqf4': 'soil_sensor',
  '_TZE204_tgrzpqf4': 'soil_sensor',
  '_TZE284_tgrzpqf4': 'soil_sensor',
  // mixed
  '_TZE200_9cqcpkgb': 'presence_sensor_radar',
  '_TZE204_9cqcpkgb': 'presence_sensor_radar',
  '_TZE200_2se8efxh': 'plug_smart',
  '_TZE204_2se8efxh': 'plug_smart',
  '_TZE200_dfxkcots': 'soil_sensor',
  '_TZE204_dfxkcots': 'soil_sensor',
};

const mfs = JSON.parse(fs.readFileSync(MFS_DB, 'utf8'));
const fp = JSON.parse(fs.readFileSync(TUYA_FP, 'utf8'));

let mfsFixed = 0, fpFixed = 0;

// 1. Fix top-level mfs_db entries (all case variants)
for (const [mfr, correctDriver] of Object.entries(MFR_DRIVERS)) {
  // Upper case
  const mfrUpper = mfr.toUpperCase();
  if (mfs[mfrUpper] && mfs[mfrUpper].driverId !== correctDriver) {
    const oldDriver = mfs[mfrUpper].driverId;
    mfs[mfrUpper].driverId = correctDriver;
    mfs[mfrUpper].source = 'p64.8-zg204-mixed-case-fix';
    mfsFixed++;
    console.log(`  ✓ mfs_db top-level ${mfrUpper}: ${oldDriver} → ${correctDriver}`);
  }
  // Lower case
  const mfrLower = mfr.toLowerCase();
  if (mfs[mfrLower] && mfs[mfrLower].driverId !== correctDriver) {
    const oldDriver = mfs[mfrLower].driverId;
    mfs[mfrLower].driverId = correctDriver;
    mfs[mfrLower].source = 'p64.8-zg204-mixed-case-fix';
    mfsFixed++;
    console.log(`  ✓ mfs_db top-level ${mfrLower}: ${oldDriver} → ${correctDriver}`);
  }
}

// 2. Fix fingerprints.json (all case variants)
for (const [mfr, correctDriver] of Object.entries(MFR_DRIVERS)) {
  for (const k of [mfr, mfr.toUpperCase(), mfr.toLowerCase()]) {
    if (fp[k] && fp[k].driverId !== correctDriver) {
      const oldDriver = fp[k].driverId;
      fp[k].driverId = correctDriver;
      fpFixed++;
      console.log(`  ✓ fingerprints.json ${k}: ${oldDriver} → ${correctDriver}`);
    }
  }
}

fs.writeFileSync(MFS_DB, JSON.stringify(mfs, null, 2));
fs.writeFileSync(TUYA_FP, JSON.stringify(fp, null, 2));

console.log(`\n=== Summary ===`);
console.log(`  mfs_db top-level fixed: ${mfsFixed}`);
console.log(`  fingerprints.json fixed: ${fpFixed}`);
