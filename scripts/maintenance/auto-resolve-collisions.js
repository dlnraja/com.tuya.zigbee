#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '..', '..', 'drivers');

function getBaseName(driverName) {
  return driverName.split('_').filter(p => !/\d/.test(p) && p !== 'sensor' && p !== 'switch').join('_');
}

function createHybridDriver() {
  console.log('=== Auto-Resolving TRUE Fingerprint Collisions ===\n');

  const fpMap = new Map(); // mfr|pid -> [driverNames]
  
  const drivers = fs.readdirSync(DRIVERS_DIR).filter(d => fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory());
  for (const driver of drivers) {
    const composeFile = path.join(DRIVERS_DIR, driver, 'driver.compose.json');
    if (!fs.existsSync(composeFile)) continue;
    try {
      const compose = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
      const mfrNames = compose.zigbee?.manufacturerName || []      ;
      const pIdNames = compose.zigbee?.productId || []       ;
      for (const mfr of mfrNames) {
        for (const pid of pIdNames) {
          const key = `${mfr}|${pid}`;
          if (!fpMap.has(key)) fpMap.set(key, []);
          fpMap.get(key).push(driver);
        }
      }
    } catch(e) {}
  }

  const collisionGroups = new Map(); // "driver1,driver2" -> [mfr|pid, mfr|pid]

  for (const [key, drvs] of fpMap) {
    const uniqueDrivers = [...new Set(drvs)].sort();
    if (uniqueDrivers.length > 1) {
      const groupKey = uniqueDrivers.join(',');
      if (!collisionGroups.has(groupKey)) collisionGroups.set(groupKey, []);
      collisionGroups.get(groupKey).push(key);
    }
  }

  if (collisionGroups.size === 0) {
    console.log('No TRUE collisions found!');
    return;
  }

  for (const [groupKey, fps] of collisionGroups) {
    const sourceDrivers = groupKey.split(',');
    
    // Generate logical category name
    const parts = new Set();
    const types = new Set();
    for (const d of sourceDrivers) {
      if (d.includes('switch')) types.add('switch');
      else if (d.includes('dimmer')) types.add('dimmer');
      else if (d.includes('remote') || d.includes('button')) types.add('remote');
      else if (d.includes('sensor')) types.add('sensor');
      else if (d.includes('bulb') || d.includes('light')) types.add('light');
      else if (d.includes('curtain') || d.includes('roller')) types.add('curtain');
      else types.add('device');

      const split = d.split('_');
      for (const p of split) if (!/\d/.test(p) && p !== 'gang' && p.length > 2) parts.add(p);
    }

    // Try to build a clean name like bulb_rgb_rgbw_hybrid
    let newName = Array.from(parts).slice(0, 3).join('_') + '_hybrid';
    if (types.size === 1) {
      newName = Array.from(types)[0] + '_' + newName;
    }

    // Clean up duplicated words in newName
    const finalWords = [...new Set(newName.split('_'))];
    newName = finalWords.join('_' );

    const targetDir = path.join(DRIVERS_DIR, newName);

    console.log(`\nResolving collision between: ${sourceDrivers.join(' & ')}`);
    console.log(`Creating combined hybrid driver: ${newName}`);

    // If it doesn't exist, create it by copying the most capable driver (the one with most capabilities)
    let bestDriver = sourceDrivers[0];
    let maxCaps = 0;
    const driverData = new Map();

    for (const d of sourceDrivers) {
      const composeFile = path.join(DRIVERS_DIR, d, 'driver.compose.json');
      const compose = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
      driverData.set(d, compose);
      if (compose.capabilities && compose.capabilities.length > maxCaps) {
        maxCaps = compose.capabilities.length;
        bestDriver = d;
      }
    }

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
      // Copy all base files from bestDriver
      const bestDriverDir = path.join(DRIVERS_DIR, bestDriver);
      const filesToCopy = fs.readdirSync(bestDriverDir);
      for (const f of filesToCopy) {
        fs.cpSync(path.join(bestDriverDir, f), path.join(targetDir, f), { recursive: true });
      }

      // Merge capabilities and endpoints from all clashing drivers into the hybrid's compose
      const hybridComposeFile = path.join(targetDir, 'driver.compose.json');
      const hybridCompose = JSON.parse(fs.readFileSync(hybridComposeFile, 'utf8'));
      
      const allCaps = new Set(hybridCompose.capabilities || []);
      const allMfrs = new Set();
      const allPids = new Set();

      // Change name
      hybridCompose.name = {
        "en": newName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        "nl": newName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        "fr": newName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      };

      for (const d of sourceDrivers) {
        const c = driverData.get(d);
        if (c.capabilities) c.capabilities.forEach(cap => allCaps.add(cap));
      }

      hybridCompose.capabilities = Array.from(allCaps);
      
      // Add the clashing FPs to the hybrid driver
      for (const fp of fps) {
        const [mfr, pid] = fp.split('|');
        allMfrs.add(mfr);
        allPids.add(pid);
      }
      
      if(!hybridCompose.zigbee) hybridCompose.zigbee = {};
      hybridCompose.zigbee.manufacturerName = Array.from(allMfrs);
      hybridCompose.zigbee.productId = Array.from(allPids);
      
      fs.writeFileSync(hybridComposeFile, JSON.stringify(hybridCompose, null, 2) + '\n');
    } else {
      // If hybrid already exists, just append the FPs
      const hybridComposeFile = path.join(targetDir, 'driver.compose.json');
      const hybridCompose = JSON.parse(fs.readFileSync(hybridComposeFile, 'utf8'));
      
      const allMfrs = new Set(hybridCompose.zigbee?.manufacturerName || [])      ;
      const allPids = new Set(hybridCompose.zigbee?.productId || [])       ;

      for (const fp of fps) {
        const [mfr, pid] = fp.split('|');
        allMfrs.add(mfr);
        allPids.add(pid);
      }

      hybridCompose.zigbee.manufacturerName = Array.from(allMfrs);
      hybridCompose.zigbee.productId = Array.from(allPids);
      fs.writeFileSync(hybridComposeFile, JSON.stringify(hybridCompose, null, 2) + '\n');
    }

    // Now, REMOVE the clashing manufacturer AND productId intersections from the old drivers
    for (const fp of fps) {
      const [mfr, pid] = fp.split('|');
      console.log(`  -> Moving FP: ${mfr} / ${pid} to ${newName}`);
      
      for (const d of sourceDrivers) {
        const composeFile = path.join(DRIVERS_DIR, d, 'driver.compose.json');
        const compose = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
        
        if (compose.zigbee && compose.zigbee.manufacturerName && compose.zigbee.productId) {
           const otherPidsForThisMfr = fpMap.keys();
           let mfrNeededForOtherPids = false;
           for (const [k, dList] of fpMap) {
             if (k.startsWith(mfr + '|') && k !== `${mfr}|${pid}` && dList.includes(d)) {
               mfrNeededForOtherPids = true;
               break;
             }
           }
           
           let pidNeededForOtherMfrs = false;
           for (const [k, dList] of fpMap) {
             if (k.endsWith('|' + pid) && k !== `${mfr}|${pid}` && dList.includes(d)) {
               pidNeededForOtherMfrs = true;
               break;
             }
           }

           if (!mfrNeededForOtherPids) {
             compose.zigbee.manufacturerName = compose.zigbee.manufacturerName.filter(m => m !== mfr);
           } else if (!pidNeededForOtherMfrs) {
             compose.zigbee.productId = compose.zigbee.productId.filter(p => p !== pid);
           } else {
             compose.zigbee.manufacturerName = compose.zigbee.manufacturerName.filter(m => m !== mfr);
           }

           fs.writeFileSync(composeFile, JSON.stringify(compose, null, 2) + '\n');
        }
      }
    }
  }

  console.log('\n Collision resolution complete!');
}

createHybridDriver();
