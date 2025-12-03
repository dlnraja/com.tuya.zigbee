#!/usr/bin/env node
/**
 * SONOFF FINGERPRINT EXTRACTION SCRIPT
 *
 * Extracts Sonoff/eWeLink device fingerprints from multiple sources:
 * - zigbee.blakadder.com
 * - zigbee2mqtt.io
 * - zigbee-herdsman-converters
 *
 * Generates JSON files usable for driver.compose.json
 *
 * @author Dylan Rajasekaram
 * @version 5.3.37
 */

const fs = require('fs');
const path = require('path');

// =============================================================================
// SONOFF DEVICE DATABASE (Manually curated from multiple sources)
// =============================================================================
const SONOFF_DEVICES = {
  // ===========================================================================
  // SENSORS
  // ===========================================================================
  sensors: {
    'SNZB-01': {
      manufacturerName: ['eWeLink', 'SONOFF'],
      modelId: ['SNZB-01', 'WB01', 'WB-01'],
      type: 'button',
      clusters: {
        input: [0, 1, 3, 6, 18],
        output: [3, 6, 18, 25]
      },
      capabilities: ['measure_battery'],
      batteryType: 'CR2450',
      description: 'Wireless Button'
    },
    'SNZB-01P': {
      manufacturerName: ['eWeLink', 'SONOFF'],
      modelId: ['SNZB-01P'],
      type: 'button',
      clusters: {
        input: [0, 1, 3, 6, 18],
        output: [3, 6, 18, 25]
      },
      capabilities: ['measure_battery'],
      batteryType: 'CR2450',
      description: 'Wireless Button Pro'
    },
    'SNZB-02': {
      manufacturerName: ['eWeLink', 'SONOFF'],
      modelId: ['SNZB-02', 'TH01'],
      type: 'sensor',
      clusters: {
        input: [0, 1, 3, 1026, 1029],
        output: [3, 25]
      },
      capabilities: ['measure_temperature', 'measure_humidity', 'measure_battery'],
      batteryType: 'CR2450',
      description: 'Temperature & Humidity Sensor'
    },
    'SNZB-02D': {
      manufacturerName: ['eWeLink', 'SONOFF'],
      modelId: ['SNZB-02D'],
      type: 'sensor',
      clusters: {
        input: [0, 1, 3, 1026, 1029],
        output: [3, 25]
      },
      capabilities: ['measure_temperature', 'measure_humidity', 'measure_battery'],
      batteryType: 'CR2450',
      description: 'Temperature & Humidity Sensor with LCD'
    },
    'SNZB-02P': {
      manufacturerName: ['eWeLink', 'SONOFF'],
      modelId: ['SNZB-02P'],
      type: 'sensor',
      clusters: {
        input: [0, 1, 3, 1026, 1029],
        output: [3, 25]
      },
      capabilities: ['measure_temperature', 'measure_humidity', 'measure_battery'],
      batteryType: 'CR2450',
      description: 'Temperature & Humidity Sensor Pro'
    },
    'SNZB-03': {
      manufacturerName: ['eWeLink', 'SONOFF'],
      modelId: ['SNZB-03', 'MS01'],
      type: 'sensor',
      clusters: {
        input: [0, 1, 3, 1280],
        output: [3, 25]
      },
      capabilities: ['alarm_motion', 'measure_battery'],
      batteryType: 'CR2450',
      iasZoneType: 0x000D,
      description: 'Motion Sensor (PIR)'
    },
    'SNZB-03P': {
      manufacturerName: ['eWeLink', 'SONOFF'],
      modelId: ['SNZB-03P'],
      type: 'sensor',
      clusters: {
        input: [0, 1, 3, 1024, 1280],
        output: [3, 25]
      },
      capabilities: ['alarm_motion', 'measure_luminance', 'measure_battery'],
      batteryType: 'CR2450',
      iasZoneType: 0x000D,
      description: 'Motion Sensor Pro with Lux'
    },
    'SNZB-04': {
      manufacturerName: ['eWeLink', 'SONOFF'],
      modelId: ['SNZB-04', 'DS01'],
      type: 'sensor',
      clusters: {
        input: [0, 1, 3, 1280],
        output: [3, 25]
      },
      capabilities: ['alarm_contact', 'measure_battery'],
      batteryType: 'CR2032',
      iasZoneType: 0x0015,
      description: 'Door/Window Contact Sensor'
    },
    'SNZB-04P': {
      manufacturerName: ['eWeLink', 'SONOFF'],
      modelId: ['SNZB-04P'],
      type: 'sensor',
      clusters: {
        input: [0, 1, 3, 1280],
        output: [3, 25]
      },
      capabilities: ['alarm_contact', 'measure_battery'],
      batteryType: 'CR2032',
      iasZoneType: 0x0015,
      description: 'Door/Window Contact Sensor Pro'
    },
    'SNZB-05P': {
      manufacturerName: ['eWeLink', 'SONOFF'],
      modelId: ['SNZB-05P'],
      type: 'sensor',
      clusters: {
        input: [0, 1, 3, 1280],
        output: [3, 25]
      },
      capabilities: ['alarm_water', 'measure_battery'],
      batteryType: 'CR2450',
      iasZoneType: 0x002A,
      description: 'Water Leak Sensor'
    },
    'SNZB-06P': {
      manufacturerName: ['eWeLink', 'SONOFF'],
      modelId: ['SNZB-06P'],
      type: 'sensor',
      clusters: {
        input: [0, 1, 3, 1024, 1030],
        output: [3, 25]
      },
      capabilities: ['alarm_motion', 'measure_luminance'],
      batteryType: null, // USB powered
      description: 'Human Presence Sensor (mmWave)'
    }
  },

  // ===========================================================================
  // SWITCHES & RELAYS
  // ===========================================================================
  switches: {
    'ZBMINI': {
      manufacturerName: ['eWeLink', 'SONOFF'],
      modelId: ['ZBMINI', '01MINIZB'],
      type: 'switch',
      clusters: {
        input: [0, 3, 4, 5, 6],
        output: [3, 25]
      },
      capabilities: ['onoff'],
      description: 'Zigbee Mini Smart Switch'
    },
    'ZBMINI-L': {
      manufacturerName: ['eWeLink', 'SONOFF'],
      modelId: ['ZBMINI-L'],
      type: 'switch',
      clusters: {
        input: [0, 3, 4, 5, 6],
        output: [3, 25]
      },
      capabilities: ['onoff'],
      description: 'Zigbee Mini No Neutral'
    },
    'ZBMINI-L2': {
      manufacturerName: ['eWeLink', 'SONOFF'],
      modelId: ['ZBMINI-L2', 'ZBMINIL2'],
      type: 'switch',
      clusters: {
        input: [0, 3, 4, 5, 6],
        output: [3, 25]
      },
      capabilities: ['onoff'],
      description: 'Zigbee Mini No Neutral V2'
    },
    'ZBMINIR2': {
      manufacturerName: ['eWeLink', 'SONOFF'],
      modelId: ['ZBMINIR2'],
      type: 'switch',
      clusters: {
        input: [0, 3, 4, 5, 6],
        output: [3, 25]
      },
      capabilities: ['onoff'],
      description: 'Zigbee Mini R2'
    },
    'BASICZBR3': {
      manufacturerName: ['eWeLink', 'SONOFF'],
      modelId: ['BASICZBR3'],
      type: 'switch',
      clusters: {
        input: [0, 3, 4, 5, 6],
        output: [3, 25]
      },
      capabilities: ['onoff'],
      description: 'Zigbee DIY Relay'
    }
  },

  // ===========================================================================
  // SMART PLUGS
  // ===========================================================================
  plugs: {
    'S31ZB': {
      manufacturerName: ['eWeLink', 'SONOFF'],
      modelId: ['S31ZB', 'S31 Lite zb', 'S31 Lite ZB'],
      type: 'socket',
      clusters: {
        input: [0, 3, 4, 5, 6, 1794, 2820],
        output: [3, 25]
      },
      capabilities: ['onoff', 'measure_power', 'meter_power', 'measure_voltage', 'measure_current'],
      description: 'Smart Plug US with Energy Monitor'
    },
    'S40ZB': {
      manufacturerName: ['eWeLink', 'SONOFF'],
      modelId: ['S40ZBTPB', 'S40 Lite zb', 'S40ZB'],
      type: 'socket',
      clusters: {
        input: [0, 3, 4, 5, 6, 1794, 2820],
        output: [3, 25]
      },
      capabilities: ['onoff', 'measure_power', 'meter_power'],
      description: 'Smart Plug EU 16A'
    },
    'S26R2ZB': {
      manufacturerName: ['eWeLink', 'SONOFF'],
      modelId: ['S26R2ZB'],
      type: 'socket',
      clusters: {
        input: [0, 3, 4, 5, 6],
        output: [3, 25]
      },
      capabilities: ['onoff'],
      description: 'Smart Plug R2 EU'
    },
    'S60ZB': {
      manufacturerName: ['eWeLink', 'SONOFF'],
      modelId: ['S60ZB', 'S60ZBTPE', 'S60ZBTPF'],
      type: 'socket',
      clusters: {
        input: [0, 3, 4, 5, 6, 1794, 2820],
        output: [3, 25]
      },
      capabilities: ['onoff', 'measure_power', 'meter_power'],
      description: 'iPlug Smart Plug Series'
    }
  },

  // ===========================================================================
  // CLIMATE
  // ===========================================================================
  climate: {
    'TRVZB': {
      manufacturerName: ['eWeLink', 'SONOFF'],
      modelId: ['TRVZB'],
      type: 'thermostat',
      clusters: {
        input: [0, 1, 3, 4, 5, 513, 516],
        output: [3, 10, 25]
      },
      capabilities: ['target_temperature', 'measure_temperature', 'measure_battery'],
      batteryType: 'AA',
      description: 'Thermostatic Radiator Valve'
    },
    'ZBCurtain': {
      manufacturerName: ['eWeLink', 'SONOFF'],
      modelId: ['ZBCurtain'],
      type: 'curtain',
      clusters: {
        input: [0, 3, 4, 5, 258],
        output: [3, 25]
      },
      capabilities: ['windowcoverings_state', 'windowcoverings_set'],
      description: 'Smart Curtain Motor'
    },
    'SWV': {
      manufacturerName: ['eWeLink', 'SONOFF'],
      modelId: ['SWV', 'SWV-NH', 'SWV-BSP'],
      type: 'valve',
      clusters: {
        input: [0, 1, 3, 6],
        output: [3, 25]
      },
      capabilities: ['onoff', 'measure_battery'],
      batteryType: 'AA',
      description: 'Smart Water Valve'
    }
  },

  // ===========================================================================
  // GATEWAYS & BRIDGES
  // ===========================================================================
  gateways: {
    'NSPanel Pro': {
      manufacturerName: ['eWeLink', 'SONOFF'],
      modelId: ['NSPanel Pro', 'NSPanel Pro 86', 'NSPanel Pro 120'],
      type: 'gateway',
      zigbeeRole: 'coordinator',
      description: 'Smart Panel Pro with Zigbee Gateway'
    },
    'ZBBridge': {
      manufacturerName: ['eWeLink', 'SONOFF'],
      modelId: ['ZBBridge', 'ZBBridge-P', 'ZB Bridge Pro'],
      type: 'gateway',
      zigbeeRole: 'coordinator',
      description: 'Zigbee Bridge'
    },
    'ZBBridge-U': {
      manufacturerName: ['eWeLink', 'SONOFF'],
      modelId: ['ZBBridge-U'],
      type: 'gateway',
      zigbeeRole: 'coordinator',
      description: 'Zigbee Bridge Ultra'
    },
    'iHost': {
      manufacturerName: ['eWeLink', 'SONOFF'],
      modelId: ['iHost'],
      type: 'gateway',
      zigbeeRole: 'coordinator',
      description: 'Smart Home Hub'
    },
    'ZBDongle': {
      manufacturerName: ['eWeLink', 'SONOFF'],
      modelId: ['ZBDongle-E', 'ZBDongle-P'],
      type: 'dongle',
      zigbeeRole: 'coordinator',
      description: 'Zigbee USB Dongle'
    }
  }
};

// =============================================================================
// EXPORT FUNCTIONS
// =============================================================================

/**
 * Generate driver.compose.json compatible format
 * @param {Object} device - Device definition
 * @returns {Object} Driver compose format
 */
function toDriverComposeFormat(device, id) {
  return {
    manufacturerName: device.manufacturerName,
    productId: device.modelId,
    endpoints: {
      '1': {
        clusters: device.clusters?.input || [],
        bindings: device.clusters?.input?.filter(c => [1, 6, 1280, 1026, 1029].includes(c)) || []
      }
    },
    capabilities: device.capabilities || [],
    batteryType: device.batteryType,
    description: device.description
  };
}

/**
 * Export all devices to JSON
 */
function exportAllDevices() {
  const output = {
    timestamp: new Date().toISOString(),
    source: 'sonoff-fingerprint-extract.js',
    devices: {}
  };

  // Flatten all categories
  for (const [category, devices] of Object.entries(SONOFF_DEVICES)) {
    for (const [id, device] of Object.entries(devices)) {
      output.devices[id] = {
        category,
        ...toDriverComposeFormat(device, id)
      };
    }
  }

  return output;
}

// =============================================================================
// MAIN
// =============================================================================

console.log('🔍 SONOFF FINGERPRINT EXTRACTION');
console.log('=================================\n');

const output = exportAllDevices();
const deviceCount = Object.keys(output.devices).length;

console.log(`📊 Extracted ${deviceCount} device fingerprints\n`);

// Print summary by category
for (const [category, devices] of Object.entries(SONOFF_DEVICES)) {
  const count = Object.keys(devices).length;
  console.log(`  📁 ${category}: ${count} devices`);
}

// Save to file
const outputPath = path.join(__dirname, '..', 'data', 'enrichment', 'sonoff-fingerprints.json');
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

console.log(`\n✅ Saved to: ${outputPath}`);

// Also print as usable JSON for driver.compose.json
console.log('\n📋 Sample driver.compose.json entries:\n');
console.log('// SNZB-02 Example:');
console.log(JSON.stringify({
  manufacturerName: SONOFF_DEVICES.sensors['SNZB-02'].manufacturerName,
  productId: SONOFF_DEVICES.sensors['SNZB-02'].modelId
}, null, 2));

module.exports = {
  SONOFF_DEVICES,
  exportAllDevices,
  toDriverComposeFormat
};
