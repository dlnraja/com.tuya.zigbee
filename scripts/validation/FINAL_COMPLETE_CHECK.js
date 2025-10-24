#!/usr/bin/env node
'use strict';

/**
 * FINAL COMPLETE CHECK
 * Vérification finale complète de TOUT le projet
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');

class FinalCompleteCheck {
  constructor() {
    this.results = {
      structure: { passed: 0, failed: 0, issues: [] },
      javascript: { passed: 0, failed: 0, issues: [] },
      drivers: { passed: 0, failed: 0, issues: [] },
      battery: { passed: 0, failed: 0, issues: [] },
      homey: { passed: 0, failed: 0, issues: [] },
      organization: { passed: 0, failed: 0, issues: [] }
    };
  }

  log(msg, icon = '✓') {
    console.log(`${icon} ${msg}`);
  }

  // Check 1: Structure projet
  async checkStructure() {
    this.log('Check structure projet...', '🏗️');
    console.log('═'.repeat(70));

    const required = {
      dirs: ['drivers', 'lib', 'scripts', 'assets', 'locales', 'reports', 'docs'],
      files: ['app.json', 'package.json', 'README.md', 'LICENSE']
    };

    for (const dir of required.dirs) {
      if (fs.existsSync(path.join(ROOT, dir))) {
        this.results.structure.passed++;
      } else {
        this.results.structure.failed++;
        this.results.structure.issues.push(`Missing: ${dir}/`);
      }
    }

    for (const file of required.files) {
      if (fs.existsSync(path.join(ROOT, file))) {
        this.results.structure.passed++;
      } else {
        this.results.structure.failed++;
        this.results.structure.issues.push(`Missing: ${file}`);
      }
    }

    this.log(`Structure: ${this.results.structure.passed} OK, ${this.results.structure.failed} manquants`, '✅');
  }

  // Check 2: Fichiers JavaScript
  async checkJavaScript() {
    this.log('Check fichiers JavaScript...', '📜');
    console.log('═'.repeat(70));

    const jsFiles = this.getAllJSFiles(ROOT);
    this.log(`${jsFiles.length} fichiers JS trouvés`);

    let checked = 0;
    for (const file of jsFiles) {
      try {
        const code = fs.readFileSync(file, 'utf8');
        // Test syntaxe basique
        new Function(code);
        this.results.javascript.passed++;
        checked++;
      } catch (err) {
        this.results.javascript.failed++;
        this.results.javascript.issues.push({
          file: path.relative(ROOT, file),
          error: err.message
        });
      }
    }

    this.log(`JavaScript: ${this.results.javascript.passed}/${jsFiles.length} valides`, '✅');
  }

  // Check 3: Drivers
  async checkDrivers() {
    this.log('Check drivers...', '🚗');
    console.log('═'.repeat(70));

    const driversPath = path.join(ROOT, 'drivers');
    const drivers = fs.readdirSync(driversPath).filter(name => {
      return fs.statSync(path.join(driversPath, name)).isDirectory();
    });

    this.log(`${drivers.length} drivers à vérifier`);

    for (const driver of drivers) {
      const driverPath = path.join(driversPath, driver);
      const composePath = path.join(driverPath, 'driver.compose.json');

      if (fs.existsSync(composePath)) {
        try {
          const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));

          // Vérifications essentielles
          const hasName = !!compose.name;
          const hasClass = !!compose.class;
          const hasCaps = !!compose.capabilities;
          const hasImages = !!compose.images;

          if (hasName && hasClass && hasCaps && hasImages) {
            this.results.drivers.passed++;
          } else {
            this.results.drivers.failed++;
            const missing = [];
            if (!hasName) missing.push('name');
            if (!hasClass) missing.push('class');
            if (!hasCaps) missing.push('capabilities');
            if (!hasImages) missing.push('images');
            this.results.drivers.issues.push(`${driver}: missing ${missing.join(', ')}`);
          }
        } catch (err) {
          this.results.drivers.failed++;
          this.results.drivers.issues.push(`${driver}: ${err.message}`);
        }
      }
    }

    this.log(`Drivers: ${this.results.drivers.passed}/${drivers.length} complets`, '✅');
  }

  // Check 4: Battery monitoring
  async checkBatteryMonitoring() {
    this.log('Check battery monitoring system...', '🔋');
    console.log('═'.repeat(70));

    // Vérifier BatteryMonitoringSystem
    const batterySystemPath = path.join(ROOT, 'lib', 'BatteryMonitoringSystem.js');
    if (fs.existsSync(batterySystemPath)) {
      this.results.battery.passed++;
      this.log('BatteryMonitoringSystem.js présent', '  ✅');
    } else {
      this.results.battery.failed++;
      this.results.battery.issues.push('BatteryMonitoringSystem.js manquant');
    }

    // Vérifier rapport batteries
    const batteryReportPath = path.join(ROOT, 'reports', 'INTELLIGENT_BATTERY_REPORT.json');
    if (fs.existsSync(batteryReportPath)) {
      const report = JSON.parse(fs.readFileSync(batteryReportPath, 'utf8'));
      this.results.battery.passed++;
      this.log(`${report.statistics?.totalDrivers || 0} drivers avec batteries enrichis`, '  ✅');
    }

    this.log(`Battery: ${this.results.battery.passed} checks OK`, '✅');
  }

  // Check 5: Validation Homey
  async checkHomeyValidation() {
    this.log('Check validation Homey...', '✓');
    console.log('═'.repeat(70));

    try {
      execSync('homey app validate --level publish', {
        cwd: ROOT,
        stdio: 'pipe'
      });
      this.results.homey.passed++;
      this.log('Validation Homey CLI: PASSED', '  ✅');
    } catch (err) {
      this.results.homey.failed++;
      this.results.homey.issues.push('Validation Homey failed');
      this.log('Validation Homey CLI: FAILED', '  ❌');
    }
  }

  // Check 6: Organisation
  async checkOrganization() {
    this.log('Check organisation...', '📁');
    console.log('═'.repeat(70));

    // Vérifier scripts organisés
    const scriptsDirs = [
      'scripts/core',
      'scripts/validation',
      'scripts/enrichment',
      'scripts/tools'
    ];

    for (const dir of scriptsDirs) {
      const dirPath = path.join(ROOT, dir);
      if (fs.existsSync(dirPath)) {
        // Vérifier index.js
        const indexPath = path.join(dirPath, 'index.js');
        if (fs.existsSync(indexPath)) {
          this.results.organization.passed++;
        } else {
          this.results.organization.failed++;
          this.results.organization.issues.push(`Missing ${dir}/index.js`);
        }
      }
    }

    // Vérifier racine propre (pas de .bat)
    const rootFiles = fs.readdirSync(ROOT);
    const batFiles = rootFiles.filter(f => f.endsWith('.bat'));
    if (batFiles.length === 0) {
      this.results.organization.passed++;
      this.log('Aucun fichier .bat à la racine', '  ✅');
    } else {
      this.results.organization.failed++;
      this.results.organization.issues.push(`${batFiles.length} fichiers .bat à la racine`);
    }

    this.log(`Organisation: ${this.results.organization.passed} OK`, '✅');
  }

  // Get all JS files
  getAllJSFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        if (!file.startsWith('.') && file !== 'node_modules') {
          this.getAllJSFiles(filePath, fileList);
        }
      } else if (file.endsWith('.js')) {
        fileList.push(filePath);
      }
    }

    return fileList;
  }

  // Calculer score global
  calculateScore() {
    const totalPassed = Object.values(this.results).reduce((sum, r) => sum + r.passed, 0);
    const totalFailed = Object.values(this.results).reduce((sum, r) => sum + r.failed, 0);
    const total = totalPassed + totalFailed;
    
    return total > 0 ? Math.round((totalPassed / total) * 100) : 0;
  }

  // Générer rapport
  generateReport() {
    const score = this.calculateScore();
    
    const report = {
      timestamp: new Date().toISOString(),
      score,
      results: this.results
    };

    const reportPath = path.join(ROOT, 'reports', 'FINAL_COMPLETE_CHECK_REPORT.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    return report;
  }

  // Exécution
  async run() {
    console.log('\n╔════════════════════════════════════════════════════════════════════╗');
    console.log('║                                                                    ║');
    console.log('║     FINAL COMPLETE CHECK - VÉRIFICATION TOTALE FINALE              ║');
    console.log('║                                                                    ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝\n');

    const startTime = Date.now();

    // Exécuter tous les checks
    await this.checkStructure();
    await this.checkJavaScript();
    await this.checkDrivers();
    await this.checkBatteryMonitoring();
    await this.checkHomeyValidation();
    await this.checkOrganization();

    const report = this.generateReport();
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

    // Résumé
    console.log('\n' + '═'.repeat(70));
    console.log('📊 RÉSUMÉ FINAL');
    console.log('═'.repeat(70));
    console.log(`\n⏱️  Temps: ${totalTime}s`);

    for (const [category, result] of Object.entries(this.results)) {
      const icon = result.failed === 0 ? '✅' : '⚠️';
      console.log(`${icon} ${category}: ${result.passed} passed, ${result.failed} failed`);
      
      if (result.issues.length > 0 && result.issues.length <= 3) {
        result.issues.forEach(issue => {
          console.log(`   - ${typeof issue === 'string' ? issue : issue.file}`);
        });
      }
    }

    const scoreIcon = report.score >= 90 ? '🟢' : report.score >= 70 ? '🟡' : '🔴';
    console.log(`\n${scoreIcon} Score global: ${report.score}%`);

    console.log('\n' + '═'.repeat(70));
    console.log(report.score >= 90 ? '🎉 PROJET EN EXCELLENT ÉTAT' : '⚠️  QUELQUES AMÉLIORATIONS NÉCESSAIRES');
    console.log('═'.repeat(70) + '\n');

    return report;
  }
}

// Exécuter
if (require.main === module) {
  const checker = new FinalCompleteCheck();
  checker.run().catch(err => {
    console.error('Erreur fatale:', err);
    process.exit(1);
  });
}

module.exports = FinalCompleteCheck;
