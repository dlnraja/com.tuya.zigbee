#!/usr/bin/env node
'use strict';

/**
 * GENERATE UNIQUE PERSONALIZED IMAGES
 * Crée des images UNIQUES et PERSONNALISÉES pour chaque driver
 * basées sur leur type, classe, et source d'énergie
 */

const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

const ROOT = path.join(__dirname, '..', '..');

// Couleurs par type d'appareil
const DEVICE_COLORS = {
  // Sensors
  motion: { primary: '#FF6B6B', secondary: '#EE5A5A', icon: '👁️' },
  contact: { primary: '#4ECDC4', secondary: '#45B8B0', icon: '🚪' },
  temperature: { primary: '#FF6B35', secondary: '#E85D2F', icon: '🌡️' },
  humidity: { primary: '#5BC0DE', secondary: '#46AECB', icon: '💧' },
  smoke: { primary: '#D32F2F', secondary: '#C62828', icon: '🔥' },
  water: { primary: '#2196F3', secondary: '#1976D2', icon: '💦' },
  air_quality: { primary: '#66BB6A', secondary: '#57A95B', icon: '🌿' },
  vibration: { primary: '#AB47BC', secondary: '#9C39AD', icon: '📳' },
  luminance: { primary: '#FFC107', secondary: '#FFB300', icon: '💡' },
  
  // Switches & Controls
  switch: { primary: '#607D8B', secondary: '#546E7A', icon: '🔘' },
  dimmer: { primary: '#FFA726', secondary: '#FB8C00', icon: '🎚️' },
  plug: { primary: '#26A69A', secondary: '#00897B', icon: '🔌' },
  socket: { primary: '#26A69A', secondary: '#00897B', icon: '⚡' },
  
  // Lighting
  bulb: { primary: '#FDD835', secondary: '#F9A825', icon: '💡' },
  light: { primary: '#FFE082', secondary: '#FFD54F', icon: '🔆' },
  rgb: { primary: '#9C27B0', secondary: '#7B1FA2', icon: '🌈' },
  
  // Climate
  thermostat: { primary: '#FF5722', secondary: '#E64A19', icon: '🌡️' },
  radiator: { primary: '#FF7043', secondary: '#F4511E', icon: '♨️' },
  fan: { primary: '#42A5F5', secondary: '#1E88E5', icon: '🌀' },
  
  // Security
  lock: { primary: '#795548', secondary: '#6D4C41', icon: '🔒' },
  alarm: { primary: '#F44336', secondary: '#D32F2F', icon: '🚨' },
  siren: { primary: '#E91E63', secondary: '#C2185B', icon: '📢' },
  doorbell: { primary: '#9E9E9E', secondary: '#757575', icon: '🔔' },
  
  // Curtains & Blinds
  curtain: { primary: '#8D6E63', secondary: '#795548', icon: '🪟' },
  blind: { primary: '#A1887F', secondary: '#8D6E63', icon: '🎚️' },
  
  // Others
  valve: { primary: '#00ACC1', secondary: '#0097A7', icon: '⚙️' },
  remote: { primary: '#9E9E9E', secondary: '#757575', icon: '🎮' },
  scene: { primary: '#BA68C8', secondary: '#AB47BC', icon: '✨' },
  default: { primary: '#607D8B', secondary: '#546E7A', icon: '📟' }
};

class GenerateUniquePersonalizedImages {
  constructor() {
    this.generated = 0;
    this.errors = [];
  }

  log(msg, icon = '🎨') {
    console.log(`${icon} ${msg}`);
  }

  // Déterminer le type de device depuis le nom
  getDeviceType(driverName) {
    const name = driverName.toLowerCase();
    
    if (name.includes('motion') || name.includes('pir')) return 'motion';
    if (name.includes('contact') || name.includes('door') || name.includes('window')) return 'contact';
    if (name.includes('temperature') || name.includes('temp')) return 'temperature';
    if (name.includes('humidity') || name.includes('humid')) return 'humidity';
    if (name.includes('smoke')) return 'smoke';
    if (name.includes('water') || name.includes('leak')) return 'water';
    if (name.includes('air') || name.includes('co2') || name.includes('tvoc')) return 'air_quality';
    if (name.includes('vibration')) return 'vibration';
    if (name.includes('lux') || name.includes('illumin')) return 'luminance';
    
    if (name.includes('switch') && !name.includes('scene')) return 'switch';
    if (name.includes('dimmer')) return 'dimmer';
    if (name.includes('plug')) return 'plug';
    if (name.includes('socket') || name.includes('outlet')) return 'socket';
    
    if (name.includes('bulb')) return 'bulb';
    if (name.includes('light') || name.includes('led') || name.includes('strip')) return 'light';
    if (name.includes('rgb') || name.includes('color')) return 'rgb';
    
    if (name.includes('thermostat') || name.includes('climate') || name.includes('hvac')) return 'thermostat';
    if (name.includes('radiator')) return 'radiator';
    if (name.includes('fan')) return 'fan';
    
    if (name.includes('lock')) return 'lock';
    if (name.includes('alarm')) return 'alarm';
    if (name.includes('siren')) return 'siren';
    if (name.includes('doorbell')) return 'doorbell';
    
    if (name.includes('curtain') || name.includes('shade')) return 'curtain';
    if (name.includes('blind') || name.includes('roller') || name.includes('shutter')) return 'blind';
    
    if (name.includes('valve')) return 'valve';
    if (name.includes('remote') || name.includes('wireless') && name.includes('switch')) return 'remote';
    if (name.includes('scene')) return 'scene';
    
    return 'default';
  }

  // Déterminer si battery ou AC
  isBattery(driverName) {
    return driverName.toLowerCase().includes('battery') || 
           driverName.toLowerCase().includes('cr2032') ||
           driverName.toLowerCase().includes('cr2450');
  }

  // Créer image personnalisée
  createPersonalizedImage(width, height, driverName) {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    const deviceType = this.getDeviceType(driverName);
    const isBattery = this.isBattery(driverName);
    const colors = DEVICE_COLORS[deviceType] || DEVICE_COLORS.default;
    
    // Fond dégradé personnalisé
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, colors.primary);
    gradient.addColorStop(1, colors.secondary);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Overlay pattern
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = '#FFFFFF';
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.arc(width * (0.2 + i * 0.15), height * 0.3, width * 0.15, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    
    // Zone centrale
    const centerX = width / 2;
    const centerY = height / 2;
    const scale = Math.min(width, height) / 500;
    
    // Cercle central blanc
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 60 * scale, 0, Math.PI * 2);
    ctx.fill();
    
    // Icône type (emoji style text)
    ctx.fillStyle = colors.primary;
    ctx.font = `${50 * scale}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(colors.icon, centerX, centerY);
    
    // Badge énergie (si battery)
    if (isBattery && width >= 500) {
      const badgeY = height - 40 * scale;
      
      // Badge background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(centerX - 40 * scale, badgeY - 15 * scale, 80 * scale, 30 * scale);
      
      // Battery icon
      ctx.fillStyle = '#FDD835';
      ctx.font = `${20 * scale}px Arial`;
      ctx.fillText('🔋', centerX, badgeY);
    } else if (!isBattery && width >= 500) {
      const badgeY = height - 40 * scale;
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(centerX - 40 * scale, badgeY - 15 * scale, 80 * scale, 30 * scale);
      
      ctx.fillStyle = '#4CAF50';
      ctx.font = `${20 * scale}px Arial`;
      ctx.fillText('⚡', centerX, badgeY);
    }
    
    // Label type (pour grandes images)
    if (width >= 500) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.font = `bold ${16 * scale}px Arial`;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetY = 2;
      ctx.textAlign = 'center';
      
      const label = deviceType.toUpperCase().replace('_', ' ');
      ctx.fillText(label, centerX, height - 80 * scale);
    }
    
    return canvas;
  }

  // Générer images pour un driver
  async generateDriverImages(driverPath, driverName) {
    try {
      const imagesDir = path.join(driverPath, 'assets', 'images');
      
      if (!fs.existsSync(imagesDir)) {
        fs.mkdirSync(imagesDir, { recursive: true });
      }

      const sizes = [
        { name: 'small.png', width: 75, height: 75 },
        { name: 'large.png', width: 500, height: 500 }
      ];

      for (const size of sizes) {
        const imagePath = path.join(imagesDir, size.name);
        const canvas = this.createPersonalizedImage(size.width, size.height, driverName);
        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync(imagePath, buffer);
      }

      this.generated++;
      return true;
    } catch (err) {
      this.errors.push({ driver: driverName, error: err.message });
      return false;
    }
  }

  // Traiter tous les drivers
  async processAllDrivers() {
    const driversPath = path.join(ROOT, 'drivers');
    
    if (!fs.existsSync(driversPath)) {
      this.log('Dossier drivers introuvable!', '❌');
      return;
    }

    const drivers = fs.readdirSync(driversPath).filter(name => {
      const driverPath = path.join(driversPath, name);
      return fs.statSync(driverPath).isDirectory();
    });

    this.log(`${drivers.length} drivers à traiter`, '📊');
    console.log('═'.repeat(70));

    for (const driver of drivers) {
      const driverPath = path.join(driversPath, driver);
      await this.generateDriverImages(driverPath, driver);
      
      if (this.generated % 20 === 0) {
        this.log(`${this.generated} drivers traités...`, '⏳');
      }
    }
  }

  // Exécution
  async run() {
    console.log('\n╔════════════════════════════════════════════════════════════════════╗');
    console.log('║                                                                    ║');
    console.log('║     GENERATE UNIQUE PERSONALIZED IMAGES                            ║');
    console.log('║     Images personnalisées par type et énergie                      ║');
    console.log('║                                                                    ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝\n');

    const startTime = Date.now();

    await this.processAllDrivers();

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n' + '═'.repeat(70));
    console.log('📊 RÉSUMÉ FINAL');
    console.log('═'.repeat(70));
    console.log(`\n⏱️  Temps: ${totalTime}s`);
    console.log(`🎨 Images générées: ${this.generated * 2} (${this.generated} drivers × 2)`);
    console.log(`✅ Drivers traités: ${this.generated}`);
    console.log(`❌ Erreurs: ${this.errors.length}`);

    if (this.errors.length > 0) {
      console.log('\n⚠️  Erreurs:');
      this.errors.slice(0, 5).forEach(err => {
        console.log(`   - ${err.driver}: ${err.error}`);
      });
    }

    console.log('\n🎨 Types d\'images créés:');
    console.log('   - Motion sensors: Rouge 🔴');
    console.log('   - Contact sensors: Cyan 🟦');
    console.log('   - Temperature: Orange 🟠');
    console.log('   - Switches: Gris 🔘');
    console.log('   - Lights: Jaune 💡');
    console.log('   - Security: Rouge foncé 🚨');
    console.log('   - Etc...');

    console.log('\n' + '═'.repeat(70));
    console.log('✅ IMAGES PERSONNALISÉES GÉNÉRÉES');
    console.log('═'.repeat(70) + '\n');
  }
}

// Exécuter
if (require.main === module) {
  const generator = new GenerateUniquePersonalizedImages();
  generator.run().catch(err => {
    console.error('Erreur fatale:', err);
    process.exit(1);
  });
}

module.exports = GenerateUniquePersonalizedImages;
