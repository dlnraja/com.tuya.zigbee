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

module.exports = { loadFingerprints, findDriver, findAllDrivers, extractMfrFromText };
