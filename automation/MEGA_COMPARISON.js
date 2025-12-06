#!/usr/bin/env node
/**
 * MEGA COMPARISON - Compare ALL versions from ALL repos
 *
 * Sources:
 * - JohanBendz/com.tuya.zigbee (all branches, all commits)
 * - dlnraja/com.tuya.zigbee (all branches)
 * - All 100+ forks
 * - Other Tuya/Zigbee Homey apps
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const PROJECT_ROOT = path.join(__dirname, '..');
const OUTPUT_FILE = path.join(PROJECT_ROOT, 'data', 'MEGA_COMPARISON.json');

// Rate limit tracking
let requestCount = 0;
const MAX_REQUESTS = 500;

async function fetchJSON(url) {
  if (requestCount >= MAX_REQUESTS) {
    console.log('  Rate limit reached, stopping...');
    return null;
  }
  requestCount++;

  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'Mega-Comparison/1.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(null); }
      });
    }).on('error', () => resolve(null));
  });
}

async function fetchText(url) {
  if (requestCount >= MAX_REQUESTS) return null;
  requestCount++;

  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'Mega-Comparison/1.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', () => resolve(null));
  });
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ═══════════════════════════════════════════════════════════════════════════
// FETCH REPO DATA
// ═══════════════════════════════════════════════════════════════════════════

async function fetchRepoManufacturers(repo) {
  const manufacturers = new Set();
  const productIds = new Set();

  // Get list of drivers
  const driversUrl = `https://api.github.com/repos/${repo}/contents/drivers`;
  const driversList = await fetchJSON(driversUrl);

  if (!driversList || !Array.isArray(driversList)) return { manufacturers: [], productIds: [] };

  // Fetch each driver's config
  for (const driver of driversList) {
    if (driver.type !== 'dir') continue;

    const configUrl = `https://raw.githubusercontent.com/${repo}/master/drivers/${driver.name}/driver.compose.json`;
    const configText = await fetchText(configUrl);

    if (!configText) continue;

    try {
      const config = JSON.parse(configText);
      (config.zigbee?.manufacturerName || []).forEach(m => manufacturers.add(m));
      (config.zigbee?.productId || []).forEach(p => productIds.add(p));
    } catch { }

    await sleep(100); // Rate limit
  }

  return {
    manufacturers: [...manufacturers],
    productIds: [...productIds],
  };
}

async function fetchAllBranches(repo) {
  const branchesUrl = `https://api.github.com/repos/${repo}/branches?per_page=100`;
  const branches = await fetchJSON(branchesUrl);
  return branches || [];
}

async function fetchCommits(repo, branch = 'master', perPage = 30) {
  const commitsUrl = `https://api.github.com/repos/${repo}/commits?sha=${branch}&per_page=${perPage}`;
  const commits = await fetchJSON(commitsUrl);
  return commits || [];
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('════════════════════════════════════════════════════════════════');
  console.log('🔬 MEGA COMPARISON - ALL REPOS, ALL VERSIONS');
  console.log('════════════════════════════════════════════════════════════════\n');

  const allManufacturers = new Map(); // mfr -> { repos: [], count: 0 }
  const allProductIds = new Set();
  const repoStats = [];

  // 1. Get all forks
  console.log('📋 Fetching fork list...');
  const forks = await fetchJSON('https://api.github.com/repos/JohanBendz/com.tuya.zigbee/forks?per_page=100');

  const repos = [
    'JohanBendz/com.tuya.zigbee',
    'dlnraja/com.tuya.zigbee',
  ];

  if (forks && Array.isArray(forks)) {
    forks.forEach(f => {
      if (f.full_name !== 'dlnraja/com.tuya.zigbee') {
        repos.push(f.full_name);
      }
    });
  }

  console.log(`  Total repos to analyze: ${repos.length}\n`);

  // 2. Analyze each repo
  let processed = 0;
  for (const repo of repos) {
    if (requestCount >= MAX_REQUESTS) break;

    console.log(`📦 [${++processed}/${repos.length}] ${repo}`);

    const data = await fetchRepoManufacturers(repo);

    repoStats.push({
      repo,
      manufacturers: data.manufacturers.length,
      productIds: data.productIds.length,
    });

    for (const mfr of data.manufacturers) {
      if (!allManufacturers.has(mfr)) {
        allManufacturers.set(mfr, { repos: [], count: 0 });
      }
      allManufacturers.get(mfr).repos.push(repo);
      allManufacturers.get(mfr).count++;
    }

    data.productIds.forEach(p => allProductIds.add(p));

    console.log(`   Manufacturers: ${data.manufacturers.length}, ProductIds: ${data.productIds.length}`);

    await sleep(500); // Rate limit between repos
  }

  // 3. Get current project state
  console.log('\n📊 Comparing with current project...');

  const currentMfrs = new Set();
  const currentPids = new Set();
  const driversDir = path.join(PROJECT_ROOT, 'drivers');
  const drivers = fs.readdirSync(driversDir, { withFileTypes: true }).filter(d => d.isDirectory());

  for (const driver of drivers) {
    const configPath = path.join(driversDir, driver.name, 'driver.compose.json');
    if (!fs.existsSync(configPath)) continue;
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      (config.zigbee?.manufacturerName || []).forEach(m => currentMfrs.add(m));
      (config.zigbee?.productId || []).forEach(p => currentPids.add(p));
    } catch { }
  }

  console.log(`  Current manufacturers: ${currentMfrs.size}`);
  console.log(`  Current productIds: ${currentPids.size}`);

  // 4. Find missing
  const missingMfrs = [];
  const missingPids = [];

  for (const [mfr, data] of allManufacturers) {
    if (!currentMfrs.has(mfr)) {
      missingMfrs.push({ mfr, repos: data.repos, count: data.count });
    }
  }

  for (const pid of allProductIds) {
    if (!currentPids.has(pid)) {
      missingPids.push(pid);
    }
  }

  // Sort by most common
  missingMfrs.sort((a, b) => b.count - a.count);

  console.log(`\n  Missing manufacturers: ${missingMfrs.length}`);
  console.log(`  Missing productIds: ${missingPids.length}`);

  // 5. Add missing to project
  if (missingMfrs.length > 0) {
    console.log('\n✏️ Adding missing manufacturers...');

    const universalPath = path.join(driversDir, 'zigbee_universal', 'driver.compose.json');
    const config = JSON.parse(fs.readFileSync(universalPath, 'utf8'));

    let added = 0;
    for (const item of missingMfrs) {
      if (!config.zigbee.manufacturerName.includes(item.mfr)) {
        config.zigbee.manufacturerName.push(item.mfr);
        added++;
      }
    }

    if (added > 0) {
      config.zigbee.manufacturerName.sort();
      fs.writeFileSync(universalPath, JSON.stringify(config, null, 2));
      console.log(`  Added ${added} manufacturers to zigbee_universal`);
    }
  }

  // 6. Save report
  const report = {
    generated: new Date().toISOString(),
    reposAnalyzed: processed,
    totalManufacturersFound: allManufacturers.size,
    totalProductIdsFound: allProductIds.size,
    currentManufacturers: currentMfrs.size,
    currentProductIds: currentPids.size,
    missingManufacturers: missingMfrs.length,
    missingProductIds: missingPids.length,
    topMissingMfrs: missingMfrs.slice(0, 50),
    missingProductIds: missingPids,
    repoStats: repoStats.sort((a, b) => b.manufacturers - a.manufacturers).slice(0, 20),
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(report, null, 2));

  // 7. Summary
  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('📊 SUMMARY');
  console.log('════════════════════════════════════════════════════════════════');
  console.log(`  Repos analyzed: ${processed}`);
  console.log(`  Total unique manufacturers found: ${allManufacturers.size}`);
  console.log(`  Total productIds found: ${allProductIds.size}`);
  console.log(`  Missing manufacturers: ${missingMfrs.length}`);
  console.log(`  Missing productIds: ${missingPids.length}`);
  console.log(`  API requests used: ${requestCount}`);
  console.log('════════════════════════════════════════════════════════════════');

  if (missingMfrs.length > 0) {
    console.log('\n🔝 Top 20 missing manufacturers (by popularity):');
    missingMfrs.slice(0, 20).forEach((m, i) => {
      console.log(`  ${i + 1}. ${m.mfr} (in ${m.count} repos)`);
    });
  }
}

if (require.main === module) {
  main().catch(console.error);
}
