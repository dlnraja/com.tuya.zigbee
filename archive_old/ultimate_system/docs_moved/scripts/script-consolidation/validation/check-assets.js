#!/usr/bin/env node
'use strict';

#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readFile = promisify(fs.readFile);
const access = promisify(fs.access);

const APP_JSON_PATH = path.resolve(process.cwd(), '.homeybuild/app.json');
const REQUIRED_IMAGES = ['small', 'large'];

class AssetValidator {
  constructor() {
    this.missingAssets = [];
    this.invalidPaths = [];
  }

  async validate() {
    try {
      console.log('\n🔍 Validating assets...');
      
      const appJson = await this.loadAppJson();
      const drivers = appJson.drivers || [];
      
      for (const driver of drivers) {
        await this.validateDriverAssets(driver);
      }
      
      this.reportResults();
      return this.missingAssets.length === 0;
    } catch (error) {
      console.error('❌ Error during asset validation:', error.message);
      process.exit(1);
    }
  }

  async loadAppJson() {
    try {
      const content = await readFile(APP_JSON_PATH, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to parse ${APP_JSON_PATH}: ${error.message}`);
    }
  }

  async validateDriverAssets(driver) {
    if (!driver.id) {
      console.warn(`⚠️ Driver missing ID: ${JSON.stringify(driver).substring(0, 100)}...`);
      return;
    }

    const images = driver.images || {};
    
    for (const size of REQUIRED_IMAGES) {
      const imagePath = images[size];
      
      if (!imagePath) {
        this.missingAssets.push({
          driverId: driver.id,
          issue: `Missing ${size} image reference`,
        });
        continue;
      }

      const fullPath = this.resolveImagePath(imagePath);
      
      try {
        await access(fullPath, fs.constants.F_OK);
      } catch (error) {
        this.missingAssets.push({
          driverId: driver.id,
          issue: `Missing ${size} image file: ${imagePath}`,
          path: fullPath,
        });
      }
    }
  }

  resolveImagePath(imagePath) {
    if (path.isAbsolute(imagePath)) {
      return imagePath;
    }
    return path.resolve(process.cwd(), imagePath);
  }

  reportResults() {
    if (this.missingAssets.length === 0) {
      console.log('✅ All required assets are present');
      return;
    }

    console.error('\n❌ Missing assets found:');
    
    const grouped = this.missingAssets.reduce((acc, item) => {
      if (!acc[item.driverId]) {
        acc[item.driverId] = [];
      }
      acc[item.driverId].push(item.issue);
      return acc;
    }, {});

    for (const [driverId, issues] of Object.entries(grouped)) {
      console.error(`\nDriver: ${driverId}`);
      issues.forEach(issue => console.error(`  - ${issue}`));
    }

    console.error(`\nTotal issues: ${this.missingAssets.length}`);
    process.exit(1);
  }
}

// Run the validator
if (require.main === module) {
  const validator = new AssetValidator();
  validator.validate().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = { AssetValidator };
