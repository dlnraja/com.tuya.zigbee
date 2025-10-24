#!/usr/bin/env node
'use strict';

/**
 * CREATE BETTER APP IMAGES
 * Crée des images SVG propres puis les convertit en PNG
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');

class CreateBetterAppImages {
  constructor() {
    this.created = [];
  }

  log(msg, icon = '🎨') {
    console.log(`${icon} ${msg}`);
  }

  // Créer SVG pour large
  createLargeSVG() {
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="500" height="350" viewBox="0 0 500 350" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Fond -->
  <rect width="500" height="350" fill="url(#grad1)"/>
  
  <!-- Hexagone central -->
  <polygon points="250,80 290,100 290,140 250,160 210,140 210,100" 
           fill="white" opacity="0.95"/>
  
  <!-- Logo Z -->
  <text x="250" y="140" font-family="Arial, sans-serif" font-size="48" 
        font-weight="bold" fill="#667eea" text-anchor="middle">Z</text>
  
  <!-- Texte principal -->
  <text x="250" y="210" font-family="Arial, sans-serif" font-size="42" 
        font-weight="bold" fill="white" text-anchor="middle">Tuya Zigbee</text>
  
  <!-- Sous-titre -->
  <text x="250" y="250" font-family="Arial, sans-serif" font-size="20" 
        fill="white" text-anchor="middle" opacity="0.9">Universal Integration</text>
  
  <!-- Badge -->
  <rect x="150" y="280" width="200" height="40" rx="20" fill="white" opacity="0.2"/>
  <text x="250" y="305" font-family="Arial, sans-serif" font-size="16" 
        font-weight="bold" fill="white" text-anchor="middle">550+ Devices</text>
</svg>`;

    const outputPath = path.join(ROOT, 'assets', 'images', 'icon-large.svg');
    fs.writeFileSync(outputPath, svg);
    this.created.push('icon-large.svg');
    this.log('icon-large.svg créé!', '  ✅');
  }

  // Créer SVG pour small
  createSmallSVG() {
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="250" height="175" viewBox="0 0 250 175" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Fond -->
  <rect width="250" height="175" fill="url(#grad2)"/>
  
  <!-- Hexagone -->
  <polygon points="125,50 145,60 145,80 125,90 105,80 105,60" 
           fill="white" opacity="0.95"/>
  
  <!-- Logo Z -->
  <text x="125" y="80" font-family="Arial, sans-serif" font-size="28" 
        font-weight="bold" fill="#667eea" text-anchor="middle">Z</text>
  
  <!-- Texte -->
  <text x="125" y="120" font-family="Arial, sans-serif" font-size="24" 
        font-weight="bold" fill="white" text-anchor="middle">Tuya</text>
  
  <text x="125" y="145" font-family="Arial, sans-serif" font-size="14" 
        fill="white" text-anchor="middle" opacity="0.9">Zigbee Hub</text>
</svg>`;

    const outputPath = path.join(ROOT, 'assets', 'images', 'icon-small.svg');
    fs.writeFileSync(outputPath, svg);
    this.created.push('icon-small.svg');
    this.log('icon-small.svg créé!', '  ✅');
  }

  // Créer SVG pour xlarge
  createXLargeSVG() {
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1000" height="700" viewBox="0 0 1000 700" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad3" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#764ba2;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#f093fb;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Fond -->
  <rect width="1000" height="700" fill="url(#grad3)"/>
  
  <!-- Cercles décoratifs -->
  <circle cx="850" cy="100" r="80" fill="white" opacity="0.08"/>
  <circle cx="150" cy="600" r="100" fill="white" opacity="0.08"/>
  <circle cx="900" cy="550" r="60" fill="white" opacity="0.08"/>
  
  <!-- Hexagone central -->
  <polygon points="500,150 560,180 560,240 500,270 440,240 440,180" 
           fill="white" opacity="0.95"/>
  
  <!-- Logo Z -->
  <text x="500" y="230" font-family="Arial, sans-serif" font-size="80" 
        font-weight="bold" fill="#667eea" text-anchor="middle">Z</text>
  
  <!-- Titre principal -->
  <text x="500" y="340" font-family="Arial, sans-serif" font-size="76" 
        font-weight="bold" fill="white" text-anchor="middle">Tuya Zigbee</text>
  
  <!-- Sous-titre -->
  <text x="500" y="400" font-family="Arial, sans-serif" font-size="36" 
        fill="white" text-anchor="middle" opacity="0.9">Universal Homey Integration</text>
  
  <!-- Box features -->
  <rect x="200" y="460" width="600" height="140" rx="20" fill="white" opacity="0.15"/>
  
  <text x="500" y="510" font-family="Arial, sans-serif" font-size="28" 
        font-weight="bold" fill="white" text-anchor="middle">550+ Devices • 183 Drivers • 100% Local</text>
  
  <text x="500" y="550" font-family="Arial, sans-serif" font-size="24" 
        fill="white" text-anchor="middle">Battery Intelligence • Flow Automation</text>
  
  <text x="500" y="585" font-family="Arial, sans-serif" font-size="24" 
        fill="white" text-anchor="middle">Real-time Monitoring • Community Support</text>
</svg>`;

    const outputPath = path.join(ROOT, 'assets', 'images', 'icon-xlarge.svg');
    fs.writeFileSync(outputPath, svg);
    this.created.push('icon-xlarge.svg');
    this.log('icon-xlarge.svg créé!', '  ✅');
  }

  // Convertir SVG en PNG avec Inkscape si disponible
  convertToPNG() {
    this.log('Conversion SVG → PNG...', '🔄');

    const conversions = [
      { svg: 'icon-large.svg', png: 'large.png', width: 500, height: 350 },
      { svg: 'icon-small.svg', png: 'small.png', width: 250, height: 175 },
      { svg: 'icon-xlarge.svg', png: 'xlarge.png', width: 1000, height: 700 }
    ];

    const imagesPath = path.join(ROOT, 'assets', 'images');

    for (const conv of conversions) {
      const svgPath = path.join(imagesPath, conv.svg);
      const pngPath = path.join(imagesPath, conv.png);

      try {
        // Essayer avec Inkscape
        execSync(`inkscape "${svgPath}" --export-filename="${pngPath}" --export-width=${conv.width}`, {
          stdio: 'ignore'
        });
        this.log(`${conv.png} converti!`, '  ✅');
      } catch (err) {
        this.log(`${conv.png} - Inkscape non disponible (SVG créé)`, '  ℹ️');
      }
    }
  }

  // Générer rapport
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      created: this.created,
      note: 'SVG files created. Install Inkscape for PNG conversion, or use online tools'
    };

    const reportPath = path.join(ROOT, 'reports', 'CREATE_BETTER_APP_IMAGES_REPORT.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    return report;
  }

  // Exécution
  async run() {
    console.log('\n╔════════════════════════════════════════════════════════════════════╗');
    console.log('║                                                                    ║');
    console.log('║     CREATE BETTER APP IMAGES - DESIGN PROPRE                       ║');
    console.log('║                                                                    ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝\n');

    const startTime = Date.now();

    // Créer SVGs
    console.log('═'.repeat(70));
    this.log('Création SVG propres', '🎨');
    console.log('═'.repeat(70));
    
    this.createSmallSVG();
    this.createLargeSVG();
    this.createXLargeSVG();

    // Conversion PNG
    console.log('\n' + '═'.repeat(70));
    this.convertToPNG();

    // Rapport
    const report = this.generateReport();
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

    // Résumé
    console.log('\n' + '═'.repeat(70));
    console.log('📊 RÉSUMÉ');
    console.log('═'.repeat(70));
    console.log(`\n⏱️  Temps: ${totalTime}s`);
    console.log(`✅ Fichiers créés: ${report.created.length}`);
    console.log(`\n📝 Note: Utilisez Inkscape ou un outil en ligne pour`);
    console.log(`   convertir les SVG en PNG si nécessaire`);

    console.log('\n' + '═'.repeat(70));
    console.log('✅ SVG PROPRES CRÉÉS - SANS CHEVAUCHEMENT');
    console.log('═'.repeat(70) + '\n');

    return report;
  }
}

// Exécuter
if (require.main === module) {
  const creator = new CreateBetterAppImages();
  creator.run().catch(err => {
    console.error('Erreur fatale:', err);
    process.exit(1);
  });
}

module.exports = CreateBetterAppImages;
