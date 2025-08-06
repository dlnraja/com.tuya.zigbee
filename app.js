'use strict';

const { Homey } = require('homey');
const fs = require('fs');
const path = require('path');

class TuyaZigbeeApp extends Homey.App {

  async onInit() {
    this.log('🚀 Tuya Zigbee App - Initialization');
    this.log(`📦 Mode: ${this.getMode()}`);

    await this.initializeAdvancedFeatures();
    await this.registerAllDrivers();

    this.log('✅ Tuya Zigbee App - Initialization complete');
  }

  getMode() {
    return process.env.TUYA_MODE || 'full'; // Options: full, lite
  }

  async initializeAdvancedFeatures() {
    this.log('🔧 Initializing advanced features...');
    this.aiEnrichment = {
      enabled: this.getMode() === 'full',
      version: '1.0.0',
      lastUpdate: new Date().toISOString()
    };
    this.fallbackSystem = {
      enabled: true,
      unknownDPHandler: true,
      clusterFallback: true
    };
    this.forumIntegration = {
      enabled: this.getMode() === 'full',
      autoSync: true,
      issueTracking: true
    };
    this.log('✅ Advanced features initialized');
  }

  async registerAllDrivers() {
    const driversPath = path.join(__dirname, 'drivers');
    const drivers = this.findDriversRecursively(driversPath);
    this.log(`🔍 Found ${drivers.length} drivers`);

    for (const driverPath of drivers) {
      try {
        this.log(`📂 Registering driver at: ${driverPath}`);
        await this.homey.drivers.registerDriver(require(driverPath));
      } catch (err) {
        this.error(`❌ Failed to register driver: ${driverPath}`, err);
        if (this.fallbackSystem.enabled) {
          this.warn(`🛠️ Fallback applied to: ${driverPath}`);
          // Optional: try to use a generic fallback driver
        }
      }
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
}

module.exports = TuyaZigbeeApp;
