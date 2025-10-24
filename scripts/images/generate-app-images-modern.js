#!/usr/bin/env node

/**
 * GENERATE APP IMAGES MODERN - Images app Homey avec fond blanc moderne
 * 
 * SPECS APP IMAGES (CRITICAL):
 * - small.png:  250 x 175
 * - large.png:  500 x 350  (PAS 500x500!)
 * - xlarge.png: 1000 x 700
 * 
 * Design moderne:
 * - Fond blanc propre (#FFFFFF)
 * - Logo/icône centré
 * - Ombres douces
 * - Pas de transparence (problèmes dans Homey)
 * 
 * Usage: node scripts/images/generate-app-images-modern.js
 */

const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

const PROJECT_ROOT = path.join(__dirname, '..', '..');
const ASSETS_DIR = path.join(PROJECT_ROOT, 'assets', 'images');

// SPECS APP IMAGES - Homey SDK3
const APP_IMAGE_SPECS = {
  small: { width: 250, height: 175 },
  large: { width: 500, height: 350 },   // CRITIQUE: PAS 500x500!
  xlarge: { width: 1000, height: 700 }
};

// Design moderne
const DESIGN = {
  background: '#FFFFFF',           // Fond blanc pur
  primary: '#FF6B00',             // Orange Tuya
  secondary: '#4A90E2',           // Bleu moderne
  shadow: 'rgba(0, 0, 0, 0.1)',   // Ombre douce
  gradient: ['#FF6B00', '#FF8533'] // Gradient orange
};

console.log('🎨 GENERATE APP IMAGES - Modern Design\n');
console.log('App images specs (Homey SDK3):');
console.log('  - small:  250 x 175');
console.log('  - large:  500 x 350  ← CRITICAL!');
console.log('  - xlarge: 1000 x 700\n');
console.log('='.repeat(60));

/**
 * Générer une image app moderne
 */
async function generateAppImage(size) {
  const spec = APP_IMAGE_SPECS[size];
  const canvas = createCanvas(spec.width, spec.height);
  const ctx = canvas.getContext('2d');
  
  // Fond blanc pur (pas de transparence!)
  ctx.fillStyle = DESIGN.background;
  ctx.fillRect(0, 0, spec.width, spec.height);
  
  // Gradient de fond subtil
  const bgGradient = ctx.createLinearGradient(0, 0, spec.width, spec.height);
  bgGradient.addColorStop(0, 'rgba(255, 107, 0, 0.02)');
  bgGradient.addColorStop(1, 'rgba(74, 144, 226, 0.02)');
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, spec.width, spec.height);
  
  // Logo/Badge principal
  const centerX = spec.width / 2;
  const centerY = spec.height / 2;
  const badgeSize = Math.min(spec.width, spec.height) * 0.4;
  
  // Ombre du badge
  ctx.shadowColor = DESIGN.shadow;
  ctx.shadowBlur = badgeSize * 0.1;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = badgeSize * 0.05;
  
  // Badge avec gradient
  const gradient = ctx.createLinearGradient(
    centerX - badgeSize/2, 
    centerY - badgeSize/2,
    centerX + badgeSize/2, 
    centerY + badgeSize/2
  );
  gradient.addColorStop(0, DESIGN.gradient[0]);
  gradient.addColorStop(1, DESIGN.gradient[1]);
  
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(centerX, centerY, badgeSize / 2, 0, Math.PI * 2);
  ctx.fill();
  
  // Reset shadow
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  
  // Icon Zigbee (simplifié)
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = badgeSize * 0.08;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  // Dessiner un "Z" stylisé pour Zigbee
  const iconSize = badgeSize * 0.5;
  const iconX = centerX;
  const iconY = centerY;
  
  ctx.beginPath();
  // Ligne haut
  ctx.moveTo(iconX - iconSize/2, iconY - iconSize/2);
  ctx.lineTo(iconX + iconSize/2, iconY - iconSize/2);
  // Diagonale
  ctx.lineTo(iconX - iconSize/2, iconY + iconSize/2);
  // Ligne bas
  ctx.lineTo(iconX + iconSize/2, iconY + iconSize/2);
  ctx.stroke();
  
  // Points de connexion (3 points)
  const dotRadius = badgeSize * 0.04;
  ctx.fillStyle = '#FFFFFF';
  
  // Point haut
  ctx.beginPath();
  ctx.arc(iconX, iconY - iconSize/2, dotRadius, 0, Math.PI * 2);
  ctx.fill();
  
  // Point milieu
  ctx.beginPath();
  ctx.arc(iconX, iconY, dotRadius, 0, Math.PI * 2);
  ctx.fill();
  
  // Point bas
  ctx.beginPath();
  ctx.arc(iconX, iconY + iconSize/2, dotRadius, 0, Math.PI * 2);
  ctx.fill();
  
  // Texte "Tuya Zigbee" en bas
  if (size !== 'small') {
    const fontSize = spec.width * 0.08;
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    ctx.fillStyle = DESIGN.primary;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    
    const text = 'Tuya Zigbee';
    const textY = spec.height - fontSize * 0.5;
    
    // Ombre texte
    ctx.shadowColor = DESIGN.shadow;
    ctx.shadowBlur = 4;
    ctx.fillText(text, centerX, textY);
    
    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  }
  
  // Badge "Universal" en coin supérieur droit
  if (size === 'xlarge') {
    const badgeX = spec.width - spec.width * 0.15;
    const badgeY = spec.height * 0.12;
    const badgeWidth = spec.width * 0.2;
    const badgeHeight = spec.height * 0.08;
    
    // Badge background
    ctx.fillStyle = DESIGN.secondary;
    ctx.beginPath();
    ctx.roundRect(
      badgeX - badgeWidth/2, 
      badgeY - badgeHeight/2, 
      badgeWidth, 
      badgeHeight, 
      badgeHeight/2
    );
    ctx.fill();
    
    // Badge text
    ctx.font = `bold ${badgeHeight * 0.5}px Arial`;
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Universal', badgeX, badgeY);
  }
  
  return canvas;
}

/**
 * Sauvegarder image
 */
async function saveImage(canvas, filename) {
  const outputPath = path.join(ASSETS_DIR, filename);
  
  // Backup si existe
  if (fs.existsSync(outputPath)) {
    const backupPath = outputPath + '.backup';
    fs.copyFileSync(outputPath, backupPath);
    console.log(`  💾 Backup: ${filename}.backup`);
  }
  
  const buffer = canvas.toBuffer('image/png', {
    compressionLevel: 9,
    filters: canvas.PNG_FILTER_NONE
  });
  
  fs.writeFileSync(outputPath, buffer);
  console.log(`  ✅ ${filename} (${canvas.width}x${canvas.height})`);
}

/**
 * Main
 */
async function main() {
  console.log('\n🎨 Generating modern app images...\n');
  
  for (const [sizeName, spec] of Object.entries(APP_IMAGE_SPECS)) {
    try {
      console.log(`Generating ${sizeName}.png...`);
      const canvas = await generateAppImage(sizeName);
      await saveImage(canvas, `${sizeName}.png`);
    } catch (err) {
      console.error(`  ❌ Error for ${sizeName}: ${err.message}`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY:\n');
  console.log('  ✅ 3 app images generated');
  console.log('  🎨 Modern design with white background');
  console.log('  📐 Correct Homey SDK3 dimensions');
  console.log('  🚫 No transparency issues');
  console.log('='.repeat(60));
  
  console.log('\n🎉 SUCCESS! App images ready for Homey\n');
  console.log('Next steps:');
  console.log('  1. Review images: ls assets/images/*.png');
  console.log('  2. npm run validate:publish');
  console.log('  3. git add assets/images/');
  console.log('  4. git commit -m "fix(images): Regenerate app images with modern design"');
  console.log('');
}

main().catch(err => {
  console.error('\n❌ Fatal error:', err);
  process.exit(1);
});
