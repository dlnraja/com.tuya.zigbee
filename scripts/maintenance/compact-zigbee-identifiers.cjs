#!/usr/bin/env node
'use strict';

/**
 * Publish-only Zigbee identifier compactor.
 *
 * Athom expands manufacturerName x productId for each Zigbee driver while
 * processing a build. Broad catch-all drivers can create tens of thousands of
 * combinations and inflate the upload payload. Keep source manifests complete,
 * but cap the generated publish manifest.
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_MAX_DRIVER_COMBOS = 500;
const DEFAULT_MAX_TOTAL_COMBOS = 20000;
const SYNTHETIC_MANUFACTURER_RE = /unknown|dummy|placeholder|needs_device_assignment|^_generic_|^_GENERIC_|^_hybrid_|^_HYBRID_|^_master_|^_MASTER_/;

function uniqStrings(values) {
  const out = [];
  const seen = new Set();
  for (const value of Array.isArray(values) ? values : []) {
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

function comboCount(driver) {
  const zigbee = driver && driver.zigbee;
  if (!zigbee) return 0;
  const manufacturers = uniqStrings(zigbee.manufacturerName);
  const products = uniqStrings(zigbee.productId);
  return manufacturers.length * products.length;
}

function isSyntheticManufacturer(value) {
  return typeof value === 'string' && SYNTHETIC_MANUFACTURER_RE.test(value);
}

function compactZigbeeIdentifiers(manifest, opts = {}) {
  const maxDriverCombos = Number(opts.maxDriverCombos || process.env.HOMEY_ZIGBEE_MAX_DRIVER_COMBOS || DEFAULT_MAX_DRIVER_COMBOS);
  const maxTotalCombos = Number(opts.maxTotalCombos || process.env.HOMEY_ZIGBEE_MAX_TOTAL_COMBOS || DEFAULT_MAX_TOTAL_COMBOS);
  const pruneSynthetic = opts.pruneSynthetic !== false && process.env.HOMEY_ZIGBEE_PRUNE_SYNTHETIC !== '0';
  const changes = [];
  const prunedDrivers = [];
  let beforeTotal = 0;
  let afterTotal = 0;
  let filteredSyntheticManufacturers = 0;

  const nextDrivers = [];

  for (const driver of manifest.drivers || []) {
    if (!driver.zigbee) {
      nextDrivers.push(driver);
      continue;
    }

    let manufacturers = uniqStrings(driver.zigbee.manufacturerName);
    const products = uniqStrings(driver.zigbee.productId);
    const before = manufacturers.length * products.length;
    beforeTotal += before;

    if (pruneSynthetic) {
      const realManufacturers = manufacturers.filter(value => !isSyntheticManufacturer(value));
      const syntheticCount = manufacturers.length - realManufacturers.length;
      filteredSyntheticManufacturers += syntheticCount;

      if (realManufacturers.length === 0) {
        prunedDrivers.push({
          id: driver.id,
          manufacturers: manufacturers.length,
          products: products.length,
          reason: manufacturers.length === 0 ? 'missing-manufacturer' : 'synthetic-manufacturer',
        });
        continue;
      }

      if (syntheticCount > 0) {
        driver.zigbee.manufacturerName = realManufacturers;
        manufacturers = realManufacturers;
      }
    }

    const candidate = manufacturers.length * products.length;
    if (candidate > maxDriverCombos && manufacturers.length > 0 && products.length > 0) {
      let nextManufacturers = manufacturers;
      let nextProducts = products;

      if (products.length > maxDriverCombos) {
        nextManufacturers = manufacturers.slice(0, 1);
        nextProducts = products.slice(0, maxDriverCombos);
      } else {
        const manufacturerLimit = Math.max(1, Math.floor(maxDriverCombos / Math.max(1, products.length)));
        nextManufacturers = manufacturers.slice(0, manufacturerLimit);
      }

      driver.zigbee.manufacturerName = nextManufacturers;
      driver.zigbee.productId = nextProducts;

      const after = nextManufacturers.length * nextProducts.length;
      changes.push({
        id: driver.id,
        before,
        after,
        manufacturers: `${manufacturers.length}->${nextManufacturers.length}`,
        products: `${products.length}->${nextProducts.length}`,
      });
      afterTotal += after;
    } else {
      afterTotal += candidate;
    }

    nextDrivers.push(driver);
  }

  if (prunedDrivers.length > 0) {
    manifest.drivers = nextDrivers;
  }

  return {
    changed: changes.length,
    changes,
    pruned: prunedDrivers.length,
    prunedDrivers,
    filteredSyntheticManufacturers,
    beforeTotal,
    afterTotal,
    maxDriverCombos,
    maxTotalCombos,
    pruneSynthetic,
    overTotalLimit: afterTotal > maxTotalCombos,
  };
}

function compactManifestFile(file, opts = {}) {
  const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
  const result = compactZigbeeIdentifiers(manifest, opts);
  if (result.changed > 0 || result.pruned > 0 || result.filteredSyntheticManufacturers > 0) {
    fs.writeFileSync(file, JSON.stringify(manifest), 'utf8');
  }
  return result;
}

function logResult(file, result) {
  const rel = path.relative(process.cwd(), file) || file;
  console.log(`[compact-zigbee] ${rel}: combos ${result.beforeTotal}->${result.afterTotal}, affected drivers=${result.changed}, pruned=${result.pruned}, synthetic mfr removed=${result.filteredSyntheticManufacturers}, max/driver=${result.maxDriverCombos}`);
  for (const pruned of result.prunedDrivers.slice(0, 25)) {
    console.log(`[compact-zigbee]   pruned ${pruned.id}: ${pruned.reason}, mfr=${pruned.manufacturers}, product=${pruned.products}`);
  }
  if (result.prunedDrivers.length > 25) {
    console.log(`[compact-zigbee]   ... ${result.prunedDrivers.length - 25} more driver(s) pruned`);
  }
  for (const change of result.changes.slice(0, 25)) {
    console.log(`[compact-zigbee]   ${change.id}: ${change.before}->${change.after} combos, mfr ${change.manufacturers}, product ${change.products}`);
  }
  if (result.changes.length > 25) {
    console.log(`[compact-zigbee]   ... ${result.changes.length - 25} more driver(s) compacted`);
  }
}

if (require.main === module) {
  const files = process.argv.slice(2);
  if (files.length === 0) {
    console.error('Usage: node scripts/maintenance/compact-zigbee-identifiers.cjs <app.json> [...]');
    process.exit(2);
  }
  let failed = false;
  for (const file of files) {
    try {
      const result = compactManifestFile(file);
      logResult(file, result);
      if (result.overTotalLimit) {
        console.error(`[compact-zigbee] FATAL: total Zigbee combinations ${result.afterTotal} exceed limit ${result.maxTotalCombos}`);
        failed = true;
      }
    } catch (e) {
      console.error(`[compact-zigbee] FATAL: ${file}: ${e.message}`);
      failed = true;
    }
  }
  if (failed) process.exit(1);
}

module.exports = {
  comboCount,
  compactManifestFile,
  compactZigbeeIdentifiers,
  isSyntheticManufacturer,
};
