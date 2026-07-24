#!/usr/bin/env node
// Add new Sacred Couple to baseline
const fs = require('fs');
const path = require('path');
const file = path.resolve('.github/fingerprint-collision-baseline.json');
const j = JSON.parse(fs.readFileSync(file, 'utf8'));
const newKey = '_TZE204_81yrt3lo|din_rail_meter,presence_sensor_radar';
if (j.collisions.find(c => c.key === newKey)) {
  console.log('Already in baseline');
} else {
  j.collisions.push({
    key: newKey,
    drivers: ['din_rail_meter', 'presence_sensor_radar'],
    note: 'Sacred Couple - 81yrt3lo dual energy meter (P87: moved from presence_sensor_radar to din_rail_meter, kept for back-compat)'
  });
  j.generatedAt = new Date().toISOString();
  fs.writeFileSync(file, JSON.stringify(j, null, 2));
  console.log('Added', newKey, 'baseline now has', j.collisions.length, 'collisions');
}
