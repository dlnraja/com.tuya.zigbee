#!/usr/bin/env node
'use strict';

/**
 * FIX DRIVER IMAGES COMPLETE
 * Corrige tous les chemins d'images et crée des images personnalisées cohérentes
 * Basé sur les designs historiques du projet
 */

const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

const ROOT = path.join(__dirname, '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

class DriverImageFixer {
  constructor() {
    this.issues = [];
    this.fixed = [];
    this.created = [];
    
    // Designs cohérents inspirés des anciennes images
    this.designTemplates = {
      motion: {
        icon: '👤',
        color: '#4CAF50',
        gradient: ['#66BB6A', '#43A047'],
        category: 'Motion & Presence'
      },
      temperature: {
        icon: '🌡️',
        color: '#FF9800',
        gradient: ['#FFA726', '#FB8C00'],
        category: 'Temperature & Climate'
      },
      humidity: {
        icon: '💧',
        color: '#2196F3',
        gradient: ['#42A5F5', '#1E88E5'],
        category: 'Temperature & Climate'
      },
      contact: {
        icon: '🚪',
        color: '#9C27B0',
        gradient: ['#AB47BC', '#8E24AA'],
        category: 'Contact & Security'
      },
      button: {
        icon: '🔘',
        color: '#F44336',
        gradient: ['#EF5350', '#E53935'],
        category: 'Automation Control'
      },
      sos: {
        icon: '🆘',
        color: '#D32F2F',
        gradient: ['#E53935', '#C62828'],
        category: 'Safety & Detection'
      },
      plug: {
        icon: '🔌',
        color: '#607D8B',
        gradient: ['#78909C', '#546E7A'],
        category: 'Power & Energy'
      },
      switch: {
        icon: '💡',
        color: '#FFC107',
        gradient: ['#FFD54F', '#FFCA28'],
        category: 'Smart Lighting'
      },
      sensor: {
        icon: '📊',
        color: '#00BCD4',
        gradient: ['#26C6DA', '#00ACC1'],
        category: 'Sensors'
      },
      smoke: {
        icon: '💨',
        color: '#FF5722',
        gradient: ['#FF7043', '#F4511E'],
        category: 'Safety & Detection'
      },
      water: {
        icon: '💦',
        color: '#03A9F4',
        gradient: ['#29B6F6', '#039BE5'],
        category: 'Safety & Detection'
      }
    };
  }

  log(message) {
    console.log(`ℹ️  ${message}`);
  }

  success(message) {
    console.log(`✅ ${message}`);
    this.fixed.push(message);
  }

  error(message) {
    console.error(`❌ ${message}`);
    this.issues.push(message);
  }

  // Déterminer le type de driver
  getDriverType(driverName, capabilities) {
    if (driverName.includes('motion')) return 'motion';
    if (driverName.includes('sos') || driverName.includes('emergency')) return 'sos';
    if (driverName.includes('button')) return 'button';
    if (driverName.includes('contact') || driverName.includes('door') || driverName.includes('window')) return 'contact';
    if (driverName.includes('temperature') || driverName.includes('temp')) return 'temperature';
    if (driverName.includes('humidity')) return 'humidity';
    if (driverName.includes('plug')) return 'plug';
    if (driverName.includes('switch')) return 'switch';
    if (driverName.includes('smoke')) return 'smoke';
    if (driverName.includes('water') || driverName.includes('leak')) return 'water';
    
    // Basé sur les capabilities
    if (capabilities && capabilities.includes('alarm_motion')) return 'motion';
    if (capabilities && capabilities.includes('alarm_contact')) return 'contact';
    if (capabilities && capabilities.includes('alarm_smoke')) return 'smoke';
    if (capabilities && capabilities.includes('alarm_water')) return 'water';
    
    return 'sensor';
  }

  // Créer une image small (75x75)
  async createSmallImage(driverType, driverName) {
    const template = this.designTemplates[driverType] || this.designTemplates.sensor;
    const canvas = createCanvas(75, 75);
    const ctx = canvas.getContext('2d');

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, 75);
    gradient.addColorStop(0, template.gradient[0]);
    gradient.addColorStop(1, template.gradient[1]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 75, 75);

    // Icon
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'white';
    ctx.fillText(template.icon, 37.5, 37.5);

    return canvas.toBuffer('image/png');
  }

  // Créer une image large (500x500)
  async createLargeImage(driverType, driverName) {
    const template = this.designTemplates[driverType] || this.designTemplates.sensor;
    const canvas = createCanvas(500, 500);
    const ctx = canvas.getContext('2d');

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, 500);
    gradient.addColorStop(0, template.gradient[0]);
    gradient.addColorStop(1, template.gradient[1]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 500, 500);

    // Subtle pattern overlay
    ctx.globalAlpha = 0.1;
    for (let i = 0; i < 500; i += 20) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 500, 500);
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.globalAlpha = 1.0;

    // Main icon
    ctx.font = 'bold 200px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillText(template.icon, 250, 220);

    // Category label
    ctx.font = 'bold 24px Arial';
    ctx.fillStyle = 'white';
    ctx.fillText(template.category, 250, 400);

    // Device name (simplified)
    ctx.font = '18px Arial';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    const simpleName = driverName
      .replace(/_/g, ' ')
      .replace(/battery|ac|cr2032|cr2450/gi, '')
      .trim();
    const words = simpleName.split(' ').slice(0, 4).join(' ');
    ctx.fillText(words.substring(0, 50), 250, 440);

    return canvas.toBuffer('image/png');
  }

  // Créer une image xlarge (1000x1000) sans texte superposé
  async createXLargeImage(driverType, driverName) {
    const template = this.designTemplates[driverType] || this.designTemplates.sensor;
    const canvas = createCanvas(1000, 1000);
    const ctx = canvas.getContext('2d');

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, 1000);
    gradient.addColorStop(0, template.gradient[0]);
    gradient.addColorStop(1, template.gradient[1]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1000, 1000);

    // Pattern overlay
    ctx.globalAlpha = 0.05;
    for (let i = 0; i < 1000; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 1000, 1000);
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.globalAlpha = 1.0;

    // Giant icon centered
    ctx.font = 'bold 400px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillText(template.icon, 500, 500);

    // Main icon on top
    ctx.font = 'bold 300px Arial';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillText(template.icon, 500, 400);

    // Category - positioned to not overlap
    ctx.font = 'bold 42px Arial';
    ctx.fillStyle = 'white';
    ctx.fillText(template.category, 500, 750);

    // Version badge
    ctx.font = 'bold 24px Arial';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillText('v2.15.98', 500, 850);

    return canvas.toBuffer('image/png');
  }

  // Analyser un driver
  async analyzeDriver(driverPath) {
    const driverName = path.basename(driverPath);
    const composeFile = path.join(driverPath, 'driver.compose.json');
    
    if (!fs.existsSync(composeFile)) {
      return null;
    }

    try {
      const compose = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
      const assetsDir = path.join(driverPath, 'assets');
      
      // Vérifier si les images existent
      const images = {
        small: path.join(assetsDir, 'small.png'),
        large: path.join(assetsDir, 'large.png'),
        xlarge: path.join(assetsDir, 'xlarge.png')
      };

      const analysis = {
        name: driverName,
        compose,
        assetsDir,
        images,
        missing: [],
        needsUpdate: false
      };

      // Vérifier l'existence
      for (const [size, imgPath] of Object.entries(images)) {
        if (!fs.existsSync(imgPath)) {
          analysis.missing.push(size);
          analysis.needsUpdate = true;
        }
      }

      // Vérifier les chemins dans compose
      if (compose.images) {
        if (compose.images.small !== './assets/small.png') {
          analysis.needsUpdate = true;
        }
        if (compose.images.large !== './assets/large.png') {
          analysis.needsUpdate = true;
        }
      }

      return analysis;
    } catch (error) {
      this.error(`Failed to analyze ${driverName}: ${error.message}`);
      return null;
    }
  }

  // Fixer un driver
  async fixDriver(analysis) {
    if (!analysis || !analysis.needsUpdate) return;

    const driverType = this.getDriverType(analysis.name, analysis.compose.capabilities);
    this.log(`Fixing ${analysis.name} (type: ${driverType})`);

    // Créer le dossier assets si nécessaire
    if (!fs.existsSync(analysis.assetsDir)) {
      fs.mkdirSync(analysis.assetsDir, { recursive: true });
      this.log(`Created assets directory for ${analysis.name}`);
    }

    // Créer les images
    try {
      if (analysis.missing.includes('small') || analysis.needsUpdate) {
        const smallImg = await this.createSmallImage(driverType, analysis.name);
        fs.writeFileSync(analysis.images.small, smallImg);
        this.created.push(`${analysis.name}/small.png`);
      }

      if (analysis.missing.includes('large') || analysis.needsUpdate) {
        const largeImg = await this.createLargeImage(driverType, analysis.name);
        fs.writeFileSync(analysis.images.large, largeImg);
        this.created.push(`${analysis.name}/large.png`);
      }

      if (analysis.missing.includes('xlarge') || analysis.needsUpdate) {
        const xlargeImg = await this.createXLargeImage(driverType, analysis.name);
        fs.writeFileSync(analysis.images.xlarge, xlargeImg);
        this.created.push(`${analysis.name}/xlarge.png`);
      }

      // Fixer les chemins dans compose
      const composeFile = path.join(path.dirname(analysis.assetsDir), 'driver.compose.json');
      analysis.compose.images = {
        small: './assets/small.png',
        large: './assets/large.png',
        xlarge: './assets/xlarge.png'
      };

      // Fixer le learnmode image path si nécessaire
      if (analysis.compose.zigbee && analysis.compose.zigbee.learnmode) {
        const correctPath = `/drivers/${analysis.name}/assets/large.png`;
        if (analysis.compose.zigbee.learnmode.image !== correctPath) {
          analysis.compose.zigbee.learnmode.image = correctPath;
        }
      }

      fs.writeFileSync(composeFile, JSON.stringify(analysis.compose, null, 2) + '\n');
      this.success(`Fixed ${analysis.name}`);

    } catch (error) {
      this.error(`Failed to fix ${analysis.name}: ${error.message}`);
    }
  }

  // Analyser tous les drivers
  async analyzeAllDrivers() {
    const drivers = fs.readdirSync(DRIVERS_DIR).filter(name => {
      const driverPath = path.join(DRIVERS_DIR, name);
      return fs.statSync(driverPath).isDirectory();
    });

    this.log(`Found ${drivers.length} drivers to analyze`);

    const analyses = [];
    for (const driver of drivers) {
      const driverPath = path.join(DRIVERS_DIR, driver);
      const analysis = await this.analyzeDriver(driverPath);
      if (analysis) {
        analyses.push(analysis);
      }
    }

    return analyses;
  }

  async run() {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║     DRIVER IMAGES COMPLETE FIXER - v2.15.98               ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    this.log('Analyzing all drivers...');
    const analyses = await this.analyzeAllDrivers();

    this.log(`\nFound ${analyses.length} drivers with compose files`);
    
    const needsUpdate = analyses.filter(a => a.needsUpdate);
    this.log(`${needsUpdate.length} drivers need updates\n`);

    // Fixer tous les drivers
    for (const analysis of needsUpdate) {
      await this.fixDriver(analysis);
    }

    console.log('\n' + '═'.repeat(60));
    console.log('SUMMARY');
    console.log('═'.repeat(60));
    console.log(`\n✅ Fixed drivers: ${this.fixed.length}`);
    console.log(`✅ Created images: ${this.created.length}`);
    
    if (this.issues.length > 0) {
      console.log(`\n❌ Issues: ${this.issues.length}`);
      this.issues.forEach(issue => console.log(`   - ${issue}`));
    }

    console.log('\n✅ All driver images are now coherent and personalized');
    console.log('═'.repeat(60) + '\n');

    return this.issues.length === 0;
  }
}

if (require.main === module) {
  const fixer = new DriverImageFixer();
  fixer.run().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = DriverImageFixer;
