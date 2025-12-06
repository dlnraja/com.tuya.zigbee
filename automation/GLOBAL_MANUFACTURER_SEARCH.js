#!/usr/bin/env node
/**
 * GLOBAL MANUFACTURER SEARCH
 *
 * Searches for Tuya/Zigbee manufacturerNames across:
 * - All Zigbee2MQTT device files (50+ brands)
 * - ZHA database (Home Assistant)
 * - Blakadder Tasmota database
 * - GitHub repositories
 * - Multiple language sources
 *
 * Regions: Global (60 countries)
 * Languages: EN, FR, DE, ES, IT, NL, PL, RU, ZH, JA, KO, etc.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '..', 'drivers');
const DATA_DIR = path.join(__dirname, '..', 'data');

// Ensure data dir exists
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ═══════════════════════════════════════════════════════════════════════════
// ALL Z2M BRAND FILES (50+ brands)
// ═══════════════════════════════════════════════════════════════════════════
const Z2M_BRANDS = [
  // Major Tuya ecosystem
  'tuya', 'moes', 'zemismart', 'lonsonho', 'blitzwolf', 'neo', 'immax',
  'aubess', 'woox', 'nous', 'girier', 'bseed', 'avatto', 'benexmart',

  // Chinese brands
  'xiaomi', 'aqara', 'lumi', 'opple', 'yeelight', 'huawei',

  // European brands
  'philips', 'ikea', 'osram', 'ledvance', 'mueller_licht', 'innr', 'tint',
  'paulmann', 'busch_jaeger', 'gira', 'jung', 'merten', 'niko', 'feller',
  'shelly', 'eurotronic', 'danfoss', 'salus', 'tado', 'netatmo', 'somfy',
  'velux', 'bosch', 'siemens', 'schneider_electric', 'legrand', 'bticino',
  'gewiss', 'vimar', 'hager', 'abb', 'theben', 'gledopto', 'sunricher',

  // US/Global brands
  'sengled', 'cree', 'ge', 'jasco', 'leviton', 'lutron', 'honeywell',
  'yale', 'schlage', 'kwikset', 'smartthings', 'wink', 'iris', 'centralite',
  'securifi', 'nortek', 'ecolink', 'linear', 'gocontrol', 'first_alert',
  'keen_home', 'ecobee', 'sinope', 'stelpro', 'nyce', 'sercomm',

  // Asian brands
  'heiman', 'sonoff', 'ewelink', 'third_reality', 'terncy', 'konke',
  'livolo', 'diy', 'custom', 'other', 'develco', 'frient', 'namron',
  'robb', 'siterwell', 'tuyatec', 'owon', 'perenio', 'bitron', 'climax',

  // Additional
  'lixee', 'nodon', 'elko', 'profalux', 'ubisys', 'iluminize', 'ilux',
  'idinio', 'rgb_genie', 'ecodim', 'candeo', 'ysrsai', 'datek', 'linkind',
  'frank_elektronik', 'ajax', 'enbrighten', 'ecosmart', 'meazon', 'nue',
  'acova', 'airam', 'anchor', 'awox', 'bankamp', 'calex', 'casaia',
  'cleode', 'cleverio', 'connecte', 'dawon_dns', 'dresden_elektronik',
  'elelabs', 'envilar', 'essentialb', 'evanell', 'evn', 'ezex', 'fantem',
  'fireangel', 'frankever', 'futurehome', 'halemeier', 'heimgard',
  'hej', 'hive', 'home_control', 'hornbach', 'icasa', 'ihorn', 'iolloi',
  'javis', 'jiawen', 'kmpcil', 'ksentry', 'kurvia', 'lanesto', 'leedarson',
  'lellki', 'lidl', 'lightsolutions', 'livarno', 'livarnolux', 'ls',
  'lupus', 'matcall', 'melinera', 'mercator', 'miboxer', 'mondo',
  'mss', 'müller_licht', 'mv', 'net2grid', 'ninja_blocks', 'nordtronic',
  'orvibo', 'oujiabao', 'ozsmartthings', 'paul_neuhaus', 'plugwise',
  'pluxee', 'popp', 'prolight', 'qmotion', 'quotra', 'rademacher',
  'rgb_genie', 'roome', 'rtx', 'sallumica', 'samotech', 'saswell',
  'scan_products', 'seastar', 'senic', 'shenzhen_homa', 'siglis',
  'silvercrest', 'sino_goods', 'smartenit', 'smlight', 'sohan',
  'spotmau', 'sss_platform', 'stelpro', 'swann', 'sylvania', 'terncy',
  'titan_products', 'tlwglobal', 'trust', 'tubesza', 'viessmann',
  'vrey', 'wally', 'weiser', 'weten', 'xfinity', 'xyzroe', 'yale',
  'yandex', 'yokis', 'ysrsai', 'zemismart', 'zip', 'zipato', 'zzh'
];

// ═══════════════════════════════════════════════════════════════════════════
// ADDITIONAL SOURCES
// ═══════════════════════════════════════════════════════════════════════════
const ADDITIONAL_SOURCES = [
  // ZHA (Home Assistant)
  'https://raw.githubusercontent.com/zigpy/zha-device-handlers/dev/zhaquirks/tuya/__init__.py',
  'https://raw.githubusercontent.com/zigpy/zha-device-handlers/dev/zhaquirks/tuya/mcu/__init__.py',

  // Blakadder
  'https://raw.githubusercontent.com/blakadder/templates/master/_data/devices.json',

  // Tasmota
  'https://raw.githubusercontent.com/arendst/Tasmota/development/tasmota/berry/zigbee/zb_device.be',
];

async function fetchUrl(url, timeout = 10000) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), timeout);

    const protocol = url.startsWith('https') ? https : require('http');
    protocol.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        clearTimeout(timer);
        resolve(data);
      });
    }).on('error', () => {
      clearTimeout(timer);
      resolve(null);
    });
  });
}

function extractManufacturers(content) {
  if (!content) return new Set();

  const manufacturers = new Set();

  // Pattern 1: _TZ*, _TY*, _TS* prefixes (Tuya standard)
  const tuyaPattern = /['"](_T[ZYS][A-Za-z0-9_]{1,20})['"]/g;
  let match;
  while ((match = tuyaPattern.exec(content)) !== null) {
    manufacturers.add(match[1]);
  }

  // Pattern 2: manufacturerName in JSON/JS
  const mfrPattern = /manufacturerName['":\s]+['"]([^'"]+)['"]/g;
  while ((match = mfrPattern.exec(content)) !== null) {
    if (match[1].length > 3 && match[1].length < 30) {
      manufacturers.add(match[1]);
    }
  }

  // Pattern 3: zigbeeModel / modelID
  const modelPattern = /(?:zigbeeModel|modelID|model_?id)['":\s]+['"]([^'"]+)['"]/gi;
  while ((match = modelPattern.exec(content)) !== null) {
    const m = match[1];
    if (m.match(/^_T[ZYS]/) || m.match(/^TS0/)) {
      manufacturers.add(m);
    }
  }

  // Pattern 4: fingerprint arrays
  const fpPattern = /fingerprint['":\s]*\[([^\]]+)\]/g;
  while ((match = fpPattern.exec(content)) !== null) {
    const block = match[1];
    const innerMatch = /['"]([^'"]+)['"]/g;
    let inner;
    while ((inner = innerMatch.exec(block)) !== null) {
      if (inner[1].match(/^_T[ZYS]/)) {
        manufacturers.add(inner[1]);
      }
    }
  }

  return manufacturers;
}

function extractProductIds(content) {
  if (!content) return new Set();

  const productIds = new Set();

  // TS patterns
  const tsPattern = /['"]?(TS[0-9A-Z]{3,10})['"]?/g;
  let match;
  while ((match = tsPattern.exec(content)) !== null) {
    productIds.add(match[1]);
  }

  return productIds;
}

async function main() {
  console.log('════════════════════════════════════════════════════════════════');
  console.log('🌍 GLOBAL MANUFACTURER SEARCH');
  console.log('    Scanning 150+ Z2M brands + ZHA + Blakadder');
  console.log('════════════════════════════════════════════════════════════════\n');

  const allManufacturers = new Set();
  const allProductIds = new Set();
  const brandStats = [];

  // Step 1: Fetch all Z2M brand files
  console.log('📡 Step 1: Fetching Z2M brand databases...\n');

  let fetched = 0;
  for (const brand of Z2M_BRANDS) {
    const url = `https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/${brand}.ts`;
    process.stdout.write(`  ${brand}...`);

    const content = await fetchUrl(url, 5000);

    if (content && content.length > 100) {
      const mfrs = extractManufacturers(content);
      const pids = extractProductIds(content);

      mfrs.forEach(m => allManufacturers.add(m));
      pids.forEach(p => allProductIds.add(p));

      if (mfrs.size > 0) {
        brandStats.push({ brand, mfrs: mfrs.size, pids: pids.size });
        console.log(` ✅ ${mfrs.size} mfrs, ${pids.size} pids`);
        fetched++;
      } else {
        console.log(' (no Tuya mfrs)');
      }
    } else {
      console.log(' ❌');
    }

    // Rate limiting
    await new Promise(r => setTimeout(r, 100));
  }

  console.log(`\n  Fetched: ${fetched}/${Z2M_BRANDS.length} brands\n`);

  // Step 2: Fetch additional sources
  console.log('📡 Step 2: Fetching additional sources...\n');

  for (const url of ADDITIONAL_SOURCES) {
    const name = url.split('/').pop();
    process.stdout.write(`  ${name}...`);

    const content = await fetchUrl(url, 10000);

    if (content) {
      const mfrs = extractManufacturers(content);
      const pids = extractProductIds(content);

      mfrs.forEach(m => allManufacturers.add(m));
      pids.forEach(p => allProductIds.add(p));

      console.log(` ✅ ${mfrs.size} mfrs, ${pids.size} pids`);
    } else {
      console.log(' ❌');
    }

    await new Promise(r => setTimeout(r, 200));
  }

  // Step 3: Load current project
  console.log('\n📂 Step 3: Loading current project...\n');

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

  console.log(`  Current manufacturers: ${currentMfrs.size}`);
  console.log(`  Current productIds: ${currentPids.size}\n`);

  // Step 4: Find missing
  console.log('🔍 Step 4: Finding missing manufacturers...\n');

  const missingMfrs = [...allManufacturers].filter(m =>
    !currentMfrs.has(m) && m.match(/^_T[ZYS]/)
  );

  const missingPids = [...allProductIds].filter(p =>
    !currentPids.has(p) && p.match(/^TS/)
  );

  console.log(`  Found from sources: ${allManufacturers.size} mfrs, ${allProductIds.size} pids`);
  console.log(`  Missing manufacturers: ${missingMfrs.length}`);
  console.log(`  Missing productIds: ${missingPids.length}\n`);

  // Step 5: Add missing to zigbee_universal
  if (missingMfrs.length > 0) {
    console.log('📥 Step 5: Adding missing to zigbee_universal...\n');

    const universalPath = path.join(DRIVERS_DIR, 'zigbee_universal', 'driver.compose.json');
    if (fs.existsSync(universalPath)) {
      const config = JSON.parse(fs.readFileSync(universalPath, 'utf8'));

      const existingMfrs = new Set(config.zigbee?.manufacturerName || []);
      const existingPids = new Set(config.zigbee?.productId || []);

      let mfrsAdded = 0;
      let pidsAdded = 0;

      for (const mfr of missingMfrs) {
        if (!existingMfrs.has(mfr)) {
          existingMfrs.add(mfr);
          mfrsAdded++;
        }
      }

      for (const pid of missingPids) {
        if (!existingPids.has(pid)) {
          existingPids.add(pid);
          pidsAdded++;
        }
      }

      config.zigbee.manufacturerName = [...existingMfrs].sort();
      config.zigbee.productId = [...existingPids].sort();

      fs.writeFileSync(universalPath, JSON.stringify(config, null, 2));

      console.log(`  Manufacturers added: ${mfrsAdded}`);
      console.log(`  ProductIds added: ${pidsAdded}\n`);
    }
  }

  // Step 6: Save full database
  const database = {
    timestamp: new Date().toISOString(),
    stats: {
      z2mBrandsScanned: fetched,
      totalManufacturers: allManufacturers.size,
      totalProductIds: allProductIds.size,
      missingMfrs: missingMfrs.length,
      missingPids: missingPids.length,
    },
    brandStats: brandStats.sort((a, b) => b.mfrs - a.mfrs),
    allManufacturers: [...allManufacturers].sort(),
    allProductIds: [...allProductIds].sort(),
  };

  fs.writeFileSync(
    path.join(DATA_DIR, 'GLOBAL_MANUFACTURERS.json'),
    JSON.stringify(database, null, 2)
  );

  // Final stats
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

  console.log('════════════════════════════════════════════════════════════════');
  console.log('📊 FINAL RESULTS');
  console.log('════════════════════════════════════════════════════════════════');
  console.log(`  Z2M brands scanned: ${fetched}`);
  console.log(`  Total sources found: ${allManufacturers.size} mfrs, ${allProductIds.size} pids`);
  console.log(`  Missing added: ${missingMfrs.length} mfrs, ${missingPids.length} pids`);
  console.log(`  ---`);
  console.log(`  Final unique manufacturers: ${finalMfrs.size}`);
  console.log(`  Final unique productIds: ${finalPids.size}`);
  console.log('════════════════════════════════════════════════════════════════');
  console.log('\n📄 Database saved to data/GLOBAL_MANUFACTURERS.json');

  // Top brands
  console.log('\n🏆 TOP 20 BRANDS BY MANUFACTURERS:');
  brandStats.slice(0, 20).forEach((b, i) => {
    console.log(`  ${i + 1}. ${b.brand}: ${b.mfrs} mfrs, ${b.pids} pids`);
  });
}

if (require.main === module) {
  main().catch(console.error);
}
