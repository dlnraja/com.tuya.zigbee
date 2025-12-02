'use strict';

/**
 * MEGA FETCH ALL SOURCES v1.0
 *
 * Comprehensive multi-source Zigbee device fetcher
 *
 * Sources:
 * 1. Zigbee-OTA index (OTA firmware database)
 * 2. Zigbee2MQTT converters (3000+ devices)
 * 3. Zigbee2MQTT modernExtend (capability patterns)
 * 4. ZHA quirks (device handlers)
 * 5. Blakadder database
 * 6. deCONZ DDF
 * 7. Tuya DP reference
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = './data/enrichment';

// All sources to fetch
const SOURCES = {
  zigbeeOTA: {
    name: 'Zigbee-OTA Index',
    url: 'https://raw.githubusercontent.com/Koenkk/zigbee-OTA/master/index.json',
    type: 'json'
  },
  zigbeeOTADowngrade: {
    name: 'Zigbee-OTA Downgrade',
    url: 'https://raw.githubusercontent.com/Koenkk/zigbee-OTA/master/index1.json',
    type: 'json'
  },
  z2mTuya: {
    name: 'Z2M Tuya Converters',
    url: 'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/tuya.ts',
    type: 'typescript'
  },
  z2mIndex: {
    name: 'Z2M Device Index',
    url: 'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/index.ts',
    type: 'typescript'
  },
  modernExtend: {
    name: 'Z2M ModernExtend',
    url: 'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/lib/modernExtend.ts',
    type: 'typescript'
  },
  tuyaExtend: {
    name: 'Z2M Tuya Extend',
    url: 'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/lib/tuya.ts',
    type: 'typescript'
  },
  zhaQuirks: {
    name: 'ZHA Tuya Quirks',
    url: 'https://raw.githubusercontent.com/zigpy/zha-device-handlers/dev/zhaquirks/tuya/__init__.py',
    type: 'python'
  },
  blakadder: {
    name: 'Blakadder Index',
    url: 'https://zigbee.blakadder.com/assets/js/devicelist.js',
    type: 'javascript'
  }
};

// Patterns for extraction
const PATTERNS = {
  manufacturerId: /_TZ[E0-9]{1,4}_[a-z0-9]+/gi,
  modelId: /TS[0-9]{3,4}[A-Z]?/gi,
  zigbeeModel: /zigbeeModel:\s*\[([^\]]+)\]/g,
  fingerprint: /fingerprint:\s*\[([^\]]+)\]/g,
  vendor: /vendor:\s*['"]([^'"]+)['"]/g,
  model: /model:\s*['"]([^'"]+)['"]/g,
  exposes: /exposes:\s*\[([^\]]+)\]/g,
  dpMapping: /\[(\d+),\s*['"](\w+)['"]/g,
  cluster: /0x[0-9A-Fa-f]{4}/g,
  otaModel: /"modelId":\s*"([^"]+)"/g
};

class MegaSourceFetcher {
  constructor() {
    this.results = {
      manufacturers: new Set(),
      models: new Set(),
      vendors: new Set(),
      clusters: new Set(),
      datapoints: new Map(),
      devices: [],
      otaFirmwares: []
    };
    this.stats = {};
  }

  // HTTP fetch with retry
  async fetch(url, retries = 3) {
    return new Promise((resolve, reject) => {
      const request = (url) => {
        https.get(url, {
          headers: { 'User-Agent': 'Homey-MegaFetcher/1.0' }
        }, (res) => {
          if (res.statusCode === 301 || res.statusCode === 302) {
            return request(res.headers.location);
          }
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => resolve(data));
        }).on('error', (err) => {
          if (retries > 0) {
            setTimeout(() => {
              this.fetch(url, retries - 1).then(resolve).catch(reject);
            }, 1000);
          } else {
            reject(err);
          }
        });
      };
      request(url);
    });
  }

  // Parse Zigbee-OTA index
  parseOTAIndex(data) {
    try {
      const index = JSON.parse(data);
      index.forEach(item => {
        if (item.modelId) {
          this.results.otaFirmwares.push({
            modelId: item.modelId,
            manufacturerCode: item.manufacturerCode,
            imageType: item.imageType,
            fileVersion: item.fileVersion,
            url: item.url
          });

          // Extract manufacturer IDs from modelId
          const manuIds = item.modelId.match(PATTERNS.manufacturerId) || [];
          manuIds.forEach(id => this.results.manufacturers.add(id.toLowerCase()));

          const modelIds = item.modelId.match(PATTERNS.modelId) || [];
          modelIds.forEach(id => this.results.models.add(id.toUpperCase()));
        }
      });
      return index.length;
    } catch (e) {
      return 0;
    }
  }

  // Parse Z2M TypeScript converters
  parseZ2MConverters(data) {
    let count = 0;

    // Extract manufacturer IDs
    const manuIds = data.match(PATTERNS.manufacturerId) || [];
    manuIds.forEach(id => this.results.manufacturers.add(id.toLowerCase()));
    count += manuIds.length;

    // Extract model IDs
    const modelIds = data.match(PATTERNS.modelId) || [];
    modelIds.forEach(id => this.results.models.add(id.toUpperCase()));

    // Extract vendors
    const vendors = data.match(PATTERNS.vendor) || [];
    vendors.forEach(v => {
      const match = v.match(/['"]([^'"]+)['"]/);
      if (match) this.results.vendors.add(match[1]);
    });

    // Extract clusters
    const clusters = data.match(PATTERNS.cluster) || [];
    clusters.forEach(c => this.results.clusters.add(c));

    // Extract DP mappings
    let dpMatch;
    const dpRegex = /\[(\d+),\s*['"](\w+)['"]/g;
    while ((dpMatch = dpRegex.exec(data)) !== null) {
      const dp = dpMatch[1];
      const name = dpMatch[2];
      if (!this.results.datapoints.has(dp)) {
        this.results.datapoints.set(dp, []);
      }
      if (!this.results.datapoints.get(dp).includes(name)) {
        this.results.datapoints.get(dp).push(name);
      }
    }

    // Extract device definitions
    const deviceRegex = /{\s*zigbeeModel:\s*\[([^\]]+)\][^}]*vendor:\s*['"]([^'"]+)['"][^}]*model:\s*['"]([^'"]+)['"]/g;
    let deviceMatch;
    while ((deviceMatch = deviceRegex.exec(data)) !== null) {
      this.results.devices.push({
        zigbeeModels: deviceMatch[1].replace(/['"]/g, '').split(',').map(s => s.trim()),
        vendor: deviceMatch[2],
        model: deviceMatch[3]
      });
    }

    return count;
  }

  // Parse ZHA Python quirks
  parseZHAQuirks(data) {
    const manuIds = data.match(PATTERNS.manufacturerId) || [];
    manuIds.forEach(id => this.results.manufacturers.add(id.toLowerCase()));

    const modelIds = data.match(PATTERNS.modelId) || [];
    modelIds.forEach(id => this.results.models.add(id.toUpperCase()));

    // Extract cluster IDs
    const clusters = data.match(/0x[0-9A-Fa-f]{4}/g) || [];
    clusters.forEach(c => this.results.clusters.add(c));

    return manuIds.length;
  }

  // Get existing IDs from drivers
  getExistingIds() {
    const existing = new Set();
    const driversDir = './drivers';

    if (fs.existsSync(driversDir)) {
      fs.readdirSync(driversDir).forEach(dir => {
        const composePath = path.join(driversDir, dir, 'driver.compose.json');
        if (fs.existsSync(composePath)) {
          const content = fs.readFileSync(composePath, 'utf8');
          const matches = content.match(PATTERNS.manufacturerId) || [];
          matches.forEach(id => existing.add(id.toLowerCase()));
        }
      });
    }

    return existing;
  }

  // Generate CSV report
  generateCSV() {
    const existing = this.getExistingIds();
    const allIds = Array.from(this.results.manufacturers);
    const missing = allIds.filter(id => !existing.has(id));

    let csv = 'Manufacturer ID,Status,Source\n';

    allIds.sort().forEach(id => {
      const status = existing.has(id) ? 'EXISTS' : 'MISSING';
      csv += `${id},${status},Multi-Source\n`;
    });

    return csv;
  }

  // Generate comprehensive report
  generateReport() {
    const existing = this.getExistingIds();
    const missing = Array.from(this.results.manufacturers).filter(id => !existing.has(id));

    return {
      timestamp: new Date().toISOString(),
      sources: Object.keys(SOURCES).map(k => SOURCES[k].name),
      stats: this.stats,
      totals: {
        manufacturerIds: this.results.manufacturers.size,
        modelIds: this.results.models.size,
        vendors: this.results.vendors.size,
        clusters: this.results.clusters.size,
        datapoints: this.results.datapoints.size,
        otaFirmwares: this.results.otaFirmwares.length,
        devices: this.results.devices.length
      },
      comparison: {
        existingInDrivers: existing.size,
        foundInSources: this.results.manufacturers.size,
        missing: missing.length,
        coverage: ((existing.size / this.results.manufacturers.size) * 100).toFixed(1) + '%'
      },
      data: {
        allManufacturerIds: Array.from(this.results.manufacturers).sort(),
        allModelIds: Array.from(this.results.models).sort(),
        allVendors: Array.from(this.results.vendors).sort(),
        allClusters: Array.from(this.results.clusters).sort(),
        datapoints: Object.fromEntries(this.results.datapoints),
        missingIds: missing.sort()
      }
    };
  }

  // Main run
  async run() {
    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════════════╗');
    console.log('║     MEGA FETCH ALL SOURCES v1.0                                   ║');
    console.log('║     Comprehensive Multi-Source Zigbee Device Fetcher              ║');
    console.log('╚═══════════════════════════════════════════════════════════════════╝');
    console.log('');

    // Fetch from each source
    for (const [key, source] of Object.entries(SOURCES)) {
      console.log(`📥 Fetching: ${source.name}...`);
      try {
        const data = await this.fetch(source.url);

        let count = 0;
        if (source.type === 'json') {
          count = this.parseOTAIndex(data);
        } else if (source.type === 'typescript' || source.type === 'javascript') {
          count = this.parseZ2MConverters(data);
        } else if (source.type === 'python') {
          count = this.parseZHAQuirks(data);
        }

        this.stats[key] = { success: true, items: count };
        console.log(`   ✅ ${count} items extracted`);
      } catch (err) {
        this.stats[key] = { success: false, error: err.message };
        console.log(`   ❌ Failed: ${err.message}`);
      }
    }

    // Generate reports
    const report = this.generateReport();
    const csv = this.generateCSV();

    // Save reports
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'mega-source-report.json'),
      JSON.stringify(report, null, 2)
    );

    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'mega-source-ids.csv'),
      csv
    );

    // Summary
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('SUMMARY:');
    console.log(`  Sources fetched: ${Object.keys(SOURCES).length}`);
    console.log(`  ─────────────────────`);
    console.log(`  Manufacturer IDs: ${this.results.manufacturers.size}`);
    console.log(`  Model IDs: ${this.results.models.size}`);
    console.log(`  Vendors: ${this.results.vendors.size}`);
    console.log(`  Clusters: ${this.results.clusters.size}`);
    console.log(`  Datapoints: ${this.results.datapoints.size}`);
    console.log(`  OTA Firmwares: ${this.results.otaFirmwares.length}`);
    console.log(`  ─────────────────────`);
    console.log(`  Existing in drivers: ${report.comparison.existingInDrivers}`);
    console.log(`  Missing: ${report.comparison.missing}`);
    console.log(`  Coverage: ${report.comparison.coverage}`);
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('');
    console.log(`💾 Report: ${OUTPUT_DIR}/mega-source-report.json`);
    console.log(`📊 CSV: ${OUTPUT_DIR}/mega-source-ids.csv`);

    return report;
  }
}

if (require.main === module) {
  const fetcher = new MegaSourceFetcher();
  fetcher.run().catch(console.error);
}

module.exports = MegaSourceFetcher;
