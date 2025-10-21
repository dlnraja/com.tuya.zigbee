#!/usr/bin/env node
/**
 * 🔧 FIX UNBRANDED STRUCTURE
 * 
 * Supprime les drivers avec noms de marques (xiaomi_, sonoff_, samsung_)
 * Car REDONDANTS avec les drivers génériques existants qui ont déjà
 * les manufacturer IDs enrichis!
 */

const fs = require('fs');
const path = require('path');

const BRANDED_DRIVERS_TO_DELETE = [
  // Xiaomi (10 drivers à supprimer)
  'xiaomi_button_battery',
  'xiaomi_cube_battery',
  'xiaomi_door_sensor_battery',
  'xiaomi_motion_sensor_battery',
  'xiaomi_smart_plug_ac',
  'xiaomi_temp_humidity_sensor_battery',
  'xiaomi_vibration_sensor_battery',
  'xiaomi_wall_switch_1gang_ac',
  'xiaomi_wall_switch_2gang_ac',
  'xiaomi_water_leak_sensor_battery',
  
  // Aqara (3 drivers à supprimer)
  'aqara_opple_switch_2button_battery',
  'aqara_opple_switch_4button_battery',
  'aqara_opple_switch_6button_battery',
  
  // Sonoff (7 drivers à supprimer)
  'sonoff_button_battery',
  'sonoff_door_sensor_battery',
  'sonoff_motion_sensor_battery',
  'sonoff_smart_plug_ac',
  'sonoff_switch_basic_ac',
  'sonoff_switch_mini_ac',
  'sonoff_temp_humidity_sensor_battery',
  
  // Samsung (6 drivers à supprimer)
  'samsung_arrival_sensor_battery',
  'samsung_button_battery',
  'samsung_door_sensor_battery',
  'samsung_motion_sensor_battery',
  'samsung_smart_plug_ac',
  'samsung_water_leak_sensor_battery'
];

class UnbrandedFixer {
  constructor() {
    this.rootDir = path.resolve(__dirname, '..');
    this.driversDir = path.join(this.rootDir, 'drivers');
    this.stats = { deleted: 0, errors: 0 };
  }

  log(msg, color = 'reset') {
    const COLORS = { reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m', cyan: '\x1b[36m', yellow: '\x1b[33m', magenta: '\x1b[35m' };
    console.log(`${COLORS[color]}${msg}${COLORS.reset}`);
  }

  deleteDriver(driverId) {
    const driverPath = path.join(this.driversDir, driverId);
    
    if (!fs.existsSync(driverPath)) {
      this.log(`  ⏭️  ${driverId}: n'existe pas`, 'yellow');
      return;
    }
    
    try {
      // Supprimer récursivement
      fs.rmSync(driverPath, { recursive: true, force: true });
      this.stats.deleted++;
      this.log(`  ✅ ${driverId}: SUPPRIMÉ`, 'green');
    } catch (err) {
      this.stats.errors++;
      this.log(`  ❌ ${driverId}: Erreur - ${err.message}`, 'red');
    }
  }

  async run() {
    this.log('\n╔══════════════════════════════════════════════════════════════════════╗', 'magenta');
    this.log('║     🔧 FIX UNBRANDED STRUCTURE                                      ║', 'magenta');
    this.log('║     Suppression drivers avec noms de marques (REDONDANTS)           ║', 'magenta');
    this.log('╚══════════════════════════════════════════════════════════════════════╝\n', 'magenta');
    
    this.log('⚠️  PRINCIPE UNBRANDED:', 'yellow');
    this.log('   ❌ PAS de noms de marques dans driver IDs', 'yellow');
    this.log('   ✅ Noms fonctionnels uniquement (motion_sensor, door_sensor, etc.)', 'yellow');
    this.log('   ✅ Manufacturer IDs dans les drivers génériques\n', 'yellow');
    
    this.log(`🗑️  Suppression de ${BRANDED_DRIVERS_TO_DELETE.length} drivers redondants:\n`, 'cyan');
    
    for (const driverId of BRANDED_DRIVERS_TO_DELETE) {
      this.deleteDriver(driverId);
    }
    
    this.log('\n═══════════════════════════════════════════════════════════════════════', 'magenta');
    this.log(`  ✅ Drivers supprimés: ${this.stats.deleted}`, 'green');
    this.log(`  ❌ Erreurs: ${this.stats.errors}`, this.stats.errors > 0 ? 'red' : 'green');
    this.log('═══════════════════════════════════════════════════════════════════════\n', 'magenta');
    
    this.log('✅ STRUCTURE UNBRANDED RESTAURÉE!', 'green');
    this.log('ℹ️  Les manufacturer IDs (Xiaomi, Sonoff, Samsung) restent dans les drivers génériques\n', 'cyan');
  }
}

if (require.main === module) {
  const fixer = new UnbrandedFixer();
  fixer.run().catch(err => {
    console.error('❌ Erreur:', err);
    process.exit(1);
  });
}

module.exports = UnbrandedFixer;
