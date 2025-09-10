#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ConfigValidator {
  constructor() {
    this.issues = [];
    this.appJsonPath = path.resolve(process.cwd(), 'app.json');
    this.packageJsonPath = path.resolve(process.cwd(), 'package.json');
  }

  validate() {
    console.log('🔍 Validating project configuration...');
    
    this.checkFileExists(this.appJsonPath, 'app.json');
    this.checkFileExists(this.packageJsonPath, 'package.json');
    
    if (this.issues.length === 0) {
      this.validateAppJson();
      this.validatePackageJson();
      this.validateDependencies();
    }
    
    this.reportResults();
    return this.issues.length === 0;
  }

  checkFileExists(filePath, fileDescription) {
    if (!fs.existsSync(filePath)) {
      this.issues.push(`Missing required file: ${fileDescription}`);
      return false;
    }
    return true;
  }

  validateAppJson() {
    try {
      const appJson = JSON.parse(fs.readFileSync(this.appJsonPath, 'utf8'));
      
      // Check required fields
      const requiredFields = ['id', 'version', 'compatibility', 'platform', 'author'];
      requiredFields.forEach(field => {
        if (!appJson[field]) {
          this.issues.push(`app.json is missing required field: ${field}`);
        }
      });
      
      // Check SDK version
      if (appJson.sdk !== 2) {
        this.issues.push('app.json should specify "sdk": 2 for Homey Pro compatibility');
      }
      
      // Check for duplicate driver IDs
      if (appJson.drivers && Array.isArray(appJson.drivers)) {
        const driverIds = new Set();
        appJson.drivers.forEach(driver => {
          if (driverIds.has(driver.id)) {
            this.issues.push(`Duplicate driver ID found: ${driver.id}`);
          } else {
            driverIds.add(driver.id);
          }
        });
      }
      
    } catch (error) {
      this.issues.push(`Error parsing app.json: ${error.message}`);
    }
  }

  validatePackageJson() {
    try {
      const pkg = JSON.parse(fs.readFileSync(this.packageJsonPath, 'utf8'));
      
      // Check required fields
      const requiredFields = ['name', 'version', 'main', 'scripts'];
      requiredFields.forEach(field => {
        if (!pkg[field]) {
          this.issues.push(`package.json is missing required field: ${field}`);
        }
      });
      
      // Check required scripts
      const requiredScripts = ['start', 'build', 'validate', 'test'];
      requiredScripts.forEach(script => {
        if (!pkg.scripts || !pkg.scripts[script]) {
          this.issues.push(`package.json is missing required script: ${script}`);
        }
      });
      
    } catch (error) {
      this.issues.push(`Error parsing package.json: ${error.message}`);
    }
  }

  validateDependencies() {
    try {
      // Check if homey is installed
      execSync('homey --version', { stdio: 'pipe' });
    } catch (error) {
      this.issues.push('Homey CLI is not installed. Please install it with: npm install -g homey');
    }
    
    try {
      // Check if npm install has been run
      const nodeModulesPath = path.resolve(process.cwd(), 'node_modules');
      if (!fs.existsSync(nodeModulesPath)) {
        this.issues.push('Dependencies not installed. Please run: npm install');
      }
    } catch (error) {
      this.issues.push(`Error checking dependencies: ${error.message}`);
    }
  }

  reportResults() {
    if (this.issues.length === 0) {
      console.log('✅ Project configuration is valid');
      return;
    }
    
    console.error('❌ Found configuration issues:');
    this.issues.forEach((issue, index) => {
      console.error(`  ${index + 1}. ${issue}`);
    });
    
    console.log('\n💡 Run the following commands to fix common issues:');
    console.log('  npm install -g homey');
    console.log('  npm install');
  }
}

// Run the validator if this script is executed directly
if (require.main === module) {
  const validator = new ConfigValidator();
  const isValid = validator.validate();
  process.exit(isValid ? 0 : 1);
}

module.exports = ConfigValidator;
