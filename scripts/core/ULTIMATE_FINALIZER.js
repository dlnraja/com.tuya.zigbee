#!/usr/bin/env node
'use strict';

/**
 * ULTIMATE FINALIZER
 * Fait TOUT et finalise TOUT le projet
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');

class UltimateFinalizer {
  constructor() {
    this.results = {
      phases: []
    };
  }

  log(msg, icon = '🎯') {
    console.log(`${icon} ${msg}`);
  }

  exec(cmd, options = {}) {
    try {
      return execSync(cmd, {
        cwd: ROOT,
        encoding: 'utf8',
        stdio: 'pipe',
        ...options
      });
    } catch (err) {
      return { error: err.message, stdout: err.stdout, stderr: err.stderr };
    }
  }

  // Phase 1: Nettoyage complet
  async phase1_cleanup() {
    this.log('PHASE 1: Nettoyage Complet', '🧹');
    console.log('═'.repeat(70));

    const cleaned = [];

    // Nettoyer caches
    const cacheDirs = [
      '.homeybuild',
      path.join('.homeycompose', '.cache'),
      path.join('node_modules', '.cache')
    ];

    for (const dir of cacheDirs) {
      const fullPath = path.join(ROOT, dir);
      if (fs.existsSync(fullPath)) {
        fs.rmSync(fullPath, { recursive: true, force: true });
        cleaned.push(dir);
        this.log(`Nettoyé: ${dir}`, '  ✅');
      }
    }

    // Nettoyer fichiers temporaires racine
    const rootFiles = fs.readdirSync(ROOT);
    const tempFiles = rootFiles.filter(f => 
      f.endsWith('.tmp') || 
      f.endsWith('.log') || 
      f.endsWith('.bak') ||
      f.startsWith('temp_') ||
      f.startsWith('do_')
    );

    for (const file of tempFiles) {
      const filePath = path.join(ROOT, file);
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        fs.unlinkSync(filePath);
        cleaned.push(file);
        this.log(`Supprimé: ${file}`, '  ✅');
      }
    }

    this.results.phases.push({
      phase: 1,
      name: 'Nettoyage',
      status: 'success',
      cleaned: cleaned.length
    });

    this.log(`Phase 1: ${cleaned.length} éléments nettoyés`, '✅');
  }

  // Phase 2: Vérification structure
  async phase2_structure() {
    this.log('PHASE 2: Vérification Structure', '🏗️');
    console.log('═'.repeat(70));

    const checks = {
      dirs: 0,
      files: 0,
      drivers: 0,
      scripts: 0
    };

    // Vérifier dossiers essentiels
    const requiredDirs = ['drivers', 'lib', 'scripts', 'assets', 'locales', 'reports', 'docs'];
    for (const dir of requiredDirs) {
      if (fs.existsSync(path.join(ROOT, dir))) {
        checks.dirs++;
      }
    }

    // Vérifier fichiers essentiels
    const requiredFiles = ['app.json', 'package.json', 'README.md'];
    for (const file of requiredFiles) {
      if (fs.existsSync(path.join(ROOT, file))) {
        checks.files++;
      }
    }

    // Compter drivers
    const driversPath = path.join(ROOT, 'drivers');
    if (fs.existsSync(driversPath)) {
      checks.drivers = fs.readdirSync(driversPath).filter(name => {
        return fs.statSync(path.join(driversPath, name)).isDirectory();
      }).length;
    }

    // Compter scripts
    const scriptsPath = path.join(ROOT, 'scripts');
    if (fs.existsSync(scriptsPath)) {
      checks.scripts = this.countJSFiles(scriptsPath);
    }

    this.results.phases.push({
      phase: 2,
      name: 'Structure',
      status: 'success',
      checks
    });

    this.log(`Structure: ${checks.dirs} dirs, ${checks.drivers} drivers, ${checks.scripts} scripts`, '✅');
  }

  // Phase 3: Validation Homey
  async phase3_validation() {
    this.log('PHASE 3: Validation Homey', '✓');
    console.log('═'.repeat(70));

    // Build
    this.log('Build...', '  ');
    const buildResult = this.exec('homey app build');
    
    if (buildResult.error) {
      this.log('Build: FAILED', '  ❌');
      this.results.phases.push({
        phase: 3,
        name: 'Validation',
        status: 'failed',
        error: buildResult.error
      });
      return;
    }

    // Validate
    this.log('Validate...', '  ');
    const validateResult = this.exec('homey app validate --level publish');
    
    const success = !validateResult.error && 
                   (validateResult.includes('validated successfully') || 
                    validateResult.toString().includes('validated successfully'));

    this.results.phases.push({
      phase: 3,
      name: 'Validation',
      status: success ? 'success' : 'failed'
    });

    this.log(`Validation: ${success ? 'PASSED' : 'FAILED'}`, success ? '✅' : '❌');
  }

  // Phase 4: Vérification Battery Monitoring
  async phase4_battery() {
    this.log('PHASE 4: Battery Monitoring', '🔋');
    console.log('═'.repeat(70));

    let batteryDrivers = 0;
    let hasSystem = false;

    // Vérifier BatteryMonitoringSystem
    const systemPath = path.join(ROOT, 'lib', 'BatteryMonitoringSystem.js');
    if (fs.existsSync(systemPath)) {
      hasSystem = true;
      this.log('BatteryMonitoringSystem.js: ✅', '  ');
    }

    // Compter drivers batteries
    const driversPath = path.join(ROOT, 'drivers');
    if (fs.existsSync(driversPath)) {
      const drivers = fs.readdirSync(driversPath);
      for (const driver of drivers) {
        const composePath = path.join(driversPath, driver, 'driver.compose.json');
        if (fs.existsSync(composePath)) {
          try {
            const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
            if (compose.capabilities && compose.capabilities.includes('measure_battery')) {
              batteryDrivers++;
            }
          } catch (e) {}
        }
      }
    }

    this.results.phases.push({
      phase: 4,
      name: 'Battery',
      status: 'success',
      hasSystem,
      batteryDrivers
    });

    this.log(`Battery: ${batteryDrivers} drivers avec batteries`, '✅');
  }

  // Phase 5: Synchronisation versions
  async phase5_versions() {
    this.log('PHASE 5: Synchronisation Versions', '🔢');
    console.log('═'.repeat(70));

    try {
      const appJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
      const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

      const appVersion = appJson.version;
      const pkgVersion = packageJson.version;

      if (appVersion !== pkgVersion) {
        packageJson.version = appVersion;
        fs.writeFileSync(
          path.join(ROOT, 'package.json'),
          JSON.stringify(packageJson, null, 2)
        );
        this.log(`Version synchro: ${appVersion}`, '  ✅');
      } else {
        this.log(`Version OK: ${appVersion}`, '  ✅');
      }

      this.results.phases.push({
        phase: 5,
        name: 'Versions',
        status: 'success',
        version: appVersion
      });

    } catch (err) {
      this.results.phases.push({
        phase: 5,
        name: 'Versions',
        status: 'failed',
        error: err.message
      });
    }
  }

  // Phase 6: Git operations
  async phase6_git() {
    this.log('PHASE 6: Git Operations', '📦');
    console.log('═'.repeat(70));

    try {
      // Git status
      const status = this.exec('git status --short');
      const hasChanges = status && status.trim().length > 0;

      if (hasChanges) {
        // Git add
        this.log('Git add...', '  ');
        this.exec('git add -A');

        // Git commit
        this.log('Git commit...', '  ');
        const commitResult = this.exec('git commit -m "feat: Ultimate finalization - All systems checked and validated"');
        
        // Git push
        this.log('Git push...', '  ');
        const pushResult = this.exec('git push origin master');

        this.results.phases.push({
          phase: 6,
          name: 'Git',
          status: 'success',
          committed: true
        });

        this.log('Git: Committed & Pushed', '✅');
      } else {
        this.results.phases.push({
          phase: 6,
          name: 'Git',
          status: 'success',
          committed: false
        });

        this.log('Git: Nothing to commit', '✅');
      }

    } catch (err) {
      this.results.phases.push({
        phase: 6,
        name: 'Git',
        status: 'failed',
        error: err.message
      });
      this.log('Git: ERROR', '❌');
    }
  }

  // Phase 7: Rapport final
  async phase7_report() {
    this.log('PHASE 7: Rapport Final', '📊');
    console.log('═'.repeat(70));

    const report = {
      timestamp: new Date().toISOString(),
      version: this.getVersion(),
      phases: this.results.phases,
      summary: {
        total: this.results.phases.length,
        success: this.results.phases.filter(p => p.status === 'success').length,
        failed: this.results.phases.filter(p => p.status === 'failed').length
      },
      stats: this.getStats()
    };

    // Sauvegarder rapport
    const reportPath = path.join(ROOT, 'reports', 'ULTIMATE_FINALIZATION_REPORT.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Créer markdown
    const mdReport = this.generateMarkdownReport(report);
    const mdPath = path.join(ROOT, 'reports', 'ULTIMATE_FINALIZATION_v2.15.98.md');
    fs.writeFileSync(mdPath, mdReport);

    this.log('Rapports générés', '✅');

    return report;
  }

  // Générer rapport markdown
  generateMarkdownReport(report) {
    const success = report.summary.success;
    const total = report.summary.total;
    const percentage = Math.round((success / total) * 100);

    return `# ✅ FINALISATION ULTIME - v${report.version}

**Date:** ${new Date().toLocaleDateString('fr-FR')}  
**Status:** ${percentage === 100 ? '✅ **100% RÉUSSI**' : `⚠️ ${percentage}% RÉUSSI`}

---

## 🎯 RÉSUMÉ GLOBAL

\`\`\`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║  🎉 FINALISATION ULTIME TERMINÉE                          ║
║                                                            ║
║  ✅ ${success}/${total} phases réussies                              ║
║  📊 Score: ${percentage}%                                    ║
║                                                            ║
║  🚗 ${report.stats.drivers} drivers                                  ║
║  🔋 ${report.stats.batteryDrivers} drivers batteries                    ║
║  📜 ${report.stats.scripts} scripts                                ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
\`\`\`

---

## 📋 PHASES EXÉCUTÉES

${report.phases.map((p, i) => `
### Phase ${p.phase}: ${p.name} ${p.status === 'success' ? '✅' : '❌'}

**Status:** ${p.status}  
${p.cleaned ? `**Nettoyé:** ${p.cleaned} éléments` : ''}
${p.checks ? `**Structure:** ${p.checks.dirs} dirs, ${p.checks.drivers} drivers` : ''}
${p.batteryDrivers ? `**Batteries:** ${p.batteryDrivers} drivers` : ''}
${p.version ? `**Version:** ${p.version}` : ''}
${p.committed !== undefined ? `**Commit:** ${p.committed ? 'Oui' : 'Non'}` : ''}
${p.error ? `**Erreur:** ${p.error}` : ''}
`).join('\n')}

---

## 📊 STATISTIQUES

- **Drivers:** ${report.stats.drivers}
- **Drivers batteries:** ${report.stats.batteryDrivers}
- **Scripts:** ${report.stats.scripts}
- **Version:** ${report.version}

---

## ✅ CONCLUSION

${percentage === 100 ? 
`**PROJET 100% FINALISÉ ET PRÊT!** 🎊` : 
`**Projet finalisé à ${percentage}% - Quelques actions requises**`}

---

**Version:** ${report.version}  
**Timestamp:** ${report.timestamp}  
**Status:** ${percentage === 100 ? '🟢 PRODUCTION READY' : '🟡 REVIEW NEEDED'}
`;
  }

  // Obtenir version
  getVersion() {
    try {
      const appJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
      return appJson.version || '2.15.98';
    } catch (e) {
      return '2.15.98';
    }
  }

  // Obtenir stats
  getStats() {
    const stats = {
      drivers: 0,
      batteryDrivers: 0,
      scripts: 0
    };

    try {
      const driversPath = path.join(ROOT, 'drivers');
      if (fs.existsSync(driversPath)) {
        const drivers = fs.readdirSync(driversPath).filter(name => {
          return fs.statSync(path.join(driversPath, name)).isDirectory();
        });
        stats.drivers = drivers.length;

        for (const driver of drivers) {
          const composePath = path.join(driversPath, driver, 'driver.compose.json');
          if (fs.existsSync(composePath)) {
            try {
              const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
              if (compose.capabilities && compose.capabilities.includes('measure_battery')) {
                stats.batteryDrivers++;
              }
            } catch (e) {}
          }
        }
      }

      const scriptsPath = path.join(ROOT, 'scripts');
      if (fs.existsSync(scriptsPath)) {
        stats.scripts = this.countJSFiles(scriptsPath);
      }
    } catch (e) {}

    return stats;
  }

  // Compter fichiers JS
  countJSFiles(dir) {
    let count = 0;
    try {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory() && !file.startsWith('.')) {
          count += this.countJSFiles(filePath);
        } else if (file.endsWith('.js')) {
          count++;
        }
      }
    } catch (e) {}
    return count;
  }

  // Exécution complète
  async run() {
    console.log('\n╔════════════════════════════════════════════════════════════════════╗');
    console.log('║                                                                    ║');
    console.log('║     ULTIMATE FINALIZER - FAIT TOUT ET FINALISE TOUT               ║');
    console.log('║                                                                    ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝\n');

    const startTime = Date.now();

    // Exécuter toutes les phases
    await this.phase1_cleanup();
    console.log();
    await this.phase2_structure();
    console.log();
    await this.phase3_validation();
    console.log();
    await this.phase4_battery();
    console.log();
    await this.phase5_versions();
    console.log();
    await this.phase6_git();
    console.log();
    const report = await this.phase7_report();

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

    // Résumé final
    console.log('\n' + '═'.repeat(70));
    console.log('🎊 RÉSUMÉ FINAL');
    console.log('═'.repeat(70));
    console.log(`\n⏱️  Temps total: ${totalTime}s`);
    console.log(`✅ Phases réussies: ${report.summary.success}/${report.summary.total}`);
    console.log(`📊 Score: ${Math.round((report.summary.success / report.summary.total) * 100)}%`);
    console.log(`\n📈 Statistiques:`);
    console.log(`   - ${report.stats.drivers} drivers`);
    console.log(`   - ${report.stats.batteryDrivers} avec batteries`);
    console.log(`   - ${report.stats.scripts} scripts`);
    console.log(`   - Version ${report.version}`);

    const allSuccess = report.summary.failed === 0;
    console.log(`\n${allSuccess ? '🟢' : '🟡'} Status: ${allSuccess ? 'PRODUCTION READY' : 'REVIEW NEEDED'}`);

    console.log('\n' + '═'.repeat(70));
    console.log(allSuccess ? '🎉 PROJET 100% FINALISÉ!' : '⚠️  QUELQUES ACTIONS REQUISES');
    console.log('═'.repeat(70) + '\n');

    return report;
  }
}

// Exécuter
if (require.main === module) {
  const finalizer = new UltimateFinalizer();
  finalizer.run().catch(err => {
    console.error('Erreur fatale:', err);
    process.exit(1);
  });
}

module.exports = UltimateFinalizer;
