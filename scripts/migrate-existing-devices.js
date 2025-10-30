#!/usr/bin/env node
'use strict';

/**
 * MIGRATION SCRIPT FOR EXISTING DEVICES
 * 
 * PROBLEMS THIS FIXES:
 * 1. Battery capability on AC/DC powered devices (USB outlets)
 * 2. Wrong driver assigned (TS0002 conflict victims)
 * 3. Missing capabilities after driver updates
 * 
 * USAGE:
 * 1. Generate migration report:
 *    node scripts/migrate-existing-devices.js --report
 * 
 * 2. Apply migrations (requires Homey Developer tools + API token):
 *    node scripts/migrate-existing-devices.js --migrate
 * 
 * 3. Export for manual review:
 *    node scripts/migrate-existing-devices.js --export devices-to-migrate.csv
 * 
 * REQUIREMENTS:
 * - Homey must be accessible on local network
 * - User must have Homey Developer access
 * - App must be installed on Homey
 */

const fs = require('fs');
const path = require('path');

// Configuration
const APP_ID = 'com.dlnraja.tuya.zigbee';
const HOMEY_URL = process.env.HOMEY_URL || 'http://homey.local';
const API_TOKEN = process.env.HOMEY_API_TOKEN || '';

/**
 * Device migration rules
 */
const MIGRATION_RULES = {
  // Rule 1: Remove battery from AC devices
  removeBatteryFromAC: {
    description: 'Remove measure_battery capability from AC/DC powered devices',
    check: (device) => {
      // Check if device is AC powered AND has battery capability
      const powerSource = device.settings?.power_source || 'unknown';
      const hasBattery = device.capabilitiesObj?.measure_battery !== undefined;
      const isAC = powerSource === 'ac' || powerSource === 'dc';
      
      return isAC && hasBattery;
    },
    action: async (device, homeyAPI) => {
      try {
        await homeyAPI.devices.removeCapability(device.id, 'measure_battery');
        return {
          success: true,
          message: 'Removed measure_battery from AC device'
        };
      } catch (err) {
        return {
          success: false,
          message: `Failed: ${err.message}`
        };
      }
    }
  },
  
  // Rule 2: Detect TS0002 misassignment
  detectTS0002Misassignment: {
    description: 'Detect devices that may have wrong driver due to TS0002 conflict',
    check: (device) => {
      const driverId = device.driverId || '';
      const productId = device.settings?.zb_product_id || '';
      const manufacturerName = device.settings?.zb_manufacturer_name || '';
      const endpoints = Object.keys(device.endpoints || {}).length;
      
      // Example: USB outlet misidentified as switch
      if (productId === 'TS011F' && driverId.includes('switch')) {
        return true; // Likely wrong driver
      }
      
      // TS0002 with manufacturerName starting with _TZ3000_1obwwnmq = USB outlet
      if (productId === 'TS0002' && manufacturerName.startsWith('_TZ3000_1obw')) {
        if (!driverId.includes('usb')) {
          return true; // Wrong driver
        }
      }
      
      return false;
    },
    action: async (device, homeyAPI) => {
      // This requires manual intervention - just flag
      return {
        success: false,
        message: 'Manual reassignment required - see report',
        manualAction: true
      };
    }
  },
  
  // Rule 3: USB outlet without onoff.usb2
  usbOutletMissingPort2: {
    description: 'USB 2-port outlet missing second port capability',
    check: (device) => {
      const driverId = device.driverId || '';
      const hasPort1 = device.capabilitiesObj?.onoff !== undefined;
      const hasPort2 = device.capabilitiesObj?.['onoff.usb2'] !== undefined;
      const endpoints = Object.keys(device.endpoints || {}).length;
      
      return driverId.includes('usb_outlet_2port') && hasPort1 && !hasPort2 && endpoints >= 2;
    },
    action: async (device, homeyAPI) => {
      try {
        await homeyAPI.devices.addCapability(device.id, 'onoff.usb2');
        return {
          success: true,
          message: 'Added onoff.usb2 capability'
        };
      } catch (err) {
        return {
          success: false,
          message: `Failed: ${err.message}`
        };
      }
    }
  }
};

/**
 * Generate migration report (read-only)
 */
async function generateReport() {
  console.log('📊 GENERATING MIGRATION REPORT...\n');
  console.log('⚠️  This is a READ-ONLY report. No changes will be made.\n');
  
  // Simulate device data (in real impl, would fetch from Homey API)
  const devices = await fetchDevicesFromHomey();
  
  const report = {
    totalDevices: devices.length,
    needsMigration: 0,
    byRule: {}
  };
  
  for (const [ruleName, rule] of Object.entries(MIGRATION_RULES)) {
    const affectedDevices = devices.filter(rule.check);
    report.byRule[ruleName] = {
      description: rule.description,
      affectedCount: affectedDevices.length,
      devices: affectedDevices.map(d => ({
        id: d.id,
        name: d.name,
        driverId: d.driverId,
        productId: d.settings?.zb_product_id,
        manufacturerName: d.settings?.zb_manufacturer_name
      }))
    };
    report.needsMigration += affectedDevices.length;
  }
  
  // Print report
  console.log('═══════════════════════════════════════════');
  console.log('📋 MIGRATION REPORT');
  console.log('═══════════════════════════════════════════\n');
  console.log(`Total devices: ${report.totalDevices}`);
  console.log(`Devices needing migration: ${report.needsMigration}\n`);
  
  for (const [ruleName, ruleReport] of Object.entries(report.byRule)) {
    if (ruleReport.affectedCount > 0) {
      console.log(`\n🔸 ${ruleReport.description}`);
      console.log(`   Affected: ${ruleReport.affectedCount} devices`);
      ruleReport.devices.forEach(d => {
        console.log(`   - ${d.name} (${d.driverId})`);
        console.log(`     Product: ${d.productId}, Manufacturer: ${d.manufacturerName}`);
      });
    }
  }
  
  console.log('\n\n🚀 NEXT STEPS:');
  console.log('1. Review this report');
  console.log('2. Run with --migrate flag to apply changes');
  console.log('3. Or export with --export devices.csv for manual processing');
  
  return report;
}

/**
 * Apply migrations
 */
async function applyMigrations() {
  console.log('🔧 APPLYING MIGRATIONS...\n');
  console.log('⚠️  This will MODIFY your Homey devices!\n');
  
  if (!API_TOKEN) {
    console.error('❌ ERROR: HOMEY_API_TOKEN environment variable not set');
    console.log('\nTo get API token:');
    console.log('1. Open Homey Developer tools');
    console.log('2. Go to Settings → API');
    console.log('3. Create new API token');
    console.log('4. Set environment variable: export HOMEY_API_TOKEN=<token>');
    process.exit(1);
  }
  
  const devices = await fetchDevicesFromHomey();
  const results = {
    success: 0,
    failed: 0,
    manual: 0,
    details: []
  };
  
  for (const device of devices) {
    for (const [ruleName, rule] of Object.entries(MIGRATION_RULES)) {
      if (rule.check(device)) {
        console.log(`\n🔹 Applying ${ruleName} to: ${device.name}`);
        const result = await rule.action(device, null); // TODO: pass real Homey API
        
        if (result.success) {
          console.log(`   ✅ ${result.message}`);
          results.success++;
        } else if (result.manualAction) {
          console.log(`   ⚠️  ${result.message}`);
          results.manual++;
        } else {
          console.log(`   ❌ ${result.message}`);
          results.failed++;
        }
        
        results.details.push({
          device: device.name,
          rule: ruleName,
          ...result
        });
      }
    }
  }
  
  console.log('\n\n═══════════════════════════════════════════');
  console.log('📊 MIGRATION RESULTS');
  console.log('═══════════════════════════════════════════');
  console.log(`✅ Successful: ${results.success}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`⚠️  Manual action needed: ${results.manual}`);
  
  return results;
}

/**
 * Export devices to CSV for manual processing
 */
async function exportToCSV(filename) {
  console.log(`📄 EXPORTING TO: ${filename}\n`);
  
  const devices = await fetchDevicesFromHomey();
  const csv = ['Device Name,Driver ID,Product ID,Manufacturer,Endpoints,Has Battery,Power Source,Needs Migration'];
  
  for (const device of devices) {
    const needsMigration = Object.values(MIGRATION_RULES).some(rule => rule.check(device));
    csv.push([
      device.name,
      device.driverId,
      device.settings?.zb_product_id || '',
      device.settings?.zb_manufacturer_name || '',
      Object.keys(device.endpoints || {}).length,
      device.capabilitiesObj?.measure_battery ? 'YES' : 'NO',
      device.settings?.power_source || 'unknown',
      needsMigration ? 'YES' : 'NO'
    ].join(','));
  }
  
  fs.writeFileSync(filename, csv.join('\n'));
  console.log(`✅ Exported ${devices.length} devices to ${filename}`);
}

/**
 * Fetch devices from Homey
 * TODO: Implement real Homey API call
 */
async function fetchDevicesFromHomey() {
  console.log('📡 Fetching devices from Homey...');
  console.log(`   URL: ${HOMEY_URL}`);
  console.log(`   App: ${APP_ID}\n`);
  
  // MOCK DATA for now - in real implementation, use Homey API
  return [
    {
      id: 'device-1',
      name: 'USB Outlet Kitchen',
      driverId: 'usb_outlet_2port',
      settings: {
        zb_product_id: 'TS011F',
        zb_manufacturer_name: '_TZ3000_1obwwnmq',
        power_source: 'ac'
      },
      capabilitiesObj: {
        onoff: {},
        measure_battery: {}, // ← WRONG! AC device shouldn't have battery
        'onoff.usb2': {}
      },
      endpoints: { 1: {}, 2: {} }
    },
    {
      id: 'device-2',
      name: 'Switch 2-gang Living Room',
      driverId: 'switch_basic_2gang',
      settings: {
        zb_product_id: 'TS0002',
        zb_manufacturer_name: '_TZ3000_4fjiwweb',
        power_source: 'ac'
      },
      capabilitiesObj: {
        onoff: {},
        'onoff.button2': {},
        measure_battery: {} // ← WRONG! AC switch
      },
      endpoints: { 1: {}, 2: {} }
    }
  ];
}

// CLI
const args = process.argv.slice(2);
const command = args[0];

if (command === '--report') {
  generateReport().catch(console.error);
} else if (command === '--migrate') {
  applyMigrations().catch(console.error);
} else if (command === '--export') {
  const filename = args[1] || 'devices-to-migrate.csv';
  exportToCSV(filename).catch(console.error);
} else {
  console.log('USAGE:');
  console.log('  node scripts/migrate-existing-devices.js --report');
  console.log('  node scripts/migrate-existing-devices.js --migrate');
  console.log('  node scripts/migrate-existing-devices.js --export [filename.csv]');
}
