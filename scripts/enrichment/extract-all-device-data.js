'use strict';

/**
 * EXTRACT ALL DEVICE DATA v1.0
 *
 * Extracts from:
 * - All driver.compose.json files
 * - All device.js files (DPs, clusters, capabilities)
 * - driver-mapping-database.json
 * - Git history
 *
 * Generates a comprehensive device database
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DRIVERS_DIR = './drivers';
const OUTPUT_FILE = './data/enrichment/complete-device-database.json';

class DeviceDataExtractor {
  constructor() {
    this.devices = new Map();
    this.allManufacturerIds = new Set();
    this.allProductIds = new Set();
    this.allDatapoints = new Map();
    this.allClusters = new Set();
    this.allCapabilities = new Set();
    this.driverProfiles = new Map();
  }

  // Extract from driver.compose.json
  extractFromDriverCompose(driverName, composePath) {
    try {
      const content = fs.readFileSync(composePath, 'utf8');
      const json = JSON.parse(content);

      const profile = {
        name: json.name?.en || driverName,
        class: json.class,
        capabilities: json.capabilities || [],
        manufacturerNames: [],
        productIds: [],
        clusters: [],
        bindings: [],
        energy: json.energy || null,
        settings: (json.settings || []).map(s => s.id)
      };

      // Extract zigbee data
      if (json.zigbee) {
        profile.manufacturerNames = json.zigbee.manufacturerName || [];
        profile.productIds = json.zigbee.productId || [];

        // Extract clusters from endpoints
        if (json.zigbee.endpoints) {
          Object.values(json.zigbee.endpoints).forEach(ep => {
            if (ep.clusters) {
              ep.clusters.forEach(c => {
                profile.clusters.push(c);
                this.allClusters.add(c);
              });
            }
            if (ep.bindings) {
              profile.bindings.push(...ep.bindings);
            }
          });
        }
      }

      // Track all IDs
      profile.manufacturerNames.forEach(id => {
        if (id.match(/_TZ[E0-9]{1,4}_/i)) {
          this.allManufacturerIds.add(id.toLowerCase());
        }
      });
      profile.productIds.forEach(id => this.allProductIds.add(id));
      profile.capabilities.forEach(c => this.allCapabilities.add(c));

      this.driverProfiles.set(driverName, profile);

      return profile;
    } catch (err) {
      console.error(`  Error parsing ${composePath}: ${err.message}`);
      return null;
    }
  }

  // Extract DPs from device.js
  extractFromDeviceJs(driverName, devicePath) {
    try {
      const content = fs.readFileSync(devicePath, 'utf8');

      // Find DP mappings
      const dpPattern = /[dD][pP]\s*[=:]?\s*(\d{1,3})/g;
      const dps = new Set();
      let match;
      while ((match = dpPattern.exec(content)) !== null) {
        dps.add(parseInt(match[1]));
      }

      // Find capability mappings
      const capPattern = /this\.setCapabilityValue\s*\(\s*['"](\w+)['"]/g;
      const caps = new Set();
      while ((match = capPattern.exec(content)) !== null) {
        caps.add(match[1]);
        this.allCapabilities.add(match[1]);
      }

      // Find cluster references
      const clusterPattern = /cluster[s]?\s*\.?\s*(\w+)|0x([0-9a-fA-F]{4})|(\d{4,5})/g;
      const clusters = new Set();
      while ((match = clusterPattern.exec(content)) !== null) {
        const val = match[1] || match[2] || match[3];
        if (val && !isNaN(parseInt(val, 16))) {
          clusters.add(parseInt(val, 16));
        }
      }

      // Store DP to capability mapping if found
      if (dps.size > 0) {
        this.allDatapoints.set(driverName, {
          dps: Array.from(dps),
          capabilities: Array.from(caps),
          clusters: Array.from(clusters)
        });
      }

      return { dps: Array.from(dps), capabilities: Array.from(caps) };
    } catch (err) {
      return { dps: [], capabilities: [] };
    }
  }

  // Extract from driver-mapping-database.json
  extractFromMappingDatabase() {
    const dbPath = './driver-mapping-database.json';
    if (!fs.existsSync(dbPath)) return;

    try {
      const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

      // Extract device definitions
      if (db.devices) {
        Object.entries(db.devices).forEach(([id, device]) => {
          this.allManufacturerIds.add(id.toLowerCase());
          if (device.datapoints) {
            device.datapoints.forEach(dp => {
              const dpNum = typeof dp === 'object' ? dp.dp : dp;
              if (!this.allDatapoints.has(id)) {
                this.allDatapoints.set(id, { dps: [], capabilities: [] });
              }
              this.allDatapoints.get(id).dps.push(dpNum);
            });
          }
        });
      }

      console.log(`  Extracted ${this.allDatapoints.size} device mappings from database`);
    } catch (err) {
      console.error(`  Error parsing mapping database: ${err.message}`);
    }
  }

  // Main extraction
  run() {
    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║     COMPLETE DEVICE DATA EXTRACTION v1.0                  ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log('');

    // Extract from all drivers
    console.log('📁 Processing drivers...');
    if (fs.existsSync(DRIVERS_DIR)) {
      const drivers = fs.readdirSync(DRIVERS_DIR);

      drivers.forEach(driver => {
        const driverPath = path.join(DRIVERS_DIR, driver);
        if (!fs.statSync(driverPath).isDirectory()) return;

        // Extract from compose
        const composePath = path.join(driverPath, 'driver.compose.json');
        if (fs.existsSync(composePath)) {
          this.extractFromDriverCompose(driver, composePath);
        }

        // Extract from device.js
        const devicePath = path.join(driverPath, 'device.js');
        if (fs.existsSync(devicePath)) {
          this.extractFromDeviceJs(driver, devicePath);
        }
      });

      console.log(`   Processed ${drivers.length} drivers`);
    }

    // Extract from mapping database
    console.log('📊 Processing mapping database...');
    this.extractFromMappingDatabase();

    // Generate output
    const output = {
      generated: new Date().toISOString(),
      stats: {
        drivers: this.driverProfiles.size,
        manufacturerIds: this.allManufacturerIds.size,
        productIds: this.allProductIds.size,
        capabilities: this.allCapabilities.size,
        clusters: this.allClusters.size,
        datapointMappings: this.allDatapoints.size
      },
      drivers: Object.fromEntries(this.driverProfiles),
      allManufacturerIds: Array.from(this.allManufacturerIds).sort(),
      allProductIds: Array.from(this.allProductIds).sort(),
      allCapabilities: Array.from(this.allCapabilities).sort(),
      allClusters: Array.from(this.allClusters).sort((a, b) => a - b),
      datapointMappings: Object.fromEntries(this.allDatapoints)
    };

    // Ensure output directory exists
    const outputDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));

    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('EXTRACTION COMPLETE:');
    console.log(`  Drivers:          ${output.stats.drivers}`);
    console.log(`  Manufacturer IDs: ${output.stats.manufacturerIds}`);
    console.log(`  Product IDs:      ${output.stats.productIds}`);
    console.log(`  Capabilities:     ${output.stats.capabilities}`);
    console.log(`  Clusters:         ${output.stats.clusters}`);
    console.log(`  DP Mappings:      ${output.stats.datapointMappings}`);
    console.log(`  Output:           ${OUTPUT_FILE}`);
    console.log('═══════════════════════════════════════════════════════════');

    return output;
  }
}

// Run if called directly
if (require.main === module) {
  const extractor = new DeviceDataExtractor();
  extractor.run();
}

module.exports = DeviceDataExtractor;
