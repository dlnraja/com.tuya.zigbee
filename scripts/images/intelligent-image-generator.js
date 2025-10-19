#!/usr/bin/env node

/**
 * INTELLIGENT IMAGE GENERATOR - Génération personnalisée selon specs Homey SDK3
 * 
 * SPECS CRITIQUES (découvertes 18 Oct 2025):
 * - Driver images: 75x75, 500x500, 1000x1000
 * - Personnalisation par type d'appareil
 * - Overlays batterie/AC/DC
 * - Couleurs selon catégorie
 * - Texte contextualisé
 * 
 * Usage: node scripts/images/intelligent-image-generator.js [driver_id]
 */

const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage, registerFont } = require('canvas');

const PROJECT_ROOT = path.join(__dirname, '..', '..');
const DRIVERS_DIR = path.join(PROJECT_ROOT, 'drivers');
const APP_JSON_PATH = path.join(PROJECT_ROOT, 'app.json');

// SPECS HOMEY SDK3 - Driver images
const IMAGE_SPECS = {
  small: { width: 75, height: 75 },
  large: { width: 500, height: 500 },
  xlarge: { width: 1000, height: 1000 }
};

// Détection type d'appareil et personnalisation
const DEVICE_TYPES = {
  // Capteurs
  sensor: {
    color: '#4CAF50',
    icon: '📊',
    gradient: ['#66BB6A', '#43A047'],
    keywords: ['sensor', 'detector', 'monitor']
  },
  motion: {
    color: '#2196F3',
    icon: '🏃',
    gradient: ['#42A5F5', '#1E88E5'],
    keywords: ['motion', 'pir', 'radar', 'presence']
  },
  contact: {
    color: '#FF9800',
    icon: '🚪',
    gradient: ['#FFA726', '#FB8C00'],
    keywords: ['contact', 'door', 'window', 'opening']
  },
  
  // Contrôleurs
  switch: {
    color: '#9C27B0',
    icon: '🎚️',
    gradient: ['#AB47BC', '#8E24AA'],
    keywords: ['switch', 'relay', 'controller']
  },
  light: {
    color: '#FFEB3B',
    icon: '💡',
    gradient: ['#FFEE58', '#FDD835'],
    keywords: ['light', 'bulb', 'lamp', 'led']
  },
  dimmer: {
    color: '#FFC107',
    icon: '🔆',
    gradient: ['#FFCA28', '#FFB300'],
    keywords: ['dimmer', 'brightness']
  },
  
  // Sécurité
  alarm: {
    color: '#F44336',
    icon: '🚨',
    gradient: ['#EF5350', '#E53935'],
    keywords: ['alarm', 'siren', 'warning']
  },
  smoke: {
    color: '#607D8B',
    icon: '💨',
    gradient: ['#78909C', '#546E7A'],
    keywords: ['smoke', 'gas', 'co']
  },
  water: {
    color: '#03A9F4',
    icon: '💧',
    gradient: ['#29B6F6', '#039BE5'],
    keywords: ['water', 'leak', 'flood']
  },
  
  // Environnement
  temperature: {
    color: '#E91E63',
    icon: '🌡️',
    gradient: ['#EC407A', '#D81B60'],
    keywords: ['temperature', 'temp', 'thermostat']
  },
  humidity: {
    color: '#00BCD4',
    icon: '💦',
    gradient: ['#26C6DA', '#00ACC1'],
    keywords: ['humidity', 'moisture']
  },
  airquality: {
    color: '#8BC34A',
    icon: '🌿',
    gradient: ['#9CCC65', '#7CB342'],
    keywords: ['air', 'quality', 'voc', 'co2']
  },
  
  // Contrôle
  remote: {
    color: '#673AB7',
    icon: '📱',
    gradient: ['#7E57C2', '#5E35B1'],
    keywords: ['remote', 'button', 'scene', 'controller']
  },
  curtain: {
    color: '#795548',
    icon: '🪟',
    gradient: ['#8D6E63', '#6D4C41'],
    keywords: ['curtain', 'blind', 'shade', 'roller']
  },
  
  // Défaut
  default: {
    color: '#607D8B',
    icon: '🔌',
    gradient: ['#78909C', '#546E7A'],
    keywords: []
  }
};

// Types d'alimentation
const POWER_TYPES = {
  battery: {
    icon: '🔋',
    color: '#4CAF50',
    label: 'Battery',
    keywords: ['battery', 'cr2032', 'cr2450', 'aaa', 'rechargeable']
  },
  ac: {
    icon: '⚡',
    color: '#FF9800',
    label: 'AC Power',
    keywords: ['ac', 'mains', 'powered', '230v', '110v']
  },
  dc: {
    icon: '🔌',
    color: '#2196F3',
    label: 'DC Power',
    keywords: ['dc', '12v', '24v', 'adapter']
  },
  hybrid: {
    icon: '🔄',
    color: '#9C27B0',
    label: 'Hybrid',
    keywords: ['hybrid', 'backup', 'dual']
  },
  usb: {
    icon: '🔌',
    color: '#00BCD4',
    label: 'USB',
    keywords: ['usb', 'usb-c']
  }
};

/**
 * Détecter type d'appareil depuis driver info
 */
function detectDeviceType(driver) {
  const searchText = `${driver.id} ${driver.name?.en || ''} ${driver.class || ''}`.toLowerCase();
  
  for (const [type, config] of Object.entries(DEVICE_TYPES)) {
    if (config.keywords.some(keyword => searchText.includes(keyword))) {
      return { type, ...config };
    }
  }
  
  return { type: 'default', ...DEVICE_TYPES.default };
}

/**
 * Détecter type d'alimentation
 */
function detectPowerType(driver) {
  const searchText = `${driver.id} ${driver.name?.en || ''}`.toLowerCase();
  
  for (const [type, config] of Object.entries(POWER_TYPES)) {
    if (config.keywords.some(keyword => searchText.includes(keyword))) {
      return { type, ...config };
    }
  }
  
  // Par défaut: AC si pas batterie dans le nom
  return searchText.includes('battery') || searchText.includes('cr2032') 
    ? { type: 'battery', ...POWER_TYPES.battery }
    : { type: 'ac', ...POWER_TYPES.ac };
}

/**
 * Générer image avec personnalisation
 */
async function generateImage(driver, size) {
  const spec = IMAGE_SPECS[size];
  const canvas = createCanvas(spec.width, spec.height);
  const ctx = canvas.getContext('2d');
  
  const deviceType = detectDeviceType(driver);
  const powerType = detectPowerType(driver);
  
  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, spec.width, spec.height);
  gradient.addColorStop(0, deviceType.gradient[0]);
  gradient.addColorStop(1, deviceType.gradient[1]);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, spec.width, spec.height);
  
  // Border radius
  ctx.globalCompositeOperation = 'destination-in';
  ctx.beginPath();
  ctx.roundRect(0, 0, spec.width, spec.height, spec.width * 0.1);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  
  // Icon principal (emoji)
  const iconSize = spec.width * 0.4;
  ctx.font = `${iconSize}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(deviceType.icon, spec.width / 2, spec.height / 2.5);
  
  // Nom appareil (si large ou xlarge)
  if (size !== 'small' && driver.name?.en) {
    const fontSize = spec.width * 0.06;
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.fillStyle = 'white';
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 4;
    
    const name = driver.name.en.length > 20 
      ? driver.name.en.substring(0, 18) + '...'
      : driver.name.en;
    
    ctx.fillText(name, spec.width / 2, spec.height * 0.7);
    ctx.shadowBlur = 0;
  }
  
  // Power type badge (si large ou xlarge)
  if (size !== 'small') {
    const badgeSize = spec.width * 0.12;
    const badgeX = spec.width * 0.85;
    const badgeY = spec.height * 0.15;
    
    // Badge background
    ctx.fillStyle = powerType.color;
    ctx.beginPath();
    ctx.arc(badgeX, badgeY, badgeSize / 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Badge icon
    const badgeIconSize = badgeSize * 0.6;
    ctx.font = `${badgeIconSize}px Arial`;
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(powerType.icon, badgeX, badgeY);
  }
  
  // Tuya/Zigbee badge (xlarge uniquement)
  if (size === 'xlarge') {
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.font = `${spec.width * 0.04}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText('Tuya Zigbee', spec.width / 2, spec.height * 0.9);
  }
  
  return canvas;
}

/**
 * Sauvegarder image
 */
async function saveImage(canvas, outputPath) {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);
}

/**
 * Générer toutes les images pour un driver
 */
async function generateDriverImages(driver) {
  console.log(`\n🎨 Generating images for: ${driver.id}`);
  console.log(`   Type: ${detectDeviceType(driver).type}`);
  console.log(`   Power: ${detectPowerType(driver).label}`);
  
  const driverPath = path.join(DRIVERS_DIR, driver.id);
  const imagesDir = path.join(driverPath, 'assets', 'images');
  
  let generated = 0;
  
  for (const [sizeName, spec] of Object.entries(IMAGE_SPECS)) {
    const outputPath = path.join(imagesDir, `${sizeName}.png`);
    
    try {
      const canvas = await generateImage(driver, sizeName);
      await saveImage(canvas, outputPath);
      console.log(`   ✅ ${sizeName}.png (${spec.width}x${spec.height})`);
      generated++;
    } catch (err) {
      console.error(`   ❌ ${sizeName}.png: ${err.message}`);
    }
  }
  
  return generated;
}

/**
 * Main
 */
async function main() {
  console.log('🖼️  INTELLIGENT IMAGE GENERATOR\n');
  console.log('Based on Homey SDK3 specs (18 Oct 2025 discoveries)\n');
  console.log('Driver images: 75x75, 500x500, 1000x1000');
  console.log('Personalization: device type, power type, colors\n');
  console.log('='.repeat(60));
  
  const app = JSON.parse(fs.readFileSync(APP_JSON_PATH, 'utf8'));
  
  const targetDriver = process.argv[2];
  const driversToProcess = targetDriver
    ? app.drivers.filter(d => d.id === targetDriver)
    : app.drivers;
  
  if (driversToProcess.length === 0) {
    console.error(`\n❌ Driver not found: ${targetDriver}`);
    process.exit(1);
  }
  
  console.log(`\nProcessing ${driversToProcess.length} driver(s)...\n`);
  
  let totalGenerated = 0;
  let errors = 0;
  
  for (const driver of driversToProcess) {
    try {
      const generated = await generateDriverImages(driver);
      totalGenerated += generated;
    } catch (err) {
      console.error(`\n❌ Error for ${driver.id}: ${err.message}`);
      errors++;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY:\n');
  console.log(`  ✅ Images generated: ${totalGenerated}`);
  console.log(`  📁 Drivers processed: ${driversToProcess.length}`);
  console.log(`  ❌ Errors: ${errors}`);
  console.log('='.repeat(60));
  
  if (totalGenerated > 0) {
    console.log('\n🎉 SUCCESS! Driver images generated with personalization\n');
    console.log('Next steps:');
    console.log('  1. Review generated images');
    console.log('  2. npm run validate');
    console.log('  3. git add drivers/*/assets/images/');
    console.log('  4. git commit -m "feat(images): Regenerate with intelligent personalization"');
    console.log('');
  }
}

main().catch(err => {
  console.error('\n❌ Fatal error:', err);
  process.exit(1);
});
