#!/usr/bin/env node
/**
 * 🧹 CLEAN MANUFACTURER NAMES
 * 
 * Nettoie les manufacturerNames dans tous les drivers:
 * 1. Retire les productIds (TS00XX) des manufacturerNames
 * 2. Identifie les manufacturerNames uniques par driver
 * 3. Crée un rapport de nettoyage
 * 4. Propose des corrections automatiques
 */

const fs = require('fs');
const path = require('path');

const COLORS = {
  reset: '\x1b[0m', red: '\x1b[31m', green: '\x1b[32m',
  yellow: '\x1b[33m', blue: '\x1b[34m', magenta: '\x1b[35m', cyan: '\x1b[36m'
};

class ManufacturerNameCleaner {
  constructor() {
    this.rootDir = path.resolve(__dirname, '..', '..');
    this.driversDir = path.join(this.rootDir, 'drivers');
    this.referencesDir = path.join(this.rootDir, 'references');
    this.results = {
      totalDrivers: 0,
      driversWithProductIds: [],
      driversWith10PlusManufacturers: [],
      cleaningActions: [],
      errors: []
    };
  }

  log(msg, color = 'reset') {
    console.log(`${COLORS[color]}${msg}${COLORS.reset}`);
  }

  isProductId(str) {
    // TS0001-TS9999 sont des productIds, pas des manufacturerNames
    return /^TS\d{4}$/.test(str);
  }

  isValidManufacturerName(str) {
    // Format valide: _TZxxxx_xxxxxxxx ou _TZExxxx_xxxxxxxx
    return /^_TZ[A-Z0-9]{0,4}_[a-z0-9]{8}$/.test(str);
  }

  getAllDrivers() {
    const drivers = [];
    const items = fs.readdirSync(this.driversDir);
    for (const item of items) {
      const driverPath = path.join(this.driversDir, item);
      if (fs.statSync(driverPath).isDirectory()) {
        const composePath = path.join(driverPath, 'driver.compose.json');
        if (fs.existsSync(composePath)) {
          drivers.push({ id: item, path: driverPath, composePath });
        }
      }
    }
    this.results.totalDrivers = drivers.length;
    return drivers;
  }

  analyzeDriver(driver) {
    try {
      const driverData = JSON.parse(fs.readFileSync(driver.composePath, 'utf8'));
      
      if (!driverData.zigbee?.manufacturerName) {
        return null;
      }

      const mfrs = Array.isArray(driverData.zigbee.manufacturerName)
        ? driverData.zigbee.manufacturerName
        : [driverData.zigbee.manufacturerName];

      const analysis = {
        driverId: driver.id,
        totalManufacturers: mfrs.length,
        productIdsFound: [],
        invalidNames: [],
        validNames: [],
        recommendations: []
      };

      // Analyser chaque manufacturerName
      mfrs.forEach(mfr => {
        if (this.isProductId(mfr)) {
          analysis.productIdsFound.push(mfr);
          analysis.recommendations.push({
            type: 'move_to_productId',
            value: mfr,
            action: `Déplacer "${mfr}" vers zigbee.productId`
          });
        } else if (this.isValidManufacturerName(mfr)) {
          analysis.validNames.push(mfr);
        } else {
          analysis.invalidNames.push(mfr);
        }
      });

      // Flags
      if (analysis.productIdsFound.length > 0) {
        this.results.driversWithProductIds.push({
          driver: driver.id,
          count: analysis.productIdsFound.length,
          productIds: analysis.productIdsFound
        });
      }

      if (analysis.totalManufacturers >= 10) {
        this.results.driversWith10PlusManufacturers.push({
          driver: driver.id,
          count: analysis.totalManufacturers
        });
      }

      return analysis;

    } catch (err) {
      this.results.errors.push({
        driver: driver.id,
        error: err.message
      });
      return null;
    }
  }

  analyzeAll() {
    this.log('\n╔══════════════════════════════════════════════════════════════╗', 'magenta');
    this.log('║     🧹 MANUFACTURER NAMES CLEANER                          ║', 'magenta');
    this.log('║     Analyse et nettoyage - 183 Drivers                     ║', 'magenta');
    this.log('╚══════════════════════════════════════════════════════════════╝\n', 'magenta');

    const drivers = this.getAllDrivers();
    this.log(`📂 ${drivers.length} drivers trouvés\n`, 'cyan');

    const analyses = [];
    let count = 0;

    for (const driver of drivers) {
      count++;
      if (count % 20 === 0) {
        this.log(`  📊 Progression: ${count}/${drivers.length}`, 'blue');
      }

      const analysis = this.analyzeDriver(driver);
      if (analysis) {
        analyses.push(analysis);
      }
    }

    return analyses;
  }

  generateReport(analyses) {
    this.log('\n📊 GÉNÉRATION RAPPORT\n', 'cyan');

    const report = {
      generatedAt: new Date().toISOString(),
      summary: {
        totalDrivers: this.results.totalDrivers,
        driversWithProductIds: this.results.driversWithProductIds.length,
        driversWith10PlusManufacturers: this.results.driversWith10PlusManufacturers.length,
        totalProductIdsToMove: this.results.driversWithProductIds.reduce((sum, d) => sum + d.count, 0)
      },
      driversWithProductIds: this.results.driversWithProductIds,
      driversWith10PlusManufacturers: this.results.driversWith10PlusManufacturers,
      errors: this.results.errors,
      detailedAnalysis: analyses
    };

    // Sauvegarder JSON
    const jsonPath = path.join(this.referencesDir, 'MANUFACTURER_CLEANING_REPORT.json');
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
    this.log(`  ✅ JSON: ${jsonPath}`, 'green');

    return report;
  }

  displaySummary(report) {
    this.log('\n' + '═'.repeat(66), 'magenta');
    this.log('  📊 RÉSULTATS', 'magenta');
    this.log('═'.repeat(66), 'magenta');

    this.log(`\n📦 Total drivers: ${report.summary.totalDrivers}`, 'cyan');
    
    if (report.summary.driversWithProductIds > 0) {
      this.log(`❌ Drivers avec productIds dans manufacturerName: ${report.summary.driversWithProductIds}`, 'red');
      this.log(`   → ${report.summary.totalProductIdsToMove} productIds à déplacer`, 'yellow');
    }

    if (report.summary.driversWith10PlusManufacturers > 0) {
      this.log(`⚠️  Drivers avec 10+ manufacturerNames: ${report.summary.driversWith10PlusManufacturers}`, 'yellow');
    }

    if (this.results.errors.length > 0) {
      this.log(`❌ Erreurs: ${this.results.errors.length}`, 'red');
    }

    this.log('\n' + '═'.repeat(66), 'magenta');

    // Top 10 drivers avec le plus de manufacturerNames
    this.log('\n🔝 TOP 10 DRIVERS (manufacturerNames count):\n', 'cyan');
    const sorted = report.driversWith10PlusManufacturers
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    sorted.forEach((item, idx) => {
      this.log(`   ${idx + 1}. ${item.driver}: ${item.count} manufacturerNames`, 'yellow');
    });

    this.log('\n' + '═'.repeat(66), 'magenta');
  }

  async run() {
    const analyses = this.analyzeAll();
    const report = this.generateReport(analyses);
    this.displaySummary(report);

    this.log('\n✅ ANALYSE TERMINÉE!\n', 'green');
    this.log('📄 Rapport: references/MANUFACTURER_CLEANING_REPORT.json\n', 'cyan');
    this.log('🎯 PROCHAINES ÉTAPES:', 'cyan');
    this.log('   1. Revoir le rapport JSON', 'blue');
    this.log('   2. Créer un script de nettoyage automatique', 'blue');
    this.log('   3. Tester sur quelques drivers pilotes', 'blue');
    this.log('   4. Appliquer le nettoyage à tous les drivers\n', 'blue');
  }
}

if (require.main === module) {
  const cleaner = new ManufacturerNameCleaner();
  cleaner.run().catch(err => {
    console.error('❌ Erreur fatale:', err);
    process.exit(1);
  });
}

module.exports = ManufacturerNameCleaner;
