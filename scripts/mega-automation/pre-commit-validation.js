#!/usr/bin/env node

/**
 * 🛡️ PRE-COMMIT VALIDATION v1.0.0
 *
 * Validation rapide avant chaque commit pour éviter erreurs:
 * - JSON syntax check
 * - Basic driver structure validation
 * - .homeycompose/ structure check (critique selon mémoire)
 * - Homey CLI availability check
 *
 * Exécution rapide (<30s) pour usage quotidien
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

class PreCommitValidation {
  constructor() {
    this.results = {
      jsonErrors: [],
      driverErrors: [],
      homeycomposeErrors: [],
      warnings: [],
      canCommit: true
    };
  }

  /**
   * 📝 Logger simple
   */
  log(level, message) {
    const timestamp = new Date().toISOString().substring(11, 19);
    console.log(`[${timestamp}] [${level}] ${message}`);
  }

  /**
   * 📝 Validation JSON rapide
   */
  async validateJSONFiles() {
    this.log('INFO', '📝 Validating critical JSON files...');

    const criticalFiles = [
      'app.json',
      '.homeychangelog.json'
    ];

    for (const file of criticalFiles) {
      try {
        const content = await fs.readFile(file, 'utf8');
        JSON.parse(content);
        this.log('INFO', `✅ ${file} valid`);
      } catch (error) {
        this.results.jsonErrors.push(`${file}: ${error.message}`);
        this.log('ERROR', `❌ ${file} invalid: ${error.message}`);
        this.results.canCommit = false;
      }
    }

    // Check .homeycompose/app.json if exists
    try {
      const homeycomposeApp = path.join('.homeycompose', 'app.json');
      const content = await fs.readFile(homeycomposeApp, 'utf8');
      JSON.parse(content);
      this.log('INFO', '✅ .homeycompose/app.json valid');
    } catch (error) {
      this.results.homeycomposeErrors.push(`app.json: ${error.message}`);
      this.log('WARN', `⚠️ .homeycompose/app.json issue: ${error.message}`);
    }
  }

  /**
   * 🏗️ Vérification structure .homeycompose/ (CRITIQUE)
   */
  async validateHomeycomposeStructure() {
    this.log('INFO', '🏗️ Checking .homeycompose/ structure (CRITICAL from memory)...');

    try {
      // Vérifier existence directory principal
      await fs.access('.homeycompose');
      this.log('INFO', '✅ .homeycompose/ directory exists');

      // Vérifier drivers directory
      const driversPath = path.join('.homeycompose', 'drivers');
      try {
        const drivers = await fs.readdir(driversPath);
        if (drivers.length === 0) {
          this.results.homeycomposeErrors.push('No drivers in .homeycompose/drivers/');
          this.log('ERROR', '❌ .homeycompose/drivers/ is empty');
          this.results.canCommit = false;
        } else {
          this.log('INFO', `✅ .homeycompose/drivers/ has ${drivers.length} drivers`);
        }
      } catch (error) {
        this.results.homeycomposeErrors.push(`drivers directory: ${error.message}`);
        this.log('ERROR', `❌ .homeycompose/drivers/ missing: ${error.message}`);
        this.results.canCommit = false;
      }

    } catch (error) {
      this.results.homeycomposeErrors.push(`Missing .homeycompose/ directory: ${error.message}`);
      this.log('ERROR', '❌ .homeycompose/ directory missing - CRITICAL!');
      this.results.canCommit = false;
    }
  }

  /**
   * 🔍 Sample driver validation (quelques drivers)
   */
  async validateSampleDrivers() {
    this.log('INFO', '🔍 Validating sample drivers...');

    try {
      const driversPath = path.join('.homeycompose', 'drivers');
      const drivers = await fs.readdir(driversPath);

      // Check first 5 drivers
      const samplesToCheck = drivers.slice(0, 5);

      for (const driverName of samplesToCheck) {
        try {
          const driverPath = path.join(driversPath, driverName, 'driver.compose.json');
          const content = await fs.readFile(driverPath, 'utf8');
          const config = JSON.parse(content);

          // Basic validation
          if (!config.id) {
            this.results.driverErrors.push(`${driverName}: missing id`);
          }
          if (!config.zigbee?.manufacturerName) {
            this.results.warnings.push(`${driverName}: missing manufacturerName`);
          }

          this.log('INFO', `✅ ${driverName} valid`);

        } catch (error) {
          this.results.driverErrors.push(`${driverName}: ${error.message}`);
          this.log('WARN', `⚠️ ${driverName} issue: ${error.message}`);
        }
      }

    } catch (error) {
      this.log('WARN', `⚠️ Sample driver validation failed: ${error.message}`);
    }
  }

  /**
   * 🔧 Vérification Homey CLI disponible
   */
  async validateHomeyCLI() {
    this.log('INFO', '🔧 Checking Homey CLI availability...');

    try {
      const output = execSync('homey --version', { encoding: 'utf8', timeout: 5000 });
      this.log('INFO', `✅ Homey CLI available: ${output.trim()}`);
    } catch (error) {
      this.results.warnings.push('Homey CLI not available or not working');
      this.log('WARN', '⚠️ Homey CLI not available - builds may fail');
    }
  }

  /**
   * 🚀 Exécution rapide pre-commit
   */
  async execute() {
    console.log('🛡️ PRE-COMMIT VALIDATION - Quick Check');
    console.log('=====================================');

    const startTime = Date.now();

    try {
      // Validations rapides
      await this.validateJSONFiles();
      await this.validateHomeycomposeStructure();
      await this.validateSampleDrivers();
      await this.validateHomeyCLI();

      const duration = Date.now() - startTime;

      // Résumé final
      console.log('\n📊 VALIDATION SUMMARY');
      console.log('====================');
      console.log(`⏱️  Duration: ${(duration / 1000).toFixed(1)}s`);
      console.log(`❌ JSON Errors: ${this.results.jsonErrors.length}`);
      console.log(`⚠️  Driver Issues: ${this.results.driverErrors.length}`);
      console.log(`🏗️  .homeycompose Issues: ${this.results.homeycomposeErrors.length}`);
      console.log(`⚠️  Warnings: ${this.results.warnings.length}`);

      if (this.results.canCommit) {
        console.log('\n✅ PRE-COMMIT VALIDATION PASSED - SAFE TO COMMIT');
        return { success: true, canCommit: true };
      } else {
        console.log('\n❌ PRE-COMMIT VALIDATION FAILED - FIX ERRORS BEFORE COMMIT');

        if (this.results.jsonErrors.length > 0) {
          console.log('\n🔴 JSON ERRORS:');
          this.results.jsonErrors.forEach(err => console.log(`   - ${err}`));
        }

        if (this.results.homeycomposeErrors.length > 0) {
          console.log('\n🔴 .HOMEYCOMPOSE ERRORS:');
          this.results.homeycomposeErrors.forEach(err => console.log(`   - ${err}`));
        }

        return { success: false, canCommit: false };
      }

    } catch (error) {
      console.log(`\n❌ PRE-COMMIT VALIDATION CRASHED: ${error.message}`);
      return { success: false, canCommit: false };
    }
  }
}

// CLI execution
if (require.main === module) {
  const validator = new PreCommitValidation();

  validator.execute()
    .then(result => {
      process.exit(result.canCommit ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Pre-commit validation crashed:', error);
      process.exit(1);
    });
}

module.exports = PreCommitValidation;
