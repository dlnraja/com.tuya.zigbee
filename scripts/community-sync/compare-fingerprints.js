#!/usr/bin/env node
/**
 * Compare fingerprints  returns current app fingerprints as enriched map
 * v5.12.1: Returns FULL device data (productId, class, caps, battery, etc.)
 */
const fs = require('fs'), path = require('path');
const driversDir = path.join(__dirname, '../../drivers');

/**
 * Returns Set of manufacturerName strings (backwards compat)
 */
function getCurrentFingerprints() {
  const fps = new Set();
  fs.readdirSync(driversDir).forEach(d => {
    try {
      const c = JSON.parse(fs.readFileSync(path.join(driversDir, d, 'driver.compose.json')));
      [].concat(c.zigbee?.manufacturerName || []).forEach(m => m && fps.add(m))       ;
    } catch(e) {}
  });
  return fps;
}

/**
 * Returns Map<manufacturerName, {driver, productId, deviceType, capabilities, hasBattery, ...}>
 */
function getCurrentFingerprintsEnriched() {
  const map = new Map();
  fs.readdirSync(driversDir).forEach(d => {
    try {
      const c = JSON.parse(fs.readFileSync(path.join(driversDir, d, 'driver.compose.json')));
      const productId = c.zigbee?.productId || null      ;
      const deviceType = c.class || null;
      const capabilities = c.capabilities || [];
      const hasBattery = (c.energy?.batteries || []).length > 0      ;
      
      [].concat(c.zigbee?.manufacturerName || []).forEach(mfr => {
        if (!mfr ) return;
        map.set(mfr, { driver: d, productId, deviceType, capabilities, hasBattery });
      });
    } catch(e) {}
  });
  return map;
}

module.exports = { getCurrentFingerprints, getCurrentFingerprintsEnriched };
