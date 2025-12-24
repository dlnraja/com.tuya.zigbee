#!/usr/bin/env node
/**
 * Intelligent PR/Issue/Forum Scanner
 * Extracts device requests and manufacturerNames from GitHub PRs, Issues and Forums
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const DRIVERS_PATH = path.join(__dirname, '..', 'drivers');

// Fetch JSON from GitHub API
function fetchGitHub(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'Homey-Enricher',
        'Accept': 'application/vnd.github.v3+json'
      }
    };

    https.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve([]);
        }
      });
    }).on('error', () => resolve([]));
  });
}

// Extract manufacturerNames from text
function extractManufacturerNames(text) {
  if (!text) return [];
  const patterns = [
    /_TZ[A-Z0-9]*_[a-zA-Z0-9]+/gi,
    /_TYZB[0-9]+_[a-zA-Z0-9]+/gi,
    /_TZE[0-9]+_[a-zA-Z0-9]+/gi
  ];

  const found = new Set();
  for (const pattern of patterns) {
    const matches = text.match(pattern) || [];
    matches.forEach(m => found.add(m.toLowerCase()));
  }
  return [...found];
}

// Extract productIds from text
function extractProductIds(text) {
  if (!text) return [];
  const pattern = /TS[0-9]{3,4}[A-Z]?/gi;
  const matches = text.match(pattern) || [];
  return [...new Set(matches.map(m => m.toUpperCase()))];
}

// Get current manufacturerNames
function getCurrentManufacturers() {
  const mfrs = new Set();
  const drivers = fs.readdirSync(DRIVERS_PATH);

  for (const driver of drivers) {
    const composePath = path.join(DRIVERS_PATH, driver, 'driver.compose.json');
    if (fs.existsSync(composePath)) {
      try {
        const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
        (compose.zigbee?.manufacturerName || []).forEach(m => mfrs.add(m.toLowerCase()));
      } catch (e) { }
    }
  }
  return mfrs;
}

// Determine device type from context
function guessDeviceType(text) {
  const lower = text.toLowerCase();

  if (lower.includes('trv') || lower.includes('radiator') || lower.includes('valve') || lower.includes('thermostat')) return 'radiator_valve';
  if (lower.includes('motion') || lower.includes('pir') || lower.includes('occupancy')) return 'motion_sensor';
  if (lower.includes('presence') || lower.includes('radar') || lower.includes('mmwave')) return 'presence_sensor_radar';
  if (lower.includes('temperature') && lower.includes('humidity')) return 'climate_sensor';
  if (lower.includes('door') || lower.includes('window') || lower.includes('contact')) return 'contact_sensor';
  if (lower.includes('water') || lower.includes('leak') || lower.includes('flood')) return 'water_leak_sensor';
  if (lower.includes('smoke') || lower.includes('fire')) return 'smoke_detector';
  if (lower.includes('gas') || lower.includes('co2') || lower.includes('methane')) return 'gas_sensor';
  if (lower.includes('plug') || lower.includes('socket') || lower.includes('outlet')) return 'plug_smart';
  if (lower.includes('switch') && lower.includes('1')) return 'switch_1gang';
  if (lower.includes('switch') && lower.includes('2')) return 'switch_2gang';
  if (lower.includes('switch') && lower.includes('3')) return 'switch_3gang';
  if (lower.includes('switch') && lower.includes('4')) return 'switch_4gang';
  if (lower.includes('dimmer')) return 'dimmer';
  if (lower.includes('bulb') || lower.includes('light') || lower.includes('led') || lower.includes('rgb')) return 'bulb_rgb';
  if (lower.includes('curtain') || lower.includes('blind') || lower.includes('shade') || lower.includes('cover')) return 'curtain_motor';
  if (lower.includes('button') || lower.includes('remote') || lower.includes('scene')) {
    if (lower.includes('4')) return 'button_wireless_4';
    if (lower.includes('2')) return 'button_wireless_2';
    return 'button_wireless_1';
  }
  if (lower.includes('siren') || lower.includes('alarm')) return 'siren';
  if (lower.includes('ir') || lower.includes('infrared')) return 'ir_blaster';
  if (lower.includes('soil')) return 'soil_sensor';

  return null;
}

// Add manufacturerName to driver
function addToDriver(driverName, mfr) {
  const composePath = path.join(DRIVERS_PATH, driverName, 'driver.compose.json');
  if (!fs.existsSync(composePath)) return false;

  try {
    const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    if (!compose.zigbee?.manufacturerName) return false;

    const normalized = mfr.toLowerCase();
    if (compose.zigbee.manufacturerName.some(m => m.toLowerCase() === normalized)) return false;

    compose.zigbee.manufacturerName.push(mfr);
    fs.writeFileSync(composePath, JSON.stringify(compose, null, 2));
    return true;
  } catch (e) {
    return false;
  }
}

// Main function
async function main() {
  console.log('🔍 Intelligent PR/Issue/Forum Scanner\n');
  console.log('='.repeat(60));

  const currentMfrs = getCurrentManufacturers();
  console.log(`\n📦 Current: ${currentMfrs.size} manufacturerNames\n`);

  const repos = [
    { owner: 'dlnraja', repo: 'com.tuya.zigbee', type: 'issues' },
    { owner: 'dlnraja', repo: 'com.tuya.zigbee', type: 'pulls' },
    { owner: 'JohanBendz', repo: 'com.tuya.zigbee', type: 'issues' }
  ];

  const allRequests = [];
  const newMfrs = new Set();

  for (const { owner, repo, type } of repos) {
    console.log(`📋 Scanning ${owner}/${repo} ${type}...`);

    const url = `https://api.github.com/repos/${owner}/${repo}/${type}?state=all&per_page=100`;
    const items = await fetchGitHub(url);

    if (!Array.isArray(items)) {
      console.log(`   ⚠️ Could not fetch (rate limited or error)`);
      continue;
    }

    console.log(`   Found ${items.length} items`);

    for (const item of items) {
      const text = `${item.title || ''} ${item.body || ''}`;
      const mfrs = extractManufacturerNames(text);
      const pids = extractProductIds(text);
      const deviceType = guessDeviceType(text);

      for (const mfr of mfrs) {
        if (!currentMfrs.has(mfr.toLowerCase())) {
          newMfrs.add(mfr);
          allRequests.push({
            source: `${owner}/${repo}#${item.number}`,
            title: item.title,
            mfr,
            pids,
            deviceType,
            state: item.state
          });
        }
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 Found ${newMfrs.size} new manufacturerNames from PRs/Issues\n`);

  if (newMfrs.size > 0) {
    let added = 0;
    const enrichments = {};

    for (const req of allRequests) {
      if (req.deviceType && addToDriver(req.deviceType, req.mfr)) {
        added++;
        if (!enrichments[req.deviceType]) enrichments[req.deviceType] = [];
        enrichments[req.deviceType].push({
          mfr: req.mfr,
          source: req.source
        });
        console.log(`   ✅ ${req.mfr} -> ${req.deviceType} (${req.source})`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`\n✅ Added ${added} manufacturerNames from PRs/Issues`);

    if (Object.keys(enrichments).length > 0) {
      console.log('\n📊 By driver:');
      for (const [driver, items] of Object.entries(enrichments)) {
        console.log(`   ${driver}: +${items.length}`);
      }
    }

    // Save report
    const report = {
      timestamp: new Date().toISOString(),
      sources: repos.map(r => `${r.owner}/${r.repo}`),
      newMfrsFound: newMfrs.size,
      addedCount: added,
      allRequests: allRequests.slice(0, 50),
      enrichments
    };

    const reportPath = path.join(__dirname, 'pr-issue-scan-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Report: ${reportPath}`);
  }
}

main().catch(console.error);
