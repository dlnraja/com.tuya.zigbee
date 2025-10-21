#!/usr/bin/env node

/**
 * REGENERATE ALL CONTEXTUAL IMAGES
 * 
 * Génère des images personnalisées pour chaque driver basées sur:
 * - Type de device (motion, switch, plug, light, etc.)
 * - Couleurs contextuelles (Johan Bendz standards)
 * - Icônes spécifiques par catégorie
 * 
 * @version 2.1.46
 */

const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

const ROOT = path.join(__dirname, '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

// Couleurs par catégorie (Johan Bendz standards)
const COLOR_SCHEMES = {
  // Lighting
  light: { primary: '#FFC107', secondary: '#FFD54F', icon: '💡' },
  dimmer: { primary: '#FFB74D', secondary: '#FF9800', icon: '🔆' },
  bulb: { primary: '#FFC107', secondary: '#FFD54F', icon: '💡' },
  rgb: { primary: '#E91E63', secondary: '#F48FB1', icon: '🌈' },
  
  // Switches & Controls
  switch: { primary: '#4CAF50', secondary: '#81C784', icon: '⚡' },
  button: { primary: '#4CAF50', secondary: '#81C784', icon: '🔘' },
  scene: { primary: '#4CAF50', secondary: '#81C784', icon: '🎬' },
  
  // Sensors
  motion: { primary: '#2196F3', secondary: '#64B5F6', icon: '🏃' },
  pir: { primary: '#2196F3', secondary: '#64B5F6', icon: '👁️' },
  radar: { primary: '#2196F3', secondary: '#64B5F6', icon: '📡' },
  presence: { primary: '#2196F3', secondary: '#64B5F6', icon: '🏃' },
  contact: { primary: '#2196F3', secondary: '#64B5F6', icon: '🚪' },
  door: { primary: '#2196F3', secondary: '#64B5F6', icon: '🚪' },
  window: { primary: '#2196F3', secondary: '#64B5F6', icon: '🪟' },
  vibration: { primary: '#2196F3', secondary: '#64B5F6', icon: '📳' },
  
  // Temperature & Climate
  temperature: { primary: '#FF9800', secondary: '#FFB74D', icon: '🌡️' },
  temp: { primary: '#FF9800', secondary: '#FFB74D', icon: '🌡️' },
  humid: { primary: '#00BCD4', secondary: '#4DD0E1', icon: '💧' },
  climate: { primary: '#FF9800', secondary: '#FFB74D', icon: '🌡️' },
  thermostat: { primary: '#FF9800', secondary: '#FFB74D', icon: '🎚️' },
  hvac: { primary: '#FF9800', secondary: '#FFB74D', icon: '🎚️' },
  
  // Energy
  plug: { primary: '#9C27B0', secondary: '#BA68C8', icon: '🔌' },
  socket: { primary: '#9C27B0', secondary: '#BA68C8', icon: '🔌' },
  outlet: { primary: '#9C27B0', secondary: '#BA68C8', icon: '🔌' },
  energy: { primary: '#9C27B0', secondary: '#BA68C8', icon: '⚡' },
  meter: { primary: '#9C27B0', secondary: '#BA68C8', icon: '⚡' },
  
  // Climate control
  fan: { primary: '#00BCD4', secondary: '#4DD0E1', icon: '💨' },
  curtain: { primary: '#795548', secondary: '#A1887F', icon: '🪟' },
  blind: { primary: '#795548', secondary: '#A1887F', icon: '🪟' },
  shade: { primary: '#795548', secondary: '#A1887F', icon: '🪟' },
  roller: { primary: '#795548', secondary: '#A1887F', icon: '🪟' },
  
  // Safety
  smoke: { primary: '#F44336', secondary: '#E57373', icon: '🚨' },
  gas: { primary: '#F44336', secondary: '#E57373', icon: '⚠️' },
  co: { primary: '#F44336', secondary: '#E57373', icon: '☠️' },
  co2: { primary: '#F44336', secondary: '#E57373', icon: '🔬' },
  water: { primary: '#03A9F4', secondary: '#4FC3F7', icon: '💧' },
  leak: { primary: '#03A9F4', secondary: '#4FC3F7', icon: '💧' },
  valve: { primary: '#03A9F4', secondary: '#4FC3F7', icon: '🚰' },
  fire: { primary: '#F44336', secondary: '#E57373', icon: '🔥' },
  
  // Air quality
  air: { primary: '#4CAF50', secondary: '#81C784', icon: '🌫️' },
  pm25: { primary: '#4CAF50', secondary: '#81C784', icon: '🌫️' },
  tvoc: { primary: '#4CAF50', secondary: '#81C784', icon: '🌫️' },
  formaldehyde: { primary: '#4CAF50', secondary: '#81C784', icon: '🌫️' },
  
  // Special
  lock: { primary: '#607D8B', secondary: '#90A4AE', icon: '🔒' },
  siren: { primary: '#F44336', secondary: '#E57373', icon: '🔔' },
  alarm: { primary: '#F44336', secondary: '#E57373', icon: '🚨' },
  doorbell: { primary: '#FF9800', secondary: '#FFB74D', icon: '🔔' },
  ir: { primary: '#9C27B0', secondary: '#BA68C8', icon: '📡' },
  gateway: { primary: '#607D8B', secondary: '#90A4AE', icon: '🌐' },
  hub: { primary: '#607D8B', secondary: '#90A4AE', icon: '🌐' },
  bridge: { primary: '#607D8B', secondary: '#90A4AE', icon: '🌐' },
  
  // Default
  default: { primary: '#607D8B', secondary: '#90A4AE', icon: '📱' }
};

function getColorScheme(driverName) {
  const name = driverName.toLowerCase();
  
  for (const [key, scheme] of Object.entries(COLOR_SCHEMES)) {
    if (name.includes(key)) {
      return scheme;
    }
  }
  
  return COLOR_SCHEMES.default;
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function drawDeviceIcon(ctx, width, height, driverName, colors) {
  const centerX = width / 2;
  const centerY = height / 2;
  
  // Gradient background
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, colors.primary);
  gradient.addColorStop(1, colors.secondary);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  // Icon circle (white with opacity)
  const circleSize = Math.min(width, height) * 0.4;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.beginPath();
  ctx.arc(centerX, centerY, circleSize, 0, Math.PI * 2);
  ctx.fill();
  
  // Icon text (emoji)
  ctx.font = `${Math.floor(width * 0.35)}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(colors.icon, centerX, centerY);
  
  // Power designation badge (si applicable)
  const name = driverName.toLowerCase();
  let badge = '';
  if (name.includes('_ac')) badge = 'AC';
  else if (name.includes('_battery')) badge = '🔋';
  else if (name.includes('_cr2032') || name.includes('_cr2450')) badge = 'CR';
  else if (name.includes('_hybrid')) badge = '⚡🔋';
  
  if (badge) {
    const badgeSize = width * 0.15;
    const badgeX = width - badgeSize - width * 0.05;
    const badgeY = height - badgeSize - width * 0.05;
    
    // Badge background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.beginPath();
    ctx.arc(badgeX + badgeSize/2, badgeY + badgeSize/2, badgeSize/2, 0, Math.PI * 2);
    ctx.fill();
    
    // Badge text
    ctx.font = `${Math.floor(badgeSize * 0.5)}px Arial`;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(badge, badgeX + badgeSize/2, badgeY + badgeSize/2);
  }
}

async function generateImages(driverName) {
  const driverPath = path.join(DRIVERS_DIR, driverName);
  const assetsPath = path.join(driverPath, 'assets');
  
  if (!fs.existsSync(assetsPath)) {
    fs.mkdirSync(assetsPath, { recursive: true });
  }
  
  const colors = getColorScheme(driverName);
  
  // Generate small (75x75)
  const smallCanvas = createCanvas(75, 75);
  const smallCtx = smallCanvas.getContext('2d');
  drawDeviceIcon(smallCtx, 75, 75, driverName, colors);
  const smallBuffer = smallCanvas.toBuffer('image/png');
  fs.writeFileSync(path.join(assetsPath, 'small.png'), smallBuffer);
  
  // Generate large (500x500)
  const largeCanvas = createCanvas(500, 500);
  const largeCtx = largeCanvas.getContext('2d');
  drawDeviceIcon(largeCtx, 500, 500, driverName, colors);
  const largeBuffer = largeCanvas.toBuffer('image/png');
  fs.writeFileSync(path.join(assetsPath, 'large.png'), largeBuffer);
  
  // Generate xlarge (1000x1000)
  const xlargeCanvas = createCanvas(1000, 1000);
  const xlargeCtx = xlargeCanvas.getContext('2d');
  drawDeviceIcon(xlargeCtx, 1000, 1000, driverName, colors);
  const xlargeBuffer = xlargeCanvas.toBuffer('image/png');
  fs.writeFileSync(path.join(assetsPath, 'xlarge.png'), xlargeBuffer);
  
  return { small: true, large: true, xlarge: true, colors };
}

async function main() {
  console.log('\n🎨 REGENERATE ALL CONTEXTUAL IMAGES\n');
  console.log('Basé sur Johan Bendz color standards\n');
  console.log('='.repeat(70) + '\n');
  
  const drivers = fs.readdirSync(DRIVERS_DIR).filter(dir => {
    return fs.statSync(path.join(DRIVERS_DIR, dir)).isDirectory();
  });
  
  console.log(`📁 Found ${drivers.length} drivers\n`);
  
  let processed = 0;
  const categories = {};
  
  for (const driver of drivers) {
    const result = await generateImages(driver);
    const colorKey = `${result.colors.primary}_${result.colors.icon}`;
    
    if (!categories[colorKey]) {
      categories[colorKey] = {
        count: 0,
        color: result.colors.primary,
        icon: result.colors.icon,
        example: driver
      };
    }
    categories[colorKey].count++;
    
    processed++;
    if (processed % 10 === 0) {
      console.log(`✅ Processed ${processed}/${drivers.length} drivers...`);
    }
  }
  
  console.log(`\n✅ ALL ${processed} drivers processed!\n`);
  
  console.log('📊 COLOR DISTRIBUTION:\n');
  const sortedCategories = Object.values(categories).sort((a, b) => b.count - a.count);
  sortedCategories.forEach(cat => {
    console.log(`${cat.icon} ${cat.color}: ${cat.count} drivers (ex: ${cat.example})`);
  });
  
  // Clean cache
  const buildPath = path.join(ROOT, '.homeybuild');
  if (fs.existsSync(buildPath)) {
    fs.rmSync(buildPath, { recursive: true, force: true });
    console.log('\n🧹 .homeybuild cleaned');
  }
  
  console.log('\n🎉 CONTEXTUAL IMAGES REGENERATED!\n');
}

main().catch(console.error);
