#!/usr/bin/env node
/**
 * SMART FINGERPRINT ANALYSIS
 *
 * Problem: Same manufacturerName can be used for different devices
 * Solution: Use modelId + manufacturerName + endpoints for fingerprinting
 *
 * This script:
 * 1. Compares all git versions to find all manufacturers
 * 2. Fetches Z2M database for real device fingerprints
 * 3. Identifies ambiguous manufacturers (same ID, different devices)
 * 4. Creates enriched fingerprint database
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.join(__dirname, '..');

// ═══════════════════════════════════════════════════════════════════════════
// FETCH Z2M DATABASE FOR REAL FINGERPRINTS
// ═══════════════════════════════════════════════════════════════════════════

async function fetchZ2MDevices() {
  console.log('📡 Fetching Zigbee2MQTT device database...');

  const url = 'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/tuya.ts';

  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const devices = [];

        // Parse device definitions
        // Format: {zigbeeModel: ['_TZ3000_xxx'], model: 'TS0001', ...}
        const devicePattern = /\{\s*zigbeeModel:\s*\[([^\]]+)\][^}]*model:\s*['"]([^'"]+)['"][^}]*vendor:\s*['"]([^'"]+)['"][^}]*description:\s*['"]([^'"]+)['"]/g;

        let match;
        while ((match = devicePattern.exec(data)) !== null) {
          const zigbeeModels = match[1].match(/'([^']+)'/g)?.map(m => m.replace(/'/g, '')) || [];
          devices.push({
            zigbeeModels,
            model: match[2],
            vendor: match[3],
            description: match[4],
          });
        }

        // Also extract fingerprints
        const fpPattern = /fingerprint:\s*\[([^\]]+)\]/g;
        while ((match = fpPattern.exec(data)) !== null) {
          const fpContent = match[1];
          const mfrMatch = fpContent.match(/manufacturerName:\s*['"]([^'"]+)['"]/);
          const modelMatch = fpContent.match(/modelID:\s*['"]([^'"]+)['"]/);

          if (mfrMatch && modelMatch) {
            devices.push({
              zigbeeModels: [mfrMatch[1]],
              model: modelMatch[1],
              vendor: 'Tuya',
              description: 'From fingerprint',
              hasFingerprint: true,
            });
          }
        }

        console.log(`  Found ${devices.length} device definitions`);
        resolve(devices);
      });
    }).on('error', () => resolve([]));
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// ANALYZE ALL GIT VERSIONS
// ═══════════════════════════════════════════════════════════════════════════

function analyzeGitVersions() {
  console.log('\n📜 Analyzing git history...');

  // Get all commits that modified driver files
  const commits = execSync('git log --oneline --all -- drivers/ | head -100', { encoding: 'utf8' })
    .split('\n')
    .filter(l => l)
    .map(l => l.split(' ')[0]);

  console.log(`  Found ${commits.length} commits affecting drivers`);

  const allManufacturers = new Map(); // mfr -> { commits: [], drivers: [], modelIds: [] }

  for (const commit of commits.slice(0, 50)) { // Analyze last 50 commits
    try {
      const driversOutput = execSync(`git ls-tree --name-only ${commit}:drivers/ 2>nul`, { encoding: 'utf8' });
      const driverDirs = driversOutput.split('\n').filter(d => d);

      for (const driver of driverDirs) {
        try {
          execSync(`git show ${commit}:drivers/${driver}/driver.compose.json > temp_commit.json 2>nul`);
          const config = JSON.parse(fs.readFileSync('temp_commit.json', 'utf8'));
          const mfrs = config.zigbee?.manufacturerName || [];
          const productId = config.zigbee?.productId || [];

          for (const mfr of mfrs) {
            if (!allManufacturers.has(mfr)) {
              allManufacturers.set(mfr, { commits: new Set(), drivers: new Set(), productIds: new Set() });
            }
            allManufacturers.get(mfr).commits.add(commit);
            allManufacturers.get(mfr).drivers.add(driver);
            productId.forEach(p => allManufacturers.get(mfr).productIds.add(p));
          }
        } catch { }
      }
    } catch { }
  }

  try { fs.unlinkSync('temp_commit.json'); } catch { }

  console.log(`  Found ${allManufacturers.size} unique manufacturers across history`);

  return allManufacturers;
}

// ═══════════════════════════════════════════════════════════════════════════
// IDENTIFY AMBIGUOUS MANUFACTURERS
// ═══════════════════════════════════════════════════════════════════════════

function identifyAmbiguous(manufacturers, z2mDevices) {
  console.log('\n🔍 Identifying ambiguous manufacturers...');

  const ambiguous = [];

  for (const [mfr, data] of manufacturers) {
    const drivers = [...data.drivers];

    // If same manufacturer is in very different driver types, it's ambiguous
    if (drivers.length > 3) {
      const categories = new Set();
      for (const d of drivers) {
        if (d.includes('sensor')) categories.add('sensor');
        else if (d.includes('switch')) categories.add('switch');
        else if (d.includes('plug')) categories.add('plug');
        else if (d.includes('bulb') || d.includes('led')) categories.add('light');
        else if (d.includes('button')) categories.add('button');
        else if (d.includes('curtain') || d.includes('shutter')) categories.add('cover');
        else if (d.includes('thermostat')) categories.add('climate');
        else categories.add('other');
      }

      if (categories.size > 2) {
        ambiguous.push({
          manufacturer: mfr,
          drivers,
          categories: [...categories],
          needsFingerprint: true,
        });
      }
    }
  }

  console.log(`  Found ${ambiguous.length} ambiguous manufacturers`);

  // Check Z2M for real device info
  for (const amb of ambiguous) {
    const z2mMatch = z2mDevices.filter(d =>
      d.zigbeeModels.some(m => m.toLowerCase() === amb.manufacturer.toLowerCase())
    );

    if (z2mMatch.length > 0) {
      amb.z2mInfo = z2mMatch.map(d => ({
        model: d.model,
        vendor: d.vendor,
        description: d.description,
      }));
    }
  }

  return ambiguous;
}

// ═══════════════════════════════════════════════════════════════════════════
// GET CURRENT PROJECT STATE
// ═══════════════════════════════════════════════════════════════════════════

function getCurrentManufacturers() {
  const current = new Map();
  const driversDir = path.join(PROJECT_ROOT, 'drivers');
  const drivers = fs.readdirSync(driversDir, { withFileTypes: true }).filter(d => d.isDirectory());

  for (const driver of drivers) {
    const configPath = path.join(driversDir, driver.name, 'driver.compose.json');
    if (!fs.existsSync(configPath)) continue;

    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const mfrs = config.zigbee?.manufacturerName || [];
      const productIds = config.zigbee?.productId || [];

      for (const mfr of mfrs) {
        if (!current.has(mfr)) {
          current.set(mfr, { drivers: new Set(), productIds: new Set() });
        }
        current.get(mfr).drivers.add(driver.name);
        productIds.forEach(p => current.get(mfr).productIds.add(p));
      }
    } catch { }
  }

  return current;
}

// ═══════════════════════════════════════════════════════════════════════════
// ENRICH WITH MISSING MANUFACTURERS
// ═══════════════════════════════════════════════════════════════════════════

function enrichMissing(historyMfrs, currentMfrs, z2mDevices) {
  console.log('\n📥 Enriching missing manufacturers...');

  const missing = [];

  for (const [mfr, data] of historyMfrs) {
    if (!currentMfrs.has(mfr)) {
      // Find best driver from Z2M
      const z2mMatch = z2mDevices.find(d =>
        d.zigbeeModels.some(m => m.toLowerCase() === mfr.toLowerCase())
      );

      let suggestedDriver = null;
      if (z2mMatch) {
        const desc = z2mMatch.description.toLowerCase();
        if (desc.includes('temperature') || desc.includes('humidity') || desc.includes('sensor')) {
          suggestedDriver = 'climate_sensor';
        } else if (desc.includes('switch') || desc.includes('relay')) {
          suggestedDriver = 'switch_1gang';
        } else if (desc.includes('plug') || desc.includes('socket')) {
          suggestedDriver = 'plug_smart';
        } else if (desc.includes('dimmer')) {
          suggestedDriver = 'dimmer_wall_1gang';
        } else if (desc.includes('curtain') || desc.includes('blind') || desc.includes('cover')) {
          suggestedDriver = 'curtain_motor';
        } else if (desc.includes('motion') || desc.includes('pir')) {
          suggestedDriver = 'motion_sensor';
        } else if (desc.includes('door') || desc.includes('contact')) {
          suggestedDriver = 'contact_sensor';
        } else if (desc.includes('button') || desc.includes('remote')) {
          suggestedDriver = 'button_wireless_1';
        } else if (desc.includes('thermostat') || desc.includes('trv') || desc.includes('valve')) {
          suggestedDriver = 'thermostat_tuya_dp';
        } else if (desc.includes('bulb') || desc.includes('light')) {
          suggestedDriver = 'bulb_rgb';
        }
      }

      // Use history driver if no Z2M match
      if (!suggestedDriver && data.drivers.size > 0) {
        suggestedDriver = [...data.drivers][0];
      }

      missing.push({
        manufacturer: mfr,
        suggestedDriver: suggestedDriver || 'zigbee_universal',
        z2mInfo: z2mMatch ? {
          model: z2mMatch.model,
          description: z2mMatch.description,
        } : null,
        historyDrivers: [...data.drivers],
      });
    }
  }

  console.log(`  Found ${missing.length} missing manufacturers`);

  return missing;
}

// ═══════════════════════════════════════════════════════════════════════════
// APPLY ENRICHMENT
// ═══════════════════════════════════════════════════════════════════════════

function applyEnrichment(missing) {
  console.log('\n✏️ Applying enrichment...');

  const driversDir = path.join(PROJECT_ROOT, 'drivers');
  let added = 0;
  const byDriver = new Map();

  for (const item of missing) {
    const driver = item.suggestedDriver;
    if (!byDriver.has(driver)) byDriver.set(driver, []);
    byDriver.get(driver).push(item.manufacturer);
  }

  for (const [driver, mfrs] of byDriver) {
    const configPath = path.join(driversDir, driver, 'driver.compose.json');
    if (!fs.existsSync(configPath)) {
      // Fallback to zigbee_universal
      const fallbackPath = path.join(driversDir, 'zigbee_universal', 'driver.compose.json');
      if (fs.existsSync(fallbackPath)) {
        const config = JSON.parse(fs.readFileSync(fallbackPath, 'utf8'));
        const existing = new Set(config.zigbee?.manufacturerName || []);
        let addedHere = 0;

        for (const mfr of mfrs) {
          if (!existing.has(mfr)) {
            existing.add(mfr);
            addedHere++;
          }
        }

        if (addedHere > 0) {
          config.zigbee.manufacturerName = [...existing].sort();
          fs.writeFileSync(fallbackPath, JSON.stringify(config, null, 2));
          console.log(`  zigbee_universal (fallback): +${addedHere}`);
          added += addedHere;
        }
      }
      continue;
    }

    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const existing = new Set(config.zigbee?.manufacturerName || []);
      let addedHere = 0;

      for (const mfr of mfrs) {
        if (!existing.has(mfr)) {
          existing.add(mfr);
          addedHere++;
        }
      }

      if (addedHere > 0) {
        config.zigbee.manufacturerName = [...existing].sort();
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        console.log(`  ${driver}: +${addedHere}`);
        added += addedHere;
      }
    } catch { }
  }

  return added;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('════════════════════════════════════════════════════════════════');
  console.log('🔬 SMART FINGERPRINT ANALYSIS & ENRICHMENT');
  console.log('════════════════════════════════════════════════════════════════');

  // 1. Fetch Z2M database
  const z2mDevices = await fetchZ2MDevices();

  // 2. Analyze git history
  const historyMfrs = analyzeGitVersions();

  // 3. Get current state
  const currentMfrs = getCurrentManufacturers();
  console.log(`\n📦 Current project: ${currentMfrs.size} unique manufacturers`);

  // 4. Identify ambiguous
  const ambiguous = identifyAmbiguous(historyMfrs, z2mDevices);

  // 5. Find missing
  const missing = enrichMissing(historyMfrs, currentMfrs, z2mDevices);

  // 6. Apply enrichment
  const added = applyEnrichment(missing);

  // 7. Save analysis report
  const report = {
    generated: new Date().toISOString(),
    z2mDevices: z2mDevices.length,
    historyManufacturers: historyMfrs.size,
    currentManufacturers: currentMfrs.size,
    ambiguousManufacturers: ambiguous.length,
    missingManufacturers: missing.length,
    added,
    ambiguousDetails: ambiguous.slice(0, 20),
  };

  fs.writeFileSync(
    path.join(PROJECT_ROOT, 'data', 'FINGERPRINT_ANALYSIS.json'),
    JSON.stringify(report, null, 2)
  );

  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('📊 RESULTS');
  console.log('════════════════════════════════════════════════════════════════');
  console.log(`  Z2M devices: ${z2mDevices.length}`);
  console.log(`  History manufacturers: ${historyMfrs.size}`);
  console.log(`  Current manufacturers: ${currentMfrs.size}`);
  console.log(`  Ambiguous (multi-category): ${ambiguous.length}`);
  console.log(`  Added: ${added}`);
  console.log('════════════════════════════════════════════════════════════════');
}

if (require.main === module) {
  main().catch(console.error);
}
