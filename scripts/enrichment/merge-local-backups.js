'use strict';

/**
 * MERGE LOCAL BACKUPS v1.0
 *
 * Merges IDs from local backup folders into current project
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = './drivers';
const INPUT_FILE = './data/enrichment/local-backup-ids.json';

// Driver mapping based on ID patterns
const DRIVER_PATTERNS = {
  // Climate sensors - _TZE* temperature/humidity
  'climate_sensor': [
    /_tze20[04]_.*temp/i, /_tze20[04]_.*humi/i, /_tze20[04]_.*climate/i,
    /_tze200_dfxkcots/, /_tze200_myd45weu/, /_tze204_myd45weu/,
    /_tze200_yjjdcqsq/, /_tze204_yjjdcqsq/, /_tze284_/
  ],
  // Motion sensors
  'motion_sensor': [
    /_tz3000_.*pir/i, /_tz3000_.*motion/i, /_tze200_.*motion/i
  ],
  // Radar sensors
  'motion_sensor_radar_mmwave': [
    /_tze20[04]_.*radar/i, /_tze20[04]_.*presence/i, /_tze20[04]_.*human/i,
    /_tze204_qasjif9e/, /_tze204_ijxvkhd0/, /_tze204_7gclukjs/
  ],
  // Switches - most _TZ3000 are switches
  'switch_1gang': [
    /_tz3000_[a-z0-9]{8}$/i
  ],
  // Smart plugs
  'plug_smart': [
    /_tz3210_[a-z0-9]+/i, /_tz3000_.*plug/i, /_tz3000_.*socket/i
  ],
  // Curtain motors
  'curtain_motor': [
    /_tze20[04]_.*curtain/i, /_tze20[04]_.*blind/i, /_tze200_bjzrowv2/,
    /_tz3210_dwytrmda/
  ],
  // Contact sensors
  'contact_sensor': [
    /_tz3000_.*door/i, /_tz3000_.*contact/i, /_tz3000_.*window/i
  ],
  // Water sensors
  'rain_sensor': [
    /_tze20[04]_.*water/i, /_tze20[04]_.*leak/i
  ],
  // Smoke detectors
  'smoke_detector_advanced': [
    /_tze20[04]_.*smoke/i, /_tz3000_.*smoke/i
  ],
  // Buttons
  'button_wireless_1': [
    /_tz3000_.*button/i, /_tz3000_.*remote/i
  ],
  // Dimmers
  'dimmer_wall_1gang': [
    /_tze20[04]_.*dim/i, /_tz3210_pagajpog/, /_tz3210_3mpwqzuu/,
    /_tze204_5cuocqty/, /_tze204_bxoo2swd/
  ]
};

class LocalBackupMerger {
  constructor() {
    this.localIds = [];
    this.existingIds = new Set();
    this.toAdd = new Map();
    this.stats = { added: 0, skipped: 0, unknown: 0 };
  }

  // Load local backup IDs
  loadLocalIds() {
    if (!fs.existsSync(INPUT_FILE)) {
      console.log('❌ Run extract-local-backups.js first!');
      process.exit(1);
    }

    const data = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
    this.localIds = data.manufacturerIds;
    console.log(`📥 Loaded ${this.localIds.length} IDs from local backups`);
  }

  // Load existing IDs from drivers
  loadExistingIds() {
    if (!fs.existsSync(DRIVERS_DIR)) return;

    const drivers = fs.readdirSync(DRIVERS_DIR);
    drivers.forEach(driver => {
      const composePath = path.join(DRIVERS_DIR, driver, 'driver.compose.json');
      if (fs.existsSync(composePath)) {
        const content = fs.readFileSync(composePath, 'utf8');
        const matches = content.match(/_TZ[E0-9]{1,4}_[a-z0-9]+/gi) || [];
        matches.forEach(id => this.existingIds.add(id.toLowerCase()));
      }
    });

    console.log(`📁 Found ${this.existingIds.size} existing IDs in drivers`);
  }

  // Find best driver for an ID
  findDriver(id) {
    const lowerId = id.toLowerCase();

    for (const [driver, patterns] of Object.entries(DRIVER_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(lowerId)) {
          return driver;
        }
      }
    }

    // Fallback based on prefix
    if (lowerId.startsWith('_tze2') || lowerId.startsWith('_tze3')) {
      return 'climate_sensor'; // TS0601 default
    }
    if (lowerId.startsWith('_tz3000')) {
      return 'switch_1gang';
    }
    if (lowerId.startsWith('_tz3210')) {
      return 'plug_smart';
    }

    return null;
  }

  // Process all IDs
  process() {
    console.log('\n🔄 Processing IDs...\n');

    this.localIds.forEach(id => {
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
    console.log(`   Skipped (existing): ${this.stats.skipped}`);
    console.log(`   Unknown: ${this.stats.unknown}`);
  }

  // Update drivers
  updateDrivers(dryRun = true) {
    console.log(`\n${dryRun ? '🔍 DRY RUN' : '✏️ UPDATING'} drivers...\n`);

    let totalUpdated = 0;

    this.toAdd.forEach((ids, driverName) => {
      const composePath = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');

      if (!fs.existsSync(composePath)) {
        console.log(`   ⚠️ Driver not found: ${driverName}`);
        return;
      }

      try {
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
      } catch (err) {
        console.log(`   ❌ Error: ${err.message}`);
      }
    });

    console.log(`\n   Total: ${totalUpdated} IDs ${dryRun ? 'would be' : ''} added`);
    return totalUpdated;
  }

  run(dryRun = true) {
    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║     MERGE LOCAL BACKUPS v1.0                              ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log('');

    this.loadLocalIds();
    this.loadExistingIds();
    this.process();
    this.updateDrivers(dryRun);

    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(dryRun ? '⚠️ DRY RUN - no files modified' : '✅ Drivers updated');
    console.log('═══════════════════════════════════════════════════════════');
  }
}

if (require.main === module) {
  const merger = new LocalBackupMerger();
  const dryRun = !process.argv.includes('--apply');
  merger.run(dryRun);

  if (dryRun) {
    console.log('\n💡 To apply: node merge-local-backups.js --apply\n');
  }
}

module.exports = LocalBackupMerger;
