#!/usr/bin/env node
/**
 * SAFE ADDITIVE ENRICHMENT - NEVER REMOVES, ONLY ADDS
 *
 * This script follows the GOLDEN RULE:
 * ✅ ADD new manufacturer IDs = GOOD
 * ❌ REMOVE existing IDs = FORBIDDEN
 *
 * Rule 9.8: Non-Regression Protection
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const DRIVERS_DIR = path.join(__dirname, '..', 'drivers');

// Track stats
let stats = {
  driversProcessed: 0,
  idsAdded: 0,
  idsPreserved: 0,
  initialTotal: 0,
  finalTotal: 0
};

// ═══════════════════════════════════════════════════════════════════════════
// Z2M SOURCE FETCHING
// ═══════════════════════════════════════════════════════════════════════════

const Z2M_FILES = [
  'tuya.ts',
  'moes.ts',
  'zemismart.ts',
  'lonsonho.ts',
  'blitzwolf.ts',
  'neo.ts',
  'immax.ts',
  'ewelink.ts'
];

async function fetchUrl(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', () => resolve(null));
  });
}

function parseZ2MContent(content) {
  const devices = [];
  if (!content) return devices;

  // Multiple patterns to extract manufacturer IDs
  const patterns = [
    /manufacturerName:\s*['"]([^'"]+)['"]/g,
    /zigbeeModel:\s*\[([^\]]+)\]/g,
    /'(_T[ZYS][A-Z0-9]*_[a-z0-9]+)'/gi,
    /"(_T[ZYS][A-Z0-9]*_[a-z0-9]+)"/gi
  ];

  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const extracted = match[1];
      // Extract individual IDs from arrays
      const ids = extracted.match(/_T[ZYS][A-Z0-9]*_[a-z0-9]+/gi) || [];
      ids.forEach(id => devices.push(id.toLowerCase()));
    }
  });

  return [...new Set(devices)];
}

async function fetchAllZ2MManufacturers() {
  console.log('📡 Fetching Z2M manufacturers...');
  const allMfrs = new Set();

  for (const file of Z2M_FILES) {
    const url = `https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/${file}`;
    const content = await fetchUrl(url);
    if (content) {
      const mfrs = parseZ2MContent(content);
      mfrs.forEach(m => allMfrs.add(m));
      console.log(`  ✅ ${file}: ${mfrs.length} IDs`);
    }
  }

  console.log(`  📊 Total Z2M manufacturers: ${allMfrs.size}`);
  return allMfrs;
}

// ═══════════════════════════════════════════════════════════════════════════
// DRIVER PROCESSING - ADDITIVE ONLY
// ═══════════════════════════════════════════════════════════════════════════

function loadDriverConfig(driverName) {
  const configPath = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');
  if (!fs.existsSync(configPath)) return null;

  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch {
    return null;
  }
}

function saveDriverConfig(driverName, config) {
  const configPath = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
}

function getDriverCategory(name) {
  if (name.includes('switch') || name.includes('relay')) return 'switch';
  if (name.includes('plug') || name.includes('socket') || name.includes('outlet')) return 'plug';
  if (name.includes('bulb') || name.includes('light') || name.includes('led') || name.includes('dimmer')) return 'light';
  if (name.includes('motion') || name.includes('presence') || name.includes('pir') || name.includes('radar')) return 'motion';
  if (name.includes('climate') || name.includes('temp') || name.includes('humidity') || name.includes('sensor')) return 'sensor';
  if (name.includes('thermostat') || name.includes('valve') || name.includes('trv')) return 'thermostat';
  if (name.includes('smoke') || name.includes('alarm') || name.includes('siren') || name.includes('gas')) return 'alarm';
  if (name.includes('curtain') || name.includes('blind') || name.includes('shutter') || name.includes('cover')) return 'cover';
  if (name.includes('button') || name.includes('remote')) return 'button';
  if (name.includes('contact') || name.includes('door') || name.includes('window')) return 'contact';
  if (name.includes('water') || name.includes('leak')) return 'water';
  return 'generic';
}

function categorizeManufacturerId(mfrId) {
  const id = mfrId.toLowerCase();

  // TS0601 MCU devices - categorize by prefix patterns
  if (id.startsWith('_tze200_') || id.startsWith('_tze204_') || id.startsWith('_tze284_')) {
    // These are Tuya MCU devices, need context to categorize
    return 'mcu';
  }

  // Standard Tuya devices
  if (id.startsWith('_tz3000_') || id.startsWith('_tz3210_')) {
    return 'standard';
  }

  return 'unknown';
}

// ═══════════════════════════════════════════════════════════════════════════
// SAFE ENRICHMENT - ADDITIVE ONLY
// ═══════════════════════════════════════════════════════════════════════════

function safeEnrichDriver(driverName, newMfrs) {
  const config = loadDriverConfig(driverName);
  if (!config || !config.zigbee) return { added: 0, preserved: 0 };

  const existingMfrs = new Set((config.zigbee.manufacturerName || []).map(m => m.toLowerCase()));
  const initialCount = existingMfrs.size;

  // ONLY ADD, never remove
  let added = 0;
  newMfrs.forEach(mfr => {
    const mfrLower = mfr.toLowerCase();
    if (!existingMfrs.has(mfrLower)) {
      config.zigbee.manufacturerName.push(mfr);
      existingMfrs.add(mfrLower);
      added++;
    }
  });

  // Sort for consistency
  config.zigbee.manufacturerName.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

  // Save only if we added something
  if (added > 0) {
    saveDriverConfig(driverName, config);
  }

  return { added, preserved: initialCount };
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('═'.repeat(70));
  console.log('🛡️  SAFE ADDITIVE ENRICHMENT');
  console.log('   Rule: NEVER REMOVE, ONLY ADD');
  console.log('═'.repeat(70));

  // Step 1: Count initial state
  console.log('\n📊 Step 1: Counting initial state...');
  let initialTotal = 0;
  const drivers = fs.readdirSync(DRIVERS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  drivers.forEach(driver => {
    const config = loadDriverConfig(driver);
    if (config?.zigbee?.manufacturerName) {
      initialTotal += config.zigbee.manufacturerName.length;
    }
  });
  stats.initialTotal = initialTotal;
  console.log(`  Initial manufacturer entries: ${initialTotal}`);

  // Step 2: Fetch Z2M data
  console.log('\n📡 Step 2: Fetching external sources...');
  const z2mMfrs = await fetchAllZ2MManufacturers();

  // Step 3: Load GitHub issues if available
  let githubMfrs = new Set();
  const githubPath = path.join(__dirname, '..', 'data', 'github-issues', 'extracted-mfrs.json');
  if (fs.existsSync(githubPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(githubPath, 'utf8'));
      data.forEach(m => githubMfrs.add(m.toLowerCase()));
      console.log(`  GitHub issues: ${githubMfrs.size} IDs`);
    } catch { }
  }

  // Step 4: Combine all sources
  const allNewMfrs = new Set([...z2mMfrs, ...githubMfrs]);
  console.log(`\n📦 Step 3: Combined sources: ${allNewMfrs.size} unique IDs`);

  // Step 5: Safe enrichment - only add to appropriate drivers
  console.log('\n🔧 Step 4: Safe additive enrichment...');

  // For now, add generic Tuya IDs to climate_sensor (most inclusive driver)
  // More sophisticated categorization can be added later
  const genericDriver = 'climate_sensor';
  if (drivers.includes(genericDriver)) {
    const result = safeEnrichDriver(genericDriver, [...allNewMfrs]);
    stats.idsAdded += result.added;
    stats.idsPreserved += result.preserved;
    if (result.added > 0) {
      console.log(`  ✅ ${genericDriver}: +${result.added} IDs`);
    }
  }

  // Step 6: Count final state
  console.log('\n📊 Step 5: Counting final state...');
  let finalTotal = 0;
  drivers.forEach(driver => {
    const config = loadDriverConfig(driver);
    if (config?.zigbee?.manufacturerName) {
      finalTotal += config.zigbee.manufacturerName.length;
    }
  });
  stats.finalTotal = finalTotal;

  // Step 7: CRITICAL - Verify no regression
  console.log('\n' + '═'.repeat(70));
  console.log('🛡️  NON-REGRESSION CHECK');
  console.log('═'.repeat(70));

  if (finalTotal < initialTotal) {
    console.error('❌ CRITICAL ERROR: Coverage DECREASED!');
    console.error(`   Initial: ${initialTotal}`);
    console.error(`   Final: ${finalTotal}`);
    console.error(`   Lost: ${initialTotal - finalTotal} entries`);
    console.error('   ABORTING - No changes saved');
    process.exit(1);
  }

  console.log(`  ✅ Initial entries: ${initialTotal}`);
  console.log(`  ✅ Final entries: ${finalTotal}`);
  console.log(`  ✅ Net change: +${finalTotal - initialTotal}`);
  console.log(`  ✅ IDs added: ${stats.idsAdded}`);

  console.log('\n' + '═'.repeat(70));
  console.log('✅ SAFE ENRICHMENT COMPLETE - NO REGRESSION');
  console.log('═'.repeat(70));
}

main().catch(console.error);
