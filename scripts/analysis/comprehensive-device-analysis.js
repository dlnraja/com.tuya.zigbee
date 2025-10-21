#!/usr/bin/env node
/**
 * 🚀 ULTIMATE DRIVER ANALYZER V3.0 - ManufacturerNames & Images
 */

const fs = require('fs');
const path = require('path');

const COLORS = {
  reset: '\x1b[0m', red: '\x1b[31m', green: '\x1b[32m',
  yellow: '\x1b[33m', blue: '\x1b[34m', magenta: '\x1b[35m', cyan: '\x1b[36m'
};

class UltimateDriverAnalyzer {
  constructor() {
    this.rootDir = path.resolve(__dirname, '..', '..');
    this.driversDir = path.join(this.rootDir, 'drivers');
    this.referencesDir = path.join(this.rootDir, 'references');
    this.results = {
      totalDrivers: 0, analyzed: 0, errors: [], warnings: [],
      missingImages: [], missingManufacturers: [], duplicateManufacturers: [],
      suggestions: [], categories: {}, manufacturerStats: {}
    };
    this.referenceData = { blakadder: null };
    this.allManufacturers = new Map();
  }

  log(msg, color = 'reset') { console.log(`${COLORS[color]}${msg}${COLORS.reset}`); }

  loadReferences() {
    this.log('\n📚 Chargement...', 'cyan');
    try {
      const blakadderPath = path.join(this.referencesDir, 'BLAKADDER_DEVICES.json');
      if (fs.existsSync(blakadderPath)) {
        this.referenceData.blakadder = JSON.parse(fs.readFileSync(blakadderPath, 'utf8'));
        const cnt = this.referenceData.blakadder.devices?.length || 0;
        this.log(`  ✅ BLAKADDER (${cnt} devices)`, 'green');
      }
    } catch (err) { this.log(`  ❌ ${err.message}`, 'red'); }
  }

  getAllDrivers() {
    this.log('\n📂 Scan drivers...', 'cyan');
    const drivers = [];
    fs.readdirSync(this.driversDir).forEach(item => {
      const driverPath = path.join(this.driversDir, item);
      if (fs.statSync(driverPath).isDirectory()) {
        const composePath = path.join(driverPath, 'driver.compose.json');
        if (fs.existsSync(composePath)) drivers.push({ id: item, path: driverPath, composePath });
      }
    });
    this.results.totalDrivers = drivers.length;
    this.log(`  ✅ ${drivers.length} drivers`, 'green');
    return drivers;
  }

  analyzeDriver(driver) {
    const analysis = {
      id: driver.id, status: 'ok', issues: [], warnings: [],
      suggestions: [], manufacturerNames: [], productIds: []
    };
    try {
      const driverData = JSON.parse(fs.readFileSync(driver.composePath, 'utf8'));
      if (driverData.zigbee?.manufacturerName) {
        const mfrs = Array.isArray(driverData.zigbee.manufacturerName)
          ? driverData.zigbee.manufacturerName : [driverData.zigbee.manufacturerName];
        analysis.manufacturerNames = mfrs;
        analysis.manufacturerCount = mfrs.length;
        mfrs.forEach(mfr => {
          if (!this.allManufacturers.has(mfr)) this.allManufacturers.set(mfr, []);
          this.allManufacturers.get(mfr).push(driver.id);
        });
      } else {
        analysis.issues.push('Aucun manufacturerName');
        analysis.status = 'error';
      }
      const assetsPath = path.join(driver.path, 'assets', 'images');
      const missingImages = [];
      if (!fs.existsSync(assetsPath)) missingImages.push('Dossier');
      else {
        if (!fs.existsSync(path.join(assetsPath, 'small.png'))) missingImages.push('small.png');
        if (!fs.existsSync(path.join(assetsPath, 'large.png'))) missingImages.push('large.png');
      }
      if (missingImages.length > 0) {
        analysis.warnings.push(`Images: ${missingImages.join(', ')}`);
        analysis.missingImages = missingImages;
      }
    } catch (err) {
      analysis.status = 'error';
      analysis.issues.push(`Erreur: ${err.message}`);
    }
    return analysis;
  }

  analyzeAll() {
    this.log('\n🔍 ANALYSE', 'magenta');
    this.log('='.repeat(60), 'magenta');
    const drivers = this.getAllDrivers();
    const analyses = [];
    let count = 0;
    drivers.forEach(driver => {
      count++;
      if (count % 20 === 0) this.log(`  📊 ${count}/${drivers.length}`, 'blue');
      const analysis = this.analyzeDriver(driver);
      analyses.push(analysis);
      if (analysis.status === 'error') this.results.errors.push({ driver: driver.id, issues: analysis.issues });
      if (analysis.warnings.length > 0) this.results.warnings.push({ driver: driver.id, warnings: analysis.warnings });
      if (analysis.missingImages?.length > 0) this.results.missingImages.push({ driver: driver.id, images: analysis.missingImages });
    });
    this.results.analyzed = analyses.length;
    for (const [mfr, drvs] of this.allManufacturers.entries()) {
      if (drvs.length > 1) this.results.duplicateManufacturers.push({ manufacturer: mfr, count: drvs.length, drivers: drvs });
    }
    return analyses;
  }

  generateReport(analyses) {
    this.log('\n📊 RAPPORT', 'cyan');
    const report = {
      generatedAt: new Date().toISOString(),
      summary: {
        totalDrivers: this.results.totalDrivers,
        analyzed: this.results.analyzed,
        errors: this.results.errors.length,
        warnings: this.results.warnings.length,
        missingImages: this.results.missingImages.length,
        duplicateManufacturers: this.results.duplicateManufacturers.length,
        totalUniqueManufacturers: this.allManufacturers.size
      },
      errors: this.results.errors,
      warnings: this.results.warnings,
      missingImages: this.results.missingImages,
      duplicateManufacturers: this.results.duplicateManufacturers,
      detailedAnalysis: analyses
    };
    const jsonPath = path.join(this.referencesDir, 'ULTIMATE_ANALYSIS_REPORT.json');
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
    this.log(`  ✅ JSON: ${jsonPath}`, 'green');
    return report;
  }

  displaySummary() {
    this.log('\n' + '═'.repeat(66), 'magenta');
    this.log('  🎉 TERMINÉ', 'magenta');
    this.log('═'.repeat(66), 'magenta');
    this.log(`\n📊 ${this.results.analyzed}/${this.results.totalDrivers} drivers`, 'cyan');
    this.log(`🏭 Manufacturers: ${this.allManufacturers.size}`, 'cyan');
    if (this.results.errors.length > 0) this.log(`❌ Erreurs: ${this.results.errors.length}`, 'red');
    if (this.results.warnings.length > 0) this.log(`⚠️  Warnings: ${this.results.warnings.length}`, 'yellow');
    if (this.results.missingImages.length > 0) this.log(`🖼️  Images: ${this.results.missingImages.length}`, 'yellow');
    if (this.results.duplicateManufacturers.length > 0) this.log(`🔄 Dupliqués: ${this.results.duplicateManufacturers.length}`, 'yellow');
    this.log('\n' + '═'.repeat(66), 'magenta');
  }

  async run() {
    console.log('\n');
    this.log('╔══════════════════════════════════════════════════════════════╗', 'magenta');
    this.log('║     🚀 ULTIMATE DRIVER ANALYZER V3.0                        ║', 'magenta');
    this.log('║     ManufacturerNames & Images - 183 Drivers                ║', 'magenta');
    this.log('╚══════════════════════════════════════════════════════════════╝', 'magenta');
    console.log('\n');
    this.loadReferences();
    const analyses = this.analyzeAll();
    this.generateReport(analyses);
    this.displaySummary();
    this.log('\n✅ ANALYSE TERMINÉE!\n', 'green');
    this.log('Rapports générés:', 'cyan');
    this.log('  - references/ULTIMATE_ANALYSIS_REPORT.json', 'blue');
    this.log('  - docs/ULTIMATE_ANALYSIS_REPORT.md\n', 'blue');
  }
}

if (require.main === module) {
  const analyzer = new UltimateDriverAnalyzer();
  analyzer.run().catch(err => {
    console.error('❌ Erreur fatale:', err);
    process.exit(1);
  });
}

module.exports = UltimateDriverAnalyzer;
