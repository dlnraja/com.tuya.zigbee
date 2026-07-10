#!/usr/bin/env node
/**
 * 🚨 EMERGENCY FIX v5.5.297: Dual Case manufacturerName Compatibility
 *
 * PROBLÈME CRITIQUE DÉTECTÉ POST #747:
 * - v5.5.296 a converti tous _tze204_ → _TZE204_ (UPPERCASE)
 * - Mais devices réels reportent manufacturerName en LOWERCASE
 * - Résultat: Device matching CASSÉ, devices non reconnus
 *
 * SOLUTION:
 * - Ajouter versions LOWERCASE des manufacturerNames UPPERCASE
 * - Maintenir compatibilité bidirectionnelle
 * - Permet recognition devices existants + nouveaux standards
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_PATH = path.join(__dirname, 'drivers');

// Patterns Tuya qui nécessitent dual case support
const DUAL_CASE_PATTERNS = [
  { upper: /_TZE204_/g, lower: '_tze204_' },
  { upper: /_TZE200_/g, lower: '_tze200_' },
  { upper: /_TZE284_/g, lower: '_tze284_' },
  { upper: /_TZ3000_/g, lower: '_tz3000_' },
  { upper: /_TZ3210_/g, lower: '_tz3210_' },
  { upper: /_TYZB01_/g, lower: '_tyzb01_' }
];

class DualCaseCompatibilityFixer {
  constructor() {
    this.results = {
      filesProcessed: 0,
      additionsApplied: 0,
      errors: 0,
      affectedDrivers: []
    };
  }

  async fixAllDrivers() {
    console.log('🚨 EMERGENCY DUAL CASE COMPATIBILITY FIX v5.5.297');
    console.log('='.repeat(60));
    console.log('Problem: v5.5.296 UPPERCASE corrections broke device matching');
    console.log('Solution: Add lowercase versions for backward compatibility');
    console.log('='.repeat(60));

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
      const driverData = JSON.parse(content);

      if (!driverData.zigbee?.manufacturerName) {
        this.results.filesProcessed++;
        return;
      }

      const originalNames = [...driverData.zigbee.manufacturerName];
      const namesToAdd = new Set();
      let addedCount = 0;

      // Rechercher manufacturerNames UPPERCASE qui nécessitent version lowercase
      for (const manufacturerName of originalNames) {
        for (const pattern of DUAL_CASE_PATTERNS) {
          if (pattern.upper.test(manufacturerName)) {
            // Créer version lowercase
            const lowercaseName = manufacturerName.replace(pattern.upper, pattern.lower);

            // Vérifier si lowercase version n'existe pas déjà
            if (!originalNames.includes(lowercaseName)) {
              namesToAdd.add(lowercaseName);
              console.log(`  🔄 ${driverName}: Adding dual case ${manufacturerName} → ${lowercaseName}`);
              addedCount++;
            }
          }
        }
      }

      // Ajouter nouvelles versions lowercase
      if (namesToAdd.size > 0) {
        driverData.zigbee.manufacturerName = [
          ...originalNames,
          ...Array.from(namesToAdd).sort()
        ];

        // Sauvegarder
        fs.writeFileSync(filePath, JSON.stringify(driverData, null, 2));

        this.results.additionsApplied += addedCount;
        this.results.affectedDrivers.push({
          name: driverName,
          additions: addedCount
        });

        console.log(`  ✅ ${driverName}: ${addedCount} lowercase versions added`);
      }

      this.results.filesProcessed++;

    } catch (error) {
      console.log(`❌ Error fixing ${driverName}: ${error.message}`);
      this.results.errors++;
    }
  }

  generateReport() {
    console.log('\n📊 DUAL CASE COMPATIBILITY FIX REPORT v5.5.297');
    console.log('='.repeat(60));
    console.log(`Files processed: ${this.results.filesProcessed}`);
    console.log(`Lowercase versions added: ${this.results.additionsApplied}`);
    console.log(`Affected drivers: ${this.results.affectedDrivers.length}`);
    console.log(`Errors: ${this.results.errors}`);

    if (this.results.affectedDrivers.length > 0) {
      console.log('\n📋 AFFECTED DRIVERS:');
      this.results.affectedDrivers.forEach(driver => {
        console.log(`  • ${driver.name}: +${driver.additions} lowercase versions`);
      });
    }

    if (this.results.additionsApplied > 0) {
      console.log('\n✅ DUAL CASE COMPATIBILITY RESTORED!');
      console.log('📡 Device matching now works for both:');
      console.log('   • Real devices reporting lowercase (_tze204_)');
      console.log('   • Standard conformity uppercase (_TZE204_)');
      console.log('🚀 Ready for emergency v5.5.297 deployment');
    } else {
      console.log('\n✅ No dual case additions needed');
    }
  }
}

// Execute emergency fix
const fixer = new DualCaseCompatibilityFixer();
fixer.fixAllDrivers().catch(console.error);
