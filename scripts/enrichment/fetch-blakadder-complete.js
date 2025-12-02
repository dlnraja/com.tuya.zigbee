'use strict';

/**
 * FETCH BLAKADDER COMPLETE DATABASE v1.0
 *
 * Scrapes the complete Blakadder Zigbee database
 * https://zigbee.blakadder.com/all.html
 *
 * 3600+ devices from all manufacturers worldwide
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = './data/enrichment';

const SOURCES = [
  {
    name: 'Blakadder All Devices',
    url: 'https://zigbee.blakadder.com/all.html',
    type: 'html'
  },
  {
    name: 'Blakadder Tuya',
    url: 'https://zigbee.blakadder.com/tuya.html',
    type: 'html'
  },
  {
    name: 'Blakadder Zigbee2MQTT',
    url: 'https://www.zigbee2mqtt.io/supported-devices/',
    type: 'html'
  }
];

// All known Tuya OEM brands to search for
const TUYA_OEM_BRANDS = [
  'Tuya', 'Lidl', 'Moes', 'Aubess', 'Avatar', 'Bseed', 'CR Smart', 'Eardis',
  'Girier', 'Gosund', 'Hama', 'Iolloi', 'Konyks', 'LCTECH', 'Marmitek',
  'Nedis', 'Novadigital', 'Paulmann', 'Samotech', 'Saswell', 'Smart9',
  'Tessan', 'Valneo', 'Woox', 'Zemismart', 'Lonsonho', 'Nous', 'Mercator',
  'Immax', 'Silvercrest', 'Livarno', 'Neo', 'Blitzwolf', 'Ewelink',
  'Nue', 'TUYATEC', 'DIYRuZ', 'UseeLink', 'Heiman', 'Alecto', 'Calex'
];

const PATTERNS = {
  manufacturerId: /_TZ[E0-9]{1,4}_[a-z0-9]+/gi,
  modelId: /TS[0-9]{3,4}[A-Z]?/gi,
  zigbeeModel: /["']([^"']*_TZ[^"']+)["']/gi,
  deviceLink: /href="([^"]+\.html)"/gi,
  vendor: /<td[^>]*>([^<]+)<\/td>/gi
};

class BlakadderFetcher {
  constructor() {
    this.allIds = new Set();
    this.allModels = new Set();
    this.allVendors = new Set();
    this.devices = [];
    this.stats = {
      pagesScanned: 0,
      devicesFound: 0,
      tuyaDevices: 0
    };
  }

  async fetch(url) {
    return new Promise((resolve, reject) => {
      const makeRequest = (requestUrl) => {
        https.get(requestUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml'
          }
        }, (res) => {
          if (res.statusCode === 301 || res.statusCode === 302) {
            return makeRequest(res.headers.location);
          }
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => resolve(data));
        }).on('error', reject);
      };
      makeRequest(url);
    });
  }

  extractIds(content) {
    const manuIds = content.match(PATTERNS.manufacturerId) || [];
    manuIds.forEach(id => this.allIds.add(id.toLowerCase()));

    const modelIds = content.match(PATTERNS.modelId) || [];
    modelIds.forEach(id => this.allModels.add(id.toUpperCase()));

    return manuIds.length;
  }

  parseBlakadderHTML(html) {
    let count = 0;

    // Extract all manufacturer IDs
    count += this.extractIds(html);

    // Extract device entries from table rows
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch;
    while ((rowMatch = rowRegex.exec(html)) !== null) {
      const row = rowMatch[1];

      // Extract vendor from first column
      const vendorMatch = row.match(/<td[^>]*>([^<]+)<\/td>/);
      if (vendorMatch) {
        const vendor = vendorMatch[1].trim();
        if (vendor && vendor.length > 1 && !vendor.includes('<')) {
          this.allVendors.add(vendor);

          // Check if Tuya OEM
          if (TUYA_OEM_BRANDS.some(b => vendor.toLowerCase().includes(b.toLowerCase()))) {
            this.stats.tuyaDevices++;
          }
        }
      }

      // Extract IDs from row
      this.extractIds(row);
    }

    // Also try to extract from JavaScript data
    const jsonMatch = html.match(/var\s+devices\s*=\s*(\[[\s\S]*?\]);/);
    if (jsonMatch) {
      try {
        const devices = JSON.parse(jsonMatch[1]);
        devices.forEach(d => {
          if (d.zigbeeModel) this.extractIds(d.zigbeeModel);
          if (d.vendor) this.allVendors.add(d.vendor);
        });
      } catch (e) { }
    }

    return count;
  }

  async fetchZ2MDeviceList() {
    console.log('📥 Fetching Z2M supported devices list...');

    try {
      // Fetch the device list JSON directly from Z2M
      const data = await this.fetch('https://raw.githubusercontent.com/Koenkk/zigbee2mqtt.io/master/supported-devices.js');

      // Extract manufacturer IDs
      const count = this.extractIds(data);
      console.log(`   ✅ ${count} IDs from Z2M device list`);

      // Extract vendors
      const vendorMatches = data.match(/vendor:\s*['"]([^'"]+)['"]/g) || [];
      vendorMatches.forEach(v => {
        const match = v.match(/['"]([^'"]+)['"]/);
        if (match) this.allVendors.add(match[1]);
      });

      return count;
    } catch (e) {
      console.log(`   ❌ Failed: ${e.message}`);
      return 0;
    }
  }

  async fetchTuyaDevicePages() {
    console.log('📥 Fetching individual Tuya device pages...');

    // Common Tuya model prefixes to search
    const tuyaModels = [
      'TS0001', 'TS0002', 'TS0003', 'TS0004', 'TS0011', 'TS0012',
      'TS0041', 'TS0042', 'TS0043', 'TS0044', 'TS0046',
      'TS011F', 'TS0121', 'TS0501', 'TS0502', 'TS0503', 'TS0504', 'TS0505',
      'TS0601', 'TS0201', 'TS0202', 'TS0203', 'TS0204', 'TS0205',
      'TS0207', 'TS0210', 'TS0216', 'TS110E', 'TS110F'
    ];

    let totalCount = 0;

    for (const model of tuyaModels) {
      try {
        const url = `https://zigbee.blakadder.com/${model}.html`;
        const html = await this.fetch(url);
        const count = this.extractIds(html);
        if (count > 0) {
          console.log(`   📄 ${model}: ${count} IDs`);
          totalCount += count;
          this.stats.pagesScanned++;
        }
      } catch (e) {
        // Page doesn't exist, skip
      }
    }

    return totalCount;
  }

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

  generateReport() {
    const existing = this.getExistingIds();
    const missing = Array.from(this.allIds).filter(id => !existing.has(id));

    return {
      timestamp: new Date().toISOString(),
      source: 'Blakadder Complete + Z2M',
      stats: this.stats,
      tuyaOemBrands: TUYA_OEM_BRANDS,
      totals: {
        manufacturerIds: this.allIds.size,
        modelIds: this.allModels.size,
        vendors: this.allVendors.size
      },
      comparison: {
        existingInDrivers: existing.size,
        foundInSources: this.allIds.size,
        missing: missing.length,
        coverage: ((existing.size / (existing.size + missing.length)) * 100).toFixed(1) + '%'
      },
      data: {
        allManufacturerIds: Array.from(this.allIds).sort(),
        allModelIds: Array.from(this.allModels).sort(),
        allVendors: Array.from(this.allVendors).sort(),
        missingIds: missing.sort()
      }
    };
  }

  async run() {
    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════════════╗');
    console.log('║     FETCH BLAKADDER COMPLETE DATABASE v1.0                        ║');
    console.log('║     3600+ Zigbee devices from all manufacturers                   ║');
    console.log('╚═══════════════════════════════════════════════════════════════════╝');
    console.log('');

    // 1. Fetch main Blakadder pages
    for (const source of SOURCES) {
      console.log(`📥 Fetching: ${source.name}...`);
      try {
        const data = await this.fetch(source.url);
        const count = this.parseBlakadderHTML(data);
        this.stats.pagesScanned++;
        console.log(`   ✅ ${count} IDs extracted`);
      } catch (e) {
        console.log(`   ❌ Failed: ${e.message}`);
      }
    }

    // 2. Fetch Z2M device list
    await this.fetchZ2MDeviceList();

    // 3. Fetch individual Tuya model pages
    await this.fetchTuyaDevicePages();

    // Generate report
    const report = this.generateReport();

    // Save report
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'blakadder-complete-report.json'),
      JSON.stringify(report, null, 2)
    );

    // Summary
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('SUMMARY:');
    console.log(`  Pages scanned: ${this.stats.pagesScanned}`);
    console.log(`  Tuya devices: ${this.stats.tuyaDevices}`);
    console.log(`  ─────────────────────`);
    console.log(`  Manufacturer IDs: ${this.allIds.size}`);
    console.log(`  Model IDs: ${this.allModels.size}`);
    console.log(`  Vendors: ${this.allVendors.size}`);
    console.log(`  ─────────────────────`);
    console.log(`  Existing in drivers: ${report.comparison.existingInDrivers}`);
    console.log(`  Missing: ${report.comparison.missing}`);
    console.log(`  Coverage: ${report.comparison.coverage}`);
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('');
    console.log(`💾 Report: ${OUTPUT_DIR}/blakadder-complete-report.json`);

    return report;
  }
}

if (require.main === module) {
  const fetcher = new BlakadderFetcher();
  fetcher.run().catch(console.error);
}

module.exports = BlakadderFetcher;
