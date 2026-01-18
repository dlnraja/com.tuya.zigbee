const fs = require('fs');
const path = require('path');
const https = require('https');

// Read orphans
const orphans = fs.readFileSync('true_orphans_final.txt', 'utf8').trim().split('\n').filter(Boolean);
console.log(`Total orphans to research: ${orphans.length}`);

// Download Z2M tuya.ts for reference
const url = 'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/tuya.ts';

https.get(url, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Downloaded Z2M tuya.ts');

    // Categorize orphans based on Z2M definitions
    const categories = {
      thermostat: [],
      valve: [],
      switch: [],
      dimmer: [],
      plug: [],
      sensor_climate: [],
      sensor_motion: [],
      sensor_contact: [],
      sensor_water: [],
      sensor_smoke: [],
      sensor_presence: [],
      light: [],
      cover: [],
      button: [],
      ir_blaster: [],
      lock: [],
      siren: [],
      unknown: []
    };

    for (const id of orphans) {
      const idLower = id.toLowerCase();

      // Search in Z2M data
      const idx = data.toLowerCase().indexOf(idLower);
      if (idx === -1) {
        categories.unknown.push(id);
        continue;
      }

      // Get context around the match (500 chars before and after)
      const start = Math.max(0, idx - 500);
      const end = Math.min(data.length, idx + 500);
      const context = data.substring(start, end).toLowerCase();

      // Categorize based on keywords
      if (context.includes('trv') || context.includes('radiator') || context.includes('thermostat')) {
        if (context.includes('valve') || context.includes('trv')) {
          categories.valve.push(id);
        } else {
          categories.thermostat.push(id);
        }
      } else if (context.includes('switch') || context.includes('relay')) {
        categories.switch.push(id);
      } else if (context.includes('dimmer') || context.includes('brightness')) {
        categories.dimmer.push(id);
      } else if (context.includes('plug') || context.includes('socket') || context.includes('power_on_behavior')) {
        categories.plug.push(id);
      } else if (context.includes('temperature') && context.includes('humidity')) {
        categories.sensor_climate.push(id);
      } else if (context.includes('occupancy') || context.includes('motion') || context.includes('pir')) {
        categories.sensor_motion.push(id);
      } else if (context.includes('contact') || context.includes('door') || context.includes('window')) {
        categories.sensor_contact.push(id);
      } else if (context.includes('water') || context.includes('leak')) {
        categories.sensor_water.push(id);
      } else if (context.includes('smoke') || context.includes('gas') || context.includes('co2')) {
        categories.sensor_smoke.push(id);
      } else if (context.includes('presence') || context.includes('radar') || context.includes('mmwave')) {
        categories.sensor_presence.push(id);
      } else if (context.includes('light') || context.includes('bulb') || context.includes('color')) {
        categories.light.push(id);
      } else if (context.includes('cover') || context.includes('curtain') || context.includes('blind')) {
        categories.cover.push(id);
      } else if (context.includes('button') || context.includes('remote') || context.includes('scene')) {
        categories.button.push(id);
      } else if (context.includes('ir') || context.includes('infrared')) {
        categories.ir_blaster.push(id);
      } else if (context.includes('lock') || context.includes('fingerprint')) {
        categories.lock.push(id);
      } else if (context.includes('siren') || context.includes('alarm')) {
        categories.siren.push(id);
      } else {
        categories.unknown.push(id);
      }
    }

    // Output results
    console.log('\n=== CATEGORIZATION RESULTS ===\n');
    for (const [cat, ids] of Object.entries(categories)) {
      if (ids.length > 0) {
        console.log(`${cat}: ${ids.length} IDs`);
      }
    }

    // Save categorized results
    fs.writeFileSync('orphans_categorized.json', JSON.stringify(categories, null, 2));
    console.log('\nSaved to orphans_categorized.json');

    // Show what needs to be added to each driver
    console.log('\n=== DRIVER MAPPINGS ===\n');
    const driverMap = {
      thermostat: 'thermostat_tuya_dp',
      valve: 'radiator_valve',
      switch: 'switch_1gang',
      dimmer: 'dimmer_wall_1gang',
      plug: 'plug_smart',
      sensor_climate: 'climate_sensor',
      sensor_motion: 'motion_sensor',
      sensor_contact: 'contact_sensor',
      sensor_water: 'water_leak_sensor',
      sensor_smoke: 'smoke_detector',
      sensor_presence: 'presence_sensor_radar',
      light: 'light_rgb',
      cover: 'cover_curtain',
      button: 'button_wireless_1',
      ir_blaster: 'ir_blaster',
      lock: 'lock_smart',
      siren: 'siren'
    };

    for (const [cat, ids] of Object.entries(categories)) {
      if (ids.length > 0 && cat !== 'unknown') {
        console.log(`\n${driverMap[cat] || cat}: ${ids.length} to add`);
        console.log(ids.slice(0, 5).map(id => `  "${id}"`).join(',\n'));
        if (ids.length > 5) console.log(`  ... and ${ids.length - 5} more`);
      }
    }
  });
}).on('error', err => console.error('Error:', err));
