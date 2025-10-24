#!/usr/bin/env node
'use strict';

/**
 * FIX ALL DRIVER ICON PATHS
 * Corrige tous les chemins d'icônes dans tous les drivers pour pointer vers les assets locaux
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

class FixAllDriverIconPaths {
  constructor() {
    this.fixed = {
      compose: 0,
      device: 0,
      driver: 0,
      other: 0
    };
    this.errors = [];
  }

  log(msg, icon = '🔧') {
    console.log(`${icon} ${msg}`);
  }

  // Corriger driver.compose.json
  fixDriverCompose(driverPath, driverName) {
    const composePath = path.join(driverPath, 'driver.compose.json');
    
    if (!fs.existsSync(composePath)) return false;

    try {
      let content = fs.readFileSync(composePath, 'utf8');
      let modified = false;

      // Patterns à corriger
      const patterns = [
        // Chemins absolus vers racine
        { from: /["']\/assets\/images\//g, to: '"./assets/images/' },
        { from: /["']assets\/images\//g, to: '"./assets/images/' },
        
        // Chemins vers racine sans ./
        { from: /["']\.\.\/\.\.\/assets\/images\//g, to: '"./assets/images/' },
        { from: /["']\.\.\/assets\/images\//g, to: '"./assets/images/' },
        
        // Icon sans chemin
        { from: /"icon":\s*"icon\.svg"/g, to: '"icon": "./assets/icon.svg"' },
        
        // Images sans chemin complet
        { from: /"images":\s*{\s*"large":\s*"large\.png"/g, to: '"images": { "large": "./assets/images/large.png"' },
        { from: /"images":\s*{\s*"small":\s*"small\.png"/g, to: '"images": { "small": "./assets/images/small.png"' },
        { from: /"images":\s*{\s*"xlarge":\s*"xlarge\.png"/g, to: '"images": { "xlarge": "./assets/images/xlarge.png"' }
      ];

      for (const pattern of patterns) {
        if (pattern.from.test(content)) {
          content = String(content).replace(pattern.from, pattern.to);
          modified = true;
        }
      }

      if (modified) {
        fs.writeFileSync(composePath, content);
        this.fixed.compose++;
        return true;
      }

      return false;
    } catch (err) {
      this.errors.push({ driver: driverName, file: 'driver.compose.json', error: err.message });
      return false;
    }
  }

  // Corriger device.js
  fixDeviceJS(driverPath, driverName) {
    const devicePath = path.join(driverPath, 'device.js');
    
    if (!fs.existsSync(devicePath)) return false;

    try {
      let content = fs.readFileSync(devicePath, 'utf8');
      let modified = false;

      // Patterns à corriger dans device.js
      const patterns = [
        { from: /['"]\/assets\/images\//g, to: "'./assets/images/" },
        { from: /['"]assets\/images\//g, to: "'./assets/images/" },
        { from: /['"]\.\.\/\.\.\/assets\/images\//g, to: "'./assets/images/" },
        { from: /['"]\.\.\/assets\/images\//g, to: "'./assets/images/" }
      ];

      for (const pattern of patterns) {
        if (pattern.from.test(content)) {
          content = String(content).replace(pattern.from, pattern.to);
          modified = true;
        }
      }

      if (modified) {
        fs.writeFileSync(devicePath, content);
        this.fixed.device++;
        return true;
      }

      return false;
    } catch (err) {
      this.errors.push({ driver: driverName, file: 'device.js', error: err.message });
      return false;
    }
  }

  // Corriger driver.js
  fixDriverJS(driverPath, driverName) {
    const driverJSPath = path.join(driverPath, 'driver.js');
    
    if (!fs.existsSync(driverJSPath)) return false;

    try {
      let content = fs.readFileSync(driverJSPath, 'utf8');
      let modified = false;

      const patterns = [
        { from: /['"]\/assets\/images\//g, to: "'./assets/images/" },
        { from: /['"]assets\/images\//g, to: "'./assets/images/" },
        { from: /['"]\.\.\/\.\.\/assets\/images\//g, to: "'./assets/images/" },
        { from: /['"]\.\.\/assets\/images\//g, to: "'./assets/images/" }
      ];

      for (const pattern of patterns) {
        if (pattern.from.test(content)) {
          content = String(content).replace(pattern.from, pattern.to);
          modified = true;
        }
      }

      if (modified) {
        fs.writeFileSync(driverJSPath, content);
        this.fixed.driver++;
        return true;
      }

      return false;
    } catch (err) {
      this.errors.push({ driver: driverName, file: 'driver.js', error: err.message });
      return false;
    }
  }

  // Corriger autres fichiers JSON dans driver
  fixOtherFiles(driverPath, driverName) {
    try {
      const files = fs.readdirSync(driverPath);
      let fixedCount = 0;

      for (const file of files) {
        if (!file.endsWith('.json') || file === 'driver.compose.json') continue;

        const filePath = path.join(driverPath, file);
        if (!fs.statSync(filePath).isFile()) continue;

        try {
          let content = fs.readFileSync(filePath, 'utf8');
          let modified = false;

          const patterns = [
            { from: /["']\/assets\/images\//g, to: '"./assets/images/' },
            { from: /["']assets\/images\//g, to: '"./assets/images/' },
            { from: /["']\.\.\/\.\.\/assets\/images\//g, to: '"./assets/images/' }
          ];

          for (const pattern of patterns) {
            if (pattern.from.test(content)) {
              content = String(content).replace(pattern.from, pattern.to);
              modified = true;
            }
          }

          if (modified) {
            fs.writeFileSync(filePath, content);
            fixedCount++;
          }
        } catch (err) {
          // Ignore erreurs sur fichiers individuels
        }
      }

      this.fixed.other += fixedCount;
      return fixedCount > 0;
    } catch (err) {
      return false;
    }
  }

  // Vérifier et créer structure assets si manquante
  ensureAssetsStructure(driverPath) {
    const assetsPath = path.join(driverPath, 'assets');
    const imagesPath = path.join(assetsPath, 'images');

    if (!fs.existsSync(assetsPath)) {
      fs.mkdirSync(assetsPath, { recursive: true });
    }

    if (!fs.existsSync(imagesPath)) {
      fs.mkdirSync(imagesPath, { recursive: true });
    }
  }

  // Traiter un driver
  async fixDriver(driverPath, driverName) {
    this.log(`${driverName}...`, '  ');

    // Assurer structure
    this.ensureAssetsStructure(driverPath);

    // Corriger tous les fichiers
    const fixedCompose = this.fixDriverCompose(driverPath, driverName);
    const fixedDevice = this.fixDeviceJS(driverPath, driverName);
    const fixedDriver = this.fixDriverJS(driverPath, driverName);
    const fixedOther = this.fixOtherFiles(driverPath, driverName);

    const anyFixed = fixedCompose || fixedDevice || fixedDriver || fixedOther;

    if (anyFixed) {
      this.log(`${driverName} ✅`, '    ');
    }

    return anyFixed;
  }

  // Traiter tous les drivers
  async fixAllDrivers() {
    const driversPath = path.join(ROOT, 'drivers');
    
    if (!fs.existsSync(driversPath)) {
      this.log('Dossier drivers introuvable!', '❌');
      return;
    }

    const drivers = fs.readdirSync(driversPath).filter(name => {
      const driverPath = path.join(driversPath, name);
      return fs.statSync(driverPath).isDirectory();
    });

    this.log(`${drivers.length} drivers trouvés`, '📊');
    console.log('═'.repeat(70));

    for (const driver of drivers) {
      const driverPath = path.join(driversPath, driver);
      await this.fixDriver(driverPath, driver);
    }
  }

  // Générer rapport
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      fixed: this.fixed,
      total_fixed: this.fixed.compose + this.fixed.device + this.fixed.driver + this.fixed.other,
      errors: this.errors
    };

    const reportPath = path.join(ROOT, 'reports', 'FIX_ALL_DRIVER_ICON_PATHS_REPORT.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    return report;
  }

  // Exécution
  async run() {
    console.log('\n╔════════════════════════════════════════════════════════════════════╗');
    console.log('║                                                                    ║');
    console.log('║     FIX ALL DRIVER ICON PATHS - CHEMINS LOCAUX                     ║');
    console.log('║                                                                    ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝\n');

    const startTime = Date.now();

    await this.fixAllDrivers();

    const report = this.generateReport();
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n' + '═'.repeat(70));
    console.log('📊 RÉSUMÉ');
    console.log('═'.repeat(70));
    console.log(`\n⏱️  Temps: ${totalTime}s`);
    console.log(`✅ driver.compose.json: ${report.fixed.compose}`);
    console.log(`✅ device.js: ${report.fixed.device}`);
    console.log(`✅ driver.js: ${report.fixed.driver}`);
    console.log(`✅ Autres fichiers: ${report.fixed.other}`);
    console.log(`📊 Total fixés: ${report.total_fixed}`);
    console.log(`❌ Erreurs: ${report.errors.length}`);

    if (report.errors.length > 0 && report.errors.length <= 5) {
      console.log('\n⚠️  Erreurs:');
      report.errors.forEach(err => {
        console.log(`   - ${err.driver}/${err.file}: ${err.error}`);
      });
    }

    console.log('\n' + '═'.repeat(70));
    console.log('✅ CHEMINS CORRIGÉS - ASSETS LOCAUX');
    console.log('═'.repeat(70) + '\n');

    return report;
  }
}

// Exécuter
if (require.main === module) {
  const fixer = new FixAllDriverIconPaths();
  fixer.run().catch(err => {
    console.error('Erreur fatale:', err);
    process.exit(1);
  });
}

module.exports = FixAllDriverIconPaths;
