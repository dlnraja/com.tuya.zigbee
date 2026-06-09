const fs = require('fs');
const path = require('path');
const https = require('https');

// Read truly missing IDs
const missing = fs.readFileSync('truly_missing.txt', 'utf8').trim().split('\n').filter(Boolean);
console.log(`Total missing IDs: ${missing.length}`);

// Download Z2M tuya.ts
const url = 'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/tuya.ts';

function downloadZ2M() {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
      res.on('error', reject);
    });
  });
}

async function main() {
  console.log('Downloading Z2M tuya.ts...');
  const z2mData = await downloadZ2M();
  console.log('Downloaded Z2M data');

  // Driver mappings based on device keywords in Z2M
  const driverKeywords = {
    'radiator_valve': ['trv', 'radiator_valve', 'valve_position', 'local_temperature_calibration', 'TZE200_e9ba97vf', 'TZE200_husqqvux', 'TZE204_e9ba97vf'],
    'thermostat_tuya_dp': ['thermostat', 'heating_setpoint', 'running_state', 'system_mode', 'away_mode'],
    'climate_sensor': ['temperature', 'humidity', 'soil_moisture', 'illuminance_lux', 'co2', 'formaldehyd', 'voc'],
    'presence_sensor_radar': ['presence', 'radar', 'mmwave', 'target_distance', 'fading_time', 'large_motion'],
    'motion_sensor': ['occupancy', 'pir', 'motion', 'ias_zone', 'occupancy_sensing'],
    'contact_sensor': ['contact', 'door', 'window', 'ias_zone_type.*contact'],
    'water_leak_sensor': ['water_leak', 'leak', 'ias_zone_type.*water'],
    'smoke_detector': ['smoke', 'gas', 'co_detected', 'ias_zone_type.*fire', 'ias_zone_type.*smoke'],
    'siren': ['siren', 'alarm_switch', 'warning', 'volume', 'melody'],
    'plug_smart': ['plug', 'socket', 'power_on_behavior', 'energy', 'power', 'current', 'voltage', 'ts011f'],
    'switch_1gang': ['switch', 'relay', 'on_off', 'ts0001', 'ts0011'],
    'switch_2gang': ['ts0002', 'ts0012'],
    'switch_3gang': ['ts0003', 'ts0013'],
    'switch_4gang': ['ts0004', 'ts0014'],
    'dimmer_wall_1gang': ['dimmer', 'brightness', 'level_control', 'ts0052', 'ts110e'],
    'light_rgb': ['light', 'bulb', 'color', 'color_temp', 'ts0505', 'ts0502', 'ts0503', 'ts0504'],
    'cover_curtain': ['cover', 'curtain', 'blind', 'shade', 'position', 'ts0302', 'ts130f'],
    'button_wireless_1': ['button', 'remote', 'scene', 'action', 'ts0041', 'ts0042', 'ts0043', 'ts0044'],
    'ir_blaster': ['ir_code', 'infrared', 'learned_ir', 'ts1201'],
    'lock_smart': ['lock', 'fingerprint', 'door_lock', 'pin_code'],
    'valve_irrigation': ['irrigation', 'watering', 'valve_state', 'water_consumed']
  };

  // Results
  const toAdd = {};
  const notFound = [];

  for (const id of missing) {
    const idLower = id.toLowerCase();

    // Search in Z2M with case-insensitive
    const searchPattern = idLower.replace(/[_]/g, '[_]');
    const regex = new RegExp(searchPattern, 'i');
    const idx = z2mData.search(regex);

    if (idx === -1) {
      notFound.push(id);
      continue;
    }

    // Get context around match
    const start = Math.max(0, idx - 1500);
    const end = Math.min(z2mData.length, idx + 1500);
    const context = z2mData.substring(start, end).toLowerCase();

    // Find matching driver based on keywords
    let matched = false;
    for (const [driver, keywords] of Object.entries(driverKeywords)) {
      for (const kw of keywords) {
        if (context.includes(kw.toLowerCase())) {
          if (!toAdd[driver]) toAdd[driver] = [];
          if (!toAdd[driver].includes(id)) {
            toAdd[driver].push(id);
          }
          matched = true;
          break;
        }
      }
      if (matched) break;
    }

    if (!matched) {
      notFound.push(id);
    }
  }

  // Output results
  console.log('\n=== CATEGORIZATION COMPLETE ===\n');

  let totalToAdd = 0;
  for (const [driver, ids] of Object.entries(toAdd)) {
    console.log(`${driver}: ${ids.length} IDs`);
    totalToAdd += ids.length;
  }
  console.log(`\nTotal to add: ${totalToAdd}`);
  console.log(`Not found in Z2M: ${notFound.length}`);

  // Save results
  fs.writeFileSync('ids_to_add.json', JSON.stringify(toAdd, null, 2));
  fs.writeFileSync('ids_not_found.txt', notFound.join('\n'));

  console.log('\nSaved to ids_to_add.json and ids_not_found.txt');

  // Now add IDs to drivers
  console.log('\n=== ADDING IDs TO DRIVERS ===\n');

  for (const [driver, ids] of Object.entries(toAdd)) {
    const driverPath = path.join(__dirname, 'drivers', driver, 'driver.compose.json');

    if (!fs.existsSync(driverPath)) {
      console.log(`⚠️ Driver ${driver} not found, skipping ${ids.length} IDs`);
      continue;
    }

    try {
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
        // Sort manufacturerName array
        data.zigbee.manufacturerName.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
        fs.writeFileSync(driverPath, JSON.stringify(data, null, 2) + '\n');
        console.log(`✅ ${driver}: Added ${added} IDs`);
      } else {
        console.log(`⏭️ ${driver}: All IDs already present`);
      }
    } catch (err) {
      console.log(`❌ ${driver}: Error - ${err.message}`);
    }
  }

  console.log('\n=== DONE ===');
}

main().catch(console.error);
