// MEGA ULTIMATE ENHANCED - 2025-08-07T16:33:45.908Z
// Script de validation amélioré avec liens corrigés et fonctionnalités étendues

'use strict';

const fs = require('fs');
const path = require('path');

class AppValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.success = true;
    this.driverCount = 0;
    this.completeDrivers = [];
    this.incompleteDrivers = [];
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
    const driversPath = 'drivers';
    if (!fs.existsSync(driversPath)) {
      this.errors.push('❌ Missing drivers directory');
      this.success = false;
      return;
    }

    const driverTypes = ['tuya', 'zigbee'];
    
    for (const type of driverTypes) {
      const typePath = path.join(driversPath, type);
      if (fs.existsSync(typePath)) {
        console.log(`\n🔍 Scanning ${type} drivers...`);
        this.scanDriverDirectory(typePath, type);
      }
    }

    console.log(`\n📊 Total drivers found: ${this.driverCount}`);
    console.log(`✅ Complete drivers: ${this.completeDrivers.length}`);
    console.log(`⚠️ Incomplete drivers: ${this.incompleteDrivers.length}`);
  }

  scanDriverDirectory(dirPath, type, category = '') {
    try {
      const items = fs.readdirSync(dirPath);
      
      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory()) {
          const currentCategory = category ? `${category}/${item}` : item;
          
          // Vérifier si c'est un driver complet
          if (this.isCompleteDriver(itemPath)) {
            this.driverCount++;
            this.completeDrivers.push(`${type}/${currentCategory}`);
            console.log(`✅ Found driver: ${type}/${currentCategory}`);
          } else {
            // Scanner les sous-dossiers
            this.scanDriverDirectory(itemPath, type, currentCategory);
          }
        }
      }
    } catch (error) {
      this.warnings.push(`⚠️ Error scanning directory ${dirPath}: ${error.message}`);
    }
  }

  isCompleteDriver(driverPath) {
    try {
      const files = fs.readdirSync(driverPath);
      
      // Vérifier les fichiers requis pour un driver
      const hasDriverJs = files.includes('driver.js');
      const hasComposeJson = files.includes('driver.compose.json');
      const hasDeviceJs = files.includes('device.js');
      
      // Un driver est complet s'il a au moins driver.js et driver.compose.json
      if (hasDriverJs && hasComposeJson) {
        return true;
      }
      
      // Si ce n'est pas un driver complet, vérifier s'il y a des sous-dossiers avec des drivers
      const subdirs = files.filter(f => {
        const subPath = path.join(driverPath, f);
        return fs.statSync(subPath).isDirectory();
      });
      
      // Si il y a des sous-dossiers, ce n'est pas un driver direct
      if (subdirs.length > 0) {
        return false;
      }
      
      // Si pas de sous-dossiers et pas de fichiers requis, c'est incomplet
      if (!hasDriverJs || !hasComposeJson) {
        this.incompleteDrivers.push(driverPath);
        return false;
      }
      
      return true;
    } catch (error) {
      this.warnings.push(`⚠️ Error checking driver ${driverPath}: ${error.message}`);
      return false;
    }
  }

  checkAssets() {
    const assetsPath = path.join('assets', 'images');
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

    if (this.incompleteDrivers.length > 0) {
      console.log('\n⚠️ Incomplete drivers:');
      this.incompleteDrivers.forEach(driver => {
        const relativePath = path.relative(process.cwd(), driver);
        console.log(`  ⚠️ ${relativePath}`);
      });
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