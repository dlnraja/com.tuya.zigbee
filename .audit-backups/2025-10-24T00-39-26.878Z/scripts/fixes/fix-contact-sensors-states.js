#!/usr/bin/env node

/**
 * FIX CONTACT SENSORS STATES - Correction états open/closed
 * 
 * Problème: États inversés ou non mis à jour
 * 
 * Solution:
 * - Mapping correct alarm_contact
 * - Listeners sur IAS Zone cluster
 * - Auto-update capability
 * 
 * Usage: node scripts/fixes/fix-contact-sensors-states.js
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..', '..');
const DRIVERS_DIR = path.join(PROJECT_ROOT, 'drivers');

const CONTACT_DRIVERS = [
  'contact_sensor_battery',
  'door_window_sensor_battery',
  'door_lock_battery',
  'door_controller_ac',
  'garage_door_controller_ac',
  'garage_door_opener_cr2032'
];

console.log('🔧 FIX CONTACT SENSORS STATES\n');
console.log(`Fixing ${CONTACT_DRIVERS.length} contact sensor drivers...\n`);
console.log('='.repeat(60));

const CORRECT_CONTACT_TEMPLATE = `
    // IAS Zone - Contact Sensor
    const endpoint = this.zclNode.endpoints[1];
    const iasZoneCluster = endpoint.clusters.iasZone;
    
    if (!iasZoneCluster) {
      this.error('IAS Zone cluster not found on endpoint 1');
      return;
    }
    
    // Listen for zone status changes
    iasZoneCluster.on('attr.zoneStatus', (value) => {
      // Bit 0 = alarm1 (contact open/closed)
      const isOpen = (value & 0x01) === 0x01;
      this.log('Contact status:', isOpen ? 'OPEN' : 'CLOSED');
      this.setCapabilityValue('alarm_contact', isOpen).catch(this.error);
    });
    
    // Proactive enrollment response
    iasZoneCluster.on('zoneEnrollRequest', async (enrollRequest) => {
      this.log('Received zoneEnrollRequest:', enrollRequest);
      
      try {
        await iasZoneCluster.zoneEnrollResponse({
          enrollResponseCode: 0,
          zoneId: 10
        });
        this.log('Sent zoneEnrollResponse successfully');
      } catch (err) {
        this.error('Failed to send zoneEnrollResponse:', err);
      }
    });
    
    // Write IAS CIE Address
    try {
      const ieeeAddress = await this.homey.zigbee.getIeeeAddress();
      await iasZoneCluster.writeAttributes({
        iasCieAddr: ieeeAddress
      });
      this.log('Wrote IAS CIE address:', ieeeAddress);
    } catch (err) {
      this.error('Failed to write IAS CIE address:', err);
    }
`.trim();

let fixed = 0;
let errors = 0;

for (const driverId of CONTACT_DRIVERS) {
  const deviceJsPath = path.join(DRIVERS_DIR, driverId, 'device.js');
  
  if (!fs.existsSync(deviceJsPath)) {
    console.log(`⏭️  ${driverId}: device.js not found`);
    continue;
  }
  
  console.log(`\n🔍 Processing: ${driverId}`);
  
  let code = fs.readFileSync(deviceJsPath, 'utf8');
  
  // Backup
  fs.writeFileSync(deviceJsPath + '.backup', code, 'utf8');
  
  // Vérifier si déjà correct
  if (code.includes('zoneEnrollRequest') && 
      code.includes('alarm_contact')) {
    console.log('  ✅ Already correct');
    continue;
  }
  
  // Trouver onInit
  let onInitMatch = code.match(/async\s+onNodeInit\s*\([^)]*\)\s*\{/);
  if (!onInitMatch) {
    onInitMatch = code.match(/async\s+onInit\s*\([^)]*\)\s*\{/);
  }
  
  if (!onInitMatch) {
    console.log('  ❌ Cannot find onInit method');
    errors++;
    continue;
  }
  
  // Chercher IAS existant
  const iasBlockMatch = code.match(/\/\/\s*IAS.*?(?=\n\s{2,4}\/\/|$)/s);
  
  if (iasBlockMatch) {
    code = code.replace(iasBlockMatch[0], CORRECT_CONTACT_TEMPLATE);
    console.log('  ✅ Replaced existing IAS implementation');
  } else {
    const insertPos = onInitMatch.index + onInitMatch[0].length;
    code = code.slice(0, insertPos) + '\n\n' + CORRECT_CONTACT_TEMPLATE + code.slice(insertPos);
    console.log('  ✅ Added IAS implementation');
  }
  
  fs.writeFileSync(deviceJsPath, code, 'utf8');
  fixed++;
}

console.log('\n' + '='.repeat(60));
console.log('📊 SUMMARY:\n');
console.log(`  ✅ Fixed: ${fixed} drivers`);
console.log(`  ❌ Errors: ${errors} drivers`);
console.log('='.repeat(60));

if (fixed > 0) {
  console.log('\n🎉 SUCCESS! Contact sensors states fixed\n');
}
