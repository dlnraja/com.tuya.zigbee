#!/usr/bin/env node

/**
 * APP.JSON UPDATER
 * Updates app.json with new drivers from Johan Bendz analysis
 * Maintains version and metadata consistency
 */

const fs = require('fs');
const path = require('path');

class AppJsonUpdater {
  constructor() {
    this.projectRoot = process.cwd();
    this.appJsonPath = path.join(this.projectRoot, 'app.json');
    this.driversPath = path.join(this.projectRoot, 'drivers');
    this.newDriversAdded = 0;
  }

  log(message, type = 'info') {
    const prefix = { 'info': '🔄', 'success': '✅', 'error': '❌', 'warning': '⚠️', 'add': '➕' }[type] || 'ℹ️';
    console.log(`${prefix} ${message}`);
  }

  scanDriverDirectories() {
    this.log('Scanning driver directories...');
    
    const allDriverDirs = fs.readdirSync(this.driversPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    
    const driversWithCompose = allDriverDirs.filter(driverName => {
      const composePath = path.join(this.driversPath, driverName, 'driver.compose.json');
      return fs.existsSync(composePath);
    });
    
    this.log(`Found ${driversWithCompose.length} drivers with compose files`);
    return driversWithCompose;
  }

  loadAppJson() {
    this.log('Loading app.json...');
    
    if (!fs.existsSync(this.appJsonPath)) {
      throw new Error('app.json not found');
    }
    
    const appData = JSON.parse(fs.readFileSync(this.appJsonPath, 'utf8'));
    return appData;
  }

  getDriverEntry(driverName) {
    const composePath = path.join(this.driversPath, driverName, 'driver.compose.json');
    
    try {
      const composeData = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      
      // Create app.json entry from compose data
      const driverEntry = {
        name: composeData.name || { en: driverName },
        class: composeData.class || 'other',
        capabilities: composeData.capabilities || [],
        zigbee: composeData.zigbee || {},
        images: {
          small: `/drivers/${driverName}/assets/images/small.png`,
          large: `/drivers/${driverName}/assets/images/large.png`,
          xlarge: `/drivers/${driverName}/assets/images/xlarge.png`
        },
        id: driverName
      };
      
      // Add energy config if present
      if (composeData.energy) {
        driverEntry.energy = composeData.energy;
      }
      
      // Add community metadata for new drivers
      driverEntry.community = {
        sources: ['Johan Bendz ecosystem compatibility', 'Professional driver generation'],
        enriched: true,
        type: 'johan_bendz',
        last_updated: new Date().toISOString()
      };
      
      return driverEntry;
      
    } catch (error) {
      this.log(`Error processing ${driverName}: ${error.message}`, 'warning');
      return null;
    }
  }

  updateAppJson() {
    this.log('Updating app.json with new drivers...');
    
    const appData = this.loadAppJson();
    const allDrivers = this.scanDriverDirectories();
    
    // Get existing driver IDs
    const existingDriverIds = new Set(appData.drivers.map(d => d.id));
    
    // Find new drivers
    const newDrivers = allDrivers.filter(driverName => !existingDriverIds.has(driverName));
    
    this.log(`Found ${newDrivers.length} new drivers to add`);
    
    // Add new drivers to app.json
    for (const driverName of newDrivers) {
      const driverEntry = this.getDriverEntry(driverName);
      if (driverEntry) {
        appData.drivers.push(driverEntry);
        this.log(`Added ${driverName}`, 'add');
        this.newDriversAdded++;
      }
    }
    
    // Update app metadata
    appData.version = "2.1.2";
    appData.description.en = `Ultimate Zigbee Hub v2.1.2 - Complete unbranded Zigbee ecosystem with ${appData.drivers.length} professional drivers organized by function. Enhanced with Johan Bendz ecosystem support including IKEA, Aqara, Philips Hue, and Sonoff devices. Supports Motion Detection, Climate Control, Smart Lighting, Safety Systems, Covers, Access Control, and Energy Management. Local Zigbee 3.0 operation with 400+ manufacturer IDs, professional design standards, and SDK3 compliance. No cloud dependencies.`;
    
    // Save updated app.json
    fs.writeFileSync(this.appJsonPath, JSON.stringify(appData, null, 2));
    
    this.log(`Successfully updated app.json with ${this.newDriversAdded} new drivers`, 'success');
    this.log(`Total drivers: ${appData.drivers.length}`, 'info');
    
    return { 
      totalDrivers: appData.drivers.length,
      newDriversAdded: this.newDriversAdded,
      newDrivers: newDrivers
    };
  }

  updateCompose() {
    this.log('Updating .homeycompose/app.json...');
    
    const composePath = path.join(this.projectRoot, '.homeycompose', 'app.json');
    if (fs.existsSync(composePath)) {
      const composeData = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      
      // Update version and description
      composeData.version = "2.1.2";
      composeData.description.en = `Ultimate Zigbee Hub v2.1.2 - Complete unbranded Zigbee ecosystem with enhanced Johan Bendz compatibility. Professional driver collection for 1500+ devices from 80+ manufacturers including IKEA, Aqara, Philips Hue, and Sonoff. Local Zigbee 3.0 operation with no cloud dependencies.`;
      
      fs.writeFileSync(composePath, JSON.stringify(composeData, null, 2));
      this.log('Updated .homeycompose/app.json', 'success');
    }
  }

  async run() {
    this.log('🚀 APP.JSON UPDATER STARTING');
    this.log('Adding new Johan Bendz ecosystem drivers');
    this.log('=' * 60);
    
    try {
      const result = this.updateAppJson();
      this.updateCompose();
      
      this.log('\n📊 UPDATE COMPLETE', 'success');
      this.log(`Total drivers: ${result.totalDrivers}`, 'info');
      this.log(`New drivers added: ${result.newDriversAdded}`, 'success');
      
      if (result.newDrivers.length > 0) {
        this.log('\n📝 New drivers added:', 'info');
        result.newDrivers.forEach(driver => {
          this.log(`  - ${driver}`, 'add');
        });
      }
      
      this.log('\n🎯 Next steps:', 'info');
      this.log('1. Generate images for new drivers', 'info');
      this.log('2. Validate the app', 'info');
      this.log('3. Publish to Homey App Store', 'info');
      
      return result;
      
    } catch (error) {
      this.log(`Error: ${error.message}`, 'error');
      throw error;
    }
  }
}

// Execute if run directly
if (require.main === module) {
  const updater = new AppJsonUpdater();
  updater.run().catch(console.error);
}

module.exports = AppJsonUpdater;
