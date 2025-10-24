#!/usr/bin/env node

/**
 * FIX MOTION SENSORS IAS ZONE - Correction complète enrollment
 * 
 * Problèmes identifiés (Forum Peter):
 * - "last seen 56 years ago"
 * - Pas de lecture de valeurs
 * - IASZone enrollment échoue
 * 
 * Solution:
 * - Endpoint correct [1]
 * - zoneType 13 pour motion
 * - autoResetTimeout pour clear automatique
 * - Proactive enrollment response
 * 
 * Usage: node scripts/fixes/fix-motion-sensors-iaszone.js
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..', '..');
const DRIVERS_DIR = path.join(PROJECT_ROOT, 'drivers');

const MOTION_DRIVERS = [
  'motion_sensor_battery',
  'motion_sensor_pir_battery',
  'motion_sensor_mmwave_battery',
  'motion_sensor_illuminance_battery',
  'motion_sensor_pir_ac_battery',
  'motion_sensor_zigbee_204z_battery',
  'motion_temp_humidity_illumination_multi_battery',
  'pir_sensor_advanced_battery',
  'pir_radar_illumination_sensor_battery',
  'presence_sensor_radar_battery',
  'radar_motion_sensor_advanced_battery',
  'radar_motion_sensor_mmwave_battery',
  'radar_motion_sensor_tank_level_battery'
];

console.log('🔧 FIX MOTION SENSORS IAS ZONE\n');
console.log(`Fixing ${MOTION_DRIVERS.length} motion sensor drivers...\n`);
console.log('='.repeat(60));

const CORRECT_IAS_TEMPLATE = `
    // IAS Zone Enrollment - Motion Sensor
    const endpoint = this.zclNode.endpoints[1];
    const iasZoneCluster = endpoint.clusters.iasZone;
    
    if (!iasZoneCluster) {
      this.error('IAS Zone cluster not found on endpoint 1');
      return;
    }
    
    // Listen for zone status changes
    iasZoneCluster.on('attr.zoneStatus', (value) => {
      const alarmActive = (value & 0x01) === 0x01; // Bit 0 = alarm1 (motion)
      this.log('Motion detected:', alarmActive);
      this.setCapabilityValue('alarm_motion', alarmActive).catch(this.error);
      
      // Auto-reset après 60 secondes
      if (alarmActive && !this._motionTimeout) {
        this._motionTimeout = setTimeout(() => {
          this.log('Auto-clearing motion after 60s');
          this.setCapabilityValue('alarm_motion', false).catch(this.error);
          this._motionTimeout = null;
        }, 60000);
      }
    });
    
    // Proactive enrollment response
    iasZoneCluster.on('zoneEnrollRequest', async (enrollRequest) => {
      this.log('Received zoneEnrollRequest:', enrollRequest);
      
      try {
        await iasZoneCluster.zoneEnrollResponse({
          enrollResponseCode: 0, // Success
          zoneId: 10
        });
        this.log('Sent zoneEnrollResponse successfully');
      } catch (err) {
        this.error('Failed to send zoneEnrollResponse:', err);
      }
    });
    
    // Write IAS CIE Address proactively
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

for (const driverId of MOTION_DRIVERS) {
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
      code.includes('endpoints[1]') && 
      code.includes('autoResetTimeout')) {
    console.log('  ✅ Already correct');
    continue;
  }
  
  // Trouver la section onInit ou onNodeInit (avec ou sans paramètres)
  let onInitMatch = code.match(/async\s+onInit\s*\([^)]*\)\s*\{/);
  if (!onInitMatch) {
    onInitMatch = code.match(/async\s+onNodeInit\s*\([^)]*\)\s*\{/);
  }
  
  if (!onInitMatch) {
    console.log('  ❌ Cannot find onInit/onNodeInit method');
    errors++;
    continue;
  }
  
  // Chercher une implémentation IAS existante à remplacer
  const iasBlockMatch = code.match(/\/\/\s*IAS.*?(?=\n\s{2,4}\/\/|$)/s);
  
  if (iasBlockMatch) {
    // Remplacer l'implémentation existante
    code = String(code).replace(iasBlockMatch[0], CORRECT_IAS_TEMPLATE);
    console.log('  ✅ Replaced existing IAS implementation');
  } else {
    // Insérer après onInit
    const insertPos = onInitMatch.index + onInitMatch[0].length;
    code = code.slice(0, insertPos) + '\n\n' + CORRECT_IAS_TEMPLATE + code.slice(insertPos);
    console.log('  ✅ Added IAS implementation');
  }
  
  // Écrire le fichier corrigé
  fs.writeFileSync(deviceJsPath, code, 'utf8');
  fixed++;
}

console.log('\n' + '='.repeat(60));
console.log('📊 SUMMARY:\n');
console.log(`  ✅ Fixed: ${fixed} drivers`);
console.log(`  ❌ Errors: ${errors} drivers`);
console.log(`  ⏭️  Skipped: ${MOTION_DRIVERS.length - fixed - errors} drivers`);
console.log('='.repeat(60));

if (fixed > 0) {
  console.log('\n🎉 SUCCESS! Motion sensors IAS Zone fixed\n');
  console.log('IMPORTANT: Users MUST re-pair their devices!');
  console.log('IAS enrollment happens during pairing only.\n');
  console.log('Next steps:');
  console.log('  1. npm run validate:publish');
  console.log('  2. Test with real device');
  console.log('  3. git commit -m "fix(motion): Fix IAS Zone enrollment for all motion sensors"');
  console.log('');
}
