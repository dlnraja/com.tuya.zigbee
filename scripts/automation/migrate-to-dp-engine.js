#!/usr/bin/env node
'use strict';

/**
 * Migration Script to DP Engine
 * Migre automatiquement les drivers vers DP Engine v3.0.0
 */

const fs = require('fs');
const path = require('path');

class DPEngineMigrator {
  constructor() {
    this.migratedCount = 0;
    this.errors = [];
    this.stats = {
      total: 0,
      migrated: 0,
      alreadyMigrated: 0,
      errors: 0
    };
  }

  async migrate() {
    console.log('╔═══════════════════════════════════════════════════╗');
    console.log('║  DP ENGINE MIGRATION v3.0.0                      ║');
    console.log('║  Auto-migration to centralized DP processing     ║');
    console.log('╚═══════════════════════════════════════════════════╝\n');

    try {
      // Load app.json to get all drivers
      const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));
      const drivers = appJson.drivers || [];
      
      console.log(`Found ${drivers.length} drivers\n`);
      this.stats.total = drivers.length;
      
      // Process each driver
      for (const driver of drivers) {
        await this.processDriver(driver);
      }
      
      // Display results
      this.displayResults();
      
      return this.stats;
      
    } catch (err) {
      console.error('❌ Migration error:', err.message);
      process.exit(1);
    }
  }

  async processDriver(driver) {
    const driverId = driver.id;
    const driverPath = path.join('drivers', driverId);
    
    console.log(`\n→ Processing: ${driverId}`);
    
    try {
      // Check if driver exists
      if (!fs.existsSync(driverPath)) {
        console.log(`  ⚠️  Driver directory not found`);
        this.stats.errors++;
        return;
      }
      
      // Read device.js
      const devicePath = path.join(driverPath, 'device.js');
      if (!fs.existsSync(devicePath)) {
        console.log(`  ⚠️  device.js not found`);
        this.stats.errors++;
        return;
      }
      
      const deviceCode = fs.readFileSync(devicePath, 'utf8');
      
      // Check if already migrated
      if (deviceCode.includes('TuyaDPEngine') || deviceCode.includes('tuya-dp-engine')) {
        console.log(`  ✅ Already migrated`);
        this.stats.alreadyMigrated++;
        return;
      }
      
      // Check if TS0601 device (primary target)
      const composeFile = path.join(driverPath, 'driver.compose.json');
      if (fs.existsSync(composeFile)) {
        const compose = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
        const modelId = compose.zigbee?.productId?.[0];
        
        if (modelId === 'TS0601') {
          console.log(`  🎯 TS0601 device - eligible for migration`);
          
          // Create backup
          fs.copyFileSync(devicePath, devicePath + '.backup');
          
          // Generate new device.js with DP Engine
          const newDeviceCode = this.generateDPEngineDevice(driverId, compose);
          fs.writeFileSync(devicePath, newDeviceCode);
          
          console.log(`  ✅ Migrated to DP Engine`);
          this.stats.migrated++;
          this.migratedCount++;
          
        } else {
          console.log(`  ℹ️  Not TS0601, standard Zigbee device`);
        }
      }
      
    } catch (err) {
      console.log(`  ❌ Error: ${err.message}`);
      this.errors.push({ driver: driverId, error: err.message });
      this.stats.errors++;
    }
  }

  generateDPEngineDevice(driverId, compose) {
    const className = this.toPascalCase(driverId);
    const deviceName = compose.name?.en || driverId;
    
    return `'use strict';

const { Device } = require('homey');
const TuyaDPEngine = require('../../lib/tuya-dp-engine');

/**
 * ${deviceName}
 * Migrated to DP Engine v3.0.0
 * 
 * Auto-generated migration from legacy code
 */
class ${className}Device extends Device {

  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    this.log('Device initialized');

    try {
      // Initialize DP Engine
      this.dpEngine = new TuyaDPEngine(this);
      await this.dpEngine.initialize();
      
      this.log('DP Engine initialized successfully');
      
      // Setup capabilities from DP Engine
      this.setupCapabilities();
      
    } catch (err) {
      this.error('Failed to initialize DP Engine:', err);
    }
  }

  /**
   * Setup capabilities using DP Engine
   */
  setupCapabilities() {
    // DP Engine handles all capability registration
    // and data point mapping automatically
    
    this.log('Capabilities configured by DP Engine');
  }

  /**
   * onAdded is called when the user adds the device
   */
  async onAdded() {
    this.log('Device has been added');
  }

  /**
   * onSettings is called when settings change
   */
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('Settings were changed');
  }

  /**
   * onRenamed is called when the device name changes
   */
  async onRenamed(name) {
    this.log('Device was renamed to:', name);
  }

  /**
   * onDeleted is called when the device is deleted
   */
  async onDeleted() {
    this.log('Device has been deleted');
    
    if (this.dpEngine) {
      // Cleanup
      this.dpEngine = null;
    }
  }

}

module.exports = ${className}Device;
`;
  }

  toPascalCase(str) {
    return str.split(/[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
  }

  displayResults() {
    console.log('\n\n╔═══════════════════════════════════════════════════╗');
    console.log('║  MIGRATION RESULTS                               ║');
    console.log('╚═══════════════════════════════════════════════════╝\n');
    
    console.log(`Total drivers:        ${this.stats.total}`);
    console.log(`Migrated:             ${this.stats.migrated}`);
    console.log(`Already migrated:     ${this.stats.alreadyMigrated}`);
    console.log(`Errors:               ${this.stats.errors}`);
    
    if (this.errors.length > 0) {
      console.log('\n⚠️  Errors encountered:\n');
      this.errors.forEach(({ driver, error }) => {
        console.log(`  - ${driver}: ${error}`);
      });
    }
    
    if (this.stats.migrated > 0) {
      console.log('\n✅ Backup files created (.backup extension)');
      console.log('✅ Review changes before committing');
    }
    
    console.log('\n💡 Next steps:');
    console.log('  1. Test migrated drivers');
    console.log('  2. Add fingerprints to lib/tuya-dp-engine/fingerprints.json');
    console.log('  3. Update profiles if needed');
    console.log('  4. Run validation: npm run validate');
    console.log('');
  }
}

// Main execution
if (require.main === module) {
  const migrator = new DPEngineMigrator();
  migrator.migrate().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = DPEngineMigrator;
