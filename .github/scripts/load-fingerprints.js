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
    const matches = fs.readFileSync(cf, 'utf8').match(/"_T[A-Za-z0-9_]+"/g) || [];
    for (const m of matches) fps.add(m.replace(/"/g, ''));
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
  const re = /_T[A-Z][A-Za-z0-9]{3,5}_[a-z0-9]{4,16}/g;
  return [...new Set((text.match(re) || []))];
}

module.exports = { loadFingerprints, findDriver, findAllDrivers, extractMfrFromText };
