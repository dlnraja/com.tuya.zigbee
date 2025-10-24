#!/usr/bin/env node
'use strict';

/**
 * FIX DRIVER IMAGE PATHS FINAL
 * Corrige TOUS les chemins d'images dans driver.compose.json pour pointer vers ./assets/images/
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

class FixDriverImagePathsFinal {
  constructor() {
    this.fixed = 0;
    this.errors = [];
  }

  log(msg, icon = '🔧') {
    console.log(`${icon} ${msg}`);
  }

  fixDriverCompose(driverPath, driverName) {
    const composePath = path.join(driverPath, 'driver.compose.json');
    
    if (!fs.existsSync(composePath)) return false;

    try {
      let content = fs.readFileSync(composePath, 'utf8');
      const original = content;
      
      // SUPPRIMER les anciennes définitions d'images si elles existent
      // et les remplacer par les bonnes
      
      // Pattern 1: Images pointant vers assets racine (INCORRECT)
      content = String(content).replace(
        /"images":\s*{\s*"small":\s*"\.\/assets\/small\.png"\s*,\s*"large":\s*"\.\/assets\/large\.png"\s*}/g,
        '"images": {\n    "small": "./assets/images/small.png",\n    "large": "./assets/images/large.png"\n  }'
      );
      
      // Pattern 2: Images avec seulement small (INCORRECT)
      content = String(content).replace(
        /"images":\s*{\s*"small":\s*"\.\/assets\/small\.png"\s*}/g,
        '"images": {\n    "small": "./assets/images/small.png",\n    "large": "./assets/images/large.png"\n  }'
      );
      
      // Pattern 3: Images avec seulement large (INCORRECT)  
      content = String(content).replace(
        /"images":\s*{\s*"large":\s*"\.\/assets\/large\.png"\s*}/g,
        '"images": {\n    "small": "./assets/images/small.png",\n    "large": "./assets/images/large.png"\n  }'
      );
      
      // Pattern 4: Pas d'images du tout - ajouter
      if (!/"images":\s*{/.test(content)) {
        // Trouver où insérer (après capabilities ou class)
        const insertPos = content.lastIndexOf('"platforms"');
        if (insertPos > 0) {
          const before = content.substring(0, insertPos);
          const after = content.substring(insertPos);
          content = before + 
                   '"images": {\n    "small": "./assets/images/small.png",\n    "large": "./assets/images/large.png"\n  },\n  ' + 
                   after;
        }
      }

      if (content !== original) {
        fs.writeFileSync(composePath, content);
        this.fixed++;
        return true;
      }

      return false;
    } catch (err) {
      this.errors.push({ driver: driverName, error: err.message });
      return false;
    }
  }

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

    this.log(`${drivers.length} drivers à vérifier`, '📊');
    console.log('═'.repeat(70));

    for (const driver of drivers) {
      const driverPath = path.join(driversPath, driver);
      const fixed = this.fixDriverCompose(driverPath, driver);
      
      if (fixed) {
        this.log(`${driver} ✅`, '  ');
      }
    }
  }

  async run() {
    console.log('\n╔════════════════════════════════════════════════════════════════════╗');
    console.log('║                                                                    ║');
    console.log('║     FIX DRIVER IMAGE PATHS FINAL                                   ║');
    console.log('║     Corrige chemins vers ./assets/images/                          ║');
    console.log('║                                                                    ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝\n');

    const startTime = Date.now();

    await this.processAllDrivers();

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n' + '═'.repeat(70));
    console.log('📊 RÉSUMÉ');
    console.log('═'.repeat(70));
    console.log(`\n⏱️  Temps: ${totalTime}s`);
    console.log(`✅ Drivers corrigés: ${this.fixed}`);
    console.log(`❌ Erreurs: ${this.errors.length}`);

    if (this.errors.length > 0) {
      console.log('\n⚠️  Erreurs:');
      this.errors.forEach(err => {
        console.log(`   - ${err.driver}: ${err.error}`);
      });
    }

    console.log('\n✅ Tous les chemins pointent maintenant vers:');
    console.log('   "./assets/images/small.png"');
    console.log('   "./assets/images/large.png"');

    console.log('\n' + '═'.repeat(70) + '\n');
  }
}

if (require.main === module) {
  const fixer = new FixDriverImagePathsFinal();
  fixer.run().catch(err => {
    console.error('Erreur fatale:', err);
    process.exit(1);
  });
}

module.exports = FixDriverImagePathsFinal;
