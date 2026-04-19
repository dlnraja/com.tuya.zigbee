#!/usr/bin/env node
'use strict';

/**
 * 
 *       RELAX MANIFEST CLUSTERS - v1.0.0                                        
 * 
 *   Bypasses Homey's strict cluster matching for Tuya devices in bridge mode.   
 *   If a driver supports Tuya MCU devices (_TZE...), it should only require     
 *   Cluster 0 (Basic) and Cluster 61184 (Tuya) to match correctly.              
 * 
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '../../drivers');

// List of drivers where we KNOW we want relaxed matching
const HYBRID_DRIVERS = [
  'sensor_motion_presence_hybrid',
  'sensor_presence_radar_hybrid',
  'sensor_climate_water_hybrid',
  'sensor_climate_temphumidsensor_hybrid',
  'sensor_contact_motion_hybrid',
  'sensor_contact_presence_hybrid',
  'sensor_motion_radar_hybrid',
  'plug_energy_monitor',
  'plug_smart',
  'switch_hybrid',
  'soil_sensor',
  'lcdtemphumidsensor',
  'climate_sensor'
];

function processFile(filePath) {
  let content;
  try {
    content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    console.error(`  [ERR] Failed to parse ${filePath}: ${e.message}`);
    return;
  }

  if (!content.zigbee || !content.zigbee.endpoints) return;

  const driverName = path.basename(path.dirname(filePath));
  const manufacturerNames = content.zigbee.manufacturerName || [];
  
  // Decide if this driver needs relaxation
  const hasTuyaMCU = manufacturerNames.some(m => m.startsWith('_TZE') || m.startsWith('_TZE'));
  const isHybrid = HYBRID_DRIVERS.includes(driverName);
  const alreadyHasTuyaCluster = Object.values(content.zigbee.endpoints).some(ep => ep.clusters && ep.clusters.includes(61184));

  if (hasTuyaMCU || isHybrid || alreadyHasTuyaCluster) {
    let changed = false;
    for (const epId in content.zigbee.endpoints) {
      const ep = content.zigbee.endpoints[epId];
      if (ep.clusters) {
        // Find if it has 0 and 61184
        const originalClusters = [...ep.clusters];
        const newClusters = [0, 61184];
        
        // We only replace if we are simplifying (e.g. [0, 1024, 1280, 61184] -> [0, 61184])
        // If it was pure ZCL [0, 6], we don't force 61184 unless it's a Hybrid driver
        if (originalClusters.includes(61184)) {
            if (ep.clusters.length > 2 || !ep.clusters.includes(0)) {
                ep.clusters = [0, 61184];
                changed = true;
            }
        } else if (isHybrid) {
             ep.clusters = [0, 61184];
             changed = true;
        }
      }
    }

    if (changed) {
      fs.writeFileSync(filePath, JSON.stringify(content, null, 2) + '\n');
      console.log(`  [RELAX] Updated ${driverName}: Simplified endpoint clusters to [0, 61184].`);
    }
  }
}

function walk(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (file === 'driver.compose.json') {
      processFile(fullPath);
    }
  });
}

console.log('Starting Manifest Cluster Relaxation...');
walk(DRIVERS_DIR);
console.log('Done.');
