#!/usr/bin/env node

/**
 * 🔍 ANALYSE IMAGES PUBLIÉES CDN HOMEY
 * 
 * Télécharge et analyse les images RÉELLEMENT publiées sur Homey CDN
 * pour comprendre exactement quel est le problème
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

class PublishedImagesAnalyzer {
  constructor() {
    this.root = path.resolve(__dirname, '../..');
    this.tempDir = path.join(this.root, 'temp/cdn-images');
    this.baseUrl = 'https://apps.homeycdn.net/app/com.dlnraja.tuya.zigbee';
    
    // Créer dossier temp
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  async run() {
    console.log('🔍 ANALYSE IMAGES PUBLIÉES CDN HOMEY');
    console.log('='.repeat(70));
    console.log('');

    try {
      // Phase 1: Télécharger image APP principale
      console.log('📥 Phase 1: Téléchargement image app large.png du CDN...');
      const appImageUrl = `${this.baseUrl}/128/85665147-d938-4c96-b6c8-da915d910bae/assets/large.png`;
      const appImagePath = await this.downloadImage(appImageUrl, 'app-large.png');
      
      if (appImagePath) {
        console.log('✅ Image app téléchargée\n');
        await this.analyzeImage(appImagePath, 'APP LARGE.PNG');
      }

      // Phase 2: Télécharger quelques images de drivers
      console.log('\n📥 Phase 2: Téléchargement images drivers...');
      
      const driverExamples = [
        'motion_sensor_battery',
        'smart_plug_ac',
        'temperature_humidity_sensor_battery',
        'contact_sensor_battery'
      ];

      for (const driver of driverExamples) {
        console.log(`\n  Essai ${driver}...`);
        const driverUrl = `${this.baseUrl}/128/85665147-d938-4c96-b6c8-da915d910bae/drivers/${driver}/assets/large.png`;
        const driverPath = await this.downloadImage(driverUrl, `${driver}-large.png`);
        
        if (driverPath) {
          await this.analyzeImage(driverPath, `DRIVER: ${driver}`);
        }
      }

      // Phase 3: Comparaison avec images locales
      console.log('\n\n📊 Phase 3: Comparaison images CDN vs Locales...');
      this.compareImages();

      // Phase 4: Rapport final
      console.log('\n\n📋 Phase 4: Génération rapport...');
      this.generateReport();

    } catch (error) {
      console.error('❌ ERREUR:', error.message);
      throw error;
    }
  }

  downloadImage(url, filename) {
    return new Promise((resolve, reject) => {
      const filepath = path.join(this.tempDir, filename);
      const file = fs.createWriteStream(filepath);

      https.get(url, (response) => {
        if (response.statusCode !== 200) {
          console.log(`  ⚠️  HTTP ${response.statusCode} - ${url}`);
          fs.unlinkSync(filepath);
          resolve(null);
          return;
        }

        response.pipe(file);

        file.on('finish', () => {
          file.close();
          console.log(`  ✅ Téléchargé: ${filename}`);
          resolve(filepath);
        });
      }).on('error', (err) => {
        fs.unlinkSync(filepath);
        console.log(`  ❌ Erreur: ${err.message}`);
        resolve(null);
      });
    });
  }

  async analyzeImage(filepath, label) {
    console.log(`\n  🔍 Analyse: ${label}`);
    
    const stats = fs.statSync(filepath);
    console.log(`    Taille fichier: ${(stats.size / 1024).toFixed(2)} KB`);

    // Essayer ImageMagick
    try {
      const identify = execSync(`identify -verbose "${filepath}"`, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore']
      });

      // Extraire dimensions
      const dimMatch = identify.match(/Geometry: (\d+)x(\d+)/);
      if (dimMatch) {
        console.log(`    Dimensions: ${dimMatch[1]}x${dimMatch[2]}`);
      }

      // Extraire type
      const typeMatch = identify.match(/Type: (\w+)/);
      if (typeMatch) {
        console.log(`    Type: ${typeMatch[1]}`);
      }

      // Extraire depth
      const depthMatch = identify.match(/Depth: (\d+)-bit/);
      if (depthMatch) {
        console.log(`    Profondeur: ${depthMatch[1]}-bit`);
      }

      // Extraire format
      const formatMatch = identify.match(/Format: PNG \(([^)]+)\)/);
      if (formatMatch) {
        console.log(`    Format: ${formatMatch[1]}`);
      }

      // Vérifier si c'est un SVG converti
      if (identify.includes('svg')) {
        console.log(`    ⚠️  Semble être un SVG mal converti`);
      }

      // Vérifier compression
      if (stats.size < 2000) {
        console.log(`    ⚠️  Fichier très petit - possiblement problématique`);
      }

    } catch (error) {
      // Essayer avec Sharp si disponible
      try {
        const sharp = require('sharp');
        const metadata = await sharp(filepath).metadata();
        
        console.log(`    Dimensions: ${metadata.width}x${metadata.height}`);
        console.log(`    Format: ${metadata.format}`);
        console.log(`    Channels: ${metadata.channels}`);
        console.log(`    Space: ${metadata.space}`);

        if (metadata.width !== 500 || metadata.height !== 500) {
          console.log(`    ⚠️  DIMENSIONS INCORRECTES! (attendu: 500x500)`);
        }

      } catch (e) {
        console.log(`    ⚠️  Impossible d'analyser les métadonnées`);
      }
    }

    // Lire premiers bytes pour détecter le type réel
    const buffer = fs.readFileSync(filepath);
    const header = buffer.slice(0, 8).toString('hex');
    
    if (!header.startsWith('89504e47')) {
      console.log(`    ⚠️  EN-TÊTE INCORRECT! Pas un vrai PNG`);
      console.log(`    Header: ${header}`);
    } else {
      console.log(`    ✅ En-tête PNG valide`);
    }
  }

  compareImages() {
    console.log('\n  Comparaison images CDN vs images locales...');

    const localAppImage = path.join(this.root, 'assets/images/large.png');
    const cdnAppImage = path.join(this.tempDir, 'app-large.png');

    if (fs.existsSync(localAppImage) && fs.existsSync(cdnAppImage)) {
      const localStats = fs.statSync(localAppImage);
      const cdnStats = fs.statSync(cdnAppImage);

      console.log(`\n  📊 APP large.png:`);
      console.log(`    Local:  ${(localStats.size / 1024).toFixed(2)} KB`);
      console.log(`    CDN:    ${(cdnStats.size / 1024).toFixed(2)} KB`);

      if (Math.abs(localStats.size - cdnStats.size) < 100) {
        console.log(`    ✅ Tailles similaires - images probablement identiques`);
      } else {
        console.log(`    ⚠️  Tailles différentes - CDN peut avoir modifié l'image`);
      }
    }

    // Comparer un driver
    const localDriverImage = path.join(this.root, 'drivers/motion_sensor_battery/assets/large.png');
    const cdnDriverImage = path.join(this.tempDir, 'motion_sensor_battery-large.png');

    if (fs.existsSync(localDriverImage) && fs.existsSync(cdnDriverImage)) {
      const localStats = fs.statSync(localDriverImage);
      const cdnStats = fs.statSync(cdnDriverImage);

      console.log(`\n  📊 DRIVER motion_sensor_battery large.png:`);
      console.log(`    Local:  ${(localStats.size / 1024).toFixed(2)} KB`);
      console.log(`    CDN:    ${(cdnStats.size / 1024).toFixed(2)} KB`);

      if (Math.abs(localStats.size - cdnStats.size) < 100) {
        console.log(`    ✅ Tailles similaires`);
      } else {
        console.log(`    ⚠️  Tailles différentes`);
      }
    }
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      cdn_base_url: this.baseUrl,
      build_version: 128,
      images_analyzed: fs.readdirSync(this.tempDir).length,
      findings: [],
      recommendations: []
    };

    // Lister toutes les images téléchargées
    const images = fs.readdirSync(this.tempDir);
    
    images.forEach(img => {
      const filepath = path.join(this.tempDir, img);
      const stats = fs.statSync(filepath);
      
      report.findings.push({
        filename: img,
        size_kb: (stats.size / 1024).toFixed(2),
        size_bytes: stats.size
      });
    });

    // Recommandations
    if (report.findings.some(f => f.size_bytes < 2000)) {
      report.recommendations.push({
        priority: 'HIGH',
        issue: 'Fichiers très petits détectés',
        action: 'Vérifier si images sont correctement générées'
      });
    }

    if (report.findings.some(f => f.size_bytes > 200000)) {
      report.recommendations.push({
        priority: 'MEDIUM',
        issue: 'Fichiers très gros détectés',
        action: 'Optimiser compression images'
      });
    }

    // Sauvegarder rapport
    const reportPath = path.join(this.root, 'docs/reports/CDN_IMAGES_ANALYSIS.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n  📄 Rapport sauvegardé: ${reportPath}`);

    // Afficher résumé
    console.log(`\n  📊 RÉSUMÉ:`);
    console.log(`    Images téléchargées: ${images.length}`);
    console.log(`    Taille moyenne: ${(report.findings.reduce((sum, f) => sum + parseFloat(f.size_kb), 0) / report.findings.length).toFixed(2)} KB`);
    
    if (report.recommendations.length > 0) {
      console.log(`\n  ⚠️  RECOMMANDATIONS:`);
      report.recommendations.forEach(rec => {
        console.log(`    [${rec.priority}] ${rec.issue}`);
        console.log(`              ${rec.action}`);
      });
    }

    console.log(`\n  📁 Images téléchargées dans: ${this.tempDir}`);
    console.log(`     Vous pouvez les ouvrir pour inspection visuelle!`);
  }
}

// Run
if (require.main === module) {
  const analyzer = new PublishedImagesAnalyzer();
  analyzer.run()
    .then(() => {
      console.log('\n✅ ANALYSE TERMINÉE!');
      process.exit(0);
    })
    .catch(error => {
      console.error('FATAL:', error);
      process.exit(1);
    });
}

module.exports = PublishedImagesAnalyzer;
