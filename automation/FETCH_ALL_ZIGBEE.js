#!/usr/bin/env node
/**
 * FETCH ALL ZIGBEE MANUFACTURERS
 *
 * Sources: Z2M database for ALL brands
 * - Tuya, Sonoff, Xiaomi, IKEA, Philips, Lidl, Moes, etc.
 * - Standard Zigbee and proprietary implementations
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '..', 'drivers');

// Z2M device files by brand
const Z2M_BRANDS = [
  { file: 'tuya.ts', prefix: '_T', type: 'tuya' },
  { file: 'sonoff.ts', prefix: 'SONOFF', type: 'sonoff' },
  { file: 'xiaomi.ts', prefix: 'lumi', type: 'xiaomi' },
  { file: 'ikea.ts', prefix: 'IKEA', type: 'ikea' },
  { file: 'philips.ts', prefix: 'Philips', type: 'philips' },
  { file: 'lidl.ts', prefix: 'LIDL', type: 'lidl' },
  { file: 'moes.ts', prefix: 'MOES', type: 'moes' },
  { file: 'zemismart.ts', prefix: 'ZEMISMART', type: 'zemismart' },
  { file: 'lonsonho.ts', prefix: 'Lonsonho', type: 'lonsonho' },
  { file: 'ewelink.ts', prefix: 'eWeLink', type: 'ewelink' },
  { file: 'blitzwolf.ts', prefix: 'BlitzWolf', type: 'blitzwolf' },
  { file: 'neo.ts', prefix: 'NEO', type: 'neo' },
  { file: 'woox.ts', prefix: 'WOOX', type: 'woox' },
  { file: 'aubess.ts', prefix: 'Aubess', type: 'aubess' },
  { file: 'aqara.ts', prefix: 'Aqara', type: 'aqara' },
  { file: 'third_reality.ts', prefix: 'ThirdReality', type: 'third_reality' },
  { file: 'immax.ts', prefix: 'IMMAX', type: 'immax' },
  { file: 'terncy.ts', prefix: 'Terncy', type: 'terncy' },
  { file: 'heiman.ts', prefix: 'HEIMAN', type: 'heiman' },
  { file: 'develco.ts', prefix: 'Develco', type: 'develco' },
];

async function fetchText(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', () => resolve(null));
  });
}

function classifyDeviceType(content, mfr) {
  // Try to find device description near the manufacturer
  const lowerContent = content.toLowerCase();
  const mfrIndex = lowerContent.indexOf(mfr.toLowerCase());

  if (mfrIndex === -1) return 'unknown';

  // Get context around manufacturer (500 chars before and after)
  const context = lowerContent.substring(Math.max(0, mfrIndex - 500), mfrIndex + 500);

  if (context.includes('temperature') || context.includes('humidity') || context.includes('sensor')) return 'sensor';
  if (context.includes('motion') || context.includes('pir') || context.includes('occupancy')) return 'motion';
  if (context.includes('contact') || context.includes('door') || context.includes('window')) return 'contact';
  if (context.includes('switch') || context.includes('relay')) return 'switch';
  if (context.includes('plug') || context.includes('socket') || context.includes('outlet')) return 'plug';
  if (context.includes('light') || context.includes('bulb') || context.includes('led')) return 'light';
  if (context.includes('dimmer')) return 'dimmer';
  if (context.includes('curtain') || context.includes('blind') || context.includes('cover')) return 'cover';
  if (context.includes('thermostat') || context.includes('trv') || context.includes('valve')) return 'climate';
  if (context.includes('button') || context.includes('remote') || context.includes('scene')) return 'button';
  if (context.includes('smoke') || context.includes('co2') || context.includes('gas')) return 'alarm';
  if (context.includes('water') || context.includes('leak')) return 'water';

  return 'unknown';
}

// Map device type to driver
const TYPE_TO_DRIVER = {
  sensor: 'climate_sensor',
  motion: 'motion_sensor',
  contact: 'contact_sensor',
  switch: 'switch_1gang',
  plug: 'plug_smart',
  light: 'bulb_rgb',
  dimmer: 'dimmer_wall_1gang',
  cover: 'curtain_motor',
  climate: 'thermostat_tuya_dp',
  button: 'button_wireless_1',
  alarm: 'smoke_detector_advanced',
  water: 'water_leak_sensor',
  unknown: 'zigbee_universal',
};

async function main() {
  console.log('════════════════════════════════════════════════════════════════');
  console.log('🌐 FETCH ALL ZIGBEE MANUFACTURERS');
  console.log('════════════════════════════════════════════════════════════════\n');

  const allDevices = [];

  for (const brand of Z2M_BRANDS) {
    const url = `https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/${brand.file}`;
    console.log(`📦 Fetching ${brand.file}...`);

    const content = await fetchText(url);
    if (!content) {
      console.log(`   ❌ Failed`);
      continue;
    }

    // Extract fingerprints
    const fpPattern = /modelID:\s*['"]([^'"]+)['"][^}]*manufacturerName:\s*['"]([^'"]+)['"]/g;
    let match;
    let count = 0;

    while ((match = fpPattern.exec(content)) !== null) {
      const deviceType = classifyDeviceType(content, match[2]);
      allDevices.push({
        brand: brand.type,
        modelId: match[1],
        manufacturerName: match[2],
        deviceType,
      });
      count++;
    }

    // Extract zigbeeModel arrays
    const zmPattern = /zigbeeModel:\s*\[([^\]]+)\]/g;
    while ((match = zmPattern.exec(content)) !== null) {
      const models = match[1].match(/['"]([^'"]+)['"]/g);
      if (models) {
        models.forEach(m => {
          const mfr = m.replace(/['"]/g, '');
          const deviceType = classifyDeviceType(content, mfr);
          allDevices.push({
            brand: brand.type,
            modelId: null,
            manufacturerName: mfr,
            deviceType,
          });
          count++;
        });
      }
    }

    console.log(`   ✅ ${count} devices`);
    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`\n📊 Total devices: ${allDevices.length}`);

  // Group by brand
  const byBrand = {};
  for (const d of allDevices) {
    if (!byBrand[d.brand]) byBrand[d.brand] = new Set();
    byBrand[d.brand].add(d.manufacturerName);
  }

  console.log('\nBy brand:');
  for (const [brand, mfrs] of Object.entries(byBrand)) {
    console.log(`  ${brand}: ${mfrs.size} manufacturers`);
  }

  // Get current state
  const currentMfrs = new Set();
  const drivers = fs.readdirSync(DRIVERS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory());

  for (const driver of drivers) {
    const configPath = path.join(DRIVERS_DIR, driver.name, 'driver.compose.json');
    if (!fs.existsSync(configPath)) continue;
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      (config.zigbee?.manufacturerName || []).forEach(m => currentMfrs.add(m));
    } catch { }
  }

  console.log(`\nCurrent manufacturers: ${currentMfrs.size}`);

  // Find missing - only Tuya-compatible brands
  const TUYA_COMPATIBLE = ['tuya', 'moes', 'zemismart', 'lonsonho', 'blitzwolf', 'neo', 'woox', 'aubess', 'immax'];

  const missing = allDevices.filter(d =>
    !currentMfrs.has(d.manufacturerName) &&
    (TUYA_COMPATIBLE.includes(d.brand) || d.manufacturerName.match(/^_T[ZYS]/))
  );

  // Deduplicate
  const uniqueMissing = [...new Map(missing.map(m => [m.manufacturerName, m])).values()];

  console.log(`\nMissing Tuya-compatible: ${uniqueMissing.length}`);

  if (uniqueMissing.length > 0) {
    console.log('\n📝 Adding missing manufacturers...\n');

    // Group by target driver
    const byDriver = new Map();

    for (const device of uniqueMissing) {
      const targetDriver = TYPE_TO_DRIVER[device.deviceType] || 'zigbee_universal';
      if (!byDriver.has(targetDriver)) byDriver.set(targetDriver, []);
      byDriver.get(targetDriver).push(device.manufacturerName);
    }

    let totalAdded = 0;

    for (const [driverName, mfrs] of byDriver) {
      const configPath = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');
      if (!fs.existsSync(configPath)) {
        // Fallback to zigbee_universal
        const fallbackPath = path.join(DRIVERS_DIR, 'zigbee_universal', 'driver.compose.json');
        if (!fs.existsSync(fallbackPath)) continue;

        const config = JSON.parse(fs.readFileSync(fallbackPath, 'utf8'));
        let added = 0;

        for (const mfr of mfrs) {
          if (!config.zigbee.manufacturerName.includes(mfr)) {
            config.zigbee.manufacturerName.push(mfr);
            added++;
          }
        }

        if (added > 0) {
          config.zigbee.manufacturerName.sort();
          fs.writeFileSync(fallbackPath, JSON.stringify(config, null, 2));
          console.log(`  zigbee_universal (fallback): +${added}`);
          totalAdded += added;
        }
        continue;
      }

      try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        let added = 0;

        for (const mfr of mfrs) {
          if (!config.zigbee.manufacturerName.includes(mfr)) {
            config.zigbee.manufacturerName.push(mfr);
            added++;
          }
        }

        if (added > 0) {
          config.zigbee.manufacturerName.sort();
          fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
          console.log(`  ${driverName}: +${added}`);
          totalAdded += added;
        }
      } catch { }
    }

    console.log(`\n✅ Total added: ${totalAdded}`);
  }

  // Final count
  let finalTotal = 0;
  let finalUnique = new Set();

  for (const driver of drivers) {
    const configPath = path.join(DRIVERS_DIR, driver.name, 'driver.compose.json');
    if (!fs.existsSync(configPath)) continue;
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const mfrs = config.zigbee?.manufacturerName || [];
      finalTotal += mfrs.length;
      mfrs.forEach(m => finalUnique.add(m));
    } catch { }
  }

  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('📊 FINAL RESULTS');
  console.log('════════════════════════════════════════════════════════════════');
  console.log(`  Total entries: ${finalTotal}`);
  console.log(`  Unique manufacturers: ${finalUnique.size}`);
  console.log('════════════════════════════════════════════════════════════════');
}

if (require.main === module) {
  main().catch(console.error);
}
