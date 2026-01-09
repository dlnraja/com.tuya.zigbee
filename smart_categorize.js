const fs = require('fs');
const path = require('path');
const https = require('https');

const missing = fs.readFileSync('truly_missing.txt', 'utf8').trim().split('\n').filter(Boolean);
console.log(`Total missing: ${missing.length}`);

// Download Z2M data
function download(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function main() {
  // Download Z2M tuya.ts
  const z2mUrl = 'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/tuya.ts';
  console.log('Downloading Z2M...');
  const z2mData = await download(z2mUrl);

  // Build a map of manufacturerName -> device info from Z2M
  const z2mDevices = {};

  // Parse fingerprint blocks in Z2M
  const fingerprintRegex = /fingerprint:\s*\[([\s\S]*?)\]/g;
  let match;
  while ((match = fingerprintRegex.exec(z2mData)) !== null) {
    const block = match[1];
    const idMatches = block.match(/['"]_[A-Za-z0-9_]+['"]/g) || [];

    // Get context to determine device type
    const contextStart = Math.max(0, match.index - 2000);
    const contextEnd = Math.min(z2mData.length, match.index + 2000);
    const context = z2mData.substring(contextStart, contextEnd).toLowerCase();

    for (const idMatch of idMatches) {
      const id = idMatch.replace(/['"]/g, '');
      z2mDevices[id.toLowerCase()] = context;
    }
  }

  console.log(`Found ${Object.keys(z2mDevices).length} IDs in Z2M`);

  // Categorize based on Z2M context or pattern matching
  const categories = {
    radiator_valve: [],
    thermostat_tuya_dp: [],
    climate_sensor: [],
    presence_sensor_radar: [],
    motion_sensor: [],
    contact_sensor: [],
    water_leak_sensor: [],
    smoke_detector: [],
    siren: [],
    plug_smart: [],
    plug_energy_monitor: [],
    switch_1gang: [],
    switch_2gang: [],
    switch_3gang: [],
    switch_4gang: [],
    dimmer_wall_1gang: [],
    light_rgb: [],
    cover_curtain: [],
    button_wireless_1: [],
    button_wireless_4: [],
    ir_blaster: [],
    lock_smart: [],
    valve_irrigation: [],
    unknown: []
  };

  for (const id of missing) {
    const idLower = id.toLowerCase();
    let context = z2mDevices[idLower] || '';

    // Determine category
    let category = 'unknown';

    if (context) {
      // Z2M found - use context
      if (context.includes('trv') || context.includes('radiator') || context.includes('valve_position')) {
        category = 'radiator_valve';
      } else if (context.includes('thermostat') || context.includes('heating') || context.includes('running_state')) {
        category = 'thermostat_tuya_dp';
      } else if (context.includes('presence') || context.includes('radar') || context.includes('mmwave') || context.includes('target_distance')) {
        category = 'presence_sensor_radar';
      } else if (context.includes('occupancy') || context.includes('pir') || context.includes('motion')) {
        category = 'motion_sensor';
      } else if (context.includes('contact') || context.includes('magnet')) {
        category = 'contact_sensor';
      } else if (context.includes('water') || context.includes('leak')) {
        category = 'water_leak_sensor';
      } else if (context.includes('smoke') || context.includes('gas') || context.includes('co_')) {
        category = 'smoke_detector';
      } else if (context.includes('siren') || context.includes('alarm_switch') || context.includes('melody')) {
        category = 'siren';
      } else if (context.includes('temperature') || context.includes('humidity') || context.includes('illuminance')) {
        category = 'climate_sensor';
      } else if (context.includes('ts011f') || context.includes('power_on_behavior') || context.includes('energy')) {
        category = 'plug_smart';
      } else if (context.includes('dimmer') || context.includes('brightness') || context.includes('level')) {
        category = 'dimmer_wall_1gang';
      } else if (context.includes('cover') || context.includes('curtain') || context.includes('blind')) {
        category = 'cover_curtain';
      } else if (context.includes('light') || context.includes('bulb') || context.includes('color')) {
        category = 'light_rgb';
      } else if (context.includes('button') || context.includes('scene') || context.includes('action')) {
        category = 'button_wireless_1';
      } else if (context.includes('switch') || context.includes('relay')) {
        category = 'switch_1gang';
      } else if (context.includes('ir_code') || context.includes('infrared')) {
        category = 'ir_blaster';
      } else if (context.includes('lock') || context.includes('fingerprint')) {
        category = 'lock_smart';
      }
    } else {
      // Pattern-based fallback
      if (idLower.includes('tyst11')) {
        // Old Tuya format - usually climate sensors or basic devices
        category = 'climate_sensor';
      }
    }

    categories[category].push(id);
  }

  // Output summary
  console.log('\n=== CATEGORIZATION RESULTS ===\n');
  let total = 0;
  for (const [cat, ids] of Object.entries(categories)) {
    if (ids.length > 0) {
      console.log(`${cat}: ${ids.length}`);
      total += ids.length;
    }
  }
  console.log(`\nTotal categorized: ${total}`);
  console.log(`Unknown: ${categories.unknown.length}`);

  // Save results
  fs.writeFileSync('categorized_ids.json', JSON.stringify(categories, null, 2));

  // Add to drivers
  console.log('\n=== ADDING TO DRIVERS ===\n');

  for (const [driver, ids] of Object.entries(categories)) {
    if (driver === 'unknown' || ids.length === 0) continue;

    const driverPath = path.join(__dirname, 'drivers', driver, 'driver.compose.json');
    if (!fs.existsSync(driverPath)) {
      console.log(`⚠️ ${driver}: Driver not found`);
      continue;
    }

    const data = JSON.parse(fs.readFileSync(driverPath, 'utf8'));
    const existing = new Set(data.zigbee.manufacturerName.map(n => n.toLowerCase()));

    let added = 0;
    for (const id of ids) {
      if (!existing.has(id.toLowerCase())) {
        data.zigbee.manufacturerName.push(id);
        existing.add(id.toLowerCase());
        added++;
      }
    }

    if (added > 0) {
      data.zigbee.manufacturerName.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
      fs.writeFileSync(driverPath, JSON.stringify(data, null, 2) + '\n');
      console.log(`✅ ${driver}: +${added} IDs`);
    }
  }

  console.log('\nDone!');
}

main().catch(console.error);
