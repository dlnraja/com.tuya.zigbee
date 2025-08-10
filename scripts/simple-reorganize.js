'use strict';

const fs = require('fs');
const path = require('path');

console.log('🚀 RÉORGANISATION SIMPLE DES DRIVERS...');

const driversDir = path.join(process.cwd(), 'drivers');
const zigbeeDir = path.join(driversDir, 'zigbee');
const tuyaDir = path.join(driversDir, 'tuya');

// Fonction pour déplacer un driver
function moveDriver(sourcePath, targetPath) {
  try {
    if (fs.existsSync(targetPath)) {
      console.log(`⚠️  Destination existe déjà: ${targetPath}`);
      return false;
    }
    
    // Créer le dossier de destination
    const targetDir = path.dirname(targetPath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    
    // Déplacer le dossier
    fs.renameSync(sourcePath, targetPath);
    console.log(`✅ Déplacé: ${path.basename(sourcePath)} → ${path.relative(driversDir, targetPath)}`);
    return true;
  } catch (error) {
    console.log(`❌ Erreur déplacement ${path.basename(sourcePath)}: ${error.message}`);
    return false;
  }
}

// Fonction pour déterminer la catégorie
function getCategory(driverName) {
  const name = driverName.toLowerCase();
  if (name.includes('light') || name.includes('bulb') || name.includes('lamp') || name.includes('led')) return 'light';
  if (name.includes('plug') || name.includes('outlet') || name.includes('socket')) return 'plug';
  if (name.includes('switch') || name.includes('button')) return 'switch';
  if (name.includes('sensor') || name.includes('motion') || name.includes('temp') || name.includes('humidity')) return 'sensor';
  if (name.includes('cover') || name.includes('curtain') || name.includes('blind')) return 'cover';
  if (name.includes('lock')) return 'lock';
  if (name.includes('meter') || name.includes('power') || name.includes('energy')) return 'meter-power';
  return 'other';
}

// Fonction pour déterminer le vendor
function getVendor(driverName) {
  const name = driverName.toLowerCase();
  if (name.includes('tuya') || name.includes('smart')) return 'tuya';
  if (name.includes('aqara')) return 'aqara';
  if (name.includes('ikea')) return 'ikea';
  if (name.includes('philips')) return 'philips';
  if (name.includes('sonoff')) return 'sonoff';
  if (name.includes('ledvance')) return 'ledvance';
  return 'generic';
}

// Fonction pour déterminer le protocole
function getProtocol(driverPath) {
  // Vérifier s'il y a des fichiers zigbee
  const zigbeeFiles = ['zigbee.js', 'zigbee-clusters.js'];
  const hasZigbee = zigbeeFiles.some(file => fs.existsSync(path.join(driverPath, file)));
  
  if (hasZigbee) return 'zigbee';
  return 'tuya';
}

// Traiter les drivers dans zigbee
console.log('\n📁 Traitement des drivers zigbee...');
let movedCount = 0;

function processDirectory(dirPath, protocol) {
  try {
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        // Vérifier si c'est un driver
        const hasDriverFile = ['driver.compose.json', 'driver.json'].some(file => 
          fs.existsSync(path.join(itemPath, file))
        );
        
        if (hasDriverFile) {
          // C'est un driver, le déplacer
          const category = getCategory(item);
          const vendor = getVendor(item);
          const targetPath = path.join(driversDir, protocol, vendor, category, item);
          
          if (moveDriver(itemPath, targetPath)) {
            movedCount++;
          }
        } else {
          // Continuer l'exploration
          processDirectory(itemPath, protocol);
        }
      }
    }
  } catch (error) {
    console.log(`⚠️  Erreur accès ${dirPath}: ${error.message}`);
  }
}

// Traiter les dossiers de premier niveau dans zigbee
const zigbeeTopLevel = fs.readdirSync(zigbeeDir).filter(item => {
  const itemPath = path.join(zigbeeDir, item);
  return fs.statSync(itemPath).isDirectory();
});

for (const item of zigbeeTopLevel) {
  const itemPath = path.join(zigbeeDir, item);
  processDirectory(itemPath, 'zigbee');
}

// Traiter les drivers dans tuya
console.log('\n📁 Traitement des drivers tuya...');
const tuyaTopLevel = fs.readdirSync(tuyaDir).filter(item => {
  const itemPath = path.join(tuyaDir, item);
  return fs.statSync(itemPath).isDirectory();
});

for (const item of tuyaTopLevel) {
  const itemPath = path.join(tuyaDir, item);
  processDirectory(itemPath, 'tuya');
}

console.log(`\n🎉 RÉORGANISATION TERMINÉE !`);
console.log(`📊 Drivers déplacés: ${movedCount}`);
console.log(`📁 Structure: drivers/{zigbee|tuya}/{vendor}/{category}/{driver}`);
