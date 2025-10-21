#!/usr/bin/env node
'use strict';

/**
 * DEEP FIX DEVICE.JS
 * Correction profonde des device.js avec problèmes de structure
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

class DeepFixDeviceJS {
  constructor() {
    this.fixed = [];
    this.skipped = [];
  }

  log(msg, icon = '🔧') {
    console.log(`${icon} ${msg}`);
  }

  // Vérifier et fixer structure device.js
  fixDeviceStructure(filePath) {
    try {
      let code = fs.readFileSync(filePath, 'utf8');
      let modified = false;

      // Vérifier si le fichier a une structure valide
      if (!code.includes('class') || !code.includes('module.exports')) {
        this.skipped.push(path.basename(path.dirname(filePath)) + ': Invalid structure');
        return false;
      }

      // Problème 1: Fermeture de classe manquante ou en trop
      const classMatches = code.match(/class\s+\w+/g);
      const closingBraces = code.match(/^}\s*$/gm);
      
      // Problème 2: Code après module.exports
      const moduleExportsIndex = code.lastIndexOf('module.exports');
      if (moduleExportsIndex > -1) {
        const afterExports = code.substring(moduleExportsIndex);
        // S'assurer qu'il n'y a rien d'autre après module.exports sauf ;
        const lines = afterExports.split('\n');
        if (lines.length > 1 && lines[1].trim() !== '' && !lines[1].trim().startsWith('//')) {
          // Il y a du code après module.exports, le nettoyer
          const exportLine = lines[0];
          code = code.substring(0, moduleExportsIndex) + exportLine + '\n';
          modified = true;
        }
      }

      // Problème 3: Accolades non balancées
      const openBraces = (code.match(/{/g) || []).length;
      const closeBraces = (code.match(/}/g) || []).length;
      
      if (openBraces !== closeBraces) {
        const diff = openBraces - closeBraces;
        if (diff > 0) {
          // Manque des fermetures
          const beforeExports = code.substring(0, moduleExportsIndex);
          const addBraces = '\n' + '}'.repeat(diff) + '\n';
          code = beforeExports + addBraces + code.substring(moduleExportsIndex);
          modified = true;
        }
      }

      if (modified) {
        fs.writeFileSync(filePath, code);
        return true;
      }

      return false;
    } catch (err) {
      this.skipped.push(path.basename(path.dirname(filePath)) + ': ' + err.message);
      return false;
    }
  }

  // Fixer tous les drivers
  async fixAll() {
    this.log('Correction profonde des device.js...', '🔧');
    console.log('═'.repeat(70));

    const driversPath = path.join(ROOT, 'drivers');
    const drivers = fs.readdirSync(driversPath).filter(name => {
      return fs.statSync(path.join(driversPath, name)).isDirectory();
    });

    this.log(`${drivers.length} drivers à analyser`);

    for (const driver of drivers) {
      const deviceFile = path.join(driversPath, driver, 'device.js');
      
      if (fs.existsSync(deviceFile)) {
        if (this.fixDeviceStructure(deviceFile)) {
          this.fixed.push(driver);
          this.log(`Fixed: ${driver}`, '  ✅');
        }
      }
    }

    this.log(`${this.fixed.length} drivers corrigés`, '✅');
    if (this.skipped.length > 0) {
      this.log(`${this.skipped.length} drivers passés`, '⚠️');
    }
  }

  // Exécution
  async run() {
    console.log('\n╔════════════════════════════════════════════════════════════════════╗');
    console.log('║                                                                    ║');
    console.log('║     DEEP FIX DEVICE.JS - CORRECTION STRUCTURE                      ║');
    console.log('║                                                                    ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝\n');

    const startTime = Date.now();

    await this.fixAll();

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n' + '═'.repeat(70));
    console.log('📊 RÉSUMÉ');
    console.log('═'.repeat(70));
    console.log(`\n⏱️  Temps: ${totalTime}s`);
    console.log(`✅ Corrigés: ${this.fixed.length}`);
    console.log(`⚠️  Passés: ${this.skipped.length}`);

    console.log('\n' + '═'.repeat(70));
    console.log('✅ TERMINÉ');
    console.log('═'.repeat(70) + '\n');

    return { fixed: this.fixed.length, skipped: this.skipped.length };
  }
}

// Exécuter
if (require.main === module) {
  const fixer = new DeepFixDeviceJS();
  fixer.run().catch(err => {
    console.error('Erreur fatale:', err);
    process.exit(1);
  });
}

module.exports = DeepFixDeviceJS;
