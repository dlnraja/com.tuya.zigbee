#!/usr/bin/env node
'use strict';

/**
 * FIX SYNTAX ERRORS
 * Corrige les erreurs de syntaxe dans les device.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

class SyntaxErrorFixer {
  constructor() {
    this.fixed = [];
    this.errors = [];
  }

  log(msg, icon = '🔧') {
    console.log(`${icon} ${msg}`);
  }

  // Fixer device.js
  fixDeviceJS(filePath) {
    try {
      let code = fs.readFileSync(filePath, 'utf8');
      let modified = false;

      // Problème: Code mal inséré avec des template literals non échappés
      // Chercher le code problématique
      if (code.includes('INTELLIGENT BATTERY MONITORING')) {
        // Le code a été mal inséré, on le retire et on le remet correctement
        const startMarker = /\/\*\*\s*\n\s*\*\s*INTELLIGENT BATTERY MONITORING/;
        const endMarker = /\}\s*\n\s*async detectBatteryChange[^}]+\}\s*\n\s*\}/;
        
        if (startMarker.test(code)) {
          // Retirer le code mal inséré
          code = code.replace(/\/\*\*[\s\S]*?INTELLIGENT BATTERY MONITORING[\s\S]*?async detectBatteryChange[\s\S]*?\n\s*\}\s*\n\s*\}/m, '');
          modified = true;
          this.log(`Removed broken battery monitoring from ${path.basename(path.dirname(filePath))}`, '  ');
        }
      }

      if (modified) {
        fs.writeFileSync(filePath, code);
        return true;
      }

      return false;
    } catch (err) {
      this.errors.push({ file: filePath, error: err.message });
      return false;
    }
  }

  // Fixer tous les drivers
  async fixAllDrivers() {
    this.log('Correction des erreurs de syntaxe...', '🔧');
    console.log('═'.repeat(70));

    const driversPath = path.join(ROOT, 'drivers');
    const drivers = fs.readdirSync(driversPath).filter(name => {
      return fs.statSync(path.join(driversPath, name)).isDirectory();
    });

    this.log(`${drivers.length} drivers à vérifier`);

    for (const driver of drivers) {
      const deviceFile = path.join(driversPath, driver, 'device.js');
      
      if (fs.existsSync(deviceFile)) {
        if (this.fixDeviceJS(deviceFile)) {
          this.fixed.push(driver);
        }
      }
    }

    this.log(`${this.fixed.length} drivers corrigés`, '✅');
  }

  // Exécution
  async run() {
    console.log('\n╔════════════════════════════════════════════════════════════════════╗');
    console.log('║                                                                    ║');
    console.log('║     FIX SYNTAX ERRORS - CORRECTION AUTOMATIQUE                     ║');
    console.log('║                                                                    ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝\n');

    const startTime = Date.now();

    await this.fixAllDrivers();

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n' + '═'.repeat(70));
    console.log('📊 RÉSUMÉ CORRECTIONS');
    console.log('═'.repeat(70));
    console.log(`\n⏱️  Temps: ${totalTime}s`);
    console.log(`✅ Drivers corrigés: ${this.fixed.length}`);
    console.log(`❌ Erreurs: ${this.errors.length}`);

    console.log('\n' + '═'.repeat(70));
    console.log('✅ CORRECTIONS TERMINÉES');
    console.log('═'.repeat(70) + '\n');

    return { fixed: this.fixed.length, errors: this.errors.length };
  }
}

// Exécuter
if (require.main === module) {
  const fixer = new SyntaxErrorFixer();
  fixer.run().catch(err => {
    console.error('Erreur fatale:', err);
    process.exit(1);
  });
}

module.exports = SyntaxErrorFixer;
