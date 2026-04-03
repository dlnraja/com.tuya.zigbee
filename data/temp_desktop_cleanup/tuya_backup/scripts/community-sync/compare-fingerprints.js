#!/usr/bin/env node
const fs = require('fs'), path = require('path');
const driversDir = path.join(__dirname, '../../drivers');

function getCurrentFingerprints() {
  const fps = new Set();
  fs.readdirSync(driversDir).forEach(d => {
    try {
      const c = JSON.parse(fs.readFileSync(path.join(driversDir, d, 'driver.compose.json')));
      [].concat(c.zigbee?.manufacturerName || []).forEach(m => m && fps.add(m));
    } catch(e) {}
  });
  return fps;
}

module.exports = { getCurrentFingerprints };
