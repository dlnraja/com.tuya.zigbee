#!/usr/bin/env node
/**
 * 🔧 FIX DIAGNOSTIC ef9db7d4
 * 
 * Corrige les 2 drivers avec erreurs:
 * 1. motion_temp_humidity_illumination_multi_battery
 * 2. sos_emergency_button_cr2032
 * 
 * Erreurs:
 * - this.homey.zigbee.getIeeeAddress is not a function
 * - expected_cluster_id_number
 */

const fs = require('fs');
const path = require('path');

class DiagnosticFixer {
  constructor() {
    this.rootDir = path.resolve(__dirname, '..');
    this.driversDir = path.join(this.rootDir, 'drivers');
    this.stats = { fixed: 0, errors: 0 };
  }

  log(msg, color = 'reset') {
    const COLORS = { reset: '\x1b[0m', green: '\x1b[32m', cyan: '\x1b[36m', magenta: '\x1b[35m', red: '\x1b[31m', yellow: '\x1b[33m' };
    console.log(`${COLORS[color]}${msg}${COLORS.reset}`);
  }

  fixMotionTempHumidity() {
    const devicePath = path.join(this.driversDir, 'motion_temp_humidity_illumination_multi_battery', 'device.js');
    
    try {
      let content = fs.readFileSync(devicePath, 'utf8');
      
      // FIX 1: Remplacer this.homey.zigbee.getIeeeAddress() par this.zclNode.ieeeAddress
      const oldIeeeAddress = `      const ieeeAddress = await this.homey.zigbee.getIeeeAddress();
      await iasZoneCluster.writeAttributes({
        iasCieAddr: ieeeAddress
      });
      this.log('Wrote IAS CIE address:', ieeeAddress);`;
      
      const newIeeeAddress = `      // Get IEEE address from zclNode (SDK3 compatible)
      const ieeeAddress = this.zclNode.ieeeAddress;
      if (ieeeAddress) {
        await iasZoneCluster.writeAttributes({
          iasCieAddr: ieeeAddress
        });
        this.log('Wrote IAS CIE address:', ieeeAddress);
      } else {
        this.error('IEEE address not available');
      }`;
      
      content = String(content).replace(oldIeeeAddress, newIeeeAddress);
      
      // FIX 2: Remplacer 'genPowerCfg' par numeric 1 dans registerCapability
      content = String(content).replace(
        /this\.registerCapability\('measure_battery', 'genPowerCfg',/,
        "this.registerCapability('measure_battery', 1,"
      );
      
      fs.writeFileSync(devicePath, content);
      this.stats.fixed++;
      this.log('  ✅ motion_temp_humidity_illumination_multi_battery: FIXED', 'green');
      
    } catch (err) {
      this.stats.errors++;
      this.log(`  ❌ Error: ${err.message}`, 'red');
    }
  }

  fixSOSButton() {
    const devicePath = path.join(this.driversDir, 'sos_emergency_button_cr2032', 'device.js');
    
    try {
      let content = fs.readFileSync(devicePath, 'utf8');
      
      // Vérifier si déjà corrigé (cluster ID 1)
      if (content.includes("this.registerCapability('measure_battery', 1,")) {
        this.log('  ℹ️  sos_emergency_button_cr2032: Already has numeric cluster ID', 'cyan');
        // Le problème peut être ailleurs, cherchons d'autres registerCapability
        
        // S'assurer que TOUS les registerCapability utilisent des IDs numériques
        if (content.includes("this.registerCapability('onoff', 'genOnOff'")) {
          content = String(content).replace(
            /this\.registerCapability\('onoff', 'genOnOff',/,
            "this.registerCapability('onoff', 6,"
          );
          fs.writeFileSync(devicePath, content);
          this.stats.fixed++;
          this.log('  ✅ sos_emergency_button_cr2032: Fixed genOnOff → 6', 'green');
        } else {
          this.log('  ℹ️  sos_emergency_button_cr2032: No other fixes needed', 'cyan');
        }
        
      } else {
        // Remplacer 'genPowerCfg' par 1 si trouvé
        content = String(content).replace(
          /this\.registerCapability\('measure_battery', 'genPowerCfg',/,
          "this.registerCapability('measure_battery', 1,"
        );
        fs.writeFileSync(devicePath, content);
        this.stats.fixed++;
        this.log('  ✅ sos_emergency_button_cr2032: FIXED', 'green');
      }
      
    } catch (err) {
      this.stats.errors++;
      this.log(`  ❌ Error: ${err.message}`, 'red');
    }
  }

  async run() {
    this.log('\n╔══════════════════════════════════════════════════════════════════════╗', 'magenta');
    this.log('║     🔧 FIX DIAGNOSTIC ef9db7d4                                      ║', 'magenta');
    this.log('║     2 drivers avec erreurs SDK3                                     ║', 'magenta');
    this.log('╚══════════════════════════════════════════════════════════════════════╝\n', 'magenta');
    
    this.log('📝 Problèmes identifiés:', 'yellow');
    this.log('  1. this.homey.zigbee.getIeeeAddress is not a function', 'yellow');
    this.log('  2. expected_cluster_id_number (string vs numeric)\n', 'yellow');
    
    this.log('🔧 Application des corrections:\n', 'cyan');
    
    this.log('1️⃣  motion_temp_humidity_illumination_multi_battery:', 'cyan');
    this.fixMotionTempHumidity();
    
    this.log('\n2️⃣  sos_emergency_button_cr2032:', 'cyan');
    this.fixSOSButton();
    
    this.log('\n═══════════════════════════════════════════════════════════════════════', 'magenta');
    this.log(`  ✅ Drivers corrigés: ${this.stats.fixed}`, 'green');
    this.log(`  ❌ Erreurs: ${this.stats.errors}`, this.stats.errors > 0 ? 'red' : 'green');
    this.log('═══════════════════════════════════════════════════════════════════════\n', 'magenta');
    
    if (this.stats.fixed > 0) {
      this.log('✅ CORRECTIONS APPLIQUÉES!', 'green');
      this.log('ℹ️  Les devices devraient maintenant remonter les lectures et la batterie\n', 'cyan');
      this.log('📝 Instructions pour l\'utilisateur:', 'yellow');
      this.log('  1. Attendre la prochaine mise à jour de l\'app', 'yellow');
      this.log('  2. Ou: Retirer et ré-ajouter les devices', 'yellow');
      this.log('  3. Les lectures et batterie devraient apparaître\n', 'yellow');
    }
  }
}

if (require.main === module) {
  const fixer = new DiagnosticFixer();
  fixer.run().catch(err => {
    console.error('❌ Erreur:', err);
    process.exit(1);
  });
}

module.exports = DiagnosticFixer;
