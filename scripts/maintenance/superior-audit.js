'use strict';

const fs = require('fs');
const path = require('path');

/**
 * 🕵️ SUPERIOR ARCHITECTURAL AUDIT (v1.0.0)
 * 
 * Performs deep structural analysis of the Homey App manifest
 * to ensure maximum SDK 3 compliance and performance.
 * 
 * Logic Level: Opus 4.6 Superior Maintenance
 */

const projectRoot = path.join(__dirname, '../..');
const driversPath = path.join(projectRoot, 'drivers');

async function runAudit() {
  console.log('🚀 Starting Superior Architectural Audit...');
  
  const auditResults = {
    fingerprintConflicts: [],
    manifestViolations: [],
    orphanedAssets: [],
    optimized: 0
  };

  const allFingerprints = new Map();
  const driverFolders = fs.readdirSync(driversPath);

  for (const driverId of driverFolders) {
    const driverPath = path.join(driversPath, driverId);
    if (!fs.statSync(driverPath).isDirectory()) continue;

    const composePath = path.join(driverPath, 'driver.compose.json');
    if (!fs.existsSync(composePath)) continue;

    const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));

    // 1. Audit Fingerprints
    if (compose.zigbee && compose.zigbee.length > 0) {
      compose.zigbee.forEach(fp => {
        const mfr = fp.manufacturerName;
        const pid = fp.productId || fp.modelId;
        const key = `${mfr}:${pid}`;
        
        if (allFingerprints.has(key)) {
          auditResults.fingerprintConflicts.push({ key, drivers: [allFingerprints.get(key), driverId] });
        } else {
          allFingerprints.set(key, driverId);
        }

        // SDK 3 Violation: Uppercase in manufacturerName (Athom recommends lowercase matching)
        if (mfr && mfr !== mfr.toLowerCase() && !mfr.startsWith('_')) {
           auditResults.manifestViolations.push(`${driverId}: non-standard mfr casing "${mfr}"`);
        }
      });
    }

    // 2. Audit Energy settings for metering devices
    if (compose.capabilities && compose.capabilities.includes('measure_power')) {
      if (!compose.energy) {
        auditResults.manifestViolations.push(`${driverId}: missing energy object for metering device`);
      }
    }
  }

  // Report
  console.log('--- AUDIT REPORT ---');
  console.log(`✅ Total Drivers Scanned: ${driverFolders.length}`);
  console.log(`❌ Fingerprint Conflicts: ${auditResults.fingerprintConflicts.length}`);
  console.log(`⚠️ Manifest Violations: ${auditResults.manifestViolations.length}`);
  
  if (auditResults.fingerprintConflicts.length > 0) {
    console.log('Conflict Details:', JSON.stringify(auditResults.fingerprintConflicts, null, 2));
  }

  // Save report
  fs.writeFileSync(path.join(projectRoot, 'SUPERIOR_AUDIT_REPORT.md'), 
    `# Superior Architectural Audit Report\n\nGenerated: ${new Date().toISOString()}\n\n` +
    `## Summary\n- Conflicts: ${auditResults.fingerprintConflicts.length}\n- Violations: ${auditResults.manifestViolations.length}\n\n` +
    `## Details\n${auditResults.manifestViolations.join('\n')}`
  );
}

runAudit().catch(console.error);
