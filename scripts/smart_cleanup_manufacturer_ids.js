#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

console.log('🧹 NETTOYAGE INTELLIGENT MANUFACTURER IDs\n');

const DRIVERS_DIR = path.join(__dirname, '..', 'drivers');

// Patterns de manufacturer IDs par catégorie de device
const MFG_PATTERNS = {
  // Switches & Relays
  switch: ['TS0001', 'TS0002', 'TS0003', 'TS0004', 'TS0011', 'TS0012', 'TS0013', 'TS0014', '_TZ3000_'],
  
  // Buttons
  button: ['TS0041', 'TS0042', 'TS0043', 'TS0044', '_TZ3000_', '_TZ3400_'],
  
  // Sensors
  motion: ['TS0202', '_TZ3000_mmtwjmaq', '_TZ3000_kmh5qpmb', 'SJCGQ'],
  contact: ['TS0203', '_TZ3000_26fmupbb', '_TZ3000_n2egfsli'],
  climate: ['TS0201', '_TZE200_', 'lumi.weather'],
  water: ['TS0207', 'lumi.sensor_wleak', '_TZE200_qq9mpfhw'],
  smoke: ['TS0205', '_TZE200_'],
  gas: ['TS0204', '_TZE200_'],
  
  // Plugs
  plug: ['TS011F', 'TS0121', '_TZ3000_g5xawfcq', '_TZ3000_cehuw1lw'],
  
  // Lighting
  bulb: ['TS0505', 'TS0503', 'TS0502', 'lumi.light'],
  led_strip: ['TS0505', '_TZE200_', '_TZ3000_'],
  
  // Curtains & Blinds
  curtain: ['TS130F', '_TZE200_fctwhugx', '_TZE200_cowvfni3'],
  
  // Thermostats
  thermostat: ['TS0601', '_TZE200_', 'lumi.airrtc'],
  
  // Valves
  valve: ['TS0601', '_TZE200_'],
  
  // Locks
  lock: ['_TZE200_', 'lumi.lock'],
  
  // Siren
  siren: ['TS0216', '_TZ3000_'],
  
  // Gateway/Hub (devrait avoir TRÈS PEU d'IDs)
  gateway: ['_TZ3000_']
};

// IDs génériques à TOUJOURS supprimer (marques non Tuya/Zigbee générique)
const GENERIC_TO_REMOVE = [
  'GE', 'IKEA of Sweden', 'Samsung', 'Sengled', 'SmartThings',
  'LEDVANCE', 'SYLVANIA', 'CentraLite', 'Iris', 'Jasco Products',
  "Lowe's", '3460-L', 'iL07_1', 'TRADFRI'
];

function identifyCategory(driverName) {
  const name = driverName.toLowerCase();
  
  if (name.includes('switch_wall') || name.includes('switch_touch') || name.includes('switch_wireless') || 
      name.includes('switch_basic') || name.includes('switch_hybrid') || name.includes('switch_internal') ||
      name.includes('switch_generic')) return 'switch';
  
  if (name.includes('button')) return 'button';
  if (name.includes('motion') || name.includes('pir') || name.includes('presence') || name.includes('radar')) return 'motion';
  if (name.includes('contact') || name.includes('door')) return 'contact';
  if (name.includes('climate') || name.includes('temp') || name.includes('humidity') || name.includes('soil')) return 'climate';
  if (name.includes('water_leak') || name.includes('water_valve')) return 'water';
  if (name.includes('smoke')) return 'smoke';
  if (name.includes('gas')) return 'gas';
  if (name.includes('plug') || name.includes('outlet') || name.includes('usb_outlet')) return 'plug';
  if (name.includes('bulb')) return 'bulb';
  if (name.includes('led_strip') || name.includes('light_controller')) return 'led_strip';
  if (name.includes('curtain') || name.includes('blind') || name.includes('shutter')) return 'curtain';
  if (name.includes('thermostat') || name.includes('hvac') || name.includes('radiator')) return 'thermostat';
  if (name.includes('valve') && !name.includes('water')) return 'valve';
  if (name.includes('lock')) return 'lock';
  if (name.includes('siren') || name.includes('doorbell')) return 'siren';
  if (name.includes('gateway') || name.includes('hub') || name.includes('bridge')) return 'gateway';
  if (name.includes('dimmer')) return 'switch'; // Dimmers sont des switches spéciaux
  if (name.includes('scene_controller')) return 'button';
  
  return 'unknown';
}

function shouldKeepManufacturerId(mfgId, category) {
  // Toujours supprimer les IDs génériques
  if (GENERIC_TO_REMOVE.includes(mfgId)) return false;
  
  // Garder les IDs Tuya génériques courts
  if (mfgId.startsWith('TS0') && mfgId.length <= 7) {
    const patterns = MFG_PATTERNS[category] || [];
    return patterns.some(p => mfgId.startsWith(p));
  }
  
  // Garder les IDs spécifiques Tuya (_TZ...)
  if (mfgId.startsWith('_TZ') || mfgId.startsWith('_TYZ')) {
    const patterns = MFG_PATTERNS[category] || [];
    return patterns.some(p => mfgId.startsWith(p));
  }
  
  // Garder Xiaomi/Aqara pour certaines catégories
  if (mfgId.startsWith('lumi.') || mfgId.startsWith('SJCGQ')) {
    return ['motion', 'contact', 'climate', 'water', 'bulb', 'button'].includes(category);
  }
  
  // Si catégorie inconnue, garder uniquement IDs Tuya très spécifiques
  if (category === 'unknown') {
    return mfgId.startsWith('_TZ') && mfgId.length > 15;
  }
  
  return false;
}

function smartCleanProductIds(productIds, mfgIds) {
  // Garder seulement les product IDs qui correspondent aux manufacturer IDs conservés
  const relevantPids = new Set();
  
  mfgIds.forEach(mfgId => {
    if (mfgId.startsWith('TS0')) {
      relevantPids.add(mfgId); // TS codes sont aussi product IDs
    }
  });
  
  // Ajouter product IDs Tuya génériques pertinents
  const tuyaPids = productIds.filter(pid => 
    pid.startsWith('TS0') || 
    pid.length === 7 || // Codes Tuya style q9mpfhw
    pid.startsWith('_TZ')
  );
  
  tuyaPids.forEach(pid => relevantPids.add(pid));
  
  return Array.from(relevantPids).slice(0, 10); // Max 10 product IDs
}

// TRAITEMENT
console.log('🔍 Analyse et nettoyage...\n');

const drivers = fs.readdirSync(DRIVERS_DIR).filter(d => {
  const stat = fs.statSync(path.join(DRIVERS_DIR, d));
  return stat.isDirectory() && !d.startsWith('.');
});

let cleaned = 0;
let totalMfgBefore = 0;
let totalMfgAfter = 0;

drivers.forEach(driverName => {
  const composePath = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');
  
  if (!fs.existsSync(composePath)) return;
  
  try {
    const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    
    if (!compose.zigbee || !compose.zigbee.manufacturerName) return;
    
    const category = identifyCategory(driverName);
    
    let mfgIds = Array.isArray(compose.zigbee.manufacturerName)
      ? compose.zigbee.manufacturerName
      : [compose.zigbee.manufacturerName];
    
    let productIds = Array.isArray(compose.zigbee.productId)
      ? compose.zigbee.productId
      : (compose.zigbee.productId ? [compose.zigbee.productId] : []);
    
    const beforeCount = mfgIds.length;
    totalMfgBefore += beforeCount;
    
    // Ne nettoyer que si >15 manufacturer IDs (suspects)
    if (beforeCount <= 15) return;
    
    // Backup
    const backupPath = composePath + '.backup-smart-clean.' + Date.now();
    fs.copyFileSync(composePath, backupPath);
    
    // Filtrer manufacturer IDs
    const cleanedMfgIds = mfgIds.filter(id => shouldKeepManufacturerId(id, category));
    
    // Si aucun ID conservé, garder au moins les Tuya génériques
    if (cleanedMfgIds.length === 0) {
      cleanedMfgIds.push(...mfgIds.filter(id => id.startsWith('_TZ') || id.startsWith('TS0')).slice(0, 5));
    }
    
    // Nettoyer product IDs
    const cleanedPids = smartCleanProductIds(productIds, cleanedMfgIds);
    
    // Appliquer
    compose.zigbee.manufacturerName = cleanedMfgIds;
    compose.zigbee.productId = cleanedPids;
    
    fs.writeFileSync(composePath, JSON.stringify(compose, null, 2), 'utf8');
    
    const afterCount = cleanedMfgIds.length;
    totalMfgAfter += afterCount;
    
    console.log(`✅ ${driverName} [${category}]`);
    console.log(`   Mfg IDs: ${beforeCount} → ${afterCount}`);
    console.log(`   Prod IDs: ${productIds.length} → ${cleanedPids.length}\n`);
    
    cleaned++;
    
  } catch (err) {
    console.log(`❌ ${driverName}: ${err.message}\n`);
  }
});

console.log(`\n📊 RÉSULTAT:\n`);
console.log(`   Drivers nettoyés: ${cleaned}/${drivers.length}`);
console.log(`   Total Mfg IDs: ${totalMfgBefore} → ${totalMfgAfter}`);
console.log(`   Économie: ${totalMfgBefore - totalMfgAfter} IDs supprimés\n`);

console.log('🎯 PROCHAINES ÉTAPES:');
console.log('   1. node scripts/audit_sdk3_complete.js');
console.log('   2. homey app build');
console.log('   3. homey app validate --level publish\n');
