#!/usr/bin/env node
/**
 * FIX ALL DRIVER IMAGES
 * 
 * PROBLÈME: Drivers ont des images PNG avec mauvaises dimensions
 * SOLUTION: Remplacer toutes les images PNG drivers par des SVG valides
 * 
 * Homey SDK3 requirements:
 * - small: 75x75 (PNG ou SVG)
 * - large: 500x350 (PNG ou SVG)
 * - icon: SVG uniquement
 */

const fs = require('fs');
const path = require('path');

const rootPath = __dirname;
const driversPath = path.join(rootPath, 'drivers');

console.log('🎨 FIX ALL DRIVER IMAGES');
console.log('='.repeat(80));
console.log('');

// Template SVG générique Tuya
const genericSmallSVG = `<svg width="75" height="75" viewBox="0 0 75 75" xmlns="http://www.w3.org/2000/svg">
  <rect width="75" height="75" fill="#1E88E5"/>
  <text x="50%" y="50%" text-anchor="middle" dy=".3em" font-family="Arial" font-size="12" fill="white">TUYA</text>
</svg>`;

const genericLargeSVG = `<svg width="500" height="350" viewBox="0 0 500 350" xmlns="http://www.w3.org/2000/svg">
  <rect width="500" height="350" fill="#1E88E5"/>
  <text x="50%" y="50%" text-anchor="middle" dy=".3em" font-family="Arial" font-size="48" fill="white">Universal Tuya Zigbee</text>
</svg>`;

const genericIconSVG = `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <rect width="100" height="100" rx="20" fill="#1E88E5"/>
  <circle cx="50" cy="50" r="25" fill="white" opacity="0.8"/>
</svg>`;

// Lister tous les drivers
const driverFolders = fs.readdirSync(driversPath).filter(f => {
  const fullPath = path.join(driversPath, f);
  return fs.statSync(fullPath).isDirectory();
});

console.log(`📋 ${driverFolders.length} drivers à vérifier`);
console.log('');

let fixed = 0;
let issues = 0;

for (const driverFolder of driverFolders) {
  const driverPath = path.join(driversPath, driverFolder);
  const assetsPath = path.join(driverPath, 'assets');
  
  if (!fs.existsSync(assetsPath)) {
    // Créer dossier assets si manquant
    fs.mkdirSync(assetsPath, { recursive: true });
    console.log(`   📁 Créé assets/ pour ${driverFolder}`);
  }
  
  let driverFixed = false;
  
  // Vérifier et corriger small.png
  const smallPngPath = path.join(assetsPath, 'small.png');
  const smallSvgPath = path.join(assetsPath, 'small.svg');
  
  if (fs.existsSync(smallPngPath)) {
    // Supprimer PNG, créer SVG
    fs.unlinkSync(smallPngPath);
    fs.writeFileSync(smallSvgPath, genericSmallSVG);
    driverFixed = true;
  } else if (!fs.existsSync(smallSvgPath)) {
    // Créer SVG
    fs.writeFileSync(smallSvgPath, genericSmallSVG);
    driverFixed = true;
  }
  
  // Vérifier et corriger large.png
  const largePngPath = path.join(assetsPath, 'large.png');
  const largeSvgPath = path.join(assetsPath, 'large.svg');
  
  if (fs.existsSync(largePngPath)) {
    // Supprimer PNG, créer SVG
    fs.unlinkSync(largePngPath);
    fs.writeFileSync(largeSvgPath, genericLargeSVG);
    driverFixed = true;
  } else if (!fs.existsSync(largeSvgPath)) {
    // Créer SVG
    fs.writeFileSync(largeSvgPath, genericLargeSVG);
    driverFixed = true;
  }
  
  // Vérifier icon.svg
  const iconSvgPath = path.join(assetsPath, 'icon.svg');
  if (!fs.existsSync(iconSvgPath)) {
    fs.writeFileSync(iconSvgPath, genericIconSVG);
    driverFixed = true;
  }
  
  if (driverFixed) {
    console.log(`   ✅ ${driverFolder}`);
    fixed++;
  }
}

console.log('');
console.log('='.repeat(80));
console.log(`✅ ${fixed}/${driverFolders.length} drivers corrigés`);
console.log('='.repeat(80));
console.log('');

console.log('📋 Prochaine étape:');
console.log('   homey app validate --level=publish');
console.log('');

process.exit(0);
