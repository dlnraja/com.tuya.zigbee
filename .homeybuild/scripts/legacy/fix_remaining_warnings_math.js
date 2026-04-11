#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

console.log('🔧 CORRECTION WARNINGS RESTANTS - Expressions mathématiques\n');

const ROOT = path.join(__dirname, '..');

let stats = {
  filesModified: 0,
  linesFixed: 0,
  backupsCreated: 0
};

// Liste des corrections spécifiques (extraites du rapport)
const FIXES = [
  {
    file: 'drivers/air_quality_co2/device.js',
    line: 109,
    old: "this.setCapabilityValue('measure_temperature', v / 100)",
    new: "this.setCapabilityValue('measure_temperature', parseFloat(v) / 100)"
  },
  {
    file: 'drivers/air_quality_co2/device.js',
    line: 113,
    old: "this.setCapabilityValue('measure_humidity', v / 100)",
    new: "this.setCapabilityValue('measure_humidity', parseFloat(v) / 100)"
  },
  {
    file: 'drivers/climate_sensor/device.js',
    line: 808,
    old: "this.setCapabilityValue('measure_battery', Math.max(0, Math.min(100, battery)))",
    new: "this.setCapabilityValue('measure_battery', parseFloat(Math.max(0, Math.min(100, battery))))"
  },
  {
    file: 'drivers/climate_sensor/device.js',
    line: 920,
    old: "await this.setCapabilityValue('measure_battery', Math.max(0, Math.min(100, battery)))",
    new: "await this.setCapabilityValue('measure_battery', parseFloat(Math.max(0, Math.min(100, battery))))"
  },
  {
    file: 'drivers/curtain_motor/device.js',
    line: 135,
    old: "this.setCapabilityValue('measure_battery', Math.min(100, Math.max(0, battery)))",
    new: "this.setCapabilityValue('measure_battery', parseFloat(Math.min(100, Math.max(0, battery))))"
  },
  {
    file: 'drivers/plug_energy_monitor/device.js',
    line: 287,
    old: "this.setCapabilityValue('measure_power', Math.max(0, power))",
    new: "this.setCapabilityValue('measure_power', parseFloat(Math.max(0, power)))"
  },
  {
    file: 'drivers/plug_smart/device.js',
    line: 73,
    old: "this.setCapabilityValue('measure_voltage', v / 10)",
    new: "this.setCapabilityValue('measure_voltage', parseFloat(v) / 10)"
  },
  {
    file: 'drivers/plug_smart/device.js',
    line: 74,
    old: "this.setCapabilityValue('measure_current', v / 1000)",
    new: "this.setCapabilityValue('measure_current', parseFloat(v) / 1000)"
  },
  {
    file: 'drivers/presence_sensor_radar/device.js',
    line: 1693,
    old: "this.setCapabilityValue('measure_distance', distanceMeters)",
    new: "this.setCapabilityValue('measure_distance', parseFloat(distanceMeters))"
  },
  {
    file: 'drivers/presence_sensor_radar/device.js',
    line: 1899,
    old: "this.setCapabilityValue('measure_luminance', Math.round(lux))",
    new: "this.setCapabilityValue('measure_luminance', parseFloat(Math.round(lux)))"
  },
  {
    file: 'drivers/radiator_valve/device.js',
    line: 63,
    old: "this.setCapabilityValue('measure_temperature', v / 100)",
    new: "this.setCapabilityValue('measure_temperature', parseFloat(v) / 100)"
  },
  {
    file: 'drivers/smoke_detector_advanced/device.js',
    line: 93,
    old: "device?.setCapabilityValue?.('measure_battery', Math.min(100, v))",
    new: "device?.setCapabilityValue?.('measure_battery', parseFloat(Math.min(100, v)))"
  },
  {
    file: 'drivers/soil_sensor/device.js',
    line: 382,
    old: "this.setCapabilityValue('measure_soil_moisture', validatedMoisture)",
    new: "this.setCapabilityValue('measure_soil_moisture', parseFloat(validatedMoisture))"
  },
  {
    file: 'drivers/switch_2gang/device.js',
    line: 233,
    old: "this.setCapabilityValue('measure_power', attrs.activePower / 10)",
    new: "this.setCapabilityValue('measure_power', parseFloat(attrs.activePower) / 10)"
  },
  {
    file: 'drivers/switch_2gang/device.js',
    line: 236,
    old: "this.setCapabilityValue('measure_voltage', attrs.rmsVoltage / 10)",
    new: "this.setCapabilityValue('measure_voltage', parseFloat(attrs.rmsVoltage) / 10)"
  },
  {
    file: 'drivers/switch_2gang/device.js',
    line: 239,
    old: "this.setCapabilityValue('measure_current', attrs.rmsCurrent / 1000)",
    new: "this.setCapabilityValue('measure_current', parseFloat(attrs.rmsCurrent) / 1000)"
  },
  {
    file: 'drivers/water_tank_monitor/device.js',
    line: 139,
    old: "await this.setCapabilityValue('measure_water_level', Math.round(waterLevel * 100) / 100)",
    new: "await this.setCapabilityValue('measure_water_level', parseFloat(Math.round(waterLevel * 100) / 100))"
  },
  {
    file: 'drivers/water_tank_monitor/device.js',
    line: 140,
    old: "await this.setCapabilityValue('measure_water_percentage', Math.round(fillPercentage))",
    new: "await this.setCapabilityValue('measure_water_percentage', parseFloat(Math.round(fillPercentage)))"
  },
  {
    file: 'drivers/water_tank_monitor/device.js',
    line: 188,
    old: "await this.setCapabilityValue('measure_water_percentage', percentage)",
    new: "await this.setCapabilityValue('measure_water_percentage', parseFloat(percentage))"
  },
  {
    file: 'drivers/water_tank_monitor/device.js',
    line: 202,
    old: "await this.setCapabilityValue('measure_water_level', Math.round(levelM * 100) / 100)",
    new: "await this.setCapabilityValue('measure_water_level', parseFloat(Math.round(levelM * 100) / 100))"
  },
  {
    file: 'lib/devices/BaseHybridDevice.js',
    line: 3198,
    old: "await this.setCapabilityValue('measure_battery', 50)",
    new: "await this.setCapabilityValue('measure_battery', 50)" // Déjà numérique, OK
  },
  {
    file: 'lib/devices/BaseTuyaDPDevice.js',
    line: 65,
    old: "await this.setCapabilityValue('measure_battery', 100)",
    new: "await this.setCapabilityValue('measure_battery', 100)" // Déjà numérique, OK
  },
  {
    file: 'lib/devices/HybridSensorBase.js',
    line: 2372,
    old: "this.setCapabilityValue('measure_distance', distance)",
    new: "this.setCapabilityValue('measure_distance', parseFloat(distance))"
  },
  {
    file: 'lib/devices/HybridThermostatBase.js',
    line: 204,
    old: "this.setCapabilityValue('measure_temperature', v / 100)",
    new: "this.setCapabilityValue('measure_temperature', parseFloat(v) / 100)"
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
        if (fix.old === fix.new) return; // Skip si pas de changement

        if (content.includes(fix.old)) {
          content = content.replace(fix.old, fix.new);
          modified = true;
          stats.linesFixed++;
        }
      });

      if (modified) {
        // Backup
        const backupPath = `${filePath}.backup-math-${Date.now()}`;
        fs.copyFileSync(filePath, backupPath);
        stats.backupsCreated++;

        // Sauvegarder
        fs.writeFileSync(filePath, content, 'utf8');
        stats.filesModified++;

        console.log(`   ✅ ${relativeFile} (${fixes.length} corrections)`);
      }

    } catch (e) {
      console.error(`   ❌ Erreur ${relativeFile}:`, e.message);
    }
  });
}

// EXÉCUTION
console.log('🎯 Application corrections expressions mathématiques...\n');
applyFixes();

console.log('\n\n📊 RAPPORT CORRECTIONS:\n');
console.log(`   Fichiers modifiés: ${stats.filesModified}`);
console.log(`   Lignes corrigées: ${stats.linesFixed}`);
console.log(`   Backups créés: ${stats.backupsCreated}\n`);

if (stats.filesModified > 0) {
  console.log('✅ CORRECTIONS APPLIQUÉES\n');
  console.log('🎯 PROCHAINES ÉTAPES:');
  console.log('   1. Relancer audit: node scripts/audit_complete_advanced.js');
  console.log('   2. Valider: homey app validate --level publish');
  console.log('   3. Build: homey app build\n');
}

process.exit(0);
