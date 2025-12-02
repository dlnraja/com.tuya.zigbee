'use strict';

/**
 * AUTO-FIX AND ENRICH DRIVERS v1.0
 *
 * Fixes invalid manufacturer IDs and enriches drivers with:
 * - Missing product IDs
 * - Missing capabilities
 * - Missing DPs
 * - Missing clusters
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const DRIVERS_DIR = './drivers';

// Product ID mappings by driver type
const PRODUCT_ID_MAP = {
  'climate_sensor': ['TS0201', 'TS0601'],
  'motion_sensor': ['TS0202', 'TS0601'],
  'motion_sensor_radar_mmwave': ['TS0601', 'TS0225'],
  'contact_sensor': ['TS0203', 'TS0601'],
  'smoke_detector_advanced': ['TS0205', 'TS0601'],
  'rain_sensor': ['TS0207', 'TS0601'],
  'water_leak_sensor': ['TS0207', 'TS0601'],
  'plug_smart': ['TS011F', 'TS0121', 'TS0601'],
  'plug_energy_monitor': ['TS011F', 'TS0121'],
  'switch_1gang': ['TS0001', 'TS0011', 'TS000F', 'TS0601'],
  'switch_2gang': ['TS0002', 'TS0012', 'TS0601'],
  'switch_3gang': ['TS0003', 'TS0013', 'TS0601'],
  'switch_4gang': ['TS0004', 'TS0014', 'TS0601'],
  'dimmer_wall_1gang': ['TS0101', 'TS110E', 'TS110F', 'TS0601'],
  'curtain_motor': ['TS130F', 'TS0601'],
  'shutter_roller_controller': ['TS130F', 'TS0601'],
  'button_wireless': ['TS0041', 'TS0042', 'TS0043', 'TS0044'],
  'button_wireless_1': ['TS0041'],
  'button_wireless_2': ['TS0042'],
  'button_wireless_3': ['TS0043'],
  'button_wireless_4': ['TS0044', 'TS004F'],
  'button_wireless_6': ['TS0046'],
  'radiator_valve': ['TS0601'],
  'thermostat_ts0601': ['TS0601'],
  'bulb_dimmable': ['TS0501A', 'TS0501B'],
  'bulb_tunable_white': ['TS0502A', 'TS0502B'],
  'bulb_rgb': ['TS0503A', 'TS0503B'],
  'bulb_rgbw': ['TS0504A', 'TS0504B', 'TS0505A', 'TS0505B'],
  'led_strip': ['TS0503B', 'TS0504B', 'TS0505B'],
  'led_strip_rgbw': ['TS0504B', 'TS0505B'],
  'gas_detector': ['TS0601'],
  'siren': ['TS0216', 'TS0601'],
  'doorbell': ['TS0601'],
  'lock_smart': ['TS0601'],
  'soil_sensor': ['TS0601'],
  'air_quality_co2': ['TS0601'],
  'air_quality_comprehensive': ['TS0601']
};

// Missing capabilities by driver
const CAPABILITY_FIXES = {
  'dimmer_wall_1gang': ['onoff', 'dim'],
  'switch_2gang': ['onoff', 'onoff.1'],
  'siren': ['onoff', 'alarm_generic'],
  'smoke_detector_advanced': ['alarm_smoke', 'measure_battery'],
  'gas_detector': ['alarm_gas', 'measure_battery']
};

// Cluster mappings by driver type
const CLUSTER_MAP = {
  'climate_sensor': ['msTemperatureMeasurement', 'msRelativeHumidity', 'genPowerCfg'],
  'motion_sensor': ['msOccupancySensing', 'msIlluminanceMeasurement', 'genPowerCfg'],
  'contact_sensor': ['ssIasZone', 'genPowerCfg'],
  'smoke_detector_advanced': ['ssIasZone', 'genPowerCfg'],
  'plug_smart': ['genOnOff', 'haElectricalMeasurement', 'seMetering'],
  'switch_1gang': ['genOnOff'],
  'dimmer_wall_1gang': ['genOnOff', 'genLevelCtrl'],
  'curtain_motor': ['closuresWindowCovering'],
  'bulb_dimmable': ['genOnOff', 'genLevelCtrl'],
  'bulb_rgb': ['genOnOff', 'genLevelCtrl', 'lightingColorCtrl']
};

class AutoFixEnrich {
  constructor() {
    this.fixes = [];
    this.stats = {
      driversProcessed: 0,
      productIdsAdded: 0,
      capabilitiesAdded: 0,
      clustersAdded: 0,
      invalidIdsRemoved: 0
    };
  }

  // Check if manufacturer ID is valid
  isValidManufacturerId(id) {
    // Valid patterns: _TZ3000_xxx, _TZE200_xxx, TS0xxx, SONOFF, eWeLink
    return id.match(/^_TZ[E0-9]{1,4}_[a-z0-9]+$/i) ||
      id.match(/^TS[0-9]{3,4}[A-Z]?$/i) ||
      id === 'SONOFF' || id === 'eWeLink';
  }

  // Fix manufacturer IDs with typos
  fixManufacturerId(id) {
    // Common fixes
    const fixes = {
      '_tze21c_': '_tze204_',
      '_tzb210_': '_tz3210_',
      '_tzb000_': '_tz3000_',
      '_tyzb01_': '_tyzb01_', // Keep TYZB01 as is - valid old format
      '_tz321c_': '_tz3210_'
    };

    let fixed = id.toLowerCase();

    for (const [wrong, correct] of Object.entries(fixes)) {
      if (fixed.startsWith(wrong)) {
        fixed = fixed.replace(wrong, correct);
      }
    }

    return fixed;
  }

  // Process single driver
  processDriver(driverName, composePath) {
    try {
      const content = fs.readFileSync(composePath, 'utf8');
      const json = JSON.parse(content);
      let modified = false;

      // 1. Fix and filter manufacturer IDs
      if (json.zigbee?.manufacturerName) {
        const originalCount = json.zigbee.manufacturerName.length;
        const validIds = [];
        const fixedIds = [];

        json.zigbee.manufacturerName.forEach(id => {
          if (this.isValidManufacturerId(id)) {
            validIds.push(id);
          } else {
            // Try to fix it
            const fixed = this.fixManufacturerId(id);
            if (this.isValidManufacturerId(fixed) && !validIds.includes(fixed)) {
              fixedIds.push(fixed);
              validIds.push(fixed);
            }
            // Skip invalid brand names like "LIDL", "Philips", etc.
          }
        });

        if (validIds.length !== originalCount || fixedIds.length > 0) {
          json.zigbee.manufacturerName = [...new Set(validIds)];
          this.stats.invalidIdsRemoved += (originalCount - validIds.length + fixedIds.length);
          modified = true;
          this.fixes.push(`${driverName}: Fixed/removed ${originalCount - validIds.length} invalid IDs`);
        }
      }

      // 2. Add missing product IDs
      const expectedProductIds = PRODUCT_ID_MAP[driverName] || [];
      if (expectedProductIds.length > 0) {
        if (!json.zigbee) json.zigbee = {};
        if (!json.zigbee.productId) json.zigbee.productId = [];

        expectedProductIds.forEach(pid => {
          if (!json.zigbee.productId.includes(pid)) {
            json.zigbee.productId.push(pid);
            this.stats.productIdsAdded++;
            modified = true;
          }
        });
      }

      // 3. Add missing capabilities
      const capFixes = CAPABILITY_FIXES[driverName];
      if (capFixes) {
        if (!json.capabilities) json.capabilities = [];

        capFixes.forEach(cap => {
          if (!json.capabilities.includes(cap)) {
            json.capabilities.push(cap);
            this.stats.capabilitiesAdded++;
            modified = true;
            this.fixes.push(`${driverName}: Added capability ${cap}`);
          }
        });
      }

      // 4. Add missing clusters
      const expectedClusters = CLUSTER_MAP[driverName];
      if (expectedClusters && json.zigbee?.endpoints) {
        const endpoint1 = json.zigbee.endpoints['1'] || json.zigbee.endpoints[1];
        if (endpoint1) {
          if (!endpoint1.clusters) endpoint1.clusters = [];

          expectedClusters.forEach(cluster => {
            if (!endpoint1.clusters.includes(cluster)) {
              endpoint1.clusters.push(cluster);
              this.stats.clustersAdded++;
              modified = true;
            }
          });
        }
      }

      // Save if modified
      if (modified) {
        fs.writeFileSync(composePath, JSON.stringify(json, null, 2));
        this.stats.driversProcessed++;
      }

      return modified;
    } catch (err) {
      console.log(`   ❌ Error processing ${driverName}: ${err.message}`);
      return false;
    }
  }

  // Process all drivers
  processAll() {
    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║     AUTO-FIX AND ENRICH DRIVERS v1.0                      ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log('');

    const drivers = fs.readdirSync(DRIVERS_DIR);

    drivers.forEach(driver => {
      const composePath = path.join(DRIVERS_DIR, driver, 'driver.compose.json');
      if (fs.existsSync(composePath)) {
        const modified = this.processDriver(driver, composePath);
        const status = modified ? '✏️' : '✅';
        console.log(`${status} ${driver}`);
      }
    });

    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('SUMMARY:');
    console.log(`  Drivers modified: ${this.stats.driversProcessed}`);
    console.log(`  Product IDs added: ${this.stats.productIdsAdded}`);
    console.log(`  Capabilities added: ${this.stats.capabilitiesAdded}`);
    console.log(`  Clusters added: ${this.stats.clustersAdded}`);
    console.log(`  Invalid IDs handled: ${this.stats.invalidIdsRemoved}`);
    console.log('═══════════════════════════════════════════════════════════');

    return this.stats;
  }
}

if (require.main === module) {
  const fixer = new AutoFixEnrich();
  fixer.processAll();
}

module.exports = AutoFixEnrich;
