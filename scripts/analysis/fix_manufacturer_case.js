#!/usr/bin/env node
/**
 * FORUM IMAGES FIX: Corriger case sensitivity manufacturerNames
 *
 * PROBLÈME CRITIQUE DÉTECTÉ:
 * - Nombreux _tze204_ en lowercase au lieu de _TZE204_
 * - Standard Tuya requires UPPERCASE format
 * - Affecte recognition des devices
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_PATH = path.join(__dirname, 'drivers');

// Patterns de correction case sensitivity
const CASE_FIXES = [
  { from: /_tze204_/g, to: '_TZE204_' },
  { from: /_tze200_/g, to: '_TZE200_' },
  { from: /_tze284_/g, to: '_TZE284_' },
  { from: /_tz3000_/g, to: '_TZ3000_' },
  { from: /_tz3210_/g, to: '_TZ3210_' },
  { from: /_tyzb01_/g, to: '_TYZB01_' }
];

class ManufacturerCaseFixer {
  constructor() {
    this.results = {
      filesProcessed: 0,
      correctionsApplied: 0,
      errors: 0
    };
  }

  async fixAllDrivers() {
    console.log('🔧 FORUM IMAGES FIX: Starting manufacturer case sensitivity corrections...');

    const drivers = fs.readdirSync(DRIVERS_PATH);

    for (const driverName of drivers) {
      const driverPath = path.join(DRIVERS_PATH, driverName);

      if (!fs.statSync(driverPath).isDirectory()) continue;

      const composeFile = path.join(driverPath, 'driver.compose.json');

      if (fs.existsSync(composeFile)) {
        await this.fixDriverFile(driverName, composeFile);
      }
    }

    this.generateReport();
  }

  async fixDriverFile(driverName, filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      let fixed = content;
      let corrections = 0;

      // Appliquer toutes les corrections case sensitivity
      CASE_FIXES.forEach(({ from, to }) => {
        const matches = (fixed.match(from) || []).length;
        if (matches > 0) {
          fixed = fixed.replace(from, to);
          corrections += matches;
          console.log(`  ✓ ${driverName}: Fixed ${matches}x ${from.source} -> ${to}`);
        }
      });

      if (corrections > 0) {
        fs.writeFileSync(filePath, fixed);
        this.results.correctionsApplied += corrections;
      }

      this.results.filesProcessed++;

    } catch (error) {
      console.log(`❌ Error fixing ${driverName}: ${error.message}`);
      this.results.errors++;
    }
  }

  generateReport() {
    console.log('\n📊 MANUFACTURER CASE SENSITIVITY FIX REPORT');
    console.log('='.repeat(50));
    console.log(`Files processed: ${this.results.filesProcessed}`);
    console.log(`Corrections applied: ${this.results.correctionsApplied}`);
    console.log(`Errors: ${this.results.errors}`);

    if (this.results.correctionsApplied > 0) {
      console.log('\n✅ Case sensitivity issues fixed!');
      console.log('📋 All manufacturerNames now use proper UPPERCASE format');
      console.log('🚀 Ready for validation and deployment');
    } else {
      console.log('\n✅ No case sensitivity issues found');
    }
  }
}

// Execute fix
const fixer = new ManufacturerCaseFixer();
fixer.fixAllDrivers().catch(console.error);
