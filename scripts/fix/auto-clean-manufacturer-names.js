#!/usr/bin/env node
/**
 * 🔧 AUTO-CLEAN MANUFACTURER NAMES
 * 
 * Nettoie automatiquement les manufacturerNames:
 * 1. Déplace les productIds (TS00XX) de manufacturerName vers productId
 * 2. Garde uniquement les vrais manufacturerNames (_TZxxxx_xxxxxxxx)
 * 3. Crée des backups avant modifications
 * 4. Génère un rapport détaillé des changements
 * 
 * Usage: node scripts/fix/auto-clean-manufacturer-names.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');

const COLORS = {
  reset: '\x1b[0m', red: '\x1b[31m', green: '\x1b[32m',
  yellow: '\x1b[33m', blue: '\x1b[34m', magenta: '\x1b[35m', cyan: '\x1b[36m'
};

class ManufacturerNameAutoFixer {
  constructor(dryRun = false) {
    this.dryRun = dryRun;
    this.rootDir = path.resolve(__dirname, '..', '..');
    this.driversDir = path.join(this.rootDir, 'drivers');
    this.backupDir = path.join(this.rootDir, '.backup-manufacturer-cleanup');
    this.referencesDir = path.join(this.rootDir, 'references');
    
    this.stats = {
      totalDrivers: 0,
      driversModified: 0,
      productIdsMoved: 0,
      backupsCreated: 0,
      errors: []
    };
    
    this.modifications = [];
  }

  log(msg, color = 'reset') {
    console.log(`${COLORS[color]}${msg}${COLORS.reset}`);
  }

  isProductId(str) {
    // TS0001-TS9999 sont des productIds
    return /^TS\d{4}$/.test(str);
  }

  isValidManufacturerName(str) {
    // Format: _TZxxxx_xxxxxxxx ou _TZExxxx_xxxxxxxx
    return /^_TZ[A-Z0-9]{0,4}_[a-z0-9]{8}$/.test(str);
  }

  createBackup(filePath) {
    if (this.dryRun) return;
    
    try {
      if (!fs.existsSync(this.backupDir)) {
        fs.mkdirSync(this.backupDir, { recursive: true });
      }
      
      const fileName = path.basename(path.dirname(filePath));
      const backupPath = path.join(this.backupDir, `${fileName}.driver.compose.json`);
      
      fs.copyFileSync(filePath, backupPath);
      this.stats.backupsCreated++;
      
      return backupPath;
    } catch (err) {
      this.stats.errors.push({
        file: filePath,
        error: `Backup failed: ${err.message}`
      });
      return null;
    }
  }

  processDriver(driverPath) {
    const composePath = path.join(driverPath, 'driver.compose.json');
    
    if (!fs.existsSync(composePath)) return null;

    try {
      const driverId = path.basename(driverPath);
      const content = fs.readFileSync(composePath, 'utf8');
      const driverData = JSON.parse(content);

      if (!driverData.zigbee?.manufacturerName) return null;

      const currentMfrs = Array.isArray(driverData.zigbee.manufacturerName)
        ? driverData.zigbee.manufacturerName
        : [driverData.zigbee.manufacturerName];

      const currentPids = Array.isArray(driverData.zigbee?.productId)
        ? driverData.zigbee.productId
        : (driverData.zigbee?.productId ? [driverData.zigbee.productId] : []);

      // Séparer manufacturerNames et productIds
      const validMfrs = [];
      const foundProductIds = [];
      const invalid = [];

      currentMfrs.forEach(mfr => {
        if (this.isProductId(mfr)) {
          foundProductIds.push(mfr);
        } else if (this.isValidManufacturerName(mfr)) {
          validMfrs.push(mfr);
        } else {
          invalid.push(mfr);
        }
      });

      // Si aucun productId trouvé, pas de modification nécessaire
      if (foundProductIds.length === 0) return null;

      // Créer backup
      const backupPath = this.createBackup(composePath);

      // Préparer les nouvelles valeurs
      const newProductIds = [...new Set([...currentPids, ...foundProductIds])].sort();
      const newManufacturerNames = validMfrs.length > 0 ? validMfrs : validMfrs;

      // Modifier les données
      if (newManufacturerNames.length > 0) {
        driverData.zigbee.manufacturerName = newManufacturerNames.length === 1 
          ? newManufacturerNames[0]
          : newManufacturerNames;
      } else {
        // Si aucun manufacturerName valide, garder au moins un productId comme manufacturerName
        driverData.zigbee.manufacturerName = foundProductIds[0];
        this.log(`  ⚠️  ${driverId}: Aucun manufacturerName valide trouvé, garde ${foundProductIds[0]}`, 'yellow');
      }

      driverData.zigbee.productId = newProductIds.length === 1
        ? newProductIds[0]
        : newProductIds;

      // Sauvegarder si pas en dry-run
      if (!this.dryRun) {
        fs.writeFileSync(composePath, JSON.stringify(driverData, null, 2), 'utf8');
      }

      // Enregistrer les modifications
      const modification = {
        driver: driverId,
        backupPath,
        changes: {
          productIdsMoved: foundProductIds,
          manufacturerNamesBefore: currentMfrs.length,
          manufacturerNamesAfter: newManufacturerNames.length,
          productIdsBefore: currentPids.length,
          productIdsAfter: newProductIds.length
        },
        invalid
      };

      this.modifications.push(modification);
      this.stats.driversModified++;
      this.stats.productIdsMoved += foundProductIds.length;

      return modification;

    } catch (err) {
      this.stats.errors.push({
        driver: path.basename(driverPath),
        error: err.message
      });
      return null;
    }
  }

  processAllDrivers() {
    this.log('\n╔══════════════════════════════════════════════════════════════╗', 'magenta');
    this.log('║     🔧 MANUFACTURER NAMES AUTO-FIXER                       ║', 'magenta');
    
    if (this.dryRun) {
      this.log('║     MODE: DRY-RUN (Aucune modification)                    ║', 'yellow');
    } else {
      this.log('║     MODE: PRODUCTION (Modifications appliquées)            ║', 'green');
    }
    
    this.log('╚══════════════════════════════════════════════════════════════╝\n', 'magenta');

    const drivers = [];
    const items = fs.readdirSync(this.driversDir);
    
    for (const item of items) {
      const driverPath = path.join(this.driversDir, item);
      if (fs.statSync(driverPath).isDirectory()) {
        const composePath = path.join(driverPath, 'driver.compose.json');
        if (fs.existsSync(composePath)) {
          drivers.push(driverPath);
        }
      }
    }

    this.stats.totalDrivers = drivers.length;
    this.log(`📂 ${drivers.length} drivers trouvés\n`, 'cyan');

    let count = 0;
    for (const driverPath of drivers) {
      count++;
      
      const modification = this.processDriver(driverPath);
      
      if (modification) {
        const driverId = modification.driver;
        const moved = modification.changes.productIdsMoved.length;
        this.log(`  ✅ ${driverId}: ${moved} productId(s) déplacé(s)`, 'green');
      }
      
      if (count % 50 === 0) {
        this.log(`\n  📊 Progression: ${count}/${drivers.length}\n`, 'blue');
      }
    }
  }

  generateReport() {
    const report = {
      generatedAt: new Date().toISOString(),
      mode: this.dryRun ? 'DRY-RUN' : 'PRODUCTION',
      summary: {
        totalDrivers: this.stats.totalDrivers,
        driversModified: this.stats.driversModified,
        driversUnchanged: this.stats.totalDrivers - this.stats.driversModified,
        productIdsMoved: this.stats.productIdsMoved,
        backupsCreated: this.stats.backupsCreated,
        errors: this.stats.errors.length
      },
      modifications: this.modifications,
      errors: this.stats.errors
    };

    const reportPath = path.join(
      this.referencesDir, 
      `MANUFACTURER_CLEANUP_${this.dryRun ? 'DRYRUN' : 'APPLIED'}_${Date.now()}.json`
    );
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    return { report, reportPath };
  }

  displaySummary(reportPath) {
    this.log('\n' + '═'.repeat(66), 'magenta');
    this.log('  📊 RÉSULTATS', 'magenta');
    this.log('═'.repeat(66), 'magenta');

    this.log(`\n📦 Drivers analysés: ${this.stats.totalDrivers}`, 'cyan');
    
    if (this.stats.driversModified > 0) {
      this.log(`✅ Drivers modifiés: ${this.stats.driversModified}`, 'green');
      this.log(`🔄 ProductIds déplacés: ${this.stats.productIdsMoved}`, 'green');
      
      if (!this.dryRun) {
        this.log(`💾 Backups créés: ${this.stats.backupsCreated}`, 'cyan');
        this.log(`   Dossier: ${this.backupDir}`, 'blue');
      }
    } else {
      this.log(`✅ Aucune modification nécessaire`, 'green');
    }

    if (this.stats.errors.length > 0) {
      this.log(`\n❌ Erreurs: ${this.stats.errors.length}`, 'red');
    }

    this.log(`\n📄 Rapport: ${reportPath}`, 'cyan');
    this.log('\n' + '═'.repeat(66), 'magenta');
  }

  async run() {
    this.processAllDrivers();
    const { report, reportPath } = this.generateReport();
    this.displaySummary(reportPath);

    if (this.dryRun) {
      this.log('\n⚠️  MODE DRY-RUN: Aucune modification appliquée', 'yellow');
      this.log('Pour appliquer les changements, relancez sans --dry-run\n', 'cyan');
    } else {
      this.log('\n✅ MODIFICATIONS APPLIQUÉES!', 'green');
      this.log('\n🎯 PROCHAINES ÉTAPES:', 'cyan');
      this.log('   1. Vérifier le rapport JSON', 'blue');
      this.log('   2. Tester avec quelques devices', 'blue');
      this.log('   3. Si OK: commit les changements', 'blue');
      this.log('   4. Si KO: restaurer depuis .backup-manufacturer-cleanup/\n', 'blue');
    }

    return report;
  }
}

// Main
if (require.main === module) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  const fixer = new ManufacturerNameAutoFixer(dryRun);
  fixer.run().catch(err => {
    console.error('❌ Erreur fatale:', err);
    process.exit(1);
  });
}

module.exports = ManufacturerNameAutoFixer;
