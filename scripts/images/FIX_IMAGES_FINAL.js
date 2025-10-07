#!/usr/bin/env node
/**
 * FIX IMAGES FINAL
 * 
 * Corrige définitivement le problème d'images:
 * - Homey EXIGE des PNG pour small/large
 * - SVG uniquement pour xlarge
 * - Créer PNG valides depuis assets/images/ ou générer
 */

const fs = require('fs');
const path = require('path');

const rootPath = __dirname;
const assetsPath = path.join(rootPath, 'assets');
const assetsImagesPath = path.join(assetsPath, 'images');
const appJsonPath = path.join(rootPath, 'app.json');

console.log('🎨 FIX IMAGES FINAL');
console.log('='.repeat(80));
console.log('');

// Charger app.json
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

console.log('📋 Images requises par Homey:');
console.log('   small: PNG 250x175 pixels');
console.log('   large: PNG 500x350 pixels');
console.log('   xlarge: SVG ou PNG');
console.log('');

// Vérifier ce qu'on a
console.log('📊 Images disponibles:');
console.log('');

const availableFiles = fs.readdirSync(assetsPath);
console.log('Dans assets/:');
availableFiles.forEach(f => {
  const stats = fs.statSync(path.join(assetsPath, f));
  if (stats.isFile()) {
    console.log(`   ${f} (${stats.size} bytes)`);
  }
});

console.log('');

if (fs.existsSync(assetsImagesPath)) {
  const imageFiles = fs.readdirSync(assetsImagesPath);
  console.log('Dans assets/images/:');
  imageFiles.forEach(f => {
    const stats = fs.statSync(path.join(assetsImagesPath, f));
    console.log(`   ${f} (${stats.size} bytes)`);
  });
}

console.log('');

// SOLUTION: Copier les PNG d'assets/images/ vers assets/
console.log('🔧 Solution: Copier PNG depuis assets/images/');
console.log('');

const imagesToCopy = [
  { name: 'small.png', required: true },
  { name: 'large.png', required: true },
  { name: 'xlarge.png', required: false } // SVG peut être utilisé
];

let copied = 0;

for (const img of imagesToCopy) {
  const srcPath = path.join(assetsImagesPath, img.name);
  const dstPath = path.join(assetsPath, img.name);
  
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, dstPath);
    const stats = fs.statSync(dstPath);
    console.log(`   ✅ Copié ${img.name} (${stats.size} bytes)`);
    copied++;
  } else if (img.required) {
    console.log(`   ❌ ${img.name} MANQUANT et REQUIS !`);
  } else {
    console.log(`   ⚠️  ${img.name} manquant (optionnel)`);
  }
}

console.log('');

// Mettre à jour app.json pour utiliser PNG
console.log('📝 Mise à jour app.json...');

appJson.images = {
  small: '/assets/small.png',
  large: '/assets/large.png',
  xlarge: '/assets/xlarge.svg' // Garder SVG si disponible
};

// Vérifier si xlarge.png existe
if (fs.existsSync(path.join(assetsPath, 'xlarge.png'))) {
  appJson.images.xlarge = '/assets/xlarge.png';
}

fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));
console.log('   ✅ app.json mis à jour');
console.log('');

// Vérifier les tailles
console.log('🔍 Vérification tailles finales:');
console.log('');

for (const [key, value] of Object.entries(appJson.images)) {
  const filePath = path.join(rootPath, value.replace(/^\//, ''));
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    console.log(`   ✅ ${key}: ${value} (${stats.size} bytes)`);
  } else {
    console.log(`   ❌ ${key}: ${value} MANQUANT`);
  }
}

console.log('');
console.log('='.repeat(80));
console.log(`✅ ${copied} images copiées`);
console.log('='.repeat(80));
console.log('');

console.log('📋 Prochaine étape:');
console.log('   homey app validate --level=publish');
console.log('');

process.exit(0);
