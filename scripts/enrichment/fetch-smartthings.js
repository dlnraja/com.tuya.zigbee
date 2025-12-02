'use strict';

/**
 * FETCH SMARTTHINGS DRIVERS v1.0
 *
 * Fetches Tuya device data from SmartThings Edge drivers
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = './data/enrichment';

const PATTERNS = {
  manufacturerId: /_TZ[E0-9]{1,4}_[a-z0-9]+/gi
};

// SmartThings Edge driver repos
const REPOS = [
  'Mariano-Colmenarejo/Edge-Drivers-Beta',
  'veonua/SmartThings-Edge-Driver-Tuya',
  'w35l3y/EdgeDrivers'
];

class SmartThingsFetcher {
  constructor() {
    this.allIds = new Set();
  }

  fetch(url) {
    return new Promise((resolve, reject) => {
      https.get(url, {
        headers: {
          'User-Agent': 'Homey-Enrichment/1.0',
          'Accept': 'application/json'
        }
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

  async fetchRepo(repo) {
    console.log(`\n📦 Fetching ${repo}...`);

    try {
      // Get repo contents
      const apiUrl = `https://api.github.com/repos/${repo}/git/trees/main?recursive=1`;
      const response = await this.fetch(apiUrl);
      const data = JSON.parse(response);

      if (!data.tree) {
        console.log(`   No tree found`);
        return;
      }

      // Find Lua and YAML files
      const files = data.tree.filter(f =>
        f.path.endsWith('.lua') ||
        f.path.endsWith('.yaml') ||
        f.path.endsWith('.yml') ||
        f.path.includes('fingerprint')
      );

      let found = 0;
      for (const file of files.slice(0, 50)) { // Limit for API rate
        try {
          const rawUrl = `https://raw.githubusercontent.com/${repo}/main/${file.path}`;
          const content = await this.fetch(rawUrl);
          const ids = content.match(PATTERNS.manufacturerId) || [];
          ids.forEach(id => this.allIds.add(id.toLowerCase()));
          found += ids.length;
        } catch (e) {
          // Skip
        }
      }

      console.log(`   Found ${found} IDs from ${files.length} files`);
    } catch (err) {
      console.log(`   Error: ${err.message}`);
    }
  }

  saveResults() {
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // Get existing
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
      source: 'SmartThings Edge Drivers',
      repos: REPOS,
      totalFound: this.allIds.size,
      missing: missing.length,
      missingIds: missing.sort()
    };

    const outputPath = path.join(OUTPUT_DIR, 'smartthings-ids.json');
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

    console.log(`\n💾 Saved to: ${outputPath}`);
    return output;
  }

  async run() {
    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║     FETCH SMARTTHINGS DRIVERS v1.0                        ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');

    for (const repo of REPOS) {
      await this.fetchRepo(repo);
    }

    const result = this.saveResults();

    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Total IDs: ${this.allIds.size}`);
    console.log(`Missing: ${result.missing}`);
    console.log('═══════════════════════════════════════════════════════════');

    return result;
  }
}

if (require.main === module) {
  const fetcher = new SmartThingsFetcher();
  fetcher.run().catch(console.error);
}

module.exports = SmartThingsFetcher;
