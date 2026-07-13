#!/usr/bin/env node
/**
 * Collision Analyzer - Detailed analysis of fingerprint collisions
 * Run: node scripts/automation/analyze-collisions.js [--json] [--top N]
 *
 * Provides detailed analytics on manufacturer+productId collisions:
 * - Collision count by driver pair
 * - Most common colliding manufacturers
 * - Collision severity analysis
 * - Recommendation for resolution priority
 *
 * Exit codes: 0 = no collisions, 1 = collisions found, 2 = script failure
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { loadAllDrivers } = require('../lib/drivers');

const JSON_OUTPUT = process.argv.includes('--json');
const TOP_N = parseInt(process.argv.find((a, i) => process.argv[i - 1] === '--top') || '10', 10);

function analyzeCollisions() {
  const drivers = loadAllDrivers();

  // Build fingerprint map: mfr|pid -> Set<driver>
  const fpMap = new Map();
  for (const [name, d] of drivers) {
    const zigbee = d.config.zigbee || {};
    const mfrs = zigbee.manufacturerName || [];
    const pids = zigbee.productId || [];
    for (const m of mfrs) {
      for (const p of pids) {
        const key = `${m.toLowerCase()}|${p}`;
        if (!fpMap.has(key)) fpMap.set(key, new Set());
        fpMap.get(key).add(name);
      }
    }
  }

  // Extract collisions
  const collisions = [];
  for (const [key, drvSet] of fpMap) {
    if (drvSet.size > 1) {
      const [mfr, pid] = key.split('|');
      collisions.push({ mfr, pid, drivers: [...drvSet] });
    }
  }

  // Analysis
  // 1. Collision count by driver pair
  const pairCounts = new Map();
  // 2. Most common colliding manufacturers
  const mfrCounts = new Map();
  // 3. Drivers involved
  const driverCollisionCounts = new Map();

  for (const c of collisions) {
    const sortedDrivers = c.drivers.sort();
    for (let i = 0; i < sortedDrivers.length; i++) {
      for (let j = i + 1; j < sortedDrivers.length; j++) {
        const pair = `${sortedDrivers[i]} <-> ${sortedDrivers[j]}`;
        pairCounts.set(pair, (pairCounts.get(pair) || 0) + 1);
      }
    }
    mfrCounts.set(c.mfr, (mfrCounts.get(c.mfr) || 0) + 1);
    for (const d of c.drivers) {
      driverCollisionCounts.set(d, (driverCollisionCounts.get(d) || 0) + 1);
    }
  }

  // Sort by count
  const topPairs = [...pairCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, TOP_N);
  const topMfrs = [...mfrCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, TOP_N);
  const topDrivers = [...driverCollisionCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, TOP_N);

  return {
    totalDrivers: drivers.size,
    totalFingerprints: fpMap.size,
    totalCollisions: collisions.length,
    collisionRate: fpMap.size > 0 ? ((collisions.length / fpMap.size) * 100).toFixed(2) + '%' : '0%',
    topDriverPairs: topPairs.map(([pair, count]) => ({ pair, count })),
    topCollidingManufacturers: topMfrs.map(([mfr, count]) => ({ manufacturer: mfr, count })),
    topAffectedDrivers: topDrivers.map(([driver, count]) => ({ driver, collisions: count })),
    collisions: collisions.slice(0, 200), // cap for readability
  };
}

// Main
try {
  if (!JSON_OUTPUT) console.log('Analyzing fingerprint collisions...\n');

  const result = analyzeCollisions();

  if (JSON_OUTPUT) {
    result.timestamp = new Date().toISOString();
    result.exitCode = result.totalCollisions > 0 ? 1 : 0;
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`Drivers: ${result.totalDrivers}`);
    console.log(`Fingerprints: ${result.totalFingerprints}`);
    console.log(`Collisions: ${result.totalCollisions} (${result.collisionRate})`);

    if (result.topDriverPairs.length > 0) {
      console.log(`\nTop ${TOP_N} colliding driver pairs:`);
      for (const { pair, count } of result.topDriverPairs) {
        console.log(`  ${count}x: ${pair}`);
      }
    }

    if (result.topCollidingManufacturers.length > 0) {
      console.log(`\nTop ${TOP_N} colliding manufacturers:`);
      for (const { manufacturer, count } of result.topCollidingManufacturers) {
        console.log(`  ${count}x: ${manufacturer}`);
      }
    }

    if (result.topAffectedDrivers.length > 0) {
      console.log(`\nTop ${TOP_N} most affected drivers:`);
      for (const { driver, collisions } of result.topAffectedDrivers) {
        console.log(`  ${collisions}x: ${driver}`);
      }
    }
  }

  process.exit(result.totalCollisions > 0 ? 1 : 0);
} catch (e) {
  console.error(`Error: ${e.message}`);
  if (!JSON_OUTPUT) console.error(e.stack);
  process.exit(2);
}
