#!/usr/bin/env node
/**
 * CLEAN PRODUCTIDS INTELLIGENT
 * 
 * Nettoie les productIds de CHAQUE driver pour ne garder
 * QUE ceux qui correspondent réellement au type du driver
 * 
 * Basé sur l'analyse de cohérence qui a identifié 113 drivers
 * avec des productIds incorrects
 */

const fs = require('fs');
const path = require('path');

const rootPath = __dirname;
const appJsonPath = path.join(rootPath, 'app.json');

console.log('🧹 CLEAN PRODUCTIDS INTELLIGENT');
console.log('='.repeat(80));
console.log('');

// Charger app.json
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

// Définir les productIds connus et leur type RÉEL
const KNOWN_PRODUCTIDS = {
  // SWITCHES
  'TS0001': { type: 'switch', subtype: '1gang', valid: true },
  'TS0002': { type: 'switch', subtype: '2gang', valid: true },
  'TS0003': { type: 'switch', subtype: '3gang', valid: true },
  'TS0004': { type: 'switch', subtype: '4gang', valid: true },
  'TS0011': { type: 'switch', subtype: '1gang_enhanced', valid: true },
  'TS0012': { type: 'switch', subtype: '2gang_enhanced', valid: true },
  'TS0013': { type: 'switch', subtype: '3gang_enhanced', valid: true },
  'TS0014': { type: 'switch', subtype: '4gang_enhanced', valid: true },
  
  // SENSORS - TEMPERATURE/HUMIDITY
  'TS0201': { type: 'sensor', subtype: 'temperature_humidity', valid: true },
  
  // SENSORS - MOTION
  'TS0202': { type: 'sensor', subtype: 'motion', valid: true },
  
  // SENSORS - DOOR/WINDOW
  'TS0203': { type: 'sensor', subtype: 'contact', valid: true },
  
  // SENSORS - WATER LEAK
  'TS0207': { type: 'sensor', subtype: 'water_leak', valid: true },
  
  // PLUGS
  'TS011F': { type: 'plug', subtype: 'energy_monitoring', valid: true },
  'TS0121': { type: 'plug', subtype: 'energy_monitoring', valid: true },
  
  // DIMMERS
  'TS0601': { type: 'universal', subtype: 'dp_protocol', note: 'Can be many types', valid: true },
  
  // CURTAINS
  'TS130F': { type: 'curtain', subtype: 'motor', valid: true },
  
  // REMOTES/BUTTONS
  'TS0041': { type: 'remote', subtype: '1button', valid: true },
  'TS0042': { type: 'remote', subtype: '2button', valid: true },
  'TS0043': { type: 'remote', subtype: '3button', valid: true },
  'TS0044': { type: 'remote', subtype: '4button', valid: true }
};

// Règles de correspondance driver → productIds autorisés
const DRIVER_PRODUCTID_RULES = {
  // Si driver contient ces mots, il PEUT avoir ces types de productIds
  'switch': ['switch', 'universal'],
  'plug': ['plug', 'universal'],
  'socket': ['plug', 'universal'],
  'outlet': ['plug', 'universal'],
  'dimmer': ['switch', 'universal'],
  'bulb': ['universal'],
  'light': ['switch', 'universal'],
  'sensor': ['sensor', 'universal'],
  'temperature': ['sensor', 'universal'],
  'humidity': ['sensor', 'universal'],
  'motion': ['sensor', 'universal'],
  'contact': ['sensor', 'universal'],
  'door': ['sensor', 'switch', 'universal'],
  'window': ['sensor', 'universal'],
  'leak': ['sensor', 'universal'],
  'water': ['sensor', 'universal'],
  'smoke': ['sensor', 'universal'],
  'curtain': ['curtain', 'universal'],
  'blind': ['curtain', 'universal'],
  'shutter': ['curtain', 'universal'],
  'remote': ['remote', 'universal'],
  'button': ['remote', 'universal'],
  'scene': ['remote', 'switch', 'universal'],
  'thermostat': ['sensor', 'universal'],
  'climate': ['sensor', 'universal'],
  'valve': ['switch', 'universal'],
  'lock': ['sensor', 'universal'],
  'fan': ['switch', 'universal']
};

console.log('📋 Règles de nettoyage:');
console.log('   - Garder productIds qui correspondent au type du driver');
console.log('   - Supprimer productIds incompatibles');
console.log('   - Conserver TS0601 (universal) pour tous');
console.log('');

let stats = {
  driversProcessed: 0,
  productIdsRemoved: 0,
  productIdsKept: 0,
  driversModified: 0
};

// Fonction pour déterminer si productId est compatible avec driver
function isProductIdCompatible(driverId, productId) {
  const driverName = driverId.toLowerCase();
  const productInfo = KNOWN_PRODUCTIDS[productId];
  
  if (!productInfo) {
    // ProductId inconnu - garder par sécurité
    return true;
  }
  
  // TS0601 est universal - compatible avec tout
  if (productInfo.type === 'universal') {
    return true;
  }
  
  // Chercher dans les règles
  for (const [keyword, allowedTypes] of Object.entries(DRIVER_PRODUCTID_RULES)) {
    if (driverName.includes(keyword)) {
      return allowedTypes.includes(productInfo.type);
    }
  }
  
  // Si aucune règle ne match, garder par sécurité
  return true;
}

console.log('🔍 Nettoyage driver par driver...');
console.log('');

appJson.drivers.forEach(driver => {
  const driverId = driver.id;
  
  if (!driver.zigbee?.productId || driver.zigbee.productId.length === 0) {
    return;
  }
  
  const originalProductIds = [...driver.zigbee.productId];
  const cleanedProductIds = [];
  const removedProductIds = [];
  
  originalProductIds.forEach(pid => {
    if (isProductIdCompatible(driverId, pid)) {
      cleanedProductIds.push(pid);
      stats.productIdsKept++;
    } else {
      removedProductIds.push(pid);
      stats.productIdsRemoved++;
    }
  });
  
  // Mettre à jour si modifié
  if (removedProductIds.length > 0) {
    driver.zigbee.productId = cleanedProductIds;
    stats.driversModified++;
    
    console.log(`   ✅ ${driverId}`);
    console.log(`      Gardés: ${cleanedProductIds.join(', ')}`);
    console.log(`      Supprimés: ${removedProductIds.join(', ')}`);
  }
  
  stats.driversProcessed++;
});

console.log('');
console.log('='.repeat(80));
console.log('✅ NETTOYAGE TERMINÉ');
console.log('='.repeat(80));
console.log('');

console.log('📊 STATISTIQUES:');
console.log(`   Drivers traités: ${stats.driversProcessed}`);
console.log(`   Drivers modifiés: ${stats.driversModified}`);
console.log(`   ProductIds gardés: ${stats.productIdsKept}`);
console.log(`   ProductIds supprimés: ${stats.productIdsRemoved}`);
console.log('');

// Sauvegarder
fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));

console.log('💾 app.json sauvegardé');
console.log('');

console.log('📋 PROCHAINES ÉTAPES:');
console.log('   1. homey app build');
console.log('   2. homey app validate --level=publish');
console.log('   3. Vérifier que validation passe');
console.log('   4. Commit + Push + Publish');
console.log('');

// Créer rapport détaillé
const reportPath = path.join(rootPath, 'mega_analysis', 'productids_cleaning_report.json');
fs.writeFileSync(reportPath, JSON.stringify({
  timestamp: new Date().toISOString(),
  stats: stats,
  knownProductIds: KNOWN_PRODUCTIDS,
  rules: DRIVER_PRODUCTID_RULES
}, null, 2));

console.log(`📄 Rapport détaillé: ${reportPath}`);
console.log('');

process.exit(0);
