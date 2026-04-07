#!/usr/bin/env node
'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      GLOBAL FINGERPRINT DEDUPLICATOR - v1.1.0                               ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Cleans driver manifests by:                                                  ║
 * ║  1. Lowercasing all manufacturerNames (Standard Tuya zigbee-herdsman style)  ║
 * ║  2. Removing duplicate manufacturerNames within a single driver               ║
 * ║  3. Removing duplicate productIds within a single driver                      ║
 * ║  4. Sorting entries alphabetically for easier git diffs                       ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

const fs = require('fs');
const path = require('path');
const { loadAllDrivers, writeDriverJson } = require('../lib/drivers');

async function main() {
  console.log('Starting Global Fingerprint Deduplication...');
  const drivers = loadAllDrivers();
  let totalMfrRemoved = 0;
  let totalPidRemoved = 0;
  let driversModified = 0;

  for (const [name, d] of drivers) {
    let changed = false;
    const config = d.config;

    if (config.zigbee && config.zigbee.manufacturerName) {
      const original = config.zigbee.manufacturerName;
      // Case-insensitive unique set
      const seen = new Set();
      const unique = [];
      for (const m of (original || [])) {
        if (!m) continue;
        const low = m.toLowerCase();
        if (!seen.has(low)) {
          seen.add(low);
          unique.push(m);
        }
      }
      unique.sort();
      
      if (unique.length !== original.length) {
        const diff = original.length - unique.length;
        console.log(`  [${name}] Cleaned manufacturerNames: ${original.length} -> ${unique.length} (-${diff})`);
        config.zigbee.manufacturerName = unique;
        totalMfrRemoved += diff;
        changed = true;
      }
    }

    if (config.zigbee && config.zigbee.productId) {
      const original = config.zigbee.productId;
      const unique = [...new Set(original)];
      unique.sort();

      if (unique.length !== original.length) {
        const diff = original.length - unique.length;
        console.log(`  [${name}] Cleaned productIds: ${original.length} -> ${unique.length} (-${diff})`);
        config.zigbee.productId = unique;
        totalPidRemoved += diff;
        changed = true;
      }
    }

    if (changed) {
      writeDriverJson(d.path, config);
      driversModified++;
    }
  }

  console.log('\n--- Cleanup Summary ---');
  console.log(`Total manufacturerNames removed: ${totalMfrRemoved}`);
  console.log(`Total productIds removed:        ${totalPidRemoved}`);
  console.log(`Drivers modified:               ${driversModified}`);
  console.log('--- Done ---\n');
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
