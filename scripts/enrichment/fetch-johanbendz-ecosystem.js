'use strict';

/**
 * FETCH JOHANBENDZ ECOSYSTEM v1.0
 *
 * Fetches ALL device data from JohanBendz's projects:
 * - com.tuya.zigbee (main + all forks + sub-forks)
 * - com.philips.hue.zigbee
 * - All branches
 * - All issues (open + closed)
 * - All PRs (open + closed + merged)
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = './data/enrichment';

const PATTERNS = {
  manufacturerId: /_TZ[E0-9]{1,4}_[a-z0-9]+/gi,
  modelId: /TS[0-9]{3,4}[A-Z]?/gi,
  philipsId: /Philips|Signify|929[0-9]{9}/gi
};

// JohanBendz repositories to scan
const REPOS = [
  { owner: 'JohanBendz', repo: 'com.tuya.zigbee', type: 'tuya' },
  { owner: 'JohanBendz', repo: 'com.philips.hue.zigbee', type: 'philips' }
];

class JohanBendzEcosystemFetcher {
  constructor() {
    this.allIds = new Set();
    this.forks = [];
    this.issues = [];
    this.prs = [];
    this.branches = [];
    this.stats = {
      repos: 0,
      forks: 0,
      issues: 0,
      prs: 0,
      branches: 0,
      idsFound: 0
    };
  }

  // HTTP GET with GitHub API
  fetch(url) {
    return new Promise((resolve, reject) => {
      const options = {
        headers: {
          'User-Agent': 'Homey-Enrichment/1.0',
          'Accept': 'application/vnd.github.v3+json'
        }
      };

      https.get(url, options, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          return this.fetch(res.headers.location).then(resolve).catch(reject);
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

  // Fetch all branches from a repo
  async fetchBranches(owner, repo) {
    console.log(`   📂 Fetching branches...`);
    try {
      const branches = await this.fetch(`https://api.github.com/repos/${owner}/${repo}/branches?per_page=100`);
      if (Array.isArray(branches)) {
        this.stats.branches += branches.length;
        return branches.map(b => b.name);
      }
    } catch (e) { }
    return ['master', 'main'];
  }

  // Fetch all issues (open + closed)
  async fetchIssues(owner, repo) {
    console.log(`   📋 Fetching issues...`);
    let allIssues = [];

    for (const state of ['open', 'closed']) {
      let page = 1;
      while (page <= 15) { // Max 15 pages = 1500 issues
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
    console.log(`      Found ${allIssues.length} issues`);

    // Extract IDs from issue bodies and comments
    for (const issue of allIssues) {
      if (issue.body) {
        const ids = issue.body.match(PATTERNS.manufacturerId) || [];
        ids.forEach(id => this.allIds.add(id.toLowerCase()));
      }
    }

    return allIssues;
  }

  // Fetch all PRs (open + closed + merged)
  async fetchPRs(owner, repo) {
    console.log(`   🔀 Fetching PRs...`);
    let allPRs = [];

    for (const state of ['open', 'closed']) {
      let page = 1;
      while (page <= 10) {
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
    console.log(`      Found ${allPRs.length} PRs`);

    // Extract IDs from PR bodies
    for (const pr of allPRs) {
      if (pr.body) {
        const ids = pr.body.match(PATTERNS.manufacturerId) || [];
        ids.forEach(id => this.allIds.add(id.toLowerCase()));
      }
    }

    return allPRs;
  }

  // Fetch all forks recursively
  async fetchForks(owner, repo, depth = 0) {
    if (depth > 2) return []; // Max 2 levels deep (forks of forks)

    console.log(`   🍴 Fetching forks (depth ${depth})...`);
    let allForks = [];

    let page = 1;
    while (page <= 5) {
      try {
        const forks = await this.fetch(
          `https://api.github.com/repos/${owner}/${repo}/forks?per_page=100&page=${page}`
        );
        if (!Array.isArray(forks) || forks.length === 0) break;
        allForks = allForks.concat(forks);
        page++;
      } catch (e) {
        break;
      }
    }

    this.stats.forks += allForks.length;
    console.log(`      Found ${allForks.length} forks`);

    // Scan each fork for driver.compose.json files
    for (const fork of allForks.slice(0, 30)) { // Limit to 30 forks
      await this.scanRepoForIds(fork.owner.login, fork.name);

      // Recursively get sub-forks
      if (depth < 1) {
        const subForks = await this.fetchForks(fork.owner.login, fork.name, depth + 1);
        allForks = allForks.concat(subForks);
      }
    }

    return allForks;
  }

  // Scan a repo for manufacturer IDs
  async scanRepoForIds(owner, repo) {
    try {
      // Get repo tree
      const branches = ['master', 'main', 'develop'];

      for (const branch of branches) {
        try {
          const tree = await this.fetch(
            `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`
          );

          if (!tree.tree) continue;

          // Find driver.compose.json files
          const composeFiles = tree.tree.filter(f =>
            f.path.includes('driver.compose.json') ||
            f.path.includes('device.js') ||
            f.path.includes('driver-mapping')
          );

          for (const file of composeFiles.slice(0, 20)) {
            try {
              const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${file.path}`;
              const content = await this.fetchRaw(rawUrl);
              const ids = content.match(PATTERNS.manufacturerId) || [];
              ids.forEach(id => this.allIds.add(id.toLowerCase()));
            } catch (e) { }
          }

          break; // Found a valid branch
        } catch (e) { }
      }
    } catch (e) { }
  }

  // Fetch raw content
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

  // Process a single repository
  async processRepo(owner, repo, type) {
    console.log(`\n📦 Processing ${owner}/${repo}...`);
    this.stats.repos++;

    // Fetch branches
    const branches = await this.fetchBranches(owner, repo);
    console.log(`      Branches: ${branches.join(', ')}`);

    // Scan main repo
    await this.scanRepoForIds(owner, repo);

    // Fetch issues
    await this.fetchIssues(owner, repo);

    // Fetch PRs
    await this.fetchPRs(owner, repo);

    // Fetch forks and sub-forks
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
      source: 'JohanBendz Ecosystem',
      stats: this.stats,
      totalFound: this.allIds.size,
      existingInDrivers: existing.size,
      missing: missing.length,
      allIds: Array.from(this.allIds).sort(),
      missingIds: missing.sort()
    };

    const outputPath = path.join(OUTPUT_DIR, 'johanbendz-ecosystem-ids.json');
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

    console.log(`\n💾 Saved to: ${outputPath}`);
    return output;
  }

  // Main run
  async run() {
    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║     JOHANBENDZ ECOSYSTEM FETCHER v1.0                     ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');

    // Process all repos
    for (const { owner, repo, type } of REPOS) {
      await this.processRepo(owner, repo, type);
    }

    const result = this.saveResults();

    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('SUMMARY:');
    console.log(`  Repos scanned: ${this.stats.repos}`);
    console.log(`  Forks scanned: ${this.stats.forks}`);
    console.log(`  Issues analyzed: ${this.stats.issues}`);
    console.log(`  PRs analyzed: ${this.stats.prs}`);
    console.log(`  Branches found: ${this.stats.branches}`);
    console.log(`  ─────────────────────`);
    console.log(`  Total IDs found: ${this.allIds.size}`);
    console.log(`  Missing from drivers: ${result.missing}`);
    console.log('═══════════════════════════════════════════════════════════');

    return result;
  }
}

if (require.main === module) {
  const fetcher = new JohanBendzEcosystemFetcher();
  fetcher.run().catch(console.error);
}

module.exports = JohanBendzEcosystemFetcher;
