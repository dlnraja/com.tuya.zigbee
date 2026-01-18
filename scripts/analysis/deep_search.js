const fs = require('fs');
const path = require('path');
const https = require('https');

const missing = fs.readFileSync('truly_missing.txt', 'utf8').trim().split('\n').filter(Boolean);
console.log(`Total missing: ${missing.length}`);

function download(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function main() {
  // Download multiple Z2M files
  const urls = [
    'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/tuya.ts',
  ];

  console.log('Downloading sources...');
  let allData = '';
  for (const url of urls) {
    const data = await download(url);
    allData += data + '\n';
  }
  console.log(`Downloaded ${allData.length} chars`);

  // Search each ID in the full data
  const found = {};
  const notFound = [];

  for (const id of missing) {
    // Try different search patterns
    const patterns = [
      id,
      id.toLowerCase(),
      id.toUpperCase(),
      id.replace(/_/g, ''),
    ];

    let match = false;
    for (const pattern of patterns) {
      const idx = allData.toLowerCase().indexOf(pattern.toLowerCase());
      if (idx !== -1) {
        // Get large context
        const start = Math.max(0, idx - 3000);
        const end = Math.min(allData.length, idx + 3000);
        const context = allData.substring(start, end).toLowerCase();
        found[id] = context;
        match = true;
        break;
      }
    }

    if (!match) notFound.push(id);
  }

  console.log(`\nFound in Z2M: ${Object.keys(found).length}`);
  console.log(`Not found: ${notFound.length}`);

  // Categorize found IDs
  const categories = {};
  const driverMap = {
    'radiator_valve': ['trv', 'radiator', 'valve_position', 'local_temperature_calibration'],
    'thermostat_tuya_dp': ['thermostat', 'heating_setpoint', 'running_state', 'system_mode'],
    'presence_sensor_radar': ['presence', 'radar', 'mmwave', 'target_distance', 'fading_time'],
    'motion_sensor': ['occupancy', 'pir', 'motion_sensitivity'],
    'contact_sensor': ['contact', 'magnet', 'door_window'],
    'water_leak_sensor': ['water_leak', 'leak_water'],
    'smoke_detector': ['smoke', 'gas_value', 'co_value'],
    'siren': ['siren', 'alarm_switch', 'melody', 'volume', 'alarm_time'],
    'climate_sensor': ['temperature', 'humidity', 'soil', 'illuminance', 'formaldehyd', 'voc', 'co2'],
    'plug_smart': ['plug', 'socket', 'power_on_behavior', 'ts011f', 'current', 'voltage'],
    'plug_energy_monitor': ['energy', 'power', 'meter'],
    'dimmer_wall_1gang': ['dimmer', 'brightness', 'level_config', 'ts110'],
    'cover_curtain': ['cover', 'curtain', 'blind', 'shade', 'motor', 'ts130'],
    'light_rgb': ['light', 'bulb', 'color_temp', 'color_xy', 'ts0505', 'ts0502'],
    'button_wireless_1': ['button', 'scene', 'action', 'ts004', 'remote'],
    'switch_1gang': ['switch', 'relay', 'on_off', 'ts0001', 'ts0011', 'ts0121'],
    'ir_blaster': ['ir_code', 'infrared', 'learned_ir', 'ts1201'],
    'lock_smart': ['lock', 'unlock', 'pin_code', 'fingerprint'],
    'valve_irrigation': ['irrigation', 'watering', 'water_consumed']
  };

  for (const [id, context] of Object.entries(found)) {
    let cat = 'climate_sensor'; // default fallback

    for (const [driver, keywords] of Object.entries(driverMap)) {
      for (const kw of keywords) {
        if (context.includes(kw)) {
          cat = driver;
          break;
        }
      }
      if (cat !== 'climate_sensor') break;
    }

    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(id);
  }

  // For not found, use pattern matching
  for (const id of notFound) {
    const idLower = id.toLowerCase();
    let cat = 'climate_sensor'; // Safe default

    // Pattern-based categorization
    if (idLower.includes('tyst11')) {
      cat = 'climate_sensor'; // Old format, usually sensors
    } else if (idLower.includes('tyzb01') || idLower.includes('tyzb02')) {
      cat = 'switch_1gang'; // Standard ZCL, often switches
    } else if (idLower.includes('tze200') || idLower.includes('tze204') || idLower.includes('tze284')) {
      cat = 'climate_sensor'; // Tuya DP, could be anything
    }

    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(id);
  }

  // Summary
  console.log('\n=== CATEGORIZATION ===\n');
  for (const [cat, ids] of Object.entries(categories)) {
    console.log(`${cat}: ${ids.length}`);
  }

  // Add to drivers
  console.log('\n=== ADDING TO DRIVERS ===\n');

  for (const [driver, ids] of Object.entries(categories)) {
    const driverPath = path.join(__dirname, 'drivers', driver, 'driver.compose.json');
    if (!fs.existsSync(driverPath)) {
      console.log(`⚠️ ${driver}: Not found, skipping ${ids.length}`);
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
      console.log(`✅ ${driver}: +${added}`);
    }
  }

  console.log('\nDone!');
}

main().catch(console.error);
