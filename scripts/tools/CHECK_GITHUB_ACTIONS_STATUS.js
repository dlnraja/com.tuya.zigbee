#!/usr/bin/env node
'use strict';

/**
 * CHECK GITHUB ACTIONS STATUS
 * Vérifie le statut de publication sur GitHub
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');

class CheckGitHubActionsStatus {
  constructor() {
    this.status = {
      localValidation: null,
      lastCommit: null,
      changesCount: null
    };
  }

  log(msg, icon = '🔍') {
    console.log(`${icon} ${msg}`);
  }

  // Validation Homey locale
  async validateHomey() {
    this.log('Validation Homey locale...', '✓');
    
    try {
      const result = execSync('homey app validate --level publish', {
        cwd: ROOT,
        encoding: 'utf8',
        stdio: 'pipe'
      });

      const success = result.includes('validated successfully');
      const warnings = (result.match(/Warning:/g) || []).length;

      this.status.localValidation = {
        success,
        warnings,
        output: result.substring(0, 500)
      };

      if (success) {
        this.log(`Validation: ✅ PASSED (${warnings} warnings)`, '  ');
      } else {
        this.log('Validation: ❌ FAILED', '  ');
      }

      return success;
    } catch (err) {
      this.status.localValidation = {
        success: false,
        error: err.message
      };
      return false;
    }
  }

  // Info dernier commit
  getLastCommit() {
    this.log('Dernier commit...', '📝');

    try {
      const hash = execSync('git rev-parse --short HEAD', {
        cwd: ROOT,
        encoding: 'utf8'
      }).trim();

      const message = execSync('git log -1 --pretty=%B', {
        cwd: ROOT,
        encoding: 'utf8'
      }).trim();

      const author = execSync('git log -1 --pretty=%an', {
        cwd: ROOT,
        encoding: 'utf8'
      }).trim();

      const date = execSync('git log -1 --pretty=%ar', {
        cwd: ROOT,
        encoding: 'utf8'
      }).trim();

      this.status.lastCommit = { hash, message, author, date };

      this.log(`${hash} - ${message.split('\n')[0]}`, '  ');
      this.log(`Par ${author}, ${date}`, '  ');

      return this.status.lastCommit;
    } catch (err) {
      this.log('Erreur récupération commit', '❌');
      return null;
    }
  }

  // Vérifier changements non commités
  checkUncommittedChanges() {
    this.log('Changements non commités...', '📊');

    try {
      const status = execSync('git status --short', {
        cwd: ROOT,
        encoding: 'utf8'
      });

      const lines = status.trim().split('\n').filter(l => l.trim());
      this.status.changesCount = lines.length;

      if (lines.length === 0) {
        this.log('Aucun changement non commité ✅', '  ');
      } else {
        this.log(`${lines.length} fichiers non commités ⚠️`, '  ');
        lines.slice(0, 5).forEach(line => {
          this.log(line, '    ');
        });
      }

      return lines.length;
    } catch (err) {
      return 0;
    }
  }

  // Vérifier fichiers requis
  checkRequiredFiles() {
    this.log('Fichiers requis...', '📄');

    const required = {
      'README.txt': false,
      'README.md': false,
      'app.json': false,
      'package.json': false,
      'assets/images/large.png': false,
      'assets/images/small.png': false
    };

    for (const file of Object.keys(required)) {
      const filePath = path.join(ROOT, file);
      required[file] = fs.existsSync(filePath);

      const icon = required[file] ? '✅' : '❌';
      this.log(`${file}: ${icon}`, '  ');
    }

    const allPresent = Object.values(required).every(v => v);
    return { required, allPresent };
  }

  // Compter images drivers
  countDriverImages() {
    this.log('Images drivers...', '🎨');

    const driversPath = path.join(ROOT, 'drivers');
    if (!fs.existsSync(driversPath)) return { total: 0, withImages: 0 };

    const drivers = fs.readdirSync(driversPath).filter(name => {
      return fs.statSync(path.join(driversPath, name)).isDirectory();
    });

    let withImages = 0;

    for (const driver of drivers) {
      const largePath = path.join(driversPath, driver, 'assets', 'images', 'large.png');
      const smallPath = path.join(driversPath, driver, 'assets', 'images', 'small.png');

      if (fs.existsSync(largePath) && fs.existsSync(smallPath)) {
        withImages++;
      }
    }

    this.log(`${withImages}/${drivers.length} drivers avec images complètes`, '  ');

    return { total: drivers.length, withImages };
  }

  // Générer rapport
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      status: this.status,
      summary: {
        ready: this.status.localValidation?.success && this.status.changesCount === 0,
        validation: this.status.localValidation?.success ? 'PASSED' : 'FAILED',
        uncommitted: this.status.changesCount || 0
      }
    };

    const reportPath = path.join(ROOT, 'reports', 'GITHUB_ACTIONS_STATUS.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    return report;
  }

  // Exécution
  async run() {
    console.log('\n╔════════════════════════════════════════════════════════════════════╗');
    console.log('║                                                                    ║');
    console.log('║     CHECK GITHUB ACTIONS STATUS                                    ║');
    console.log('║                                                                    ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝\n');

    const startTime = Date.now();

    // Vérifications
    console.log('═'.repeat(70));
    const validationOK = await this.validateHomey();
    console.log();

    console.log('═'.repeat(70));
    this.getLastCommit();
    console.log();

    console.log('═'.repeat(70));
    const uncommitted = this.checkUncommittedChanges();
    console.log();

    console.log('═'.repeat(70));
    const filesCheck = this.checkRequiredFiles();
    console.log();

    console.log('═'.repeat(70));
    const imagesCheck = this.countDriverImages();
    console.log();

    // Rapport
    const report = this.generateReport();
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

    // Résumé final
    console.log('═'.repeat(70));
    console.log('📊 RÉSUMÉ PUBLICATION');
    console.log('═'.repeat(70));
    console.log(`\n⏱️  Temps: ${totalTime}s`);
    console.log(`\n✓ Validation Homey: ${validationOK ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`📝 Dernier commit: ${this.status.lastCommit?.hash || 'N/A'}`);
    console.log(`📊 Changements non commités: ${uncommitted}`);
    console.log(`📄 Fichiers requis: ${filesCheck.allPresent ? '✅ Tous présents' : '⚠️ Manquants'}`);
    console.log(`🎨 Images drivers: ${imagesCheck.withImages}/${imagesCheck.total}`);

    const ready = validationOK && uncommitted === 0 && filesCheck.allPresent;

    console.log(`\n🎯 Status Publication: ${ready ? '🟢 READY' : '🟡 EN ATTENTE'}`);

    if (ready) {
      console.log('\n✅ TOUT EST PRÊT POUR PUBLICATION!');
      console.log('📍 GitHub Actions: https://github.com/dlnraja/com.tuya.zigbee/actions');
      console.log('⏳ Vérifier le workflow en cours...');
    } else {
      console.log('\n⚠️  ACTIONS REQUISES:');
      if (!validationOK) console.log('   - Corriger erreurs validation Homey');
      if (uncommitted > 0) console.log('   - Commiter changements restants');
      if (!filesCheck.allPresent) console.log('   - Ajouter fichiers manquants');
    }

    console.log('\n' + '═'.repeat(70) + '\n');

    return report;
  }
}

// Exécuter
if (require.main === module) {
  const checker = new CheckGitHubActionsStatus();
  checker.run().catch(err => {
    console.error('Erreur fatale:', err);
    process.exit(1);
  });
}

module.exports = CheckGitHubActionsStatus;
