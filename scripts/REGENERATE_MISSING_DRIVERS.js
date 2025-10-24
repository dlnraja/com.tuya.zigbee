#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

console.log('\n🔄 REGENERATING ALL MISSING DRIVERS\n');

const driversDir = path.join(__dirname, '..', 'drivers');
const appJsonPath = path.join(__dirname, '..', 'app.json');

// Load app.json
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf-8'));

// Get list of existing driver folders
const existingDrivers = new Set(
  fs.readdirSync(driversDir)
    .filter(d => fs.statSync(path.join(driversDir, d)).isDirectory())
);

// Find missing drivers
const missingDrivers = appJson.drivers.filter(d => !existingDrivers.has(d.id));

console.log(`📊 Found ${missingDrivers.length} missing drivers\n`);

// Color schemes by brand
const brandColors = {
  innr: { bg: '#FF6B35', fg: '#FFFFFF' },
  osram: { bg: '#FFD700', fg: '#000000' },
  philips: { bg: '#0066CC', fg: '#FFFFFF' },
  samsung: { bg: '#1428A0', fg: '#FFFFFF' },
  sonoff: { bg: '#00B4D8', fg: '#FFFFFF' },
  xiaomi: { bg: '#FF6900', fg: '#FFFFFF' },
  default: { bg: '#6C757D', fg: '#FFFFFF' }
};

function getBrandFromId(id) {
  const brand = id.split('_')[0];
  return brandColors[brand] || brandColors.default;
}

function generateImage(width, height, text, colors) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, colors.bg);
  gradient.addColorStop(1, adjustBrightness(colors.bg, -20));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  // Text
  ctx.fillStyle = colors.fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  if (width === 75) {
    ctx.font = 'bold 10px Arial';
    ctx.fillText(text, width / 2, height / 2);
  } else {
    ctx.font = 'bold 24px Arial';
    const lines = text.split('\n');
    lines.forEach((line, i) => {
      ctx.fillText(line, width / 2, height / 2 + (i - lines.length / 2 + 0.5) * 30);
    });
  }
  
  return canvas.toBuffer('image/png');
}

function adjustBrightness(hex, percent) {
  const num = parseInt(String(hex).replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
    (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
    (B < 255 ? B < 1 ? 0 : B : 255))
    .toString(16).slice(1);
}

function createDriverStructure(driver) {
  const driverId = driver.id;
  const driverPath = path.join(driversDir, driverId);
  const assetsPath = path.join(driverPath, 'assets');
  const imagesPath = path.join(assetsPath, 'images');
  
  // Create directories
  fs.mkdirSync(driverPath, { recursive: true });
  fs.mkdirSync(imagesPath, { recursive: true });
  
  // Get brand colors
  const colors = getBrandFromId(driverId);
  const brand = driverId.split('_')[0].toUpperCase();
  const deviceType = driver.class || 'sensor';
  
  // Generate images
  const small = generateImage(75, 75, brand, colors);
  const large = generateImage(500, 500, `${brand}\n${deviceType}`, colors);
  const xlarge = generateImage(1000, 1000, `${brand}\n${deviceType}`, colors);
  
  fs.writeFileSync(path.join(imagesPath, 'small.png'), small);
  fs.writeFileSync(path.join(imagesPath, 'large.png'), large);
  fs.writeFileSync(path.join(imagesPath, 'xlarge.png'), xlarge);
  
  // Create device.js (basic template)
  const deviceJs = `'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class ${driverId.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('')}Device extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.printNode();
  }
}

module.exports = ${driverId.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('')}Device;
`;
  
  fs.writeFileSync(path.join(driverPath, 'device.js'), deviceJs);
  
  // Create driver.compose.json
  const driverCompose = {
    id: driverId,
    name: driver.name,
    class: driver.class,
    capabilities: driver.capabilities || [],
    images: {
      small: `drivers/${driverId}/assets/images/small.png`,
      large: `drivers/${driverId}/assets/images/large.png`,
      xlarge: `drivers/${driverId}/assets/images/xlarge.png`
    },
    zigbee: driver.zigbee || {
      manufacturerName: ['_TZ3000_generic'],
      productId: ['generic']
    }
  };
  
  if (driver.energy) {
    driverCompose.energy = driver.energy;
  }
  
  fs.writeFileSync(
    path.join(driverPath, 'driver.compose.json'),
    JSON.stringify(driverCompose, null, 2)
  );
  
  console.log(`  ✅ Created: ${driverId}`);
}

// Regenerate all missing drivers
let created = 0;
missingDrivers.forEach(driver => {
  try {
    createDriverStructure(driver);
    created++;
  } catch (err) {
    console.log(`  ❌ Error creating ${driver.id}: ${err.message}`);
  }
});

console.log(`\n✅ Regenerated ${created} drivers\n`);
