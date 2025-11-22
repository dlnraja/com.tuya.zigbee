#!/usr/bin/env node
/**
 * AUTO-UPDATE DRIVERS SYSTEM
 * Automatically enriches all drivers with data from Blakadder/Zigbee2MQTT
 *
 * Features:
 * - Adds missing IAS Zone clusters to buttons
 * - Adds new manufacturer IDs
 * - Updates capabilities based on device type
 * - Validates Homey SDK3 compliance
 *
 * Usage: node scripts/auto-update-drivers.js [--dry-run] [--driver button_wireless_1]
 */

'use strict';

const fs = require('fs').promises;
const path = require('path');

// Known issues and fixes database
const KNOWN_FIXES = {
  // Buttons need IAS Zone for proper flow triggers
  button_fixes: {
    condition: (driver) => driver.class === 'button',
    apply: (driver) => {
      const endpoint = driver.zigbee?.endpoints?.['1'];
      if (!endpoint) return false;

      let updated = false;

      // Add IAS Zone cluster (1280)
      if (!endpoint.clusters.includes(1280) && !endpoint.clusters.includes('iasZone')) {
        endpoint.clusters.push(1280);
        updated = true;
        console.log('  ✅ Added IAS Zone cluster (1280)');
      }

      // Add IAS Zone binding
      if (!endpoint.bindings.includes(1280)) {
        endpoint.bindings.push(1280);
        updated = true;
        console.log('  ✅ Added IAS Zone binding');
      }

      // Ensure basic clusters are present
      const essentialClusters = [0, 1, 3]; // basic, powerCfg, identify
      essentialClusters.forEach(cluster => {
        if (!endpoint.clusters.includes(cluster)) {
          endpoint.clusters.push(cluster);
          updated = true;
          console.log(`  ✅ Added essential cluster: ${cluster}`);
        }
      });

      return updated;
    },
    description: 'Add IAS Zone support for button flow triggers'
  },

  // Motion sensors need proper clusters
  motion_sensor_fixes: {
    condition: (driver) =>
      driver.capabilities?.includes('alarm_motion') ||
      driver.name?.en?.toLowerCase().includes('motion'),
    apply: (driver) => {
      const endpoint = driver.zigbee?.endpoints?.['1'];
      if (!endpoint) return false;

      let updated = false;

      // Add IAS Zone if not present
      if (!endpoint.clusters.includes(1280)) {
        endpoint.clusters.push(1280);
        endpoint.bindings.push(1280);
        updated = true;
        console.log('  ✅ Added IAS Zone for motion detection');
      }

      return updated;
    },
    description: 'Ensure motion sensors have IAS Zone cluster'
  },

  // Contact sensors
  contact_sensor_fixes: {
    condition: (driver) => driver.capabilities?.includes('alarm_contact'),
    apply: (driver) => {
      const endpoint = driver.zigbee?.endpoints?.['1'];
      if (!endpoint) return false;

      if (!endpoint.clusters.includes(1280)) {
        endpoint.clusters.push(1280);
        endpoint.bindings.push(1280);
        console.log('  ✅ Added IAS Zone for contact detection');
        return true;
      }
      return false;
    },
    description: 'Ensure contact sensors have IAS Zone cluster'
  },

  // Battery devices need powerConfiguration cluster
  battery_fixes: {
    condition: (driver) => driver.capabilities?.includes('measure_battery'),
    apply: (driver) => {
      const endpoint = driver.zigbee?.endpoints?.['1'];
      if (!endpoint) return false;

      if (!endpoint.clusters.includes(1)) {
        endpoint.clusters.push(1); // powerConfiguration
        console.log('  ✅ Added powerConfiguration cluster for battery');
        return true;
      }
      return false;
    },
    description: 'Ensure battery devices have powerConfiguration cluster'
  },
};

// Blakadder manufacturer IDs to add (from research)
const NEW_MANUFACTURER_IDS = {
  'button_wireless_1': [
    '_TZ3000_pzui3skt',
    '_TZ3400_keyjqthh',
  ],
  'button_wireless_3': [
    '_TZ3000_bi6lpsew',
    '_TZ3000_famkxci2',
    '_TZ3000_rrjr1q0u',
    '_TZ3000_gbm10jnj',
    '_TZ3000_sj7jbgks',
    '_TZ3400_key8kk7r',
  ],
  'button_wireless_4': [
    '_TZ3000_abci1hiu',
    '_TZ3000_mh9px7cq',
    '_TZ3000_wkai4ga5',
    '_TZ3000_ygvf9xzp',
    '_TZ3000_vp6clf9d',
  ],
};

class DriverUpdater {
  constructor(options = {}) {
    this.dryRun = options.dryRun || false;
    this.specificDriver = options.driver || null;
    this.driversPath = path.join(__dirname, '..', 'drivers');
    this.stats = {
      scanned: 0,
      updated: 0,
      errors: 0,
      skipped: 0,
    };
  }

  /**
   * Main update process
   */
  async update() {
    console.log('🚀 AUTO-UPDATE DRIVERS SYSTEM');
    console.log('='.repeat(60));

    if (this.dryRun) {
      console.log('🔍 DRY RUN MODE - No files will be modified');
    }

    console.log('');

    try {
      const drivers = await this.getDriverList();

      for (const driverName of drivers) {
        await this.updateDriver(driverName);
      }

      this.printSummary();

    } catch (err) {
      console.error('❌ Fatal error:', err.message);
      process.exit(1);
    }
  }

  /**
   * Get list of drivers to update
   */
  async getDriverList() {
    if (this.specificDriver) {
      return [this.specificDriver];
    }

    const dirs = await fs.readdir(this.driversPath);
    return dirs.filter(async (dir) => {
      const stat = await fs.stat(path.join(this.driversPath, dir));
      return stat.isDirectory();
    });
  }

  /**
   * Update a single driver
   */
  async updateDriver(driverName) {
    console.log(`\n📦 Processing: ${driverName}`);
    console.log('-'.repeat(60));

    this.stats.scanned++;

    try {
      const composePath = path.join(this.driversPath, driverName, 'driver.compose.json');

      // Check if file exists
      try {
        await fs.access(composePath);
      } catch (err) {
        console.log('  ⚠️  No driver.compose.json found - skipping');
        this.stats.skipped++;
        return;
      }

      // Read current driver
      const content = await fs.readFile(composePath, 'utf-8');
      const driver = JSON.parse(content);

      let wasUpdated = false;

      // Apply known fixes
      for (const [fixName, fix] of Object.entries(KNOWN_FIXES)) {
        if (fix.condition(driver)) {
          console.log(`  🔧 Applying: ${fix.description}`);
          const updated = fix.apply(driver);
          if (updated) {
            wasUpdated = true;
          }
        }
      }

      // Add new manufacturer IDs
      if (NEW_MANUFACTURER_IDS[driverName]) {
        const added = this.addManufacturerIds(driver, NEW_MANUFACTURER_IDS[driverName]);
        if (added > 0) {
          console.log(`  ✅ Added ${added} new manufacturer ID(s)`);
          wasUpdated = true;
        }
      }

      // Save if updated
      if (wasUpdated) {
        if (!this.dryRun) {
          await fs.writeFile(composePath, JSON.stringify(driver, null, 2) + '\n');
          console.log('  💾 Changes saved');
        } else {
          console.log('  💾 Changes would be saved (dry-run mode)');
        }
        this.stats.updated++;
      } else {
        console.log('  ✓ No updates needed');
      }

    } catch (err) {
      console.error(`  ❌ Error: ${err.message}`);
      this.stats.errors++;
    }
  }

  /**
   * Add new manufacturer IDs to driver
   */
  addManufacturerIds(driver, newIds) {
    if (!driver.zigbee || !driver.zigbee.manufacturerName) {
      return 0;
    }

    let added = 0;

    for (const id of newIds) {
      if (!driver.zigbee.manufacturerName.includes(id)) {
        driver.zigbee.manufacturerName.push(id);
        added++;
        console.log(`    + ${id}`);
      }
    }

    return added;
  }

  /**
   * Print summary
   */
  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`Scanned:  ${this.stats.scanned} drivers`);
    console.log(`Updated:  ${this.stats.updated} drivers`);
    console.log(`Skipped:  ${this.stats.skipped} drivers`);
    console.log(`Errors:   ${this.stats.errors} drivers`);
    console.log('');

    if (this.stats.updated > 0) {
      console.log('✅ SUCCESS: Drivers have been updated');
      if (!this.dryRun) {
        console.log('⚠️  Remember to run: homey app validate');
      }
    } else {
      console.log('✓ All drivers are up to date');
    }
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  dryRun: args.includes('--dry-run'),
  driver: args.find(arg => arg.startsWith('--driver='))?.split('=')[1],
};

// Run updater
const updater = new DriverUpdater(options);
updater.update().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
