#!/usr/bin/env node
'use strict';

/**
 * CHECK ICONS - Validation automatique
 * 
 * Vérifie tous les drivers pour:
 * - Présence assets/ folder
 * - icon.svg présent et valide
 * - images/small.png (75x75)
 * - images/large.png (500x500)
 * - images/xlarge.png (1000x1000)
 * 
 * Résout issue forum: "Carré noir" icons
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '..', 'drivers');
const REQUIRED_SIZES = ['small', 'large', 'xlarge'];

console.log('🔍 CHECKING DRIVER ICONS\n');
console.log('='.repeat(70));

let totalDrivers = 0;
let issues = [];
let perfect = 0;

// Parcourir tous les drivers
const drivers = fs.readdirSync(DRIVERS_DIR);

for (const driver of drivers) {
  const driverPath = path.join(DRIVERS_DIR, driver);
  
  // Vérifier que c'est un dossier
  if (!fs.statSync(driverPath).isDirectory()) continue;
  
  totalDrivers++;
  let driverIssues = [];
  
  // Vérifier assets/
  const assetsPath = path.join(driverPath, 'assets');
  if (!fs.existsSync(assetsPath)) {
    issues.push(`❌ ${driver}: No assets/ folder`);
    continue;
  }
  
  // Vérifier icon.svg
  const svgPath = path.join(assetsPath, 'icon.svg');
  if (!fs.existsSync(svgPath)) {
    driverIssues.push('Missing icon.svg');
  } else {
    // Vérifier contenu SVG
    const svgContent = fs.readFileSync(svgPath, 'utf8');
    
    if (svgContent.includes('fill="none"') && !svgContent.includes('stroke=')) {
      driverIssues.push('SVG may be invisible (fill=none without stroke)');
    }
    
    if (!svgContent.includes('<svg')) {
      driverIssues.push('Invalid SVG format');
    }
  }
  
  // Vérifier images/
  const imagesPath = path.join(assetsPath, 'images');
  if (!fs.existsSync(imagesPath)) {
    driverIssues.push('No images/ folder');
  } else {
    // Vérifier chaque taille
    for (const size of REQUIRED_SIZES) {
      const pngPath = path.join(imagesPath, `${size}.png`);
      if (!fs.existsSync(pngPath)) {
        driverIssues.push(`Missing ${size}.png`);
      } else {
        // Vérifier que c'est bien un PNG
        const buffer = fs.readFileSync(pngPath);
        if (!buffer.toString('hex', 0, 4).startsWith('89504e47')) {
          driverIssues.push(`${size}.png is not a valid PNG`);
        }
      }
    }
  }
  
  // Compiler issues du driver
  if (driverIssues.length > 0) {
    issues.push(`⚠️  ${driver}: ${driverIssues.join(', ')}`);
  } else {
    perfect++;
  }
}

// Afficher résultats
console.log(`\n✅ Checked ${totalDrivers} drivers`);
console.log(`✅ Perfect: ${perfect} drivers (${Math.round(perfect/totalDrivers*100)}%)`);
console.log(`${issues.length > 0 ? '⚠️' : '✅'} Issues: ${issues.length}\n`);

if (issues.length > 0) {
  console.log('ISSUES FOUND:\n');
  issues.forEach(issue => console.log(issue));
  console.log('\n' + '='.repeat(70));
  console.log('\n📝 ACTIONS TO FIX:\n');
  console.log('1. Add missing assets/ folders');
  console.log('2. Create icon.svg for each driver (or copy from similar)');
  console.log('3. Generate PNG images (small, large, xlarge)');
  console.log('4. Ensure SVG has stroke or fill color (not fill="none")');
  console.log('\n💡 TIP: Use a template icon and modify per driver type\n');
  process.exit(1);
} else {
  console.log('✅ All icons OK! No issues found.\n');
  console.log('='.repeat(70));
  process.exit(0);
}
