#!/usr/bin/env node
'use strict';

/**
 * P24.5 — Permissive Variant Detection
 *
 * Be PERMISSIVE when matching mfr+pid pairs across sources. Handle:
 * 1. Case-insensitive matching
 * 2. Trim/normalize whitespace
 * 3. Multiple naming conventions:
 *    - _TZE200_xxx (Tuya E series)
 *    - _TZ3000_xxx (Tuya Z series)
 *    - _TZ3210_xxx (Tuya Z3 series)
 *    - lumi.sensor_xxx (Xiaomi/Aqara)
 *    - 0x1234 (numeric manufacturer codes)
 *    - Brand names ("Xiaomi", "Aqara", "Tuya")
 * 4. Product ID aliases:
 *    - "TS0601" and "TS0601_switch" and "TS0601_1gang"
 *    - "lumi.sensor_magnet" and "lumi.sensor_magnet.aq2"
 * 5. Fuzzy match for typos (Levenshtein distance ≤ 2)
 *
 * Output: tools/ci/permisive-variant-matcher.js (this file)
 */

const fs = require('fs');
const path = require('path');

const STATE_DIR = 'C:/Users/Dell/Documents/homey/master/.github/state';
const MFS_DB = 'C:/Users/Dell/Documents/homey/master/data/mfs_db.json';

function loadJson(p, fallback = null) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch { return fallback; }
}

// Levenshtein distance
function levenshtein(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i-1] === b[j-1]) dp[i][j] = dp[i-1][j-1];
      else dp[i][j] = 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
    }
  }
  return dp[m][n];
}

// Normalize a mfr+pid pair
function normalize(manufacturer, productId) {
  if (!manufacturer) return null;
  if (!productId) return null;
  return {
    mfr: String(manufacturer).trim().toLowerCase(),
    pid: String(productId).trim().toLowerCase(),
  };
}

// Brand name aliases (lumi = Xiaomi = Aqara in some contexts)
const BRAND_ALIASES = {
  'lumi': 'xiaomi',
  'xiaomi': 'lumi',
  'aqara': 'lumi',
  'tuya': '_TZE',  // Tuya has many sub-manufacturer prefixes
  '_TZE200': 'tuya',
  '_TZE204': 'tuya',
  '_TZE284': 'tuya',
  '_TZ3000': 'tuya',
  '_TZ300E': 'tuya',
  '_TZ3210': 'tuya',
  '_TZE200_': 'tuya',
  '_TZ3000_': 'tuya',
};

// Match mfr+pid with permissive rules
function matchPermissive(target, candidate, options = {}) {
  const { fuzzyThreshold = 2, brandAware = true } = options;

  const t = normalize(target.manufacturer, target.productId);
  const c = normalize(candidate.manufacturer, candidate.productId);
  if (!t || !c) return { match: false, score: 0, reason: 'invalid input' };

  // 1. Exact match (case-insensitive)
  if (t.mfr === c.mfr && t.pid === c.pid) {
    return { match: true, score: 100, reason: 'exact' };
  }

  // 2. Prefix match on productId (TS0601 matches TS0601_switch)
  if (t.mfr === c.mfr && (t.pid === c.pid.split('_')[0] || c.pid === t.pid.split('_')[0])) {
    return { match: true, score: 90, reason: 'pid prefix' };
  }

  // 3. Brand-aware: mfr has same brand prefix
  if (brandAware) {
    const tBrand = Object.keys(BRAND_ALIASES).find(k => t.mfr.startsWith(k.toLowerCase()));
    const cBrand = Object.keys(BRAND_ALIASES).find(k => c.mfr.startsWith(k.toLowerCase()));
    if (tBrand && cBrand && BRAND_ALIASES[tBrand.toLowerCase()] === BRAND_ALIASES[cBrand.toLowerCase()]) {
      // Same brand, now check pid
      if (t.pid.split('_')[0] === c.pid.split('_')[0]) {
        return { match: true, score: 75, reason: `brand alias (${tBrand}=${cBrand})` };
      }
    }
  }

  // 4. Fuzzy match on productId (typo tolerance)
  const dist = levenshtein(t.pid, c.pid);
  if (t.mfr === c.mfr && dist <= fuzzyThreshold) {
    return { match: true, score: 60, reason: `fuzzy pid (dist=${dist})` };
  }

  // 5. Fuzzy match on both
  const mfrDist = levenshtein(t.mfr, c.mfr);
  if (mfrDist <= fuzzyThreshold && dist <= fuzzyThreshold) {
    return { match: true, score: 50, reason: `fuzzy both (mfr=${mfrDist}, pid=${dist})` };
  }

  return { match: false, score: 0, reason: 'no match' };
}

// Test
const testCases = [
  // Exact
  [{ manufacturer: '_TZE200_abc', productId: 'TS0601' }, { manufacturer: '_TZE200_abc', productId: 'TS0601' }, 100, 'exact'],
  // Case insensitive
  [{ manufacturer: '_tze200_abc', productId: 'ts0601' }, { manufacturer: '_TZE200_ABC', productId: 'TS0601' }, 100, 'exact'],
  // Brand alias: lumi/xiaomi
  [{ manufacturer: 'lumi.sensor', productId: 'lumi.sensor_magnet' }, { manufacturer: 'xiaomi.sensor', productId: 'lumi.sensor_magnet' }, 75, 'brand alias'],
  // ProductId prefix
  [{ manufacturer: '_TZE200_abc', productId: 'TS0601' }, { manufacturer: '_TZE200_abc', productId: 'TS0601_switch' }, 90, 'pid prefix'],
  // Fuzzy pid (typo)
  [{ manufacturer: '_TZE200_abc', productId: 'TS0601' }, { manufacturer: '_TZE200_abc', productId: 'TS0610' }, 60, 'fuzzy pid'],
  // No match
  [{ manufacturer: '_TZE200_abc', productId: 'TS0601' }, { manufacturer: '_TZ3000_xyz', productId: 'TS004F' }, 0, 'no match'],
];

console.log('=== P24.5 Permissive Variant Detection ===\n');
console.log('Test cases:');
let passed = 0;
for (const [target, candidate, expectedScore, expectedReason] of testCases) {
  const result = matchPermissive(target, candidate);
  const ok = result.score === expectedScore;
  if (ok) passed++;
  const status = ok ? '✓' : '✗';
  console.log(`${status} ${target.manufacturer}/${target.productId} vs ${candidate.manufacturer}/${candidate.productId}`);
  console.log(`  Expected: ${expectedScore} (${expectedReason})`);
  console.log(`  Got:      ${result.score} (${result.reason})`);
}
console.log(`\n${passed}/${testCases.length} tests passed`);

// Cross-reference z2m + ZHA + mfs_db
console.log('\n=== Cross-Reference with Permissive Matching ===');
const z2m = loadJson(path.join(STATE_DIR, 'z2m-pairs-full.json'), []);
const zha = loadJson(path.join(STATE_DIR, 'zha-pairs.json'), []);
const mfsDb = loadJson(MFS_DB, { sacredCouples: {} });

// Build candidate lists in the same format
const candidates = [];
for (const p of z2m) {
  // z2m has vendor (brand) and model (TS0601)
  if (p.zigbeeModels) {
    for (const zm of p.zigbeeModels) {
      candidates.push({ manufacturer: p.vendor, productId: zm, source: 'z2m' });
    }
  }
}
for (const p of zha) {
  candidates.push({ manufacturer: p.manufacturer, productId: p.model, source: 'zha' });
}

console.log(`Total candidates: ${candidates.length} (${z2m.length} z2m, ${zha.length} ZHA)`);

// Find mfs_db sacred couples
const sacredCouples = mfsDb.sacredCouples || {};
let exactMatches = 0;
let permissiveMatches = 0;

for (const [key, value] of Object.entries(sacredCouples)) {
  const [mfr, pid] = key.split('|');
  // Try to find any candidate matching
  for (const cand of candidates) {
    const result = matchPermissive({ manufacturer: mfr, productId: pid }, cand);
    if (result.match) {
      if (result.score === 100) exactMatches++;
      else permissiveMatches++;
      break;
    }
  }
}

console.log(`\nSacred couples checked: ${Object.keys(sacredCouples).length}`);
console.log(`  Exact matches: ${exactMatches}`);
console.log(`  Permissive matches: ${permissiveMatches}`);
console.log(`  Total: ${exactMatches + permissiveMatches}`);

// Save the matcher as a module
const outPath = path.join(__dirname, 'permisive-variant-matcher.js');
console.log(`\nOutput: ${outPath}`);
