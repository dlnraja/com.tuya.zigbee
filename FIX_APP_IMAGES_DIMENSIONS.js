#!/usr/bin/env node
/**
 * FIX APP IMAGES DIMENSIONS
 * 
 * CORRECTION: Les images APP doivent aussi être aux mêmes dimensions
 * - small: 75x75 (PAS 250x175 !)
 * - large: 500x350
 */

const sharp = require('sharp');
const path = require('path');

const rootPath = __dirname;
const assetsPath = path.join(rootPath, 'assets');

async function createPNG(width, height, text, outputPath) {
  const svg = `
    <svg width="${width}" height="${height}">
      <rect width="${width}" height="${height}" fill="#1E88E5"/>
      <text x="50%" y="50%" text-anchor="middle" dy=".3em" 
            font-family="Arial" font-size="${Math.min(width, height) / 6}" 
            fill="white" font-weight="bold">${text}</text>
    </svg>
  `;
  
  await sharp(Buffer.from(svg))
    .png()
    .toFile(outputPath);
}

async function main() {
  console.log('🎨 FIX APP IMAGES DIMENSIONS - Correction 75x75');
  console.log('='.repeat(80));
  console.log('');
  
  // CORRIGER: small doit être 75x75, pas 250x175
  await createPNG(75, 75, 'TUYA', path.join(assetsPath, 'small.png'));
  console.log('   ✅ small.png: 75x75 (CORRIGÉ)');
  
  await createPNG(500, 350, 'Universal\nTuya\nZigbee', path.join(assetsPath, 'large.png'));
  console.log('   ✅ large.png: 500x350');
  
  console.log('');
  console.log('='.repeat(80));
  console.log('✅ IMAGES APP CORRIGÉES - DIMENSIONS EXACTES');
  console.log('='.repeat(80));
  console.log('');
  
  console.log('📋 Prochaine étape:');
  console.log('   homey app build && homey app validate --level=publish');
  console.log('');
}

main().catch(error => {
  console.error('❌ Erreur:', error.message);
  process.exit(1);
});
