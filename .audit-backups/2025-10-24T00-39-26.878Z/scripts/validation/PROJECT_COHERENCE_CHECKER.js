#!/usr/bin/env node
'use strict';

/**
 * PROJECT COHERENCE CHECKER
 * Vérifie la cohérence de tous les fichiers .js du projet
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

class ProjectCoherenceChecker {
  constructor() {
    this.issues = {
      syntax: [],
      consistency: [],
      duplicates: [],
      unused: [],
      missing: [],
      warnings: []
    };
    
    this.stats = {
      totalJS: 0,
      drivers: 0,
      scripts: 0,
      libs: 0,
      valid: 0,
      errors: 0
    };
    
    this.seenCode = new Map();
  }

  log(msg, icon = '🔍') {
    console.log(`${icon} ${msg}`);
  }

  // Vérifier syntaxe JavaScript
  checkJSSyntax(filePath) {
    try {
      const code = fs.readFileSync(filePath, 'utf8');
      
      // Test basique de syntaxe
      new Function(code);
      
      return { valid: true };
    } catch (err) {
      return {
        valid: false,
        error: err.message,
        line: err.lineNumber
      };
    }
  }

  // Vérifier cohérence device.js
  checkDeviceJS(filePath) {
    const issues = [];
    const code = fs.readFileSync(filePath, 'utf8');

    // Vérifications essentielles
    const checks = {
      hasOnNodeInit: /async\s+onNodeInit\s*\(/,
      hasZigBeeDevice: /require\s*\(\s*['"]homey-zigbeedriver['"]\s*\)/,
      hasRegisterCapability: /registerCapability/,
      hasOnDeleted: /async\s+onDeleted\s*\(/,
      hasLog: /this\.log/,
      hasError: /this\.error/
    };

    for (const [check, pattern] of Object.entries(checks)) {
      if (!pattern.test(code)) {
        issues.push(`Missing: ${check}`);
      }
    }

    // Vérifier battery monitoring si measure_battery
    if (code.includes('measure_battery') && !code.includes('monitorBattery')) {
      issues.push('Has measure_battery but no battery monitoring');
    }

    // Vérifier IAS Zone
    if (code.includes('ssIasZone') && !code.includes('IASZoneEnroller')) {
      issues.push('Uses IAS Zone but no IASZoneEnroller');
    }

    return issues;
  }

  // Vérifier driver.compose.json cohérence
  checkDriverComposeJSON(driverPath) {
    const issues = [];
    const composeFile = path.join(driverPath, 'driver.compose.json');
    
    if (!fs.existsSync(composeFile)) {
      return ['Missing driver.compose.json'];
    }

    try {
      const compose = JSON.parse(fs.readFileSync(composeFile, 'utf8'));

      // Vérifications
      if (!compose.name) issues.push('Missing name');
      if (!compose.class) issues.push('Missing class');
      if (!compose.capabilities) issues.push('Missing capabilities');
      if (!compose.images) issues.push('Missing images');
      
      // Battery
      if (compose.capabilities?.includes('measure_battery')) {
        if (!compose.energy?.batteries) {
          issues.push('Has measure_battery but no energy.batteries');
        }
      }

      // Images
      if (compose.images) {
        const requiredImages = ['small', 'large', 'xlarge'];
        for (const img of requiredImages) {
          if (!compose.images[img]) {
            issues.push(`Missing image: ${img}`);
          } else {
            const imgPath = path.join(driverPath, compose.images[img]);
            if (!fs.existsSync(imgPath)) {
              issues.push(`Image not found: ${compose.images[img]}`);
            }
          }
        }
      }

      // Zigbee
      if (compose.zigbee) {
        if (!compose.zigbee.endpoints) {
          issues.push('Zigbee driver without endpoints');
        }
      }

    } catch (err) {
      issues.push(`JSON error: ${err.message}`);
    }

    return issues;
  }

  // Détecter code dupliqué
  checkDuplicateCode(filePath, code) {
    // Hash simple du code (sans whitespace)
    const normalized = code.replace(/\s+/g, ' ').trim();
    const hash = normalized.substring(0, 200); // Premier 200 chars

    if (this.seenCode.has(hash)) {
      const original = this.seenCode.get(hash);
      if (original !== filePath) {
        return {
          isDuplicate: true,
          original
        };
      }
    } else {
      this.seenCode.set(hash, filePath);
    }

    return { isDuplicate: false };
  }

  // Vérifier un driver complet
  async checkDriver(driverPath) {
    const driverName = path.basename(driverPath);
    const deviceFile = path.join(driverPath, 'device.js');
    const driverFile = path.join(driverPath, 'driver.js');

    this.stats.drivers++;

    // Vérifier compose.json
    const composeIssues = this.checkDriverComposeJSON(driverPath);
    if (composeIssues.length > 0) {
      this.issues.consistency.push({
        file: `${driverName}/driver.compose.json`,
        issues: composeIssues
      });
    }

    // Vérifier device.js
    if (fs.existsSync(deviceFile)) {
      const syntaxCheck = this.checkJSSyntax(deviceFile);
      if (!syntaxCheck.valid) {
        this.issues.syntax.push({
          file: `${driverName}/device.js`,
          error: syntaxCheck.error
        });
        this.stats.errors++;
      } else {
        const deviceIssues = this.checkDeviceJS(deviceFile);
        if (deviceIssues.length > 0) {
          this.issues.warnings.push({
            file: `${driverName}/device.js`,
            issues: deviceIssues
          });
        }
        this.stats.valid++;
      }
    }

    // Vérifier driver.js si existe
    if (fs.existsSync(driverFile)) {
      const syntaxCheck = this.checkJSSyntax(driverFile);
      if (!syntaxCheck.valid) {
        this.issues.syntax.push({
          file: `${driverName}/driver.js`,
          error: syntaxCheck.error
        });
        this.stats.errors++;
      } else {
        this.stats.valid++;
      }
    }
  }

  // Vérifier tous les drivers
  async checkAllDrivers() {
    this.log('Vérification de tous les drivers...', '🚗');
    console.log('═'.repeat(70));

    const driversPath = path.join(ROOT, 'drivers');
    const drivers = fs.readdirSync(driversPath).filter(name => {
      return fs.statSync(path.join(driversPath, name)).isDirectory();
    });

    this.log(`${drivers.length} drivers à vérifier`);

    for (const driver of drivers) {
      const driverPath = path.join(driversPath, driver);
      await this.checkDriver(driverPath);
    }

    this.log(`${this.stats.drivers} drivers vérifiés`, '✅');
  }

  // Vérifier scripts
  async checkAllScripts() {
    this.log('Vérification de tous les scripts...', '📜');
    console.log('═'.repeat(70));

    const scriptsPath = path.join(ROOT, 'scripts');
    const files = this.getAllJSFiles(scriptsPath);

    this.stats.scripts = files.length;
    this.log(`${files.length} scripts à vérifier`);

    for (const file of files) {
      const syntaxCheck = this.checkJSSyntax(file);
      if (!syntaxCheck.valid) {
        this.issues.syntax.push({
          file: path.relative(ROOT, file),
          error: syntaxCheck.error
        });
        this.stats.errors++;
      } else {
        this.stats.valid++;
      }
    }

    this.log(`${files.length} scripts vérifiés`, '✅');
  }

  // Vérifier libs
  async checkLibs() {
    this.log('Vérification des bibliothèques...', '📚');
    console.log('═'.repeat(70));

    const libPath = path.join(ROOT, 'lib');
    if (!fs.existsSync(libPath)) return;

    const files = this.getAllJSFiles(libPath);
    this.stats.libs = files.length;

    for (const file of files) {
      const syntaxCheck = this.checkJSSyntax(file);
      if (!syntaxCheck.valid) {
        this.issues.syntax.push({
          file: path.relative(ROOT, file),
          error: syntaxCheck.error
        });
        this.stats.errors++;
      } else {
        this.stats.valid++;
      }
    }

    this.log(`${files.length} libs vérifiées`, '✅');
  }

  // Récupérer tous les fichiers .js
  getAllJSFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
        this.getAllJSFiles(filePath, fileList);
      } else if (file.endsWith('.js')) {
        fileList.push(filePath);
      }
    }
    
    return fileList;
  }

  // Générer rapport
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalFiles: this.stats.totalJS,
        drivers: this.stats.drivers,
        scripts: this.stats.scripts,
        libs: this.stats.libs,
        valid: this.stats.valid,
        errors: this.stats.errors,
        syntaxIssues: this.issues.syntax.length,
        consistencyIssues: this.issues.consistency.length,
        warnings: this.issues.warnings.length
      },
      issues: this.issues,
      healthScore: this.calculateHealthScore()
    };

    const reportPath = path.join(ROOT, 'reports', 'PROJECT_COHERENCE_REPORT.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    return report;
  }

  // Calculer score santé
  calculateHealthScore() {
    const total = this.stats.totalJS;
    if (total === 0) return 100;

    const issues = this.issues.syntax.length + 
                   this.issues.consistency.length + 
                   this.issues.warnings.length;

    const score = Math.max(0, Math.min(100, 100 - (issues / total * 100)));
    return Math.round(score);
  }

  // Exécution complète
  async run() {
    console.log('\n╔════════════════════════════════════════════════════════════════════╗');
    console.log('║                                                                    ║');
    console.log('║     PROJECT COHERENCE CHECKER - VÉRIFICATION COMPLÈTE              ║');
    console.log('║                                                                    ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝\n');

    const startTime = Date.now();

    // Vérifier tout
    await this.checkAllDrivers();
    await this.checkAllScripts();
    await this.checkLibs();

    // Total files
    this.stats.totalJS = this.stats.valid + this.stats.errors;

    // Générer rapport
    const report = this.generateReport();

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

    // Résumé
    console.log('\n' + '═'.repeat(70));
    console.log('📊 RÉSUMÉ VÉRIFICATION');
    console.log('═'.repeat(70));
    console.log(`\n⏱️  Temps: ${totalTime}s`);
    console.log(`📁 Fichiers JS: ${this.stats.totalJS}`);
    console.log(`   - Drivers: ${this.stats.drivers}`);
    console.log(`   - Scripts: ${this.stats.scripts}`);
    console.log(`   - Libs: ${this.stats.libs}`);
    console.log(`\n✅ Valides: ${this.stats.valid}`);
    console.log(`❌ Erreurs: ${this.stats.errors}`);

    // Score santé
    const healthScore = report.healthScore;
    const healthIcon = healthScore >= 90 ? '🟢' : healthScore >= 70 ? '🟡' : '🔴';
    console.log(`\n${healthIcon} Score santé: ${healthScore}%`);

    // Issues
    if (this.issues.syntax.length > 0) {
      console.log(`\n⚠️  Erreurs syntaxe: ${this.issues.syntax.length}`);
      this.issues.syntax.slice(0, 5).forEach(issue => {
        console.log(`   - ${issue.file}: ${issue.error}`);
      });
    }

    if (this.issues.consistency.length > 0) {
      console.log(`\n⚠️  Problèmes cohérence: ${this.issues.consistency.length}`);
      this.issues.consistency.slice(0, 5).forEach(issue => {
        console.log(`   - ${issue.file}: ${issue.issues.join(', ')}`);
      });
    }

    if (this.issues.warnings.length > 0) {
      console.log(`\n💡 Warnings: ${this.issues.warnings.length}`);
    }

    console.log('\n' + '═'.repeat(70));
    console.log('✅ VÉRIFICATION TERMINÉE');
    console.log('═'.repeat(70));
    console.log(`\n📄 Rapport: reports/PROJECT_COHERENCE_REPORT.json\n`);

    return report;
  }
}

// Exécuter
if (require.main === module) {
  const checker = new ProjectCoherenceChecker();
  checker.run().catch(err => {
    console.error('Erreur fatale:', err);
    process.exit(1);
  });
}

module.exports = ProjectCoherenceChecker;
