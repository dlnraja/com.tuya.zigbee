'use strict';

/**
 * SDK3 Smart Linter - Comprehensive SDK v3 Compatibility Checker
 * Validates all Homey SDK3 patterns, deprecated APIs, and best practices
 */

const fs = require('fs');
const path = require('path');

class SDK3SmartLinter {
  constructor() {
    this.issues = [];
    this.warnings = [];
    this.fixed = 0;
    this.scanned = 0;
    
    // SDK3 deprecated patterns
    this.deprecatedPatterns = [
      { regex: /Homey\.app\('/g, msg: 'Use homey.app instead of Homey.app()', severity: 'error' },
      { regex: /this\.homey\.modules/g, msg: 'modules API deprecated in SDK3', severity: 'error' },
      { regex: /device\.getDriver\(\)/g, msg: 'Use device.driver instead of device.getDriver()', severity: 'warning' },
      { regex: /\.onInit\s*\(\s*\)\s*\{/g, msg: 'Driver onInit should use async/await pattern', severity: 'warning' },
      { regex: /module\.exports\s*=\s*\{/g, msg: 'Consider using ES6 classes for drivers', severity: 'info' },
    ];
    
    // SDK3 required patterns
    this.requiredPatterns = [
      { regex: /sdk["']?\s*:\s*["']? 3/g , file: 'app.json', msg: 'app.json must specify sdk: 3', severity: 'error' },
    ];
    
    // SDK3 event patterns
    this.sdk3Events = [
      'onPairListDevices',
      'onOAuth2Init',
      'onUninit',
      'onSettings',
    ];
  }

  log(msg, type = 'info') {
    const prefix = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : '✅'      ;
    console.log(`${prefix} ${msg}`);
  }

  scanFile(filePath) {
    try {
      this.scanned++;
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Check deprecated patterns
      for (const pattern of this.deprecatedPatterns) {
        const matches = content.match(pattern.regex);
        if (matches) {
          this.issues.push({
            file: filePath,
            message: pattern.msg,
            count: matches.length,
            severity: pattern.severity
          });
        }
      }
      
      // Check for async/await usage
      if (filePath.includes('/drivers/') && content.includes('async')) {
        // Verify proper error handling
        if (!content.includes('try') && !content.includes('catch')) {
          this.warnings.push({
            file: filePath,
            message: 'Async function without try/catch block'
          });
        }
      }
      
      // Check for proper capability registration
      if (content.includes('getCapabilityValue') && !content.includes('hasCapability')) {
        this.warnings.push({
          file: filePath,
          message: 'getCapabilityValue used without hasCapability check'
        });
      }
      
      // Check for SDK3-specific issues
      if (content.includes('this.registerCapability')) {
        // Ensure it's in onInit or similar
        if (!content.match(/onInit[\s\S]{0,500}registerCapability/)) {
          this.warnings.push({
            file: filePath,
            message: 'registerCapability should be called during initialization'
          });
        }
      }
      
    } catch (err) {
      this.issues.push({
        file: filePath,
        message: `Scan error: ${err.message}`,
        severity: 'error'
      });
    }
  }

  scanDirectory(dir) {
    if (!fs.existsSync(dir)) return;
    
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        // Skip node_modules and hidden dirs
        if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
          this.scanDirectory(fullPath);
        }
      } else if (entry.name.endsWith('.js')) {
        this.scanFile(fullPath);
      }
    }
  }

  validateAppJson() {
    try {
      const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));
      
      // Check SDK version
      if (appJson.sdk !== 3) {
        this.issues.push({
          file: 'app.json',
          message: `Invalid SDK version: ${appJson.sdk} (expected 3)`,
          severity: 'error'
        });
      }
      
      // Check for required SDK3 fields
      const requiredFields = ['id', 'version', 'compatibility', 'author'];
      for (const field of requiredFields) {
        if (!appJson[field]) {
          this.warnings.push({
            file: 'app.json',
            message: `Missing recommended field: ${field}`
          });
        }
      }
      
      // Check drivers for SDK3 compliance
      if (appJson.drivers) {
        for (const [driverId, driver] of Object.entries(appJson.drivers)) {
          if (!driver.id) {
            this.issues.push({
              file: `app.json/drivers/${driverId}`,
              message: 'Driver missing ID',
              severity: 'error'
            });
          }
        }
      }
      
    } catch (err) {
      this.issues.push({
        file: 'app.json',
        message: `JSON parse error: ${err.message}`,
        severity: 'error'
      });
    }
  }

  async run() {
    console.log('🔍 SDK3 Smart Linter - Starting analysis...\n');
    
    // Validate app.json first
    this.validateAppJson();
    
    // Scan lib directory
    if (fs.existsSync('lib')) {
      this.scanDirectory('lib');
    }
    
    // Scan drivers
    if (fs.existsSync('drivers')) {
      this.scanDirectory('drivers');
    }
    
    // Report results
    console.log('\n📊 SDK3 Linter Results:');
    console.log(`   Files scanned: ${this.scanned}`);
    console.log(`   Errors: ${this.issues.filter(i => i.severity === 'error').length}`);
    console.log(`   Warnings: ${this.issues.filter(i => i.severity === 'warning').length + this.warnings.length}`);
    
    if (this.issues.length > 0) {
      console.log('\n❌ Critical Issues:');
      for (const issue of this.issues.filter(i => i.severity === 'error')) {
        console.log(`   ${issue.file}: ${issue.message}`);
      }
    }
    
    if (this.warnings.length > 0) {
      console.log('\n⚠️ Warnings:');
      for (const warn of this.warnings.slice(0, 10)) {
        console.log(`   ${warn.file}: ${warn.message}`);
      }
    }
    
    // Exit with error code if critical issues found
    const criticalErrors = this.issues.filter(i => i.severity === 'error').length;
    if (criticalErrors > 0) {
      console.log(`\n❌ ${criticalErrors} critical SDK3 violations detected!`);
      process.exit(1);
    }
    
    console.log('\n✅ SDK3 compatibility verified!');
    return true;
  }
}

// Run
const linter = new SDK3SmartLinter();
linter.run().catch(err => {
  console.error('SDK3 Linter failed:', err);
  process.exit(1);
});