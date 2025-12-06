#!/usr/bin/env node
/**
 * SAFE AUDIT - Read-Only Analysis
 *
 * This script NEVER modifies any file.
 * It analyzes drivers and proposes changes with full explanation.
 *
 * Usage: node automation/SAFE_AUDIT.js [driver_name]
 * Example: node automation/SAFE_AUDIT.js smoke_detector_advanced
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const DRIVERS_DIR = path.join(__dirname, '..', 'drivers');

// Generic/Dangerous productIds that need careful handling
const GENERIC_PRODUCT_IDS = ['TS0601', 'TS0001', 'TS0002', 'TS0003', 'TS0004', 'TS0011', 'TS0012', 'TS0013'];

// Device type patterns
const TYPE_PATTERNS = {
  thermostat: ['thermostat', 'trv', 'valve', 'radiator', 'heating', 'climate', 'hvac'],
  sensor_climate: ['temperature', 'humidity', 'temp', 'climate_sensor', 'weather'],
  sensor_motion: ['motion', 'pir', 'occupancy', 'presence', 'mmwave', 'radar'],
  sensor_contact: ['contact', 'door', 'window', 'magnet'],
  sensor_smoke: ['smoke', 'fire', 'co2', 'gas', 'detector'],
  sensor_water: ['water', 'leak', 'flood'],
  switch: ['switch', 'relay', 'gang', 'wall_switch'],
  plug: ['plug', 'socket', 'outlet', 'usb'],
  dimmer: ['dimmer', 'dim'],
  light: ['bulb', 'light', 'lamp', 'led', 'rgb', 'cct', 'white'],
  button: ['button', 'remote', 'scene', 'wireless'],
  cover: ['curtain', 'blind', 'shade', 'roller', 'shutter', 'cover', 'motor'],
  siren: ['siren', 'alarm', 'buzzer'],
  lock: ['lock'],
  soil: ['soil', 'plant'],
};

function getDeviceTypeFromName(driverName) {
  for (const [type, patterns] of Object.entries(TYPE_PATTERNS)) {
    for (const pattern of patterns) {
      if (driverName.toLowerCase().includes(pattern)) {
        return type;
      }
    }
  }
  return 'unknown';
}

async function fetchZ2MData() {
  return new Promise((resolve) => {
    https.get('https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/tuya.ts', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', () => resolve(null));
  });
}

function parseZ2MDeviceType(z2mContent, manufacturerName) {
  if (!z2mContent) return null;

  // Find manufacturer in Z2M and get context
  const mfrIndex = z2mContent.indexOf(manufacturerName);
  if (mfrIndex === -1) return null;

  // Get 2000 chars context
  const context = z2mContent.substring(Math.max(0, mfrIndex - 1000), mfrIndex + 1000).toLowerCase();

  // Determine type from context
  if (context.includes('thermostat') || context.includes('trv') || context.includes('valve')) return 'thermostat';
  if (context.includes('temperature') && context.includes('humidity')) return 'sensor_climate';
  if (context.includes('motion') || context.includes('pir') || context.includes('occupancy')) return 'sensor_motion';
  if (context.includes('presence') || context.includes('radar') || context.includes('mmwave')) return 'sensor_motion';
  if (context.includes('contact') || context.includes('door') || context.includes('window')) return 'sensor_contact';
  if (context.includes('smoke') || context.includes('fire')) return 'sensor_smoke';
  if (context.includes('water') || context.includes('leak')) return 'sensor_water';
  if (context.includes('switch') || context.includes('relay')) return 'switch';
  if (context.includes('plug') || context.includes('socket')) return 'plug';
  if (context.includes('dimmer')) return 'dimmer';
  if (context.includes('light') || context.includes('bulb') || context.includes('led')) return 'light';
  if (context.includes('button') || context.includes('remote') || context.includes('scene')) return 'button';
  if (context.includes('curtain') || context.includes('blind') || context.includes('cover')) return 'cover';
  if (context.includes('siren') || context.includes('alarm')) return 'siren';
  if (context.includes('soil')) return 'soil';

  return 'unknown';
}

function loadAllDrivers() {
  const drivers = new Map();
  const mfrPidMap = new Map(); // "mfr|pid" -> driver

  const driverDirs = fs.readdirSync(DRIVERS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory());

  for (const dir of driverDirs) {
    const configPath = path.join(DRIVERS_DIR, dir.name, 'driver.compose.json');
    if (!fs.existsSync(configPath)) continue;

    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const mfrs = config.zigbee?.manufacturerName || [];
      const pids = config.zigbee?.productId || [];

      drivers.set(dir.name, { mfrs, pids, config });

      // Build collision map
      for (const mfr of mfrs) {
        for (const pid of pids) {
          const key = `${mfr}|${pid}`;
          if (!mfrPidMap.has(key)) {
            mfrPidMap.set(key, []);
          }
          mfrPidMap.get(key).push(dir.name);
        }
      }
    } catch { }
  }

  return { drivers, mfrPidMap };
}

async function auditDriver(driverName, z2mContent, allDrivers) {
  const { drivers, mfrPidMap } = allDrivers;

  if (!drivers.has(driverName)) {
    console.log(`❌ Driver "${driverName}" not found`);
    return;
  }

  const data = drivers.get(driverName);
  const driverType = getDeviceTypeFromName(driverName);

  console.log('════════════════════════════════════════════════════════════════');
  console.log(`🔍 SAFE AUDIT: ${driverName}`);
  console.log('════════════════════════════════════════════════════════════════\n');

  console.log(`📁 Driver Type (from name): ${driverType}`);
  console.log(`📊 Manufacturers: ${data.mfrs.length}`);
  console.log(`📊 ProductIds: ${data.pids.length}`);

  // Check for orphan manufacturers (no productId)
  if (data.pids.length === 0 && data.mfrs.length > 0) {
    console.log('\n⚠️ WARNING: No productId defined - incomplete fingerprint!');
  }

  // Analyze each manufacturer
  console.log('\n📋 MANUFACTURER ANALYSIS:\n');

  const proposals = [];

  for (const mfr of data.mfrs.slice(0, 20)) { // Limit to 20 for readability
    const z2mType = parseZ2MDeviceType(z2mContent, mfr);
    const typeMatch = z2mType === driverType || z2mType === 'unknown';

    // Check for collisions
    const collisions = [];
    for (const pid of [...data.pids, 'TS0601']) {
      const key = `${mfr}|${pid}`;
      const existing = mfrPidMap.get(key) || [];
      const others = existing.filter(d => d !== driverName);
      if (others.length > 0) {
        collisions.push({ pid, drivers: others });
      }
    }

    console.log(`  ${mfr}:`);
    console.log(`    Z2M type: ${z2mType || 'NOT FOUND'}`);
    console.log(`    Type match: ${typeMatch ? '✅' : '❌'}`);

    if (collisions.length > 0) {
      console.log(`    ⚠️ COLLISIONS:`);
      collisions.forEach(c => {
        console.log(`      ${c.pid} also in: ${c.drivers.join(', ')}`);
      });
    }

    // Generate proposal
    if (!typeMatch && z2mType !== 'unknown') {
      proposals.push({
        mfr,
        action: 'MOVE',
        reason: `Z2M says this is ${z2mType}, not ${driverType}`,
        suggestion: `Move to a ${z2mType} driver`,
      });
    } else if (collisions.length > 0) {
      proposals.push({
        mfr,
        action: 'CHECK',
        reason: `Collision detected with ${collisions.map(c => c.drivers.join(', ')).join('; ')}`,
        suggestion: 'Verify which driver should own this manufacturer',
      });
    }

    console.log('');
  }

  if (data.mfrs.length > 20) {
    console.log(`  ... and ${data.mfrs.length - 20} more manufacturers\n`);
  }

  // Check for generic productIds
  const genericPids = data.pids.filter(p => GENERIC_PRODUCT_IDS.includes(p));
  if (genericPids.length > 0) {
    console.log('\n⚠️ GENERIC PRODUCTIDS DETECTED:');
    console.log(`  ${genericPids.join(', ')}`);
    console.log('  These are dangerous - ensure each manufacturerName is coupled correctly!\n');
  }

  // Summary proposals
  if (proposals.length > 0) {
    console.log('════════════════════════════════════════════════════════════════');
    console.log('📝 PROPOSED CHANGES (NOT APPLIED):');
    console.log('════════════════════════════════════════════════════════════════\n');

    proposals.forEach((p, i) => {
      console.log(`${i + 1}. ${p.action}: ${p.mfr}`);
      console.log(`   Reason: ${p.reason}`);
      console.log(`   Suggestion: ${p.suggestion}\n`);
    });

    console.log('⚠️ These changes have NOT been applied.');
    console.log('   Review carefully before implementing manually.\n');
  } else {
    console.log('════════════════════════════════════════════════════════════════');
    console.log('✅ NO ISSUES FOUND');
    console.log('════════════════════════════════════════════════════════════════\n');
  }
}

async function main() {
  const targetDriver = process.argv[2];

  console.log('🔒 SAFE AUDIT MODE - Read Only (No modifications)\n');

  // Fetch Z2M data
  console.log('📡 Fetching Z2M database...');
  const z2mContent = await fetchZ2MData();
  console.log(z2mContent ? '✅ Z2M data loaded\n' : '⚠️ Z2M data not available\n');

  // Load all drivers
  console.log('📂 Loading all drivers...');
  const allDrivers = loadAllDrivers();
  console.log(`✅ Loaded ${allDrivers.drivers.size} drivers\n`);

  if (targetDriver) {
    // Audit specific driver
    await auditDriver(targetDriver, z2mContent, allDrivers);
  } else {
    // List drivers with potential issues
    console.log('════════════════════════════════════════════════════════════════');
    console.log('📋 DRIVERS WITH POTENTIAL ISSUES');
    console.log('════════════════════════════════════════════════════════════════\n');

    const issues = [];

    for (const [driverName, data] of allDrivers.drivers) {
      const hasGenericPid = data.pids.some(p => GENERIC_PRODUCT_IDS.includes(p));
      const noProductId = data.pids.length === 0 && data.mfrs.length > 0;

      if (hasGenericPid || noProductId) {
        issues.push({
          driver: driverName,
          mfrCount: data.mfrs.length,
          pidCount: data.pids.length,
          hasGenericPid,
          noProductId,
        });
      }
    }

    console.log(`Found ${issues.length} drivers with potential issues:\n`);

    issues.slice(0, 30).forEach(i => {
      const flags = [];
      if (i.hasGenericPid) flags.push('🟡 GENERIC_PID');
      if (i.noProductId) flags.push('🔴 NO_PID');
      console.log(`  ${i.driver}: ${i.mfrCount} mfrs, ${i.pidCount} pids ${flags.join(' ')}`);
    });

    if (issues.length > 30) {
      console.log(`  ... and ${issues.length - 30} more`);
    }

    console.log('\n💡 Run with driver name for detailed audit:');
    console.log('   node automation/SAFE_AUDIT.js smoke_detector_advanced\n');
  }
}

if (require.main === module) {
  main().catch(console.error);
}
