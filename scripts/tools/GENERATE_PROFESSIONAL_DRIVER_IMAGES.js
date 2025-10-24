#!/usr/bin/env node

/**
 * GENERATE_PROFESSIONAL_DRIVER_IMAGES.js
 * Génère des images PROFESSIONNELLES style Material Design
 * Inspiré du design turquoise avec cercle central et icônes
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

console.log('╔════════════════════════════════════════════════════════╗');
console.log('║   🎨 GÉNÉRATION IMAGES PROFESSIONNELLES DRIVERS       ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

// Palettes couleurs professionnelles
const COLOR_SCHEMES = {
  // Sensors
  motion: { 
    bg: '#FF6B6B', 
    circle: '#C92A2A', 
    icon: '#FFFFFF',
    badge: 'MOTION'
  },
  temperature: { 
    bg: '#4DABF7', 
    circle: '#1971C2', 
    icon: '#FFFFFF',
    badge: 'TEMP'
  },
  humidity: { 
    bg: '#63E6BE', 
    circle: '#0CA678', 
    icon: '#FFFFFF',
    badge: 'HUM'
  },
  contact: { 
    bg: '#A78BFA', 
    circle: '#7C3AED', 
    icon: '#FFFFFF',
    badge: 'DOOR'
  },
  smoke: { 
    bg: '#FA5252', 
    circle: '#C92A2A', 
    icon: '#FFFFFF',
    badge: 'SMOKE'
  },
  gas: { 
    bg: '#FFA94D', 
    circle: '#E8590C', 
    icon: '#FFFFFF',
    badge: 'GAS'
  },
  water: { 
    bg: '#4FC3F7', 
    circle: '#1976D2', 
    icon: '#FFFFFF',
    badge: 'WATER'
  },
  air_quality: { 
    bg: '#63E6BE', 
    circle: '#0CA678', 
    icon: '#FFFFFF',
    badge: 'AIR'
  },
  
  // Controls
  switch: { 
    bg: '#69DB7C', 
    circle: '#2F9E44', 
    icon: '#FFFFFF',
    badge: 'SW'
  },
  dimmer: { 
    bg: '#FFD43B', 
    circle: '#F59F00', 
    icon: '#FFFFFF',
    badge: 'DIM'
  },
  plug: { 
    bg: '#63E6BE', 
    circle: '#0CA678', 
    icon: '#FFFFFF',
    badge: 'AC'
  },
  curtain: { 
    bg: '#A78BFA', 
    circle: '#7C3AED', 
    icon: '#FFFFFF',
    badge: 'CURT'
  },
  fan: { 
    bg: '#4FC3F7', 
    circle: '#0288D1', 
    icon: '#FFFFFF',
    badge: 'FAN'
  },
  thermostat: { 
    bg: '#FF8787', 
    circle: '#FA5252', 
    icon: '#FFFFFF',
    badge: 'THERM'
  },
  
  // Lights
  light: { 
    bg: '#FFD43B', 
    circle: '#F59F00', 
    icon: '#FFFFFF',
    badge: 'LIGHT'
  },
  rgb: { 
    bg: '#F06595', 
    circle: '#D6336C', 
    icon: '#FFFFFF',
    badge: 'RGB'
  },
  
  // Buttons
  button: { 
    bg: '#868E96', 
    circle: '#495057', 
    icon: '#FFFFFF',
    badge: 'BTN'
  },
  scene: { 
    bg: '#A78BFA', 
    circle: '#7C3AED', 
    icon: '#FFFFFF',
    badge: 'SCENE'
  },
  
  // Battery indicator
  battery: { 
    bg: '#FFD43B', 
    circle: '#F59F00', 
    icon: '#FFFFFF',
    badge: 'BATT'
  },
  
  default: { 
    bg: '#4C6EF5', 
    circle: '#364FC7', 
    icon: '#FFFFFF',
    badge: 'DEV'
  }
};

// Déterminer type de device
function getDeviceType(driverName) {
  const name = driverName.toLowerCase();
  
  if (name.includes('motion') || name.includes('pir') || name.includes('radar')) return 'motion';
  if (name.includes('temperature') || name.includes('temp') || name.includes('thermostat') || name.includes('trv')) return 'temperature';
  if (name.includes('humidity')) return 'humidity';
  if (name.includes('contact') || name.includes('door') || name.includes('window') || name.includes('garage')) return 'contact';
  if (name.includes('smoke')) return 'smoke';
  if (name.includes('gas') || name.includes('co2') || name.includes('co_')) return 'gas';
  if (name.includes('water') || name.includes('leak') || name.includes('valve')) return 'water';
  if (name.includes('air_quality') || name.includes('tvoc') || name.includes('pm25')) return 'air_quality';
  if (name.includes('switch') && !name.includes('scene')) return 'switch';
  if (name.includes('dimmer')) return 'dimmer';
  if (name.includes('plug') || name.includes('socket') || name.includes('outlet') || name.includes('energy')) return 'plug';
  if (name.includes('curtain') || name.includes('blind') || name.includes('shade') || name.includes('shutter')) return 'curtain';
  if (name.includes('fan')) return 'fan';
  if (name.includes('rgb') || name.includes('color')) return 'rgb';
  if (name.includes('light') || name.includes('bulb') || name.includes('led') || name.includes('spot')) return 'light';
  if (name.includes('scene') || name.includes('remote') || name.includes('controller')) return 'scene';
  if (name.includes('button') || name.includes('knob')) return 'button';
  
  return 'default';
}

// SVG pour icône selon type
function getIconSVG(type, size) {
  const iconSize = size * 0.15; // 15% de la taille
  const x = size / 2;
  const y = size / 2;
  
  switch(type) {
    case 'motion':
      return `<circle cx="${x}" cy="${y - iconSize * 0.8}" r="${iconSize * 0.3}" fill="white"/>
              <path d="M ${x - iconSize} ${y} Q ${x} ${y - iconSize * 1.5}, ${x + iconSize} ${y}" stroke="white" stroke-width="${iconSize * 0.2}" fill="none"/>
              <path d="M ${x - iconSize * 1.5} ${y + iconSize * 0.5} Q ${x} ${y - iconSize}, ${x + iconSize * 1.5} ${y + iconSize * 0.5}" stroke="white" stroke-width="${iconSize * 0.2}" fill="none"/>`;
    
    case 'temperature':
      return `<rect x="${x - iconSize * 0.25}" y="${y - iconSize * 1.2}" width="${iconSize * 0.5}" height="${iconSize * 1.8}" rx="${iconSize * 0.25}" fill="white"/>
              <circle cx="${x}" cy="${y + iconSize * 0.8}" r="${iconSize * 0.6}" fill="white"/>`;
    
    case 'humidity':
      return `<path d="M ${x} ${y - iconSize * 1.2} Q ${x - iconSize} ${y}, ${x} ${y + iconSize * 1.2} Q ${x + iconSize} ${y}, ${x} ${y - iconSize * 1.2}" fill="white"/>`;
    
    case 'contact':
      return `<rect x="${x - iconSize * 1.2}" y="${y - iconSize * 1}" width="${iconSize * 0.8}" height="${iconSize * 2}" rx="${iconSize * 0.1}" fill="white"/>
              <rect x="${x + iconSize * 0.4}" y="${y - iconSize * 1}" width="${iconSize * 0.8}" height="${iconSize * 2}" rx="${iconSize * 0.1}" fill="white"/>`;
    
    case 'smoke':
      return `<circle cx="${x}" cy="${y + iconSize}" r="${iconSize * 0.8}" fill="white"/>
              <path d="M ${x - iconSize * 0.5} ${y - iconSize} Q ${x} ${y - iconSize * 1.5}, ${x + iconSize * 0.5} ${y - iconSize}" stroke="white" stroke-width="${iconSize * 0.3}" fill="none"/>
              <path d="M ${x} ${y - iconSize} Q ${x - iconSize * 0.3} ${y - iconSize * 1.2}, ${x} ${y - iconSize * 0.5}" stroke="white" stroke-width="${iconSize * 0.3}" fill="none"/>`;
    
    case 'plug':
      // 3 plugs comme dans l'image
      return `<rect x="${x - iconSize * 1.2}" y="${y - iconSize * 0.8}" width="${iconSize * 0.6}" height="${iconSize * 1.6}" rx="${iconSize * 0.1}" fill="white"/>
              <rect x="${x - iconSize * 0.3}" y="${y - iconSize * 0.8}" width="${iconSize * 0.6}" height="${iconSize * 1.6}" rx="${iconSize * 0.1}" fill="white"/>
              <rect x="${x + iconSize * 0.6}" y="${y - iconSize * 0.8}" width="${iconSize * 0.6}" height="${iconSize * 1.6}" rx="${iconSize * 0.1}" fill="white"/>`;
    
    case 'switch':
      return `<rect x="${x - iconSize}" y="${y - iconSize * 0.6}" width="${iconSize * 2}" height="${iconSize * 1.2}" rx="${iconSize * 0.6}" fill="white" opacity="0.3"/>
              <circle cx="${x + iconSize * 0.5}" cy="${y}" r="${iconSize * 0.5}" fill="white"/>`;
    
    case 'light':
      return `<circle cx="${x}" cy="${y}" r="${iconSize * 0.6}" fill="white"/>
              <line x1="${x}" y1="${y - iconSize * 1.2}" x2="${x}" y2="${y - iconSize * 1.8}" stroke="white" stroke-width="${iconSize * 0.15}"/>
              <line x1="${x + iconSize * 0.85}" y1="${y - iconSize * 0.85}" x2="${x + iconSize * 1.27}" y2="${y - iconSize * 1.27}" stroke="white" stroke-width="${iconSize * 0.15}"/>
              <line x1="${x + iconSize * 1.2}" y1="${y}" x2="${x + iconSize * 1.8}" y2="${y}" stroke="white" stroke-width="${iconSize * 0.15}"/>
              <line x1="${x + iconSize * 0.85}" y1="${y + iconSize * 0.85}" x2="${x + iconSize * 1.27}" y2="${y + iconSize * 1.27}" stroke="white" stroke-width="${iconSize * 0.15}"/>`;
    
    case 'curtain':
      return `<line x1="${x - iconSize}" y1="${y - iconSize * 1.2}" x2="${x + iconSize}" y2="${y - iconSize * 1.2}" stroke="white" stroke-width="${iconSize * 0.2}"/>
              <path d="M ${x - iconSize * 0.8} ${y - iconSize * 1.2} Q ${x - iconSize * 0.8} ${y}, ${x - iconSize * 0.5} ${y + iconSize * 1.2}" stroke="white" stroke-width="${iconSize * 0.3}" fill="none"/>
              <path d="M ${x + iconSize * 0.8} ${y - iconSize * 1.2} Q ${x + iconSize * 0.8} ${y}, ${x + iconSize * 0.5} ${y + iconSize * 1.2}" stroke="white" stroke-width="${iconSize * 0.3}" fill="none"/>`;
    
    default:
      return `<circle cx="${x}" cy="${y}" r="${iconSize}" fill="white"/>`;
  }
}

// Générer SVG professionnel
function generateProfessionalSVG(driverName, size) {
  const type = getDeviceType(driverName);
  const colors = COLOR_SCHEMES[type] || COLOR_SCHEMES.default;
  
  const isBattery = driverName.includes('battery') || driverName.includes('cr2032') || driverName.includes('cr2450');
  const badgeText = isBattery ? 'BATT' : colors.badge;
  
  const centerX = size / 2;
  const centerY = size / 2;
  const circleRadius = size * 0.35;
  const badgeSize = size * 0.15;
  const badgeX = size - badgeSize - (size * 0.05);
  const badgeY = size - badgeSize - (size * 0.05);
  
  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg-${driverName}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${colors.bg};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${colors.bg};stop-opacity:0.8" />
    </linearGradient>
    
    <filter id="shadow">
      <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
      <feOffset dx="0" dy="2" result="offsetblur"/>
      <feComponentTransfer>
        <feFuncA type="linear" slope="0.3"/>
      </feComponentTransfer>
      <feMerge>
        <feMergeNode/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  
  <!-- Background -->
  <rect width="${size}" height="${size}" fill="url(#bg-${driverName})" rx="${size * 0.05}"/>
  
  <!-- Central Circle -->
  <circle cx="${centerX}" cy="${centerY}" r="${circleRadius}" 
          fill="${colors.circle}" 
          filter="url(#shadow)"/>
  
  <!-- Icon inside circle -->
  ${getIconSVG(type, size)}
  
  <!-- Badge -->
  <circle cx="${badgeX}" cy="${badgeY}" r="${badgeSize}" 
          fill="#E53935" 
          filter="url(#shadow)"/>
  <text x="${badgeX}" y="${badgeY + badgeSize * 0.15}" 
        font-family="Arial, sans-serif" 
        font-size="${badgeSize * 0.35}" 
        font-weight="bold" 
        fill="white" 
        text-anchor="middle">${badgeText}</text>
</svg>`;
}

// Générer images pour un driver
async function generateDriverImages(driverPath, driverName) {
  const assetsPath = path.join(driverPath, 'assets');
  
  if (!fs.existsSync(assetsPath)) {
    fs.mkdirSync(assetsPath, { recursive: true });
  }
  
  try {
    // Small 75×75
    const svgSmall = generateProfessionalSVG(driverName, 75);
    await sharp(Buffer.from(svgSmall))
      .resize(75, 75)
      .png()
      .toFile(path.join(assetsPath, 'small.png'));
    
    // Large 500×500
    const svgLarge = generateProfessionalSVG(driverName, 500);
    await sharp(Buffer.from(svgLarge))
      .resize(500, 500)
      .png()
      .toFile(path.join(assetsPath, 'large.png'));
    
    // XLarge 1000×1000
    const svgXLarge = generateProfessionalSVG(driverName, 1000);
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
  
  const drivers = fs.readdirSync(driversDir).filter(d =>
    fs.statSync(path.join(driversDir, d)).isDirectory()
  );
  
  console.log(`📦 ${drivers.length} drivers trouvés\n`);
  console.log('🎨 Génération images professionnelles...\n');
  
  let success = 0;
  
  for (const driver of drivers) {
    const driverPath = path.join(driversDir, driver);
    const result = await generateDriverImages(driverPath, driver);
    
    if (result) {
      const type = getDeviceType(driver);
      const colors = COLOR_SCHEMES[type] || COLOR_SCHEMES.default;
      console.log(`   ✅ ${driver} (${colors.badge})`);
      success++;
    }
  }
  
  console.log('');
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║              GÉNÉRATION TERMINÉE                       ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
  
  console.log(`   ✅ Succès: ${success}/${drivers.length}`);
  console.log(`   🎨 Style: Material Design professionnel`);
  console.log(`   📊 Total images: ${success * 3} PNG\n`);
  
  console.log('✨ Design inspiré de l\'image turquoise avec cercle central!\n');
}

main().catch(console.error);
