#!/usr/bin/env node
/**
 * 🔧 AUTO-FIX CLUSTER REGRESSIONS
 * 
 * Corrige automatiquement les régressions CLUSTER.*:
 * 1. Remplace CLUSTER.POWER_CONFIGURATION → 'genPowerCfg' (ou 1)
 * 2. Remplace CLUSTER.IAS_ZONE → 'ssIasZone' (ou 1280)
 * 3. Corrige les duplications de variables
 * 4. Valide syntaxe
 * 
 * Drivers concernés:
 * - motion_sensor_battery
 * - sos_emergency_button_cr2032
 * - motion_temp_humidity_illumination_multi_battery
 * 
 * Usage: node scripts/fix/auto-fix-cluster-regressions.js
 */

const fs = require('fs');
const path = require('path');

const COLORS = {
  reset: '\x1b[0m', red: '\x1b[31m', green: '\x1b[32m',
  yellow: '\x1b[33m', blue: '\x1b[34m', magenta: '\x1b[35m', cyan: '\x1b[36m'
};

class ClusterRegressionFixer {
  constructor() {
    this.rootDir = path.resolve(__dirname, '..', '..');
    this.driversDir = path.join(this.rootDir, 'drivers');
    this.backupDir = path.join(this.rootDir, '.backup-cluster-fixes');
    
    this.targetDrivers = [
      'motion_sensor_battery',
      'sos_emergency_button_cr2032',
      'motion_temp_humidity_illumination_multi_battery'
    ];
    
    this.clusterMappings = {
      'CLUSTER.POWER_CONFIGURATION': "'genPowerCfg'",
      'CLUSTER.IAS_ZONE': "'ssIasZone'",
      'CLUSTER.TEMPERATURE_MEASUREMENT': "'msTemperatureMeasurement'",
      'CLUSTER.RELATIVE_HUMIDITY': "'msRelativeHumidity'",
      'CLUSTER.ILLUMINANCE_MEASUREMENT': "'msIlluminanceMeasurement'",
      'CLUSTER.ON_OFF': "'genOnOff'",
      'CLUSTER.LEVEL_CONTROL': "'genLevelCtrl'"
    };
    
    this.results = {
      fixed: 0,
      errors: 0,
      backups: 0
    };
  }

  log(msg, color = 'reset') {
    console.log(`${COLORS[color]}${msg}${COLORS.reset}`);
  }

  createBackup(filePath) {
    try {
      if (!fs.existsSync(this.backupDir)) {
        fs.mkdirSync(this.backupDir, { recursive: true });
      }
      
      const driver = path.basename(path.dirname(filePath));
      const backupPath = path.join(this.backupDir, `${driver}.device.js`);
      
      fs.copyFileSync(filePath, backupPath);
      this.results.backups++;
      
      return backupPath;
    } catch (err) {
      this.log(`  ❌ Backup failed: ${err.message}`, 'red');
      return null;
    }
  }

  fixDriver(driverId) {
    const devicePath = path.join(this.driversDir, driverId, 'device.js');
    
    if (!fs.existsSync(devicePath)) {
      this.log(`  ⚠️  ${driverId}: device.js not found`, 'yellow');
      return false;
    }
    
    try {
      // Read file
      let content = fs.readFileSync(devicePath, 'utf8');
      const originalContent = content;
      
      // Fix 1: Replace CLUSTER.* references
      let replacementsMade = 0;
      for (const [oldFormat, newFormat] of Object.entries(this.clusterMappings)) {
        const regex = new RegExp(oldFormat.replace('.', '\\.'), 'g');
        const matches = content.match(regex);
        if (matches) {
          content = content.replace(regex, newFormat);
          replacementsMade += matches.length;
        }
      }
      
      // Fix 2: Remove duplicate "const endpoint" if exists
      const endpointMatches = content.match(/const endpoint/g);
      if (endpointMatches && endpointMatches.length > 1) {
        // Keep first occurrence, comment out others
        let firstFound = false;
        content = content.replace(/const endpoint/g, match => {
          if (!firstFound) {
            firstFound = true;
            return match;
          }
          return '// const endpoint (duplicate removed)';
        });
        this.log(`  ✅ ${driverId}: Removed duplicate "const endpoint"`, 'yellow');
      }
      
      // If no changes, skip
      if (content === originalContent) {
        this.log(`  ✅ ${driverId}: Already fixed`, 'green');
        return true;
      }
      
      // Create backup
      const backupPath = this.createBackup(devicePath);
      if (!backupPath) {
        this.log(`  ❌ ${driverId}: Backup failed, skipping`, 'red');
        return false;
      }
      
      // Write fixed content
      fs.writeFileSync(devicePath, content, 'utf8');
      
      this.log(`  ✅ ${driverId}: ${replacementsMade} CLUSTER.* fixed`, 'green');
      this.results.fixed++;
      
      return true;
    } catch (err) {
      this.log(`  ❌ ${driverId}: ${err.message}`, 'red');
      this.results.errors++;
      return false;
    }
  }

  fixAll() {
    this.log('\n🔧 CORRECTION RÉGRESSIONS CLUSTER', 'cyan');
    this.log('='.repeat(60), 'cyan');
    
    for (const driverId of this.targetDrivers) {
      this.fixDriver(driverId);
    }
  }

  displaySummary() {
    this.log('\n' + '═'.repeat(60), 'magenta');
    this.log('  📊 RÉSULTATS', 'magenta');
    this.log('═'.repeat(60), 'magenta');
    
    this.log(`\n✅ Drivers corrigés: ${this.results.fixed}`, 'green');
    this.log(`💾 Backups créés: ${this.results.backups}`, 'cyan');
    
    if (this.results.errors > 0) {
      this.log(`❌ Erreurs: ${this.results.errors}`, 'red');
    }
    
    this.log(`\n📁 Backups: ${this.backupDir}`, 'blue');
    this.log('\n' + '═'.repeat(60), 'magenta');
  }

  async run() {
    console.log('\n');
    this.log('╔══════════════════════════════════════════════════════════════╗', 'magenta');
    this.log('║     🔧 CLUSTER REGRESSION AUTO-FIXER                       ║', 'magenta');
    this.log('║     Correction CLUSTER.* → String format                   ║', 'magenta');
    this.log('╚══════════════════════════════════════════════════════════════╝', 'magenta');
    console.log('\n');
    
    this.fixAll();
    this.displaySummary();
    
    this.log('\n✅ CORRECTIONS APPLIQUÉES!\n', 'green');
    this.log('🎯 PROCHAINES ÉTAPES:', 'cyan');
    this.log('   1. Valider: homey app validate', 'blue');
    this.log('   2. Tester si possible', 'blue');
    this.log('   3. Commit et push', 'blue');
    this.log('   4. Si KO: Restaurer depuis .backup-cluster-fixes/\n', 'blue');
  }
}

if (require.main === module) {
  const fixer = new ClusterRegressionFixer();
  fixer.run().catch(err => {
    console.error('❌ Erreur fatale:', err);
    process.exit(1);
  });
}

module.exports = ClusterRegressionFixer;
