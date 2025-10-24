#!/usr/bin/env node

/**
 * 🎨 FIX ALL IMAGES - COMPLET & PERSONNALISÉ
 * 
 * Génère des images SVG personnalisées et de qualité pour TOUS les drivers:
 * - Couleurs par catégorie (Johan Bendz)
 * - Emojis contextuels
 * - Gradients professionnels
 * - Labels personnalisés
 * - Toutes tailles (small 75x75, large 500x500, xlarge 1000x1000)
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '../../drivers');

// 🎨 Couleurs par catégorie + emojis
const CATEGORY_THEMES = {
  // Motion & Sensors
  motion: { from: '#2196F3', to: '#03A9F4', emoji: '🚶‍♂️', name: 'Motion' },
  presence: { from: '#2196F3', to: '#03A9F4', emoji: '👤', name: 'Presence' },
  pir: { from: '#2196F3', to: '#03A9F4', emoji: '👁️', name: 'PIR Sensor' },
  radar: { from: '#2196F3', to: '#03A9F4', emoji: '📡', name: 'Radar' },
  mmwave: { from: '#2196F3', to: '#03A9F4', emoji: '〰️', name: 'mmWave' },
  
  // Contact & Security
  contact: { from: '#9C27B0', to: '#673AB7', emoji: '🚪', name: 'Contact' },
  door: { from: '#9C27B0', to: '#673AB7', emoji: '🚪', name: 'Door' },
  window: { from: '#9C27B0', to: '#673AB7', emoji: '🪟', name: 'Window' },
  lock: { from: '#F44336', to: '#E91E63', emoji: '🔒', name: 'Lock' },
  
  // Buttons & Controllers
  button: { from: '#4CAF50', to: '#8BC34A', emoji: '🔘', name: 'Button' },
  remote: { from: '#4CAF50', to: '#8BC34A', emoji: '📱', name: 'Remote' },
  wireless: { from: '#4CAF50', to: '#8BC34A', emoji: '📡', name: 'Wireless' },
  scene: { from: '#4CAF50', to: '#8BC34A', emoji: '🎬', name: 'Scene' },
  emergency: { from: '#F44336', to: '#E91E63', emoji: '🆘', name: 'SOS' },
  sos: { from: '#F44336', to: '#E91E63', emoji: '🆘', name: 'Emergency' },
  
  // Switches
  switch: { from: '#4CAF50', to: '#8BC34A', emoji: '💡', name: 'Switch' },
  wall: { from: '#4CAF50', to: '#8BC34A', emoji: '⚡', name: 'Wall Switch' },
  touch: { from: '#4CAF50', to: '#8BC34A', emoji: '👆', name: 'Touch' },
  
  // Lighting
  light: { from: '#FFD700', to: '#FFA500', emoji: '💡', name: 'Light' },
  bulb: { from: '#FFD700', to: '#FFA500', emoji: '💡', name: 'Bulb' },
  led: { from: '#FFD700', to: '#FFA500', emoji: '🌈', name: 'LED' },
  strip: { from: '#FFD700', to: '#FFA500', emoji: '➖', name: 'LED Strip' },
  rgb: { from: '#FFD700', to: '#FFA500', emoji: '🌈', name: 'RGB' },
  dimmer: { from: '#FFD700', to: '#FFA500', emoji: '🔅', name: 'Dimmer' },
  
  // Plugs & Energy
  plug: { from: '#9C27B0', to: '#673AB7', emoji: '🔌', name: 'Plug' },
  socket: { from: '#9C27B0', to: '#673AB7', emoji: '🔌', name: 'Socket' },
  outlet: { from: '#9C27B0', to: '#673AB7', emoji: '⚡', name: 'Outlet' },
  usb: { from: '#9C27B0', to: '#673AB7', emoji: '🔌', name: 'USB' },
  energy: { from: '#9C27B0', to: '#673AB7', emoji: '⚡', name: 'Energy' },
  power: { from: '#9C27B0', to: '#673AB7', emoji: '⚡', name: 'Power' },
  
  // Climate
  climate: { from: '#FF9800', to: '#FF5722', emoji: '🌡️', name: 'Climate' },
  temperature: { from: '#FF9800', to: '#FF5722', emoji: '🌡️', name: 'Temperature' },
  humidity: { from: '#FF9800', to: '#FF5722', emoji: '💧', name: 'Humidity' },
  thermostat: { from: '#FF9800', to: '#FF5722', emoji: '🌡️', name: 'Thermostat' },
  temp: { from: '#FF9800', to: '#FF5722', emoji: '🌡️', name: 'Temp' },
  
  // Safety
  smoke: { from: '#F44336', to: '#E91E63', emoji: '🚨', name: 'Smoke' },
  fire: { from: '#F44336', to: '#E91E63', emoji: '🔥', name: 'Fire' },
  water: { from: '#2196F3', to: '#03A9F4', emoji: '💧', name: 'Water' },
  leak: { from: '#2196F3', to: '#03A9F4', emoji: '💧', name: 'Leak' },
  gas: { from: '#FF9800', to: '#FF5722', emoji: '💨', name: 'Gas' },
  
  // Covers
  curtain: { from: '#607D8B', to: '#78909C', emoji: '🪟', name: 'Curtain' },
  blind: { from: '#607D8B', to: '#78909C', emoji: '🪟', name: 'Blind' },
  shutter: { from: '#607D8B', to: '#78909C', emoji: '🪟', name: 'Shutter' },
  roller: { from: '#607D8B', to: '#78909C', emoji: '🪟', name: 'Roller' },
  
  // Valves
  valve: { from: '#2196F3', to: '#03A9F4', emoji: '🚰', name: 'Valve' },
  
  // Air Quality
  air: { from: '#4CAF50', to: '#8BC34A', emoji: '💨', name: 'Air Quality' },
  co2: { from: '#4CAF50', to: '#8BC34A', emoji: '💨', name: 'CO2' },
  
  // Doorbell
  doorbell: { from: '#FF9800', to: '#FF5722', emoji: '🔔', name: 'Doorbell' },
  
  // Module
  module: { from: '#607D8B', to: '#78909C', emoji: '📦', name: 'Module' },
  
  // Default
  default: { from: '#607D8B', to: '#78909C', emoji: '📱', name: 'Device' }
};

function detectCategory(driverId) {
  const id = driverId.toLowerCase();
  
  // Chercher le match le plus spécifique
  for (const [key, theme] of Object.entries(CATEGORY_THEMES)) {
    if (id.includes(key)) {
      return theme;
    }
  }
  
  return CATEGORY_THEMES.default;
}

function generateBeautifulSVG(driverId, size, theme) {
  const fontSize = size === 75 ? 8 : size / 12;
  const emojiSize = size === 75 ? 35 : size / 2.5;
  const padding = size / 10;
  const cornerRadius = size / 12;
  
  // Nom personnalisé basé sur driver ID
  const displayName = driverId
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  // Pour small.svg, ne pas afficher le texte (trop petit)
  const showText = size >= 500;
  
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="grad-${driverId}-${size}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${theme.from};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${theme.to};stop-opacity:1" />
    </linearGradient>
    <filter id="shadow-${driverId}-${size}">
      <feGaussianBlur in="SourceAlpha" stdDeviation="${size/50}"/>
      <feOffset dx="0" dy="${size/50}" result="offsetblur"/>
      <feComponentTransfer>
        <feFuncA type="linear" slope="0.3"/>
      </feComponentTransfer>
      <feMerge>
        <feMergeNode/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  
  <!-- Background with gradient -->
  <rect width="${size}" height="${size}" fill="url(#grad-${driverId}-${size})" rx="${cornerRadius}"/>
  
  <!-- Emoji Icon -->
  <text x="50%" y="${showText ? '40%' : '50%'}" font-size="${emojiSize}" text-anchor="middle" dominant-baseline="middle" filter="url(#shadow-${driverId}-${size})">${theme.emoji}</text>
  
  ${showText ? `<!-- Device Name -->
  <text x="50%" y="75%" font-size="${fontSize}" fill="white" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif" font-weight="600" opacity="0.95">${displayName.length > 30 ? displayName.substring(0, 27) + '...' : displayName}</text>` : ''}
</svg>`;
}

function fixAllImages() {
  console.log('🎨 FIX ALL IMAGES - COMPLET & PERSONNALISÉ\n');
  console.log('Génération d\'images SVG de qualité pour tous les drivers...\n');
  
  const drivers = fs.readdirSync(DRIVERS_DIR).filter(d => 
    fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory()
  );
  
  let fixed = 0;
  let created = 0;
  
  for (const driverId of drivers) {
    const assetsPath = path.join(DRIVERS_DIR, driverId, 'assets/images');
    
    // Créer le dossier si nécessaire
    if (!fs.existsSync(assetsPath)) {
      fs.mkdirSync(assetsPath, { recursive: true });
      console.log(`  📁 Created: ${driverId}/assets/images`);
    }
    
    // Déterminer le thème
    const theme = detectCategory(driverId);
    
    // Générer toutes les tailles
    const sizes = [
      { name: 'small', size: 75 },
      { name: 'large', size: 500 },
      { name: 'xlarge', size: 1000 }
    ];
    
    let driverFixed = false;
    
    for (const { name, size } of sizes) {
      const svgPath = path.join(assetsPath, `${name}.svg`);
      const svg = generateBeautifulSVG(driverId, size, theme);
      
      fs.writeFileSync(svgPath, svg, 'utf8');
      driverFixed = true;
      created++;
    }
    
    if (driverFixed) {
      console.log(`✅ ${driverId}: 3 SVG créées (${theme.emoji} ${theme.name})`);
      fixed++;
    }
  }
  
  console.log('\n' + '='.repeat(70));
  console.log(`📊 RÉSULTAT:`);
  console.log(`  Drivers traités: ${drivers.length}`);
  console.log(`  Drivers avec images fixées: ${fixed}`);
  console.log(`  Images SVG créées: ${created}`);
  console.log('='.repeat(70));
  console.log('\n✅ Toutes les images sont maintenant personnalisées et de qualité!');
  console.log('🎨 Couleurs Johan Bendz appliquées');
  console.log('💎 SVG vectoriels (redimensionnables sans perte)');
  console.log('🌈 Gradients professionnels');
  console.log('😊 Emojis contextuels');
}

// Exécution
try {
  fixAllImages();
} catch (err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
}
