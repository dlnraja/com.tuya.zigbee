#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 CORRECTION DE LA STRUCTURE DES ENDPOINTS');
console.log('============================================');

// Configuration des chemins
const projectRoot = path.join(__dirname, '../..');
const driversPath = path.join(projectRoot, 'drivers');

// Analyser tous les drivers
const driverDirs = fs.readdirSync(driversPath).filter(dir => {
  return fs.statSync(path.join(driversPath, dir)).isDirectory();
});

console.log(`📊 Trouvé ${driverDirs.length} dossiers de drivers`);

let correctedCount = 0;

for (const driverDir of driverDirs) {
  const driverPath = path.join(driversPath, driverDir);
  const composePath = path.join(driverPath, 'driver.compose.json');
  
  if (fs.existsSync(composePath)) {
    try {
      const content = fs.readFileSync(composePath, 'utf8');
      const driverConfig = JSON.parse(content);
      
      if (driverConfig.zigbee && driverConfig.zigbee.endpoints) {
        console.log(`🔧 Vérification de ${driverDir}...`);
        
        let needsCorrection = false;
        
        // Vérifier la structure des endpoints
        for (const endpointId in driverConfig.zigbee.endpoints) {
          const endpoint = driverConfig.zigbee.endpoints[endpointId];
          
          // Vérifier que clusters.input et clusters.output sont des arrays
          if (endpoint.clusters) {
            if (!Array.isArray(endpoint.clusters.input)) {
              endpoint.clusters.input = ['genBasic', 'genPowerCfg', 'genOnOff'];
              needsCorrection = true;
            }
            if (!Array.isArray(endpoint.clusters.output)) {
              endpoint.clusters.output = ['genBasic', 'genPowerCfg', 'genOnOff'];
              needsCorrection = true;
            }
            if (!Array.isArray(endpoint.bindings)) {
              endpoint.bindings = ['genBasic', 'genPowerCfg', 'genOnOff'];
              needsCorrection = true;
            }
          }
        }
        
        if (needsCorrection) {
          // Sauvegarder le driver corrigé
          const updatedContent = JSON.stringify(driverConfig, null, 2);
          fs.writeFileSync(composePath, updatedContent, 'utf8');
          
          correctedCount++;
          console.log(`✅ ${driverDir} corrigé`);
        } else {
          console.log(`✅ ${driverDir} déjà correct`);
        }
      }
    } catch (error) {
      console.log(`⚠️  Erreur lors de l'analyse de ${driverDir}: ${error.message}`);
    }
  }
}

console.log(`\n🎯 ${correctedCount} drivers corrigés`);
console.log('🎉 Correction terminée !');
