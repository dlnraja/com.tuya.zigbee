'use strict';
// analyze-fingerprints-db.js - Analyse la structure de fingerprints.json

const fs = require('fs');
const path = require('path');

console.log('Loading fingerprints.json (buffer mode)...');
const buf = fs.readFileSync(path.join(__dirname, '..', 'data', 'fingerprints.json'));
const fps = JSON.parse(buf);

// Indexer par driverId
const driverIds = {};
Object.entries(fps).forEach(([mf, info]) => {
  const did = info.driverId || info.type;
  if (!did) return;
  if (!driverIds[did]) driverIds[did] = { count: 0, mfs: [], modelIds: new Set() };
  driverIds[did].count++;
  driverIds[did].mfs.push(mf);
  (info.modelIds || []).forEach(m => driverIds[did].modelIds.add(m));
});

// Trier par nombre de MFs
const sorted = Object.entries(driverIds).sort((a, b) => b[1].count - a[1].count);

console.log('=== DRIVER IDs DANS fingerprints.json ===');
console.log('Total unique drivers:', sorted.length);
sorted.slice(0, 40).forEach(([id, data]) => {
  console.log(`  ${id}: ${data.count} MFs, PIDs: ${[...data.modelIds].join(',')}`);
});

// Ecrire le mapping complet
const output = {};
sorted.forEach(([id, data]) => {
  output[id] = {
    manufacturerNames: data.mfs,
    productIds: [...data.modelIds]
  };
});

fs.writeFileSync(
  path.join(__dirname, '..', 'tmp', 'fingerprints-by-driver.json'),
  JSON.stringify(output, null, 2)
);
console.log('\nEcrit: tmp/fingerprints-by-driver.json');
