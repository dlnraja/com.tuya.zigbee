#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');

/**
 * SCRIPT DE CORRECTION AUTOMATIQUE DES RÉFÉRENCES CLUSTER
 * 
 * Corrige tous les appels registerCapability() qui utilisent CLUSTER.*
 * vers le format string legacy compatible.
 * 
 * Basé sur l'analyse de 134 fichiers avec erreurs potentielles.
 */

// Table de correspondance CLUSTER object → string legacy name
const CLUSTER_MAP = {
  'CLUSTER.BASIC': 'genBasic',
  'CLUSTER.POWER_CONFIGURATION': 'genPowerCfg',
  'CLUSTER.DEVICE_TEMPERATURE': 'genDeviceTempCfg',
  'CLUSTER.IDENTIFY': 'genIdentify',
  'CLUSTER.GROUPS': 'genGroups',
  'CLUSTER.SCENES': 'genScenes',
  'CLUSTER.ON_OFF': 'genOnOff',
  'CLUSTER.ON_OFF_SWITCH_CONFIGURATION': 'genOnOffSwitchCfg',
  'CLUSTER.LEVEL_CONTROL': 'genLevelCtrl',
  'CLUSTER.ALARMS': 'genAlarms',
  'CLUSTER.TIME': 'genTime',
  'CLUSTER.ANALOG_INPUT': 'genAnalogInput',
  'CLUSTER.ANALOG_OUTPUT': 'genAnalogOutput',
  'CLUSTER.ANALOG_VALUE': 'genAnalogValue',
  'CLUSTER.BINARY_INPUT': 'genBinaryInput',
  'CLUSTER.BINARY_OUTPUT': 'genBinaryOutput',
  'CLUSTER.MULTISTATE_INPUT': 'genMultistateInput',
  'CLUSTER.MULTISTATE_OUTPUT': 'genMultistateOutput',
  'CLUSTER.MULTISTATE_VALUE': 'genMultistateValue',
  'CLUSTER.OTA': 'genOta',
  'CLUSTER.POLL_CONTROL': 'genPollCtrl',
  'CLUSTER.POWER_PROFILE': 'genPowerProfile',
  'CLUSTER.COLOR_CONTROL': 'lightingColorCtrl',
  'CLUSTER.BALLAST_CONFIGURATION': 'lightingBallastCfg',
  'CLUSTER.ILLUMINANCE_MEASUREMENT': 'msIlluminanceMeasurement',
  'CLUSTER.ILLUMINANCE_LEVEL_SENSING': 'msIlluminanceLevelSensing',
  'CLUSTER.TEMPERATURE_MEASUREMENT': 'msTemperatureMeasurement',
  'CLUSTER.PRESSURE_MEASUREMENT': 'msPressureMeasurement',
  'CLUSTER.FLOW_MEASUREMENT': 'msFlowMeasurement',
  'CLUSTER.RELATIVE_HUMIDITY': 'msRelativeHumidity',
  'CLUSTER.OCCUPANCY_SENSING': 'msOccupancySensing',
  'CLUSTER.SOIL_MOISTURE': 'msSoilMoisture',
  'CLUSTER.PH_MEASUREMENT': 'msPhMeasurement',
  'CLUSTER.ELECTRICAL_CONDUCTIVITY_MEASUREMENT': 'msElectricalConductivity',
  'CLUSTER.WIND_SPEED_MEASUREMENT': 'msWindSpeed',
  'CLUSTER.CONCENTRATION_MEASUREMENT': 'msConcentration',
  'CLUSTER.IAS_ZONE': 'ssIasZone',
  'CLUSTER.IAS_ACE': 'ssIasAce',
  'CLUSTER.IAS_WD': 'ssIasWd',
  'CLUSTER.METERING': 'seMetering',
  'CLUSTER.ELECTRICAL_MEASUREMENT': 'haElectricalMeasurement',
  'CLUSTER.DIAGNOSTICS': 'haDiagnostic',
  'CLUSTER.THERMOSTAT': 'hvacThermostat',
  'CLUSTER.FAN_CONTROL': 'hvacFanCtrl',
  'CLUSTER.THERMOSTAT_UI_CONFIGURATION': 'hvacUserInterfaceCfg',
  'CLUSTER.DOOR_LOCK': 'closuresDoorLock',
  'CLUSTER.WINDOW_COVERING': 'closuresWindowCovering',
};

// Statistiques
const stats = {
  filesScanned: 0,
  filesModified: 0,
  replacements: 0,
  errors: [],
  changes: []
};

/**
 * Scanner récursif de répertoire
 */
function* walkSync(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (!file.startsWith('.') && file !== 'node_modules') {
        yield* walkSync(filePath);
      }
    } else if (file.endsWith('.js') && file === 'device.js') {
      yield filePath;
    }
  }
}

/**
 * Correction d'un fichier
 */
function fixFile(filePath) {
  try {
    stats.filesScanned++;
    
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    let modified = false;
    
    // Pattern pour matcher registerCapability avec CLUSTER.*
    // Ex: this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
    const regex = /registerCapability\s*\(\s*['"]([^'"]+)['"]\s*,\s*(CLUSTER\.[A-Z_]+)\s*,/g;
    
    let match;
    const replacements = [];
    
    while ((match = regex.exec(content)) !== null) {
      const capabilityId = match[1];
      const clusterRef = match[2];
      const legacyName = CLUSTER_MAP[clusterRef];
      
      if (legacyName) {
        replacements.push({
          original: match[0],
          replacement: match[0].replace(clusterRef, `'${legacyName}'`),
          clusterRef,
          legacyName,
          capabilityId,
          position: match.index
        });
      } else {
        stats.errors.push({
          file: filePath,
          error: `Unknown cluster reference: ${clusterRef}`,
          capabilityId
        });
      }
    }
    
    // Appliquer les remplacements en ordre inverse pour préserver les positions
    replacements.reverse().forEach(rep => {
      content = content.substring(0, rep.position) +
                content.substring(rep.position).replace(rep.original, rep.replacement);
      modified = true;
      stats.replacements++;
      stats.changes.push({
        file: filePath,
        capability: rep.capabilityId,
        from: rep.clusterRef,
        to: rep.legacyName
      });
    });
    
    // Sauvegarder si modifié
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      stats.filesModified++;
      console.log(`✅ Fixed: ${path.relative(process.cwd(), filePath)} (${replacements.length} changes)`);
    }
    
  } catch (error) {
    stats.errors.push({
      file: filePath,
      error: error.message
    });
    console.error(`❌ Error in ${filePath}:`, error.message);
  }
}

/**
 * Main
 */
function main() {
  console.log('🔧 FIXING ALL CLUSTER REFERENCES IN registerCapability CALLS');
  console.log('='.repeat(70));
  console.log();
  
  const driversPath = path.join(__dirname, '..', '..', 'drivers');
  
  if (!fs.existsSync(driversPath)) {
    console.error(`❌ Drivers directory not found: ${driversPath}`);
    process.exit(1);
  }
  
  console.log(`📁 Scanning: ${driversPath}`);
  console.log();
  
  // Scanner tous les device.js
  for (const filePath of walkSync(driversPath)) {
    fixFile(filePath);
  }
  
  // Rapport final
  console.log();
  console.log('='.repeat(70));
  console.log('📊 SUMMARY');
  console.log('='.repeat(70));
  console.log(`📄 Files scanned: ${stats.filesScanned}`);
  console.log(`✏️  Files modified: ${stats.filesModified}`);
  console.log(`🔄 Total replacements: ${stats.replacements}`);
  console.log(`❌ Errors: ${stats.errors.length}`);
  console.log();
  
  if (stats.errors.length > 0) {
    console.log('❌ ERRORS:');
    stats.errors.forEach((err, i) => {
      console.log(`  ${i + 1}. ${path.relative(process.cwd(), err.file)}`);
      console.log(`     ${err.error}`);
      if (err.capabilityId) console.log(`     Capability: ${err.capabilityId}`);
    });
    console.log();
  }
  
  if (stats.changes.length > 0) {
    console.log(`✅ CHANGES (showing first 20):`);
    stats.changes.slice(0, 20).forEach((change, i) => {
      console.log(`  ${i + 1}. ${path.basename(path.dirname(change.file))}/device.js`);
      console.log(`     ${change.capability}: ${change.from} → '${change.to}'`);
    });
    if (stats.changes.length > 20) {
      console.log(`  ... and ${stats.changes.length - 20} more`);
    }
    console.log();
  }
  
  // Sauvegarder rapport détaillé
  const reportPath = path.join(__dirname, '..', '..', 'CLUSTER_FIX_REPORT.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    stats,
    changes: stats.changes,
    errors: stats.errors
  }, null, 2));
  
  console.log(`📋 Detailed report saved: ${path.relative(process.cwd(), reportPath)}`);
  console.log();
  console.log('✅ DONE!');
  
  process.exit(stats.errors.length > 0 ? 1 : 0);
}

main();
