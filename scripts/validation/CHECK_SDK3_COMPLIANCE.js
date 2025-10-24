#!/usr/bin/env node
'use strict';

/**
 * CHECK SDK3 COMPLIANCE
 * Vérifie la conformité complète avec Homey SDK v3 et Guidelines
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');

class CheckSDK3Compliance {
  constructor() {
    this.checks = {
      passed: [],
      warnings: [],
      failed: []
    };
  }

  log(msg, icon = '✓') {
    console.log(`${icon} ${msg}`);
  }

  // Vérifier app.json
  checkAppJson() {
    this.log('Vérification app.json...', '📄');
    
    const appJsonPath = path.join(ROOT, 'app.json');
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

    // Champs requis
    const required = ['id', 'version', 'name', 'description', 'category', 'permissions'];
    required.forEach(field => {
      if (appJson[field]) {
        this.checks.passed.push(`app.json.${field} présent`);
      } else {
        this.checks.failed.push(`app.json.${field} manquant`);
      }
    });

    // SDK version
    if (appJson.sdk === 3) {
      this.checks.passed.push('SDK v3 confirmé');
    } else {
      this.checks.failed.push('SDK doit être version 3');
    }

    // Images
    if (appJson.images && appJson.images.small && appJson.images.large) {
      this.checks.passed.push('Images app définies');
    } else {
      this.checks.failed.push('Images app manquantes dans app.json');
    }

    return appJson;
  }

  // Vérifier README.txt
  checkReadme() {
    this.log('Vérification README.txt...', '📝');
    
    const readmePath = path.join(ROOT, 'README.txt');
    
    if (fs.existsSync(readmePath)) {
      const content = fs.readFileSync(readmePath, 'utf8');
      
      if (content.length > 100) {
        this.checks.passed.push('README.txt présent et complet');
      } else {
        this.checks.warnings.push('README.txt trop court');
      }
    } else {
      this.checks.failed.push('README.txt manquant (requis pour App Store)');
    }
  }

  // Vérifier images
  checkImages() {
    this.log('Vérification images...', '🎨');
    
    const imagesPath = path.join(ROOT, 'assets', 'images');
    const requiredImages = ['large.png', 'small.png'];
    
    requiredImages.forEach(img => {
      const imgPath = path.join(imagesPath, img);
      if (fs.existsSync(imgPath)) {
        const stats = fs.statSync(imgPath);
        this.checks.passed.push(`${img} présent (${Math.round(stats.size/1024)} KB)`);
      } else {
        this.checks.failed.push(`${img} manquant`);
      }
    });
  }

  // Vérifier drivers
  checkDrivers() {
    this.log('Vérification drivers...', '🚗');
    
    const driversPath = path.join(ROOT, 'drivers');
    
    if (!fs.existsSync(driversPath)) {
      this.checks.failed.push('Dossier drivers manquant');
      return;
    }

    const drivers = fs.readdirSync(driversPath).filter(name => {
      return fs.statSync(path.join(driversPath, name)).isDirectory();
    });

    this.checks.passed.push(`${drivers.length} drivers trouvés`);

    // Vérifier structure de quelques drivers
    let driversChecked = 0;
    let driversOK = 0;

    for (const driver of drivers.slice(0, 10)) { // Check 10 premiers
      const driverPath = path.join(driversPath, driver);
      const composePath = path.join(driverPath, 'driver.compose.json');
      
      if (fs.existsSync(composePath)) {
        driversOK++;
      }
      driversChecked++;
    }

    if (driversOK === driversChecked) {
      this.checks.passed.push('Drivers correctement structurés');
    } else {
      this.checks.warnings.push(`${driversChecked - driversOK}/${driversChecked} drivers avec problèmes`);
    }
  }

  // Vérifier validation Homey CLI
  checkHomeyValidation() {
    this.log('Validation Homey CLI...', '✓');
    
    try {
      const result = execSync('homey app validate --level publish', {
        cwd: ROOT,
        encoding: 'utf8',
        stdio: 'pipe'
      });

      if (result.includes('validated successfully')) {
        this.checks.passed.push('Homey CLI validation PASSED');
        
        const warnings = (result.match(/Warning:/g) || []).length;
        if (warnings > 0) {
          this.checks.warnings.push(`${warnings} warnings Homey`);
        } else {
          this.checks.passed.push('0 warnings Homey');
        }
      } else {
        this.checks.failed.push('Homey CLI validation FAILED');
      }
    } catch (err) {
      this.checks.failed.push('Impossible de valider avec Homey CLI');
    }
  }

  // Vérifier permissions
  checkPermissions() {
    this.log('Vérification permissions...', '🔒');
    
    const appJsonPath = path.join(ROOT, 'app.json');
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

    if (appJson.permissions && Array.isArray(appJson.permissions)) {
      this.checks.passed.push(`${appJson.permissions.length} permissions déclarées`);
      
      // Vérifier que Zigbee est présent
      if (appJson.permissions.includes('homey:wireless:zigbee')) {
        this.checks.passed.push('Permission Zigbee présente');
      } else {
        this.checks.failed.push('Permission Zigbee manquante');
      }
    } else {
      this.checks.failed.push('Permissions non définies');
    }
  }

  // Vérifier compatibility
  checkCompatibility() {
    this.log('Vérification compatibility...', '📱');
    
    const appJsonPath = path.join(ROOT, 'app.json');
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

    if (appJson.compatibility) {
      this.checks.passed.push('Compatibility définie');
    } else {
      this.checks.warnings.push('Compatibility non spécifiée');
    }
  }

  // Générer rapport
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        passed: this.checks.passed.length,
        warnings: this.checks.warnings.length,
        failed: this.checks.failed.length,
        total: this.checks.passed.length + this.checks.warnings.length + this.checks.failed.length
      },
      checks: this.checks,
      compliance: this.checks.failed.length === 0 ? 'COMPLIANT' : 'NON_COMPLIANT'
    };

    const reportPath = path.join(ROOT, 'reports', 'SDK3_COMPLIANCE_REPORT.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    return report;
  }

  // Exécution
  async run() {
    console.log('\n╔════════════════════════════════════════════════════════════════════╗');
    console.log('║                                                                    ║');
    console.log('║     CHECK SDK3 COMPLIANCE - VÉRIFICATION COMPLÈTE                  ║');
    console.log('║                                                                    ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝\n');

    const startTime = Date.now();

    // Toutes les vérifications
    console.log('═'.repeat(70));
    this.checkAppJson();
    console.log();
    
    console.log('═'.repeat(70));
    this.checkReadme();
    console.log();
    
    console.log('═'.repeat(70));
    this.checkImages();
    console.log();
    
    console.log('═'.repeat(70));
    this.checkDrivers();
    console.log();
    
    console.log('═'.repeat(70));
    this.checkPermissions();
    console.log();
    
    console.log('═'.repeat(70));
    this.checkCompatibility();
    console.log();
    
    console.log('═'.repeat(70));
    this.checkHomeyValidation();
    console.log();

    // Rapport
    const report = this.generateReport();
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

    // Résumé
    console.log('═'.repeat(70));
    console.log('📊 RÉSUMÉ SDK3 COMPLIANCE');
    console.log('═'.repeat(70));
    console.log(`\n⏱️  Temps: ${totalTime}s`);
    console.log(`✅ Passed: ${report.summary.passed}`);
    console.log(`⚠️  Warnings: ${report.summary.warnings}`);
    console.log(`❌ Failed: ${report.summary.failed}`);
    console.log(`📊 Total checks: ${report.summary.total}`);

    const percentage = Math.round((report.summary.passed / report.summary.total) * 100);
    console.log(`\n📈 Score: ${percentage}%`);

    if (report.compliance === 'COMPLIANT') {
      console.log('\n🟢 Status: SDK3 COMPLIANT');
    } else {
      console.log('\n🔴 Status: NON COMPLIANT - Actions requises');
      
      console.log('\n❌ Échecs:');
      this.checks.failed.forEach(f => {
        console.log(`   - ${f}`);
      });
    }

    if (this.checks.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      this.checks.warnings.slice(0, 5).forEach(w => {
        console.log(`   - ${w}`);
      });
    }

    console.log('\n' + '═'.repeat(70));
    console.log(report.compliance === 'COMPLIANT' ? '✅ SDK3 COMPLIANCE VÉRIFIÉE' : '⚠️  CORRECTIONS NÉCESSAIRES');
    console.log('═'.repeat(70) + '\n');

    return report;
  }
}

// Exécuter
if (require.main === module) {
  const checker = new CheckSDK3Compliance();
  checker.run().catch(err => {
    console.error('Erreur fatale:', err);
    process.exit(1);
  });
}

module.exports = CheckSDK3Compliance;
