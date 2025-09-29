#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

const APP_JSON_PATH = path.resolve(process.cwd(), '.homeybuild/app.json');
const BACKUP_EXTENSION = '.bak';

class ZigbeePropertiesValidator {
  constructor() {
    this.issues = [];
    this.fixedCount = 0;
  }

  async validateAndFix() {
    try {
      console.log('🔍 Validating and standardizing zigbee properties...');
      
      // Create a backup of the original file
      await this.createBackup();
      
      // Load and parse the app.json file
      const appJson = await this.loadAppJson();
      
      // Process each driver
      const processedDrivers = appJson.drivers.map(driver => 
        this.processDriver(driver)
      );
      
      // Update the app.json with processed drivers
      appJson.drivers = processedDrivers;
      
      // Save the changes if there were any fixes
      if (this.fixedCount > 0) {
        await this.saveAppJson(appJson);
        console.log(`✅ Fixed ${this.fixedCount} issues in app.json`);
      } else {
        console.log('✅ No zigbee property issues found');
      }
      
      // Report any issues that couldn't be automatically fixed
      this.reportIssues();
      
      return this.issues.length === 0;
    } catch (error) {
      console.error('❌ Error during validation:', error.message);
      return false;
    }
  }

  async createBackup() {
    try {
      const content = await readFile(APP_JSON_PATH, 'utf8');
      await writeFile(`${APP_JSON_PATH}${BACKUP_EXTENSION}`, content);
      console.log(`📦 Created backup at ${APP_JSON_PATH}${BACKUP_EXTENSION}`);
    } catch (error) {
      console.warn('⚠️ Could not create backup:', error.message);
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

  processDriver(driver) {
    if (!driver.zigbee) return driver;
    
    const processed = { ...driver };
    const zigbee = { ...driver.zigbee };
    
    // Standardize modelId, manufacturerName, and productId to arrays if they're strings
    ['modelId', 'manufacturerName', 'productId'].forEach(prop => {
      if (zigbee[prop] === undefined) return;
      
      if (typeof zigbee[prop] === 'string') {
        zigbee[prop] = [zigbee[prop].trim()];
        this.fixedCount++;
        this.recordFix(driver.id, `Converted ${prop} to array`);
      } else if (Array.isArray(zigbee[prop])) {
        // Ensure no empty strings in arrays
        const originalLength = zigbee[prop].length;
        zigbee[prop] = zigbee[prop]
          .map(item => (typeof item === 'string' ? item.trim() : String(item)))
          .filter(Boolean);
          
        if (zigbee[prop].length !== originalLength) {
          this.fixedCount++;
          this.recordFix(driver.id, `Removed empty values from ${prop}`);
        }
      }
    });
    
    // Check for required zigbee properties
    if (!zigbee.manufacturerName || !zigbee.manufacturerName.length) {
      this.recordIssue(driver.id, 'Missing required zigbee.manufacturerName');
    }
    
    if (!zigbee.modelId || !zigbee.modelId.length) {
      this.recordIssue(driver.id, 'Missing required zigbee.modelId');
    }
    
    // Update the processed zigbee object
    processed.zigbee = zigbee;
    return processed;
  }

  recordFix(driverId, message) {
    console.log(`🔧 [${driverId || 'unknown'}] ${message}`);
  }

  recordIssue(driverId, message) {
    this.issues.push({ driverId, message });
  }

  async saveAppJson(appJson) {
    const content = JSON.stringify(appJson, null, 2) + '\n';
    await writeFile(APP_JSON_PATH, content, 'utf8');
  }

  reportIssues() {
    if (this.issues.length === 0) return;
    
    console.error('\n⚠️ The following issues require manual attention:');
    
    const grouped = this.issues.reduce((acc, { driverId, message }) => {
      const key = driverId || 'unknown';
      if (!acc[key]) acc[key] = [];
      acc[key].push(message);
      return acc;
    }, {});
    
    for (const [driverId, messages] of Object.entries(grouped)) {
      console.error(`\nDriver: ${driverId}`);
      messages.forEach(msg => console.error(`  - ${msg}`));
    }
    
    console.error(`\nTotal issues: ${this.issues.length}`);
  }
}

// Run the validator
if (require.main === module) {
  const validator = new ZigbeePropertiesValidator();
  validator.validateAndFix().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = { ZigbeePropertiesValidator };
