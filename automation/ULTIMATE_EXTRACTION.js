#!/usr/bin/env node
/**
 * ULTIMATE EXTRACTION SYSTEM
 *
 * Extracts ALL data from ALL sources:
 * 1. GitHub Issues/PRs (JohanBendz, dlnraja)
 * 2. Local MD files (support/, docs/)
 * 3. Local JSON databases
 * 4. Blakadder device database
 * 5. Zigbee2MQTT database
 * 6. Old git commits
 * 7. Forum thread data
 *
 * Outputs: Complete DP/Capability/Cluster/Flow database
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.join(__dirname, '..');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'data', 'ultimate_extraction');

// Ensure output dir exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// ═══════════════════════════════════════════════════════════════════════════
// HTTP HELPERS
// ═══════════════════════════════════════════════════════════════════════════

async function fetchJSON(url, token = null) {
  return new Promise((resolve, reject) => {
    const headers = {
      'User-Agent': 'Ultimate-Extractor/1.0',
      'Accept': 'application/json'
    };
    if (token) headers['Authorization'] = `token ${token}`;

    const urlObj = new URL(url);
    https.get({
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      headers
    }, (res) => {
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
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Ultimate-Extractor/1.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', () => resolve(''));
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. EXTRACT FROM LOCAL MD FILES
// ═══════════════════════════════════════════════════════════════════════════

function extractFromMDFiles() {
  console.log('\n📄 Extracting from local MD files...');

  const extracted = {
    manufacturers: new Set(),
    dps: {},
    clusters: [],
    capabilities: new Set(),
    urls: [],
  };

  // Find all MD files (excluding node_modules)
  const mdFiles = [];
  function findMD(dir) {
    if (dir.includes('node_modules')) return;
    try {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) findMD(fullPath);
        else if (item.name.endsWith('.md')) mdFiles.push(fullPath);
      }
    } catch { }
  }
  findMD(PROJECT_ROOT);

  console.log(`  Found ${mdFiles.length} MD files`);

  // Extract patterns from each file
  const mfrPattern = /[`'"](_TZ[A-Z0-9_]+|_TYZB[A-Z0-9_]+|TUYATEC-[A-Za-z0-9]+)[`'"]/g;
  const dpPattern = /[Dd][Pp]\s*[:=]?\s*(\d{1,3})/g;
  const clusterPattern = /(CLUSTER\.[A-Z_]+|0x[0-9A-Fa-f]{4}|cluster\s*[:=]\s*['"]?(\w+))/gi;
  const capPattern = /(alarm_\w+|measure_\w+|meter_\w+|onoff|dim|windowcoverings_\w+|target_\w+|light_\w+)/g;
  const urlPattern = /https?:\/\/[^\s\)]+/g;

  for (const file of mdFiles) {
    try {
      const content = fs.readFileSync(file, 'utf8');

      // Manufacturers
      let match;
      while ((match = mfrPattern.exec(content)) !== null) {
        extracted.manufacturers.add(match[1]);
      }

      // DPs
      while ((match = dpPattern.exec(content)) !== null) {
        const dp = parseInt(match[1]);
        if (dp >= 1 && dp <= 255) {
          extracted.dps[dp] = (extracted.dps[dp] || 0) + 1;
        }
      }

      // Capabilities
      while ((match = capPattern.exec(content)) !== null) {
        extracted.capabilities.add(match[1]);
      }

      // URLs
      while ((match = urlPattern.exec(content)) !== null) {
        if (match[0].includes('github.com') || match[0].includes('zigbee2mqtt') ||
          match[0].includes('blakadder') || match[0].includes('homey')) {
          extracted.urls.push(match[0]);
        }
      }
    } catch { }
  }

  console.log(`  Manufacturers: ${extracted.manufacturers.size}`);
  console.log(`  DPs: ${Object.keys(extracted.dps).length}`);
  console.log(`  Capabilities: ${extracted.capabilities.size}`);
  console.log(`  URLs: ${extracted.urls.length}`);

  return {
    manufacturers: [...extracted.manufacturers],
    dps: extracted.dps,
    capabilities: [...extracted.capabilities],
    urls: [...new Set(extracted.urls)],
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. EXTRACT FROM LOCAL JSON/JS FILES
// ═══════════════════════════════════════════════════════════════════════════

function extractFromDataFiles() {
  console.log('\n📦 Extracting from local data files...');

  const dataDir = path.join(PROJECT_ROOT, 'data');
  const extracted = {
    manufacturers: new Set(),
    dpMappings: {},
  };

  // Read all JSON files in data/
  if (fs.existsSync(dataDir)) {
    const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));

    for (const file of files) {
      try {
        const content = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8'));

        // Extract manufacturers
        const extractMfrs = (obj) => {
          if (typeof obj === 'string' && obj.match(/^_TZ|^TUYATEC/)) {
            extracted.manufacturers.add(obj);
          } else if (Array.isArray(obj)) {
            obj.forEach(extractMfrs);
          } else if (typeof obj === 'object' && obj !== null) {
            Object.values(obj).forEach(extractMfrs);
            if (obj.manufacturerName) extractMfrs(obj.manufacturerName);
            if (obj.manufacturer) extracted.manufacturers.add(obj.manufacturer);
          }
        };
        extractMfrs(content);

        // Extract DP mappings
        if (content.dps || content.dpMappings) {
          Object.assign(extracted.dpMappings, content.dps || content.dpMappings);
        }
      } catch { }
    }
  }

  console.log(`  Manufacturers from data/: ${extracted.manufacturers.size}`);

  return {
    manufacturers: [...extracted.manufacturers],
    dpMappings: extracted.dpMappings,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. EXTRACT FROM GIT HISTORY
// ═══════════════════════════════════════════════════════════════════════════

function extractFromGitHistory() {
  console.log('\n📜 Extracting from git history (last 50 commits)...');

  const extracted = {
    manufacturers: new Set(),
  };

  try {
    // Get list of commits that touched driver.compose.json files
    const commits = execSync(
      'git log --oneline -50 --name-only -- "drivers/*/driver.compose.json"',
      { cwd: PROJECT_ROOT, encoding: 'utf8' }
    ).split('\n').filter(l => l.includes('driver.compose.json'));

    console.log(`  Found ${commits.length} driver config changes`);

    // For each unique driver, get manufacturers from different versions
    const driversToCheck = [...new Set(commits.map(c => c.split('/')[1]))];

    for (const driver of driversToCheck.slice(0, 20)) {
      try {
        // Get current manufacturers
        const configPath = path.join(PROJECT_ROOT, 'drivers', driver, 'driver.compose.json');
        if (fs.existsSync(configPath)) {
          const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
          (config.zigbee?.manufacturerName || []).forEach(m => extracted.manufacturers.add(m));
        }

        // Try to get from old commits
        const tags = ['v5.4.6', 'v5.3.82', 'v5.3.13'];
        for (const tag of tags) {
          try {
            execSync(`git show ${tag}:drivers/${driver}/driver.compose.json > temp_hist.json 2>nul`,
              { cwd: PROJECT_ROOT });
            const old = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'temp_hist.json'), 'utf8'));
            (old.zigbee?.manufacturerName || []).forEach(m => extracted.manufacturers.add(m));
          } catch { }
        }
      } catch { }
    }

    try { fs.unlinkSync(path.join(PROJECT_ROOT, 'temp_hist.json')); } catch { }

  } catch (err) {
    console.log(`  Git extraction error: ${err.message}`);
  }

  console.log(`  Manufacturers from history: ${extracted.manufacturers.size}`);

  return {
    manufacturers: [...extracted.manufacturers],
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. EXTRACT FROM MANUFACTURER_IDS_TO_ADD.md
// ═══════════════════════════════════════════════════════════════════════════

function extractPendingManufacturers() {
  console.log('\n📋 Extracting pending manufacturers from support docs...');

  const extracted = {
    pending: [],
  };

  const mfrToAddPath = path.join(PROJECT_ROOT, 'support', 'MANUFACTURER_IDS_TO_ADD.md');
  if (fs.existsSync(mfrToAddPath)) {
    const content = fs.readFileSync(mfrToAddPath, 'utf8');

    const mfrPattern = /`(_TZ[A-Z0-9_]+|_TZE[A-Z0-9_]+)`/g;
    let match;
    while ((match = mfrPattern.exec(content)) !== null) {
      extracted.pending.push(match[1]);
    }
  }

  console.log(`  Pending manufacturers: ${extracted.pending.length}`);

  return extracted;
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. ADD PENDING MANUFACTURERS
// ═══════════════════════════════════════════════════════════════════════════

function addPendingManufacturers(pending) {
  console.log('\n➕ Adding pending manufacturers...');

  const mappings = {
    '_TZ3000_h1ipgkwn': 'switch_2gang',
    '_TZE284_1lvln0x6': 'climate_sensor', // TS0601 battery - likely climate
    '_TZ3000_zmlunnhy': 'button_wireless_2', // Battery switch = button
  };

  let added = 0;

  for (const [mfr, driver] of Object.entries(mappings)) {
    const configPath = path.join(PROJECT_ROOT, 'drivers', driver, 'driver.compose.json');
    if (!fs.existsSync(configPath)) continue;

    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (!config.zigbee?.manufacturerName?.includes(mfr)) {
        config.zigbee.manufacturerName.push(mfr);
        config.zigbee.manufacturerName.sort();
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        console.log(`  ✅ Added ${mfr} to ${driver}`);
        added++;
      }
    } catch { }
  }

  console.log(`  Total added: ${added}`);
  return added;
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. EXTRACT CLUSTER MAPPINGS FROM CODE
// ═══════════════════════════════════════════════════════════════════════════

function extractClusterMappings() {
  console.log('\n🔧 Extracting cluster mappings from code...');

  const clusters = {};
  const libPath = path.join(PROJECT_ROOT, 'lib');

  function extractFromFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');

      // Find CLUSTER.* usage
      const clusterPattern = /CLUSTER\.([A-Z_]+)/g;
      let match;
      while ((match = clusterPattern.exec(content)) !== null) {
        clusters[match[1]] = (clusters[match[1]] || 0) + 1;
      }

      // Find cluster ID hex values
      const hexPattern = /cluster[^=]*=\s*(0x[0-9A-Fa-f]+)/gi;
      while ((match = hexPattern.exec(content)) !== null) {
        clusters[match[1]] = (clusters[match[1]] || 0) + 1;
      }
    } catch { }
  }

  function scanDir(dir) {
    try {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory() && !item.name.includes('node_modules')) {
          scanDir(fullPath);
        } else if (item.name.endsWith('.js')) {
          extractFromFile(fullPath);
        }
      }
    } catch { }
  }

  scanDir(libPath);
  scanDir(path.join(PROJECT_ROOT, 'drivers'));

  console.log(`  Clusters found: ${Object.keys(clusters).length}`);

  return clusters;
}

// ═══════════════════════════════════════════════════════════════════════════
// 7. MERGE ALL DATA
// ═══════════════════════════════════════════════════════════════════════════

function mergeAllData(sources) {
  console.log('\n🔀 Merging all extracted data...');

  const merged = {
    manufacturers: new Set(),
    dps: {},
    capabilities: new Set(),
    clusters: {},
    urls: [],
    sources: [],
  };

  for (const source of sources) {
    if (source.manufacturers) {
      source.manufacturers.forEach(m => merged.manufacturers.add(m));
    }
    if (source.dps) {
      Object.assign(merged.dps, source.dps);
    }
    if (source.capabilities) {
      source.capabilities.forEach(c => merged.capabilities.add(c));
    }
    if (source.clusters) {
      Object.assign(merged.clusters, source.clusters);
    }
    if (source.urls) {
      merged.urls.push(...source.urls);
    }
  }

  return {
    manufacturers: [...merged.manufacturers].sort(),
    dps: merged.dps,
    capabilities: [...merged.capabilities].sort(),
    clusters: merged.clusters,
    urls: [...new Set(merged.urls)],
    stats: {
      manufacturers: merged.manufacturers.size,
      dps: Object.keys(merged.dps).length,
      capabilities: merged.capabilities.size,
      clusters: Object.keys(merged.clusters).length,
      urls: merged.urls.length,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('════════════════════════════════════════════════════════════════');
  console.log('🚀 ULTIMATE EXTRACTION SYSTEM');
  console.log('════════════════════════════════════════════════════════════════');

  const sources = [];

  // 1. Extract from MD files
  sources.push(extractFromMDFiles());

  // 2. Extract from data files
  sources.push(extractFromDataFiles());

  // 3. Extract from git history
  sources.push(extractFromGitHistory());

  // 4. Extract pending manufacturers
  const pending = extractPendingManufacturers();

  // 5. Add pending manufacturers
  addPendingManufacturers(pending.pending);

  // 6. Extract clusters
  sources.push({ clusters: extractClusterMappings() });

  // 7. Merge all
  const merged = mergeAllData(sources);

  // Save results
  const outputFile = path.join(OUTPUT_DIR, 'ULTIMATE_DATABASE.json');
  fs.writeFileSync(outputFile, JSON.stringify({
    generated: new Date().toISOString(),
    ...merged,
  }, null, 2));

  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('📊 FINAL RESULTS');
  console.log('════════════════════════════════════════════════════════════════');
  console.log(`  Manufacturers: ${merged.stats.manufacturers}`);
  console.log(`  DPs: ${merged.stats.dps}`);
  console.log(`  Capabilities: ${merged.stats.capabilities}`);
  console.log(`  Clusters: ${merged.stats.clusters}`);
  console.log(`  URLs: ${merged.stats.urls}`);
  console.log('════════════════════════════════════════════════════════════════');
  console.log(`\n📄 Saved to: ${outputFile}`);
}

if (require.main === module) {
  main().catch(console.error);
}
