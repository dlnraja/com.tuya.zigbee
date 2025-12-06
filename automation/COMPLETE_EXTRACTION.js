#!/usr/bin/env node
/**
 * COMPLETE EXTRACTION - Process ALL sources
 *
 * 1. GitHub PRs (JohanBendz, dlnraja)
 * 2. GitHub Issues (already done)
 * 3. Email files (diagnostics, forum)
 * 4. Blakadder database
 * 5. Zigbee2MQTT database
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const PROJECT_ROOT = path.join(__dirname, '..');
const EMAIL_DIR = 'D:\\Download\\touthomey_extracted';

// ═══════════════════════════════════════════════════════════════════════════
// PATTERNS
// ═══════════════════════════════════════════════════════════════════════════

const MFR_PATTERN = /[_]?(TZ[A-Z0-9]{1,4}_[a-z0-9]{8}|TYZB[0-9]{2}_[a-z0-9]{8}|TZE[0-9]{3}_[a-z0-9]{8}|TUYATEC-[a-z0-9]{8})/gi;
const DP_PATTERN = /[Dd][Pp]\s*[:=]?\s*(\d{1,3})/g;
const CAPABILITY_PATTERN = /(alarm_\w+|measure_\w+|meter_\w+|onoff|dim|windowcoverings_\w+|target_\w+|light_\w+)/g;

// ═══════════════════════════════════════════════════════════════════════════
// HTTP HELPERS
// ═══════════════════════════════════════════════════════════════════════════

async function fetchJSON(url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'Complete-Extractor/1.0' } }, (res) => {
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
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'Complete-Extractor/1.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', () => resolve(''));
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. GITHUB PRs
// ═══════════════════════════════════════════════════════════════════════════

async function fetchGitHubPRs(repo, maxPages = 10) {
  console.log(`\n📥 Fetching PRs from ${repo}...`);
  const prs = [];

  for (let page = 1; page <= maxPages; page++) {
    const url = `https://api.github.com/repos/${repo}/pulls?state=all&per_page=100&page=${page}`;
    const data = await fetchJSON(url);

    if (!Array.isArray(data) || data.length === 0) break;
    prs.push(...data);
    console.log(`  Page ${page}: ${data.length} PRs`);

    await new Promise(r => setTimeout(r, 1000));
  }

  return prs;
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. EMAIL FILES
// ═══════════════════════════════════════════════════════════════════════════

function processEmailFiles() {
  console.log('\n📧 Processing email files...');

  const extracted = {
    manufacturers: new Set(),
    dps: new Set(),
    capabilities: new Set(),
    diagnostics: [],
  };

  if (!fs.existsSync(EMAIL_DIR)) {
    console.log('  Email directory not found');
    return extracted;
  }

  const files = fs.readdirSync(EMAIL_DIR).filter(f => f.endsWith('.eml'));
  console.log(`  Found ${files.length} email files`);

  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(EMAIL_DIR, file), 'utf8');

      // Extract manufacturers
      let match;
      while ((match = MFR_PATTERN.exec(content)) !== null) {
        let mfr = match[1];
        if (!mfr.startsWith('_')) mfr = '_' + mfr;
        extracted.manufacturers.add(mfr);
      }

      // Extract DPs
      while ((match = DP_PATTERN.exec(content)) !== null) {
        const dp = parseInt(match[1]);
        if (dp >= 1 && dp <= 255) extracted.dps.add(dp);
      }

      // Extract capabilities
      while ((match = CAPABILITY_PATTERN.exec(content)) !== null) {
        extracted.capabilities.add(match[1]);
      }

      // Check for diagnostic content
      if (file.includes('Diagnostic')) {
        extracted.diagnostics.push({
          file,
          size: content.length,
        });
      }
    } catch (err) {
      // Skip errors
    }
  }

  console.log(`  Manufacturers: ${extracted.manufacturers.size}`);
  console.log(`  DPs: ${extracted.dps.size}`);
  console.log(`  Diagnostics: ${extracted.diagnostics.length}`);

  return {
    manufacturers: [...extracted.manufacturers],
    dps: [...extracted.dps],
    capabilities: [...extracted.capabilities],
    diagnostics: extracted.diagnostics,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. BLAKADDER DATABASE
// ═══════════════════════════════════════════════════════════════════════════

async function fetchBlakadder() {
  console.log('\n🔍 Fetching Blakadder database...');

  const url = 'https://zigbee.blakadder.com/all.json';
  const data = await fetchJSON(url);

  if (!data) {
    console.log('  Failed to fetch');
    return { manufacturers: [] };
  }

  const manufacturers = new Set();

  // Extract Tuya manufacturers
  if (Array.isArray(data)) {
    for (const device of data) {
      const mfr = device.zigbeeModel || device.manufacturerName || '';
      if (mfr.match(/^_TZ|^TUYATEC/i)) {
        manufacturers.add(mfr);
      }
    }
  }

  console.log(`  Tuya manufacturers: ${manufacturers.size}`);
  return { manufacturers: [...manufacturers] };
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. ZIGBEE2MQTT
// ═══════════════════════════════════════════════════════════════════════════

async function fetchZ2M() {
  console.log('\n📡 Fetching Zigbee2MQTT database...');

  const url = 'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/tuya.ts';
  const content = await fetchText(url);

  if (!content) {
    console.log('  Failed to fetch');
    return { manufacturers: [], dps: [] };
  }

  const manufacturers = new Set();
  const dps = new Set();

  // Extract manufacturers
  let match;
  while ((match = MFR_PATTERN.exec(content)) !== null) {
    let mfr = match[1];
    if (!mfr.startsWith('_')) mfr = '_' + mfr;
    manufacturers.add(mfr);
  }

  // Extract DPs
  const dpPatterns = [
    /dp:\s*(\d+)/g,
    /tuya\.dp\s*\(\s*(\d+)/g,
    /\[(\d+),\s*['"][\w_]+['"]/g,
  ];

  for (const pattern of dpPatterns) {
    while ((match = pattern.exec(content)) !== null) {
      const dp = parseInt(match[1]);
      if (dp >= 1 && dp <= 255) dps.add(dp);
    }
  }

  console.log(`  Manufacturers: ${manufacturers.size}`);
  console.log(`  DPs: ${dps.size}`);

  return {
    manufacturers: [...manufacturers],
    dps: [...dps],
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. MERGE AND APPLY
// ═══════════════════════════════════════════════════════════════════════════

function mergeAndApply(sources) {
  console.log('\n🔀 Merging all sources...');

  const allMfrs = new Set();
  const allDps = new Set();

  for (const source of sources) {
    if (source.manufacturers) {
      source.manufacturers.forEach(m => allMfrs.add(m));
    }
    if (source.dps) {
      source.dps.forEach(d => allDps.add(d));
    }
  }

  console.log(`  Total unique manufacturers: ${allMfrs.size}`);
  console.log(`  Total unique DPs: ${allDps.size}`);

  // Load current manufacturers
  const driversDir = path.join(PROJECT_ROOT, 'drivers');
  const currentMfrs = new Set();

  const drivers = fs.readdirSync(driversDir, { withFileTypes: true }).filter(d => d.isDirectory());
  for (const driver of drivers) {
    const configPath = path.join(driversDir, driver.name, 'driver.compose.json');
    if (!fs.existsSync(configPath)) continue;
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      (config.zigbee?.manufacturerName || []).forEach(m => currentMfrs.add(m));
    } catch { }
  }

  // Find new manufacturers
  const newMfrs = [...allMfrs].filter(m => !currentMfrs.has(m));
  console.log(`  New manufacturers to add: ${newMfrs.length}`);

  // Add new manufacturers to zigbee_universal
  if (newMfrs.length > 0) {
    const configPath = path.join(driversDir, 'zigbee_universal', 'driver.compose.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    let added = 0;
    for (const mfr of newMfrs) {
      if (!config.zigbee.manufacturerName.includes(mfr)) {
        config.zigbee.manufacturerName.push(mfr);
        added++;
      }
    }

    config.zigbee.manufacturerName.sort();
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(`  Added ${added} to zigbee_universal`);
  }

  return {
    totalMfrs: allMfrs.size,
    newMfrs: newMfrs.length,
    totalDps: allDps.size,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('════════════════════════════════════════════════════════════════');
  console.log('🚀 COMPLETE EXTRACTION - ALL SOURCES');
  console.log('════════════════════════════════════════════════════════════════');

  const sources = [];

  // 1. GitHub PRs
  const johanPRs = await fetchGitHubPRs('JohanBendz/com.tuya.zigbee', 15);
  const dlnrajaPRs = await fetchGitHubPRs('dlnraja/com.tuya.zigbee', 5);

  // Extract from PRs
  const prMfrs = new Set();
  const allPRs = [...johanPRs, ...dlnrajaPRs];
  console.log(`\n  Total PRs: ${allPRs.length}`);

  for (const pr of allPRs) {
    const text = (pr.title || '') + ' ' + (pr.body || '');
    let match;
    while ((match = MFR_PATTERN.exec(text)) !== null) {
      let mfr = match[1];
      if (!mfr.startsWith('_')) mfr = '_' + mfr;
      prMfrs.add(mfr);
    }
  }
  console.log(`  Manufacturers from PRs: ${prMfrs.size}`);
  sources.push({ manufacturers: [...prMfrs] });

  // 2. Email files
  sources.push(processEmailFiles());

  // 3. Blakadder
  sources.push(await fetchBlakadder());

  // 4. Z2M
  sources.push(await fetchZ2M());

  // 5. Merge and apply
  const result = mergeAndApply(sources);

  // Save report
  const report = {
    generated: new Date().toISOString(),
    sources: {
      githubPRs: allPRs.length,
      emailFiles: sources[1].manufacturers?.length || 0,
      blakadder: sources[2].manufacturers?.length || 0,
      z2m: sources[3].manufacturers?.length || 0,
    },
    result,
  };

  fs.writeFileSync(
    path.join(PROJECT_ROOT, 'data', 'COMPLETE_EXTRACTION_REPORT.json'),
    JSON.stringify(report, null, 2)
  );

  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('📊 FINAL RESULTS');
  console.log('════════════════════════════════════════════════════════════════');
  console.log(`  GitHub PRs processed: ${allPRs.length}`);
  console.log(`  Email files processed: ${sources[1].diagnostics?.length || 0}`);
  console.log(`  Total unique manufacturers: ${result.totalMfrs}`);
  console.log(`  New manufacturers added: ${result.newMfrs}`);
  console.log(`  Total DPs found: ${result.totalDps}`);
  console.log('════════════════════════════════════════════════════════════════');
}

if (require.main === module) {
  main().catch(console.error);
}
