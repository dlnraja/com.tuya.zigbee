#!/usr/bin/env node
'use strict';

/**
 * FIX CLUSTER NAMES TO NUMERIC IDS
 * 
 * Convertit tous les cluster names (strings) en cluster IDs (numbers)
 * pour garantir la compatibilité et éviter les problèmes.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

// Mapping des cluster names vers IDs numériques
const CLUSTER_NAME_TO_ID = {
  // Basic clusters
  'genBasic': 0,
  'genPowerCfg': 1,
  'genDeviceTempCfg': 2,
  'genIdentify': 3,
  'genGroups': 4,
  'genScenes': 5,
  'genOnOff': 6,
  'genOnOffSwitchCfg': 7,
  'genLevelCtrl': 8,
  'genAlarms': 9,
  'genTime': 10,
  'genRssiLocation': 11,
  'genAnalogInput': 12,
  'genAnalogOutput': 13,
  'genAnalogValue': 14,
  'genBinaryInput': 15,
  'genBinaryOutput': 16,
  'genBinaryValue': 17,
  'genMultistateInput': 18,
  'genMultistateOutput': 19,
  'genMultistateValue': 20,
  'genCommissioning': 21,
  
  // Closures
  'closuresShadeCfg': 256,
  'closuresDoorLock': 257,
  'closuresWindowCovering': 258,
  
  // HVAC
  'hvacPumpCfgCtrl': 512,
  'hvacThermostat': 513,
  'hvacFanCtrl': 514,
  'hvacDehumidificationCtrl': 515,
  'hvacUserInterfaceCfg': 516,
  
  // Lighting
  'lightingColorCtrl': 768,
  'lightingBallastCfg': 769,
  
  // Measurement & Sensing
  'msIlluminanceMeasurement': 1024,
  'msIlluminanceLevelSensing': 1025,
  'msTemperatureMeasurement': 1026,
  'msPressureMeasurement': 1027,
  'msFlowMeasurement': 1028,
  'msRelativeHumidity': 1029,
  'msOccupancySensing': 1030,
  
  // Security & Safety
  'ssIasZone': 1280,
  'iasZone': 1280,
  'ssIasAce': 1281,
  'ssIasWd': 1282,
  
  // Smart Energy
  'seMetering': 1794,
  
  // Electrical Measurement
  'haElectricalMeasurement': 2820,
  
  // Tuya
  'manuSpecificTuya': 61184,
  'tuyaSpecific': 61184
};

/**
 * Convertir les cluster names en IDs dans un fichier
 */
function fixClusterNamesInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  let changes = [];
  
  for (const [clusterName, clusterId] of Object.entries(CLUSTER_NAME_TO_ID)) {
    // Pattern pour trouver: registerCapability('xxx', 'clusterName', {
    const pattern1 = new RegExp(
      `(registerCapability\\s*\\([^,]+,\\s*)'${clusterName}'(\\s*,)`,
      'g'
    );
    
    if (pattern1.test(content)) {
      content = String(content).replace(pattern1, `$1${clusterId}$2`);
      modified = true;
      changes.push(`  '${clusterName}' → ${clusterId}`);
    }
    
    // Pattern 2: registerCapability("capability", "clusterName", {
    const pattern2 = new RegExp(
      `(registerCapability\\s*\\([^,]+,\\s*)"${clusterName}"(\\s*,)`,
      'g'
    );
    
    const originalContent = fs.readFileSync(filePath, 'utf8');
    if (pattern2.test(originalContent)) {
      content = String(originalContent).replace(pattern2, `$1${clusterId}$2`);
      modified = true;
      if (!changes.find(c => c.includes(clusterName))) {
        changes.push(`  '${clusterName}' → ${clusterId}`);
      }
    }
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    return changes;
  }
  
  return null;
}

/**
 * Scanner tous les drivers
 */
function scanDrivers() {
  console.log('🔧 FIXING CLUSTER NAMES TO NUMERIC IDS\n');
  console.log('='.repeat(60));
  
  const drivers = fs.readdirSync(DRIVERS_DIR)
    .filter(f => fs.statSync(path.join(DRIVERS_DIR, f)).isDirectory());
  
  let totalFixed = 0;
  let totalChanges = 0;
  
  for (const driver of drivers) {
    const devicePath = path.join(DRIVERS_DIR, driver, 'device.js');
    
    if (!fs.existsSync(devicePath)) continue;
    
    const changes = fixClusterNamesInFile(devicePath);
    
    if (changes && changes.length > 0) {
      console.log(`\n✅ ${driver}/device.js`);
      changes.forEach(change => console.log(change));
      totalFixed++;
      totalChanges += changes.length;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 SUMMARY:`);
  console.log(`  Drivers scanned: ${drivers.length}`);
  console.log(`  Drivers fixed: ${totalFixed}`);
  console.log(`  Total changes: ${totalChanges}`);
  
  if (totalFixed > 0) {
    console.log('\n✅ All cluster names converted to numeric IDs!');
  } else {
    console.log('\n✅ All drivers already using numeric cluster IDs!');
  }
}

// Main
scanDrivers();
