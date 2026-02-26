#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');

function loadFingerprints() {
  const fps = new Set();
  const driversDir = path.join(__dirname, '..', '..', 'drivers');
  for (const d of fs.readdirSync(driversDir)) {
    const cf = path.join(driversDir, d, 'driver.compose.json');
    if (!fs.existsSync(cf)) continue;
    try {
      const data = JSON.parse(fs.readFileSync(cf, 'utf8'));
      for (const m of (data.zigbee?.manufacturerName || [])) fps.add(m);
      for (const p of (data.zigbee?.productId || [])) fps.add(p);
    } catch (e) {
      const matches = fs.readFileSync(cf, 'utf8').match(/"_T[A-Za-z0-9_]+"/g) || [];
      for (const m of matches) fps.add(m.replace(/"/g, ''));
    }
  }
  return fps;
}

function findDriver(fp) {
  const driversDir = path.join(__dirname, '..', '..', 'drivers');
  for (const d of fs.readdirSync(driversDir)) {
    const cf = path.join(driversDir, d, 'driver.compose.json');
    if (!fs.existsSync(cf)) continue;
    if (fs.readFileSync(cf, 'utf8').includes(`"${fp}"`)) return d;
  }
  return null;
}

function findAllDrivers(fp) {
  const driversDir = path.join(__dirname, '..', '..', 'drivers');
  const result = [];
  for (const d of fs.readdirSync(driversDir)) {
    const cf = path.join(driversDir, d, 'driver.compose.json');
    if (!fs.existsSync(cf)) continue;
    if (fs.readFileSync(cf, 'utf8').includes(`"${fp}"`)) result.push(d);
  }
  return result;
}

function extractMfrFromText(text) {
  const results = new Set();
  // Tuya _T* patterns
  const tuya = text.match(/_T[A-Z][A-Za-z0-9]{3,5}_[a-z0-9]{4,16}/g) || [];
  tuya.forEach(m => results.add(m));
  // Non-Tuya known manufacturer names
  const known = ['eWeLink', 'SONOFF', 'Legrand', 'Danfoss', 'D5X84YU',
    'Schneider Electric', 'BOSCH', 'LUMI', 'Aqara', 'IKEA of Sweden',
    'NIKO NV', 'Netatmo', 'Wiser', 'Philips', 'OSRAM', 'innr'];
  for (const k of known) {
    if (text.includes(k)) results.add(k);
  }
  // Sonoff product IDs (SNZB-*)
  const snzb = text.match(/SNZB-\d{2}[A-Z0-9]*/g) || [];
  snzb.forEach(m => results.add(m));
  return [...results];
}

// NON-TUYA manufacturers and productIds that appear in driver.compose.json
// but DON'T match the _T* or TS* regex patterns
const NON_TUYA_KNOWN = [
  'HOBEIAN', 'Zbeacon', 'SONOFF', 'eWeLink', 'Legrand', 'Danfoss',
  'BOSCH', 'Schneider Electric', 'NIKO NV', 'Netatmo', 'Wiser',
  'TUYATEC-ktge2vqt', 'TUYATEC-smmlguju', 'D5X84YU', 'Hobeian'
];

// Product IDs that don't match TS#### pattern
const NON_TS_PIDS = [
  'ZG-102Z', 'ZG-102ZL', 'ZG-102ZM', 'ZG-101ZL', 'ZG-101ZS',
  'ZG-204Z', 'ZG-204ZH', 'ZG-204ZK', 'ZG-204ZL', 'ZG-204ZM', 'ZG-204ZV',
  'ZG-205Z', 'ZG-222Z', 'ZG-223Z', 'ZG-227Z', 'ZG-303Z',
  'DS01', 'RH3001', 'RH3040', 'MCCGQ01LM', 'MCCGQ11LM',
  'SNZB-01', 'SNZB-02', 'SNZB-03', 'SNZB-04', 'SNZB-01P', 'SNZB-02P',
  'SNZB-03P', 'SNZB-04P', 'ZBMINI', 'ZBMINI-L', 'ZBMINIL2', 'ZBMINIR2'
];

/**
 * Build a FULL index of ALL manufacturerNames and productIds from driver.compose.json files.
 * Unlike buildIndex() in other scripts, this captures ALL entries, not just _T* and TS* patterns.
 * Returns {mfrIdx: Map<string,string[]>, pidIdx: Map<string,string[]>, allMfrs: Set, allPids: Set}
 */
function buildFullIndex(driversDir) {
  driversDir = driversDir || path.join(__dirname, '..', '..', 'drivers');
  const mfrIdx = new Map(), pidIdx = new Map();
  const allMfrs = new Set(), allPids = new Set();
  if (!fs.existsSync(driversDir)) return { mfrIdx, pidIdx, allMfrs, allPids };
  for (const d of fs.readdirSync(driversDir)) {
    const f = path.join(driversDir, d, 'driver.compose.json');
    if (!fs.existsSync(f)) continue;
    try {
      const data = JSON.parse(fs.readFileSync(f, 'utf8'));
      for (const m of (data.zigbee?.manufacturerName || [])) {
        allMfrs.add(m);
        if (!mfrIdx.has(m)) mfrIdx.set(m, []);
        if (!mfrIdx.get(m).includes(d)) mfrIdx.get(m).push(d);
      }
      for (const p of (data.zigbee?.productId || [])) {
        allPids.add(p);
        if (!pidIdx.has(p)) pidIdx.set(p, []);
        if (!pidIdx.get(p).includes(d)) pidIdx.get(p).push(d);
      }
    } catch {}
  }
  return { mfrIdx, pidIdx, allMfrs, allPids };
}

/**
 * Extract ALL fingerprints from text — Tuya _T*, TS####, AND known non-Tuya patterns.
 * Uses the full index to match any known manufacturerName or productId found in text.
 * @param {string} text - raw text to scan
 * @param {Set} [allMfrs] - optional set of all known manufacturerNames from buildFullIndex
 * @param {Set} [allPids] - optional set of all known productIds from buildFullIndex
 */
function extractAllFP(text, allMfrs, allPids) {
  const mfr = [...new Set((text || '').match(/_T[A-Z][A-Za-z0-9]{3,5}_[a-z0-9]{4,16}/g) || [])];
  const pid = [...new Set((text || '').match(/\bTS[0-9]{4}[A-Z]?\b/g) || [])];
  // Check for known non-Tuya manufacturers in text
  for (const k of NON_TUYA_KNOWN) {
    if (text && text.includes(k) && !mfr.includes(k)) mfr.push(k);
  }
  // Check for known non-TS productIds
  for (const p of NON_TS_PIDS) {
    if (text && text.includes(p) && !pid.includes(p)) pid.push(p);
  }
  // If full index provided, also scan for any exact match of known mfrs/pids
  if (allMfrs) {
    for (const m of allMfrs) {
      if (m.length >= 4 && text && text.includes(m) && !mfr.includes(m)) mfr.push(m);
    }
  }
  if (allPids) {
    for (const p of allPids) {
      if (p.length >= 4 && text && text.includes(p) && !pid.includes(p)) pid.push(p);
    }
  }
  return { mfr, pid };
}

module.exports = { loadFingerprints, findDriver, findAllDrivers, extractMfrFromText, buildFullIndex, extractAllFP, NON_TUYA_KNOWN, NON_TS_PIDS };
