#!/usr/bin/env node
'use strict';

/**
 * GENERATE DEFAULT IMAGES
 * 
 * Génère des images PNG par défaut pour tous les drivers
 * avec placeholders pour éviter les erreurs de validation
 */

const fs = require('fs-extra');
const path = require('path');
const { createCanvas } = require('canvas');

const ROOT = path.join(__dirname, '..', '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

const SIZES = {
  small: { width: 75, height: 75 },
  large: { width: 500, height: 500 },
  xlarge: { width: 1000, height: 1000 }
};

const COLORS = {
  lighting: '#FFA500',
  sensor: '#4CAF50',
  switch: '#2196F3',
  climate: '#FF5722',
  security: '#F44336',
  controller: '#9C27B0',
  plug: '#673AB7',
  default: '#607D8B'
};

async function getDriverCategory(driverId) {
  if (driverId.includes('bulb') || driverId.includes('light') || driverId.includes('led')) return 'lighting';
  if (driverId.includes('sensor') || driverId.includes('motion') || driverId.includes('contact')) return 'sensor';
  if (driverId.includes('switch') || driverId.includes('dimmer')) return 'switch';
  if (driverId.includes('thermostat') || driverId.includes('temperature') || driverId.includes('humidity')) return 'climate';
  if (driverId.includes('alarm') || driverId.includes('doorbell') || driverId.includes('lock')) return 'security';
  if (driverId.includes('button') || driverId.includes('controller') || driverId.includes('remote')) return 'controller';
  if (driverId.includes('plug') || driverId.includes('socket')) return 'plug';
  return 'default';
}

function generateImage(width, height, color, text) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  // Background
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, width, height);
  
  // Circle in center
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  const radius = Math.min(width, height) * 0.35;
  ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
  ctx.fill();
  
  // Icon (simplified)
  ctx.fillStyle = color;
  ctx.font = `bold ${Math.floor(radius * 0.8)}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  const icon = text.charAt(0).toUpperCase();
  ctx.fillText(icon, width / 2, height / 2);
  
  return canvas.toBuffer('image/png');
}

async function generateDefaultImages() {
  console.log('🎨 GENERATE DEFAULT IMAGES\n');
  console.log('═'.repeat(70) + '\n');
  
  const drivers = await fs.readdir(DRIVERS_DIR);
  let generated = 0;
  
  for (const driver of drivers) {
    const assetsDir = path.join(DRIVERS_DIR, driver, 'assets');
    
    if (!await fs.pathExists(assetsDir)) continue;
    
    // Check for placeholders
    const hasPlaceholders = (await fs.readdir(assetsDir))
      .some(f => f.endsWith('.placeholder'));
    
    if (!hasPlaceholders) continue;
    
    console.log(`🎨 Generating images for ${driver}...`);
    
    const category = await getDriverCategory(driver);
    const color = COLORS[category];
    const name = driver.split('_').map(w => w.charAt(0).toUpperCase()).join('');
    
    for (const [size, dimensions] of Object.entries(SIZES)) {
      const imagePath = path.join(assetsDir, `${size}.png`);
      
      // Only generate if doesn't exist or is placeholder
      if (!await fs.pathExists(imagePath)) {
        const imageBuffer = generateImage(
          dimensions.width,
          dimensions.height,
          color,
          name
        );
        
        await fs.writeFile(imagePath, imageBuffer);
        console.log(`   ✓ ${size}.png (${dimensions.width}x${dimensions.height})`);
        generated++;
      }
    }
    
    // Remove placeholders
    const files = await fs.readdir(assetsDir);
    for (const file of files) {
      if (file.endsWith('.placeholder')) {
        await fs.remove(path.join(assetsDir, file));
      }
    }
    
    console.log(`✅ ${driver} complete\n`);
  }
  
  console.log('═'.repeat(70));
  console.log(`\n✅ Generated ${generated} images total\n`);
}

generateDefaultImages().catch(err => {
  console.error('❌ Error:', err);
  console.log('\n⚠️  Note: Requires "canvas" package');
  console.log('   Run: npm install canvas\n');
  process.exit(1);
});
