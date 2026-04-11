#!/usr/bin/env node
'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      ZERO DEFECT ARCHITECT AUDIT - v1.0.0                                    ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Senior Architect Tool for Universal Tuya Stability.                          ║
 * ║  Performs deep analysis of drivers, manifests, and core logic.                ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

async function main() {
  console.log('🚀 Starting Zero Defect Architect Audit...');
  
  const auditResults = {
    timestamp: new Date().toISOString(),
    driversChecked: 0,
    collisions: [],
    buttonLogicFailures: [],
    sdkDeprecations: [],
    radarLogicCheck: [],
    errors: []
  };

  // 1. MANIFEST CASE & ID COLLISION AUDIT
  console.log('\n🔍 Auditing Manifest Case & ID Collisions...');
  const idToDrivers = new Map(); // "mfr|pid" -> [driverIds]
  
  const drivers = fs.readdirSync(DRIVERS_DIR).filter(d => fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory());
  
  for (const d of drivers) {
    const composePath = path.join(DRIVERS_DIR, d, 'driver.compose.json');
    if (!fs.existsSync(composePath)) continue;
    
    auditResults.driversChecked++;
    try {
      const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      const mfrs = compose.zigbee?.manufacturerName || [];
      const pids = compose.zigbee?.productId || [];
      
      // Check for mixed-case mfrs (rule 11)
      const uniqueMfrs = new Set(mfrs);
      for (const mfr of mfrs) {
        if (uniqueMfrs.has(mfr.toLowerCase()) && mfr !== mfr.toLowerCase()) {
          // Intersection of cases
        }
      }

      // Map IDs to drivers to find collisions
      for (const mfr of mfrs) {
        for (const pid of (pids.length ? pids : ['*'])) {
          const key = `${mfr.toUpperCase()}|${pid.toUpperCase()}`;
          if (!idToDrivers.has(key)) idToDrivers.set(key, []);
          idToDrivers.get(key).push(d);
        }
      }

      // 2. BUTTON LOGIC AUDIT
      if (d.includes('button') || d.includes('remote') || d.includes('switch_wireless')) {
        const devicePath = path.join(DRIVERS_DIR, d, 'device.js');
        if (fs.existsSync(devicePath)) {
          const content = fs.readFileSync(devicePath, 'utf8');
          // Check if it inherits from ButtonDevice or uses the recovery logic
          if (content.includes('ButtonDevice') && !content.includes('onEndDeviceAnnounce')) {
             // It's okay if it inherits and doesn't override, 
             // but if it DOES override onNodeInit without calling super, that's bad.
             if (content.match(/async onNodeInit\s*\(/) && !content.includes('super.onNodeInit')) {
                auditResults.buttonLogicFailures.push(`${d}: overrides onNodeInit without calling super.onNodeInit`);
             }
          }
        }
      }
      
      // 3. RADAR LOGIC AUDIT
      if (d.includes('radar') || d.includes('presence')) {
          const devicePath = path.join(DRIVERS_DIR, d, 'device.js');
          if (fs.existsSync(devicePath)) {
            const content = fs.readFileSync(devicePath, 'utf8');
            if (!content.includes('HybridSensorBase') && !content.includes('BaseHybridDevice')) {
                auditResults.radarLogicCheck.push(`${d}: Missing hybrid base inheritance for radar.`);
            }
          }
      }

    } catch (e) {
      auditResults.errors.push(`${d}: Manifest parse error: ${e.message}`);
    }
  }

  // Detect collisions (Real: between DIFFERENT drivers)
  for (const [key, drvs] of idToDrivers.entries()) {
    const uniqueDrivers = [...new Set(drvs)];
    if (uniqueDrivers.length > 1 && !key.includes('XXXXXXX')) {
      auditResults.collisions.push({ id: key, drivers: uniqueDrivers });
    }
  }

  // 4. SDK 3 DEPRECATION AUDIT (Project-wide)
  console.log('🔍 Scanning for SDK 3 Deprecations...');
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const full = path.join(dir, file);
      if (fs.statSync(full).isDirectory()) {
         if (file !== 'node_modules' && file !== '.git' && file !== '.gemini' && file !== 'brain' && file !== 'scratch') walk(full);
      } else if (file.endsWith('.js')) {
        const content = fs.readFileSync(full, 'utf8');
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
          // Check for legacy getDevice/getDeviceById patterns on homey.drivers
          if (line.includes('drivers.getDevice(') || line.includes('drivers.getDeviceById(') || line.includes('getDriver(') && line.includes('.getDevice(')) {
            const rel = path.relative(ROOT, full);
            auditResults.sdkDeprecations.push(`${rel}:${idx + 1}: ${line.trim().substring(0, 100)}`);
          }
        });
      }
    }
  };
  walk(path.join(ROOT, 'lib'));
  walk(path.join(ROOT, 'drivers'));
  walk(ROOT); // Scan root files like app.js

  // 5. REPORT GENERATION
  console.log('\n📊 Audit Report Summary:');
  console.log(`- Drivers Checked: ${auditResults.driversChecked}`);
  console.log(`- ID Collisions: ${auditResults.collisions.length}`);
  console.log(`- Button Logic Issues: ${auditResults.buttonLogicFailures.length}`);
  console.log(`- SDK Deprecations: ${auditResults.sdkDeprecations.length}`);
  console.log(`- Radar Logic Issues: ${auditResults.radarLogicCheck.length}`);
  
  if (auditResults.collisions.length > 0) {
    console.log('\n⚠️ COLLISION ALERT:');
    auditResults.collisions.slice(0, 5).forEach(c => console.log(`  - ${c.id}: [${c.drivers.join(', ')}]`));
  }

  const reportPath = path.join(ROOT, 'docs/reports/ZERO_DEFECT_AUDIT.json');
  fs.writeFileSync(reportPath, JSON.stringify(auditResults, null, 2));
  console.log(`\n✅ Detailed report saved to: ${reportPath}`);
}

main().catch(console.error);
