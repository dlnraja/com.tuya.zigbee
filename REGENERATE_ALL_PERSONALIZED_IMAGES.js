const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

console.log('🎨 RÉGÉNÉRATION COMPLÈTE - IMAGES PERSONNALISÉES\n');
console.log('='repeat(60) + '\n');

const driversPath = path.join(__dirname, 'drivers');
const drivers = fs.readdirSync(driversPath).filter(d => 
  fs.statSync(path.join(driversPath, d)).isDirectory()
);

// Couleurs par catégorie de device
const categoryColors = {
  motion: '#FF5722',      // Rouge-orange
  temperature: '#FF9800', // Orange
  contact: '#2196F3',     // Bleu
  plug: '#4CAF50',        // Vert
  switch: '#9C27B0',      // Violet
  light: '#FFEB3B',       // Jaune
  curtain: '#00BCD4',     // Cyan
  smoke: '#F44336',       // Rouge
  water: '#03A9F4',       // Bleu clair
  soil: '#795548',        // Marron
  radar: '#E91E63',       // Rose
  sos: '#D32F2F',         // Rouge foncé
  default: '#607D8B'      // Gris-bleu
};

function getDriverColor(driverName) {
  if (driverName.includes('motion') || driverName.includes('pir')) return categoryColors.motion;
  if (driverName.includes('temperature') || driverName.includes('temp') || driverName.includes('humid')) return categoryColors.temperature;
  if (driverName.includes('contact') || driverName.includes('door') || driverName.includes('window')) return categoryColors.contact;
  if (driverName.includes('plug') || driverName.includes('outlet') || driverName.includes('socket')) return categoryColors.plug;
  if (driverName.includes('switch') || driverName.includes('wall')) return categoryColors.switch;
  if (driverName.includes('bulb') || driverName.includes('light') || driverName.includes('led') || driverName.includes('rgb')) return categoryColors.light;
  if (driverName.includes('curtain') || driverName.includes('blind') || driverName.includes('shade')) return categoryColors.curtain;
  if (driverName.includes('smoke') || driverName.includes('fire')) return categoryColors.smoke;
  if (driverName.includes('water') || driverName.includes('leak') || driverName.includes('flood')) return categoryColors.water;
  if (driverName.includes('soil') || driverName.includes('moisture')) return categoryColors.soil;
  if (driverName.includes('radar') || driverName.includes('presence')) return categoryColors.radar;
  if (driverName.includes('sos') || driverName.includes('emergency')) return categoryColors.sos;
  return categoryColors.default;
}

function getDriverIcon(driverName) {
  if (driverName.includes('motion') || driverName.includes('pir')) return '🚶';
  if (driverName.includes('temperature') || driverName.includes('temp')) return '🌡️';
  if (driverName.includes('humid')) return '💧';
  if (driverName.includes('contact') || driverName.includes('door')) return '🚪';
  if (driverName.includes('plug') || driverName.includes('outlet')) return '🔌';
  if (driverName.includes('switch')) return '💡';
  if (driverName.includes('light') || driverName.includes('bulb')) return '💡';
  if (driverName.includes('curtain') || driverName.includes('blind')) return '🪟';
  if (driverName.includes('smoke')) return '🔥';
  if (driverName.includes('water') || driverName.includes('leak')) return '💧';
  if (driverName.includes('soil')) return '🌱';
  if (driverName.includes('radar')) return '📡';
  if (driverName.includes('sos')) return '🆘';
  return 'Z';
}

let created = 0;
let total = drivers.length * 2; // small + large

console.log(`📦 ${drivers.length} drivers à traiter\n`);

for (const driver of drivers) {
  const imagesPath = path.join(driversPath, driver, 'assets', 'images');
  
  // Créer dossier
  fs.mkdirSync(imagesPath, { recursive: true });
  
  const color = getDriverColor(driver);
  const icon = getDriverIcon(driver);
  
  // Small 75x75
  let canvas = createCanvas(75, 75);
  let ctx = canvas.getContext('2d');
  
  // Gradient background
  const gradient = ctx.createLinearGradient(0, 0, 75, 75);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, color + '99');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 75, 75);
  
  // Icon
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 32px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(icon, 37.5, 37.5);
  
  fs.writeFileSync(path.join(imagesPath, 'small.png'), canvas.toBuffer('image/png'));
  created++;
  
  // Large 500x500
  canvas = createCanvas(500, 500);
  ctx = canvas.getContext('2d');
  
  // Gradient background
  const gradient2 = ctx.createLinearGradient(0, 0, 500, 500);
  gradient2.addColorStop(0, color);
  gradient2.addColorStop(1, color + '99');
  ctx.fillStyle = gradient2;
  ctx.fillRect(0, 0, 500, 500);
  
  // Icon
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 200px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(icon, 250, 250);
  
  // Driver name
  ctx.font = 'bold 24px Arial';
  ctx.fillText(driver.replace(/_/g, ' ').substring(0, 30), 250, 450);
  
  fs.writeFileSync(path.join(imagesPath, 'large.png'), canvas.toBuffer('image/png'));
  created++;
  
  if (created % 50 === 0) {
    console.log(`  Progress: ${created}/${total} images...`);
  }
}

console.log(`\n✅ ${created} images personnalisées créées!`);
console.log(`   ${drivers.length} drivers avec icônes uniques\n`);
