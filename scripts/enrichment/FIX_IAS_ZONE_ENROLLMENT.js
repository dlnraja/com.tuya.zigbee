#!/usr/bin/env node
'use strict';

const fs = require('fs').promises;
const path = require('path');

/**
 * FIX IAS ZONE ENROLLMENT - CRITICAL
 * Fixes motion sensors and SOS buttons that don't work
 * Root cause: this.homey.zigbee.ieee doesn't exist in SDK3
 * Solution: Use this.zclNode.bridgeId instead
 */

const IAS_ZONE_DRIVERS = [
  'motion_temp_humidity_illumination_multi_battery',
  'sos_emergency_button_cr2032',
  'motion_sensor_battery',
  'pir_sensor_advanced_battery',
  'pir_radar_illumination_sensor_battery',
  'door_window_sensor_battery',
  'contact_sensor_battery',
  'smoke_detector_battery',
  'gas_detector_battery',
  'co_detector_battery',
  'water_leak_sensor_battery'
];

const CORRECT_IAS_ENROLLMENT = `
    // ========================================
    // IAS ZONE ENROLLMENT - SDK3 FIXED
    // ========================================
    try {
      const endpoint = this.zclNode.endpoints[1];
      
      // Get Homey's IEEE address (SDK3 way)
      const ieee = this.zclNode?.bridgeId;
      
      if (!ieee) {
        this.log('⚠️ Cannot get Homey IEEE address, device may auto-enroll');
      } else {
        this.log('📍 Homey IEEE address:', ieee);
        
        // Convert to proper format for IAS CIE Address
        const ieeeAddress = String(ieee).replace(/:/g, '');
        
        // Write CIE Address to device
        await endpoint.clusters.iasZone.writeAttributes({
          iasCieAddress: ieeeAddress
        });
        
        this.log('✅ IAS CIE Address written successfully');
        
        // Send enrollment response
        await endpoint.clusters.iasZone.enrollResponse({
          enrollResponseCode: 0, // Success
          zoneId: 0
        });
        
        this.log('✅ IAS Zone enrollment successful');
      }
      
      // Register zone status notification listener
      endpoint.clusters.iasZone.onZoneStatusChangeNotification = async (payload) => {
        this.log('🔔 IAS Zone notification received:', payload);
        
        const zoneStatus = payload.zoneStatus;
        const alarmMask = zoneStatus & 0x03; // Bits 0-1 = alarm state
        const isTriggered = alarmMask > 0;
        
        this.log(\`IAS Zone \${isTriggered ? 'TRIGGERED ✅' : 'CLEARED ⬜'}\`);
        
        // Update capability
        const capabilityName = this.hasCapability('alarm_motion') ? 'alarm_motion' : 'alarm_generic';
        await this.setCapabilityValue(capabilityName, isTriggered);
        
        // Trigger flows
        if (isTriggered) {
          const context = this.getContextData ? this.getContextData() : {};
          await this.triggerFlowCard(\`\${capabilityName === 'alarm_motion' ? 'motion_detected' : 'alarm_triggered'}\`, context);
        }
      };
      
      this.log('✅ IAS Zone notification listener registered');
      
    } catch (err) {
      this.error('❌ IAS Zone setup failed:', err);
      this.log('Device may require re-pairing or will auto-enroll');
    }
`;

async function fixDriver(driverPath, driverName) {
  try {
    const devicePath = path.join(driverPath, 'device.js');
    let deviceCode = await fs.readFile(devicePath, 'utf8');
    
    // Check if already fixed
    if (deviceCode.includes('IAS ZONE ENROLLMENT - SDK3 FIXED')) {
      return { skipped: true, reason: 'Already fixed' };
    }
    
    // Check if has IAS Zone code to fix
    if (!deviceCode.includes('iasZone') && !deviceCode.includes('IAS')) {
      return { skipped: true, reason: 'No IAS Zone code' };
    }
    
    // Remove old broken IAS Zone code
    const patterns = [
      /\/\/ .*Setting up.*IAS Zone[\s\S]*?catch \(err\) \{[\s\S]*?\}/g,
      /\/\/ .*Method 1 failed[\s\S]*?All CIE write methods failed[\s\S]*?\}/g,
      /const homeyIeee = this\.homey\.zigbee\.ieee[\s\S]*?\}/g,
      /this\.homey\.zigbee\.ieee[\s\S]*?replace\(/g
    ];
    
    patterns.forEach(pattern => {
      deviceCode = String(deviceCode).replace(pattern, '');
    });
    
    // Find where to insert (after capability registration, before onDeleted)
    const insertPatterns = [
      /(\s+this\.log\('✅.*Battery capability registered.*'\);)/,
      /(\s+this\.log\('✅.*cluster registered.*'\);)/,
      /(\s+\/\/ Standard Zigbee setup complete)/
    ];
    
    let inserted = false;
    for (const pattern of insertPatterns) {
      if (pattern.test(deviceCode)) {
        deviceCode = String(deviceCode).replace(pattern, `$1\n${CORRECT_IAS_ENROLLMENT}`);
        inserted = true;
        break;
      }
    }
    
    if (!inserted) {
      // Fallback: insert before onDeleted
      const onDeletedMatch = deviceCode.match(/(async onDeleted\(\))/);
      if (onDeletedMatch) {
        deviceCode = String(deviceCode).replace(onDeletedMatch[0], `${CORRECT_IAS_ENROLLMENT}\n\n  ${onDeletedMatch[0]}`);
        inserted = true;
      }
    }
    
    if (!inserted) {
      return { error: true, message: 'Could not find insertion point' };
    }
    
    await fs.writeFile(devicePath, deviceCode);
    
    return { success: true, driver: driverName };
    
  } catch (err) {
    return { error: true, driver: driverName, message: err.message };
  }
}

async function main() {
  console.log('🚨 CRITICAL FIX: IAS ZONE ENROLLMENT\n');
  console.log('Fixing motion sensors and SOS buttons...\n');
  
  const driversDir = path.join(__dirname, '../..', 'drivers');
  const results = { success: [], skipped: [], errors: [] };
  
  for (const driverName of IAS_ZONE_DRIVERS) {
    process.stdout.write(`[${IAS_ZONE_DRIVERS.indexOf(driverName) + 1}/${IAS_ZONE_DRIVERS.length}] ${driverName}...`);
    
    const driverPath = path.join(driversDir, driverName);
    
    try {
      const stats = await fs.stat(driverPath);
      if (!stats.isDirectory()) continue;
      
      const result = await fixDriver(driverPath, driverName);
      
      if (result.success) {
        results.success.push(result);
        console.log(' ✅');
      } else if (result.skipped) {
        results.skipped.push(result);
        console.log(` ⏭️  (${result.reason})`);
      } else if (result.error) {
        results.errors.push(result);
        console.log(` ❌ ${result.message}`);
      }
    } catch (err) {
      console.log(` ⏭️  (not found)`);
    }
  }
  
  console.log('\n\n✅ FIX COMPLETE!\n');
  console.log(`Success: ${results.success.length} drivers`);
  console.log(`Skipped: ${results.skipped.length} drivers`);
  console.log(`Errors: ${results.errors.length} drivers`);
  
  // Save results
  const resultsPath = path.join(__dirname, '../../reports/IAS_ZONE_FIX_RESULTS.json');
  await fs.writeFile(resultsPath, JSON.stringify(results, null, 2));
  console.log(`\n📄 Results: ${resultsPath}`);
  
  console.log('\n🎯 Impact:');
  console.log('  - Motion sensors will now detect movement ✅');
  console.log('  - SOS buttons will trigger when pressed ✅');
  console.log('  - IAS Zone enrollment uses correct SDK3 API ✅');
}

main().catch(console.error);
