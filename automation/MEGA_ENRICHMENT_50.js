#!/usr/bin/env node
/**
 * MEGA ENRICHMENT - Scan 50 last commits & enrich everything
 *
 * Steps:
 * 1. Fetch ALL Z2M Tuya manufacturers
 * 2. Fetch Z2M from other brands (Moes, Zemismart, etc.)
 * 3. Compare with current project
 * 4. Add missing manufacturers
 * 5. Enrich productIds exhaustively
 * 6. Resolve collisions
 * 7. Validate
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const DRIVERS_DIR = path.join(__dirname, '..', 'drivers');

// Z2M device files to scan
const Z2M_FILES = [
  'tuya.ts',
  'moes.ts',
  'zemismart.ts',
  'lonsonho.ts',
  'blitzwolf.ts',
  'neo.ts',
  'immax.ts',
  'ewelink.ts',
  'other.ts',
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

  // Pattern 1: fingerprint block
  const fp1 = /fingerprint:\s*\[([\s\S]*?)\]/g;
  let match;

  while ((match = fp1.exec(content)) !== null) {
    const block = match[1];
    const mfrMatch = /manufacturerName:\s*['"]([^'"]+)['"]/g;
    const midMatch = /modelID:\s*['"]([^'"]+)['"]/g;

    let m;
    while ((m = mfrMatch.exec(block)) !== null) {
      const mfr = m[1];
      // Find associated modelID
      const midM = midMatch.exec(block);
      const modelId = midM ? midM[1] : null;
      devices.push({ mfr, modelId });
    }
  }

  // Pattern 2: direct manufacturerName + modelID
  const fp2 = /modelID:\s*['"]([^'"]+)['"][^}]*manufacturerName:\s*['"]([^'"]+)['"]/g;
  while ((match = fp2.exec(content)) !== null) {
    devices.push({ mfr: match[2], modelId: match[1] });
  }

  // Pattern 3: reverse order
  const fp3 = /manufacturerName:\s*['"]([^'"]+)['"][^}]*modelID:\s*['"]([^'"]+)['"]/g;
  while ((match = fp3.exec(content)) !== null) {
    devices.push({ mfr: match[1], modelId: match[2] });
  }

  // Pattern 4: zigbeeModel array
  const fp4 = /zigbeeModel:\s*\[([^\]]+)\]/g;
  while ((match = fp4.exec(content)) !== null) {
    const models = match[1].match(/['"]([^'"]+)['"]/g);
    if (models) {
      models.forEach(m => {
        const mfr = m.replace(/['"]/g, '');
        if (mfr.match(/^_T[ZYS]/)) {
          devices.push({ mfr, modelId: null });
        }
      });
    }
  }

  return devices;
}

function getDriverCategory(name) {
  if (name.includes('switch') || name.includes('relay')) return 'switch';
  if (name.includes('plug') || name.includes('socket') || name.includes('outlet')) return 'plug';
  if (name.includes('bulb') || name.includes('light') || name.includes('led') || name.includes('dimmer')) return 'light';
  if (name.includes('motion') || name.includes('presence') || name.includes('pir') || name.includes('radar') || name.includes('mmwave')) return 'motion';
  if (name.includes('climate') || name.includes('temp') || name.includes('humidity') || name.includes('weather')) return 'sensor';
  if (name.includes('thermostat') || name.includes('valve') || name.includes('trv') || name.includes('radiator')) return 'thermostat';
  if (name.includes('smoke') || name.includes('alarm') || name.includes('siren') || name.includes('gas') || name.includes('detector')) return 'alarm';
  if (name.includes('curtain') || name.includes('blind') || name.includes('shutter') || name.includes('cover')) return 'cover';
  if (name.includes('contact') || name.includes('door') || name.includes('window')) return 'contact';
  if (name.includes('water') || name.includes('leak')) return 'water';
  if (name.includes('button') || name.includes('scene') || name.includes('remote')) return 'button';
  if (name.includes('soil')) return 'soil';
  return 'generic';
}

const DRIVER_PRIORITY = {
  climate_sensor: 100, motion_sensor: 100, contact_sensor: 100, water_leak_sensor: 100,
  smoke_detector_advanced: 100, presence_sensor_radar: 100, vibration_sensor: 100, soil_sensor: 100,
  thermostat_tuya_dp: 90, radiator_valve: 90, curtain_motor: 90, plug_energy_monitor: 90,
  switch_1gang: 80, switch_2gang: 80, switch_3gang: 80, switch_4gang: 80,
  plug_smart: 80, dimmer_wall_1gang: 80, button_wireless_1: 80, bulb_rgb: 80,
  temphumidsensor: 70, air_quality_co2: 70, weather_station_outdoor: 70,
  generic_tuya: 10, zigbee_universal: 5,
};

function getDriverPriority(name) {
  for (const [pattern, priority] of Object.entries(DRIVER_PRIORITY)) {
    if (name === pattern || name.includes(pattern)) return priority;
  }
  return 50;
}

async function main() {
  console.log('════════════════════════════════════════════════════════════════');
  console.log('🚀 MEGA ENRICHMENT - Scanning all sources');
  console.log('════════════════════════════════════════════════════════════════\n');

  // Step 1: Fetch all Z2M files
  console.log('📡 Step 1: Fetching Z2M databases...\n');

  const allZ2MDevices = [];

  for (const file of Z2M_FILES) {
    const url = `https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/${file}`;
    console.log(`  Fetching ${file}...`);
    const content = await fetchUrl(url);

    if (content) {
      const devices = parseZ2MContent(content);
      allZ2MDevices.push(...devices);
      console.log(`    ✅ ${devices.length} devices`);
    } else {
      console.log(`    ❌ Failed`);
    }

    await new Promise(r => setTimeout(r, 300));
  }

  // Build mfr -> modelIds map
  const z2mMap = new Map();
  for (const d of allZ2MDevices) {
    if (!z2mMap.has(d.mfr)) z2mMap.set(d.mfr, new Set());
    if (d.modelId) z2mMap.get(d.mfr).add(d.modelId);
  }

  console.log(`\n  Total Z2M manufacturers: ${z2mMap.size}\n`);

  // Step 2: Load current drivers
  console.log('📂 Step 2: Loading current drivers...\n');

  const drivers = fs.readdirSync(DRIVERS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory());

  const driverData = new Map();
  const currentMfrs = new Set();

  for (const driver of drivers) {
    const configPath = path.join(DRIVERS_DIR, driver.name, 'driver.compose.json');
    if (!fs.existsSync(configPath)) continue;

    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const mfrs = config.zigbee?.manufacturerName || [];
      const pids = config.zigbee?.productId || [];

      driverData.set(driver.name, {
        mfrs: new Set(mfrs),
        pids: new Set(pids),
        config,
        configPath,
        category: getDriverCategory(driver.name),
        priority: getDriverPriority(driver.name),
      });

      mfrs.forEach(m => currentMfrs.add(m));
    } catch { }
  }

  console.log(`  Loaded ${driverData.size} drivers`);
  console.log(`  Current manufacturers: ${currentMfrs.size}\n`);

  // Step 3: Find missing manufacturers
  console.log('🔍 Step 3: Finding missing manufacturers...\n');

  const missing = [...z2mMap.keys()].filter(mfr =>
    !currentMfrs.has(mfr) && mfr.match(/^_T[ZYS]/)
  );

  console.log(`  Missing Tuya-compatible: ${missing.length}\n`);

  // Step 4: Add missing to appropriate drivers
  console.log('📥 Step 4: Adding missing manufacturers...\n');

  let mfrsAdded = 0;

  // Add to zigbee_universal as catch-all
  const universalData = driverData.get('zigbee_universal');
  if (universalData && missing.length > 0) {
    for (const mfr of missing) {
      universalData.mfrs.add(mfr);
      mfrsAdded++;

      // Add known productIds
      if (z2mMap.has(mfr)) {
        for (const pid of z2mMap.get(mfr)) {
          universalData.pids.add(pid);
        }
      }
    }
    console.log(`  Added ${mfrsAdded} to zigbee_universal\n`);
  }

  // Step 5: Enrich productIds exhaustively
  console.log('🔄 Step 5: Enriching productIds exhaustively...\n');

  let pidsAdded = 0;

  for (const [driverName, data] of driverData) {
    for (const mfr of data.mfrs) {
      if (z2mMap.has(mfr)) {
        for (const pid of z2mMap.get(mfr)) {
          if (!data.pids.has(pid)) {
            data.pids.add(pid);
            pidsAdded++;
          }
        }
      }
    }
  }

  console.log(`  ProductIds added: ${pidsAdded}\n`);

  // Step 6: Resolve collisions
  console.log('🔧 Step 6: Resolving collisions...\n');

  const mfrToDrivers = new Map();
  for (const [driverName, data] of driverData) {
    for (const mfr of data.mfrs) {
      if (!mfrToDrivers.has(mfr)) mfrToDrivers.set(mfr, []);
      mfrToDrivers.get(mfr).push({ name: driverName, priority: data.priority });
    }
  }

  let collisionsResolved = 0;

  for (const [mfr, driverList] of mfrToDrivers) {
    if (driverList.length > 1) {
      // Sort by priority
      driverList.sort((a, b) => b.priority - a.priority);
      const keepIn = driverList[0].name;

      for (let i = 1; i < driverList.length; i++) {
        const removeFrom = driverList[i].name;
        const data = driverData.get(removeFrom);
        if (data && data.mfrs.has(mfr)) {
          data.mfrs.delete(mfr);
          collisionsResolved++;
        }
      }
    }
  }

  console.log(`  Collisions resolved: ${collisionsResolved}\n`);

  // Step 7: Save all changes
  console.log('💾 Step 7: Saving changes...\n');

  let driversModified = 0;

  for (const [driverName, data] of driverData) {
    const newMfrs = [...data.mfrs].sort();
    const newPids = [...data.pids].sort();

    const oldMfrs = data.config.zigbee?.manufacturerName || [];
    const oldPids = data.config.zigbee?.productId || [];

    if (JSON.stringify(newMfrs) !== JSON.stringify(oldMfrs) ||
      JSON.stringify(newPids) !== JSON.stringify(oldPids)) {

      data.config.zigbee.manufacturerName = newMfrs;
      if (newPids.length > 0) {
        data.config.zigbee.productId = newPids;
      }

      fs.writeFileSync(data.configPath, JSON.stringify(data.config, null, 2));
      driversModified++;
    }
  }

  console.log(`  Drivers modified: ${driversModified}\n`);

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

  // Check remaining collisions
  const finalMfrCheck = new Map();
  for (const driver of drivers) {
    const configPath = path.join(DRIVERS_DIR, driver.name, 'driver.compose.json');
    if (!fs.existsSync(configPath)) continue;
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      (config.zigbee?.manufacturerName || []).forEach(mfr => {
        if (!finalMfrCheck.has(mfr)) finalMfrCheck.set(mfr, 0);
        finalMfrCheck.set(mfr, finalMfrCheck.get(mfr) + 1);
      });
    } catch { }
  }

  const remainingCollisions = [...finalMfrCheck.values()].filter(v => v > 1).length;

  console.log('════════════════════════════════════════════════════════════════');
  console.log('📊 FINAL RESULTS');
  console.log('════════════════════════════════════════════════════════════════');
  console.log(`  Z2M manufacturers scanned: ${z2mMap.size}`);
  console.log(`  Manufacturers added: ${mfrsAdded}`);
  console.log(`  ProductIds added: ${pidsAdded}`);
  console.log(`  Collisions resolved: ${collisionsResolved}`);
  console.log(`  Drivers modified: ${driversModified}`);
  console.log(`  ---`);
  console.log(`  Final unique manufacturers: ${finalMfrs.size}`);
  console.log(`  Final unique productIds: ${finalPids.size}`);
  console.log(`  Remaining collisions: ${remainingCollisions}`);
  console.log('════════════════════════════════════════════════════════════════');

  if (remainingCollisions === 0) {
    console.log('\n🎉 MEGA ENRICHMENT COMPLETE - ALL RULES APPLIED!');
  }
}

if (require.main === module) {
  main().catch(console.error);
}
