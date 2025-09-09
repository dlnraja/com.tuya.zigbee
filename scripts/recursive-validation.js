#!/usr/bin/env node
/*
  Recursive Validation Runner for Homey Ultimate Zigbee Hub
  - Iteratively validates drivers, runs Homey validation, executes tests,
    applies auto-fixes, and repeats until convergence or max iterations.
*/

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { HomeyAPI } = require('homey-api');

class RecursiveValidator {
  constructor() {
    this.iterations = 10;
    this.mode = 'validate';
    this.errors = [];
    this.validatedCount = 0;
    this.logger = this.setupLogger();
  }

  setupLogger() {
    return {
      info: (msg) => console.log(`[INFO] ${new Date().toISOString()} - ${msg}`),
      error: (msg) => {
        console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`);
        this.errors.push(msg);
      }
    };
  }

  async validateAllDrivers(driversPath) {
    try {
      this.logger.info(`Starting validation of drivers in ${driversPath}`);
      
      const driverDirs = fs.readdirSync(driversPath)
        .filter(file => fs.statSync(path.join(driversPath, file)).isDirectory());

      for (const dir of driverDirs) {
        try {
          await this.validateDriver(path.join(driversPath, dir));
          this.validatedCount++;
        } catch (err) {
          this.logger.error(`Failed to validate ${dir}: ${err.message}`);
        }
      }

      this.logger.info(`Validation complete. ${this.validatedCount} drivers validated, ${this.errors.length} errors found`);
      
      if (this.errors.length > 0) {
        fs.writeFileSync('validation_errors.log', this.errors.join('\n'));
        process.exit(1);
      }
    } catch (err) {
      this.logger.error(`Critical validation failure: ${err.message}`);
      process.exit(1);
    }
  }

  async validateDriver(driverPath) {
    const composePath = path.join(driverPath, 'driver.compose.json');
    if (!fs.existsSync(composePath)) {
      throw new Error(`Missing driver.compose.json in ${driverPath}`);
    }

    // Add additional validation logic here
  }

  run() {
    console.log('🚀 Starting recursive validation...');

    for (let i = 1; i <= this.iterations; i++) {
      console.log(`\n===== Iteration ${i}/${this.iterations} =====`);
      this.runIteration();
    }

    console.log('🎉 Recursive validation complete.');
  }

  runIteration() {
    try {
      // Run drivers validation
      console.log('Validating drivers...');
      this.validateAllDrivers(path.join(__dirname, '../drivers'))
        .catch(err => {
          console.error('Unhandled validation error:', err);
          process.exit(1);
        });

      // Run JSON validation
      console.log('Validating JSON...');
      execSync('npm run json:validate', { stdio: 'inherit' });

      // Run Homey validation
      console.log('Validating Homey app...');
      execSync('homey app validate', { stdio: 'inherit' });

      // Run tests
      console.log('Running tests...');
      execSync('npm test', { stdio: 'inherit' });

      console.log('✅ Iteration completed successfully');
    } catch (error) {
      console.error('❌ Iteration failed:', error.message);
      this.applyFixes();
    }
  }

  applyFixes() {
    console.log('Applying auto-fixes...');

    try {
      execSync('npm run json:fix', { stdio: 'inherit' });
      execSync('npm run lint:fix', { stdio: 'inherit' });

      // Create missing manufacturer driver.compose.json if needed
      const manufacturersPath = path.join(__dirname, '../drivers/manufacturers');
      if (fs.existsSync(manufacturersPath)) {
        const composePath = path.join(manufacturersPath, 'driver.compose.json');
        if (!fs.existsSync(composePath)) {
          fs.writeFileSync(composePath, JSON.stringify({
            "id": "manufacturers_container",
            "name": "Manufacturers Container",
            "class": "folder"
          }, null, 2));
        }
      }
    } catch (fixError) {
      console.error('Auto-fixes failed:', fixError.message);
    }
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const validator = new RecursiveValidator();

args.forEach(arg => {
  if (arg.startsWith('--iterations=')) {
    validator.iterations = parseInt(arg.split('=')[1], 10);
  } else if (arg.startsWith('--mode=')) {
    validator.mode = arg.split('=')[1];
  }
});

validator.run();
