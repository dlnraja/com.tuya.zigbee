#!/usr/bin/env node
/**
 * FIX APP JSON IMAGES
 * 
 * Remplace toutes les références PNG → SVG dans app.json
 * Car Homey build copie les fichiers selon les chemins dans app.json
 */

const fs = require('fs');
const path = require('path');

const rootPath = __dirname;
const appJsonPath = path.join(rootPath, 'app.json');

console.log('📝 FIX APP JSON IMAGES - Remplacer PNG → SVG');
console.log('='.repeat(80));
console.log('');

// Charger app.json
let appJsonContent = fs.readFileSync(appJsonPath, 'utf8');

console.log('🔍 Remplacement des références images...');
console.log('');

let replacements = 0;

// Remplacer toutes les références .png par .svg
const patterns = [
  { from: '"/assets/small.png"', to: '"/assets/small.svg"' },
  { from: '"/assets/large.png"', to: '"/assets/large.svg"' },
  { from: '"/assets/xlarge.png"', to: '"/assets/xlarge.svg"' },
  { from: '"./assets/small.png"', to: '"./assets/small.svg"' },
  { from: '"./assets/large.png"', to: '"./assets/large.svg"' },
  { from: '"/drivers/', to: '"./drivers/' }, // Normaliser les chemins drivers
];

for (const pattern of patterns) {
  const before = appJsonContent;
  appJsonContent = appJsonContent.split(pattern.from).join(pattern.to);
  const count = before.split(pattern.from).length - 1;
  
  if (count > 0) {
    console.log(`   ✅ ${pattern.from} → ${pattern.to} (${count}x)`);
    replacements += count;
  }
}

// Sauvegarder
fs.writeFileSync(appJsonPath, appJsonContent);

console.log('');
console.log('='.repeat(80));
console.log(`✅ ${replacements} remplacements effectués`);
console.log('='.repeat(80));
console.log('');

console.log('📋 Prochaines étapes:');
console.log('   1. homey app build');
console.log('   2. homey app validate --level=publish');
console.log('');

process.exit(0);
