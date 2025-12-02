'use strict';

/**
 * MERGE ALL SOURCES v1.0
 *
 * Merges IDs from ZHA, deCONZ, and other sources into drivers
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = './drivers';
const INPUT_FILE = './data/enrichment/all-sources-ids.json';

// Driver mapping
const DRIVER_PATTERNS = {
  'climate_sensor': [
    /_tze20[04]_.*temp/i, /_tze20[04]_.*humi/i, /_tze284_/
  ],
  'motion_sensor': [
    /_tz3000_.*pir/i, /_tz3000_.*motion/i
  ],
  'motion_sensor_radar_mmwave': [
    /_tze20[04]_.*radar/i, /_tze20[04]_.*presence/i, /_tze20[04]_.*human/i
  ],
  'switch_1gang': [
    /_tz3000_[a-z0-9]{8}$/i
  ],
  'plug_smart': [
    /_tz3210_/i, /_tz3000_.*plug/i, /_tz3000_.*socket/i
  ],
  'curtain_motor': [
    /_tze20[04]_.*curtain/i, /_tze20[04]_.*blind/i
  ],
  'contact_sensor': [
    /_tz3000_.*door/i, /_tz3000_.*contact/i
  ],
  'rain_sensor': [
    /_tze20[04]_.*water/i, /_tze20[04]_.*leak/i
  ],
  'smoke_detector_advanced': [
    /_tze20[04]_.*smoke/i
  ],
  'button_wireless_1': [
    /_tz3000_.*button/i, /_tz3000_.*remote/i
  ],
  'dimmer_wall_1gang': [
    /_tze20[04]_.*dim/i, /_tz3210_.*dim/i
  ]
};

class AllSourcesMerger {
  constructor() {
    this.data = null;
    this.existingIds = new Set();
    this.toAdd = new Map();
    this.stats = { added: 0, skipped: 0, unknown: 0 };
  }

  loadData() {
    if (!fs.existsSync(INPUT_FILE)) {
      console.log('❌ Run fetch-all-sources.js first!');
      process.exit(1);
    }
    this.data = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
    console.log(`📥 Loaded ${this.data.missingIds.length} missing IDs`);
  }

  loadExistingIds() {
    const drivers = fs.readdirSync(DRIVERS_DIR);
    drivers.forEach(driver => {
      const composePath = path.join(DRIVERS_DIR, driver, 'driver.compose.json');
      if (fs.existsSync(composePath)) {
        const content = fs.readFileSync(composePath, 'utf8');
        const matches = content.match(/_TZ[E0-9]{1,4}_[a-z0-9]+/gi) || [];
        matches.forEach(id => this.existingIds.add(id.toLowerCase()));
      }
    });
    console.log(`📁 Found ${this.existingIds.size} existing IDs`);
  }

  findDriver(id) {
    const lowerId = id.toLowerCase();

    for (const [driver, patterns] of Object.entries(DRIVER_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(lowerId)) {
          return driver;
        }
      }
    }

    // Fallback
    if (lowerId.startsWith('_tze2') || lowerId.startsWith('_tze3')) {
      return 'climate_sensor';
    }
    if (lowerId.startsWith('_tz3000')) {
      return 'switch_1gang';
    }
    if (lowerId.startsWith('_tz3210')) {
      return 'plug_smart';
    }
    if (lowerId.startsWith('_tz3040')) {
      return 'switch_1gang';
    }

    return null;
  }

  process() {
    console.log('\n🔄 Processing missing IDs...\n');

    this.data.missingIds.forEach(id => {
      if (this.existingIds.has(id.toLowerCase())) {
        this.stats.skipped++;
        return;
      }

      const driver = this.findDriver(id);

      if (driver) {
        if (!this.toAdd.has(driver)) {
          this.toAdd.set(driver, []);
        }
        this.toAdd.get(driver).push(id);
        this.stats.added++;
      } else {
        this.stats.unknown++;
      }
    });

    console.log(`   To add: ${this.stats.added}`);
    console.log(`   Skipped: ${this.stats.skipped}`);
    console.log(`   Unknown: ${this.stats.unknown}`);
  }

  updateDrivers(dryRun = true) {
    console.log(`\n${dryRun ? '🔍 DRY RUN' : '✏️ UPDATING'} drivers...\n`);

    let totalUpdated = 0;

    this.toAdd.forEach((ids, driverName) => {
      const composePath = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');

      if (!fs.existsSync(composePath)) {
        console.log(`   ⚠️ Driver not found: ${driverName}`);
        return;
      }

      const json = JSON.parse(fs.readFileSync(composePath, 'utf8'));

      if (!json.zigbee) json.zigbee = {};
      if (!json.zigbee.manufacturerName) json.zigbee.manufacturerName = [];

      const existingNormalized = new Set(
        json.zigbee.manufacturerName.map(id => id.toLowerCase())
      );

      let added = 0;
      ids.forEach(id => {
        if (!existingNormalized.has(id.toLowerCase())) {
          json.zigbee.manufacturerName.push(id);
          added++;
        }
      });

      if (added > 0) {
        console.log(`   ${driverName}: +${added} IDs`);

        if (!dryRun) {
          fs.writeFileSync(composePath, JSON.stringify(json, null, 2));
        }

        totalUpdated += added;
      }
    });

    console.log(`\n   Total: ${totalUpdated} IDs ${dryRun ? 'would be' : ''} added`);
    return totalUpdated;
  }

  run(dryRun = true) {
    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║     MERGE ALL SOURCES v1.0                                ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log('');

    this.loadData();
    this.loadExistingIds();
    this.process();
    this.updateDrivers(dryRun);

    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(dryRun ? '⚠️ DRY RUN' : '✅ Drivers updated');
    console.log('═══════════════════════════════════════════════════════════');
  }
}

if (require.main === module) {
  const merger = new AllSourcesMerger();
  const dryRun = !process.argv.includes('--apply');
  merger.run(dryRun);

  if (dryRun) {
    console.log('\n💡 To apply: node merge-all-sources.js --apply\n');
  }
}

module.exports = AllSourcesMerger;
