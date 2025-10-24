#!/usr/bin/env node

/**
 * FIX ALL WARNINGS v4.0.0
 * Corrige tous les warnings de validation
 */

const fs = require('fs');
const path = require('path');

console.log('\n⚠️ FIX ALL WARNINGS v4.0.0\n');

const rootDir = path.join(__dirname, '..');

// 1. Ajouter titleFormatted aux flow cards qui en manquent
const flowDir = path.join(rootDir, '.homeycompose', 'flow');

['triggers', 'actions', 'conditions'].forEach(type => {
  const filePath = path.join(flowDir, `${type}.json`);
  if (!fs.existsSync(filePath)) return;
  
  try {
    const flows = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    let modified = false;
    
    flows.forEach(flow => {
      if (!flow.titleFormatted && flow.title) {
        // Générer titleFormatted depuis title
        flow.titleFormatted = flow.title;
        modified = true;
        console.log(`✅ Added titleFormatted to ${type}/${flow.id}`);
      }
    });
    
    if (modified) {
      fs.writeFileSync(filePath, JSON.stringify(flows, null, 2));
    }
  } catch (err) {
    console.log(`❌ Error processing ${type}: ${err.message}`);
  }
});

// 2. Supprimer drivers avec images manquantes
const driversDir = path.join(rootDir, 'drivers');
const drivers = fs.readdirSync(driversDir).filter(d =>
  fs.statSync(path.join(driversDir, d)).isDirectory()
);

let removed = 0;
drivers.forEach(driverName => {
  const smallImg = path.join(driversDir, driverName, 'assets', 'images', 'small.png');
  
  if (!fs.existsSync(smallImg)) {
    console.log(`⚠️ ${driverName} - Missing images, should be removed or images added`);
    // Ne pas supprimer automatiquement, juste logger
  }
});

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║         FIX WARNINGS - TERMINÉ                                ║
╚═══════════════════════════════════════════════════════════════╝

✅ Flow cards titleFormatted ajoutés
⚠️ Drivers avec images manquantes identifiés

Pour corriger complètement:
1. Ajouter images aux drivers manquants
   OU
2. Supprimer drivers sans images
`);
