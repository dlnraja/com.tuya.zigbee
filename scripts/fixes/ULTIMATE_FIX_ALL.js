const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

console.log('🎯 ULTIMATE FIX - RÉSOLUTION TOTALE\n');
console.log('='.repeat(60) + '\n');

// PHASE 1: Vérifier et créer images manquantes
console.log('📦 PHASE 1: Vérification images...\n');

const driversPath = path.join(__dirname, 'drivers');
const drivers = fs.readdirSync(driversPath).filter(d => 
  fs.statSync(path.join(driversPath, d)).isDirectory()
);

const categoryColors = {
  motion: '#FF5722', temperature: '#FF9800', contact: '#2196F3',
  plug: '#4CAF50', switch: '#9C27B0', light: '#FFEB3B',
  curtain: '#00BCD4', smoke: '#F44336', water: '#03A9F4',
  soil: '#795548', radar: '#E91E63', sos: '#D32F2F',
  default: '#607D8B'
};

function getDriverColor(name) {
  if (name.includes('motion') || name.includes('pir')) return categoryColors.motion;
  if (name.includes('temp') || name.includes('humid')) return categoryColors.temperature;
  if (name.includes('contact') || name.includes('door')) return categoryColors.contact;
  if (name.includes('plug') || name.includes('outlet')) return categoryColors.plug;
  if (name.includes('switch')) return categoryColors.switch;
  if (name.includes('light') || name.includes('bulb')) return categoryColors.light;
  if (name.includes('curtain')) return categoryColors.curtain;
  if (name.includes('smoke')) return categoryColors.smoke;
  if (name.includes('water') || name.includes('leak')) return categoryColors.water;
  if (name.includes('soil')) return categoryColors.soil;
  if (name.includes('radar')) return categoryColors.radar;
  if (name.includes('sos')) return categoryColors.sos;
  return categoryColors.default;
}

function getDriverIcon(name) {
  if (name.includes('motion') || name.includes('pir')) return '🚶';
  if (name.includes('temp')) return '🌡️';
  if (name.includes('contact') || name.includes('door')) return '🚪';
  if (name.includes('plug')) return '🔌';
  if (name.includes('switch')) return '💡';
  if (name.includes('curtain')) return '🪟';
  if (name.includes('smoke')) return '🔥';
  if (name.includes('water')) return '💧';
  if (name.includes('soil')) return '🌱';
  if (name.includes('radar')) return '📡';
  if (name.includes('sos')) return '🆘';
  return 'Z';
}

let imagesCreated = 0;
let imagesExist = 0;

for (const driver of drivers) {
  const imagesPath = path.join(driversPath, driver, 'assets', 'images');
  const smallPath = path.join(imagesPath, 'small.png');
  const largePath = path.join(imagesPath, 'large.png');
  
  if (!fs.existsSync(smallPath) || !fs.existsSync(largePath)) {
    fs.mkdirSync(imagesPath, { recursive: true });
    
    const color = getDriverColor(driver);
    const icon = getDriverIcon(driver);
    
    // Small 75x75
    if (!fs.existsSync(smallPath)) {
      let canvas = createCanvas(75, 75);
      let ctx = canvas.getContext('2d');
      const gradient = ctx.createLinearGradient(0, 0, 75, 75);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, color + '99');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 75, 75);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 32px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(icon, 37.5, 37.5);
      fs.writeFileSync(smallPath, canvas.toBuffer('image/png'));
      imagesCreated++;
    }
    
    // Large 500x500
    if (!fs.existsSync(largePath)) {
      let canvas = createCanvas(500, 500);
      let ctx = canvas.getContext('2d');
      const gradient = ctx.createLinearGradient(0, 0, 500, 500);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, color + '99');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 500, 500);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 200px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(icon, 250, 250);
      ctx.font = 'bold 24px Arial';
      ctx.fillText(String(driver).replace(/_/g, ' ').substring(0, 30), 250, 450);
      fs.writeFileSync(largePath, canvas.toBuffer('image/png'));
      imagesCreated++;
    }
  } else {
    imagesExist += 2;
  }
}

console.log(`✅ Images: ${imagesExist} existent, ${imagesCreated} créées\n`);

// PHASE 2: Vérifier déclarations app.json
console.log('📋 PHASE 2: Vérification déclarations...\n');

const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));

let declAdded = 0;
for (const [name, driver] of Object.entries(appJson.drivers || {})) {
  if (!driver.images) {
    driver.images = {
      small: "./assets/images/small.png",
      large: "./assets/images/large.png"
    };
    declAdded++;
  }
}

if (declAdded > 0) {
  fs.writeFileSync('app.json', JSON.stringify(appJson, null, 2));
  console.log(`✅ ${declAdded} déclarations ajoutées\n`);
} else {
  console.log(`✅ Toutes les déclarations présentes\n`);
}

// PHASE 3: Fix flow warnings (titleFormatted)
console.log('⚠️  PHASE 3: Fix flow warnings...\n');

let flowsFixed = 0;
if (appJson.flow && appJson.flow.actions) {
  appJson.flow.actions.forEach(action => {
    if ((action.id === 'send_battery_report' || action.id === 'battery_maintenance_mode') && !action.titleFormatted) {
      action.titleFormatted = action.title;
      flowsFixed++;
    }
  });
  
  if (flowsFixed > 0) {
    fs.writeFileSync('app.json', JSON.stringify(appJson, null, 2));
    console.log(`✅ ${flowsFixed} flows corrigés\n`);
  } else {
    console.log(`✅ Tous les flows OK\n`);
  }
}

// RÉSUMÉ
console.log('='.repeat(60));
console.log('✅ RÉSOLUTION COMPLÈTE:\n');
console.log(`   Images créées: ${imagesCreated}`);
console.log(`   Déclarations: ${declAdded > 0 ? declAdded + ' ajoutées' : 'OK'}`);
console.log(`   Flows: ${flowsFixed > 0 ? flowsFixed + ' fixés' : 'OK'}`);
console.log('='.repeat(60) + '\n');
