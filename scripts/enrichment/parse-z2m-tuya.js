'use strict';

/**
 * PARSE ZIGBEE2MQTT TUYA.TS v1.0
 *
 * Parses the Zigbee2MQTT tuya.ts file to extract:
 * - Device fingerprints (manufacturer IDs)
 * - Datapoint mappings
 * - Exposes (capabilities)
 * - Device descriptions
 *
 * Converts to Homey SDK3 format
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const Z2M_TUYA_URL = 'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/tuya.ts';
const OUTPUT_DIR = './data/enrichment';

// Zigbee2MQTT to Homey capability mapping
const CAPABILITY_MAP = {
  'temperature': 'measure_temperature',
  'humidity': 'measure_humidity',
  'pressure': 'measure_pressure',
  'illuminance': 'measure_luminance',
  'illuminance_lux': 'measure_luminance',
  'battery': 'measure_battery',
  'battery_low': 'alarm_battery',
  'occupancy': 'alarm_motion',
  'presence': 'alarm_motion',
  'motion': 'alarm_motion',
  'contact': 'alarm_contact',
  'water_leak': 'alarm_water',
  'smoke': 'alarm_smoke',
  'carbon_monoxide': 'alarm_co',
  'gas': 'alarm_gas',
  'tamper': 'alarm_tamper',
  'power': 'measure_power',
  'voltage': 'measure_voltage',
  'current': 'measure_current',
  'energy': 'meter_power',
  'position': 'windowcoverings_set',
  'state': 'onoff',
  'brightness': 'dim',
  'color_temp': 'light_temperature',
  'color': 'light_hue'
};

// Datapoint to capability category mapping
const DP_CATEGORIES = {
  // Climate
  1: { category: 'climate', capability: 'measure_temperature' },
  2: { category: 'climate', capability: 'measure_humidity' },
  4: { category: 'climate', capability: 'measure_battery' },

  // Motion/Presence
  1: { category: 'presence', capability: 'alarm_motion' },
  9: { category: 'presence', capability: 'measure_luminance' },
  12: { category: 'presence', capability: 'distance' },

  // Switch
  1: { category: 'switch', capability: 'onoff' },
  2: { category: 'switch', capability: 'onoff.2' },

  // Curtain
  1: { category: 'curtain', capability: 'windowcoverings_state' },
  2: { category: 'curtain', capability: 'windowcoverings_set' },

  // Power
  1: { category: 'power', capability: 'onoff' },
  17: { category: 'power', capability: 'measure_power' },
  18: { category: 'power', capability: 'meter_power' },
  19: { category: 'power', capability: 'measure_voltage' },
  20: { category: 'power', capability: 'measure_current' }
};

class Z2MTuyaParser {
  constructor() {
    this.devices = [];
    this.fingerprints = new Map();
    this.datapointMappings = [];
    this.exposes = new Set();
  }

  // Fetch Z2M tuya.ts
  fetchTuyaTs() {
    return new Promise((resolve, reject) => {
      https.get(Z2M_TUYA_URL, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
      }).on('error', reject);
    });
  }

  // Parse fingerprints from tuya.ts
  parseFingerprints(content) {
    console.log('🔍 Parsing fingerprints...');

    // Pattern: fingerprint: tuya.fingerprint("TS0601", ["_TZE200_xxx", "_TZE204_yyy"])
    const fingerprintRegex = /fingerprint:\s*tuya\.fingerprint\s*\(\s*["'](\w+)["']\s*,\s*\[([\s\S]*?)\]\s*\)/g;

    let match;
    while ((match = fingerprintRegex.exec(content)) !== null) {
      const modelId = match[1];
      const idsStr = match[2];

      // Extract individual IDs
      const idRegex = /["']([^"']+)["']/g;
      let idMatch;
      while ((idMatch = idRegex.exec(idsStr)) !== null) {
        const manufacturerId = idMatch[1];
        if (manufacturerId.match(/^_TZ/)) {
          this.fingerprints.set(manufacturerId.toLowerCase(), {
            modelId,
            source: 'z2m-fingerprint'
          });
        }
      }
    }

    // Pattern: zigbeeModel: ["TS0001"], then find tuya.whitelabel with IDs
    const whitelabelRegex = /tuya\.whitelabel\s*\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']\s*,\s*\[([\s\S]*?)\]\s*\)/g;

    while ((match = whitelabelRegex.exec(content)) !== null) {
      const vendor = match[1];
      const model = match[2];
      const description = match[3];
      const idsStr = match[4];

      const idRegex = /["']([^"']+)["']/g;
      let idMatch;
      while ((idMatch = idRegex.exec(idsStr)) !== null) {
        const manufacturerId = idMatch[1];
        if (manufacturerId.match(/^_TZ/)) {
          this.fingerprints.set(manufacturerId.toLowerCase(), {
            vendor,
            model,
            description,
            source: 'z2m-whitelabel'
          });
        }
      }
    }

    console.log(`   Found ${this.fingerprints.size} fingerprints`);
  }

  // Parse datapoint mappings
  parseDatapoints(content) {
    console.log('📊 Parsing datapoint mappings...');

    // Pattern: [dp, "capability", converter]
    const dpRegex = /\[\s*(\d+)\s*,\s*["'](\w+)["']/g;

    let match;
    while ((match = dpRegex.exec(content)) !== null) {
      const dp = parseInt(match[1]);
      const capability = match[2];

      this.datapointMappings.push({
        dp,
        z2mCapability: capability,
        homeyCapability: CAPABILITY_MAP[capability] || capability
      });
    }

    // Deduplicate
    const unique = new Map();
    this.datapointMappings.forEach(m => {
      const key = `${m.dp}-${m.z2mCapability}`;
      if (!unique.has(key)) {
        unique.set(key, m);
      }
    });
    this.datapointMappings = Array.from(unique.values());

    console.log(`   Found ${this.datapointMappings.length} datapoint mappings`);
  }

  // Parse device exposes
  parseExposes(content) {
    console.log('🎯 Parsing exposes...');

    // Pattern: e.xxx() where xxx is a capability
    const exposesRegex = /e\.(\w+)\s*\(/g;

    let match;
    while ((match = exposesRegex.exec(content)) !== null) {
      const expose = match[1];
      if (!['numeric', 'binary', 'enum', 'text', 'composite', 'list'].includes(expose)) {
        this.exposes.add(expose);
      }
    }

    console.log(`   Found ${this.exposes.size} unique exposes`);
  }

  // Parse device definitions
  parseDevices(content) {
    console.log('📱 Parsing device definitions...');

    // Find device blocks
    const deviceRegex = /\{\s*(?:fingerprint|zigbeeModel)[\s\S]*?(?:description:\s*["']([^"']+)["'])/g;

    let match;
    let count = 0;
    while ((match = deviceRegex.exec(content)) !== null) {
      const description = match[1];
      if (description) {
        this.devices.push({ description });
        count++;
      }
    }

    console.log(`   Found ${count} device definitions`);
  }

  // Convert to Homey format
  convertToHomey() {
    console.log('🔄 Converting to Homey SDK3 format...');

    const homeyDevices = [];

    this.fingerprints.forEach((info, manufacturerId) => {
      homeyDevices.push({
        manufacturerId,
        modelId: info.modelId || 'TS0601',
        vendor: info.vendor || 'Tuya',
        description: info.description || '',
        source: info.source,
        recommendedDriver: this.guessDriver(manufacturerId, info)
      });
    });

    return {
      generated: new Date().toISOString(),
      source: 'zigbee2mqtt/tuya.ts',
      stats: {
        fingerprints: this.fingerprints.size,
        datapointMappings: this.datapointMappings.length,
        exposes: this.exposes.size
      },
      devices: homeyDevices,
      datapointMappings: this.datapointMappings,
      exposes: Array.from(this.exposes).sort(),
      capabilityMap: CAPABILITY_MAP
    };
  }

  // Guess appropriate Homey driver
  guessDriver(manufacturerId, info) {
    const id = manufacturerId.toLowerCase();
    const desc = (info.description || '').toLowerCase();

    if (desc.includes('thermostat') || desc.includes('trv') || desc.includes('radiator')) {
      return 'thermostat';
    }
    if (desc.includes('presence') || desc.includes('radar') || desc.includes('mmwave')) {
      return 'motion_sensor_radar_mmwave';
    }
    if (desc.includes('motion') || desc.includes('pir')) {
      return 'motion_sensor';
    }
    if (desc.includes('temperature') || desc.includes('humidity') || desc.includes('climate')) {
      return 'climate_sensor';
    }
    if (desc.includes('curtain') || desc.includes('blind') || desc.includes('cover')) {
      return 'curtain_motor';
    }
    if (desc.includes('switch') || desc.includes('gang')) {
      return 'switch_1gang';
    }
    if (desc.includes('plug') || desc.includes('socket') || desc.includes('outlet')) {
      return 'plug_smart';
    }
    if (desc.includes('dimmer')) {
      return 'dimmer_wall_1gang';
    }
    if (desc.includes('button') || desc.includes('remote')) {
      return 'button_wireless_1';
    }
    if (desc.includes('door') || desc.includes('window') || desc.includes('contact')) {
      return 'contact_sensor';
    }
    if (desc.includes('smoke')) {
      return 'smoke_detector_advanced';
    }
    if (desc.includes('water') || desc.includes('leak')) {
      return 'rain_sensor';
    }

    // Default based on ID pattern
    if (id.startsWith('_tze2') || id.startsWith('_tze3')) {
      return 'climate_sensor'; // TS0601 devices often climate
    }

    return 'unknown';
  }

  // Main run
  async run() {
    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║     ZIGBEE2MQTT TUYA.TS PARSER v1.0                       ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log('');

    // Fetch tuya.ts
    console.log('📥 Fetching Zigbee2MQTT tuya.ts...');
    const content = await this.fetchTuyaTs();
    console.log(`   Downloaded ${(content.length / 1024).toFixed(0)}KB`);

    // Parse
    this.parseFingerprints(content);
    this.parseDatapoints(content);
    this.parseExposes(content);
    this.parseDevices(content);

    // Convert
    const homeyData = this.convertToHomey();

    // Save
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const outputPath = path.join(OUTPUT_DIR, 'z2m-tuya-parsed.json');
    fs.writeFileSync(outputPath, JSON.stringify(homeyData, null, 2));

    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('PARSING COMPLETE:');
    console.log(`  Fingerprints: ${homeyData.stats.fingerprints}`);
    console.log(`  DP Mappings:  ${homeyData.stats.datapointMappings}`);
    console.log(`  Exposes:      ${homeyData.stats.exposes}`);
    console.log(`  Output:       ${outputPath}`);
    console.log('═══════════════════════════════════════════════════════════');

    return homeyData;
  }
}

// Run if called directly
if (require.main === module) {
  const parser = new Z2MTuyaParser();
  parser.run().catch(console.error);
}

module.exports = Z2MTuyaParser;
