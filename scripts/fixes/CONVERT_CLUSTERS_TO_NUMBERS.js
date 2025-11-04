#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const APP_JSON = path.join(ROOT, 'app.json');

console.log('🔧 CONVERTING CLUSTER NAMES TO NUMBERS\n');

// Cluster name to ID mapping
const CLUSTER_MAP = {
  'basic': 0,
  'powerConfiguration': 1,
  'identify': 3,
  'groups': 4,
  'scenes': 5,
  'onOff': 6,
  'levelControl': 8,
  'colorControl': 0x0300,
  'illuminanceMeasurement': 0x0400,
  'temperatureMeasurement': 0x0402,
  'pressureMeasurement': 0x0403,
  'relativeHumidity': 0x0405,
  'occupancySensing': 0x0406,
  'iasZone': 0x0500,
  'iasAce': 0x0501,
  'iasWd': 0x0502,
  'metering': 0x0702,
  'electricalMeasurement': 0x0B04,
  'manuSpecificTuya': 0xEF00,
  'manuSpecificTuya2': 0xED00,
  'windowCovering': 0x0102,
  'thermostat': 0x0201,
  'diagnostics': 0x0B05
};

const app = JSON.parse(fs.readFileSync(APP_JSON, 'utf8'));

let fixCount = 0;

for (const driver of app.drivers) {
  if (driver.zigbee && driver.zigbee.endpoints) {
    let modified = false;
    
    for (const [epId, epValue] of Object.entries(driver.zigbee.endpoints)) {
      if (epValue && epValue.clusters && Array.isArray(epValue.clusters)) {
        const newClusters = [];
        
        for (const cluster of epValue.clusters) {
          if (typeof cluster === 'string') {
            const clusterNum = CLUSTER_MAP[cluster];
            if (clusterNum !== undefined) {
              newClusters.push(clusterNum);
              modified = true;
            } else {
              // Try to parse as hex
              if (cluster.startsWith('0x')) {
                newClusters.push(parseInt(cluster, 16));
                modified = true;
              } else {
                newClusters.push(cluster);
              }
            }
          } else {
            newClusters.push(cluster);
          }
        }
        
        if (modified) {
          driver.zigbee.endpoints[epId].clusters = newClusters;
        }
      }
    }
    
    if (modified) {
      console.log(`✅ ${driver.id}`);
      fixCount++;
    }
  }
}

fs.writeFileSync(APP_JSON, JSON.stringify(app, null, 2), 'utf8');

console.log(`\n✅ Total: ${fixCount} fixes\n`);
