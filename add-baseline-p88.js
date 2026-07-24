#!/usr/bin/env node
// Add new Sacred Couples to baseline (P88)
const fs = require('fs');
const path = require('path');
const file = path.resolve('.github/fingerprint-collision-baseline.json');
const j = JSON.parse(fs.readFileSync(file, 'utf8'));
const newKeys = [
  'HOBEIAN|scene_switch_6,switch_plug_1,switch_plug_2,switch_temp_sensor,switch_wall_7gang,water_leak_sensor',
  'hobeian|scene_switch_6,switch_plug_1,switch_plug_2,switch_temp_sensor,switch_wall_7gang,water_leak_sensor'
];
let added = 0;
for (const k of newKeys) {
  if (j.collisions.find(c => c.key === k)) continue;
  const drivers = k.split('|')[1].split(',');
  j.collisions.push({
    key: k,
    drivers,
    note: 'Sacred Couple - HOBEIAN generic mfr (water leak + switch + scene); added P88 for ZG-222Z coverage'
  });
  added++;
}
j.generatedAt = new Date().toISOString();
fs.writeFileSync(file, JSON.stringify(j, null, 2));
console.log(`Added ${added} collisions; baseline now has ${j.collisions.length}`);
