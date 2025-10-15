#!/usr/bin/env node
'use strict';

const { createCanvas } = require('canvas');
const fs = require('fs-extra');
const path = require('path');

const DRIVER_DIR = path.join(__dirname, '..', '..', 'drivers', 'smart_plug_dimmer_ac', 'assets');

async function createImage(width, height, filename) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  // Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);
  
  // Gradient for plug
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#9C27B0'); // Purple (Energy)
  gradient.addColorStop(1, '#673AB7');
  
  // Scale factor
  const scale = width / 200;
  
  // Plug body
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.roundRect(50 * scale, 60 * scale, 100 * scale, 100 * scale, 15 * scale);
  ctx.fill();
  
  // Power symbol
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.beginPath();
  ctx.arc(100 * scale, 90 * scale, 15 * scale, 0, Math.PI * 2);
  ctx.fill();
  
  // Power icon
  const dimGradient = ctx.createLinearGradient(0, 0, width, height);
  dimGradient.addColorStop(0, '#FFD700'); // Gold (Dimmer)
  dimGradient.addColorStop(1, '#FFA500');
  
  ctx.strokeStyle = dimGradient;
  ctx.lineWidth = 4 * scale;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(100 * scale, 78 * scale);
  ctx.lineTo(100 * scale, 90 * scale);
  ctx.stroke();
  
  ctx.lineWidth = 3 * scale;
  ctx.beginPath();
  ctx.moveTo(95 * scale, 90 * scale);
  ctx.quadraticCurveTo(100 * scale, 95 * scale, 105 * scale, 90 * scale);
  ctx.stroke();
  
  // Dimmer indicator
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.beginPath();
  ctx.arc(100 * scale, 130 * scale, 12 * scale, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.strokeStyle = dimGradient;
  ctx.lineWidth = 3 * scale;
  ctx.beginPath();
  ctx.moveTo(88 * scale, 130 * scale);
  ctx.lineTo(112 * scale, 130 * scale);
  ctx.stroke();
  
  ctx.fillStyle = dimGradient;
  ctx.beginPath();
  ctx.arc(106 * scale, 130 * scale, 4 * scale, 0, Math.PI * 2);
  ctx.fill();
  
  // Prongs
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.beginPath();
  ctx.roundRect(75 * scale, 160 * scale, 8 * scale, 25 * scale, 2 * scale);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(117 * scale, 160 * scale, 8 * scale, 25 * scale, 2 * scale);
  ctx.fill();
  
  // Save
  const buffer = canvas.toBuffer('image/png');
  const outputPath = path.join(DRIVER_DIR, filename);
  await fs.writeFile(outputPath, buffer);
  console.log(`✅ Created ${filename} (${width}x${height})`);
}

async function main() {
  console.log('🎨 GENERATING SMART PLUG DIMMER IMAGES\n');
  
  await fs.ensureDir(DRIVER_DIR);
  
  // Driver images (SDK3 requirements)
  await createImage(75, 75, 'small.png');
  await createImage(500, 500, 'large.png');
  await createImage(1000, 1000, 'xlarge.png');
  
  console.log('\n✅ All images generated!');
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
