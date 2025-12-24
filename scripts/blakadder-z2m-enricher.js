#!/usr/bin/env node
/**
 * Blakadder + Z2M Multi-Source Enricher
 * Extracts Tuya devices from multiple sources and enriches the Homey app
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const DRIVERS_PATH = path.join(__dirname, '..', 'drivers');

// Z2M devices.json API (structured data)
const Z2M_DEVICES_URL = 'https://raw.githubusercontent.com/Koenkk/zigbee2mqtt.io/master/supported-devices.json';

// Fetch URL with redirect following
function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : require('http');
    protocol.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

// Get local manufacturerNames
function getLocalManufacturerNames() {
  const manufacturers = new Set();
  const drivers = fs.readdirSync(DRIVERS_PATH);

  for (const driver of drivers) {
    const composePath = path.join(DRIVERS_PATH, driver, 'driver.compose.json');
    if (fs.existsSync(composePath)) {
      try {
        const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
        if (compose.zigbee?.manufacturerName) {
          compose.zigbee.manufacturerName.forEach(m => manufacturers.add(m));
        }
      } catch (e) {}
    }
  }
  return manufacturers;
}

// Parse Z2M supported-devices.json
function parseZ2MDevicesJson(content) {
  try {
    const devices = JSON.parse(content);
    const tuyaDevices = [];

    for (const device of devices) {
      // Filter Tuya devices
      if (device.vendor?.toLowerCase().includes('tuya') ||
          device.model?.startsWith('TS') ||
          device.zigbeeModel?.some(m => m.startsWith('TS'))) {

        const fingerprints = [];
        if (device.fingerprint) {
          device.fingerprint.forEach(fp => {
            if (fp.manufacturerName?.startsWith('_T')) {
              fingerprints.push(fp.manufacturerName);
            }
          });
        }

        if (fingerprints.length > 0 || device.zigbeeModel?.some(m => m.startsWith('TS'))) {
          tuyaDevices.push({
            model: device.model,
            vendor: device.vendor,
            description: device.description,
            zigbeeModel: device.zigbeeModel,
            fingerprints,
            exposes: device.exposes?.map(e => e.type || e.name) || []
          });
        }
      }
    }

    return tuyaDevices;
  } catch (e) {
    console.error('Error parsing Z2M devices.json:', e.message);
    return [];
  }
}

// Determine device type from exposes/description
function determineDriverType(device) {
  const desc = (device.description || '').toLowerCase();
  const exposes = device.exposes || [];

  // Check exposes first
  if (exposes.includes('climate')) return 'radiator_valve';
  if (exposes.includes('cover')) return 'curtain_motor';
  if (exposes.includes('fan')) return 'fan';
  if (exposes.includes('light')) return 'bulb_rgb';

  // Check description
  if (desc.includes('radiator') || desc.includes('trv') || desc.includes('valve')) return 'radiator_valve';
  if (desc.includes('thermostat')) return 'thermostat';
  if (desc.includes('temperature') && desc.includes('humidity')) return 'climate_sensor';
  if (desc.includes('motion') || desc.includes('pir')) return 'motion_sensor';
  if (desc.includes('presence') || desc.includes('radar') || desc.includes('mmwave')) return 'presence_sensor_radar';
  if (desc.includes('door') || desc.includes('window') || desc.includes('contact')) return 'contact_sensor';
  if (desc.includes('water') || desc.includes('leak') || desc.includes('flood')) return 'water_leak_sensor';
  if (desc.includes('smoke') || desc.includes('fire')) return 'smoke_detector';
  if (desc.includes('gas') || desc.includes('co2') || desc.includes('co ')) return 'gas_sensor';
  if (desc.includes('plug') || desc.includes('socket') || desc.includes('outlet')) return 'plug_smart';
  if (desc.includes('switch') && desc.includes('1')) return 'switch_1gang';
  if (desc.includes('switch') && desc.includes('2')) return 'switch_2gang';
  if (desc.includes('switch') && desc.includes('3')) return 'switch_3gang';
  if (desc.includes('switch') && desc.includes('4')) return 'switch_4gang';
  if (desc.includes('dimmer')) return 'dimmer';
  if (desc.includes('bulb') || desc.includes('light') || desc.includes('led')) return 'bulb_rgb';
  if (desc.includes('curtain') || desc.includes('blind') || desc.includes('shade') || desc.includes('cover')) return 'curtain_motor';
  if (desc.includes('button') || desc.includes('remote') || desc.includes('scene')) {
    if (desc.includes('4')) return 'button_wireless_4';
    if (desc.includes('2')) return 'button_wireless_2';
    return 'button_wireless_1';
  }
  if (desc.includes('siren') || desc.includes('alarm')) return 'siren';
  if (desc.includes('ir') || desc.includes('infrared')) return 'ir_blaster';
  if (desc.includes('soil')) return 'soil_sensor';
  if (desc.includes('switch')) return 'switch_1gang';

  return null;
}

// Add manufacturerName to driver
function addToDriver(driverName, manufacturerName) {
  const composePath = path.join(DRIVERS_PATH, driverName, 'driver.compose.json');

  if (!fs.existsSync(composePath)) return false;

  try {
    const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    if (!compose.zigbee?.manufacturerName) return false;
    if (compose.zigbee.manufacturerName.includes(manufacturerName)) return false;

    compose.zigbee.manufacturerName.push(manufacturerName);
    fs.writeFileSync(composePath, JSON.stringify(compose, null, 2));
    return true;
  } catch (e) {
    return false;
  }
}

// Main function
async function main() {
  console.log('🔍 Blakadder + Z2M Multi-Source Enricher\n');
  console.log('='.repeat(60));

  const localMfrs = getLocalManufacturerNames();
  console.log(`\n📦 Local: ${localMfrs.size} manufacturerNames`);

  console.log('\n🌐 Fetching Z2M supported-devices.json...');

  try {
    const z2mContent = await fetchUrl(Z2M_DEVICES_URL);
    const tuyaDevices = parseZ2MDevicesJson(z2mContent);
    console.log(`   Found ${tuyaDevices.length} Tuya devices in Z2M`);

    // Extract all fingerprints
    const allFingerprints = new Set();
    tuyaDevices.forEach(d => d.fingerprints.forEach(f => allFingerprints.add(f)));
    console.log(`   Total fingerprints: ${allFingerprints.size}`);

    // Find missing
    const missing = [...allFingerprints].filter(f => !localMfrs.has(f));
    console.log(`   Missing: ${missing.length}`);

    // Enrich
    let added = 0;
    const enrichments = {};

    for (const mfr of missing) {
      const device = tuyaDevices.find(d => d.fingerprints.includes(mfr));
      if (device) {
        const driver = determineDriverType(device);
        if (driver && addToDriver(driver, mfr)) {
          added++;
          if (!enrichments[driver]) enrichments[driver] = [];
          enrichments[driver].push({ mfr, desc: device.description });
          console.log(`   ✅ ${mfr} -> ${driver}`);
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`\n✅ Added ${added} new manufacturerNames`);

    if (Object.keys(enrichments).length > 0) {
      console.log('\n📊 By driver:');
      for (const [driver, items] of Object.entries(enrichments)) {
        console.log(`   ${driver}: +${items.length}`);
      }
    }

    // Save report
    const reportPath = path.join(__dirname, 'multi-source-enrichment.json');
    fs.writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      source: 'Z2M supported-devices.json',
      tuyaDevicesFound: tuyaDevices.length,
      fingerprintsTotal: allFingerprints.size,
      missingCount: missing.length,
      addedCount: added,
      enrichments
    }, null, 2));
    console.log(`\n📄 Report: ${reportPath}`);

  } catch (e) {
    console.error(`❌ Error: ${e.message}`);
  }
}

main().catch(console.error);
