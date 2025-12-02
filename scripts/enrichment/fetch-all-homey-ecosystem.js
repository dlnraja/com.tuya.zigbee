'use strict';

/**
 * FETCH ALL HOMEY ECOSYSTEM v1.0
 *
 * Comprehensive scan of ALL Homey Zigbee repositories:
 * - JohanBendz (Tuya, Philips Hue, etc.)
 * - Athom BV (Official apps)
 * - Community apps
 * - All forks and sub-forks
 * - All issues (open + closed)
 * - All PRs (open + closed + merged)
 * - All branches
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = './data/enrichment';

const PATTERNS = {
  manufacturerId: /_TZ[E0-9]{1,4}_[a-z0-9]+/gi,
  modelId: /TS[0-9]{3,4}[A-Z]?/gi
};

// ALL Homey Zigbee repositories to scan
const REPOSITORIES = [
  // JohanBendz repos
  { owner: 'JohanBendz', repo: 'com.tuya.zigbee' },
  { owner: 'JohanBendz', repo: 'com.philips.hue.zigbee' },

  // Athom BV (Official)
  { owner: 'athombv', repo: 'com.ikea.tradfri' },
  { owner: 'athombv', repo: 'com.xiaomi-mi' },
  { owner: 'athombv', repo: 'com.aqara' },
  { owner: 'athombv', repo: 'com.osram' },
  { owner: 'athombv', repo: 'com.innr' },
  { owner: 'athombv', repo: 'com.sengled' },
  { owner: 'athombv', repo: 'com.paulmann' },
  { owner: 'athombv', repo: 'com.ubisys' },
  { owner: 'athombv', repo: 'com.siterwell' },

  // Community Zigbee apps
  { owner: 'TheHomeyAppBackupRepositories', repo: 'com.tuya.zigbee' },
  { owner: 'koalyptus', repo: 'com.elko' },
  { owner: 'kasteleman', repo: 'com.gledopto' },
  { owner: 'sebbebebbe', repo: 'com.heiman' },
  { owner: 'eelcohn', repo: 'com.lidl.zigbee' },
  { owner: 'nlrb', repo: 'com.thing.zigbee' },
  { owner: 'jghaanern', repo: 'com.namron.zigbee' },
  { owner: 'martijnpoppen', repo: 'com.tuya' },
  { owner: 'TedTolboom', repo: 'com.hue.zigbee' },
  { owner: 'Shakesbeard', repo: 'com.ikea.tradfri' },

  // Zigbee converters and handlers
  { owner: 'Koenkk', repo: 'zigbee-herdsman-converters' },
  { owner: 'zigpy', repo: 'zha-device-handlers' },
  { owner: 'dresden-elektronik', repo: 'deconz-rest-plugin' }
];

class HomeyEcosystemFetcher {
  constructor() {
    this.allIds = new Set();
    this.allModelIds = new Set();
    this.stats = {
      repos: 0,
      forks: 0,
      issues: 0,
      prs: 0,
      branches: 0,
      files: 0
    };
    this.processedRepos = new Set();
  }

  // HTTP GET with rate limiting
  async fetch(url, retries = 3) {
    return new Promise((resolve, reject) => {
      const options = {
        headers: {
          'User-Agent': 'Homey-Enrichment/2.0',
          'Accept': 'application/vnd.github.v3+json'
        }
      };

      https.get(url, options, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          return this.fetch(res.headers.location).then(resolve).catch(reject);
        }
        if (res.statusCode === 403 && retries > 0) {
          // Rate limited, wait and retry
          setTimeout(() => {
            this.fetch(url, retries - 1).then(resolve).catch(reject);
          }, 2000);
          return;
        }
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

  // Fetch raw content
  async fetchRaw(url) {
    return new Promise((resolve, reject) => {
      https.get(url, {
        headers: { 'User-Agent': 'Homey-Enrichment/2.0' }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
      }).on('error', reject);
    });
  }

  // Extract IDs from content
  extractIds(content) {
    const manuIds = content.match(PATTERNS.manufacturerId) || [];
    const modelIds = content.match(PATTERNS.modelId) || [];
    manuIds.forEach(id => this.allIds.add(id.toLowerCase()));
    modelIds.forEach(id => this.allModelIds.add(id.toUpperCase()));
    return manuIds.length;
  }

  // Fetch all branches
  async fetchBranches(owner, repo) {
    try {
      const branches = await this.fetch(
        `https://api.github.com/repos/${owner}/${repo}/branches?per_page=100`
      );
      if (Array.isArray(branches)) {
        this.stats.branches += branches.length;
        return branches.map(b => b.name);
      }
    } catch (e) { }
    return ['master', 'main'];
  }

  // Fetch all issues
  async fetchIssues(owner, repo) {
    let allIssues = [];

    for (const state of ['open', 'closed']) {
      let page = 1;
      while (page <= 10) {
        try {
          const issues = await this.fetch(
            `https://api.github.com/repos/${owner}/${repo}/issues?state=${state}&per_page=100&page=${page}`
          );
          if (!Array.isArray(issues) || issues.length === 0) break;
          allIssues = allIssues.concat(issues);
          page++;
        } catch (e) {
          break;
        }
      }
    }

    this.stats.issues += allIssues.length;

    // Extract IDs from issues
    let found = 0;
    for (const issue of allIssues) {
      if (issue.body) {
        found += this.extractIds(issue.body);
      }
      if (issue.title) {
        found += this.extractIds(issue.title);
      }
    }

    return { count: allIssues.length, found };
  }

  // Fetch all PRs
  async fetchPRs(owner, repo) {
    let allPRs = [];

    for (const state of ['open', 'closed']) {
      let page = 1;
      while (page <= 5) {
        try {
          const prs = await this.fetch(
            `https://api.github.com/repos/${owner}/${repo}/pulls?state=${state}&per_page=100&page=${page}`
          );
          if (!Array.isArray(prs) || prs.length === 0) break;
          allPRs = allPRs.concat(prs);
          page++;
        } catch (e) {
          break;
        }
      }
    }

    this.stats.prs += allPRs.length;

    // Extract IDs from PRs
    let found = 0;
    for (const pr of allPRs) {
      if (pr.body) {
        found += this.extractIds(pr.body);
      }
    }

    return { count: allPRs.length, found };
  }

  // Scan repo files for IDs
  async scanRepoFiles(owner, repo, branch = 'master') {
    try {
      const tree = await this.fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`
      );

      if (!tree.tree) return 0;

      // Find relevant files
      const files = tree.tree.filter(f =>
        f.path.includes('driver.compose.json') ||
        f.path.includes('device.js') ||
        f.path.includes('driver.js') ||
        f.path.includes('tuya') ||
        f.path.includes('quirks') ||
        f.path.endsWith('.ts') ||
        f.path.endsWith('.py')
      ).slice(0, 50); // Limit

      let found = 0;
      for (const file of files) {
        try {
          const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${file.path}`;
          const content = await this.fetchRaw(rawUrl);
          found += this.extractIds(content);
          this.stats.files++;
        } catch (e) { }
      }

      return found;
    } catch (e) {
      return 0;
    }
  }

  // Fetch forks recursively
  async fetchForks(owner, repo, depth = 0) {
    if (depth > 1) return; // Max 2 levels

    const repoKey = `${owner}/${repo}`;
    if (this.processedRepos.has(repoKey)) return;
    this.processedRepos.add(repoKey);

    try {
      let page = 1;
      while (page <= 3) {
        const forks = await this.fetch(
          `https://api.github.com/repos/${owner}/${repo}/forks?per_page=100&page=${page}`
        );
        if (!Array.isArray(forks) || forks.length === 0) break;

        this.stats.forks += forks.length;

        // Scan each fork
        for (const fork of forks.slice(0, 20)) {
          console.log(`      🍴 Fork: ${fork.full_name}`);
          await this.scanRepoFiles(fork.owner.login, fork.name);

          // Recursive sub-forks
          if (depth < 1) {
            await this.fetchForks(fork.owner.login, fork.name, depth + 1);
          }
        }

        page++;
      }
    } catch (e) { }
  }

  // Process single repository
  async processRepo(owner, repo) {
    const repoKey = `${owner}/${repo}`;
    if (this.processedRepos.has(repoKey)) return;
    this.processedRepos.add(repoKey);

    console.log(`\n📦 ${owner}/${repo}`);
    this.stats.repos++;

    // Fetch branches
    const branches = await this.fetchBranches(owner, repo);
    console.log(`   📂 Branches: ${branches.length}`);

    // Scan main branch files
    const mainBranch = branches.includes('master') ? 'master' :
      branches.includes('main') ? 'main' : branches[0];
    const filesFound = await this.scanRepoFiles(owner, repo, mainBranch);
    console.log(`   📄 Files: ${this.stats.files} (${filesFound} IDs)`);

    // Fetch issues
    const issuesResult = await this.fetchIssues(owner, repo);
    console.log(`   📋 Issues: ${issuesResult.count} (${issuesResult.found} IDs)`);

    // Fetch PRs
    const prsResult = await this.fetchPRs(owner, repo);
    console.log(`   🔀 PRs: ${prsResult.count} (${prsResult.found} IDs)`);

    // Fetch forks
    console.log(`   🍴 Scanning forks...`);
    await this.fetchForks(owner, repo);
  }

  // Get existing IDs
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

  // Save results
  saveResults() {
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const existing = this.getExistingIds();
    const missing = Array.from(this.allIds).filter(id => !existing.has(id));

    const output = {
      timestamp: new Date().toISOString(),
      source: 'Homey Ecosystem (All Sources)',
      stats: this.stats,
      repositories: REPOSITORIES.map(r => `${r.owner}/${r.repo}`),
      totalManufacturerIds: this.allIds.size,
      totalModelIds: this.allModelIds.size,
      existingInDrivers: existing.size,
      missing: missing.length,
      allIds: Array.from(this.allIds).sort(),
      allModelIds: Array.from(this.allModelIds).sort(),
      missingIds: missing.sort()
    };

    const outputPath = path.join(OUTPUT_DIR, 'homey-ecosystem-complete.json');
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

    console.log(`\n💾 Saved to: ${outputPath}`);
    return output;
  }

  // Main run
  async run() {
    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════════════╗');
    console.log('║     FETCH ALL HOMEY ECOSYSTEM v1.0                                ║');
    console.log('║     JohanBendz + Athom BV + Community + All Forks                 ║');
    console.log('╚═══════════════════════════════════════════════════════════════════╝');

    // Process all repositories
    for (const { owner, repo } of REPOSITORIES) {
      await this.processRepo(owner, repo);
    }

    const result = this.saveResults();

    console.log('');
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('SUMMARY:');
    console.log(`  Repositories: ${this.stats.repos}`);
    console.log(`  Forks scanned: ${this.stats.forks}`);
    console.log(`  Branches: ${this.stats.branches}`);
    console.log(`  Issues: ${this.stats.issues}`);
    console.log(`  PRs: ${this.stats.prs}`);
    console.log(`  Files scanned: ${this.stats.files}`);
    console.log(`  ─────────────────────`);
    console.log(`  Manufacturer IDs: ${this.allIds.size}`);
    console.log(`  Model IDs: ${this.allModelIds.size}`);
    console.log(`  Missing from drivers: ${result.missing}`);
    console.log('═══════════════════════════════════════════════════════════════════');

    return result;
  }
}

if (require.main === module) {
  const fetcher = new HomeyEcosystemFetcher();
  fetcher.run().catch(console.error);
}

module.exports = HomeyEcosystemFetcher;
