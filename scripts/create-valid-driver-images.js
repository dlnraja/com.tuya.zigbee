#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

/**
 * Crée des images PNG valides pour tous les drivers
 * Tailles requises: small (75x75), large (500x500), xlarge (1000x1000)
 */

const DRIVERS_DIR = path.join(__dirname, '..', 'drivers');

const SIZES = {
  small: { width: 75, height: 75 },
  large: { width: 500, height: 500 },
  xlarge: { width: 1000, height: 1000 }
};

// Couleurs par catégorie (Homey SDK3 best practices)
const COLORS = {
  sensor: '#2196F3',
  switch: '#4CAF50',
  light: '#FFD700',
  plug: '#9C27B0',
  button: '#607D8B',
  climate: '#FF9800',
  security: '#F44336',
  default: '#1E88E5'
};

async function createPngWithImageMagick(outputPath, width, height, color) {
  try {
    await execAsync(`magick -size ${width}x${height} xc:${color} "${outputPath}"`);
    return true;
  } catch (err) {
    return false;
  }
}

async function createSolidColorPNG(filePath, width, height, color) {
  // Try ImageMagick first
  const imageMagickWorked = await createPngWithImageMagick(filePath, width, height, color);
  
  if (imageMagickWorked) return true;
  
  // Fallback: Create a simple valid PNG buffer manually
  const { createCanvas } = require('canvas');
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, width, height);
  
  // Add text overlay
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `${Math.floor(height / 10)}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Tuya Zigbee', width / 2, height / 2);
  
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(filePath, buffer);
  return true;
}

function getColorForDriver(driverName) {
  if (driverName.includes('sensor') || driverName.includes('motion') || driverName.includes('contact')) return COLORS.sensor;
  if (driverName.includes('switch') || driverName.includes('relay')) return COLORS.switch;
  if (driverName.includes('light') || driverName.includes('bulb') || driverName.includes('led')) return COLORS.light;
  if (driverName.includes('plug') || driverName.includes('outlet') || driverName.includes('socket')) return COLORS.plug;
  if (driverName.includes('button') || driverName.includes('remote')) return COLORS.button;
  if (driverName.includes('climate') || driverName.includes('thermostat') || driverName.includes('temperature')) return COLORS.climate;
  if (driverName.includes('siren') || driverName.includes('alarm') || driverName.includes('lock')) return COLORS.security;
  return COLORS.default;
}

async function processDriver(driverName) {
  const driverPath = path.join(DRIVERS_DIR, driverName);
  const imagesDir = path.join(driverPath, 'assets', 'images');
  
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }
  
  const color = getColorForDriver(driverName);
  let created = 0;
  
  for (const [sizeName, { width, height }] of Object.entries(SIZES)) {
    const imagePath = path.join(imagesDir, `${sizeName}.png`);
    
    try {
      await createSolidColorPNG(imagePath, width, height, color);
      created++;
    } catch (err) {
      console.error(`❌ Failed ${driverName}/${sizeName}.png:`, err.message);
    }
  }
  
  return created === 3;
}

async function main() {
  console.log('🎨 Creating valid driver images for Homey SDK3...\n');
  
  // Check if canvas module is available
  try {
    require.resolve('canvas');
  } catch (e) {
    console.log('Installing canvas module...');
    await execAsync('npm install canvas --no-save');
  }
  
  const drivers = fs.readdirSync(DRIVERS_DIR)
    .filter(d => {
      const stat = fs.statSync(path.join(DRIVERS_DIR, d));
      return stat.isDirectory() && !d.startsWith('.') && !d.includes('archived');
    });
  
  console.log(`Found ${drivers.length} drivers\n`);
  
  let success = 0;
  let failed = 0;
  
  for (const driver of drivers) {
    const ok = await processDriver(driver);
    if (ok) {
      console.log(`✅ ${driver}`);
      success++;
    } else {
      failed++;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`\nSuccess: ${success}/${drivers.length}`);
  console.log(`Failed: ${failed}/${drivers.length}\n`);
}

main().catch(console.error);
