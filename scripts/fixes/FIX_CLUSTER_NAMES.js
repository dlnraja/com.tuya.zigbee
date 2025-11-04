#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

console.log('🔧 FIXING CLUSTER NAMES\n');

// Zigbee cluster ID to name mapping
const CLUSTER_MAP = {
  0: 'basic',
  1: 'powerConfiguration',
  3: 'identify',
  4: 'groups',
  5: 'scenes',
  6: 'onOff',
  8: 'levelControl',
  0x0300: 'colorControl',
  0x0400: 'illuminanceMeasurement',
  0x0402: 'temperatureMeasurement',
  0x0403: 'pressureMeaseasurement',
  0x0405: 'relativeHumidity',
  0x0406: 'occupancySensing',
  0x0500: 'iasZone',
  0x0501: 'iasAce',
  0x0502: 'iasWd',
  0x0702: 'metering',
  0x0B04: 'electricalMeasurement',
  0xEF00: 'manuSpecificTuya',
  0xED00: 'manuSpecificTuya2',
  0x0102: 'windowCovering',
  0x0201: 'thermostat',
  0x0B05: 'diagnostics'
};

let fixCount = 0;

const drivers = fs.readdirSync(DRIVERS_DIR).filter(d => {
  const stat = fs.statSync(path.join(DRIVERS_DIR, d));
  return stat.isDirectory();
});

for (const driverName of drivers) {
  const composeFile = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');
  
  if (!fs.existsSync(composeFile)) continue;
  
  const compose = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
  let modified = false;
  
  if (compose.zigbee && compose.zigbee.endpoints) {
    for (const [epId, epValue] of Object.entries(compose.zigbee.endpoints)) {
      if (epValue && epValue.clusters) {
        const newClusters = [];
        let hasNumericClusters = false;
        
        for (const cluster of epValue.clusters) {
          if (typeof cluster === 'number') {
            hasNumericClusters = true;
            const clusterName = CLUSTER_MAP[cluster];
            if (clusterName) {
              newClusters.push(clusterName);
            } else {
              // Keep unknown numeric clusters as hex string
              newClusters.push(`0x${cluster.toString(16).toUpperCase().padStart(4, '0')}`);
            }
          } else {
            newClusters.push(cluster);
          }
        }
        
        if (hasNumericClusters) {
          compose.zigbee.endpoints[epId].clusters = newClusters;
          modified = true;
        }
      }
    }
  }
  
  if (modified) {
    fs.writeFileSync(composeFile, JSON.stringify(compose, null, 2), 'utf8');
    console.log(`✅ ${driverName}`);
    fixCount++;
  }
}

console.log(`\n✅ Total: ${fixCount} drivers fixed\n`);
