'use strict';

const fs = require('fs');
const path = require('path');

class AppValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.success = true;
  }

  validate() {
    console.log('🔍 Validating Tuya Zigbee App...\n');

    this.checkRequiredFiles();
    this.checkAppJson();
    this.checkPackageJson();
    this.checkDrivers();
    this.checkAssets();

    this.printResults();
    return this.success;
  }

  checkRequiredFiles() {
    const requiredFiles = [
      'app.json',
      'package.json',
      'app.js'
    ];

    for (const file of requiredFiles) {
      if (!fs.existsSync(file)) {
        this.errors.push(`❌ Missing required file: ${file}`);
        this.success = false;
      } else {
        console.log(`✅ Found: ${file}`);
      }
    }
  }

  checkAppJson() {
    try {
      const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));
      const requiredProps = ['id', 'version', 'compatibility', 'category', 'permissions'];
      
      for (const prop of requiredProps) {
        if (!appJson[prop]) {
          this.errors.push(`❌ Missing required property in app.json: ${prop}`);
          this.success = false;
        }
      }

      if (this.success) {
        console.log('✅ app.json structure is valid');
      }
    } catch (error) {
      this.errors.push(`❌ Invalid app.json: ${error.message}`);
      this.success = false;
    }
  }

  checkPackageJson() {
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const requiredProps = ['name', 'version', 'main'];
      
      for (const prop of requiredProps) {
        if (!packageJson[prop]) {
          this.errors.push(`❌ Missing required property in package.json: ${prop}`);
          this.success = false;
        }
      }

      if (this.success) {
        console.log('✅ package.json structure is valid');
      }
    } catch (error) {
      this.errors.push(`❌ Invalid package.json: ${error.message}`);
      this.success = false;
    }
  }

  checkDrivers() {
    const driversPath = path.join(__dirname, '..', 'drivers');
    if (!fs.existsSync(driversPath)) {
      this.errors.push('❌ Missing drivers directory');
      this.success = false;
      return;
    }

    const driverTypes = ['tuya', 'zigbee'];
    let driverCount = 0;

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
            driverCount++;
            console.log(`✅ Found driver: ${type}/${category}`);
          } else {
            this.warnings.push(`⚠️ Incomplete driver: ${type}/${category}`);
          }
        }
      }
    }

    console.log(`📊 Total drivers found: ${driverCount}`);
  }

  checkAssets() {
    const assetsPath = path.join(__dirname, '..', 'assets', 'images');
    if (!fs.existsSync(assetsPath)) {
      this.errors.push('❌ Missing assets/images directory');
      this.success = false;
      return;
    }

    const requiredImages = ['small.png', 'large.png'];
    for (const image of requiredImages) {
      const imagePath = path.join(assetsPath, image);
      if (!fs.existsSync(imagePath)) {
        this.errors.push(`❌ Missing image: ${image}`);
        this.success = false;
      } else {
        console.log(`✅ Found image: ${image}`);
      }
    }
  }

  printResults() {
    console.log('\n📋 Validation Results:');
    console.log('=====================');

    if (this.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.errors.forEach(error => console.log(`  ${error}`));
    }

    if (this.warnings.length > 0) {
      console.log('\n⚠️ Warnings:');
      this.warnings.forEach(warning => console.log(`  ${warning}`));
    }

    if (this.success) {
      console.log('\n✅ App validation successful!');
    } else {
      console.log('\n❌ App validation failed!');
    }
  }
}

// Run validation
const validator = new AppValidator();
const isValid = validator.validate();

process.exit(isValid ? 0 : 1); 