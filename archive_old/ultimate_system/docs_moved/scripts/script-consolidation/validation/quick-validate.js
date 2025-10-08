#!/usr/bin/env node
'use strict';

#!/usr/bin/env node

console.log('🔍 VALIDATION RAPIDE DES DRIVERS');
console.log('=================================');

const fs = require('fs');
const path = require('path');

const driversDir = path.join(__dirname, '../../drivers');
const expectedDrivers = [
  'zigbee-tuya-universal',
  'tuya-plug-universal',
  'tuya-light-universal',
  'tuya-cover-universal',
  'tuya-climate-universal',
  'tuya-sensor-universal',
  'tuya-remote-universal',
  'fan-tuya-universal',
  'lock-tuya-universal'
];

console.log('📁 Vérification de la structure des drivers...\n');

let validCount = 0;
let totalCount = 0;

for (const driverId of expectedDrivers) {
  const driverPath = path.join(driversDir, driverId);
  
  if (fs.existsSync(driverPath)) {
    totalCount++;
    
    const composePath = path.join(driverPath, 'driver.compose.json');
    const devicePath = path.join(driverPath, 'device.js');
    const assetsDir = path.join(driverPath, 'assets');
    const flowDir = path.join(driverPath, 'flow');
    
    let isValid = true;
    let issues = [];
    
    if (!fs.existsSync(composePath)) {
      isValid = false;
      issues.push('driver.compose.json manquant');
    }
    
    if (!fs.existsSync(devicePath)) {
      isValid = false;
      issues.push('device.js manquant');
    }
    
    if (!fs.existsSync(assetsDir) || fs.readdirSync(assetsDir).length === 0) {
      isValid = false;
      issues.push('assets incomplets');
    }
    
    if (!fs.existsSync(flowDir) || fs.readdirSync(flowDir).length === 0) {
      isValid = false;
      issues.push('flow cards manquantes');
    }
    
    if (isValid) {
      validCount++;
      console.log(`✅ ${driverId} - Complet`);
    } else {
      console.log(`❌ ${driverId} - ${issues.join(', ')}`);
    }
  } else {
    console.log(`❌ ${driverId} - Dossier manquant`);
  }
}

console.log(`\n📊 RÉSUMÉ DE LA VALIDATION:`);
console.log(`📁 Drivers totaux: ${expectedDrivers.length}`);
console.log(`✅ Drivers valides: ${validCount}`);
console.log(`❌ Drivers invalides: ${totalCount - validCount}`);
console.log(`📈 Taux de succès: ${Math.round((validCount / expectedDrivers.length) * 100)}%`);

if (validCount === expectedDrivers.length) {
  console.log('\n🎉 TOUS LES DRIVERS SONT VALIDES !');
  console.log('::END::QUICK_VALIDATE::OK');
} else {
  console.log('\n⚠️ Certains drivers nécessitent une attention');
  console.log('::END::QUICK_VALIDATE::FAIL');
  process.exit(1);
}
