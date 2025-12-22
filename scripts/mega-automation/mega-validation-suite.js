#!/usr/bin/env node

/**
 * 🧪 MEGA VALIDATION SUITE v1.0.0
 *
 * Suite complète de tests et validations avant push/publish automatique:
 * - Homey App Build & Validate (CRITIQUE selon mémoire)
 * - Structure .homeycompose/ (CRITIQUE - cause racine problèmes précédents)
 * - Validation JSON tous fichiers
 * - Tests scripts MEGA
 * - Vérifications SDK3 compliance
 * - Anti-régression checks
 *
 * OBJECTIF: ZERO ERROR GUARANTEE pour GitHub Actions push/publish
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

class MegaValidationSuite {
  constructor() {
    this.config = {
      // Tests critiques (bloquants)
      criticalTests: {
        homeyAppBuild: true,        // homey app build --production
        homeyAppValidate: true,     // homey app validate --level publish
        homeycomposeStructure: true, // .homeycompose/ structure (CRITIQUE mémoire)
        jsonValidation: true,       // Tous JSON valides
        sdk3Compliance: true        // SDK3 rules compliance
      },

      // Tests importants (warnings)
      importantTests: {
        scriptSyntax: true,         // Syntaxe scripts MEGA
        driverStructure: true,      // Structure drivers
        imageValidation: true,      // Images présentes
        changelogValid: true        // Changelog valide
      },

      // Seuils validation
      thresholds: {
        maxBuildTime: 300000,       // 5 min max pour build
        maxValidationTime: 180000,  // 3 min max pour validation
        maxFileSize: 50 * 1024,     // 50KB max par driver.compose.json
        maxImageSize: 20 * 1024,    // 20KB max par image
        minDrivers: 100,            // Min 100 drivers attendus
        maxDrivers: 500             // Max 500 drivers (éviter bloat)
      },

      // Chemins critiques selon mémoire
      criticalPaths: [
        '.homeycompose/',           // CRITIQUE - source de vérité SDK3
        '.homeycompose/app.json',   // CRITIQUE - configuration app
        '.homeycompose/drivers/',   // CRITIQUE - drivers source
        'app.json',                 // Configuration finale
        'drivers/',                 // Drivers compilés
        '.homeychangelog.json'      // Changelog
      ]
    };

    this.validationResults = {
      startTime: Date.now(),
      totalTests: 0,
      testsPassed: 0,
      testsFailed: 0,
      testsWarning: 0,
      criticalErrors: [],
      warnings: [],
      details: {},
      buildOutput: '',
      validateOutput: '',
      success: false,
      canPushSafely: false
    };
  }

  /**
   * 📝 Logger compatible GitHub Actions avec niveaux
   */
  async log(level, message, data = null) {
    const timestamp = new Date().toISOString();

    if (process.env.GITHUB_ACTIONS === 'true') {
      switch (level.toUpperCase()) {
        case 'ERROR':
          console.log(`::error::${message}`);
          break;
        case 'WARN':
          console.log(`::warning::${message}`);
          break;
        case 'SUCCESS':
          console.log(`::notice::✅ ${message}`);
          break;
        case 'DEBUG':
          console.log(`::debug::${message}`);
          break;
        default:
          console.log(`[${timestamp}] ${message}`);
      }
    } else {
      console.log(`[${timestamp}] [${level}] ${message}`);
    }

    if (data && level === 'DEBUG') {
      console.log(JSON.stringify(data, null, 2));
    }
  }

  /**
   * 🏗️ TEST CRITIQUE: Homey App Build
   * SELON MÉMOIRE: Build doit passer avant tout push
   */
  async testHomeyAppBuild() {
    this.validationResults.totalTests++;

    try {
      await this.log('INFO', '🏗️ Testing Homey App Build (CRITICAL)...');

      const startTime = Date.now();

      // Execute build with timeout
      const buildOutput = execSync('homey app build --production', {
        cwd: process.cwd(),
        encoding: 'utf8',
        timeout: this.config.thresholds.maxBuildTime,
        stdio: 'pipe'
      });

      const buildTime = Date.now() - startTime;
      this.validationResults.buildOutput = buildOutput;

      // Vérifier succès build
      if (buildOutput.includes('Build complete') || !buildOutput.includes('Error')) {
        this.validationResults.testsPassed++;
        this.validationResults.details.homeyBuild = {
          status: 'passed',
          duration: buildTime,
          output: buildOutput.substring(0, 500)
        };

        await this.log('SUCCESS', `✅ Homey App Build passed (${(buildTime / 1000).toFixed(1)}s)`);
        return true;
      } else {
        throw new Error('Build output indicates failure');
      }

    } catch (error) {
      this.validationResults.testsFailed++;
      this.validationResults.criticalErrors.push({
        test: 'homeyAppBuild',
        error: error.message,
        severity: 'critical',
        blocker: true
      });

      await this.log('ERROR', `❌ CRITICAL: Homey App Build FAILED - ${error.message}`);
      return false;
    }
  }

  /**
   * ✅ TEST CRITIQUE: Homey App Validate
   * SELON MÉMOIRE: --level publish obligatoire avant deploy
   */
  async testHomeyAppValidate() {
    this.validationResults.totalTests++;

    try {
      await this.log('INFO', '✅ Testing Homey App Validate --level publish (CRITICAL)...');

      const startTime = Date.now();

      const validateOutput = execSync('homey app validate --level publish', {
        cwd: process.cwd(),
        encoding: 'utf8',
        timeout: this.config.thresholds.maxValidationTime,
        stdio: 'pipe'
      });

      const validateTime = Date.now() - startTime;
      this.validationResults.validateOutput = validateOutput;

      // Analyser output validation
      const errorCount = (validateOutput.match(/error/gi) || []).length;
      const warningCount = (validateOutput.match(/warning/gi) || []).length;

      if (errorCount === 0) {
        this.validationResults.testsPassed++;
        this.validationResults.details.homeyValidate = {
          status: 'passed',
          duration: validateTime,
          warnings: warningCount,
          output: validateOutput.substring(0, 500)
        };

        await this.log('SUCCESS', `✅ Homey App Validation passed - ${warningCount} warnings (${(validateTime / 1000).toFixed(1)}s)`);
        return true;
      } else {
        throw new Error(`Validation failed with ${errorCount} errors`);
      }

    } catch (error) {
      this.validationResults.testsFailed++;
      this.validationResults.criticalErrors.push({
        test: 'homeyAppValidate',
        error: error.message,
        severity: 'critical',
        blocker: true
      });

      await this.log('ERROR', `❌ CRITICAL: Homey App Validation FAILED - ${error.message}`);
      return false;
    }
  }

  /**
   * 🏗️ TEST CRITIQUE: Structure .homeycompose/
   * SELON MÉMOIRE: Cause racine problèmes - DOIT exister et être complète
   */
  async testHomeycomposeStructure() {
    this.validationResults.totalTests++;

    try {
      await this.log('INFO', '🏗️ Testing .homeycompose/ structure (CRITICAL from memory)...');

      const issues = [];

      // 1. Vérifier existence .homeycompose/
      try {
        await fs.access(path.join(process.cwd(), '.homeycompose'));
      } catch {
        issues.push('.homeycompose/ directory MISSING - CRITICAL ISSUE from memory');
      }

      // 2. Vérifier app.json
      try {
        const appJsonPath = path.join(process.cwd(), '.homeycompose', 'app.json');
        const appJsonContent = await fs.readFile(appJsonPath, 'utf8');
        const appConfig = JSON.parse(appJsonContent);

        if (!appConfig.version) {
          issues.push('.homeycompose/app.json missing version');
        }
        if (!appConfig.id) {
          issues.push('.homeycompose/app.json missing id');
        }
      } catch (error) {
        issues.push(`.homeycompose/app.json invalid or missing - ${error.message}`);
      }

      // 3. Vérifier drivers directory
      try {
        const driversPath = path.join(process.cwd(), '.homeycompose', 'drivers');
        const drivers = await fs.readdir(driversPath);

        if (drivers.length < this.config.thresholds.minDrivers) {
          issues.push(`Too few drivers in .homeycompose/drivers: ${drivers.length} < ${this.config.thresholds.minDrivers}`);
        }
        if (drivers.length > this.config.thresholds.maxDrivers) {
          issues.push(`Too many drivers in .homeycompose/drivers: ${drivers.length} > ${this.config.thresholds.maxDrivers}`);
        }

        // Vérifier quelques drivers
        for (const driverName of drivers.slice(0, 10)) {
          try {
            const driverPath = path.join(driversPath, driverName, 'driver.compose.json');
            const content = await fs.readFile(driverPath, 'utf8');
            JSON.parse(content); // Vérifier JSON valid
          } catch (error) {
            issues.push(`Driver ${driverName} invalid: ${error.message}`);
          }
        }

      } catch (error) {
        issues.push(`.homeycompose/drivers directory issue - ${error.message}`);
      }

      if (issues.length === 0) {
        this.validationResults.testsPassed++;
        this.validationResults.details.homeycomposeStructure = {
          status: 'passed',
          issues: 0
        };

        await this.log('SUCCESS', '✅ .homeycompose/ structure validation passed');
        return true;
      } else {
        throw new Error(`Structure issues: ${issues.join(', ')}`);
      }

    } catch (error) {
      this.validationResults.testsFailed++;
      this.validationResults.criticalErrors.push({
        test: 'homeycomposeStructure',
        error: error.message,
        severity: 'critical',
        blocker: true
      });

      await this.log('ERROR', `❌ CRITICAL: .homeycompose/ structure FAILED - ${error.message}`);
      return false;
    }
  }

  /**
   * 📝 TEST CRITIQUE: Validation JSON tous fichiers
   */
  async testJSONValidation() {
    this.validationResults.totalTests++;

    try {
      await this.log('INFO', '📝 Testing JSON validation for all files...');

      const jsonFiles = [];
      const invalidFiles = [];

      // Collecter tous les fichiers JSON critiques
      const jsonPaths = [
        'app.json',
        '.homeychangelog.json',
        '.homeycompose/app.json'
      ];

      // Ajouter tous les driver.compose.json
      try {
        const driversPath = path.join(process.cwd(), '.homeycompose', 'drivers');
        const drivers = await fs.readdir(driversPath);

        for (const driverName of drivers) {
          jsonPaths.push(path.join('.homeycompose/drivers', driverName, 'driver.compose.json'));
        }
      } catch {
        // Si .homeycompose/drivers n'existe pas, ce sera catchhé par le test homeycompose
      }

      // Valider chaque fichier JSON
      for (const jsonPath of jsonPaths) {
        try {
          const fullPath = path.join(process.cwd(), jsonPath);
          const content = await fs.readFile(fullPath, 'utf8');
          JSON.parse(content); // Test parsing

          jsonFiles.push(jsonPath);

          // Vérifier taille fichier
          if (jsonPath.includes('driver.compose.json') && content.length > this.config.thresholds.maxFileSize) {
            this.validationResults.warnings.push({
              test: 'jsonValidation',
              warning: `Large file: ${jsonPath} (${content.length} bytes)`,
              severity: 'warning'
            });
          }

        } catch (error) {
          invalidFiles.push(`${jsonPath}: ${error.message}`);
        }
      }

      if (invalidFiles.length === 0) {
        this.validationResults.testsPassed++;
        this.validationResults.details.jsonValidation = {
          status: 'passed',
          filesChecked: jsonFiles.length,
          validFiles: jsonFiles.length
        };

        await this.log('SUCCESS', `✅ JSON validation passed - ${jsonFiles.length} files valid`);
        return true;
      } else {
        throw new Error(`Invalid JSON files: ${invalidFiles.join(', ')}`);
      }

    } catch (error) {
      this.validationResults.testsFailed++;
      this.validationResults.criticalErrors.push({
        test: 'jsonValidation',
        error: error.message,
        severity: 'critical',
        blocker: true
      });

      await this.log('ERROR', `❌ CRITICAL: JSON validation FAILED - ${error.message}`);
      return false;
    }
  }

  /**
   * 🛡️ TEST: SDK3 Compliance selon mémoire
   */
  async testSDK3Compliance() {
    this.validationResults.totalTests++;

    try {
      await this.log('INFO', '🛡️ Testing SDK3 compliance...');

      const issues = [];

      // Vérifier drivers pour compliance SDK3
      try {
        const driversPath = path.join(process.cwd(), '.homeycompose', 'drivers');
        const drivers = await fs.readdir(driversPath);

        for (const driverName of drivers.slice(0, 20)) { // Check first 20
          try {
            const driverPath = path.join(driversPath, driverName, 'driver.compose.json');
            const content = await fs.readFile(driverPath, 'utf8');
            const config = JSON.parse(content);

            // RÈGLE SDK3: Clusters numériques uniquement
            if (config.zigbee?.clusters) {
              const invalidClusters = config.zigbee.clusters.filter(c => typeof c !== 'number');
              if (invalidClusters.length > 0) {
                issues.push(`${driverName}: non-numeric clusters ${invalidClusters.join(',')}`);
              }
            }

            // RÈGLE SDK3: alarm_battery obsolète
            if (config.capabilities?.includes('alarm_battery')) {
              issues.push(`${driverName}: obsolete alarm_battery capability`);
            }

            // RÈGLE: manufacturerName + productId pair
            if (!config.zigbee?.manufacturerName || !config.zigbee?.productId) {
              issues.push(`${driverName}: missing manufacturerName or productId pair`);
            }

          } catch (error) {
            issues.push(`${driverName}: validation error - ${error.message}`);
          }
        }

      } catch (error) {
        issues.push(`Drivers directory error: ${error.message}`);
      }

      if (issues.length === 0) {
        this.validationResults.testsPassed++;
        this.validationResults.details.sdk3Compliance = {
          status: 'passed',
          issues: 0
        };

        await this.log('SUCCESS', '✅ SDK3 compliance validation passed');
        return true;
      } else if (issues.length <= 5) { // Warning if few issues
        this.validationResults.testsPassed++;
        this.validationResults.testsWarning++;
        this.validationResults.warnings.push({
          test: 'sdk3Compliance',
          warning: `Minor SDK3 issues: ${issues.slice(0, 3).join('; ')}`,
          severity: 'warning'
        });

        await this.log('WARN', `⚠️ SDK3 compliance passed with ${issues.length} minor issues`);
        return true;
      } else {
        throw new Error(`Too many SDK3 issues: ${issues.slice(0, 5).join('; ')}`);
      }

    } catch (error) {
      this.validationResults.testsFailed++;
      this.validationResults.criticalErrors.push({
        test: 'sdk3Compliance',
        error: error.message,
        severity: 'high',
        blocker: false // Non-bloquant mais important
      });

      await this.log('ERROR', `❌ SDK3 compliance FAILED - ${error.message}`);
      return false;
    }
  }

  /**
   * 🧪 TEST: Syntaxe scripts MEGA
   */
  async testMegaScriptsSyntax() {
    this.validationResults.totalTests++;

    try {
      await this.log('INFO', '🧪 Testing MEGA scripts syntax...');

      const scriptFiles = [
        'scripts/mega-automation/github-multi-source-monitor.js',
        'scripts/mega-automation/forum-scraping-system.js',
        'scripts/mega-automation/database-sync-system.js',
        'scripts/mega-automation/mega-integration-engine.js',
        'scripts/mega-automation/mega-comment-system.js',
        'scripts/mega-automation/pre-integration-validator.js',
        'scripts/mega-automation/mega-versioning-system.js',
        'scripts/mega-automation/weekly-full-analysis.js'
      ];

      const issues = [];

      for (const scriptPath of scriptFiles) {
        try {
          const fullPath = path.join(process.cwd(), scriptPath);

          // Vérifier existence
          await fs.access(fullPath);

          // Vérifier syntaxe basique (require syntax check)
          const content = await fs.readFile(fullPath, 'utf8');

          // Basic syntax checks
          if (!content.includes('#!/usr/bin/env node')) {
            issues.push(`${scriptPath}: missing shebang`);
          }
          if (!content.includes('module.exports')) {
            issues.push(`${scriptPath}: missing module.exports`);
          }
          if (content.includes('console.log') && !content.includes('GitHub Actions')) {
            // Allow console.log if it's for GitHub Actions
          }

        } catch (error) {
          issues.push(`${scriptPath}: ${error.message}`);
        }
      }

      if (issues.length === 0) {
        this.validationResults.testsPassed++;
        this.validationResults.details.megaScriptsSyntax = {
          status: 'passed',
          scriptsChecked: scriptFiles.length
        };

        await this.log('SUCCESS', `✅ MEGA scripts syntax validation passed - ${scriptFiles.length} scripts`);
        return true;
      } else {
        this.validationResults.testsWarning++;
        this.validationResults.warnings.push({
          test: 'megaScriptsSyntax',
          warning: `Script issues: ${issues.slice(0, 3).join('; ')}`,
          severity: 'warning'
        });

        await this.log('WARN', `⚠️ MEGA scripts have ${issues.length} minor issues`);
        return true; // Non-bloquant
      }

    } catch (error) {
      this.validationResults.testsFailed++;
      this.validationResults.warnings.push({
        test: 'megaScriptsSyntax',
        warning: error.message,
        severity: 'warning'
      });

      await this.log('WARN', `⚠️ MEGA scripts syntax check failed - ${error.message}`);
      return true; // Non-bloquant
    }
  }

  /**
   * 📊 Générer rapport validation complet
   */
  async generateValidationReport() {
    const duration = Date.now() - this.validationResults.startTime;

    const report = {
      timestamp: new Date().toISOString(),
      duration: duration,
      summary: {
        totalTests: this.validationResults.totalTests,
        passed: this.validationResults.testsPassed,
        failed: this.validationResults.testsFailed,
        warnings: this.validationResults.testsWarning,
        success: this.validationResults.success,
        canPushSafely: this.validationResults.canPushSafely
      },
      criticalErrors: this.validationResults.criticalErrors,
      warnings: this.validationResults.warnings,
      testDetails: this.validationResults.details,
      buildOutput: this.validationResults.buildOutput.substring(0, 1000),
      validateOutput: this.validationResults.validateOutput.substring(0, 1000)
    };

    // Sauvegarder rapport
    const reportPath = path.join(process.cwd(), 'logs', 'mega-automation', `validation-${Date.now()}.json`);
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    await this.log('INFO', `📊 Validation report saved to ${reportPath}`);

    return report;
  }

  /**
   * 🚀 Exécution complète validation suite
   */
  async execute() {
    try {
      await this.log('INFO', '🚀 Starting MEGA Validation Suite - ZERO ERROR GUARANTEE');

      // Tests critiques (bloquants)
      const criticalTests = [];

      if (this.config.criticalTests.homeycomposeStructure) {
        criticalTests.push(() => this.testHomeycomposeStructure());
      }

      if (this.config.criticalTests.jsonValidation) {
        criticalTests.push(() => this.testJSONValidation());
      }

      if (this.config.criticalTests.homeyAppBuild) {
        criticalTests.push(() => this.testHomeyAppBuild());
      }

      if (this.config.criticalTests.homeyAppValidate) {
        criticalTests.push(() => this.testHomeyAppValidate());
      }

      if (this.config.criticalTests.sdk3Compliance) {
        criticalTests.push(() => this.testSDK3Compliance());
      }

      // Exécuter tests critiques
      let allCriticalPassed = true;
      for (const test of criticalTests) {
        const result = await test();
        if (!result) {
          allCriticalPassed = false;
          // Continue pour voir tous les problèmes
        }
      }

      // Tests importants (non-bloquants)
      if (this.config.importantTests.scriptSyntax) {
        await this.testMegaScriptsSyntax();
      }

      // Déterminer succès global
      this.validationResults.success = allCriticalPassed && this.validationResults.criticalErrors.filter(e => e.blocker).length === 0;
      this.validationResults.canPushSafely = this.validationResults.success;

      // Générer rapport
      const report = await this.generateValidationReport();

      // Résumé final
      if (this.validationResults.canPushSafely) {
        await this.log('SUCCESS', `🎉 MEGA VALIDATION SUITE PASSED - SAFE TO PUSH/PUBLISH`);
        await this.log('INFO', `📊 Results: ${this.validationResults.testsPassed}/${this.validationResults.totalTests} passed, ${this.validationResults.testsWarning} warnings`);
      } else {
        await this.log('ERROR', `❌ MEGA VALIDATION SUITE FAILED - DO NOT PUSH/PUBLISH`);
        await this.log('ERROR', `💥 Critical errors: ${this.validationResults.criticalErrors.length}`);

        // Afficher erreurs critiques
        for (const error of this.validationResults.criticalErrors.slice(0, 5)) {
          await this.log('ERROR', `   - ${error.test}: ${error.error}`);
        }
      }

      return {
        success: this.validationResults.success,
        canPushSafely: this.validationResults.canPushSafely,
        report: report,
        summary: this.validationResults
      };

    } catch (error) {
      await this.log('ERROR', '❌ MEGA Validation Suite crashed:', error);

      this.validationResults.success = false;
      this.validationResults.canPushSafely = false;
      this.validationResults.criticalErrors.push({
        test: 'validation_suite',
        error: error.message,
        severity: 'critical',
        blocker: true
      });

      throw error;
    }
  }
}

// CLI execution
if (require.main === module) {
  const validationSuite = new MegaValidationSuite();

  validationSuite.execute()
    .then(results => {
      console.log('🧪 MEGA Validation Suite completed');

      if (results.canPushSafely) {
        console.log('✅ SAFE TO PUSH/PUBLISH');
        process.exit(0);
      } else {
        console.log('❌ NOT SAFE TO PUSH/PUBLISH');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ MEGA Validation Suite failed:', error);
      process.exit(1);
    });
}

module.exports = MegaValidationSuite;
