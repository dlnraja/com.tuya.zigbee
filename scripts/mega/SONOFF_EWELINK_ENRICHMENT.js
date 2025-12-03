#!/usr/bin/env node
/**
 * SONOFF / eWeLink ZIGBEE DEVICE ENRICHMENT
 *
 * Adds all SONOFF and eWeLink Zigbee devices to existing drivers
 *
 * Sources:
 * - https://sonoff.tech/
 * - https://www.zigbee2mqtt.io/supported-devices/
 * - https://ewelink.cc/ewelink-cube/supported-device/zigbee/
 *
 * SONOFF Device Categories:
 * - SNZB-01/01P: Wireless Button
 * - SNZB-02/02D/02P/02WD/02LD: Temperature & Humidity Sensor
 * - SNZB-03/03P: Motion Sensor (PIR)
 * - SNZB-04/04P: Door/Window Contact Sensor
 * - SNZB-05P: Water Leak Sensor
 * - SNZB-06P: Presence Sensor (mmWave)
 * - ZBMINI/ZBMINI-L/ZBMINI-L2/ZBMINIR2: Mini Smart Switch
 * - ZBM5: Wall Switch (1-3 gang)
 * - TRVZB: Thermostatic Radiator Valve
 * - ZBCurtain: Curtain Motor
 * - S26R2ZB/S31 Lite ZB/S40ZB/S60ZB: Smart Plugs
 * - SWV: Smart Water Valve
 * - NSPanel Pro: Smart Panel (Zigbee Gateway/Router)
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '..', '..', 'drivers');

// =============================================================================
// SONOFF / eWeLink DEVICE DATABASE
// =============================================================================
const SONOFF_DEVICES = {
  // =========================================================================
  // WIRELESS BUTTONS
  // =========================================================================
  button_wireless_1: {
    devices: [
      { manufacturerName: 'SONOFF', modelId: 'SNZB-01', description: 'Wireless Button' },
      { manufacturerName: 'SONOFF', modelId: 'SNZB-01P', description: 'Wireless Button P' },
      { manufacturerName: 'eWeLink', modelId: 'SNZB-01', description: 'Wireless Button' },
      { manufacturerName: 'eWeLink', modelId: 'SNZB-01P', description: 'Wireless Button P' },
      { manufacturerName: 'eWeLink', modelId: 'WB01', description: 'Wireless Button' },
      { manufacturerName: 'eWeLink', modelId: 'WB-01', description: 'Wireless Button' }
    ]
  },

  // =========================================================================
  // CLIMATE SENSORS (Temperature & Humidity)
  // =========================================================================
  climate_sensor: {
    devices: [
      // SNZB-02 Series
      { manufacturerName: 'SONOFF', modelId: 'SNZB-02', description: 'Temp & Humidity Sensor' },
      { manufacturerName: 'SONOFF', modelId: 'SNZB-02D', description: 'Temp & Humidity with LCD' },
      { manufacturerName: 'SONOFF', modelId: 'SNZB-02P', description: 'Temp & Humidity Pro' },
      { manufacturerName: 'SONOFF', modelId: 'SNZB-02WD', description: 'Temp & Humidity IP65 LCD' },
      { manufacturerName: 'SONOFF', modelId: 'SNZB-02LD', description: 'Temp & Humidity with Probe' },
      { manufacturerName: 'eWeLink', modelId: 'SNZB-02', description: 'Temp & Humidity Sensor' },
      { manufacturerName: 'eWeLink', modelId: 'SNZB-02D', description: 'Temp & Humidity with LCD' },
      { manufacturerName: 'eWeLink', modelId: 'SNZB-02P', description: 'Temp & Humidity Pro' },
      { manufacturerName: 'eWeLink', modelId: 'TH01', description: 'Temp & Humidity Sensor' },
      { manufacturerName: 'eWeLink', modelId: 'TH-01', description: 'Temp & Humidity Sensor' },
      // Third-party eWeLink compatible
      { manufacturerName: 'eWeLink', modelId: 'ZTH01', description: 'Zigbee Temp Humidity' },
      { manufacturerName: 'eWeLink', modelId: 'ZTH02', description: 'Zigbee Temp Humidity LCD' }
    ]
  },

  // =========================================================================
  // MOTION SENSORS (PIR)
  // =========================================================================
  motion_sensor: {
    devices: [
      { manufacturerName: 'SONOFF', modelId: 'SNZB-03', description: 'Motion Sensor PIR' },
      { manufacturerName: 'SONOFF', modelId: 'SNZB-03P', description: 'Motion Sensor PIR Pro' },
      { manufacturerName: 'eWeLink', modelId: 'SNZB-03', description: 'Motion Sensor PIR' },
      { manufacturerName: 'eWeLink', modelId: 'SNZB-03P', description: 'Motion Sensor PIR Pro' },
      { manufacturerName: 'eWeLink', modelId: 'MS01', description: 'Motion Sensor' },
      { manufacturerName: 'eWeLink', modelId: 'MS-01', description: 'Motion Sensor' }
    ]
  },

  // =========================================================================
  // PRESENCE SENSORS (mmWave Radar)
  // =========================================================================
  presence_sensor_radar: {
    devices: [
      { manufacturerName: 'SONOFF', modelId: 'SNZB-06P', description: 'Human Presence Sensor mmWave' },
      { manufacturerName: 'eWeLink', modelId: 'SNZB-06P', description: 'Human Presence Sensor mmWave' }
    ]
  },

  // =========================================================================
  // CONTACT SENSORS (Door/Window)
  // =========================================================================
  contact_sensor: {
    devices: [
      { manufacturerName: 'SONOFF', modelId: 'SNZB-04', description: 'Door/Window Sensor' },
      { manufacturerName: 'SONOFF', modelId: 'SNZB-04P', description: 'Door/Window Sensor Pro' },
      { manufacturerName: 'eWeLink', modelId: 'SNZB-04', description: 'Door/Window Sensor' },
      { manufacturerName: 'eWeLink', modelId: 'SNZB-04P', description: 'Door/Window Sensor Pro' },
      { manufacturerName: 'eWeLink', modelId: 'DS01', description: 'Door Sensor' },
      { manufacturerName: 'eWeLink', modelId: 'DS-01', description: 'Door Sensor' },
      { manufacturerName: 'eWeLink', modelId: 'WDS01', description: 'Wireless Door Sensor' }
    ]
  },

  // =========================================================================
  // WATER LEAK SENSORS
  // =========================================================================
  water_leak_sensor: {
    devices: [
      { manufacturerName: 'SONOFF', modelId: 'SNZB-05P', description: 'Water Leak Sensor' },
      { manufacturerName: 'eWeLink', modelId: 'SNZB-05P', description: 'Water Leak Sensor' },
      { manufacturerName: 'eWeLink', modelId: 'WL01', description: 'Water Leak Sensor' }
    ]
  },

  // =========================================================================
  // SMART SWITCHES (Mini/In-Wall)
  // =========================================================================
  switch_1gang: {
    devices: [
      // ZBMINI Series
      { manufacturerName: 'SONOFF', modelId: 'ZBMINI', description: 'Zigbee Mini Smart Switch' },
      { manufacturerName: 'SONOFF', modelId: 'ZBMINI-L', description: 'Zigbee Mini No Neutral' },
      { manufacturerName: 'SONOFF', modelId: 'ZBMINI-L2', description: 'Zigbee Mini No Neutral V2' },
      { manufacturerName: 'SONOFF', modelId: 'ZBMINIR2', description: 'Zigbee Mini R2' },
      { manufacturerName: 'SONOFF', modelId: 'ZBMINIL2', description: 'Zigbee Mini L2' },
      { manufacturerName: 'eWeLink', modelId: 'ZBMINI', description: 'Zigbee Mini Smart Switch' },
      { manufacturerName: 'eWeLink', modelId: 'ZBMINI-L', description: 'Zigbee Mini No Neutral' },
      { manufacturerName: 'eWeLink', modelId: 'ZBMINI-L2', description: 'Zigbee Mini No Neutral V2' },
      // ZBM5 Series (1 gang)
      { manufacturerName: 'SONOFF', modelId: 'ZBM5-1-80', description: 'Wall Switch 1 Gang 80' },
      { manufacturerName: 'SONOFF', modelId: 'ZBM5-1-86', description: 'Wall Switch 1 Gang 86' },
      { manufacturerName: 'eWeLink', modelId: 'ZBM5-1-80', description: 'Wall Switch 1 Gang 80' },
      { manufacturerName: 'eWeLink', modelId: 'ZBM5-1-86', description: 'Wall Switch 1 Gang 86' },
      // SW Series
      { manufacturerName: 'eWeLink', modelId: 'ZB-SW01', description: 'Zigbee Switch 1 Gang' },
      { manufacturerName: 'eWeLink', modelId: 'ZBSW01', description: 'Zigbee Switch 1 Gang' }
    ]
  },

  switch_2gang: {
    devices: [
      { manufacturerName: 'SONOFF', modelId: 'ZBM5-2-80', description: 'Wall Switch 2 Gang 80' },
      { manufacturerName: 'SONOFF', modelId: 'ZBM5-2-86', description: 'Wall Switch 2 Gang 86' },
      { manufacturerName: 'eWeLink', modelId: 'ZBM5-2-80', description: 'Wall Switch 2 Gang 80' },
      { manufacturerName: 'eWeLink', modelId: 'ZBM5-2-86', description: 'Wall Switch 2 Gang 86' },
      { manufacturerName: 'eWeLink', modelId: 'ZB-SW02', description: 'Zigbee Switch 2 Gang' },
      { manufacturerName: 'eWeLink', modelId: 'ZBSW02', description: 'Zigbee Switch 2 Gang' }
    ]
  },

  switch_3gang: {
    devices: [
      { manufacturerName: 'SONOFF', modelId: 'ZBM5-3-80', description: 'Wall Switch 3 Gang 80' },
      { manufacturerName: 'SONOFF', modelId: 'ZBM5-3-86', description: 'Wall Switch 3 Gang 86' },
      { manufacturerName: 'eWeLink', modelId: 'ZBM5-3-80', description: 'Wall Switch 3 Gang 80' },
      { manufacturerName: 'eWeLink', modelId: 'ZBM5-3-86', description: 'Wall Switch 3 Gang 86' },
      { manufacturerName: 'eWeLink', modelId: 'ZB-SW03', description: 'Zigbee Switch 3 Gang' },
      { manufacturerName: 'eWeLink', modelId: 'ZBSW03', description: 'Zigbee Switch 3 Gang' }
    ]
  },

  switch_4gang: {
    devices: [
      { manufacturerName: 'eWeLink', modelId: 'ZB-SW04', description: 'Zigbee Switch 4 Gang' },
      { manufacturerName: 'eWeLink', modelId: 'ZBSW04', description: 'Zigbee Switch 4 Gang' }
    ]
  },

  // =========================================================================
  // SMART PLUGS
  // =========================================================================
  plug_smart: {
    devices: [
      { manufacturerName: 'SONOFF', modelId: 'S26R2ZB', description: 'Smart Plug R2 Zigbee' },
      { manufacturerName: 'SONOFF', modelId: 'S31ZB', description: 'Smart Plug S31 Zigbee' },
      { manufacturerName: 'SONOFF', modelId: 'S31 Lite zb', description: 'Smart Plug S31 Lite' },
      { manufacturerName: 'SONOFF', modelId: 'S40ZBTPB', description: 'Smart Plug S40' },
      { manufacturerName: 'SONOFF', modelId: 'S40 Lite zb', description: 'Smart Plug S40 Lite' },
      { manufacturerName: 'SONOFF', modelId: 'S60ZB', description: 'iPlug Smart Plug' },
      { manufacturerName: 'SONOFF', modelId: 'S60ZBTPE', description: 'iPlug EU' },
      { manufacturerName: 'SONOFF', modelId: 'S60ZBTPF', description: 'iPlug FR' },
      { manufacturerName: 'eWeLink', modelId: 'S26R2ZB', description: 'Smart Plug R2 Zigbee' },
      { manufacturerName: 'eWeLink', modelId: 'S31ZB', description: 'Smart Plug S31' },
      { manufacturerName: 'eWeLink', modelId: 'S40ZB', description: 'Smart Plug S40' },
      { manufacturerName: 'eWeLink', modelId: 'SA-003-Zigbee', description: 'Smart Plug' },
      { manufacturerName: 'eWeLink', modelId: 'ZB-PLUG', description: 'Zigbee Smart Plug' },
      { manufacturerName: 'eWeLink', modelId: 'ZBPLUG', description: 'Zigbee Smart Plug' }
    ]
  },

  plug_energy_monitor: {
    devices: [
      { manufacturerName: 'SONOFF', modelId: 'S31ZB', description: 'Smart Plug with Energy Monitor' },
      { manufacturerName: 'SONOFF', modelId: 'S40ZBTPB', description: 'Smart Plug S40 Energy' },
      { manufacturerName: 'SONOFF', modelId: 'SPM-Main', description: 'Smart Stackable Power Meter' },
      { manufacturerName: 'eWeLink', modelId: 'SPM-Main', description: 'Smart Stackable Power Meter' }
    ]
  },

  // =========================================================================
  // THERMOSTATIC RADIATOR VALVE (TRV)
  // =========================================================================
  radiator_valve: {
    devices: [
      { manufacturerName: 'SONOFF', modelId: 'TRVZB', description: 'Thermostatic Radiator Valve' },
      { manufacturerName: 'eWeLink', modelId: 'TRVZB', description: 'Thermostatic Radiator Valve' }
    ]
  },

  // =========================================================================
  // CURTAIN MOTOR
  // =========================================================================
  curtain_motor: {
    devices: [
      { manufacturerName: 'SONOFF', modelId: 'ZBCurtain', description: 'Smart Curtain Motor' },
      { manufacturerName: 'eWeLink', modelId: 'ZBCurtain', description: 'Smart Curtain Motor' },
      { manufacturerName: 'eWeLink', modelId: 'ZB-CUR', description: 'Zigbee Curtain Controller' }
    ]
  },

  // =========================================================================
  // WATER VALVE
  // =========================================================================
  water_valve_smart: {
    devices: [
      { manufacturerName: 'SONOFF', modelId: 'SWV', description: 'Smart Water Valve' },
      { manufacturerName: 'SONOFF', modelId: 'SWV-NH', description: 'Smart Water Valve NH' },
      { manufacturerName: 'SONOFF', modelId: 'SWV-BSP', description: 'Smart Water Valve BSP' },
      { manufacturerName: 'eWeLink', modelId: 'SWV', description: 'Smart Water Valve' }
    ]
  },

  // =========================================================================
  // SIRENS
  // =========================================================================
  siren: {
    devices: [
      { manufacturerName: 'HEIMAN', modelId: 'HS2WD-E', description: 'Zigbee Siren Strobe' },
      { manufacturerName: 'HEIMAN', modelId: 'HS2WD', description: 'Zigbee Siren' },
      { manufacturerName: 'HEIMAN', modelId: 'SRHMP-I1', description: 'Smart Siren' },
      { manufacturerName: 'Heiman', modelId: 'HS2WD-E', description: 'Zigbee Siren Strobe' },
      { manufacturerName: 'eWeLink', modelId: 'ZB-SIR', description: 'Zigbee Siren' }
    ]
  },

  // =========================================================================
  // SMOKE DETECTORS
  // =========================================================================
  smoke_detector_advanced: {
    devices: [
      { manufacturerName: 'HEIMAN', modelId: 'HS1SA', description: 'Smoke Detector' },
      { manufacturerName: 'HEIMAN', modelId: 'HS1SA-M', description: 'Smoke Detector M' },
      { manufacturerName: 'HEIMAN', modelId: 'HS3SA', description: 'Smoke Detector 3' },
      { manufacturerName: 'Heiman', modelId: 'SmokeSensor-N', description: 'Smart Smoke Sensor' },
      { manufacturerName: 'Heiman', modelId: 'SmokeSensor-N-3.0', description: 'Smart Smoke Sensor 3.0' }
    ]
  },

  // =========================================================================
  // GAS DETECTORS
  // =========================================================================
  gas_detector: {
    devices: [
      { manufacturerName: 'HEIMAN', modelId: 'HS1CG', description: 'Combustible Gas Sensor' },
      { manufacturerName: 'HEIMAN', modelId: 'HS1CG-M', description: 'Combustible Gas Sensor M' },
      { manufacturerName: 'HEIMAN', modelId: 'HS3CG', description: 'Combustible Gas Sensor 3' },
      { manufacturerName: 'Heiman', modelId: 'GasSensor-N', description: 'Smart Gas Sensor' }
    ]
  },

  // =========================================================================
  // CO DETECTORS
  // =========================================================================
  co_sensor: {
    devices: [
      { manufacturerName: 'HEIMAN', modelId: 'HS1CA', description: 'CO Detector' },
      { manufacturerName: 'HEIMAN', modelId: 'HS1CA-M', description: 'CO Detector M' },
      { manufacturerName: 'Heiman', modelId: 'COSensor-N', description: 'Smart CO Sensor' }
    ]
  },

  // =========================================================================
  // DIMMERS
  // =========================================================================
  dimmer_wall_1gang: {
    devices: [
      { manufacturerName: 'eWeLink', modelId: 'ZB-DIM', description: 'Zigbee Dimmer' },
      { manufacturerName: 'eWeLink', modelId: 'ZBDIM', description: 'Zigbee Dimmer' }
    ]
  },

  // =========================================================================
  // LED CONTROLLERS
  // =========================================================================
  led_controller_rgb: {
    devices: [
      { manufacturerName: 'eWeLink', modelId: 'ZB-RGBCW', description: 'RGBCW Controller' },
      { manufacturerName: 'eWeLink', modelId: 'ZBRGBCW', description: 'RGBCW Controller' }
    ]
  },

  led_controller_cct: {
    devices: [
      { manufacturerName: 'eWeLink', modelId: 'ZB-CCT', description: 'CCT Controller' },
      { manufacturerName: 'eWeLink', modelId: 'ZBCCT', description: 'CCT Controller' }
    ]
  },

  // =========================================================================
  // BULBS
  // =========================================================================
  bulb_rgbw: {
    devices: [
      { manufacturerName: 'eWeLink', modelId: 'ZB-BULB-RGBCW', description: 'RGBCW Bulb' },
      { manufacturerName: 'eWeLink', modelId: 'ZBBULBRGBCW', description: 'RGBCW Bulb' }
    ]
  },

  bulb_tunable_white: {
    devices: [
      { manufacturerName: 'eWeLink', modelId: 'ZB-BULB-CW', description: 'Tunable White Bulb' },
      { manufacturerName: 'eWeLink', modelId: 'ZBBULBCW', description: 'Tunable White Bulb' }
    ]
  }
};

// =============================================================================
// NSPanel Devices (Gateway/Router mode only - not as a panel in Homey)
// =============================================================================
const NSPANEL_DEVICES = {
  gateway_zigbee_bridge: {
    devices: [
      // NSPanel Pro Series
      { manufacturerName: 'SONOFF', modelId: 'NSPanel Pro', description: 'Smart Panel Pro 86/120' },
      { manufacturerName: 'SONOFF', modelId: 'NSPanel Pro 86', description: 'Smart Panel Pro 86' },
      { manufacturerName: 'SONOFF', modelId: 'NSPanel Pro 120', description: 'Smart Panel Pro 120' },
      { manufacturerName: 'eWeLink', modelId: 'NSPanel Pro', description: 'Smart Panel Pro' },
      // Zigbee Bridge
      { manufacturerName: 'SONOFF', modelId: 'ZBBridge', description: 'Zigbee Bridge' },
      { manufacturerName: 'SONOFF', modelId: 'ZBBridge-P', description: 'Zigbee Bridge Pro' },
      { manufacturerName: 'SONOFF', modelId: 'ZBBridge-U', description: 'Zigbee Bridge Ultra' },
      { manufacturerName: 'SONOFF', modelId: 'ZB Bridge Pro', description: 'Zigbee Bridge Pro' },
      { manufacturerName: 'SONOFF', modelId: 'ZBDongle-E', description: 'Zigbee Dongle E' },
      { manufacturerName: 'SONOFF', modelId: 'ZBDongle-P', description: 'Zigbee Dongle P' },
      { manufacturerName: 'eWeLink', modelId: 'ZBBridge', description: 'Zigbee Bridge' },
      { manufacturerName: 'eWeLink', modelId: 'ZBBridge-U', description: 'Zigbee Bridge Ultra' },
      // iHost
      { manufacturerName: 'SONOFF', modelId: 'iHost', description: 'Smart Home Hub' },
      { manufacturerName: 'eWeLink', modelId: 'iHost', description: 'Smart Home Hub' }
    ]
  }
};

// =============================================================================
// ENRICHMENT FUNCTION
// =============================================================================
function enrichDriver(driverId, devices) {
  const driverPath = path.join(DRIVERS_DIR, driverId, 'driver.compose.json');

  if (!fs.existsSync(driverPath)) {
    return { success: false, reason: 'driver_not_found' };
  }

  try {
    const driver = JSON.parse(fs.readFileSync(driverPath, 'utf8'));
    let addedCount = 0;

    // Get existing manufacturer names
    if (!driver.zigbee) driver.zigbee = {};
    if (!driver.zigbee.endpoints) driver.zigbee.endpoints = { '1': {} };

    const existingDevices = driver.zigbee.devices || [];
    const existingSet = new Set(existingDevices.map(d => `${d.manufacturerName}:${d.modelId}`));

    // Add new devices
    for (const device of devices) {
      const key = `${device.manufacturerName}:${device.modelId}`;
      if (!existingSet.has(key)) {
        existingDevices.push({
          manufacturerName: device.manufacturerName,
          modelId: device.modelId
        });
        addedCount++;
        existingSet.add(key);
      }
    }

    if (addedCount > 0) {
      driver.zigbee.devices = existingDevices;
      fs.writeFileSync(driverPath, JSON.stringify(driver, null, 2) + '\n');
      return { success: true, added: addedCount };
    }

    return { success: true, added: 0 };
  } catch (err) {
    return { success: false, reason: err.message };
  }
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================
console.log('🔌 SONOFF / eWeLink ZIGBEE ENRICHMENT');
console.log('=====================================\n');
console.log('Sources: sonoff.tech, zigbee2mqtt.io, ewelink.cc\n');

const results = {
  total: 0,
  added: 0,
  drivers: 0,
  errors: []
};

// Enrich SONOFF devices
console.log('📡 SONOFF Devices:');
for (const [driverId, config] of Object.entries(SONOFF_DEVICES)) {
  const result = enrichDriver(driverId, config.devices);
  if (result.success && result.added > 0) {
    console.log(`  ✅ ${driverId}: +${result.added} devices`);
    results.added += result.added;
    results.drivers++;
  } else if (result.success) {
    console.log(`  ⏭️  ${driverId}: already complete`);
  } else {
    console.log(`  ❌ ${driverId}: ${result.reason}`);
    results.errors.push({ driver: driverId, reason: result.reason });
  }
  results.total += config.devices.length;
}

// Enrich NSPanel devices
console.log('\n📺 NSPanel / Gateway Devices:');
for (const [driverId, config] of Object.entries(NSPANEL_DEVICES)) {
  const result = enrichDriver(driverId, config.devices);
  if (result.success && result.added > 0) {
    console.log(`  ✅ ${driverId}: +${result.added} devices`);
    results.added += result.added;
    results.drivers++;
  } else if (result.success) {
    console.log(`  ⏭️  ${driverId}: already complete`);
  } else {
    console.log(`  ❌ ${driverId}: ${result.reason}`);
    results.errors.push({ driver: driverId, reason: result.reason });
  }
  results.total += config.devices.length;
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 SUMMARY');
console.log('='.repeat(50));
console.log(`📱 Total device entries: ${results.total}`);
console.log(`✅ Devices added: ${results.added}`);
console.log(`📁 Drivers enriched: ${results.drivers}`);
if (results.errors.length > 0) {
  console.log(`❌ Errors: ${results.errors.length}`);
}
console.log('='.repeat(50));

// Save report
const reportPath = path.join(__dirname, '..', '..', 'data', 'enrichment', 'sonoff-ewelink-enrichment-report.json');
fs.writeFileSync(reportPath, JSON.stringify({
  timestamp: new Date().toISOString(),
  results,
  sonoffDevices: SONOFF_DEVICES,
  nspanelDevices: NSPANEL_DEVICES
}, null, 2));

console.log(`\n📄 Report: ${reportPath}`);
console.log('\n✨ SONOFF / eWeLink devices ready for pairing with Homey!');
