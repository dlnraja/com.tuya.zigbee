'use strict';

/**
 * INTELLIGENT MERGE v1.0
 *
 * Merges all enrichment data and automatically updates drivers
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = './drivers';
const ENRICHMENT_DIR = './data/enrichment';

class IntelligentMerge {
  constructor() {
    this.z2mData = null;
    this.existingIds = new Set();
    this.toAdd = new Map(); // driver -> [ids]
    this.stats = { added: 0, skipped: 0, unknown: 0 };
  }

  // Load Z2M parsed data
  loadZ2MData() {
    const z2mPath = path.join(ENRICHMENT_DIR, 'z2m-tuya-parsed.json');
    if (fs.existsSync(z2mPath)) {
      this.z2mData = JSON.parse(fs.readFileSync(z2mPath, 'utf8'));
      console.log(`📥 Loaded ${this.z2mData.stats.fingerprints} Z2M fingerprints`);
    }
  }

  // Get all existing IDs from drivers
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

  // Find driver for a device
  findDriver(device) {
    const driver = device.recommendedDriver;
    if (driver && driver !== 'unknown') {
      return driver;
    }

    // Fallback: use description to guess
    const desc = (device.description || '').toLowerCase();
    const id = device.manufacturerId.toLowerCase();

    // Pattern matching
    if (desc.includes('thermostat') || desc.includes('trv')) return 'thermostat';
    if (desc.includes('presence') || desc.includes('radar')) return 'motion_sensor_radar_mmwave';
    if (desc.includes('motion') || desc.includes('pir')) return 'motion_sensor';
    if (desc.includes('temp') && desc.includes('humi')) return 'climate_sensor';
    if (desc.includes('curtain') || desc.includes('blind')) return 'curtain_motor';
    if (desc.includes('switch')) return 'switch_1gang';
    if (desc.includes('plug') || desc.includes('socket')) return 'plug_smart';
    if (desc.includes('dimmer')) return 'dimmer_wall_1gang';
    if (desc.includes('button')) return 'button_wireless_1';
    if (desc.includes('door') || desc.includes('contact')) return 'contact_sensor';
    if (desc.includes('smoke')) return 'smoke_detector_advanced';
    if (desc.includes('water') || desc.includes('leak')) return 'rain_sensor';
    if (desc.includes('soil')) return 'soil_sensor';
    if (desc.includes('gas') || desc.includes('co2')) return 'gas_detector';

    // ID-based fallback
    if (id.startsWith('_tze2') || id.startsWith('_tze3')) {
      // TS0601 devices
      if (id.includes('radar') || id.includes('human')) return 'motion_sensor_radar_mmwave';
      return null; // Don't auto-add uncertain TS0601
    }
    if (id.startsWith('_tz3000')) return 'switch_1gang';
    if (id.startsWith('_tz3210')) return 'plug_smart';

    return null;
  }

  // Process Z2M devices
  processZ2MDevices() {
    if (!this.z2mData) return;

    console.log('\n🔄 Processing Z2M devices...\n');

    this.z2mData.devices.forEach(device => {
      const id = device.manufacturerId.toLowerCase();

      // Skip if already exists
      if (this.existingIds.has(id)) {
        this.stats.skipped++;
        return;
      }

      // Find appropriate driver
      const driver = this.findDriver(device);

      if (driver) {
        if (!this.toAdd.has(driver)) {
          this.toAdd.set(driver, []);
        }
        this.toAdd.get(driver).push({
          id: device.manufacturerId,
          description: device.description
        });
        this.stats.added++;
      } else {
        this.stats.unknown++;
      }
    });

    console.log(`   To add: ${this.stats.added}`);
    console.log(`   Skipped (existing): ${this.stats.skipped}`);
    console.log(`   Unknown (need review): ${this.stats.unknown}`);
  }

  // Update driver compose files
  updateDrivers(dryRun = true) {
    console.log(`\n${dryRun ? '🔍 DRY RUN' : '✏️ UPDATING'} drivers...\n`);

    let totalUpdated = 0;

    this.toAdd.forEach((devices, driverName) => {
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
        devices.forEach(device => {
          if (!existingNormalized.has(device.id.toLowerCase())) {
            json.zigbee.manufacturerName.push(device.id);
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
        console.log(`   ❌ Error with ${driverName}: ${err.message}`);
      }
    });

    console.log(`\n   Total: ${totalUpdated} IDs ${dryRun ? 'would be' : ''} added`);
    return totalUpdated;
  }

  // Generate datapoint mapping for driver-mapping-database.json
  generateDPMappings() {
    if (!this.z2mData) return {};

    const mappings = {};

    this.z2mData.datapointMappings.forEach(m => {
      if (!mappings[m.dp]) {
        mappings[m.dp] = [];
      }
      mappings[m.dp].push({
        z2m: m.z2mCapability,
        homey: m.homeyCapability
      });
    });

    // Deduplicate
    Object.keys(mappings).forEach(dp => {
      const seen = new Set();
      mappings[dp] = mappings[dp].filter(m => {
        const key = `${m.z2m}-${m.homey}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    });

    return mappings;
  }

  // Main run
  run(dryRun = true) {
    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║     INTELLIGENT MERGE v1.0                                ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log('');

    this.loadZ2MData();
    this.loadExistingIds();
    this.processZ2MDevices();

    const updated = this.updateDrivers(dryRun);

    // Generate DP mappings
    const dpMappings = this.generateDPMappings();

    // Save merge report
    const report = {
      timestamp: new Date().toISOString(),
      dryRun,
      stats: this.stats,
      byDriver: Object.fromEntries(
        Array.from(this.toAdd.entries()).map(([k, v]) => [k, v.length])
      ),
      dpMappings
    };

    const reportPath = path.join(ENRICHMENT_DIR, `merge-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('MERGE COMPLETE:');
    console.log(`  New IDs to add: ${this.stats.added}`);
    console.log(`  Already exist: ${this.stats.skipped}`);
    console.log(`  Need review: ${this.stats.unknown}`);
    console.log(`  Report: ${reportPath}`);
    console.log('');
    console.log(dryRun ? '⚠️ DRY RUN - no files modified' : '✅ Drivers updated');
    console.log('═══════════════════════════════════════════════════════════');

    return report;
  }
}

// Run if called directly
if (require.main === module) {
  const merge = new IntelligentMerge();
  const dryRun = !process.argv.includes('--apply');
  merge.run(dryRun);

  if (dryRun) {
    console.log('\n💡 To apply changes, run: node intelligent-merge.js --apply\n');
  }
}

module.exports = IntelligentMerge;
