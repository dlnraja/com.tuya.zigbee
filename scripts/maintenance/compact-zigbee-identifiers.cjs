#!/usr/bin/env node
'use strict';

/**
 * Publish-only Zigbee identifier compactor.
 *
 * Athom expands manufacturerName x productId for each Zigbee driver while
 * processing a build. Broad catch-all drivers can create tens of thousands of
 * combinations and currently surface as a server-side AggregateError. Keep
 * source manifests complete, but cap the generated publish manifest.
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_MAX_DRIVER_COMBOS = 500;
const DEFAULT_MAX_TOTAL_COMBOS = 20000;

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

function compactZigbeeIdentifiers(manifest, opts = {}) {
  const maxDriverCombos = Number(opts.maxDriverCombos || process.env.HOMEY_ZIGBEE_MAX_DRIVER_COMBOS || DEFAULT_MAX_DRIVER_COMBOS);
  const maxTotalCombos = Number(opts.maxTotalCombos || process.env.HOMEY_ZIGBEE_MAX_TOTAL_COMBOS || DEFAULT_MAX_TOTAL_COMBOS);
  const changes = [];
  let beforeTotal = 0;
  let afterTotal = 0;

  for (const driver of manifest.drivers || []) {
    if (!driver.zigbee) continue;
    const manufacturers = uniqStrings(driver.zigbee.manufacturerName);
    const products = uniqStrings(driver.zigbee.productId);
    const before = manufacturers.length * products.length;
    beforeTotal += before;

    if (before > maxDriverCombos && manufacturers.length > 0 && products.length > 0) {
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
      afterTotal += before;
    }
  }

  return {
    changed: changes.length,
    changes,
    beforeTotal,
    afterTotal,
    maxDriverCombos,
    maxTotalCombos,
    overTotalLimit: afterTotal > maxTotalCombos,
  };
}

function compactManifestFile(file, opts = {}) {
  const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
  const result = compactZigbeeIdentifiers(manifest, opts);
  if (result.changed > 0) {
    fs.writeFileSync(file, JSON.stringify(manifest), 'utf8');
  }
  return result;
}

function logResult(file, result) {
  const rel = path.relative(process.cwd(), file) || file;
  console.log(`[compact-zigbee] ${rel}: combos ${result.beforeTotal}->${result.afterTotal}, affected drivers=${result.changed}, max/driver=${result.maxDriverCombos}`);
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
};
