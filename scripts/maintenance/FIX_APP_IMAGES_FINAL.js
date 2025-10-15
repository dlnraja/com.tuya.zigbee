#!/usr/bin/env node
'use strict';

/**
 * FIX APP IMAGES FINAL
 * Fixes app-level images to correct sizes for Homey SDK3
 * Required: small=250x175, large=500x350, xlarge=1000x700
 */

const fs = require('fs-extra');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

const IMAGES_DIR = path.join(__dirname, '..', 'assets', 'images');

const REQUIRED_SIZES = {
  small: { width: 250, height: 175 },
  large: { width: 500, height: 350 },
  xlarge: { width: 1000, height: 700 }
};

async function createAppImage(name, width, height) {
  console.log(`Creating ${name}.png (${width}x${height})...`);
  
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  // Professional gradient background
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#1E88E5');
  gradient.addColorStop(1, '#1565C0');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  // Add subtle pattern
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 2;
  for (let i = 0; i < width; i += 40) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + height, height);
    ctx.stroke();
  }
  
  // Add text
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  const fontSize = Math.floor(height * 0.15);
  ctx.font = `bold ${fontSize}px Arial`;
  ctx.fillText('Universal Tuya', width / 2, height / 2 - fontSize / 2);
  
  const subFontSize = Math.floor(height * 0.08);
  ctx.font = `${subFontSize}px Arial`;
  ctx.fillText('Zigbee Hub', width / 2, height / 2 + subFontSize);
  
  // Save
  const buffer = canvas.toBuffer('image/png');
  const outputPath = path.join(IMAGES_DIR, `${name}.png`);
  await fs.writeFile(outputPath, buffer);
  console.log(`✅ Created ${name}.png`);
}

async function main() {
  console.log('🎨 FIX APP IMAGES FINAL\n');
  
  // Ensure directory exists
  await fs.ensureDir(IMAGES_DIR);
  
  // Create all required images
  for (const [name, { width, height }] of Object.entries(REQUIRED_SIZES)) {
    await createAppImage(name, width, height);
  }
  
  console.log('\n✅ All app images fixed!');
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
