'use strict';

const fs = require('fs');
const path = require('path');

class CompleteAppTester {
  constructor() {
    this.results = {
      structure: { passed: false, errors: [] },
      drivers: { passed: false, errors: [], count: 0 },
      assets: { passed: false, errors: [] },
      configuration: { passed: false, errors: [] },
      compatibility: { passed: false, errors: [] }
    };
  }

  async runCompleteTest() {
    console.log('🚀 TUYA ZIGBEE APP - COMPLETE VALIDATION TEST');
    console.log('===============================================\n');

    await this.testStructure();
    await this.testDrivers();
    await this.testAssets();
    await this.testConfiguration();
    await this.testCompatibility();

    this.printResults();
    return this.isAllPassed();
  }

  async testStructure() {
    console.log('📁 Testing App Structure...');
    
    const requiredFiles = [
      'app.json',
      'package.json', 
      'app.js',
      'drivers/',
      'assets/images/',
      'scripts/'
    ];

    for (const file of requiredFiles) {
      if (!fs.existsSync(file)) {
        this.results.structure.errors.push(`Missing: ${file}`);
      }
    }

    this.results.structure.passed = this.results.structure.errors.length === 0;
    console.log(this.results.structure.passed ? '✅ Structure OK' : '❌ Structure issues found');
  }

  async testDrivers() {
    console.log('\n🔧 Testing Drivers...');
    
    const driversPath = 'drivers';
    if (!fs.existsSync(driversPath)) {
      this.results.drivers.errors.push('Drivers directory missing');
      return;
    }

    const driverTypes = ['tuya', 'zigbee'];
    let validDrivers = 0;

    for (const type of driverTypes) {
      const typePath = path.join(driversPath, type);
      if (fs.existsSync(typePath)) {
        const categories = fs.readdirSync(typePath).filter(f => 
          fs.statSync(path.join(typePath, f)).isDirectory()
        );

        for (const category of categories) {
          const categoryPath = path.join(typePath, category);
          const files = fs.readdirSync(categoryPath);
          
          if (files.includes('driver.js') && files.includes('driver.compose.json')) {
            validDrivers++;
            console.log(`  ✅ ${type}/${category}`);
          } else {
            this.results.drivers.errors.push(`Incomplete: ${type}/${category}`);
          }
        }
      }
    }

    this.results.drivers.count = validDrivers;
    this.results.drivers.passed = validDrivers > 0;
    console.log(`📊 Total valid drivers: ${validDrivers}`);
  }

  async testAssets() {
    console.log('\n🖼️ Testing Assets...');
    
    const assetsPath = 'assets/images';
    if (!fs.existsSync(assetsPath)) {
      this.results.assets.errors.push('Assets directory missing');
      return;
    }

    const requiredImages = ['small.png', 'large.png'];
    for (const image of requiredImages) {
      const imagePath = path.join(assetsPath, image);
      if (!fs.existsSync(imagePath)) {
        this.results.assets.errors.push(`Missing image: ${image}`);
      }
    }

    this.results.assets.passed = this.results.assets.errors.length === 0;
    console.log(this.results.assets.passed ? '✅ Assets OK' : '❌ Asset issues found');
  }

  async testConfiguration() {
    console.log('\n⚙️ Testing Configuration...');
    
    try {
      const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

      // Check app.json
      const appRequired = ['id', 'version', 'compatibility', 'category', 'permissions'];
      for (const prop of appRequired) {
        if (!appJson[prop]) {
          this.results.configuration.errors.push(`app.json missing: ${prop}`);
        }
      }

      // Check package.json
      const packageRequired = ['name', 'version', 'main'];
      for (const prop of packageRequired) {
        if (!packageJson[prop]) {
          this.results.configuration.errors.push(`package.json missing: ${prop}`);
        }
      }

      this.results.configuration.passed = this.results.configuration.errors.length === 0;
      console.log(this.results.configuration.passed ? '✅ Configuration OK' : '❌ Configuration issues found');
    } catch (error) {
      this.results.configuration.errors.push(`JSON parsing error: ${error.message}`);
      console.log('❌ Configuration parsing failed');
    }
  }

  async testCompatibility() {
    console.log('\n🔗 Testing Compatibility...');
    
    try {
      const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

      // Check Homey compatibility
      if (appJson.compatibility && !appJson.compatibility.includes('>=5.0.0')) {
        this.results.compatibility.errors.push('Homey compatibility should be >=5.0.0');
      }

      // Check Node.js version
      if (appJson.engines && !appJson.engines.node) {
        this.results.compatibility.errors.push('Node.js engine not specified');
      }

      this.results.compatibility.passed = this.results.compatibility.errors.length === 0;
      console.log(this.results.compatibility.passed ? '✅ Compatibility OK' : '❌ Compatibility issues found');
    } catch (error) {
      this.results.compatibility.errors.push(`Compatibility check error: ${error.message}`);
      console.log('❌ Compatibility check failed');
    }
  }

  printResults() {
    console.log('\n📋 COMPLETE TEST RESULTS');
    console.log('========================');

    const sections = [
      { name: 'Structure', result: this.results.structure },
      { name: 'Drivers', result: this.results.drivers },
      { name: 'Assets', result: this.results.assets },
      { name: 'Configuration', result: this.results.configuration },
      { name: 'Compatibility', result: this.results.compatibility }
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
      console.log('🎉 ALL TESTS PASSED! App is ready for deployment.');
    } else {
      console.log('⚠️ Some tests failed. Please fix the issues above.');
    }
  }

  isAllPassed() {
    return Object.values(this.results).every(result => result.passed);
  }
}

// Run complete test
const tester = new CompleteAppTester();
tester.runCompleteTest().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
}); 