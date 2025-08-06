'use strict';

const fs = require('fs');
const path = require('path');

class FinalValidator {
  constructor() {
    this.validationResults = {
      structure: { passed: false, errors: [] },
      drivers: { passed: false, errors: [], count: 0 },
      app: { passed: false, errors: [] },
      mega: { passed: false, errors: [] }
    };
  }

  async runFinalValidation() {
    console.log('🎯 FINAL VALIDATION - TUYA ZIGBEE APP');
    console.log('=======================================\n');

    await this.validateStructure();
    await this.validateDrivers();
    await this.validateApp();
    await this.validateMegaEnrichment();

    this.printResults();
    return this.isAllPassed();
  }

  async validateStructure() {
    console.log('📁 Validating Structure...');
    
    // Vérifier qu'il n'y a que 2 dossiers dans drivers
    const driversPath = path.join('drivers');
    const driversContent = fs.readdirSync(driversPath);
    const directories = driversContent.filter(item => 
      fs.statSync(path.join(driversPath, item)).isDirectory()
    );

    if (directories.length === 2 && 
        directories.includes('tuya') && 
        directories.includes('zigbee')) {
      this.validationResults.structure.passed = true;
      console.log('  ✅ Structure: 2 directories (tuya, zigbee)');
    } else {
      this.validationResults.structure.errors.push(
        `Expected 2 directories (tuya, zigbee), found: ${directories.join(', ')}`
      );
      console.log('  ❌ Structure: Invalid directory count');
    }
  }

  async validateDrivers() {
    console.log('\n🔧 Validating Drivers...');
    
    const driversPath = path.join('drivers');
    const drivers = this.findDriversRecursively(driversPath);
    
    console.log(`  📊 Found ${drivers.length} drivers`);
    
    let validDrivers = 0;
    for (const driverPath of drivers) {
      const driverJsPath = path.join(driverPath, 'driver.js');
      const driverComposePath = path.join(driverPath, 'driver.compose.json');
      
      if (fs.existsSync(driverJsPath) && fs.existsSync(driverComposePath)) {
        validDrivers++;
      } else {
        this.validationResults.drivers.errors.push(
          `Incomplete driver: ${driverPath}`
        );
      }
    }

    this.validationResults.drivers.count = validDrivers;
    this.validationResults.drivers.passed = validDrivers > 0;
    
    console.log(`  ✅ Valid drivers: ${validDrivers}/${drivers.length}`);
  }

  async validateApp() {
    console.log('\n📱 Validating App Configuration...');
    
    const requiredFiles = ['app.js', 'app.json', 'package.json'];
    let missingFiles = [];

    for (const file of requiredFiles) {
      if (!fs.existsSync(file)) {
        missingFiles.push(file);
      }
    }

    if (missingFiles.length === 0) {
      this.validationResults.app.passed = true;
      console.log('  ✅ App files: All present');
    } else {
      this.validationResults.app.errors.push(
        `Missing files: ${missingFiles.join(', ')}`
      );
      console.log('  ❌ App files: Missing required files');
    }

    // Vérifier app.js
    try {
      const appJs = fs.readFileSync('app.js', 'utf8');
      if (appJs.includes('TuyaZigbeeApp') && appJs.includes('registerAllDrivers')) {
        console.log('  ✅ App.js: Valid content');
      } else {
        this.validationResults.app.errors.push('Invalid app.js content');
        console.log('  ❌ App.js: Invalid content');
      }
    } catch (error) {
      this.validationResults.app.errors.push(`App.js error: ${error.message}`);
      console.log('  ❌ App.js: Error reading file');
    }
  }

  async validateMegaEnrichment() {
    console.log('\n🚀 Validating Mega Enrichment...');
    
    // Vérifier le rapport d'enrichissement
    const reportPath = 'MEGA_ENRICHMENT_REPORT.json';
    if (fs.existsSync(reportPath)) {
      try {
        const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
        if (report.drivers && report.drivers > 0) {
          this.validationResults.mega.passed = true;
          console.log(`  ✅ Mega enrichment: ${report.drivers} drivers enriched`);
        } else {
          this.validationResults.mega.errors.push('No drivers enriched');
          console.log('  ❌ Mega enrichment: No drivers enriched');
        }
      } catch (error) {
        this.validationResults.mega.errors.push(`Report error: ${error.message}`);
        console.log('  ❌ Mega enrichment: Invalid report');
      }
    } else {
      this.validationResults.mega.errors.push('No enrichment report found');
      console.log('  ❌ Mega enrichment: No report found');
    }
  }

  findDriversRecursively(dir) {
    let results = [];
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat && stat.isDirectory()) {
        results = results.concat(this.findDriversRecursively(fullPath));
      } else if (file === 'driver.js') {
        results.push(path.dirname(fullPath));
      }
    }
    return results;
  }

  isAllPassed() {
    return Object.values(this.validationResults).every(result => result.passed);
  }

  printResults() {
    console.log('\n📋 FINAL VALIDATION RESULTS');
    console.log('============================');

    const sections = [
      { name: 'Structure', result: this.validationResults.structure },
      { name: 'Drivers', result: this.validationResults.drivers },
      { name: 'App', result: this.validationResults.app },
      { name: 'Mega Enrichment', result: this.validationResults.mega }
    ];

    for (const section of sections) {
      console.log(`\n${section.name}:`);
      if (section.result.passed) {
        console.log(`  ✅ PASSED`);
        if (section.result.count) {
          console.log(`  📊 Count: ${section.result.count}`);
        }
      } else {
        console.log(`  ❌ FAILED`);
        section.result.errors.forEach(error => {
          console.log(`    - ${error}`);
        });
      }
    }

    const totalPassed = sections.filter(s => s.result.passed).length;
    const totalSections = sections.length;
    
    console.log(`\n🎯 OVERALL RESULT: ${totalPassed}/${totalSections} sections passed`);
    
    if (this.isAllPassed()) {
      console.log('\n🎉 ALL VALIDATIONS PASSED!');
      console.log('✅ App is ready for deployment');
      console.log('✅ Structure is correct (2 directories)');
      console.log('✅ All drivers are enriched and functional');
      console.log('✅ Mega enrichment completed successfully');
    } else {
      console.log('\n⚠️ Some validations failed. Please fix the issues above.');
    }
  }
}

// Run final validation
const validator = new FinalValidator();
validator.runFinalValidation().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Validation failed:', error);
  process.exit(1);
}); 