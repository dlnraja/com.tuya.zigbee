const fs = require('fs');
const path = require('path');

console.log('═'.repeat(80));
console.log('🔧 FIX ALL COMMENTED CODE');
console.log('═'.repeat(80));
console.log('');

const driversDir = path.join(__dirname, 'drivers');
let filesFixed = 0;

// Fonction pour fixer un fichier
function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  
  // 1. Ajouter import CLUSTER
  if (!content.includes("require('zigbee-clusters')")) {
    content = content.replace(
      /('use strict';\s*\n\s*\nconst )/,
      "$1{ CLUSTER } = require('zigbee-clusters');\nconst "
    );
  }
  
  // 2. Dé-commenter les registerCapability
  content = content.replace(/\/\/ (this\.registerCapability\(.+, )6,/g, '$1CLUSTER.ON_OFF,');
  content = content.replace(/\/\/ (this\.registerCapability\(.+, )1,/g, '$1CLUSTER.POWER_CONFIGURATION,');
  content = content.replace(/\/\/ (this\.registerCapability\(.+, )2820,/g, '$1CLUSTER.ELECTRICAL_MEASUREMENT,');
  content = content.replace(/\/\/ (this\.registerCapability\(.+, )1794,/g, '$1CLUSTER.METERING,');
  
  // 3. Dé-commenter les lignes de config
  content = content.replace(/\/\/ (  endpoint:)/g, '$1');
  content = content.replace(/\/\/ (\s+\})/g, '$1');
  
  // 4. Supprimer REFACTOR comments
  content = content.replace(/\/\* REFACTOR:.+?\*\/\s*/gs, '');
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ Fixed:', path.relative(driversDir, filePath));
    return true;
  }
  return false;
}

// Scanner tous les device.js
function scanDir(dir) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      scanDir(fullPath);
    } else if (item === 'device.js') {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('// this.registerCapability')) {
        if (fixFile(fullPath)) {
          filesFixed++;
        }
      }
    }
  }
}

console.log('🔍 Scanning drivers...\n');
scanDir(driversDir);

console.log('');
console.log('═'.repeat(80));
console.log(`📊 Fixed ${filesFixed} files`);
console.log('═'.repeat(80));
console.log('');
console.log('Next: homey app validate --level publish');
console.log('');
