#!/usr/bin/env node
/**
 * FIX MISSING IMAGES
 * Génère des images placeholder SVG pour tous les drivers manquants
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DRIVERS_DIR = path.join(ROOT, 'drivers');

console.log('🔧 FIX MISSING IMAGES\n');

// Template SVG par catégorie (Johan Bendz colors)
const CATEGORY_TEMPLATES = {
  // Lighting
  bulb: { color1: '#FFD700', color2: '#FFA500', icon: '💡' },
  led_strip: { color1: '#FFD700', color2: '#FFA500', icon: '💡' },
  ceiling: { color1: '#FFD700', color2: '#FFA500', icon: '💡' },
  spot_light: { color1: '#FFD700', color2: '#FFA500', icon: '💡' },
  light: { color1: '#FFD700', color2: '#FFA500', icon: '💡' },
  
  // Switches
  switch: { color1: '#4CAF50', color2: '#8BC34A', icon: '🔘' },
  dimmer: { color1: '#4CAF50', color2: '#8BC34A', icon: '🎚️' },
  
  // Buttons & Remotes
  button: { color1: '#F44336', color2: '#E91E63', icon: '⏺️' },
  scene_controller: { color1: '#9C27B0', color2: '#673AB7', icon: '🎬' },
  
  // Sensors
  motion: { color1: '#2196F3', color2: '#03A9F4', icon: '🚶' },
  contact: { color1: '#2196F3', color2: '#03A9F4', icon: '🚪' },
  water_leak: { color1: '#2196F3', color2: '#03A9F4', icon: '💧' },
  climate: { color1: '#2196F3', color2: '#03A9F4', icon: '🌡️' },
  temperature: { color1: '#2196F3', color2: '#03A9F4', icon: '🌡️' },
  humidity: { color1: '#2196F3', color2: '#03A9F4', icon: '💨' },
  air_quality: { color1: '#2196F3', color2: '#03A9F4', icon: '💨' },
  presence: { color1: '#2196F3', color2: '#03A9F4', icon: '👁️' },
  
  // Climate Control
  thermostat: { color1: '#FF9800', color2: '#FF5722', icon: '🌡️' },
  radiator: { color1: '#FF9800', color2: '#FF5722', icon: '🔥' },
  hvac: { color1: '#FF9800', color2: '#FF5722', icon: '❄️' },
  
  // Security
  smoke: { color1: '#F44336', color2: '#E91E63', icon: '🔥' },
  gas: { color1: '#F44336', color2: '#E91E63', icon: '⚠️' },
  siren: { color1: '#F44336', color2: '#E91E63', icon: '🚨' },
  lock: { color1: '#F44336', color2: '#E91E63', icon: '🔒' },
  doorbell: { color1: '#F44336', color2: '#E91E63', icon: '🔔' },
  
  // Energy
  plug: { color1: '#9C27B0', color2: '#673AB7', icon: '🔌' },
  module: { color1: '#9C27B0', color2: '#673AB7', icon: '⚡' },
  usb_outlet: { color1: '#9C27B0', color2: '#673AB7', icon: '🔌' },
  
  // Curtains & Covers
  curtain: { color1: '#607D8B', color2: '#78909C', icon: '🪟' },
  blind: { color1: '#607D8B', color2: '#78909C', icon: '🪟' },
  shutter: { color1: '#607D8B', color2: '#78909C', icon: '🪟' },
  garage_door: { color1: '#607D8B', color2: '#78909C', icon: '🚪' },
  door_controller: { color1: '#607D8B', color2: '#78909C', icon: '🚪' },
  
  // Valves
  valve: { color1: '#2196F3', color2: '#03A9F4', icon: '💧' },
  water_valve: { color1: '#2196F3', color2: '#03A9F4', icon: '💧' },
  
  // Other
  gateway: { color1: '#607D8B', color2: '#78909C', icon: '📡' },
  solar: { color1: '#FFD700', color2: '#FFA500', icon: '☀️' },
  
  // Default
  default: { color1: '#607D8B', color2: '#78909C', icon: '📦' }
};

function detectCategory(driverName) {
  for (const [key, template] of Object.entries(CATEGORY_TEMPLATES)) {
    if (driverName.includes(key)) {
      return template;
    }
  }
  return CATEGORY_TEMPLATES.default;
}

function generateSVG(driverName, size) {
  const template = detectCategory(driverName);
  
  // Nom nettoyé pour affichage
  const displayName = driverName
    .replace(/_/g, ' ')
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  
  // Taille de l'emoji selon la taille
  const emojiSize = size === 75 ? 32 : (size === 500 ? 200 : 400);
  const fontSize = size === 75 ? 12 : (size === 500 ? 48 : 72);
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad_${size}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${template.color1};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${template.color2};stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="${size}" height="${size}" fill="url(#grad_${size})" rx="${size * 0.1}"/>
  
  <!-- Icon -->
  <text x="${size / 2}" y="${size / 2 + emojiSize * 0.15}" font-size="${emojiSize}" text-anchor="middle" opacity="0.9">${template.icon}</text>
  
  <!-- Label (only for large sizes) -->
  ${size >= 500 ? `<text x="${size / 2}" y="${size - fontSize}" font-size="${fontSize * 0.4}" text-anchor="middle" fill="white" opacity="0.7" font-family="Arial, sans-serif">${displayName}</text>` : ''}
</svg>`;
}

let fixed = 0;
let skipped = 0;

// Scanner tous les drivers
const drivers = fs.readdirSync(DRIVERS_DIR)
  .filter(name => {
    const driverPath = path.join(DRIVERS_DIR, name);
    return fs.statSync(driverPath).isDirectory() && !name.startsWith('.');
  });

console.log(`📂 Scan de ${drivers.length} drivers...\n`);

for (const driver of drivers) {
  const driverPath = path.join(DRIVERS_DIR, driver);
  const assetsDir = path.join(driverPath, 'assets');
  
  // Créer assets si manquant
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }
  
  let driverFixed = false;
  
  // Générer les 3 tailles
  for (const [name, size] of [['small', 75], ['large', 500], ['xlarge', 1000]]) {
    const svgPath = path.join(assetsDir, `${name}.svg`);
    const pngPath = path.join(assetsDir, `${name}.png`);
    
    // Si ni SVG ni PNG n'existe
    if (!fs.existsSync(svgPath) && !fs.existsSync(pngPath)) {
      const svg = generateSVG(driver, size);
      fs.writeFileSync(svgPath, svg, 'utf8');
      driverFixed = true;
    }
  }
  
  if (driverFixed) {
    console.log(`  ✅ ${driver}`);
    fixed++;
  } else {
    skipped++;
  }
}

console.log(`\n📊 RÉSULTATS\n`);
console.log(`  Drivers fixés:  ${fixed}`);
console.log(`  Déjà OK:        ${skipped}`);
console.log(`  Total:          ${drivers.length}\n`);

console.log('✅ Images manquantes générées!\n');
console.log('📝 Note: Ce sont des placeholders SVG.');
console.log('   Pour de vraies images produits, utilisez:');
console.log('   node scripts/images/IMAGE_ORCHESTRATOR.js\n');
