#!/usr/bin/env node
'use strict';

/**
 * FIX APP IMAGES PROFESSIONAL
 * Génère des images professionnelles pour l'app avec design moderne
 */

const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

const ROOT = path.join(__dirname, '..', '..');

class FixAppImagesProfessional {
  constructor() {
    this.fixed = [];
  }

  log(msg, icon = '🎨') {
    console.log(`${icon} ${msg}`);
  }

  // Créer image large.png professionnelle
  async createLargePNG() {
    this.log('Création large.png (500x350)...');

    const canvas = createCanvas(500, 350);
    const ctx = canvas.getContext('2d');

    // Fond dégradé moderne
    const gradient = ctx.createLinearGradient(0, 0, 500, 350);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(1, '#764ba2');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 500, 350);

    // Design avec formes géométriques
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = '#ffffff';
    
    // Cercles décoratifs
    ctx.beginPath();
    ctx.arc(450, 50, 80, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(50, 300, 100, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.globalAlpha = 1;

    // Logo Zigbee stylisé
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 80px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('⚡', 250, 120);

    // Titre principal
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Tuya Zigbee', 250, 180);

    // Sous-titre
    ctx.font = '24px Arial';
    ctx.fillText('550+ Devices', 250, 220);

    // Badge features
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(100, 250, 300, 50);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('100% Local • Battery Intelligence • 183 Drivers', 250, 280);

    // Sauvegarder
    const outputPath = path.join(ROOT, 'assets', 'images', 'large.png');
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(outputPath, buffer);
    
    this.fixed.push('large.png');
    this.log('large.png créé!', '  ✅');
  }

  // Créer image small.png
  async createSmallPNG() {
    this.log('Création small.png (250x175)...');

    const canvas = createCanvas(250, 175);
    const ctx = canvas.getContext('2d');

    // Fond dégradé
    const gradient = ctx.createLinearGradient(0, 0, 250, 175);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(1, '#764ba2');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 250, 175);

    // Logo
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 50px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('⚡', 125, 80);

    // Texte
    ctx.font = 'bold 28px Arial';
    ctx.fillText('Tuya', 125, 120);
    
    ctx.font = '16px Arial';
    ctx.fillText('Zigbee Hub', 125, 145);

    // Sauvegarder
    const outputPath = path.join(ROOT, 'assets', 'images', 'small.png');
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(outputPath, buffer);
    
    this.fixed.push('small.png');
    this.log('small.png créé!', '  ✅');
  }

  // Créer xlarge.png
  async createXLargePNG() {
    this.log('Création xlarge.png (1000x700)...');

    const canvas = createCanvas(1000, 700);
    const ctx = canvas.getContext('2d');

    // Fond dégradé
    const gradient = ctx.createLinearGradient(0, 0, 1000, 700);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(0.5, '#764ba2');
    gradient.addColorStop(1, '#f093fb');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1000, 700);

    // Motif décoratif
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.arc(900, 100 + i * 150, 120, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.beginPath();
      ctx.arc(100, 150 + i * 140, 100, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Logo central
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 180px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('⚡', 500, 240);

    // Titre
    ctx.font = 'bold 96px Arial';
    ctx.fillText('Tuya Zigbee', 500, 360);

    // Sous-titre
    ctx.font = '42px Arial';
    ctx.fillText('Universal Homey Integration', 500, 420);

    // Features box
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(150, 480, 700, 150);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('550+ Devices • 183 Drivers • 100% Local', 500, 530);
    ctx.font = '28px Arial';
    ctx.fillText('Battery Intelligence • Flow Automation', 500, 575);
    ctx.fillText('Real-time Monitoring • Professional Support', 500, 615);

    // Sauvegarder
    const outputPath = path.join(ROOT, 'assets', 'images', 'xlarge.png');
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(outputPath, buffer);
    
    this.fixed.push('xlarge.png');
    this.log('xlarge.png créé!', '  ✅');
  }

  // Vérifier images drivers problématiques
  async checkDriverImages() {
    this.log('Vérification images drivers...', '🔍');

    const driversPath = path.join(ROOT, 'drivers');
    const problematic = [];

    if (!fs.existsSync(driversPath)) return problematic;

    const drivers = fs.readdirSync(driversPath);
    
    for (const driver of drivers) {
      const driverPath = path.join(driversPath, driver);
      if (!fs.statSync(driverPath).isDirectory()) continue;

      const assetsPath = path.join(driverPath, 'assets');
      if (!fs.existsSync(assetsPath)) {
        problematic.push({ driver, issue: 'no_assets_folder' });
        continue;
      }

      // Vérifier images requises
      const required = ['icon.svg', 'images/large.png', 'images/small.png'];
      const missing = [];

      for (const img of required) {
        const imgPath = path.join(assetsPath, img);
        if (!fs.existsSync(imgPath)) {
          missing.push(img);
        }
      }

      if (missing.length > 0) {
        problematic.push({ driver, issue: 'missing_images', missing });
      }
    }

    this.log(`${problematic.length} drivers avec problèmes`, problematic.length > 0 ? '⚠️' : '✅');
    
    return problematic;
  }

  // Générer rapport
  generateReport(problematic) {
    const report = {
      timestamp: new Date().toISOString(),
      fixed: {
        app_images: this.fixed,
        count: this.fixed.length
      },
      problematic_drivers: {
        list: problematic.slice(0, 20), // Premiers 20
        count: problematic.length
      }
    };

    const reportPath = path.join(ROOT, 'reports', 'FIX_APP_IMAGES_REPORT.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    return report;
  }

  // Exécution
  async run() {
    console.log('\n╔════════════════════════════════════════════════════════════════════╗');
    console.log('║                                                                    ║');
    console.log('║     FIX APP IMAGES - DESIGN PROFESSIONNEL                          ║');
    console.log('║                                                                    ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝\n');

    const startTime = Date.now();

    // Créer images app
    console.log('═'.repeat(70));
    this.log('Images App Store', '🎨');
    console.log('═'.repeat(70));
    
    await this.createSmallPNG();
    await this.createLargePNG();
    await this.createXLargePNG();

    // Vérifier drivers
    console.log('\n' + '═'.repeat(70));
    const problematic = await this.checkDriverImages();

    // Rapport
    const report = this.generateReport(problematic);
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

    // Résumé
    console.log('\n' + '═'.repeat(70));
    console.log('📊 RÉSUMÉ');
    console.log('═'.repeat(70));
    console.log(`\n⏱️  Temps: ${totalTime}s`);
    console.log(`✅ Images app fixées: ${report.fixed.count}`);
    console.log(`⚠️  Drivers problématiques: ${report.problematic_drivers.count}`);

    if (report.problematic_drivers.count > 0) {
      console.log('\n🔍 Premiers drivers problématiques:');
      report.problematic_drivers.list.slice(0, 5).forEach(p => {
        console.log(`   - ${p.driver}: ${p.issue}`);
      });
    }

    console.log('\n' + '═'.repeat(70));
    console.log('✅ IMAGES APP FIXÉES - DESIGN PROFESSIONNEL');
    console.log('═'.repeat(70) + '\n');

    return report;
  }
}

// Exécuter
if (require.main === module) {
  const fixer = new FixAppImagesProfessional();
  fixer.run().catch(err => {
    console.error('Erreur fatale:', err);
    process.exit(1);
  });
}

module.exports = FixAppImagesProfessional;
