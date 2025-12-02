'use strict';

/**
 * FETCH ALL HOMEY ZIGBEE APPS v1.0
 *
 * Searches and fetches device data from ALL Homey Zigbee apps on GitHub
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = './data/enrichment';

const PATTERNS = {
  manufacturerId: /_TZ[E0-9]{1,4}_[a-z0-9]+/gi
};

// Known Homey Zigbee repos
const REPOS = [
  'JohanBendz/com.tuya.zigbee',
  'JohanBendz/com.philips.hue.zigbee',
  'athombv/com.ikea.tradfri',
  'athombv/com.aqara',
  'TheHomeyAppBackupRepositories/com.tuya.zigbee',
  'TheHomeyAppBackupRepositories/com.aqara',
  'koalyptus/com.elko',
  'kasteleman/com.gledopto',
  'sebbebebbe/com.heiman',
  'eelcohn/com.lidl.zigbee'
];

class HomeyZigbeeAppsFetcher {
  constructor() {
    this.allIds = new Set();
    this.stats = { repos: 0, files: 0 };
  }

  fetch(url) {
    return new Promise((resolve, reject) => {
      https.get(url, {
        headers: {
          'User-Agent': 'Homey-Enrichment/1.0',
          'Accept': 'application/vnd.github.v3+json'
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(data);
          }
        });
      }).on('error', reject);
    });
  }

  fetchRaw(url) {
    return new Promise((resolve, reject) => {
      https.get(url, {
        headers: { 'User-Agent': 'Homey-Enrichment/1.0' }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
      }).on('error', reject);
    });
  }

  async scanRepo(repoPath) {
    const [owner, repo] = repoPath.split('/');
    console.log(`📦 ${repoPath}...`);

    try {
      // Try different branches
      for (const branch of ['master', 'main', 'develop']) {
        try {
          const tree = await this.fetch(
            `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`
          );

          if (!tree.tree) continue;

          this.stats.repos++;

          // Find driver files
          const files = tree.tree.filter(f =>
            f.path.includes('driver.compose.json') ||
            f.path.includes('driver-mapping') ||
            (f.path.includes('device') && f.path.endsWith('.js'))
          );

          for (const file of files) {
            try {
              const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${file.path}`;
              const content = await this.fetchRaw(rawUrl);
              const ids = content.match(PATTERNS.manufacturerId) || [];
              ids.forEach(id => this.allIds.add(id.toLowerCase()));
              this.stats.files++;
            } catch (e) { }
          }

          console.log(`   ✅ Found ${files.length} files`);
          break;
        } catch (e) { }
      }
    } catch (e) {
      console.log(`   ❌ Error`);
    }
  }

  // Search GitHub for more Homey Zigbee repos
  async searchMoreRepos() {
    console.log('\n🔍 Searching for more Homey Zigbee repos...');

    const queries = [
      'homey+zigbee+tuya',
      'homey+zigbee+driver',
      '_TZ3000+homey'
    ];

    for (const q of queries) {
      try {
        const results = await this.fetch(
          `https://api.github.com/search/code?q=${encodeURIComponent(q)}&per_page=30`
        );

        if (results.items) {
          for (const item of results.items) {
            const repoPath = item.repository.full_name;
            if (!REPOS.includes(repoPath)) {
              REPOS.push(repoPath);
            }
          }
        }
      } catch (e) { }
    }

    console.log(`   Found ${REPOS.length} total repos`);
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
      source: 'Homey Zigbee Apps',
      repos: REPOS,
      stats: this.stats,
      totalFound: this.allIds.size,
      missing: missing.length,
      missingIds: missing.sort()
    };

    const outputPath = path.join(OUTPUT_DIR, 'homey-zigbee-apps-ids.json');
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

    console.log(`\n💾 Saved to: ${outputPath}`);
    return output;
  }

  async run() {
    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║     FETCH HOMEY ZIGBEE APPS v1.0                          ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log('');

    // Search for more repos
    await this.searchMoreRepos();

    // Scan all repos
    for (const repo of REPOS) {
      await this.scanRepo(repo);
    }

    const result = this.saveResults();

    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Repos scanned: ${this.stats.repos}`);
    console.log(`Files scanned: ${this.stats.files}`);
    console.log(`Total IDs: ${this.allIds.size}`);
    console.log(`Missing: ${result.missing}`);
    console.log('═══════════════════════════════════════════════════════════');

    return result;
  }
}

if (require.main === module) {
  const fetcher = new HomeyZigbeeAppsFetcher();
  fetcher.run().catch(console.error);
}

module.exports = HomeyZigbeeAppsFetcher;
