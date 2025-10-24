#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

console.log('🔍 Recherche des chemins d\'images incorrects...\n');

const driversDir = path.join(__dirname, '..', 'drivers');
const drivers = fs.readdirSync(driversDir);

const wrongPaths = [];

drivers.forEach(driverName => {
  const composePath = path.join(driversDir, driverName, 'driver.compose.json');
  
  if (!fs.existsSync(composePath)) return;
  
  try {
    const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    
    // Vérifier les images
    if (compose.images && compose.images.small) {
      const imagePath = compose.images.small;
      const expectedPath = `drivers/${driverName}/`;
      
      if (!imagePath.includes(driverName)) {
        wrongPaths.push({
          driver: driverName,
          currentPath: imagePath,
          expectedPath: `drivers/${driverName}/assets/images/small.png`
        });
      }
    }
    
    // Vérifier learnmode
    if (compose.zigbee && compose.zigbee.learnmode && compose.zigbee.learnmode.image) {
      const learnPath = compose.zigbee.learnmode.image;
      const expectedPath = `/drivers/${driverName}/`;
      
      if (!learnPath.includes(driverName)) {
        wrongPaths.push({
          driver: driverName,
          currentPath: learnPath,
          type: 'learnmode',
          expectedPath: `/drivers/${driverName}/assets/learnmode.svg`
        });
      }
    }
    
    // Vérifier ID
    if (compose.id && compose.id !== driverName) {
      wrongPaths.push({
        driver: driverName,
        currentId: compose.id,
        type: 'id',
        expectedId: driverName
      });
    }
    
  } catch (err) {
    console.error(`Erreur avec ${driverName}:`, err.message);
  }
});

if (wrongPaths.length === 0) {
  console.log('✅ Tous les chemins sont corrects!');
} else {
  console.log(`❌ ${wrongPaths.length} problèmes trouvés:\n`);
  wrongPaths.forEach(item => {
    console.log(`📁 ${item.driver}:`);
    if (item.type === 'id') {
      console.log(`   ID actuel: ${item.currentId}`);
      console.log(`   ID attendu: ${item.expectedId}`);
    } else if (item.type === 'learnmode') {
      console.log(`   Learnmode actuel: ${item.currentPath}`);
      console.log(`   Learnmode attendu: ${item.expectedPath}`);
    } else {
      console.log(`   Chemin actuel: ${item.currentPath}`);
      console.log(`   Chemin attendu: ${item.expectedPath}`);
    }
    console.log('');
  });
}
