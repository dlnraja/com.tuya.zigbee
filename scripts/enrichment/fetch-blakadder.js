'use strict';

/**
 * FETCH BLAKADDER DATABASE v1.0
 *
 * Fetches Tuya device data from Blakadder's Zigbee database
 * https://zigbee.blakadder.com
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = './data/enrichment';

const PATTERNS = {
  manufacturerId: /_TZ[E0-9]{1,4}_[a-z0-9]+/gi,
  modelId: /TS[0-9]{3,4}[A-Z]?/gi
};

class BlakadderFetcher {
  constructor() {
    this.allIds = new Set();
    this.devices = [];
  }

  // Fetch URL content
  fetch(url) {
    return new Promise((resolve, reject) => {
      https.get(url, {
        headers: { 'User-Agent': 'Homey-Enrichment/1.0' }
      }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          return this.fetch(res.headers.location).then(resolve).catch(reject);
        }
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
      }).on('error', reject);
    });
  }

  // Parse Blakadder device listing page
  async fetchDeviceList() {
    console.log('📥 Fetching Blakadder device index...');

    try {
      // Fetch the devices listing from Blakadder
      const urls = [
        'https://raw.githubusercontent.com/blakadder/zigbee/master/_data/devices.yml',
        'https://zigbee.blakadder.com/all.html'
      ];

      for (const url of urls) {
        try {
          const content = await this.fetch(url);
          const ids = content.match(PATTERNS.manufacturerId) || [];
          ids.forEach(id => this.allIds.add(id.toLowerCase()));
          console.log(`   Found ${ids.length} IDs from ${url.split('/').pop()}`);
        } catch (e) {
          console.log(`   Skipped ${url.split('/').pop()}`);
        }
      }

      // Also try zigbee.blakadder.com Tuya pages directly
      const tuyaPages = [
        'https://zigbee.blakadder.com/tuya.html',
        'https://zigbee.blakadder.com/moes.html',
        'https://zigbee.blakadder.com/zemismart.html'
      ];

      for (const page of tuyaPages) {
        try {
          const content = await this.fetch(page);
          const ids = content.match(PATTERNS.manufacturerId) || [];
          ids.forEach(id => this.allIds.add(id.toLowerCase()));
          console.log(`   Found ${ids.length} IDs from ${page.split('/').pop()}`);
        } catch (e) {
          // Skip
        }
      }

    } catch (err) {
      console.log(`   Error: ${err.message}`);
    }
  }

  // Save results
  saveResults() {
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // Get existing IDs from drivers
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

    const missing = Array.from(this.allIds).filter(id => !existing.has(id));

    const output = {
      timestamp: new Date().toISOString(),
      source: 'Blakadder Zigbee Database',
      totalFound: this.allIds.size,
      existingInDrivers: existing.size,
      missing: missing.length,
      missingIds: missing.sort()
    };

    const outputPath = path.join(OUTPUT_DIR, 'blakadder-ids.json');
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

    console.log(`\n💾 Saved to: ${outputPath}`);
    return output;
  }

  async run() {
    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║     FETCH BLAKADDER DATABASE v1.0                         ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log('');

    await this.fetchDeviceList();
    const result = this.saveResults();

    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Total IDs found: ${this.allIds.size}`);
    console.log(`Missing from drivers: ${result.missing}`);
    console.log('═══════════════════════════════════════════════════════════');

    return result;
  }
}

if (require.main === module) {
  const fetcher = new BlakadderFetcher();
  fetcher.run().catch(console.error);
}

module.exports = BlakadderFetcher;
