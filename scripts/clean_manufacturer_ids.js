#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

const Z2M_CLIMATE_SENSORS = [
  '_TZ3000_qaayumkd', '_TZ3000_fllyghyj', '_TZ3000_saiqcn0y', '_TZ3000_lxvlqvcr',
  '_TZ3000_6uzkisv2', '_TZ3000_xr3htd96', '_TZ3000_dowj6gyi', '_TZ3000_8ybe88nf',
  '_TZ3000_0s9gukzt', '_TZ3000_yd2e749y', '_TZE200_bjawzodf', '_TZE200_zl1kmjqx',
  '_TZE200_qoy0ekbd', '_TZE200_znbl8dj5', '_TZE200_a8sdabtg', '_TZE200_locansqn',
  '_TZE204_upagmta9', '_TZE200_pisltm67', '_TZE200_c5dcbw11', '_TZE200_bq5c8xfe',
  '_TZ3000_v1wls0xz', '_TZ3000_rdmubsxv', '_TZ3000_rdmubsxi', '_TZ3000_0uhjfjvg',
  '_TZ3000_rusu2lqk', '_TZ3000_r0rqxlgd', '_TZ3000_awvmkayh', '_TZ3000_itnrsufe',
  '_TZ3000_bguser20', '_TZ3000_6uzkisv2', '_TZ3000_kky16aay', '_TZ3210_alproto2'
];

const SOS_BUTTON_IDS = [
  '_TZ3000_0dumfk2z', '_TZ3000_4fsgukof', '_TZ3000_fsiepnrh', '_TZ3000_wr2ucaj9',
  '_TZ3000_pkfazisv', '_TZ3000_p6ju8myv', '_TZ3000_gjnozsaz', '_TZ3000_ekq0bpbi',
  '_TZ3000_2izubafb', '_TZ3000_rgpqqpb5', '_TZ3000_peszejy7', '_TZ3000_7m8dprrh'
];

const MOTION_SENSOR_IDS = [
  '_TZ3000_mcxw5ehu', '_TZ3000_kmh5qpmb', '_TZ3000_6ygjfyll', '_TZ3000_msl6wxk9',
  '_TZ3000_otvn3lne', '_TZ3000_lf56vpxj', '_TZ3000_decxrtwa', '_TZ3040_6ygjfyll',
  '_TZ3000_bsvqrxru', '_TZ3000_nss8amz9', '_TZ3000_awvmkayh'
];

const CONTACT_SENSOR_IDS = [
  '_TZ3000_n2egfsli', '_TZ3000_26fmupbb', '_TZ3000_oxslv1c9', '_TZ3000_402jjyro',
  '_TZ3000_bzxloft2', '_TZ3000_ydi0apku', '_TZ3000_decxrtwa', '_TZ3000_4ugnzsli'
];

const WATER_LEAK_IDS = [
  '_TZ3000_fsiepnrh', '_TZ3000_kyb656no', '_TZ3000_mugyhz0q', '_TZ3000_awqnvb6a',
  '_TZ3000_t6jrifu4', '_TZ3000_ocjlo4ea', '_TZ3000_82yz3hbz', '_TZ3000_abjodzas'
];

const PLUG_IDS = [
  '_TZ3000_g5xawfcq', '_TZ3000_gjmswpuc', '_TZ3000_rdtixbnu', '_TZ3000_typdpbpg',
  '_TZ3000_w0qqde0g', '_TZ3000_okaz9tjs', '_TZ3000_u5u4cakc', '_TZ3000_cphmq0q7'
];

const DEVICE_TYPE_MAPPINGS = {
  button_sos: SOS_BUTTON_IDS,
  motion_sensor: MOTION_SENSOR_IDS,
  contact_sensor: CONTACT_SENSOR_IDS,
  water_leak_sensor: WATER_LEAK_IDS,
  plug_smart: PLUG_IDS
};

function normalizeId(id) {
  return id.replace(/\r/g, '').replace(/\n/g, '').trim();
}

function deduplicateIds(ids) {
  const seen = new Map();
  const result = [];

  for (const id of ids) {
    const normalized = normalizeId(id);
    const lowerKey = normalized.toLowerCase();

    if (!seen.has(lowerKey)) {
      seen.set(lowerKey, normalized);
      result.push(normalized);
    }
  }

  return result;
}

function categorizeId(id) {
  const normalizedLower = normalizeId(id).toLowerCase();

  for (const [deviceType, knownIds] of Object.entries(DEVICE_TYPE_MAPPINGS)) {
    if (knownIds.some(kid => kid.toLowerCase() === normalizedLower)) {
      return deviceType;
    }
  }

  return 'climate_sensor';
}

async function readJSON(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  return JSON.parse(content);
}

async function writeJSON(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

async function createBackup(filePath) {
  const timestamp = Date.now();
  const backupPath = `${filePath}.backup-clean-${timestamp}`;
  await fs.copyFile(filePath, backupPath);
  return backupPath;
}

async function cleanClimateSensor() {
  console.log('🧹 CLEANING climate_sensor MANUFACTURER IDs\n');

  const composePath = path.join(__dirname, '../drivers/climate_sensor/driver.compose.json');
  const driver = await readJSON(composePath);

  const originalIds = driver.zigbee.manufacturerName;
  console.log(`Original count: ${originalIds.length}`);

  const cleanedIds = deduplicateIds(originalIds);
  console.log(`After deduplication: ${cleanedIds.length}`);

  const toMove = {};
  const toKeep = [];

  for (const id of cleanedIds) {
    const category = categorizeId(id);
    if (category !== 'climate_sensor') {
      if (!toMove[category]) toMove[category] = [];
      toMove[category].push(id);
    } else {
      toKeep.push(id);
    }
  }

  console.log(`\nIDs to KEEP in climate_sensor: ${toKeep.length}`);

  for (const [targetDriver, ids] of Object.entries(toMove)) {
    console.log(`IDs to MOVE to ${targetDriver}: ${ids.length}`);
    ids.forEach(id => console.log(`  - ${id}`));
  }

  toKeep.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

  await createBackup(composePath);

  driver.zigbee.manufacturerName = toKeep;
  await writeJSON(composePath, driver);

  console.log(`\n✅ climate_sensor cleaned: ${originalIds.length} → ${toKeep.length} IDs`);
  console.log(`   Removed: ${originalIds.length - toKeep.length} (duplicates + wrong category)`);

  for (const [targetDriver, ids] of Object.entries(toMove)) {
    await addIdsToDriver(targetDriver, ids);
  }

  return {
    original: originalIds.length,
    cleaned: toKeep.length,
    removed: originalIds.length - toKeep.length,
    moved: toMove
  };
}

async function addIdsToDriver(driverName, idsToAdd) {
  const composePath = path.join(__dirname, '../drivers', driverName, 'driver.compose.json');

  try {
    const driver = await readJSON(composePath);

    if (!driver.zigbee) driver.zigbee = {};
    if (!driver.zigbee.manufacturerName) driver.zigbee.manufacturerName = [];

    const existingLower = driver.zigbee.manufacturerName.map(id => normalizeId(id).toLowerCase());

    let added = 0;
    for (const id of idsToAdd) {
      const normalizedLower = normalizeId(id).toLowerCase();
      if (!existingLower.includes(normalizedLower)) {
        driver.zigbee.manufacturerName.push(normalizeId(id));
        added++;
      }
    }

    if (added > 0) {
      await createBackup(composePath);
      driver.zigbee.manufacturerName.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
      await writeJSON(composePath, driver);
      console.log(`✅ Added ${added} IDs to ${driverName}`);
    }
  } catch (err) {
    console.error(`❌ Cannot add to ${driverName}: ${err.message}`);
  }
}

async function cleanAllDrivers() {
  console.log('🧹 CLEANING ALL DRIVERS - REMOVING \\r AND DUPLICATES\n');

  const driversDir = path.join(__dirname, '../drivers');
  const entries = await fs.readdir(driversDir, { withFileTypes: true });
  const drivers = entries.filter(e => e.isDirectory()).map(e => e.name);

  let totalCleaned = 0;

  for (const driverName of drivers) {
    const composePath = path.join(driversDir, driverName, 'driver.compose.json');

    try {
      const driver = await readJSON(composePath);

      if (!driver.zigbee || !driver.zigbee.manufacturerName) continue;

      const originalIds = driver.zigbee.manufacturerName;
      const cleanedIds = deduplicateIds(originalIds);

      if (originalIds.length !== cleanedIds.length) {
        await createBackup(composePath);
        driver.zigbee.manufacturerName = cleanedIds.sort((a, b) =>
          a.toLowerCase().localeCompare(b.toLowerCase())
        );
        await writeJSON(composePath, driver);

        const removed = originalIds.length - cleanedIds.length;
        console.log(`✅ ${driverName}: ${originalIds.length} → ${cleanedIds.length} (-${removed})`);
        totalCleaned += removed;
      }
    } catch {
    }
  }

  console.log(`\n📊 TOTAL CLEANED: ${totalCleaned} invalid/duplicate IDs removed`);
  return totalCleaned;
}

async function analyzeProductIdAssociations() {
  console.log('\n🔍 ANALYZING PRODUCT ID ASSOCIATIONS\n');

  const driversDir = path.join(__dirname, '../drivers');
  const entries = await fs.readdir(driversDir, { withFileTypes: true });
  const drivers = entries.filter(e => e.isDirectory()).map(e => e.name);

  const productIdMap = {};

  for (const driverName of drivers) {
    const composePath = path.join(driversDir, driverName, 'driver.compose.json');

    try {
      const driver = await readJSON(composePath);

      if (!driver.zigbee) continue;

      const productIds = driver.zigbee.productId || [];
      const manufacturerNames = driver.zigbee.manufacturerName || [];

      for (const productId of productIds) {
        if (!productIdMap[productId]) {
          productIdMap[productId] = { drivers: [], manufacturerCount: 0 };
        }
        productIdMap[productId].drivers.push(driverName);
        productIdMap[productId].manufacturerCount += manufacturerNames.length;
      }
    } catch {
    }
  }

  console.log('PRODUCT ID → DRIVER MAPPING:\n');

  const climateProductIds = ['TS0201', 'RS0201', 'SM0201', 'TH01Z', 'ZG-204ZM'];

  for (const [productId, data] of Object.entries(productIdMap)) {
    if (data.drivers.length > 1 || climateProductIds.includes(productId)) {
      console.log(`${productId}:`);
      for (const driver of data.drivers) {
        console.log(`  - ${driver}`);
      }
    }
  }

  return productIdMap;
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('MANUFACTURER IDs CLEANUP & REORGANIZATION');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const climateResult = await cleanClimateSensor();

  console.log('\n═══════════════════════════════════════════════════════════════');

  const totalCleaned = await cleanAllDrivers();

  await analyzeProductIdAssociations();

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('FINAL SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log(`climate_sensor: ${climateResult.original} → ${climateResult.cleaned} IDs`);
  console.log(`Total IDs cleaned across all drivers: ${totalCleaned}`);

  const reportPath = path.join(__dirname, '../CLEANUP_REPORT.json');
  await writeJSON(reportPath, {
    timestamp: new Date().toISOString(),
    climateSensor: climateResult,
    totalCleaned
  });

  console.log(`\n📄 Report: ${reportPath}`);
}

if (require.main === module) {
  main()
    .then(() => {
      console.log('\n✅ CLEANUP COMPLETE');
      process.exit(0);
    })
    .catch((err) => {
      console.error('\n❌ ERROR:', err);
      process.exit(1);
    });
}

module.exports = { cleanClimateSensor, cleanAllDrivers };
