#!/usr/bin/env node
/**
 * REGENERATE ALL IMAGES - Refait toutes les images avec nouveaux designs
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

console.log('🎨 REGENERATE ALL IMAGES - Starting complete regeneration\n');
console.log('═'.repeat(70));

const colors = {
  switches: '#4CAF50',
  sensors: '#2196F3',
  lighting: '#FFC107',
  power: '#FF5722',
  covers: '#9C27B0',
  climate: '#00BCD4',
  security: '#F44336',
  specialty: '#607D8B'
};

const icons = {
  switches: '⚡',
  sensors: '📡',
  lighting: '💡',
  power: '🔌',
  covers: '🪟',
  climate: '🌡️',
  security: '🔐',
  specialty: '⚙️'
};

function getCategoryForDriver(driverId) {
  const lower = driverId.toLowerCase();
  
  if (lower.match(/switch|relay|scene|button|remote|wireless|gang|touch|wall_switch/)) return 'switches';
  if (lower.match(/sensor|detector|monitor|motion|pir|radar|leak|smoke|co2|temp|humid|pressure|lux|soil|vibration|presence/)) return 'sensors';
  if (lower.match(/bulb|spot|led_strip|rgb|ceiling_light|dimmer/) && !lower.includes('controller')) return 'lighting';
  if (lower.match(/plug|outlet|socket|energy|power_meter|mini/)) return 'power';
  if (lower.match(/curtain|blind|shutter|shade|projector/)) return 'covers';
  if (lower.match(/thermostat|radiator|hvac/)) return 'climate';
  if (lower.match(/lock|doorbell|siren|sos/)) return 'security';
  
  return 'specialty';
}

function generateEnhancedSVG(driverId, category) {
  const color = colors[category];
  const icon = icons[category];
  const initial = driverId.charAt(0).toUpperCase();
  const name = driverId.replace(/_/g, ' ').split(' ').slice(0, 2).join(' ');
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="500" height="500" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad_${category}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${color};stop-opacity:0.7" />
    </linearGradient>
    <filter id="shadow">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-opacity="0.3"/>
    </filter>
  </defs>
  
  <!-- Background with gradient -->
  <rect width="500" height="500" fill="url(#grad_${category})" rx="60"/>
  
  <!-- Icon circle background -->
  <circle cx="250" cy="220" r="100" fill="white" opacity="0.2" filter="url(#shadow)"/>
  
  <!-- Large icon/initial -->
  <text x="250" y="280" font-family="Arial, sans-serif" font-size="140" 
        fill="white" text-anchor="middle" font-weight="bold" 
        filter="url(#shadow)">${initial}</text>
  
  <!-- Category badge -->
  <rect x="100" y="360" width="300" height="50" rx="25" fill="white" opacity="0.9"/>
  <text x="250" y="392" font-family="Arial, sans-serif" font-size="22" 
        fill="${color}" text-anchor="middle" font-weight="bold">${category.toUpperCase()}</text>
  
  <!-- Brand -->
  <text x="250" y="450" font-family="Arial, sans-serif" font-size="28" 
        fill="white" text-anchor="middle" opacity="0.9" font-weight="300">Tuya Zigbee</text>
</svg>`;
}

const drivers = fs.readdirSync(DRIVERS_DIR, { withFileTypes: true })
  .filter(e => e.isDirectory())
  .map(e => e.name)
  .sort();

console.log(`\nFound ${drivers.length} drivers\n`);
console.log('[1/3] 🎨 Generating SVG icons...\n');

let svgGenerated = 0;
let pngGenerated = 0;
let errors = 0;

drivers.forEach((driverId, index) => {
  const assetsDir = path.join(DRIVERS_DIR, driverId, 'assets');
  const category = getCategoryForDriver(driverId);
  
  // Ensure assets directory exists
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }
  
  // Generate enhanced SVG
  const iconPath = path.join(assetsDir, 'icon.svg');
  const svg = generateEnhancedSVG(driverId, category);
  
  try {
    fs.writeFileSync(iconPath, svg);
    svgGenerated++;
    
    if ((index + 1) % 10 === 0) {
      console.log(`  ✅ Generated ${index + 1}/${drivers.length} SVG icons...`);
    }
  } catch (error) {
    console.error(`  ❌ ${driverId}: ${error.message}`);
    errors++;
  }
});

console.log(`\n✅ SVG Generation complete: ${svgGenerated}/${drivers.length}\n`);

// Check ImageMagick
console.log('[2/3] 🖼️  Converting to PNG...\n');

let hasImageMagick = false;
try {
  execSync('magick --version', { stdio: 'ignore' });
  hasImageMagick = true;
  console.log('✅ ImageMagick detected\n');
} catch (e) {
  console.log('⚠️  ImageMagick not found - will create placeholder info\n');
}

if (hasImageMagick) {
  drivers.forEach((driverId, index) => {
    const assetsDir = path.join(DRIVERS_DIR, driverId, 'assets');
    const iconSvg = path.join(assetsDir, 'icon.svg');
    const smallPng = path.join(assetsDir, 'small.png');
    const largePng = path.join(assetsDir, 'large.png');
    
    if (!fs.existsSync(iconSvg)) return;
    
    try {
      // Generate small.png (75x75)
      execSync(`magick convert "${iconSvg}" -resize 75x75 -background none "${smallPng}"`, { stdio: 'ignore' });
      
      // Generate large.png (500x500)
      execSync(`magick convert "${iconSvg}" -resize 500x500 -background none "${largePng}"`, { stdio: 'ignore' });
      
      pngGenerated += 2;
      
      if ((index + 1) % 10 === 0) {
        console.log(`  ✅ Converted ${index + 1}/${drivers.length} drivers (${pngGenerated} PNG files)...`);
      }
    } catch (error) {
      console.error(`  ❌ ${driverId}: ${error.message}`);
      errors++;
    }
  });
  
  console.log(`\n✅ PNG Conversion complete: ${pngGenerated} files generated\n`);
} else {
  console.log('ℹ️  To generate PNG files, install ImageMagick:');
  console.log('   Windows: choco install imagemagick');
  console.log('   Or: https://imagemagick.org/\n');
}

// Validation
console.log('[3/3] ✅ Validation...\n');

let validSVG = 0;
let validSmall = 0;
let validLarge = 0;

drivers.forEach(driverId => {
  const assetsDir = path.join(DRIVERS_DIR, driverId, 'assets');
  
  if (fs.existsSync(path.join(assetsDir, 'icon.svg'))) validSVG++;
  if (fs.existsSync(path.join(assetsDir, 'small.png'))) validSmall++;
  if (fs.existsSync(path.join(assetsDir, 'large.png'))) validLarge++;
});

console.log('═'.repeat(70));
console.log('📊 IMAGE REGENERATION COMPLETE');
console.log('═'.repeat(70));
console.log(`\n✅ SVG Icons:  ${validSVG}/${drivers.length} (${((validSVG/drivers.length)*100).toFixed(1)}%)`);
console.log(`✅ Small PNGs: ${validSmall}/${drivers.length} (${((validSmall/drivers.length)*100).toFixed(1)}%)`);
console.log(`✅ Large PNGs: ${validLarge}/${drivers.length} (${((validLarge/drivers.length)*100).toFixed(1)}%)`);
console.log(`✅ Total:      ${validSVG + validSmall + validLarge}/${drivers.length * 3} assets`);
console.log(`\n❌ Errors:     ${errors}`);

const totalAssets = validSVG + validSmall + validLarge;
const totalPossible = drivers.length * 3;
const completion = ((totalAssets / totalPossible) * 100).toFixed(1);

console.log(`\n📈 Completion: ${completion}%`);

if (validSVG === drivers.length && validSmall === drivers.length && validLarge === drivers.length) {
  console.log('\n✅ ALL IMAGES REGENERATED SUCCESSFULLY!\n');
  process.exit(0);
} else {
  console.log('\n⚠️  Some images missing - check ImageMagick installation\n');
  process.exit(1);
}
