#!/usr/bin/env node
/**
 * 🔧 FIX HOMEYCOMPOSE STRUCTURE
 * 
 * PROBLÈME IDENTIFIÉ: Pas de .homeycompose/ directory!
 * C'est pourquoi les enrichissements ne sont pas appliqués.
 * 
 * Ce script:
 * 1. Crée .homeycompose/
 * 2. Copie drivers/ → .homeycompose/drivers/
 * 3. Crée .homeycompose/app.json
 * 4. Rebuild app.json
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = process.cwd();
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const HOMEYCOMPOSE_DIR = path.join(ROOT, '.homeycompose');
const HOMEYCOMPOSE_DRIVERS = path.join(HOMEYCOMPOSE_DIR, 'drivers');

console.log('🔧 FIX HOMEYCOMPOSE STRUCTURE\n');
console.log('═══════════════════════════════════════════════════════\n');

console.log('🔍 PROBLÈME IDENTIFIÉ:');
console.log('  .homeycompose/ directory manquant!');
console.log('  C\'est pourquoi les enrichissements ne sont pas appliqués.\n');

// Créer structure
console.log('📁 Création structure .homeycompose/...\n');

if (!fs.existsSync(HOMEYCOMPOSE_DIR)) {
  fs.mkdirSync(HOMEYCOMPOSE_DIR, { recursive: true });
  console.log('  ✅ Créé .homeycompose/');
}

if (!fs.existsSync(HOMEYCOMPOSE_DRIVERS)) {
  fs.mkdirSync(HOMEYCOMPOSE_DRIVERS, { recursive: true });
  console.log('  ✅ Créé .homeycompose/drivers/');
}

// Copier tous les drivers
console.log('\n📋 Copie des drivers...\n');

const drivers = fs.readdirSync(DRIVERS_DIR)
  .filter(name => {
    const fullPath = path.join(DRIVERS_DIR, name);
    return fs.statSync(fullPath).isDirectory() && !name.startsWith('.');
  });

console.log(`  Drivers trouvés: ${drivers.length}\n`);

let copied = 0;

for (const driver of drivers) {
  const sourceFile = path.join(DRIVERS_DIR, driver, 'driver.compose.json');
  
  if (!fs.existsSync(sourceFile)) {
    console.log(`  ⚠️  Skip ${driver}: pas de driver.compose.json`);
    continue;
  }
  
  const destDir = path.join(HOMEYCOMPOSE_DRIVERS, driver);
  
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  
  const destFile = path.join(destDir, 'driver.compose.json');
  
  // Copier
  const content = fs.readFileSync(sourceFile, 'utf8');
  fs.writeFileSync(destFile, content, 'utf8');
  
  copied++;
  
  if (copied % 20 === 0) {
    console.log(`  Copié ${copied}/${drivers.length}...`);
  }
}

console.log(`\n  ✅ ${copied} drivers copiés dans .homeycompose/drivers/\n`);

// Créer .homeycompose/app.json basique
console.log('📄 Création .homeycompose/app.json...\n');

const appJsonContent = {
  "id": "com.dlnraja.tuya.zigbee",
  "version": "4.5.6",
  "compatibility": ">=12.2.0",
  "sdk": 3,
  "name": {
    "en": "Universal Tuya Zigbee"
  },
  "description": {
    "en": "Community-maintained Universal Zigbee app with 186 unified hybrid drivers and 18,000+ manufacturer IDs. 100% local control, no cloud required. Intelligent auto-detection of power source and battery type. Advanced energy management with flow cards. SDK3 compliant.",
    "fr": "Application Zigbee universelle avec 186 drivers hybrides unifiés et 18,000+ manufacturer IDs. Contrôle 100% local, sans cloud. Détection automatique intelligente de la source d'alimentation et du type de batterie. Gestion énergétique avancée avec cartes de flux. Conforme SDK3."
  },
  "category": "appliances",
  "permissions": [],
  "images": {
    "small": "/assets/images/small.png",
    "large": "/assets/images/large.png",
    "xlarge": "/assets/images/xlarge.png"
  },
  "author": {
    "name": "Dylan Rajasekaram"
  },
  "brandColor": "#1E88E5"
};

const appJsonPath = path.join(HOMEYCOMPOSE_DIR, 'app.json');
fs.writeFileSync(appJsonPath, JSON.stringify(appJsonContent, null, 2), 'utf8');

console.log('  ✅ .homeycompose/app.json créé\n');

// Créer flow cards si elles existent
const flowDir = path.join(ROOT, 'flow');
if (fs.existsSync(flowDir)) {
  const homeycomposeFlowDir = path.join(HOMEYCOMPOSE_DIR, 'flow');
  
  if (!fs.existsSync(homeycomposeFlowDir)) {
    fs.mkdirSync(homeycomposeFlowDir, { recursive: true });
  }
  
  console.log('📋 Copie flow cards...\n');
  
  const flowFiles = ['actions.json', 'conditions.json', 'triggers.json'];
  
  for (const file of flowFiles) {
    const source = path.join(flowDir, file);
    const dest = path.join(homeycomposeFlowDir, file);
    
    if (fs.existsSync(source)) {
      fs.copyFileSync(source, dest);
      console.log(`  ✅ ${file} copié`);
    }
  }
  
  console.log('');
}

console.log('═══════════════════════════════════════════════════════');
console.log('✅ STRUCTURE .HOMEYCOMPOSE CRÉÉE!\n');

console.log('📊 Résumé:');
console.log(`  .homeycompose/app.json: ✅`);
console.log(`  .homeycompose/drivers/: ${copied} drivers`);
console.log(`  .homeycompose/flow/: ✅\n`);

console.log('🔨 Prochaine étape: BUILD\n');
console.log('  Commande: homey app build\n');

console.log('✅ TERMINÉ!\n');
