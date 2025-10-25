#!/usr/bin/env node
'use strict';

/**
 * APPLY REAL SDK3 IAS ZONE METHOD
 * 
 * Basé sur IASZoneEnroller_SIMPLE_v4.0.6.js (version qui FONCTIONNE)
 * Date: 2025-10-21 - Version la plus récente du projet
 * 
 * MÉTHODE SDK3 CORRECTE (selon le projet):
 * ✅ endpoint.clusters.iasZone.onZoneEnrollRequest = () => {...}  (property listener)
 * ✅ endpoint.clusters.iasZone.zoneEnrollResponse({...})  (method call)
 * ✅ endpoint.clusters.iasZone.onZoneStatusChangeNotification = (payload) => {...}  (property listener)
 * 
 * MÉTHODE INCORRECTE (à corriger):
 * ❌ endpoint.clusters[1280] (numeric - moins lisible)
 * ❌ endpoint.clusters.iasZone.on('zoneStatusChangeNotification', ...) (event style - ancien)
 * ❌ endpoint.clusters.iasZone.writeAttributes({ iasCIEAddress: ... }) (pas nécessaire)
 * 
 * DIFFÉRENCE CLEF:
 * - Ancien style: .on('event', callback)
 * - Nouveau style SDK3: .onEventName = callback (property assignment)
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '../../drivers');

let totalFixed = 0;

console.log('🔧 Applying REAL SDK3 IAS Zone Method');
console.log('=====================================\n');
console.log('Based on IASZoneEnroller_SIMPLE_v4.0.6.js (working version)\n');

/**
 * Generate correct SDK3 IAS Zone setup based on project's working code
 */
function generateCorrectIASZoneSetup(capabilities) {
  const alarmCapabilities = capabilities.filter(cap => {
    if (typeof cap === 'string') {
      return cap.startsWith('alarm_') || cap === 'button';
    }
    return false;
  });
  
  if (alarmCapabilities.length === 0) return null;
  
  const mainCapability = alarmCapabilities[0];
  
  return `
  /**
   * Setup IAS Zone (SDK3 - Based on IASZoneEnroller_SIMPLE_v4.0.6.js)
   * Version la plus récente du projet (2025-10-21)
   */
  async setupIASZone() {
    this.log('🔐 Setting up IAS Zone (SDK3 latest method)...');
    
    const endpoint = this.zclNode.endpoints[1];
    
    if (!endpoint?.clusters?.iasZone) {
      this.log('ℹ️  IAS Zone cluster not available');
      return;
    }
    
    try {
      // Step 1: Setup Zone Enroll Request listener (SYNCHRONOUS - property assignment)
      // SDK3: Use property assignment, NOT .on() event listener
      endpoint.clusters.iasZone.onZoneEnrollRequest = () => {
        this.log('📨 Zone Enroll Request received');
        
        try {
          // Send response IMMEDIATELY (synchronous, no async, no delay)
          endpoint.clusters.iasZone.zoneEnrollResponse({
            enrollResponseCode: 0, // 0 = Success
            zoneId: 10
          });
          
          this.log('✅ Zone Enroll Response sent (zoneId: 10)');
        } catch (err) {
          this.error('Failed to send Zone Enroll Response:', err.message);
        }
      };
      
      this.log('✅ Zone Enroll Request listener configured');
      
      // Step 2: Send proactive Zone Enroll Response (SDK3 official method)
      // Per Homey docs: "driver could send Zone Enroll Response when initializing
      // regardless of having received Zone Enroll Request"
      this.log('📤 Sending proactive Zone Enroll Response...');
      
      try {
        endpoint.clusters.iasZone.zoneEnrollResponse({
          enrollResponseCode: 0,
          zoneId: 10
        });
        
        this.log('✅ Proactive Zone Enroll Response sent');
      } catch (err) {
        this.log('⚠️  Proactive response failed (normal if device not ready):', err.message);
      }
      
      // Step 3: Setup Zone Status Change listener (property assignment)
      // SDK3: Use .onZoneStatusChangeNotification property, NOT .on() event
      endpoint.clusters.iasZone.onZoneStatusChangeNotification = (payload) => {
        this.log('📨 Zone notification received:', payload);
        
        if (payload && payload.zoneStatus !== undefined) {
          // Convert Bitmap to value if needed
          let status = payload.zoneStatus;
          if (status && typeof status.valueOf === 'function') {
            status = status.valueOf();
          }
          
          // Check alarm1 bit (motion/alarm detected)
          const alarm = (status & 0x01) !== 0;
          
          this.setCapabilityValue('${mainCapability}', alarm).catch(this.error);
          this.log(\`\${alarm ? '🚨' : '✅'} Alarm: \${alarm ? 'TRIGGERED' : 'cleared'}\`);
        }
      };
      
      this.log('✅ Zone Status listener configured');
      
      // Step 4: Setup Zone Status attribute listener (property assignment)
      // Alternative listener for attribute reports
      endpoint.clusters.iasZone.onZoneStatus = (zoneStatus) => {
        this.log('📊 Zone attribute report:', zoneStatus);
        
        let status = zoneStatus;
        if (status && typeof status.valueOf === 'function') {
          status = status.valueOf();
        }
        
        const alarm = (status & 0x01) !== 0;
        this.setCapabilityValue('${mainCapability}', alarm).catch(this.error);
      };
      
      this.log('✅ IAS Zone configured successfully (SDK3 latest method)');
      
    } catch (err) {
      this.error('IAS Zone setup failed:', err);
    }
  }`;
}

/**
 * Fix a driver's device.js file with correct SDK3 method
 */
function fixDriverDeviceJS(driverPath, driverId, capabilities) {
  const devicePath = path.join(driverPath, 'device.js');
  
  if (!fs.existsSync(devicePath)) {
    return false;
  }
  
  try {
    let content = fs.readFileSync(devicePath, 'utf8');
    
    // Check if file has IAS Zone code
    if (!content.includes('setupIASZone')) {
      return false;
    }
    
    console.log(`\n📄 ${driverId}:`);
    
    // Remove old IAS Zone implementation
    const setupMethodRegex = /async setupIASZone\(\)[^}]*\{[\s\S]*?\n  \}/g;
    const match = content.match(setupMethodRegex);
    
    if (!match) {
      console.log(`  ℹ️  No setupIASZone method found`);
      return false;
    }
    
    console.log(`  🔄 Replacing with correct SDK3 method...`);
    
    // Generate correct setup code
    const correctSetup = generateCorrectIASZoneSetup(capabilities);
    
    if (!correctSetup) {
      return false;
    }
    
    // Replace old method with correct one
    content = content.replace(setupMethodRegex, correctSetup.trim());
    
    // Write back
    fs.writeFileSync(devicePath, content, 'utf8');
    
    console.log(`  ✅ Applied SDK3 latest method (from IASZoneEnroller_SIMPLE_v4.0.6.js)`);
    return true;
    
  } catch (err) {
    console.log(`  ❌ Error fixing: ${err.message}`);
    return false;
  }
}

/**
 * Scan and fix all drivers
 */
function scanAndFixAllDrivers() {
  const drivers = fs.readdirSync(DRIVERS_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
  
  console.log(`📁 Found ${drivers.length} drivers\n`);
  console.log('Scanning for IAS Zone devices...\n');
  
  for (const driverId of drivers) {
    const driverPath = path.join(DRIVERS_DIR, driverId);
    const composePath = path.join(driverPath, 'driver.compose.json');
    
    if (!fs.existsSync(composePath)) {
      continue;
    }
    
    try {
      const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      
      // Find IAS Zone capabilities
      const iasCapabilities = (compose.capabilities || [])
        .filter(cap => {
          if (typeof cap === 'string') {
            return cap.startsWith('alarm_') || cap === 'button';
          }
          return false;
        });
      
      if (iasCapabilities.length === 0) {
        continue;
      }
      
      if (fixDriverDeviceJS(driverPath, driverId, iasCapabilities)) {
        totalFixed++;
      }
      
    } catch (err) {
      // Skip errors
    }
  }
}

/**
 * Main execution
 */
function main() {
  scanAndFixAllDrivers();
  
  console.log('\n=====================================');
  console.log('📊 Fix Summary');
  console.log('=====================================\n');
  
  console.log(`Total fixed: ${totalFixed}\n`);
  
  if (totalFixed > 0) {
    console.log('✅ APPLIED REAL SDK3 METHOD');
    console.log('\nChanges:');
    console.log('- OLD: .on("zoneStatusChangeNotification", ...)');
    console.log('- NEW: .onZoneStatusChangeNotification = (payload) => {...}');
    console.log('');
    console.log('- OLD: writeAttributes({ iasCIEAddress: ... })');
    console.log('- NEW: Direct enrollment (pas besoin writeAttributes)');
    console.log('');
    console.log('Based on: IASZoneEnroller_SIMPLE_v4.0.6.js (2025-10-21)');
    console.log('Version la plus récente et qui FONCTIONNE du projet\n');
    console.log('Run validation and commit\n');
    process.exit(0);
  } else {
    console.log('ℹ️  NO FIXES NEEDED\n');
    process.exit(0);
  }
}

// Run fix
main();
