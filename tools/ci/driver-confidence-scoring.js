#!/usr/bin/env node
'use strict';

/**
 * P24.4 — Driver confidence scoring (gamification by points)
 *
 * Combines multiple signals into a per-driver confidence score:
 * - z2m support: +10 points (well-maintained, large community)
 * - ZHA quirks: +8 points (official ZHA support)
 * - mfs_db mapping: +5 points (we already support it)
 * - Sacred Couple match: +6 points (cross-ref in mfs_db.sacredCouples)
 * - Johan issues/PRs: -3 per open issue (unresolved problems)
 * - Crash patterns: -5 per crash (real bugs)
 * - Forum mentions: +2 per mention (community traction)
 * - Multiple vendors using same mfr+pid: +1 each (broad support)
 *
 * Output: driver-confidence-scores.json
 */

const fs = require('fs');
const path = require('path');

const STATE_DIR = 'C:/Users/Dell/Documents/homey/master/.github/state';
const MFS_DB = 'C:/Users/Dell/Documents/homey/master/data/mfs_db.json';
const DRIVERS_DIR = 'C:/Users/Dell/Documents/homey/master/drivers';

// Load all sources
function loadJson(p, fallback = null) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch { return fallback; }
}

const z2mPairs = loadJson(path.join(STATE_DIR, 'z2m-pairs.json'), []);     // 563
const zhaPairs = loadJson(path.join(STATE_DIR, 'zha-pairs.json'), []);     // 204
const z2mFull = loadJson(path.join(STATE_DIR, 'z2m-pairs-full.json'), []); // full
const mfsDb = loadJson(MFS_DB, { devices: [], driverMappings: {}, sacredCouples: {} });
const crashDetails = loadJson(path.join(STATE_DIR, 'crash-details.json'), null);
const forumResults = loadJson(path.join(STATE_DIR, 'forum-search-results.json'), null);

console.log(`Loaded: ${z2mPairs.length} z2m-tuya pairs, ${zhaPairs.length} ZHA pairs, ${z2mFull.length} z2m-full pairs`);

// Build lookup sets
// z2m: use vendor + model as the cross-ref key (vendor is brand like 'Tuya', model is TS0601)
// Drivers: use manufacturerName + productId
// They don't match directly! z2m has BRAND_VENDOR + MODEL (TS0601), our drivers have
// MANUFACTURER_ID (_TZE200_xxx) + PRODUCT_ID.
// So we need to match by productId (TS0601) and assume Tuya vendor is the bridge.
const z2mSet = new Set();
for (const p of z2mPairs) {
  // z2m vendors like 'Tuya' match our Tuya-prefixed mfrs
  // Match by productId (TS0601 etc) for Tuya-style devices
  if (p.zigbeeModels) {
    for (const zm of p.zigbeeModels) z2mSet.add(zm);  // Just the model
  } else {
    z2mSet.add(p.model);
  }
}
for (const p of z2mFull) {
  if (p.zigbeeModels) {
    for (const zm of p.zigbeeModels) z2mSet.add(zm);
  } else {
    z2mSet.add(p.model);
  }
}

const zhaSet = new Set();
for (const p of zhaPairs) zhaSet.add(`${p.manufacturer}|${p.model}`);

const sacredCouples = new Map();
for (const [key, value] of Object.entries(mfsDb.sacredCouples || {})) {
  if (!sacredCouples.has(key)) sacredCouples.set(key, []);
  const driverId = typeof value === 'string' ? value : (value.driverId || 'unknown');
  sacredCouples.get(key).push(driverId);
}

const mfsMappedDevices = new Set();
for (const mapping of Object.values(mfsDb.driverMappings || {})) {
  if (mapping.driverId) mfsMappedDevices.add(mapping.driverId);
}

// Crash patterns per device
const crashPatterns = new Map();
if (crashDetails) {
  for (const pattern of crashDetails.topPatterns || []) {
    if (pattern.stack) {
      // Try to extract driver name from stack
      const driverMatch = pattern.stack.match(/Initializing Driver (\w+):/);
      if (driverMatch) {
        if (!crashPatterns.has(driverMatch[1])) crashPatterns.set(driverMatch[1], 0);
        crashPatterns.set(driverMatch[1], crashPatterns.get(driverMatch[1]) + pattern.count);
      }
    }
  }
}

// Forum mentions
const forumMentions = new Map();
if (forumResults) {
  for (const topic of forumResults.topics || []) {
    if (topic.title) {
      // Try to find driver in title
      const driverMatch = topic.title.match(/\b(sensor|switch|dimmer|bulb|plug|button|climate|contact|motion|presence|radar|valve|thermostat|cover|curtain|blind|siren|smoke|water|gas|air)[a-z_]*/i);
      if (driverMatch) {
        const d = driverMatch[0].toLowerCase();
        if (!forumMentions.has(d)) forumMentions.set(d, 0);
        forumMentions.set(d, forumMentions.get(d) + 1);
      }
    }
  }
}

// Score every driver
const driverScores = [];

function scoreDriver(driverId, manufacturerName, productId) {
  let score = 0;
  const reasons = [];

  // z2m support (match by productId/model only since vendor != manufacturerName)
  if (z2mSet.has(productId)) {
    score += 10;
    reasons.push('+10 z2m');
  }
  // ZHA support
  if (zhaSet.has(`${manufacturerName}|${productId}`)) {
    score += 8;
    reasons.push('+8 ZHA');
  }
  // Sacred Couple
  const sc = sacredCouples.get(`${manufacturerName}|${productId}`);
  if (sc && sc.length > 0) {
    score += 6;
    reasons.push(`+6 sacred-couple(${sc.length})`);
  }
  // Mapped in mfs_db
  if (mfsMappedDevices.has(driverId)) {
    score += 5;
    reasons.push('+5 mfs_db');
  }
  // Crash penalty
  const crashes = crashPatterns.get(driverId) || 0;
  if (crashes > 0) {
    score -= Math.min(30, crashes * 5);
    reasons.push(`-${Math.min(30, crashes * 5)} crashes(${crashes})`);
  }
  // Forum mentions
  const mentions = forumMentions.get(driverId) || 0;
  if (mentions > 0) {
    score += Math.min(10, mentions * 2);
    reasons.push(`+${Math.min(10, mentions * 2)} forum(${mentions})`);
  }

  return { score, reasons };
}

// Walk drivers
const driverDirs = fs.readdirSync(DRIVERS_DIR).filter(d => {
  const full = path.join(DRIVERS_DIR, d);
  return fs.statSync(full).isDirectory();
});

for (const driverId of driverDirs) {
  const composePath = path.join(DRIVERS_DIR, driverId, 'driver.compose.json');
  if (!fs.existsSync(composePath)) continue;

  let compose;
  try { compose = JSON.parse(fs.readFileSync(composePath, 'utf8')); }
  catch { continue; }

  const zigbee = compose.zigbee || {};
  const mfrs = Array.isArray(zigbee.manufacturerName) ? zigbee.manufacturerName : [zigbee.manufacturerName].filter(Boolean);
  const pids = Array.isArray(zigbee.productId) ? zigbee.productId : [zigbee.productId].filter(Boolean);

  if (mfrs.length === 0 || pids.length === 0) continue;

  // Use first mfr+pid pair for scoring (driver-wide score)
  const mfr = mfrs[0];
  const pid = pids[0];

  const result = scoreDriver(driverId, mfr, pid);
  driverScores.push({
    driverId,
    manufacturer: mfr,
    productId: pid,
    mfrCount: mfrs.length,
    pidCount: pids.length,
    score: result.score,
    reasons: result.reasons,
  });
}

// Sort by score descending
driverScores.sort((a, b) => b.score - a.score);

// Compute statistics
const total = driverScores.length;
const avg = total > 0 ? (driverScores.reduce((s, d) => s + d.score, 0) / total).toFixed(1) : 0;
const byTier = {
  platinum: driverScores.filter(d => d.score >= 30).length,
  gold: driverScores.filter(d => d.score >= 20 && d.score < 30).length,
  silver: driverScores.filter(d => d.score >= 10 && d.score < 20).length,
  bronze: driverScores.filter(d => d.score >= 0 && d.score < 10).length,
  'needs-attention': driverScores.filter(d => d.score < 0).length,
};

// Save
const output = {
  meta: {
    generatedAt: new Date().toISOString(),
    totalDrivers: total,
    avgScore: parseFloat(avg),
    tiers: byTier,
    sources: {
      z2m: z2mSet.size,
      zha: zhaSet.size,
      sacredCouples: sacredCouples.size,
      mfsMapped: mfsMappedDevices.size,
      crashes: crashPatterns.size,
      forumMentions: forumMentions.size,
    },
  },
  topDrivers: driverScores.slice(0, 30),
  bottomDrivers: driverScores.slice(-30).reverse(),
  allScores: driverScores,
};

fs.writeFileSync(path.join(STATE_DIR, 'driver-confidence-scores.json'), JSON.stringify(output, null, 2));

console.log(`\n=== Driver Confidence Scoring ===`);
console.log(`Total drivers: ${total}`);
console.log(`Average score: ${avg}`);
console.log(`\nTiers:`);
console.log(`  🏆 Platinum (30+):  ${byTier.platinum}`);
console.log(`  🥇 Gold (20-29):    ${byTier.gold}`);
console.log(`  🥈 Silver (10-19):  ${byTier.silver}`);
console.log(`  🥉 Bronze (0-9):    ${byTier.bronze}`);
console.log(`  ⚠️  Needs attention (<0): ${byTier['needs-attention']}`);
console.log(`\nTop 5 drivers:`);
for (const d of driverScores.slice(0, 5)) {
  console.log(`  ${d.score} - ${d.driverId} (${d.manufacturer}/${d.productId})`);
  console.log(`         ${d.reasons.join(', ')}`);
}
console.log(`\nBottom 5 drivers:`);
for (const d of driverScores.slice(-5).reverse()) {
  console.log(`  ${d.score} - ${d.driverId} (${d.manufacturer}/${d.productId})`);
}
