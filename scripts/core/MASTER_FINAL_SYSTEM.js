#!/usr/bin/env node
'use strict';

/**
 * MASTER FINAL SYSTEM
 * Système maître final intégrant TOUT:
 * - Battery monitoring intelligent
 * - Validation complète
 * - Organisation scripts
 * - Conformité SDK + Guidelines + Forum
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');

class MasterFinalSystem {
  constructor() {
    this.results = {
      batteryMonitoring: false,
      organization: false,
      validation: false,
      conversion: false,
      git: false
    };
  }

  log(msg, icon = '🎯') {
    console.log(`${icon} ${msg}`);
  }

  // Phase 1: Battery Monitoring Integration
  async ensureBatteryMonitoring() {
    this.log('Phase 1: Battery Monitoring System...', '🔋');
    console.log('═'.repeat(70));

    try {
      const batterySystemPath = path.join(ROOT, 'lib', 'BatteryMonitoringSystem.js');
      
      if (fs.existsSync(batterySystemPath)) {
        this.log('BatteryMonitoringSystem.js: ✅ PRÉSENT', '  ');
        
        // Vérifier dans quelques drivers qu'il est utilisé
        const sampleDriver = path.join(ROOT, 'drivers', 'motion_sensor_battery', 'device.js');
        if (fs.existsSync(sampleDriver)) {
          const content = fs.readFileSync(sampleDriver, 'utf8');
          if (content.includes('BatteryMonitoringSystem')) {
            this.log('Intégration drivers: ✅ OK', '  ');
          } else {
            this.log('Intégration drivers: ⚠️  À intégrer', '  ');
          }
        }
        
        this.results.batteryMonitoring = true;
      } else {
        this.log('BatteryMonitoringSystem.js: ❌ MANQUANT', '  ');
      }
    } catch (err) {
      this.log(`Erreur: ${err.message}`, '  ❌');
    }
  }

  // Phase 2: Organisation Scripts
  async checkOrganization() {
    this.log('Phase 2: Organisation Scripts...', '📁');
    console.log('═'.repeat(70));

    try {
      const categories = [
        'scripts/core',
        'scripts/validation',
        'scripts/enrichment',
        'scripts/tools',
        'scripts/automation',
        'scripts/maintenance',
        'scripts/deployment'
      ];

      let allGood = true;
      for (const cat of categories) {
        const catPath = path.join(ROOT, cat);
        const indexPath = path.join(catPath, 'index.js');
        
        if (fs.existsSync(catPath) && fs.existsSync(indexPath)) {
          const files = fs.readdirSync(catPath).filter(f => f.endsWith('.js') && f !== 'index.js');
          this.log(`${cat}: ✅ ${files.length} scripts`, '  ');
        } else {
          this.log(`${cat}: ⚠️  Manquant`, '  ');
          allGood = false;
        }
      }

      // Check racine propre
      const rootFiles = fs.readdirSync(ROOT);
      const batFiles = rootFiles.filter(f => f.endsWith('.bat'));
      
      if (batFiles.length === 0) {
        this.log('Racine: ✅ Aucun .bat', '  ');
      } else {
        this.log(`Racine: ⚠️  ${batFiles.length} fichiers .bat`, '  ');
        allGood = false;
      }

      this.results.organization = allGood;
    } catch (err) {
      this.log(`Erreur: ${err.message}`, '  ❌');
    }
  }

  // Phase 3: Validation Homey
  async validateHomey() {
    this.log('Phase 3: Validation Homey...', '✓');
    console.log('═'.repeat(70));

    try {
      execSync('homey app validate --level publish', {
        cwd: ROOT,
        stdio: 'pipe'
      });
      
      this.log('Homey CLI validation: ✅ PASSED', '  ');
      this.results.validation = true;
    } catch (err) {
      this.log('Homey CLI validation: ❌ FAILED', '  ');
      this.results.validation = false;
    }
  }

  // Phase 4: Stats Finales
  async generateStats() {
    this.log('Phase 4: Statistiques Finales...', '📊');
    console.log('═'.repeat(70));

    try {
      // Count drivers
      const driversPath = path.join(ROOT, 'drivers');
      const drivers = fs.readdirSync(driversPath).filter(name => {
        return fs.statSync(path.join(driversPath, name)).isDirectory();
      });

      // Count battery drivers
      let batteryDrivers = 0;
      for (const driver of drivers) {
        const composePath = path.join(driversPath, driver, 'driver.compose.json');
        if (fs.existsSync(composePath)) {
          const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
          if (compose.capabilities && compose.capabilities.includes('measure_battery')) {
            batteryDrivers++;
          }
        }
      }

      // Count scripts
      const scriptsPath = path.join(ROOT, 'scripts');
      const allScripts = this.countJSFiles(scriptsPath);

      // Count JS files total
      const totalJS = this.countJSFiles(ROOT);

      this.log(`Drivers: ${drivers.length} total`, '  ');
      this.log(`Drivers batteries: ${batteryDrivers}`, '  ');
      this.log(`Scripts: ${allScripts}`, '  ');
      this.log(`Total JS: ${totalJS}`, '  ');

      return {
        drivers: drivers.length,
        batteryDrivers,
        scripts: allScripts,
        totalJS
      };
    } catch (err) {
      this.log(`Erreur: ${err.message}`, '  ❌');
      return {};
    }
  }

  // Helper: Count JS files
  countJSFiles(dir) {
    let count = 0;
    
    try {
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          if (!file.startsWith('.') && file !== 'node_modules') {
            count += this.countJSFiles(filePath);
          }
        } else if (file.endsWith('.js')) {
          count++;
        }
      }
    } catch (err) {
      // Ignore
    }
    
    return count;
  }

  // Générer rapport final
  generateReport(stats) {
    const passed = Object.values(this.results).filter(r => r === true).length;
    const total = Object.keys(this.results).length;
    const score = Math.round((passed / total) * 100);

    const report = {
      timestamp: new Date().toISOString(),
      score,
      results: this.results,
      stats
    };

    const reportPath = path.join(ROOT, 'reports', 'MASTER_FINAL_SYSTEM_REPORT.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    return report;
  }

  // Exécution
  async run() {
    console.log('\n╔════════════════════════════════════════════════════════════════════╗');
    console.log('║                                                                    ║');
    console.log('║     MASTER FINAL SYSTEM - SYSTÈME MAÎTRE FINAL                     ║');
    console.log('║                                                                    ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝\n');

    const startTime = Date.now();

    // Exécuter toutes les phases
    await this.ensureBatteryMonitoring();
    await this.checkOrganization();
    await this.validateHomey();
    const stats = await this.generateStats();

    const report = this.generateReport(stats);
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

    // Résumé final
    console.log('\n' + '═'.repeat(70));
    console.log('🎉 RÉSUMÉ MASTER FINAL SYSTEM');
    console.log('═'.repeat(70));
    console.log(`\n⏱️  Temps: ${totalTime}s`);
    console.log(`📊 Score: ${report.score}%\n`);

    for (const [key, value] of Object.entries(this.results)) {
      const icon = value ? '✅' : '❌';
      console.log(`${icon} ${key}: ${value ? 'OK' : 'FAILED'}`);
    }

    if (stats.drivers) {
      console.log(`\n📈 Statistiques:`);
      console.log(`   - ${stats.drivers} drivers`);
      console.log(`   - ${stats.batteryDrivers} avec batteries`);
      console.log(`   - ${stats.scripts} scripts organisés`);
      console.log(`   - ${stats.totalJS} fichiers JS total`);
    }

    const icon = report.score >= 80 ? '🟢' : report.score >= 60 ? '🟡' : '🔴';
    console.log(`\n${icon} Status global: ${report.score}%`);

    console.log('\n' + '═'.repeat(70));
    console.log(report.score >= 80 ? '🎉 SYSTÈME EN EXCELLENT ÉTAT' : '⚠️  AMÉLIORATIONS EN COURS');
    console.log('═'.repeat(70) + '\n');

    return report;
  }
}

// Exécuter
if (require.main === module) {
  const system = new MasterFinalSystem();
  system.run().catch(err => {
    console.error('Erreur fatale:', err);
    process.exit(1);
  });
}

module.exports = MasterFinalSystem;
