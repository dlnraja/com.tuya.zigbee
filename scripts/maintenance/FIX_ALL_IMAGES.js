#!/usr/bin/env node

/**
 * FIX ALL IMAGES - CORRECTION COMPLÈTE
 * Problème: images small.png drivers en 250x175 au lieu de 75x75
 * Solution: Régénération correcte de toutes les images
 */

const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

const ROOT = path.join(__dirname, '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const ASSETS_DIR = path.join(ROOT, 'assets');

// Palettes de couleurs par catégorie (Johan Bendz standards)
const COLOR_SCHEMES = {
  // Lighting
  lighting: { primary: '#FFD700', secondary: '#FFA500', gradient: ['#FFD700', '#FF8C00'] },
  light: { primary: '#FFD700', secondary: '#FFA500', gradient: ['#FFD700', '#FF8C00'] },
  dimmer: { primary: '#FFB74D', secondary: '#FF9800', gradient: ['#FFB74D', '#F57C00'] },
  rgb: { primary: '#E91E63', secondary: '#9C27B0', gradient: ['#E91E63', '#9C27B0'] },
  
  // Switches & Controls
  switch: { primary: '#4CAF50', secondary: '#8BC34A', gradient: ['#4CAF50', '#66BB6A'] },
  button: { primary: '#4CAF50', secondary: '#8BC34A', gradient: ['#4CAF50', '#66BB6A'] },
  
  // Sensors
  sensor: { primary: '#2196F3', secondary: '#03A9F4', gradient: ['#2196F3', '#00BCD4'] },
  motion: { primary: '#2196F3', secondary: '#03A9F4', gradient: ['#2196F3', '#00BCD4'] },
  pir: { primary: '#2196F3', secondary: '#03A9F4', gradient: ['#2196F3', '#00BCD4'] },
  temperature: { primary: '#FF9800', secondary: '#FF5722', gradient: ['#FF9800', '#FF5722'] },
  humidity: { primary: '#00BCD4', secondary: '#0097A7', gradient: ['#00BCD4', '#0097A7'] },
  air_quality: { primary: '#4CAF50', secondary: '#8BC34A', gradient: ['#4CAF50', '#8BC34A'] },
  
  // Energy
  plug: { primary: '#9C27B0', secondary: '#673AB7', gradient: ['#9C27B0', '#673AB7'] },
  energy: { primary: '#9C27B0', secondary: '#673AB7', gradient: ['#9C27B0', '#673AB7'] },
  
  // Climate
  climate: { primary: '#FF9800', secondary: '#FF5722', gradient: ['#FF9800', '#FF5722'] },
  fan: { primary: '#00BCD4', secondary: '#0097A7', gradient: ['#00BCD4', '#0097A7'] },
  hvac: { primary: '#FF9800', secondary: '#FF5722', gradient: ['#FF9800', '#FF5722'] },
  
  // Safety
  smoke: { primary: '#F44336', secondary: '#E91E63', gradient: ['#F44336', '#E91E63'] },
  gas: { primary: '#F44336', secondary: '#E91E63', gradient: ['#F44336', '#E91E63'] },
  co: { primary: '#F44336', secondary: '#E91E63', gradient: ['#F44336', '#E91E63'] },
  water: { primary: '#2196F3', secondary: '#03A9F4', gradient: ['#2196F3', '#03A9F4'] },
  
  // Access Control
  door: { primary: '#607D8B', secondary: '#455A64', gradient: ['#607D8B', '#455A64'] },
  lock: { primary: '#607D8B', secondary: '#455A64', gradient: ['#607D8B', '#455A64'] },
  curtain: { primary: '#795548', secondary: '#5D4037', gradient: ['#795548', '#5D4037'] },
  
  // Default
  default: { primary: '#607D8B', secondary: '#455A64', gradient: ['#607D8B', '#455A64'] }
};

/**
 * Déterminer la catégorie d'un driver
 */
function getDriverCategory(driverName) {
  const name = driverName.toLowerCase();
  
  // Lighting
  if (name.includes('light') || name.includes('bulb') || name.includes('led')) return 'lighting';
  if (name.includes('dimmer')) return 'dimmer';
  if (name.includes('rgb') || name.includes('color')) return 'rgb';
  
  // Switches
  if (name.includes('switch') || name.includes('button') || name.includes('scene')) return 'switch';
  
  // Sensors
  if (name.includes('motion') || name.includes('pir') || name.includes('mmwave') || name.includes('radar')) return 'motion';
  if (name.includes('temperature') || name.includes('temp')) return 'temperature';
  if (name.includes('humidity')) return 'humidity';
  if (name.includes('air_quality') || name.includes('co2') || name.includes('voc') || name.includes('pm25')) return 'air_quality';
  if (name.includes('sensor') || name.includes('contact') || name.includes('door_window')) return 'sensor';
  
  // Energy
  if (name.includes('plug') || name.includes('socket') || name.includes('outlet') || name.includes('energy')) return 'plug';
  
  // Climate
  if (name.includes('climate') || name.includes('thermostat') || name.includes('hvac')) return 'climate';
  if (name.includes('fan')) return 'fan';
  
  // Safety
  if (name.includes('smoke')) return 'smoke';
  if (name.includes('gas')) return 'gas';
  if (name.includes('co_detector') || name.includes('carbon')) return 'co';
  if (name.includes('water') || name.includes('leak')) return 'water';
  
  // Access
  if (name.includes('door') || name.includes('gate')) return 'door';
  if (name.includes('lock')) return 'lock';
  if (name.includes('curtain') || name.includes('blind') || name.includes('shade')) return 'curtain';
  
  return 'default';
}

/**
 * Créer une image driver 75x75
 */
function createDriverImage(size, driverName, type = 'small') {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  const category = getDriverCategory(driverName);
  const colors = COLOR_SCHEMES[category] || COLOR_SCHEMES.default;
  
  // Background avec gradient
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, colors.gradient[0]);
  gradient.addColorStop(1, colors.gradient[1]);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  
  // Icône centrale (simplifié)
  ctx.fillStyle = 'white';
  ctx.globalAlpha = 0.9;
  
  const center = size / 2;
  const iconSize = size * 0.4;
  
  // Forme selon catégorie
  if (category.includes('light') || category === 'dimmer') {
    // Ampoule
    ctx.beginPath();
    ctx.arc(center, center - iconSize * 0.2, iconSize * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(center - iconSize * 0.15, center + iconSize * 0.1, iconSize * 0.3, iconSize * 0.3);
  } else if (category === 'motion' || category === 'sensor') {
    // Capteur (cercles)
    ctx.beginPath();
    ctx.arc(center, center, iconSize * 0.3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = size * 0.05;
    ctx.beginPath();
    ctx.arc(center, center, iconSize * 0.2, 0, Math.PI * 2);
    ctx.fill();
  } else if (category === 'switch' || category === 'button') {
    // Interrupteur
    ctx.fillRect(center - iconSize * 0.3, center - iconSize * 0.4, iconSize * 0.6, iconSize * 0.8);
    ctx.fillStyle = colors.gradient[0];
    ctx.fillRect(center - iconSize * 0.2, center - iconSize * 0.2, iconSize * 0.4, iconSize * 0.3);
  } else if (category === 'plug') {
    // Prise
    ctx.beginPath();
    ctx.roundRect(center - iconSize * 0.3, center - iconSize * 0.3, iconSize * 0.6, iconSize * 0.6, iconSize * 0.1);
    ctx.fill();
    ctx.fillStyle = colors.gradient[0];
    ctx.fillRect(center - iconSize * 0.15, center - iconSize * 0.1, iconSize * 0.1, iconSize * 0.25);
    ctx.fillRect(center + iconSize * 0.05, center - iconSize * 0.1, iconSize * 0.1, iconSize * 0.25);
  } else {
    // Icône générique (carré arrondi)
    ctx.beginPath();
    ctx.roundRect(center - iconSize * 0.3, center - iconSize * 0.3, iconSize * 0.6, iconSize * 0.6, iconSize * 0.1);
    ctx.fill();
  }
  
  return canvas.toBuffer('image/png');
}

/**
 * Créer le logo de l'application (amélioré)
 */
function createAppLogo(width, height) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  // Background gradient bleu professionnel
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#1E88E5');
  gradient.addColorStop(1, '#1565C0');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  // Logo Zigbee stylisé
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) * 0.35;
  
  ctx.strokeStyle = 'white';
  ctx.fillStyle = 'white';
  ctx.lineWidth = Math.max(2, width * 0.015);
  ctx.globalAlpha = 0.95;
  
  // Cercle central
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius * 0.25, 0, Math.PI * 2);
  ctx.stroke();
  
  // Cercle extérieur
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius * 0.5, 0, Math.PI * 2);
  ctx.stroke();
  
  // 4 lignes connectées (network)
  const angles = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];
  angles.forEach(angle => {
    const x1 = centerX + Math.cos(angle) * radius * 0.25;
    const y1 = centerY + Math.sin(angle) * radius * 0.25;
    const x2 = centerX + Math.cos(angle) * radius * 0.5;
    const y2 = centerY + Math.sin(angle) * radius * 0.5;
    
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    
    // Noeud extérieur
    ctx.beginPath();
    ctx.arc(x2, y2, radius * 0.08, 0, Math.PI * 2);
    ctx.fill();
  });
  
  return canvas.toBuffer('image/png');
}

/**
 * Corriger toutes les images
 */
async function fixAllImages() {
  console.log('🎨 FIX ALL IMAGES - CORRECTION COMPLÈTE\n');
  
  let fixed = 0;
  let errors = 0;
  
  // 1. Corriger le logo de l'application
  try {
    console.log('📱 Correction logo application...');
    
    const smallApp = createAppLogo(250, 175);
    fs.writeFileSync(path.join(ASSETS_DIR, 'images', 'small.png'), smallApp);
    console.log('   ✅ small.png (250x175) créé');
    
    const largeApp = createAppLogo(500, 350);
    fs.writeFileSync(path.join(ASSETS_DIR, 'images', 'large.png'), largeApp);
    console.log('   ✅ large.png (500x350) créé');
    
    const xlargeApp = createAppLogo(1000, 700);
    fs.writeFileSync(path.join(ASSETS_DIR, 'images', 'xlarge.png'), xlargeApp);
    console.log('   ✅ xlarge.png (1000x700) créé');
    
    fixed += 3;
  } catch (err) {
    console.error('   ❌ Erreur logo app:', err.message);
    errors++;
  }
  
  // 2. Corriger toutes les images des drivers
  console.log('\n🔧 Correction images drivers...\n');
  
  const drivers = fs.readdirSync(DRIVERS_DIR).filter(d => {
    const stat = fs.statSync(path.join(DRIVERS_DIR, d));
    return stat.isDirectory() && !d.startsWith('.');
  });
  
  for (const driverName of drivers) {
    try {
      const assetsDir = path.join(DRIVERS_DIR, driverName, 'assets');
      
      // Créer le dossier assets si nécessaire
      if (!fs.existsSync(assetsDir)) {
        fs.mkdirSync(assetsDir, { recursive: true });
      }
      
      // Créer les 3 tailles d'images
      const small = createDriverImage(75, driverName, 'small');
      fs.writeFileSync(path.join(assetsDir, 'small.png'), small);
      
      const large = createDriverImage(500, driverName, 'large');
      fs.writeFileSync(path.join(assetsDir, 'large.png'), large);
      
      const xlarge = createDriverImage(1000, driverName, 'xlarge');
      fs.writeFileSync(path.join(assetsDir, 'xlarge.png'), xlarge);
      
      console.log(`   ✅ ${driverName}: 75x75, 500x500, 1000x1000`);
      fixed += 3;
      
    } catch (err) {
      console.error(`   ❌ ${driverName}:`, err.message);
      errors++;
    }
  }
  
  // 3. Nettoyer le cache Homey
  console.log('\n🧹 Nettoyage cache...');
  const caches = ['.homeybuild', '.homeycompose/app.json'];
  caches.forEach(cache => {
    const cachePath = path.join(ROOT, cache);
    if (fs.existsSync(cachePath)) {
      try {
        if (fs.statSync(cachePath).isDirectory()) {
          fs.rmSync(cachePath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(cachePath);
        }
        console.log(`   ✅ ${cache} supprimé`);
      } catch (err) {
        console.log(`   ⚠️  ${cache}: ${err.message}`);
      }
    }
  });
  
  // Rapport final
  console.log('\n' + '='.repeat(60));
  console.log('📊 RAPPORT FINAL');
  console.log('='.repeat(60));
  console.log(`✅ Images corrigées: ${fixed}`);
  console.log(`❌ Erreurs: ${errors}`);
  console.log(`📁 Drivers traités: ${drivers.length}`);
  console.log('\n🎉 CORRECTION TERMINÉE!\n');
  
  // Rapport JSON
  const report = {
    timestamp: new Date().toISOString(),
    fixed,
    errors,
    drivers: drivers.length,
    categories: Object.keys(COLOR_SCHEMES).length
  };
  
  fs.writeFileSync(
    path.join(ROOT, 'reports', 'IMAGE_FIX_REPORT.json'),
    JSON.stringify(report, null, 2)
  );
  
  return { fixed, errors };
}

// Exécution
if (require.main === module) {
  fixAllImages().catch(err => {
    console.error('❌ ERREUR FATALE:', err);
    process.exit(1);
  });
}

module.exports = { fixAllImages };
