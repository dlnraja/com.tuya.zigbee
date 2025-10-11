#!/usr/bin/env node

/**
 * FIX ROOT ASSETS - Create correctly sized images in root assets/
 * These are used as fallback for drivers
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const ASSETS_DIR = path.join(ROOT, 'assets');

async function createGenericImage(outputPath, width, height) {
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#4CAF50;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#66BB6A;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#grad)" />
      <circle cx="${width/2}" cy="${height/2}" r="${Math.min(width, height)/4}" fill="#fff" opacity="0.3" />
    </svg>
  `;
  
  await sharp(Buffer.from(svg))
    .png()
    .toFile(outputPath);
}

async function main() {
  console.log('\n🔧 FIX ROOT ASSETS\n');
  
  // Create small (75x75) - used by drivers as fallback
  await createGenericImage(path.join(ASSETS_DIR, 'small.png'), 75, 75);
  console.log('✅ assets/small.png (75x75) created');
  
  // Create large (500x500)
  await createGenericImage(path.join(ASSETS_DIR, 'large.png'), 500, 500);
  console.log('✅ assets/large.png (500x500) created');
  
  // Create xlarge (1000x1000)
  await createGenericImage(path.join(ASSETS_DIR, 'xlarge.png'), 1000, 1000);
  console.log('✅ assets/xlarge.png (1000x1000) created');
  
  console.log('\n🎉 ROOT ASSETS FIXED\n');
}

main().catch(console.error);
