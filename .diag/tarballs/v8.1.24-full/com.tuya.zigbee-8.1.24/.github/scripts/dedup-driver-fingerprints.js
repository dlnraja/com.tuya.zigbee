#!/usr/bin/env node
/**
 * dedup-driver-fingerprints.js
 * 
 * ROOT CAUSE FIX for AggregateError on Athom backend:
 *   When multiple Zigbee drivers share the same (manufacturerName, productId) fingerprint,
 *   Athom's server uses Promise.any() to resolve drivers → throws AggregateError.
 * 
 * STRATEGY:
 *   - Keep the MORE SPECIFIC driver (e.g. "water_leak_sensor_tuya" over "water_leak_sensor")
 *   - Specificity rules (by priority):
 *     1. Driver with full manufacturerName match (not GENERIC_MANUFACTURER)
 *     2. Driver with more specific name (contains model/brand qualifier)
 *     3. Driver added more recently (later in drivers array)
 *   - Remove DUPLICATE (mfr, productId) fingerprints from the LESS specific driver's lists
 *   - NEVER delete a driver entirely — only prune its fingerprint lists
 * 
 * Usage:
 *   node .github/scripts/dedup-driver-fingerprints.js [--dry-run] [--verbose]
 */
'use strict';

const fs   = require('fs');
const path = require('path');

const APP_JSON_PATH = path.join(__dirname,'..','..','app.json');
const DRY  = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');

function log(m) { console.log(m); }
function vlog(m) { if (VERBOSE) console.log(m); }

// =====================================================================
// SPECIFICITY SCORING — higher = more specific = keep this driver's FP
// =====================================================================
function specificity(driver) {
  let score = 0;
  const id = driver.id || '';
  
  // Has tuya-specific qualifier
  if (/_tuya$|_zigbee$|_advanced$|_smart$|_v2$|_new$/.test(id)) score += 20;
  
  // Has specific brand/model in name
  if (/heiman|sonoff|ikea|xiaomi|lumi|aqara|philips|osram|innr/.test(id)) score += 30;
  
  // More specific manufacturerName (more entries = more specific = less generic)
  if (driver.zigbee?.manufacturerName) {
    const mfrs = Array.isArray(driver.zigbee.manufacturerName) 
      ? driver.zigbee.manufacturerName 
      : [driver.zigbee.manufacturerName];
    // More specific = fewer mfrs (ultra-targeted)
    // But if it has many very specific mfrs, still specific
    score += Math.min(mfrs.length, 10);
    // Bonus for non-generic
    const hasGeneric = mfrs.some(m => !m || m === 'GENERIC_MANUFACTURER');
    if (!hasGeneric) score += 15;
  }
  
  // More capabilities = more specific driver
  if (driver.capabilities) score += Math.min(driver.capabilities.length, 10);
  
  return score;
}

// =====================================================================
// DEDUPLICATION LOGIC
// =====================================================================
function deduplicate(drivers) {
  const zigbeeDrivers = drivers.filter(d => d.zigbee && d.zigbee.manufacturerName);
  const others = drivers.filter(d => !d.zigbee || !d.zigbee.manufacturerName);
  
  // Build fingerprint → [drivers] map
  const fpMap = new Map(); // key: "mfr|productId" → [{ driver, mfrIndex, modelIndex }]
  
  for (const d of zigbeeDrivers) {
    const mfrs = Array.isArray(d.zigbee.manufacturerName) 
      ? d.zigbee.manufacturerName 
      : [d.zigbee.manufacturerName];
    const models = Array.isArray(d.zigbee.productId) 
      ? d.zigbee.productId 
      : [d.zigbee.productId || ''];
    
    for (let mi = 0; mi < mfrs.length; mi++) {
      for (let pi = 0; pi < models.length; pi++) {
        const mfr   = mfrs[mi];
        const model = models[pi];
        if (!mfr) continue;
        const key = `${mfr}|${model}`;
        if (!fpMap.has(key)) fpMap.set(key, []);
        fpMap.get(key).push({ driver: d, mfr, model });
      }
    }
  }
  
  // Find conflicts
  const conflicts = [...fpMap.entries()].filter(([, entries]) => entries.length > 1);
  log(`\nFound ${conflicts.length} conflicting fingerprints across ${new Set(conflicts.flatMap(([,e])=>e.map(x=>x.driver.id))).size} drivers`);
  
  // For each conflict: decide which driver WINS (keeps the FP)
  // The LOSER gets that FP removed from its lists
  const removals = new Map(); // driverId → Set of { mfr, model } to remove
  
  for (const [key, entries] of conflicts) {
    // Sort by specificity descending — first = winner
    const sorted = entries
      .map(e => ({ ...e, score: specificity(e.driver) }))
      .sort((a, b) => b.score - a.score);
    
    const winner = sorted[0];
    const losers = sorted.slice(1);
    
    vlog(`  [CONFLICT] ${key}`);
    vlog(`    WINNER: ${winner.driver.id} (score=${winner.score})`);
    
    for (const loser of losers) {
      vlog(`    LOSER:  ${loser.driver.id} (score=${loser.score}) → remove this FP`);
      const dId = loser.driver.id;
      if (!removals.has(dId)) removals.set(dId, []);
      removals.get(dId).push({ mfr: loser.mfr, model: loser.model });
    }
  }
  
  // Apply removals to drivers
  let totalRemoved = 0;
  const driverMap = new Map(zigbeeDrivers.map(d => [d.id, d]));
  
  for (const [driverId, toRemove] of removals) {
    const driver = driverMap.get(driverId);
    if (!driver || !driver.zigbee) continue;
    
    const mfrSet = new Set(toRemove.map(r => r.mfr));
    const modelSet = new Set(toRemove.map(r => r.model));
    
    // For each mfr to remove: only remove if ALL its models create conflicts
    // Group by mfr
    const byMfr = new Map();
    for (const r of toRemove) {
      if (!byMfr.has(r.mfr)) byMfr.set(r.mfr, new Set());
      byMfr.get(r.mfr).add(r.model);
    }
    
    // Get current mfrs and models
    let currentMfrs = Array.isArray(driver.zigbee.manufacturerName) 
      ? [...driver.zigbee.manufacturerName] 
      : [driver.zigbee.manufacturerName];
    let currentModels = Array.isArray(driver.zigbee.productId) 
      ? [...driver.zigbee.productId] 
      : [driver.zigbee.productId || ''];
    
    // Strategy: if a mfr has conflicts with ALL models, remove the mfr from the list
    // If only some models conflict, we need to keep the mfr but it's complex
    // Simple approach: only remove mfrs where ALL models of this driver conflict
    
    const mfrsToRemove = [];
    for (const [mfr, conflictModels] of byMfr) {
      // Check if ALL current models for this mfr conflict
      const allConflict = currentModels.every(m => conflictModels.has(m));
      if (allConflict && currentMfrs.length > 1) {
        // Safe to remove this mfr entirely
        mfrsToRemove.push(mfr);
        totalRemoved += conflictModels.size;
        vlog(`    Removing mfr "${mfr}" from driver ${driverId}`);
      } else if (allConflict && currentMfrs.length === 1) {
        // Only one mfr — can't remove without making driver unreachable
        // Keep it but log the conflict
        vlog(`    KEPT (only mfr): "${mfr}" in driver ${driverId}`);
      }
    }
    
    if (mfrsToRemove.length > 0) {
      const newMfrs = currentMfrs.filter(m => !mfrsToRemove.includes(m));
      if (newMfrs.length > 0) {
        driver.zigbee.manufacturerName = newMfrs.length === 1 ? newMfrs[0] : newMfrs;
      }
    }
  }
  
  log(`Total fingerprint entries removed: ${totalRemoved}`);
  
  // Combine back
  return [...zigbeeDrivers, ...others];
}

// =====================================================================
// MAIN
// =====================================================================
function main() {
  log('╔══════════════════════════════════════════════════════════════╗');
  log('║  DEDUP DRIVER FINGERPRINTS — Fix AggregateError             ║');
  log(`║  DRY_RUN: ${DRY} | VERBOSE: ${VERBOSE}`);
  log('╚══════════════════════════════════════════════════════════════╝');
  
  const appJson = JSON.parse(fs.readFileSync(APP_JSON_PATH, 'utf8'));
  const drivers = appJson.drivers || [];
  log(`\nLoaded ${drivers.length} drivers from app.json`);
  
  // Count BEFORE
  let beforeDups = 0;
  const beforeMap = new Map();
  for (const d of drivers.filter(d => d.zigbee)) {
    const mfrs = Array.isArray(d.zigbee.manufacturerName) ? d.zigbee.manufacturerName : [d.zigbee.manufacturerName];
    const models = Array.isArray(d.zigbee.productId) ? d.zigbee.productId : [d.zigbee.productId || ''];
    for (const mfr of mfrs) {
      for (const model of models) {
        const key = `${mfr}|${model}`;
        if (beforeMap.has(key)) beforeDups++;
        else beforeMap.set(key, d.id);
      }
    }
  }
  log(`Before: ${beforeDups} duplicate fingerprints`);
  
  const fixedDrivers = deduplicate(drivers);
  appJson.drivers = fixedDrivers;
  
  // Count AFTER
  let afterDups = 0;
  const afterMap = new Map();
  for (const d of fixedDrivers.filter(d => d.zigbee)) {
    const mfrs = Array.isArray(d.zigbee.manufacturerName) ? d.zigbee.manufacturerName : [d.zigbee.manufacturerName];
    const models = Array.isArray(d.zigbee.productId) ? d.zigbee.productId : [d.zigbee.productId || ''];
    for (const mfr of mfrs) {
      for (const model of models) {
        const key = `${mfr}|${model}`;
        if (afterMap.has(key)) afterDups++;
        else afterMap.set(key, d.id);
      }
    }
  }
  log(`After:  ${afterDups} duplicate fingerprints`);
  log(`Fixed:  ${beforeDups - afterDups} duplicates resolved`);
  
  if (DRY) {
    log('\nDRY RUN — app.json NOT modified');
    return;
  }
  
  // Backup original
  const backup = APP_JSON_PATH + '.dedup-backup';
  fs.copyFileSync(APP_JSON_PATH, backup);
  log(`\nBackup saved: ${backup}`);
  
  // Write fixed app.json (compact — no whitespace)
  fs.writeFileSync(APP_JSON_PATH, JSON.stringify(appJson), 'utf8');
  const newSize = Math.round(fs.statSync(APP_JSON_PATH).size / 1024);
  log(`Written: app.json (${newSize} KB)`);
  
  if (afterDups === 0) {
    log('\n✅ ALL DUPLICATES RESOLVED — AggregateError should be fixed');
  } else if (afterDups < beforeDups * 0.1) {
    log('\n⚠️  Most duplicates resolved — remaining may be unavoidable (single-mfr drivers)');
  } else {
    log('\n❌ Many duplicates remain — manual review needed');
    log('   Run with --verbose for details');
  }
}

main();
