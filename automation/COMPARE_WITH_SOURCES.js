#!/usr/bin/env node
/**
 * COMPARE WITH SOURCES
 *
 * Compares current project with:
 * 1. JohanBendz/com.tuya.zigbee (original source)
 * 2. Zigbee2MQTT device database
 * 3. Historical versions
 *
 * Identifies:
 * - Missing manufacturerNames
 * - Missing capabilities
 * - Missing clusters
 * - Removed devices
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const DRIVERS_DIR = path.join(__dirname, '../drivers');
const REPORT_FILE = path.join(__dirname, '../data/COMPARISON_REPORT.json');

// ═══════════════════════════════════════════════════════════════════════════
// HTTP CLIENT
// ═══════════════════════════════════════════════════════════════════════════

async function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Tuya-Comparator/1.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(null);
        }
      });
    }).on('error', reject);
  });
}

async function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Tuya-Comparator/1.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// LOCAL DATA EXTRACTION
// ═══════════════════════════════════════════════════════════════════════════

function extractLocalData() {
  const data = {
    drivers: {},
    allManufacturers: new Set(),
    allCapabilities: new Set(),
    allClusters: new Set(),
    allProductIds: new Set(),
  };

  const drivers = fs.readdirSync(DRIVERS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory());

  for (const driver of drivers) {
    const configPath = path.join(DRIVERS_DIR, driver.name, 'driver.compose.json');
    if (!fs.existsSync(configPath)) continue;

    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

      const driverData = {
        name: driver.name,
        manufacturers: config.zigbee?.manufacturerName || [],
        productIds: config.zigbee?.productId || [],
        capabilities: config.capabilities || [],
        capabilitiesOptions: Object.keys(config.capabilitiesOptions || {}),
        class: config.class,
      };

      data.drivers[driver.name] = driverData;

      // Aggregate
      driverData.manufacturers.forEach(m => data.allManufacturers.add(m));
      driverData.productIds.forEach(p => data.allProductIds.add(p));
      driverData.capabilities.forEach(c => data.allCapabilities.add(c));

    } catch (err) {
      console.error(`Error reading ${driver.name}:`, err.message);
    }
  }

  return {
    ...data,
    allManufacturers: Array.from(data.allManufacturers),
    allCapabilities: Array.from(data.allCapabilities),
    allClusters: Array.from(data.allClusters),
    allProductIds: Array.from(data.allProductIds),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// JOHANBENDZ COMPARISON
// ═══════════════════════════════════════════════════════════════════════════

async function fetchJohanBendzData() {
  console.log('📥 Fetching JohanBendz repository data...');

  const baseUrl = 'https://api.github.com/repos/JohanBendz/com.tuya.zigbee/contents/drivers';

  try {
    const driversResponse = await fetchJSON(baseUrl);
    if (!driversResponse || !Array.isArray(driversResponse)) {
      console.log('⚠️ Could not fetch JohanBendz drivers list');
      return null;
    }

    const data = {
      drivers: {},
      allManufacturers: new Set(),
      allCapabilities: new Set(),
      allProductIds: new Set(),
    };

    let processed = 0;
    for (const driver of driversResponse) {
      if (driver.type !== 'dir') continue;

      const configUrl = `https://raw.githubusercontent.com/JohanBendz/com.tuya.zigbee/master/drivers/${driver.name}/driver.compose.json`;

      try {
        const config = await fetchJSON(configUrl);
        if (!config) continue;

        const driverData = {
          name: driver.name,
          manufacturers: config.zigbee?.manufacturerName || [],
          productIds: config.zigbee?.productId || [],
          capabilities: config.capabilities || [],
          class: config.class,
        };

        data.drivers[driver.name] = driverData;
        driverData.manufacturers.forEach(m => data.allManufacturers.add(m));
        driverData.productIds.forEach(p => data.allProductIds.add(p));
        driverData.capabilities.forEach(c => data.allCapabilities.add(c));

        processed++;
        if (processed % 10 === 0) {
          console.log(`  Processed ${processed} drivers...`);
        }

        // Rate limit
        await new Promise(r => setTimeout(r, 100));
      } catch (err) {
        // Skip individual driver errors
      }
    }

    console.log(`✅ Fetched ${processed} drivers from JohanBendz`);

    return {
      ...data,
      allManufacturers: Array.from(data.allManufacturers),
      allCapabilities: Array.from(data.allCapabilities),
      allProductIds: Array.from(data.allProductIds),
    };
  } catch (err) {
    console.log('⚠️ Error fetching JohanBendz:', err.message);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ZIGBEE2MQTT COMPARISON
// ═══════════════════════════════════════════════════════════════════════════

async function fetchZ2MManufacturers() {
  console.log('📥 Fetching Zigbee2MQTT Tuya manufacturers...');

  const url = 'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/tuya.ts';

  try {
    const content = await fetchText(url);

    // Extract manufacturerName patterns
    const manufacturers = new Set();
    const patterns = [
      /fingerprint:\s*\[[\s\S]*?manufacturerName:\s*['"]([^'"]+)['"]/g,
      /manufacturerName:\s*\[([^\]]+)\]/g,
      /'(_TZ[A-Z0-9_]+)'/g,
      /"(_TZ[A-Z0-9_]+)"/g,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const mfr = match[1];
        if (mfr.startsWith('_TZ') || mfr.startsWith('_TYST') || mfr.startsWith('TUYATEC')) {
          manufacturers.add(mfr);
        }
      }
    }

    console.log(`✅ Found ${manufacturers.size} manufacturers in Z2M`);
    return Array.from(manufacturers);
  } catch (err) {
    console.log('⚠️ Error fetching Z2M:', err.message);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPARISON LOGIC
// ═══════════════════════════════════════════════════════════════════════════

function compareData(local, source, sourceName) {
  const report = {
    source: sourceName,
    timestamp: new Date().toISOString(),

    // What we have that source doesn't
    localOnly: {
      manufacturers: [],
      capabilities: [],
      drivers: [],
    },

    // What source has that we don't
    missingFromLocal: {
      manufacturers: [],
      capabilities: [],
      drivers: [],
    },

    // Detailed per-driver comparison
    driverDiffs: {},
  };

  if (!source) return report;

  // Compare manufacturers
  const localMfrs = new Set(local.allManufacturers);
  const sourceMfrs = new Set(source.allManufacturers);

  report.localOnly.manufacturers = local.allManufacturers.filter(m => !sourceMfrs.has(m));
  report.missingFromLocal.manufacturers = source.allManufacturers.filter(m => !localMfrs.has(m));

  // Compare capabilities
  const localCaps = new Set(local.allCapabilities);
  const sourceCaps = new Set(source.allCapabilities);

  report.localOnly.capabilities = local.allCapabilities.filter(c => !sourceCaps.has(c));
  report.missingFromLocal.capabilities = source.allCapabilities.filter(c => !localCaps.has(c));

  // Compare drivers
  const localDrivers = new Set(Object.keys(local.drivers));
  const sourceDrivers = new Set(Object.keys(source.drivers));

  report.localOnly.drivers = Array.from(localDrivers).filter(d => !sourceDrivers.has(d));
  report.missingFromLocal.drivers = Array.from(sourceDrivers).filter(d => !localDrivers.has(d));

  // Per-driver detailed comparison
  for (const driverName of Object.keys(source.drivers)) {
    if (!local.drivers[driverName]) continue;

    const localDriver = local.drivers[driverName];
    const sourceDriver = source.drivers[driverName];

    const localMfrsSet = new Set(localDriver.manufacturers);
    const sourceMfrsSet = new Set(sourceDriver.manufacturers);

    const missingMfrs = sourceDriver.manufacturers.filter(m => !localMfrsSet.has(m));
    const extraMfrs = localDriver.manufacturers.filter(m => !sourceMfrsSet.has(m));

    if (missingMfrs.length > 0 || extraMfrs.length > 0) {
      report.driverDiffs[driverName] = {
        missingManufacturers: missingMfrs,
        extraManufacturers: extraMfrs,
      };
    }
  }

  return report;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('════════════════════════════════════════════════════════════════');
  console.log('🔍 COMPARE WITH SOURCES');
  console.log('════════════════════════════════════════════════════════════════\n');

  // Extract local data
  console.log('📂 Extracting local data...');
  const localData = extractLocalData();
  console.log(`  Local: ${Object.keys(localData.drivers).length} drivers, ${localData.allManufacturers.length} manufacturers\n`);

  // Fetch JohanBendz
  const johanData = await fetchJohanBendzData();

  // Fetch Z2M
  const z2mManufacturers = await fetchZ2MManufacturers();

  // Compare with JohanBendz
  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('📊 COMPARISON WITH JOHANBENDZ');
  console.log('════════════════════════════════════════════════════════════════');

  const johanReport = compareData(localData, johanData, 'JohanBendz/com.tuya.zigbee');

  if (johanData) {
    console.log(`\n📈 Statistics:`);
    console.log(`  JohanBendz: ${Object.keys(johanData.drivers).length} drivers, ${johanData.allManufacturers.length} manufacturers`);
    console.log(`  Local: ${Object.keys(localData.drivers).length} drivers, ${localData.allManufacturers.length} manufacturers`);

    console.log(`\n✅ Local-only (we added):`);
    console.log(`  Manufacturers: +${johanReport.localOnly.manufacturers.length}`);
    console.log(`  Drivers: +${johanReport.localOnly.drivers.length}`);

    console.log(`\n⚠️ Missing from local (we might have removed):`);
    console.log(`  Manufacturers: ${johanReport.missingFromLocal.manufacturers.length}`);
    console.log(`  Drivers: ${johanReport.missingFromLocal.drivers.length}`);

    if (johanReport.missingFromLocal.manufacturers.length > 0) {
      console.log(`\n🔴 MISSING MANUFACTURERS (first 20):`);
      johanReport.missingFromLocal.manufacturers.slice(0, 20).forEach(m => console.log(`    ${m}`));
    }

    if (johanReport.missingFromLocal.drivers.length > 0) {
      console.log(`\n🔴 MISSING DRIVERS:`);
      johanReport.missingFromLocal.drivers.forEach(d => console.log(`    ${d}`));
    }
  }

  // Compare with Z2M
  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('📊 COMPARISON WITH ZIGBEE2MQTT');
  console.log('════════════════════════════════════════════════════════════════');

  const localMfrsSet = new Set(localData.allManufacturers);
  const z2mOnly = z2mManufacturers.filter(m => !localMfrsSet.has(m));
  const localOnly = localData.allManufacturers.filter(m => !z2mManufacturers.includes(m));

  console.log(`\n📈 Statistics:`);
  console.log(`  Z2M Tuya: ${z2mManufacturers.length} manufacturers`);
  console.log(`  Local: ${localData.allManufacturers.length} manufacturers`);
  console.log(`  In both: ${localData.allManufacturers.filter(m => z2mManufacturers.includes(m)).length}`);
  console.log(`  Z2M-only: ${z2mOnly.length}`);
  console.log(`  Local-only: ${localOnly.length}`);

  // Save full report
  const fullReport = {
    generated: new Date().toISOString(),
    local: {
      driversCount: Object.keys(localData.drivers).length,
      manufacturersCount: localData.allManufacturers.length,
      capabilitiesCount: localData.allCapabilities.length,
    },
    johanBendz: johanReport,
    z2m: {
      manufacturersCount: z2mManufacturers.length,
      z2mOnly: z2mOnly.slice(0, 100),
      localOnly: localOnly.slice(0, 100),
    },
  };

  fs.writeFileSync(REPORT_FILE, JSON.stringify(fullReport, null, 2));
  console.log(`\n📄 Full report saved to: ${REPORT_FILE}`);
}

if (require.main === module) {
  main().catch(console.error);
}
