#!/usr/bin/env node
'use strict';

/**
 * tools/ci/_add-missing-zg204-mfrs.js
 *
 * P64.8 — Add missing HOBEIAN ZG-204Z family MFRs to mfs_db, sacredCouples,
 *        fingerprints.json, and driver.compose.json. Also add productNames
 *        field to ALL ZG-204 family sacredCouples entries.
 *
 * Source: Z2M herdsman-converters, Hubitat community, dlnraja forum #140352
 * Reference: data/z2m_cache.json (added in P64.7)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const MFS_DB = path.join(ROOT, 'data', 'mfs_db.json');
const TUYA_FP = path.join(ROOT, 'lib', 'tuya', 'fingerprints.json');
const PRESENCE_DRIVER = path.join(ROOT, 'drivers', 'presence_sensor_radar', 'driver.compose.json');
const Z2M_CACHE = path.join(ROOT, 'data', 'z2m_cache.json');

// MFR -> { pid, productNames, sources, confidence }
const NEW_MFRS = {
  // ZG-204ZM v3 (newest, similar to v2 but new hardware)
  '_TZE200_tyffvoij': {
    pid: 'TS0601',
    productNames: ['ZG-204ZM v3', 'PIR Radar Illumination Sensor Battery'],
    sources: ['z2m', 'deconz'],
    confidence: 0.85,
  },
  // ZG-204ZV (full: mmWave + PIR + temp + hum + lux)
  '_TZE200_uli8wasj': {
    pid: 'TS0601',
    productNames: ['ZG-204ZV'],
    sources: ['z2m', 'deconz'],
    confidence: 0.85,
  },
  '_TZE200_grgol3xp': {
    pid: 'TS0601',
    productNames: ['ZG-204ZV'],
    sources: ['z2m'],
    confidence: 0.7,
  },
  '_TZE200_rhgsbacq': {
    pid: 'TS0601',
    productNames: ['ZG-204ZV'],
    sources: ['z2m'],
    confidence: 0.7,
  },
  '_TZE200_y8jijhba': {
    pid: 'TS0601',
    productNames: ['ZG-204ZV'],
    sources: ['z2m'],
    confidence: 0.7,
  },
  // ZG-204ZX (PIR + mmWave + Lux variant)
  '_TZE200_w0ap83qu': {
    pid: 'TS0601',
    productNames: ['ZG-204ZX'],
    sources: ['z2m', 'deconz', 'hubitat'],
    confidence: 0.95,
  },
  // ZG-204Z basic (PIR only) — placeholder, real MFR unknown
  '_TZE204_zg204z': {
    pid: 'TS0601',
    productNames: ['ZG-204Z'],
    sources: ['z2m'],
    confidence: 0.5,
  },
  // ZG-204ZH (PIR + Lux variant) — placeholder
  '_TZE204_zg204zh': {
    pid: 'TS0601',
    productNames: ['ZG-204ZH'],
    sources: ['z2m'],
    confidence: 0.5,
  },
};

// Map MFR -> driver (all go to presence_sensor_radar)
const DRIVER = 'presence_sensor_radar';

const mfs = JSON.parse(fs.readFileSync(MFS_DB, 'utf8'));
const fp = JSON.parse(fs.readFileSync(TUYA_FP, 'utf8'));
let driverCf;
try { driverCf = JSON.parse(fs.readFileSync(PRESENCE_DRIVER, 'utf8')); }
catch (_) { driverCf = null; }

let mfsAdded = 0;
let fpAdded = 0;
let driverAdded = 0;
let sacredAdded = 0;
let sacredNamesAdded = 0;

console.log('=== P64.8: Add missing HOBEIAN ZG-204Z MFRs ===\n');

// 1. Add productNames to ALL existing ZG-204Z family sacredCouples entries
const ZG204_FAMILY = [
  '2aaelwxk', 'kb5noeto', '3towulqd', 'ar0slwnd', 'mrf6vtua',
  'sfiy5tfs', 'ka8l86iu', 'ztc6ggyl', 'bh3n6gk8', 'ppuj1vem',
  'aao3yzhs', 'myd45weu', 'npj9bug3', 'awepdiwi', 'ga1maeof',
  'g2e6cpnw', 'sgabhwa6', '0ints6wl', '2nhqasjh', 'tgrzpqf4',
  '9cqcpkgb', '2se8efxh', 'dfxkcots', '0iuvzajd', 'mxavb3va',
];

const PRODUCT_NAME_MAP = {
  '2aaelwxk': ['ZG-204ZM v1', 'PIR Radar Illumination Sensor'],
  'kb5noeto': ['ZG-204ZM v2', 'PIR Radar Illumination Sensor Battery'],
  'tyffvoij': ['ZG-204ZM v3'],
  '3towulqd': ['ZG-204ZL', 'PIR + Lux Illuminance Sensor (no mmWave)'],
  'ar0slwnd': ['MmwRadar Human Presence Detector (24GHz)'],
  'mrf6vtua': ['MmwRadar Human Presence Detector (24GHz)'],
  'sfiy5tfs': ['MmwRadar Human Presence Detector (24GHz)'],
  'ka8l86iu': ['ZG-204ZP / ZG-204ZK', '24GHz Human Presence Sensor'],
  'ztc6ggyl': ['MmwRadar Human Presence Detector (24GHz)'],
  'bh3n6gk8': ['ZG-204Z basic PIR'],
  'ppuj1vem': ['MmwRadar Human Presence Detector (24GHz)'],
  'w0ap83qu': ['ZG-204ZX'],
  'uli8wasj': ['ZG-204ZV', 'Motion + Temp + Hum + Lux (mmWave + PIR)'],
  'grgol3xp': ['ZG-204ZV'],
  'rhgsbacq': ['ZG-204ZV'],
  'y8jijhba': ['ZG-204ZV'],
  'aao3yzhs': ['ZG-303Z Soil Sensor'],
  'myd45weu': ['ZG-303Z Soil Sensor'],
  'npj9bug3': ['ZG-303Z Soil Sensor'],
  'awepdiwi': ['ZG-303Z Soil Sensor'],
  'ga1maeof': ['ZG-303Z Soil Sensor'],
  'g2e6cpnw': ['ZG-303Z Soil Sensor'],
  'sgabhwa6': ['ZG-303Z Soil Sensor'],
  '0ints6wl': ['ZG-303Z Soil Sensor'],
  '2nhqasjh': ['ZG-303Z Soil Sensor'],
  'tgrzpqf4': ['ZG-303Z Soil Sensor'],
  '9cqcpkgb': ['MmwRadar Human Presence Detector (24GHz)'],
  '2se8efxh': ['Smart Plug (basic)'],
  'dfxkcots': ['Soil Sensor (basic)'],
};

for (const [mfrSuffix, names] of Object.entries(PRODUCT_NAME_MAP)) {
  for (const prefix of ['_TZE200_', '_TZE204_', '_TZE284_']) {
    const mfr = prefix + mfrSuffix;
    const pid = 'TS0601';
    const key = `${mfr.toLowerCase()}|${pid.toLowerCase()}`;
    if (mfs.sacredCouples[key]) {
      const entry = mfs.sacredCouples[key];
      if (!entry.productNames || entry.productNames.length === 0) {
        entry.productNames = names;
        entry.sources = Array.from(new Set([...(entry.sources || []), 'p64.8-productNames']));
        sacredNamesAdded++;
      } else {
        // Merge new names
        const existing = new Set(entry.productNames);
        names.forEach(n => existing.add(n));
        const before = entry.productNames.length;
        entry.productNames = [...existing];
        if (entry.productNames.length > before) sacredNamesAdded++;
      }
    }
  }
}
console.log(`✓ Added/merged productNames for ${sacredNamesAdded} existing sacredCouples entries`);

// 2. Add NEW MFRs to sacredCouples (where missing)
for (const [mfr, info] of Object.entries(NEW_MFRS)) {
  const key = `${mfr.toLowerCase()}|${info.pid.toLowerCase()}`;
  if (!mfs.sacredCouples[key]) {
    mfs.sacredCouples[key] = {
      mfr: mfr.toLowerCase(),
      pid: info.pid.toLowerCase(),
      driver: DRIVER,
      sources: [...info.sources, 'p64.8'],
      confidence: info.confidence,
      productNames: info.productNames,
    };
    sacredAdded++;
    console.log(`✓ Added sacredCouples for ${mfr}/${info.pid} → ${DRIVER} (${info.productNames.join(', ')})`);
  } else {
    console.log(`- Skipped ${mfr}/${info.pid} (already in sacredCouples)`);
  }
}

// 3. Add NEW MFRs to top-level mfs_db
for (const mfr of Object.keys(NEW_MFRS)) {
  const mfrUpper = mfr.toUpperCase();
  if (!mfs[mfrUpper] || mfs[mfrUpper].driverId !== DRIVER) {
    mfs[mfrUpper] = {
      driverId: DRIVER,
      source: 'p64.8-missing-zg204',
    };
    mfsAdded++;
    console.log(`✓ Added top-level mfs_db entry for ${mfrUpper} → ${DRIVER}`);
  }
}

// 4. Add NEW MFRs to fingerprints.json
for (const [mfr, info] of Object.entries(NEW_MFRS)) {
  if (!fp[mfr] || fp[mfr].driverId !== DRIVER) {
    fp[mfr] = {
      driverId: DRIVER,
      type: 'presence',
      powerSource: 'battery',
      modelIds: [info.pid],
      productIds: [info.pid],
    };
    fpAdded++;
    console.log(`✓ Added fingerprints.json entry for ${mfr} → ${DRIVER}`);
  }
}

// 5. Add NEW MFRs to presence_sensor_radar driver.compose.json
if (driverCf) {
  const mfrs = driverCf.zigbee?.manufacturerName || [];
  let added = 0;
  for (const mfr of Object.keys(NEW_MFRS)) {
    if (!mfrs.includes(mfr)) {
      mfrs.push(mfr);
      added++;
    }
  }
  if (added > 0) {
    driverCf.zigbee.manufacturerName = mfrs;
    driverAdded += added;
    console.log(`✓ Added ${added} NEW MFRs to presence_sensor_radar/driver.compose.json`);
  }
}

// 6. Update z2m_cache.json with the new MFRs in the ZG-204Z family
const z2m = JSON.parse(fs.readFileSync(Z2M_CACHE, 'utf8'));
const zg204Key = 'ZG-204Z family (HOBEIAN mmWave/PIR sensors)';
if (z2m[zg204Key]) {
  // Add new ZG-204ZM v3 entry
  if (!z2m[zg204Key]['ZG-204ZM_v3']) {
    z2m[zg204Key]['ZG-204ZM_v3'] = {
      manufacturerName: ['_TZE200_tyffvoij'],
      modelId: 'TS0601',
      vendor: 'HOBEIAN',
      description: 'PIR + 24GHz mmWave + lux (newest hardware, ZG-204ZM v3)',
      z2m_model: 'ZG-204ZM',
      z2m_link: 'https://www.zigbee2mqtt.io/devices/ZG-204ZM.html',
      note: 'Newest ZG-204ZM variant',
    };
  }
  // Add ZG-204ZV entry
  if (!z2m[zg204Key]['ZG-204ZV']) {
    z2m[zg204Key]['ZG-204ZV'] = {
      manufacturerName: ['_TZE200_uli8wasj', '_TZE200_grgol3xp', '_TZE200_rhgsbacq', '_TZE200_y8jijhba'],
      modelId: 'TS0601',
      vendor: 'HOBEIAN',
      description: 'mmWave + PIR + temp + humidity + lux (full sensor)',
      z2m_model: 'ZG-204ZV',
      z2m_link: 'https://www.zigbee2mqtt.io/devices/ZG-204ZV.html',
    };
  }
  // Add ZG-204ZX entry
  if (!z2m[zg204Key]['ZG-204ZX']) {
    z2m[zg204Key]['ZG-204ZX'] = {
      manufacturerName: ['_TZE200_w0ap83qu'],
      modelId: 'TS0601',
      vendor: 'HOBEIAN',
      description: 'PIR + mmWave + lux variant',
      z2m_model: 'ZG-204ZX',
    };
  }
}

// Write all files
fs.writeFileSync(MFS_DB, JSON.stringify(mfs, null, 2));
fs.writeFileSync(TUYA_FP, JSON.stringify(fp, null, 2));
fs.writeFileSync(Z2M_CACHE, JSON.stringify(z2m, null, 2));
if (driverCf) {
  fs.writeFileSync(PRESENCE_DRIVER, JSON.stringify(driverCf, null, 2));
}

console.log(`\n=== Summary ===`);
console.log(`  sacredCouples added: ${sacredAdded}`);
console.log(`  sacredCouples productNames added/merged: ${sacredNamesAdded}`);
console.log(`  mfs_db top-level added: ${mfsAdded}`);
console.log(`  fingerprints.json added: ${fpAdded}`);
console.log(`  presence_sensor_radar driver.compose.json added: ${driverAdded}`);
console.log(`  z2m_cache updated`);
