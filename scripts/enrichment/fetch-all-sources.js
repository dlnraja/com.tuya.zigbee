'use strict';

/**
 * FETCH ALL SOURCES v1.0
 *
 * Fetches device data from ALL community sources:
 * - Blakadder Zigbee Database
 * - ZHA Device Handlers (zigpy quirks)
 * - deCONZ REST Plugin
 * - SmartThings Edge Drivers
 * - Jeedom Zigbee Plugin
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = './data/enrichment';

const SOURCES = {
  blakadder: {
    name: 'Blakadder Zigbee',
    devices: 'https://raw.githubusercontent.com/blakadder/zigbee/master/_devices/',
    index: 'https://api.github.com/repos/blakadder/zigbee/contents/_devices'
  },
  zha: {
    name: 'ZHA Device Handlers',
    tuya_init: 'https://raw.githubusercontent.com/zigpy/zha-device-handlers/dev/zhaquirks/tuya/__init__.py',
    tuya_index: 'https://api.github.com/repos/zigpy/zha-device-handlers/contents/zhaquirks/tuya'
  },
  deconz: {
    name: 'deCONZ REST Plugin',
    devices: 'https://api.github.com/repos/dresden-elektronik/deconz-rest-plugin/contents/devices/tuya'
  },
  smartthings: {
    name: 'SmartThings Edge',
    mariano: 'https://api.github.com/repos/Mariano-Colmenarejo/Edge-Drivers-Beta/contents'
  },
  jeedom: {
    name: 'Jeedom Zigbee',
    devices: 'https://api.github.com/repos/jeedom/plugin-zigbee/contents/resources/devices'
  }
};

const PATTERNS = {
  manufacturerId: /_TZ[E0-9]{1,4}_[a-z0-9]+/gi,
  modelId: /TS[0-9]{3,4}[A-Z]?/gi
};

class AllSourcesFetcher {
  constructor() {
    this.allIds = new Set();
    this.sourceStats = {};
  }

  // HTTP GET with User-Agent
  fetch(url) {
    return new Promise((resolve, reject) => {
      const options = {
        headers: {
          'User-Agent': 'Homey-Tuya-Enrichment/1.0',
          'Accept': 'application/json, text/plain, */*'
        }
      };

      https.get(url, options, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          return this.fetch(res.headers.location).then(resolve).catch(reject);
        }

        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
      }).on('error', reject);
    });
  }

  // Extract IDs from text
  extractIds(text) {
    const ids = new Set();
    const matches = text.match(PATTERNS.manufacturerId) || [];
    matches.forEach(id => ids.add(id.toLowerCase()));
    return ids;
  }

  // Fetch Blakadder
  async fetchBlakadder() {
    console.log('\n🔷 Fetching Blakadder...');
    const ids = new Set();

    try {
      // Get device file list
      const indexData = await this.fetch(SOURCES.blakadder.index);
      const files = JSON.parse(indexData);

      let processed = 0;
      for (const file of files.slice(0, 100)) { // Limit for speed
        if (file.name.endsWith('.md')) {
          try {
            const content = await this.fetch(file.download_url);
            const fileIds = this.extractIds(content);
            fileIds.forEach(id => ids.add(id));
            processed++;

            if (processed % 20 === 0) {
              console.log(`   Processed ${processed} files...`);
            }
          } catch (e) {
            // Skip file errors
          }
        }
      }

      console.log(`   Found ${ids.size} IDs from ${processed} files`);
    } catch (err) {
      console.log(`   Error: ${err.message}`);
    }

    this.sourceStats.blakadder = ids.size;
    ids.forEach(id => this.allIds.add(id));
    return ids;
  }

  // Fetch ZHA
  async fetchZHA() {
    console.log('\n🔶 Fetching ZHA Device Handlers...');
    const ids = new Set();

    try {
      // Get tuya files list
      const indexData = await this.fetch(SOURCES.zha.tuya_index);
      const files = JSON.parse(indexData);

      let processed = 0;
      for (const file of files) {
        if (file.name.endsWith('.py')) {
          try {
            const content = await this.fetch(file.download_url);
            const fileIds = this.extractIds(content);
            fileIds.forEach(id => ids.add(id));
            processed++;
          } catch (e) {
            // Skip
          }
        }
      }

      console.log(`   Found ${ids.size} IDs from ${processed} files`);
    } catch (err) {
      console.log(`   Error: ${err.message}`);
    }

    this.sourceStats.zha = ids.size;
    ids.forEach(id => this.allIds.add(id));
    return ids;
  }

  // Fetch deCONZ
  async fetchDeconz() {
    console.log('\n🔷 Fetching deCONZ...');
    const ids = new Set();

    try {
      const indexData = await this.fetch(SOURCES.deconz.devices);
      const files = JSON.parse(indexData);

      let processed = 0;
      for (const file of files) {
        if (file.name.endsWith('.json')) {
          try {
            const content = await this.fetch(file.download_url);
            const fileIds = this.extractIds(content);
            fileIds.forEach(id => ids.add(id));
            processed++;
          } catch (e) {
            // Skip
          }
        }
      }

      console.log(`   Found ${ids.size} IDs from ${processed} files`);
    } catch (err) {
      console.log(`   Error: ${err.message}`);
    }

    this.sourceStats.deconz = ids.size;
    ids.forEach(id => this.allIds.add(id));
    return ids;
  }

  // Fetch Jeedom
  async fetchJeedom() {
    console.log('\n🔶 Fetching Jeedom...');
    const ids = new Set();

    try {
      const indexData = await this.fetch(SOURCES.jeedom.devices);
      const files = JSON.parse(indexData);

      let processed = 0;
      for (const file of files) {
        if (file.type === 'file' && (file.name.endsWith('.json') || file.name.includes('tuya'))) {
          try {
            const content = await this.fetch(file.download_url);
            const fileIds = this.extractIds(content);
            fileIds.forEach(id => ids.add(id));
            processed++;
          } catch (e) {
            // Skip
          }
        }
      }

      console.log(`   Found ${ids.size} IDs from ${processed} files`);
    } catch (err) {
      console.log(`   Error: ${err.message}`);
    }

    this.sourceStats.jeedom = ids.size;
    ids.forEach(id => this.allIds.add(id));
    return ids;
  }

  // Get existing IDs
  getExistingIds() {
    const existing = new Set();
    const driversDir = './drivers';

    if (fs.existsSync(driversDir)) {
      const dirs = fs.readdirSync(driversDir);
      dirs.forEach(dir => {
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

  // Save results
  saveResults() {
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const existing = this.getExistingIds();
    const missing = Array.from(this.allIds).filter(id => !existing.has(id));

    const output = {
      timestamp: new Date().toISOString(),
      sources: this.sourceStats,
      totalDiscovered: this.allIds.size,
      existingInDrivers: existing.size,
      missing: missing.length,
      allIds: Array.from(this.allIds).sort(),
      missingIds: missing.sort()
    };

    const outputPath = path.join(OUTPUT_DIR, 'all-sources-ids.json');
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

    console.log(`\n💾 Saved to: ${outputPath}`);
    return output;
  }

  // Main run
  async run() {
    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║     FETCH ALL SOURCES v1.0                                ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');

    await this.fetchBlakadder();
    await this.fetchZHA();
    await this.fetchDeconz();
    await this.fetchJeedom();

    const result = this.saveResults();

    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('FETCH COMPLETE:');
    console.log(`  Blakadder: ${this.sourceStats.blakadder || 0}`);
    console.log(`  ZHA:       ${this.sourceStats.zha || 0}`);
    console.log(`  deCONZ:    ${this.sourceStats.deconz || 0}`);
    console.log(`  Jeedom:    ${this.sourceStats.jeedom || 0}`);
    console.log(`  ─────────────────────`);
    console.log(`  Total:     ${this.allIds.size}`);
    console.log(`  Missing:   ${result.missing}`);
    console.log('═══════════════════════════════════════════════════════════');

    return result;
  }
}

if (require.main === module) {
  const fetcher = new AllSourcesFetcher();
  fetcher.run().catch(console.error);
}

module.exports = AllSourcesFetcher;
