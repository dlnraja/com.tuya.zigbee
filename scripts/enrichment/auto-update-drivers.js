'use strict';

/**
 * AUTO-UPDATE DRIVERS v1.0
 *
 * Automatically adds discovered manufacturer IDs to appropriate drivers
 * Uses intelligent categorization based on ID patterns and known mappings
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = './drivers';

// Known manufacturer ID patterns and their likely driver categories
const PATTERNS = {
  // Climate/Temperature sensors
  climate: [
    /_tze20[04]_.*temp/i,
    /_tze20[04]_.*humi/i,
    /_tze284_.*climate/i,
    /_tz3000_.*th[0-9]/i
  ],
  // Motion sensors
  motion: [
    /_tz3000_.*pir/i,
    /_tze20[04]_.*motion/i,
    /_tz3000_.*occupancy/i,
    /zg-204/i
  ],
  // Radar/Presence sensors
  radar: [
    /_tze20[04]_.*radar/i,
    /_tze20[04]_.*presence/i,
    /_tze20[04]_.*mmwave/i,
    /_tze284_.*human/i
  ],
  // Switches
  switch: [
    /_tz3000_[a-z0-9]+$/i,  // Most _TZ3000 without suffix are switches
    /_tze20[04]_.*switch/i
  ],
  // Smart plugs
  plug: [
    /_tz3000_.*plug/i,
    /_tz3210_.*socket/i,
    /ts011f/i
  ],
  // Curtain/Blind motors
  curtain: [
    /_tze20[04]_.*curtain/i,
    /_tze20[04]_.*blind/i,
    /_tze20[04]_.*motor/i,
    /_tz3000_.*cover/i
  ],
  // Contact sensors
  contact: [
    /_tz3000_.*door/i,
    /_tz3000_.*window/i,
    /_tz3000_.*contact/i,
    /ts0203/i
  ],
  // Water/Leak sensors
  water: [
    /_tze20[04]_.*water/i,
    /_tze20[04]_.*leak/i,
    /_tz3000_.*flood/i
  ],
  // Smoke detectors
  smoke: [
    /_tze20[04]_.*smoke/i,
    /_tze284_.*smoke/i,
    /_tz3000_.*smoke/i,
    /ts0205/i
  ],
  // Buttons/Remotes
  button: [
    /_tz3000_.*button/i,
    /_tz3000_.*remote/i,
    /ts004[0-9]/i,
    /ts0041/i
  ],
  // Dimmers
  dimmer: [
    /_tz3000_.*dim/i,
    /_tze20[04]_.*dim/i,
    /ts110[ef]/i
  ],
  // Thermostats/TRV
  thermostat: [
    /_tze20[04]_.*thermostat/i,
    /_tze20[04]_.*trv/i,
    /_tze20[04]_.*valve/i
  ]
};

// Driver name mappings
const DRIVER_MAP = {
  climate: 'climate_sensor',
  motion: 'motion_sensor',
  radar: 'motion_sensor_radar_mmwave',
  switch: 'switch_1gang',
  plug: 'plug_smart',
  curtain: 'curtain_motor',
  contact: 'contact_sensor',
  water: 'rain_sensor',
  smoke: 'smoke_detector_advanced',
  button: 'button_wireless_1',
  dimmer: 'dimmer_wall_1gang',
  thermostat: 'thermostat'
};

class DriverAutoUpdater {
  constructor() {
    this.addedIds = new Map();
    this.skippedIds = [];
  }

  // Categorize a manufacturer ID
  categorizeId(id) {
    const lowerId = id.toLowerCase();

    for (const [category, patterns] of Object.entries(PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(lowerId)) {
          return category;
        }
      }
    }

    // Default categorization based on prefix
    if (lowerId.startsWith('_tze20') || lowerId.startsWith('_tze28')) {
      // TS0601 devices - could be many types, default to climate for _TZE*
      return 'climate';
    } else if (lowerId.startsWith('_tz3000')) {
      // Standard Zigbee devices - often switches
      return 'switch';
    } else if (lowerId.startsWith('_tz3210')) {
      // Often plugs or switches
      return 'plug';
    }

    return null;
  }

  // Add ID to driver's compose.json
  addIdToDriver(driverName, manufacturerId) {
    const composePath = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');

    if (!fs.existsSync(composePath)) {
      console.log(`   ⚠️ Driver not found: ${driverName}`);
      return false;
    }

    try {
      const content = fs.readFileSync(composePath, 'utf8');
      const json = JSON.parse(content);

      // Check if already exists
      const existingIds = json.zigbee?.manufacturerName || [];
      const normalizedId = manufacturerId.toLowerCase();

      if (existingIds.some(id => id.toLowerCase() === normalizedId)) {
        return false; // Already exists
      }

      // Add the new ID
      if (!json.zigbee) json.zigbee = {};
      if (!json.zigbee.manufacturerName) json.zigbee.manufacturerName = [];

      json.zigbee.manufacturerName.push(manufacturerId);

      // Write back
      fs.writeFileSync(composePath, JSON.stringify(json, null, 2));

      if (!this.addedIds.has(driverName)) {
        this.addedIds.set(driverName, []);
      }
      this.addedIds.get(driverName).push(manufacturerId);

      return true;
    } catch (err) {
      console.log(`   ❌ Error updating ${driverName}: ${err.message}`);
      return false;
    }
  }

  // Process list of manufacturer IDs
  processIds(ids) {
    console.log(`\n📝 Processing ${ids.length} manufacturer IDs...\n`);

    ids.forEach(id => {
      const category = this.categorizeId(id);

      if (category && DRIVER_MAP[category]) {
        const driverName = DRIVER_MAP[category];
        const added = this.addIdToDriver(driverName, id);

        if (added) {
          console.log(`   ✅ ${id} → ${driverName}`);
        }
      } else {
        this.skippedIds.push(id);
      }
    });
  }

  // Generate summary report
  generateReport() {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('AUTO-UPDATE SUMMARY:');
    console.log('═══════════════════════════════════════════════════════════');

    let totalAdded = 0;
    this.addedIds.forEach((ids, driver) => {
      console.log(`\n${driver}: +${ids.length} IDs`);
      ids.forEach(id => console.log(`   ${id}`));
      totalAdded += ids.length;
    });

    console.log(`\nTotal Added: ${totalAdded}`);
    console.log(`Skipped (uncategorized): ${this.skippedIds.length}`);

    if (this.skippedIds.length > 0) {
      console.log('\nSkipped IDs (need manual review):');
      this.skippedIds.slice(0, 20).forEach(id => console.log(`   ${id}`));
      if (this.skippedIds.length > 20) {
        console.log(`   ... and ${this.skippedIds.length - 20} more`);
      }
    }

    return {
      totalAdded,
      byDriver: Object.fromEntries(this.addedIds),
      skipped: this.skippedIds
    };
  }

  // Main run
  run(idsFilePath) {
    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║     AUTO-UPDATE DRIVERS v1.0                              ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');

    // Read IDs from file
    let ids = [];

    if (idsFilePath && fs.existsSync(idsFilePath)) {
      const content = fs.readFileSync(idsFilePath, 'utf8');

      // Try JSON first
      try {
        const json = JSON.parse(content);
        ids = json.manufacturerIds || json.missing_ids || json;
      } catch {
        // Plain text, one ID per line
        ids = content.trim().split('\n').filter(Boolean);
      }
    } else {
      console.log('Usage: node auto-update-drivers.js <ids-file>');
      console.log('  ids-file: JSON or text file with manufacturer IDs');
      return;
    }

    this.processIds(ids);
    return this.generateReport();
  }
}

// Run if called directly
if (require.main === module) {
  const updater = new DriverAutoUpdater();
  const idsFile = process.argv[2] || './data/enrichment/missing_ids.txt';
  updater.run(idsFile);
}

module.exports = DriverAutoUpdater;
