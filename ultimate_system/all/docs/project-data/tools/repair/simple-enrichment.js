#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 SIMPLE DRIVER ENRICHMENT');
console.log('============================');

// Configuration des chemins
const projectRoot = path.join(__dirname, '../..');
const driversPath = path.join(projectRoot, 'drivers');

console.log('📁 Répertoire projet:', projectRoot);
console.log('📁 Répertoire drivers:', driversPath);

// Configuration Zigbee de base
const zigbeeConfigs = {
  'TS011F': { manufacturerName: '_TZ3000_b28wrpvx', productId: 'TS011F' },
  'TS011G': { manufacturerName: '_TZ3000_qeuvnohg', productId: 'TS011G' },
  'TS011H': { manufacturerName: '_TZ3000_ltiqubue', productId: 'TS011H' },
  'TS011I': { manufacturerName: '_TZ3000_vd43bbfq', productId: 'TS011I' },
  'TS011J': { manufacturerName: '_TZ3000_qa8s8vca', productId: 'TS011J' },
  'TS0121': { manufacturerName: '_TZ3000_4ux0ondb', productId: 'TS0121' },
  'TS0122': { manufacturerName: '_TZ3000_y4ona9me', productId: 'TS0122' },
  'TS0123': { manufacturerName: '_TZ3000_qqdbccb3', productId: 'TS0123' },
  'TS0124': { manufacturerName: '_TZ3000_femsaaua', productId: 'TS0124' },
  'TS0125': { manufacturerName: '_TZ3000_1h2x4akh', productId: 'TS0125' }
};

// Analyser les drivers existants
console.log('\n🔍 Analyse des drivers existants...');

const driverDirs = fs.readdirSync(driversPath).filter(dir => {
  return fs.statSync(path.join(driversPath, dir)).isDirectory();
});

console.log(`📊 Trouvé ${driverDirs.length} dossiers de drivers`);

// Enrichir chaque driver
let enrichedCount = 0;

for (const driverDir of driverDirs) {
  const driverPath = path.join(driversPath, driverDir);
  const composePath = path.join(driverPath, 'driver.compose.json');
  
  if (fs.existsSync(composePath)) {
    try {
      const content = fs.readFileSync(composePath, 'utf8');
      const driverConfig = JSON.parse(content);
      
      // Vérifier si le driver a besoin d'enrichissement
      if (!driverConfig.zigbee || !driverConfig.zigbee.manufacturerName) {
        console.log(`🔧 Enrichissement de ${driverDir}...`);
        
        // Extraire le productId du nom du driver
        const productId = extractProductId(driverDir);
        
        if (productId && zigbeeConfigs[productId]) {
          const config = zigbeeConfigs[productId];
          
          // Enrichir la configuration zigbee
          driverConfig.zigbee = {
            manufacturerName: config.manufacturerName,
            productId: config.productId,
            endpoints: {
              "1": {
                clusters: {
                  input: ['genBasic', 'genPowerCfg', 'genOnOff'],
                  output: ['genBasic', 'genPowerCfg', 'genOnOff']
                },
                bindings: ['genBasic', 'genPowerCfg', 'genOnOff']
              }
            }
          };
          
          // Sauvegarder le driver enrichi
          const updatedContent = JSON.stringify(driverConfig, null, 2);
          fs.writeFileSync(composePath, updatedContent, 'utf8');
          
          enrichedCount++;
          console.log(`✅ ${driverDir} enrichi avec ${config.manufacturerName}/${config.productId}`);
        }
      }
    } catch (error) {
      console.log(`⚠️  Erreur lors de l'analyse de ${driverDir}: ${error.message}`);
    }
  }
}

console.log(`\n🎯 ${enrichedCount} drivers enrichis`);

// Fonction pour extraire le productId
function extractProductId(driverName) {
  const patterns = [
    /TS\d{3}[A-Z]?/, // TS011F, TS0501B, etc.
    /TS\d{4}/,        // TS0001, TS0002, etc.
    /TS\d{3}_\w+/     // TS0601_fan, TS0601_lock, etc.
  ];
  
  for (const pattern of patterns) {
    const match = driverName.match(pattern);
    if (match) return match[0];
  }
  
  return null;
}

console.log('\n🎉 Enrichissement terminé !');
