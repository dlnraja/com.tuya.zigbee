#!/usr/bin/env node

/**
 * GENERATE_UNIQUE_DRIVER_IMAGES.js
 * Génère des images UNIQUES pour CHAQUE driver
 * Chaque driver aura son propre design reconnaissable
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

console.log('╔════════════════════════════════════════════════════════╗');
console.log('║   🎨 GÉNÉRATION IMAGES UNIQUES PAR DRIVER             ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

// Palettes de couleurs par type de device
const DEVICE_COLORS = {
  // Sensors
  motion: { primary: '#FF6B6B', secondary: '#C92A2A', icon: '👁️' },
  temperature: { primary: '#4DABF7', secondary: '#1971C2', icon: '🌡️' },
  humidity: { primary: '#63E6BE', secondary: '#0CA678', icon: '💧' },
  contact: { primary: '#A78BFA', secondary: '#7C3AED', icon: '🚪' },
  smoke: { primary: '#FA5252', secondary: '#C92A2A', icon: '🔥' },
  gas: { primary: '#FFA94D', secondary: '#E8590C', icon: '💨' },
  water: { primary: '#4DABF7', secondary: '#1971C2', icon: '💦' },
  vibration: { primary: '#FF6B6B', secondary: '#C92A2A', icon: '📳' },
  illumination: { primary: '#FFD43B', secondary: '#F59F00', icon: '💡' },
  air_quality: { primary: '#63E6BE', secondary: '#0CA678', icon: '🌿' },
  
  // Controls
  switch: { primary: '#69DB7C', secondary: '#2F9E44', icon: '🔘' },
  dimmer: { primary: '#FFD43B', secondary: '#F59F00', icon: '🎚️' },
  plug: { primary: '#4DABF7', secondary: '#1971C2', icon: '🔌' },
  curtain: { primary: '#A78BFA', secondary: '#7C3AED', icon: '🪟' },
  thermostat: { primary: '#FF8787', secondary: '#FA5252', icon: '🌡️' },
  fan: { primary: '#63E6BE', secondary: '#0CA678', icon: '💨' },
  
  // Lights
  light: { primary: '#FFD43B', secondary: '#F59F00', icon: '💡' },
  rgb: { primary: '#F06595', secondary: '#D6336C', icon: '🌈' },
  
  // Buttons
  button: { primary: '#868E96', secondary: '#495057', icon: '🔲' },
  scene: { primary: '#A78BFA', secondary: '#7C3AED', icon: '🎬' },
  
  // Default
  default: { primary: '#4C6EF5', secondary: '#364FC7', icon: '📱' }
};

// Déterminer le type de device depuis le nom du driver
function getDeviceType(driverName) {
  const name = driverName.toLowerCase();
  
  // Sensors
  if (name.includes('motion') || name.includes('pir')) return 'motion';
  if (name.includes('temperature') || name.includes('temp')) return 'temperature';
  if (name.includes('humidity')) return 'humidity';
  if (name.includes('contact') || name.includes('door') || name.includes('window')) return 'contact';
  if (name.includes('smoke')) return 'smoke';
  if (name.includes('gas') || name.includes('co')) return 'gas';
  if (name.includes('water') || name.includes('leak')) return 'water';
  if (name.includes('vibration')) return 'vibration';
  if (name.includes('illumination') || name.includes('lux') || name.includes('light_sensor')) return 'illumination';
  if (name.includes('air_quality') || name.includes('co2')) return 'air_quality';
  
  // Controls
  if (name.includes('switch') && !name.includes('scene')) return 'switch';
  if (name.includes('dimmer')) return 'dimmer';
  if (name.includes('plug') || name.includes('socket')) return 'plug';
  if (name.includes('curtain') || name.includes('blind') || name.includes('shade')) return 'curtain';
  if (name.includes('thermostat') || name.includes('trv')) return 'thermostat';
  if (name.includes('fan')) return 'fan';
  
  // Lights
  if (name.includes('rgb') || name.includes('color')) return 'rgb';
  if (name.includes('light') || name.includes('bulb') || name.includes('led')) return 'light';
  
  // Buttons
  if (name.includes('scene') || name.includes('remote')) return 'scene';
  if (name.includes('button') || name.includes('knob')) return 'button';
  
  return 'default';
}

// Générer SVG unique pour un driver
function generateDriverSVG(driverName, size) {
  const type = getDeviceType(driverName);
  const colors = DEVICE_COLORS[type] || DEVICE_COLORS.default;
  
  const iconSize = size === 'small' ? 30 : size === 'large' ? 60 : 120;
  const fontSize = size === 'small' ? 8 : size === 'large' ? 12 : 16;
  const cornerRadius = size === 'small' ? 8 : size === 'large' ? 12 : 16;
  
  // Dimensions
  const dimensions = {
    small: { w: 75, h: 75 },
    large: { w: 500, h: 500 },
    xlarge: { w: 1000, h: 1000 }
  };
  
  const { w, h } = dimensions[size];
  const centerX = w / 2;
  const centerY = h / 2;
  
  // Badge type en bas
  const badgeY = h - (size === 'small' ? 15 : size === 'large' ? 40 : 80);
  const badgeHeight = size === 'small' ? 12 : size === 'large' ? 30 : 60;
  const badgeWidth = w * 0.8;
  const badgeX = (w - badgeWidth) / 2;
  
  return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg-${driverName}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${colors.primary};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${colors.secondary};stop-opacity:1" />
    </linearGradient>
    
    <radialGradient id="shine-${driverName}">
      <stop offset="0%" style="stop-color:#ffffff;stop-opacity:0.3" />
      <stop offset="100%" style="stop-color:#ffffff;stop-opacity:0" />
    </radialGradient>
    
    <filter id="shadow-${driverName}">
      <feGaussianBlur in="SourceAlpha" stdDeviation="${size === 'xlarge' ? 5 : 2}"/>
      <feOffset dx="0" dy="${size === 'xlarge' ? 3 : 1}" result="offsetblur"/>
      <feComponentTransfer>
        <feFuncA type="linear" slope="0.3"/>
      </feComponentTransfer>
      <feMerge>
        <feMergeNode/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  
  <!-- Background gradient -->
  <rect width="${w}" height="${h}" fill="url(#bg-${driverName})" rx="${cornerRadius}"/>
  
  <!-- Shine effect -->
  <ellipse cx="${centerX}" cy="${h * 0.3}" rx="${w * 0.6}" ry="${h * 0.3}" fill="url(#shine-${driverName})"/>
  
  <!-- Central circle -->
  <circle cx="${centerX}" cy="${centerY}" r="${w * 0.35}" 
          fill="rgba(255,255,255,0.1)" 
          stroke="rgba(255,255,255,0.3)" 
          stroke-width="${size === 'small' ? 1 : size === 'large' ? 2 : 4}"/>
  
  <!-- Icon emoji (centered) -->
  <text x="${centerX}" y="${centerY + iconSize * 0.15}" 
        font-size="${iconSize}" 
        text-anchor="middle"
        filter="url(#shadow-${driverName})">${colors.icon}</text>
  
  <!-- Type badge at bottom -->
  <rect x="${badgeX}" y="${badgeY}" width="${badgeWidth}" height="${badgeHeight}" 
        rx="${badgeHeight / 2}" 
        fill="rgba(255,255,255,0.9)"
        filter="url(#shadow-${driverName})"/>
  
  <text x="${centerX}" y="${badgeY + badgeHeight * 0.7}" 
        font-family="Arial, sans-serif" 
        font-size="${fontSize}" 
        font-weight="600" 
        fill="#333333" 
        text-anchor="middle">${type.toUpperCase()}</text>
</svg>`;
}

// Générer images pour un driver
async function generateDriverImages(driverPath, driverName) {
  const assetsPath = path.join(driverPath, 'assets');
  
  // Créer dossier assets si inexistant
  if (!fs.existsSync(assetsPath)) {
    fs.mkdirSync(assetsPath, { recursive: true });
  }
  
  try {
    // Small 75×75
    const svgSmall = generateDriverSVG(driverName, 'small');
    await sharp(Buffer.from(svgSmall))
      .resize(75, 75)
      .png()
      .toFile(path.join(assetsPath, 'small.png'));
    
    // Large 500×500
    const svgLarge = generateDriverSVG(driverName, 'large');
    await sharp(Buffer.from(svgLarge))
      .resize(500, 500)
      .png()
      .toFile(path.join(assetsPath, 'large.png'));
    
    // XLarge 1000×1000
    const svgXLarge = generateDriverSVG(driverName, 'xlarge');
    await sharp(Buffer.from(svgXLarge))
      .resize(1000, 1000)
      .png()
      .toFile(path.join(assetsPath, 'xlarge.png'));
    
    return true;
  } catch (error) {
    console.error(`   ❌ ${driverName}:`, error.message);
    return false;
  }
}

// Main
async function main() {
  const driversDir = 'drivers';
  
  if (!fs.existsSync(driversDir)) {
    console.error('❌ Dossier drivers/ introuvable!');
    process.exit(1);
  }
  
  const drivers = fs.readdirSync(driversDir).filter(d =>
    fs.statSync(path.join(driversDir, d)).isDirectory()
  );
  
  console.log(`📦 ${drivers.length} drivers trouvés\n`);
  console.log('🎨 Génération images uniques...\n');
  
  let success = 0;
  let failed = 0;
  
  // Générer par type pour voir progression
  const typeGroups = {};
  drivers.forEach(driver => {
    const type = getDeviceType(driver);
    if (!typeGroups[type]) typeGroups[type] = [];
    typeGroups[type].push(driver);
  });
  
  console.log('📊 Distribution par type:\n');
  Object.entries(typeGroups).forEach(([type, driverList]) => {
    const colors = DEVICE_COLORS[type] || DEVICE_COLORS.default;
    console.log(`   ${colors.icon} ${type}: ${driverList.length} drivers`);
  });
  console.log('');
  
  // Générer images
  for (const driver of drivers) {
    const driverPath = path.join(driversDir, driver);
    const type = getDeviceType(driver);
    const colors = DEVICE_COLORS[type] || DEVICE_COLORS.default;
    
    const result = await generateDriverImages(driverPath, driver);
    
    if (result) {
      console.log(`   ✅ ${colors.icon} ${driver}`);
      success++;
    } else {
      failed++;
    }
  }
  
  console.log('');
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║                    RÉSUMÉ GÉNÉRATION                   ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
  
  console.log(`   Total drivers:      ${drivers.length}`);
  console.log(`   ✅ Succès:          ${success}`);
  console.log(`   ❌ Échecs:          ${failed}`);
  console.log(`   📊 Taux réussite:   ${Math.round(success/drivers.length*100)}%`);
  console.log('');
  
  console.log('🎨 TYPES GÉNÉRÉS:\n');
  Object.entries(typeGroups).forEach(([type, driverList]) => {
    const colors = DEVICE_COLORS[type] || DEVICE_COLORS.default;
    console.log(`   ${colors.icon} ${type}: ${colors.primary} / ${colors.secondary}`);
  });
  console.log('');
  
  console.log('✅ Chaque driver a maintenant des images UNIQUES!\n');
}

main().catch(console.error);
