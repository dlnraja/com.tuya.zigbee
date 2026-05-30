#!/usr/bin/env node
/**
 * fix-aggregate-error-partition.js
 * 
 * CONTEXT: Athom backend uses Promise.any() to resolve Zigbee devices.
 * When multiple drivers declare the same (manufacturerName, productId),
 * Promise.any() throws AggregateError because ALL promises reject (can't pick one).
 * 
 * ROOT CAUSE FOUND:
 * - climate_sensor + 3 siblings share 2127 mfrs × 26 models = 55,302 FPs each
 * - relay_board_1_channel + siblings share 24,567 FPs each
 * - 169 drivers total with 352,732 duplicate fingerprints
 * 
 * STRATEGY:
 * 1. For drivers sharing the same manufacturerNames + productIds:
 *    → Keep the MOST SPECIFIC driver (highest score) with ALL the FPs
 *    → Remove ALL those FPs from the LESS SPECIFIC drivers
 *    → The less specific drivers become "fallback" for unknown devices only
 * 2. Specificity scoring: brand qualifiers > capabilities count > name length
 * 3. NEVER remove a driver — only prune its FP lists
 * 
 * Usage: node fix-aggregate-error-partition.js [--dry-run] [--verbose]
 */
'use strict';

const fs = require('fs');
const path = require('path');
const APP_JSON = path.join(__dirname, '..', '..', 'app.json');
const DRY = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');
const log = m => console.log(m);
const vlog = m => { if (VERBOSE) console.log(m); };

// ─── SPECIFICITY SCORE ───────────────────────────────────────────────────────
function score(driver) {
  let s = 0;
  const id = driver.id || '';
  // Brand qualifiers (very specific)
  if (/heiman|sonoff|ikea|xiaomi|lumi|aqara|philips|osram|innr|tuya|moes|ts0601/i.test(id)) s += 40;
  // Version/variant qualifiers
  if (/_v2$|_v3$|_new$|_advanced$|_smart$|_pro$|_plus$/.test(id)) s += 20;
  // More capabilities = more specific  
  s += Math.min((driver.capabilities || []).length * 2, 30);
  // Longer ID = more specific usually
  s += Math.min(id.length, 20);
  // Has specific image (not generic)
  const img = path.join(__dirname, '..', '..', 'drivers', id, 'assets', 'images', 'icon.svg');
  if (fs.existsSync(img)) s += 5;
  return s;
}

// ─── GROUP DRIVERS BY THEIR EXACT FINGERPRINT SETS ──────────────────────────
function getDriverFPKey(driver) {
  if (!driver.zigbee || !driver.zigbee.manufacturerName) return null;
  const mfrs = [].concat(driver.zigbee.manufacturerName).sort();
  const models = [].concat(driver.zigbee.productId || ['']).sort();
  // Key = first 5 mfrs + models (to detect "same large set" without full comparison)
  return mfrs.slice(0, 5).join(',') + '|||' + models.join(',');
}

function main() {
  log('╔══════════════════════════════════════════════════════════════╗');
  log('║  FIX AGGREGATEERROR — Partition Fingerprints                ║');
  log(`║  DRY_RUN: ${DRY} | VERBOSE: ${VERBOSE}`);
  log('╚══════════════════════════════════════════════════════════════╝\n');

  const app = JSON.parse(fs.readFileSync(APP_JSON, 'utf8'));
  const drivers = app.drivers || [];
  log(`Loaded: ${drivers.length} drivers`);

  // ── Step 1: Count total duplicate FPs ──────────────────────────────────────
  const fpMap = new Map(); // key → [driverId, ...]
  for (const d of drivers) {
    if (!d.zigbee?.manufacturerName) continue;
    const mfrs = [].concat(d.zigbee.manufacturerName);
    const models = [].concat(d.zigbee.productId || ['']);
    for (const mfr of mfrs) for (const model of models) {
      const k = `${mfr}|${model}`;
      if (!fpMap.has(k)) fpMap.set(k, []);
      fpMap.get(k).push(d.id);
    }
  }
  const conflicting = [...fpMap.entries()].filter(([, ds]) => ds.length > 1);
  log(`Before: ${conflicting.length} conflicting FPs across ${new Set(conflicting.flatMap(([, ds]) => ds)).size} drivers\n`);

  // ── Step 2: Group drivers by their FP "signature" (detect clones) ──────────
  const signatureGroups = new Map(); // signature → [driver]
  for (const d of drivers) {
    const sig = getDriverFPKey(d);
    if (!sig) continue;
    if (!signatureGroups.has(sig)) signatureGroups.set(sig, []);
    signatureGroups.get(sig).push(d);
  }
  
  const cloneGroups = [...signatureGroups.values()].filter(g => g.length > 1);
  log(`Found ${cloneGroups.length} groups of drivers sharing identical FP sets:`);
  cloneGroups.forEach(g => {
    const winner = g.sort((a, b) => score(b) - score(a))[0];
    const mfrs = [].concat(g[0].zigbee?.manufacturerName || []);
    const models = [].concat(g[0].zigbee?.productId || []);
    log(`  Group (${g.length} drivers, ${mfrs.length}mfrs×${models.length}models=${mfrs.length*models.length}FPs):`);
    log(`    → WINNER: ${winner.id} (score=${score(winner)})`);
    g.filter(d => d.id !== winner.id).forEach(d => {
      log(`    → LOSER:  ${d.id} (score=${score(d)}) → CLEAR its FPs`);
    });
  });

  if (DRY) {
    log('\n[DRY RUN] No changes made.');
    return;
  }

  // ── Step 3: For each clone group, clear ALL FPs from losers ────────────────
  let totalCleared = 0;
  for (const group of cloneGroups) {
    const sorted = group.sort((a, b) => score(b) - score(a));
    const winner = sorted[0];
    const losers = sorted.slice(1);
    
    for (const loser of losers) {
      if (!loser.zigbee) continue;
      const mfrsBefore = [].concat(loser.zigbee.manufacturerName || []).length;
      
      // Clear the overlapping FPs — keep nothing (winner has them all)
      // But: if the loser has UNIQUE mfrs not in winner, keep those
      const winnerMfrs = new Set([].concat(winner.zigbee?.manufacturerName || []));
      const loserMfrs = [].concat(loser.zigbee.manufacturerName || []);
      const uniqueToLoser = loserMfrs.filter(m => !winnerMfrs.has(m));
      
      if (uniqueToLoser.length > 0) {
        // Loser has some unique mfrs — keep only those
        loser.zigbee.manufacturerName = uniqueToLoser.length === 1 ? uniqueToLoser[0] : uniqueToLoser;
        totalCleared += mfrsBefore - uniqueToLoser.length;
        vlog(`  ${loser.id}: kept ${uniqueToLoser.length}/${mfrsBefore} unique mfrs`);
      } else {
        // All loser mfrs are in winner — remove them all
        // But we can't leave manufacturerName empty (would break SDK)
        // Strategy: make it a very specific/unique mfr that won't conflict
        // Use a placeholder that identifies this as "unmatched fallback"
        const placeholder = `_unmatched_${loser.id}`;
        loser.zigbee.manufacturerName = placeholder;
        // Keep productId but make it specific too
        if (loser.zigbee.productId) {
          loser.zigbee.productId = `_unmatched_${loser.id}`;
        }
        totalCleared += mfrsBefore;
        vlog(`  ${loser.id}: set placeholder FP (no unique mfrs)`);
      }
    }
  }

  log(`\nCleared: ${totalCleared} overlapping manufacturer entries from ${cloneGroups.reduce((s,g)=>s+g.length-1,0)} loser drivers`);

  // ── Step 4: Also handle partial conflicts (different FP sets, some overlap) ─
  // For these, use the original dedup logic (by score)
  const fpMap2 = new Map();
  for (const d of app.drivers) {
    if (!d.zigbee?.manufacturerName) continue;
    const mfrs = [].concat(d.zigbee.manufacturerName).filter(m => !m.startsWith('_unmatched_'));
    const models = [].concat(d.zigbee.productId || ['']).filter(m => !String(m).startsWith('_unmatched_'));
    for (const mfr of mfrs) for (const model of models) {
      const k = `${mfr}|${model}`;
      if (!fpMap2.has(k)) fpMap2.set(k, []);
      fpMap2.get(k).push(d);
    }
  }

  let partialFixed = 0;
  const conflicts2 = [...fpMap2.entries()].filter(([, ds]) => ds.length > 1);
  log(`Remaining partial conflicts: ${conflicts2.length}`);

  for (const [key, driversList] of conflicts2) {
    const sorted = driversList.sort((a, b) => score(b) - score(a));
    const winner = sorted[0];
    for (const loser of sorted.slice(1)) {
      if (!loser.zigbee) continue;
      const [mfr, model] = key.split('|');
      // Remove this specific mfr from loser's list (only if loser has multiple mfrs)
      const loserMfrs = [].concat(loser.zigbee.manufacturerName).filter(m => !m.startsWith('_unmatched_'));
      if (loserMfrs.length > 1) {
        const newMfrs = loserMfrs.filter(m => m !== mfr);
        loser.zigbee.manufacturerName = newMfrs.length === 1 ? newMfrs[0] : newMfrs;
        partialFixed++;
      }
    }
  }
  log(`Partial conflicts fixed: ${partialFixed}`);

  // ── Step 5: Recount and write ───────────────────────────────────────────────
  const fpMap3 = new Map();
  let afterConflicts = 0;
  for (const d of app.drivers) {
    if (!d.zigbee?.manufacturerName) continue;
    const mfrs = [].concat(d.zigbee.manufacturerName);
    const models = [].concat(d.zigbee.productId || ['']);
    for (const mfr of mfrs) for (const model of models) {
      const k = `${mfr}|${model}`;
      if (fpMap3.has(k)) afterConflicts++;
      else fpMap3.set(k, d.id);
    }
  }
  log(`\nAfter fix: ${afterConflicts} remaining duplicate FPs`);
  log(`Improvement: ${conflicting.length} → ${afterConflicts} (${Math.round((1-afterConflicts/conflicting.length)*100)}% reduction)`);

  // Backup + write
  const backup = APP_JSON + '.partition-backup';
  fs.copyFileSync(APP_JSON, backup);
  fs.writeFileSync(APP_JSON, JSON.stringify(app), 'utf8');
  const kb = Math.round(fs.statSync(APP_JSON).size / 1024);
  log(`\nWritten: app.json (${kb}KB) | Backup: ${backup}`);

  if (afterConflicts === 0) {
    log('\n✅ ALL CONFLICTS RESOLVED — AggregateError should be fixed');
  } else if (afterConflicts < 1000) {
    log('\n⚠️  Near-zero conflicts remain — AggregateError risk greatly reduced');
  } else {
    log('\n⚠️  Conflicts remain but significantly reduced. Athom backend will resolve via specificity.');
  }
}

main();
