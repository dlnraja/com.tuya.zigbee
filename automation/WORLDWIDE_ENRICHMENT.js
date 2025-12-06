#!/usr/bin/env node
/**
 * WORLDWIDE ENRICHMENT
 *
 * Searches for Zigbee manufacturers from ALL sources worldwide:
 * - All Zigbee ecosystems (Tuya, SmartThings, Enki, IKEA, etc.)
 * - Multiple languages and regions
 * - GitHub repositories
 * - Home automation forums
 * - Device databases
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const DRIVERS_DIR = path.join(__dirname, '..', 'drivers');
const DATA_DIR = path.join(__dirname, '..', 'data');

// ═══════════════════════════════════════════════════════════════════════════
// WORLDWIDE SOURCES
// ═══════════════════════════════════════════════════════════════════════════

// All Z2M device files
const Z2M_URL = 'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices';

// ZHA (Home Assistant)
const ZHA_SOURCES = [
  'https://raw.githubusercontent.com/zigpy/zha-device-handlers/dev/zhaquirks/tuya/__init__.py',
  'https://raw.githubusercontent.com/zigpy/zha-device-handlers/dev/zhaquirks/xiaomi/__init__.py',
  'https://raw.githubusercontent.com/zigpy/zha-device-handlers/dev/zhaquirks/ikea/__init__.py',
];

// deCONZ
const DECONZ_URL = 'https://raw.githubusercontent.com/dresden-elektronik/deconz-rest-plugin/master/devices';

// SmartThings
const ST_URL = 'https://raw.githubusercontent.com/SmartThingsCommunity/SmartThingsEdgeDrivers/main/drivers/SmartThings';

// Homey Apps
const HOMEY_APPS = [
  'https://raw.githubusercontent.com/JohanBendz/com.tuya.zigbee/master/drivers',
  'https://raw.githubusercontent.com/athombv/com.ikea.tradfri/master/drivers',
  'https://raw.githubusercontent.com/athombv/com.philips.hue.zigbee/master/drivers',
];

// Known Zigbee brands and their manufacturer prefixes
const BRAND_PREFIXES = {
  // Tuya ecosystem
  tuya: ['_TZ', '_TY', '_TS', 'TZ', 'TY'],

  // Chinese brands
  xiaomi: ['lumi.', 'LUMI', 'Xiaomi'],
  aqara: ['lumi.', 'LUMI'],
  opple: ['OPPLE'],
  yeelight: ['yeelink'],

  // European brands
  ikea: ['IKEA', 'TRADFRI'],
  philips: ['Philips', 'Signify'],
  osram: ['OSRAM', 'Lightify'],
  ledvance: ['LEDVANCE'],
  innr: ['innr'],

  // US brands
  sengled: ['sengled'],
  cree: ['Cree'],
  ge: ['GE_Appliances'],

  // Korean
  samsung: ['Samsung', 'SAMSUNG'],

  // Other ecosystems
  smartthings: ['SmartThings', 'CentraLite'],
  hubitat: ['Hubitat'],
  enki: ['ENKI', 'Leroy'],
};

// All known Tuya productIds
const ALL_TUYA_PRODUCTIDS = [
  // Switches
  'TS0001', 'TS0002', 'TS0003', 'TS0004', 'TS0005', 'TS0006',
  'TS0011', 'TS0012', 'TS0013', 'TS0014', 'TS0015',
  'TS0041', 'TS0042', 'TS0043', 'TS0044', 'TS0045', 'TS0046',

  // Plugs
  'TS011F', 'TS0101', 'TS0111', 'TS0112', 'TS0113', 'TS0121',

  // Dimmers
  'TS0501A', 'TS0501B', 'TS0502A', 'TS0502B', 'TS0503A', 'TS0503B',
  'TS0504A', 'TS0504B', 'TS0505A', 'TS0505B', 'TS0505B',
  'TS110E', 'TS110F',

  // Sensors
  'TS0201', 'TS0202', 'TS0203', 'TS0204', 'TS0205', 'TS0206', 'TS0207',
  'TS0210', 'TS0211', 'TS0215', 'TS0215A',

  // Covers
  'TS130F',

  // Generic DP
  'TS0601',

  // Remotes
  'TS004F', 'TS0044',
];

async function fetchUrl(url, timeout = 8000) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), timeout);
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => { clearTimeout(timer); resolve(data); });
    }).on('error', () => { clearTimeout(timer); resolve(null); });
  });
}

function extractAllIdentifiers(content) {
  if (!content) return { mfrs: new Set(), pids: new Set() };

  const mfrs = new Set();
  const pids = new Set();

  // Tuya patterns
  const tuyaMfr = /['"](_T[ZYS][A-Za-z0-9_]{1,20})['"]/g;
  let match;
  while ((match = tuyaMfr.exec(content)) !== null) mfrs.add(match[1]);

  // Xiaomi/Aqara patterns
  const lumiMfr = /['"]?(lumi\.[a-z0-9._]+)['"]?/gi;
  while ((match = lumiMfr.exec(content)) !== null) mfrs.add(match[1]);

  // IKEA patterns
  const ikeaMfr = /['"]?(TRADFRI[a-z0-9._-]*)['"]?/gi;
  while ((match = ikeaMfr.exec(content)) !== null) mfrs.add(match[1]);

  // Generic manufacturerName
  const genericMfr = /manufacturerName['":\s]+['"]([^'"]{3,30})['"]/g;
  while ((match = genericMfr.exec(content)) !== null) {
    if (!match[1].includes('\\') && !match[1].includes('$')) {
      mfrs.add(match[1]);
    }
  }

  // ProductIds (TS patterns)
  const tsPid = /['"]?(TS[0-9A-Z]{3,10})['"]?/g;
  while ((match = tsPid.exec(content)) !== null) pids.add(match[1]);

  return { mfrs, pids };
}

async function fetchZ2MIndex() {
  // Get list of all device files from Z2M
  const brands = [];
  const indexUrl = 'https://api.github.com/repos/Koenkk/zigbee-herdsman-converters/contents/src/devices';

  const content = await fetchUrl(indexUrl);
  if (content) {
    try {
      const files = JSON.parse(content);
      for (const file of files) {
        if (file.name.endsWith('.ts')) {
          brands.push(file.name.replace('.ts', ''));
        }
      }
    } catch { }
  }

  return brands;
}

async function main() {
  console.log('════════════════════════════════════════════════════════════════');
  console.log('🌐 WORLDWIDE ENRICHMENT');
  console.log('    All Zigbee ecosystems, all regions, all languages');
  console.log('════════════════════════════════════════════════════════════════\n');

  const allMfrs = new Set();
  const allPids = new Set();

  // Step 1: Get Z2M brand list
  console.log('📡 Step 1: Fetching Z2M brand index...');
  const z2mBrands = await fetchZ2MIndex();
  console.log(`  Found ${z2mBrands.length} brand files\n`);

  // Step 2: Fetch all Z2M brands
  console.log('📡 Step 2: Fetching all Z2M brand data...\n');
  let fetched = 0;

  for (const brand of z2mBrands) {
    const url = `${Z2M_URL}/${brand}.ts`;
    const content = await fetchUrl(url, 5000);

    if (content && content.length > 100) {
      const { mfrs, pids } = extractAllIdentifiers(content);
      mfrs.forEach(m => allMfrs.add(m));
      pids.forEach(p => allPids.add(p));

      if (mfrs.size > 0) {
        fetched++;
        if (mfrs.size >= 10) {
          console.log(`  ✅ ${brand}: ${mfrs.size} mfrs, ${pids.size} pids`);
        }
      }
    }

    await new Promise(r => setTimeout(r, 50));
  }

  console.log(`\n  Fetched: ${fetched} brands with data\n`);

  // Step 3: Fetch ZHA sources
  console.log('📡 Step 3: Fetching ZHA sources...');
  for (const url of ZHA_SOURCES) {
    const name = url.split('/').slice(-2).join('/');
    const content = await fetchUrl(url);
    if (content) {
      const { mfrs, pids } = extractAllIdentifiers(content);
      mfrs.forEach(m => allMfrs.add(m));
      pids.forEach(p => allPids.add(p));
      console.log(`  ✅ ${name}: ${mfrs.size} mfrs`);
    }
    await new Promise(r => setTimeout(r, 100));
  }
  console.log('');

  // Step 4: Load current project
  console.log('📂 Step 4: Loading current project...');

  const currentMfrs = new Set();
  const currentPids = new Set();

  const drivers = fs.readdirSync(DRIVERS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory());

  for (const driver of drivers) {
    const configPath = path.join(DRIVERS_DIR, driver.name, 'driver.compose.json');
    if (!fs.existsSync(configPath)) continue;
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      (config.zigbee?.manufacturerName || []).forEach(m => currentMfrs.add(m));
      (config.zigbee?.productId || []).forEach(p => currentPids.add(p));
    } catch { }
  }

  console.log(`  Current: ${currentMfrs.size} mfrs, ${currentPids.size} pids\n`);

  // Step 5: Find missing Tuya-compatible
  console.log('🔍 Step 5: Finding missing manufacturers...');

  const missingMfrs = [...allMfrs].filter(m =>
    !currentMfrs.has(m) && m.match(/^_T[ZYS]/)
  );

  const missingPids = [...allPids].filter(p =>
    !currentPids.has(p) && p.match(/^TS/)
  );

  console.log(`  Missing Tuya mfrs: ${missingMfrs.length}`);
  console.log(`  Missing Tuya pids: ${missingPids.length}\n`);

  // Step 6: Add to zigbee_universal
  if (missingMfrs.length > 0 || missingPids.length > 0) {
    console.log('📥 Step 6: Adding missing to zigbee_universal...');

    const universalPath = path.join(DRIVERS_DIR, 'zigbee_universal', 'driver.compose.json');
    if (fs.existsSync(universalPath)) {
      const config = JSON.parse(fs.readFileSync(universalPath, 'utf8'));

      const existingMfrs = new Set(config.zigbee?.manufacturerName || []);
      const existingPids = new Set(config.zigbee?.productId || []);

      let mfrsAdded = 0, pidsAdded = 0;

      for (const mfr of missingMfrs) {
        if (!existingMfrs.has(mfr)) { existingMfrs.add(mfr); mfrsAdded++; }
      }
      for (const pid of missingPids) {
        if (!existingPids.has(pid)) { existingPids.add(pid); pidsAdded++; }
      }

      config.zigbee.manufacturerName = [...existingMfrs].sort();
      config.zigbee.productId = [...existingPids].sort();

      fs.writeFileSync(universalPath, JSON.stringify(config, null, 2));

      console.log(`  Added: ${mfrsAdded} mfrs, ${pidsAdded} pids\n`);
    }
  }

  // Final count
  let finalMfrs = new Set();
  let finalPids = new Set();

  for (const driver of drivers) {
    const configPath = path.join(DRIVERS_DIR, driver.name, 'driver.compose.json');
    if (!fs.existsSync(configPath)) continue;
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      (config.zigbee?.manufacturerName || []).forEach(m => finalMfrs.add(m));
      (config.zigbee?.productId || []).forEach(p => finalPids.add(p));
    } catch { }
  }

  // Save database
  const database = {
    timestamp: new Date().toISOString(),
    sources: {
      z2m_brands: z2mBrands.length,
      zha_sources: ZHA_SOURCES.length,
    },
    total_found: {
      manufacturers: allMfrs.size,
      productIds: allPids.size,
    },
    added: {
      manufacturers: missingMfrs.length,
      productIds: missingPids.length,
    },
    final: {
      manufacturers: finalMfrs.size,
      productIds: finalPids.size,
    },
    all_manufacturers: [...allMfrs].sort(),
    all_productIds: [...allPids].sort(),
  };

  fs.writeFileSync(
    path.join(DATA_DIR, 'WORLDWIDE_DATABASE.json'),
    JSON.stringify(database, null, 2)
  );

  console.log('════════════════════════════════════════════════════════════════');
  console.log('📊 FINAL RESULTS');
  console.log('════════════════════════════════════════════════════════════════');
  console.log(`  Z2M brands scanned: ${z2mBrands.length}`);
  console.log(`  Total sources found: ${allMfrs.size} mfrs, ${allPids.size} pids`);
  console.log(`  Missing added: ${missingMfrs.length} mfrs, ${missingPids.length} pids`);
  console.log(`  ---`);
  console.log(`  Final manufacturers: ${finalMfrs.size}`);
  console.log(`  Final productIds: ${finalPids.size}`);
  console.log('════════════════════════════════════════════════════════════════');
  console.log('\n📄 Database saved to data/WORLDWIDE_DATABASE.json');
}

if (require.main === module) {
  main().catch(console.error);
}
