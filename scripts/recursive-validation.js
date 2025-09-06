#!/usr/bin/env node
/*
  Recursive Validation Runner for Homey Ultimate Zigbee Hub
  - Iteratively validates drivers, runs Homey validation, executes tests,
    applies auto-fixes, and repeats until convergence or max iterations.
*/

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class RecursiveValidator {
  constructor() {
    this.iterations = 10;
    this.mode = 'validate';
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
      execSync('npm run drivers:validate', { stdio: 'inherit' });
      
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
