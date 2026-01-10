#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

console.log('🔧 CORRECTION FINALE - 19 WARNINGS LIB setCapabilityValue\n');

const ROOT = path.join(__dirname, '..');

let stats = {
  filesModified: 0,
  linesFixed: 0,
  backupsCreated: 0
};

// Corrections exactes (extraites audit)
const FIXES = [
  // Valeurs littérales (déjà numériques, mais ajout parseFloat pour conformité)
  {
    file: 'lib/devices/BaseHybridDevice.js',
    old: "await this.setCapabilityValue('measure_battery', 50)",
    new: "await this.setCapabilityValue('measure_battery', 50)" // Littéral OK
  },
  {
    file: 'lib/devices/BaseTuyaDPDevice.js',
    old: "await this.setCapabilityValue('measure_battery', 100)",
    new: "await this.setCapabilityValue('measure_battery', 100)" // Littéral OK
  },
  {
    file: 'lib/diagnostics/DeviceHealth.js',
    old: "await device.setCapabilityValue('measure_rssi', rssi)",
    new: "await device.setCapabilityValue('measure_rssi', parseFloat(rssi))"
  },
  {
    file: 'lib/helpers/BatteryRouter.js',
    old: "await device.setCapabilityValue('measure_battery', 100)",
    new: "await device.setCapabilityValue('measure_battery', 100)" // Littéral OK
  },
  {
    file: 'lib/helpers/VirtualCapabilities.js',
    old: "await device.setCapabilityValue('measure_apparent_power', VA)",
    new: "await device.setCapabilityValue('measure_apparent_power', parseFloat(VA))"
  },
  {
    file: 'lib/helpers/VirtualCapabilities.js',
    old: "await device.setCapabilityValue('measure_power_factor', Math.min(1, Math.max(0, PF)))",
    new: "await device.setCapabilityValue('measure_power_factor', parseFloat(Math.min(1, Math.max(0, PF))))"
  },
  {
    file: 'lib/helpers/VirtualCapabilities.js',
    old: "await device.setCapabilityValue('measure_rssi', rssi || -100)",
    new: "await device.setCapabilityValue('measure_rssi', parseFloat(rssi || -100))"
  },
  {
    file: 'lib/HybridDriverSystem.js',
    old: "await this.setCapabilityValue('measure_temperature', value / 100)",
    new: "await this.setCapabilityValue('measure_temperature', parseFloat(value) / 100)"
  },
  {
    file: 'lib/HybridDriverSystem.js',
    old: "await this.setCapabilityValue('measure_humidity', value / 100)",
    new: "await this.setCapabilityValue('measure_humidity', parseFloat(value) / 100)"
  },
  {
    file: 'lib/managers/IASZoneManager.js',
    old: "device.setCapabilityValue('measure_battery', 15)",
    new: "device.setCapabilityValue('measure_battery', 15)" // Littéral OK
  },
  {
    file: 'lib/mixins/TuyaDeviceMixin.js',
    old: "await this.setCapabilityValue('measure_battery', 100)",
    new: "await this.setCapabilityValue('measure_battery', 100)" // Littéral OK
  },
  {
    file: 'lib/SonoffZclDevice.js',
    old: "await this.setCapabilityValue('measure_battery', 100)",
    new: "await this.setCapabilityValue('measure_battery', 100)" // Littéral OK
  },
  {
    file: 'lib/SonoffZclDevice.js',
    old: "this.setCapabilityValue('measure_battery', Math.min(100, Math.max(0, percentage)))",
    new: "this.setCapabilityValue('measure_battery', parseFloat(Math.min(100, Math.max(0, percentage))))"
  },
  {
    file: 'lib/SonoffZclDevice.js',
    old: "this.setCapabilityValue('measure_luminance', 0)",
    new: "this.setCapabilityValue('measure_luminance', 0)" // Littéral OK
  },
  {
    file: 'lib/tuya/DataRecoveryManager.js',
    old: "await this.device.setCapabilityValue('measure_lux', lux)",
    new: "await this.device.setCapabilityValue('measure_lux', parseFloat(lux))"
  },
  {
    file: 'lib/tuya/TuyaEF00Manager.js',
    old: "this.device.setCapabilityValue?.('measure_battery', 100)",
    new: "this.device.setCapabilityValue?.('measure_battery', 100)" // Littéral OK
  },
  {
    file: 'lib/tuya/TuyaGatewayEmulator.js',
    old: "device.setCapabilityValue?.('measure_temperature', temp)",
    new: "device.setCapabilityValue?.('measure_temperature', parseFloat(temp))"
  },
  {
    file: 'lib/tuya/TuyaGatewayEmulator.js',
    old: "device.setCapabilityValue?.('measure_humidity', hum)",
    new: "device.setCapabilityValue?.('measure_humidity', parseFloat(hum))"
  },
  {
    file: 'lib/tuya/TuyaGatewayEmulator.js',
    old: "device.setCapabilityValue?.('measure_battery', bat)",
    new: "device.setCapabilityValue?.('measure_battery', parseFloat(bat))"
  }
];

/**
 * Appliquer corrections
 */
function applyFixes() {
  const fileMap = new Map();

  // Grouper par fichier
  FIXES.forEach(fix => {
    if (!fileMap.has(fix.file)) {
      fileMap.set(fix.file, []);
    }
    fileMap.get(fix.file).push(fix);
  });

  // Appliquer par fichier
  fileMap.forEach((fixes, relativeFile) => {
    const filePath = path.join(ROOT, relativeFile);

    if (!fs.existsSync(filePath)) {
      console.log(`   ⚠️  Fichier non trouvé: ${relativeFile}`);
      return;
    }

    try {
      let content = fs.readFileSync(filePath, 'utf8');
      let modified = false;

      fixes.forEach(fix => {
        if (fix.old === fix.new) return; // Skip si littéral déjà OK

        if (content.includes(fix.old)) {
          content = content.replace(fix.old, fix.new);
          modified = true;
          stats.linesFixed++;
        }
      });

      if (modified) {
        // Backup
        const backupPath = `${filePath}.backup-final-lib-${Date.now()}`;
        fs.copyFileSync(filePath, backupPath);
        stats.backupsCreated++;

        // Sauvegarder
        fs.writeFileSync(filePath, content, 'utf8');
        stats.filesModified++;

        console.log(`   ✅ ${relativeFile} (${fixes.filter(f => f.old !== f.new).length} corrections)`);
      }

    } catch (e) {
      console.error(`   ❌ Erreur ${relativeFile}:`, e.message);
    }
  });
}

// EXÉCUTION
console.log('🎯 Application corrections finales lib/...\n');
applyFixes();

console.log('\n\n📊 RAPPORT CORRECTIONS:\n');
console.log(`   Fichiers modifiés: ${stats.filesModified}`);
console.log(`   Lignes corrigées: ${stats.linesFixed}`);
console.log(`   Backups créés: ${stats.backupsCreated}\n`);

if (stats.filesModified > 0) {
  console.log('✅ CORRECTIONS APPLIQUÉES\n');
  console.log('💡 NOTE: Valeurs littérales (50, 100, 0, 15) déjà numériques - pas modifiées');
  console.log('   Seules les variables ont été converties avec parseFloat()\n');
}

console.log('🎯 PROCHAINES ÉTAPES:');
console.log('   1. Relancer audit: node scripts/audit_complete_advanced.js');
console.log('   2. Valider: homey app validate --level publish');
console.log('   3. Build: homey app build\n');

process.exit(0);
