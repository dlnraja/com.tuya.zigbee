#!/usr/bin/env node
'use strict';

/**
 * FIX AND GENERATE ALL DRIVER IMAGES
 * Corrige les chemins ET génère toutes les images manquantes
 */

const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

const ROOT = path.join(__dirname, '..', '..');
const BRAND_COLOR = '#1E88E5';

class FixAndGenerateAllDriverImages {
  constructor() {
    this.stats = {
      pathsFixed: 0,
      imagesGenerated: 0,
      errors: []
    };
  }

  log(msg, icon = '🎨') {
    console.log(`${icon} ${msg}`);
  }

  // Créer image professionnelle
  createImage(width, height, driverName) {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // Gradient background
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(1, '#764ba2');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Hexagone central
    const scale = Math.min(width, height) / 500;
    const centerX = width / 2;
    const centerY = height / 2;
    const hexRadius = 60 * scale;
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    this.drawHexagon(ctx, centerX, centerY, hexRadius, true);
    
    // Logo Z
    ctx.fillStyle = BRAND_COLOR;
    ctx.font = `bold ${hexRadius * 1.2}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Z', centerX, centerY);
    
    return canvas;
  }

  drawHexagon(ctx, x, y, radius, fill = false) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      const px = x + radius * Math.cos(angle);
      const py = y + radius * Math.sin(angle);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    
    if (fill) ctx.fill();
    ctx.stroke();
  }

  // Générer images pour un driver
  async generateImages(driverPath, driverName) {
    const imagesDir = path.join(driverPath, 'assets', 'images');
    
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }

    const sizes = [
      { name: 'small.png', width: 75, height: 75 },
      { name: 'large.png', width: 500, height: 500 }
    ];

    let generated = 0;

    for (const size of sizes) {
      const imagePath = path.join(imagesDir, size.name);
      
      if (!fs.existsSync(imagePath)) {
        const canvas = this.createImage(size.width, size.height, driverName);
        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync(imagePath, buffer);
        generated++;
      }
    }

    if (generated > 0) {
      this.stats.imagesGenerated += generated;
    }

    return generated;
  }

  // Corriger chemins dans driver.compose.json
  fixDriverCompose(driverPath, driverName) {
    const composePath = path.join(driverPath, 'driver.compose.json');
    
    if (!fs.existsSync(composePath)) return false;

    try {
      let content = fs.readFileSync(composePath, 'utf8');
      const original = content;
      
      // Corriger chemins images
      content = content.replace(/"small":\s*"\.\/assets\/small\.png"/g, '"small": "./assets/images/small.png"');
      content = content.replace(/"large":\s*"\.\/assets\/large\.png"/g, '"large": "./assets/images/large.png"');
      content = content.replace(/"xlarge":\s*"\.\/assets\/xlarge\.png"/g, '"xlarge": "./assets/images/xlarge.png"');
      
      // Corriger icon
      content = content.replace(/"icon":\s*"\.\/assets\/icon\.svg"/g, '"icon": "./assets/icon.svg"');
      
      // Corriger learnmode image
      content = content.replace(/"image":\s*"\.\/assets\/learnmode\.svg"/g, '"image": "./assets/learnmode.svg"');

      if (content !== original) {
        fs.writeFileSync(composePath, content);
        this.stats.pathsFixed++;
        return true;
      }

      return false;
    } catch (err) {
      this.stats.errors.push({ driver: driverName, error: err.message });
      return false;
    }
  }

  // Générer icon.svg si manquant
  generateIconSVG(driverPath) {
    const iconPath = path.join(driverPath, 'assets', 'icon.svg');
    
    if (fs.existsSync(iconPath)) return false;

    const assetsDir = path.join(driverPath, 'assets');
    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir, { recursive: true });
    }

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <rect width="100" height="100" fill="url(#grad)" rx="10"/>
  
  <polygon points="50,25 65,33 65,49 50,57 35,49 35,33" fill="white" opacity="0.95"/>
  
  <text x="50" y="48" font-family="Arial" font-size="24" font-weight="bold" 
        fill="#667eea" text-anchor="middle" dominant-baseline="middle">Z</text>
</svg>`;

    fs.writeFileSync(iconPath, svg);
    return true;
  }

  // Traiter un driver
  async processDriver(driverPath, driverName) {
    const pathFixed = this.fixDriverCompose(driverPath, driverName);
    const imagesGenerated = await this.generateImages(driverPath, driverName);
    const iconGenerated = this.generateIconSVG(driverPath);

    return { pathFixed, imagesGenerated, iconGenerated };
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

    let processed = 0;
    for (const driver of drivers) {
      const driverPath = path.join(driversPath, driver);
      const result = await this.processDriver(driverPath, driver);
      
      if (result.pathFixed || result.imagesGenerated > 0 || result.iconGenerated) {
        this.log(`${driver} ✅ (paths: ${result.pathFixed ? '✓' : '-'}, images: ${result.imagesGenerated}, icon: ${result.iconGenerated ? '✓' : '-'})`, '  ');
        processed++;
      }

      // Progress indicator every 20 drivers
      if ((processed % 20) === 0 && processed > 0) {
        this.log(`Progression: ${processed} drivers traités...`, '⏳');
      }
    }
  }

  // Générer rapport
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      stats: this.stats
    };

    const reportPath = path.join(ROOT, 'reports', 'FIX_AND_GENERATE_ALL_DRIVER_IMAGES_REPORT.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    return report;
  }

  // Exécution
  async run() {
    console.log('\n╔════════════════════════════════════════════════════════════════════╗');
    console.log('║                                                                    ║');
    console.log('║     FIX & GENERATE ALL DRIVER IMAGES                               ║');
    console.log('║                                                                    ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝\n');

    const startTime = Date.now();

    await this.processAllDrivers();

    const report = this.generateReport();
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n' + '═'.repeat(70));
    console.log('📊 RÉSUMÉ FINAL');
    console.log('═'.repeat(70));
    console.log(`\n⏱️  Temps total: ${totalTime}s`);
    console.log(`✅ Chemins corrigés: ${report.stats.pathsFixed}`);
    console.log(`🎨 Images générées: ${report.stats.imagesGenerated}`);
    console.log(`❌ Erreurs: ${report.stats.errors.length}`);

    if (report.stats.errors.length > 0 && report.stats.errors.length <= 5) {
      console.log('\n⚠️  Erreurs:');
      report.stats.errors.forEach(err => {
        console.log(`   - ${err.driver}: ${err.error}`);
      });
    }

    console.log('\n' + '═'.repeat(70));
    console.log('✅ TOUS LES DRIVERS FIXÉS ET IMAGES GÉNÉRÉES');
    console.log('═'.repeat(70) + '\n');

    return report;
  }
}

// Exécuter
if (require.main === module) {
  const processor = new FixAndGenerateAllDriverImages();
  processor.run().catch(err => {
    console.error('Erreur fatale:', err);
    process.exit(1);
  });
}

module.exports = FixAndGenerateAllDriverImages;
