#!/usr/bin/env node
'use strict';
/**
 * Collision Analyzer - v1.0.0
 * Analyzes all manufacturerName+productId collisions across drivers
 * Identifies which drivers need splitting and creates action plan
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '../../drivers');
const OUTPUT_FILE = path.join(__dirname, '../../docs/reports/COLLISION_ANALYSIS.json');

function main() {
  console.log('=== Collision Analyzer ===\n');
  
  const driverDirs = fs.readdirSync(DRIVERS_DIR).filter(d => {
    return fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory();
  });
  
  // Build fingerprint map: key = mfr|productId
  const fingerprintMap = {};
  const allFingerprints = [];
  
  for (const driver of driverDirs) {
    const composePath = path.join(DRIVERS_DIR, driver, 'driver.compose.json');
    if (!fs.existsSync(composePath)) continue;
    
    try {
      const data = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      const mfrs = data.zigbee?.manufacturerName || []      ;
      const pids = data.zigbee?.productId || []       ;
      
      for (const mfr of mfrs) {
        for (const pid of pids ) {
          const key = mfr + '|' + pid;
          if (!fingerprintMap[key]) {
            fingerprintMap[key] = { drivers: [], mfr, pid };
          }
          fingerprintMap[key].drivers.push(driver);
          allFingerprints.push({ mfr, pid, driver });
        }
      }
    } catch (e) {
      // Skip invalid files
    }
  }
  
  // Find collisions (same fingerprint in multiple drivers)
  const collisions = [];
  let totalCollisions = 0;
  
  for (const [key, data] of Object.entries(fingerprintMap)) {
    if (data.drivers.length > 1) {
      // Normalize for case-insensitive check
      const normalizedMfr = data.mfr.toUpperCase().replace(/\u0000/g, '');
      const normalizedKey = normalizedMfr + '|' + data.pid.toUpperCase();
      
      // Check if already recorded
      const isDuplicate = collisions.some(c => 
        c.normalizedKey === normalizedKey
      );
      
      if (!isDuplicate) {
        collisions.push({
          mfr: data.mfr,
          pid: data.pid,
          normalizedKey,
          drivers: [...new Set(data.drivers)],
          driverCount: data.drivers.length
        });
        totalCollisions += (data.drivers.length - 1);
      }
    }
  }
  
  // Categorize collisions
  const categories = {
    critical: [], // Same mfr+pid in 3+ drivers
    high: [],     // Same mfr+pid in 2 drivers
    medium: []    // Same mfr in multiple drivers
  };
  
  for (const c of collisions) {
    if (c.driverCount >= 3) {
      categories.critical.push(c);
    } else if (c.driverCount === 2) {
      categories.high.push(c);
    }
  }
  
  // Create action plan
  const actionPlan = [];
  
  for (const c of categories.critical) {
    actionPlan.push({
      type: 'CRITICAL_SPLIT',
      mfr: c.mfr,
      pid: c.pid,
      drivers: c.drivers,
      recommendation: 'Consider consolidating into single driver or adding differentiation via endpoints/clusters'
    });
  }
  
  for (const c of categories.high) {
    actionPlan.push({
      type: 'REVIEW_NEEDED',
      mfr: c.mfr,
      pid: c.pid,
      drivers: c.drivers,
      recommendation: 'Review if drivers serve different device types or can be merged'
    });
  }
  
  // Summary
  console.log('=== Collision Summary ===\n');
  console.log('Total unique fingerprints:', allFingerprints.length);
  console.log('Collision groups:', collisions.length);
  console.log('Total collision instances:', totalCollisions);
  console.log('');
  console.log('Critical (3+ drivers):', categories.critical.length);
  console.log('High (2 drivers):', categories.high.length);
  
  if (categories.critical.length > 0) {
    console.log('\n=== Top Critical Collisions ===');
    for (const c of categories.critical.slice(0, 10)) {
      console.log('  ' + c.mfr + '|' + c.pid + ' -> ' + c.drivers.join(', '));
    }
  }
  
  // Save report
  const report = {
    timestamp: new Date().toISOString(),
    stats: {
      totalFingerprints: allFingerprints.length,
      collisionGroups: collisions.length,
      totalCollisionInstances: totalCollisions,
      critical: categories.critical.length,
      high: categories.high.length
    },
    criticalCollisions: categories.critical,
    highCollisions: categories.high,
    actionPlan
  };
  
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(report, null, 2));
  console.log('\nReport saved to:', OUTPUT_FILE);
  
  return report;
}

main();
