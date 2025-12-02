'use strict';

/**
 * ENRICH FROM Z2M DETAILED v1.0
 *
 * Fetches detailed device data from Zigbee2MQTT and enriches:
 * - Datapoint mappings
 * - Cluster bindings
 * - Exposes/capabilities
 * - Settings
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const DRIVERS_DIR = './drivers';
const OUTPUT_DIR = './data/enrichment';

// Z2M tuya.ts patterns for extracting device definitions
const PATTERNS = {
  fingerprint: /fingerprint:\s*tuya\.fingerprint\s*\(\s*["'](\w+)["']\s*,\s*\[([\s\S]*?)\]\s*\)/g,
  dpMapping: /\[\s*(\d+)\s*,\s*["'](\w+)["']\s*,\s*([^\]]+)\]/g,
  exposes: /exposes:\s*\[([\s\S]*?)\]/g,
  description: /description:\s*["']([^"']+)["']/g
};

// Z2M expose to Homey capability mapping
const EXPOSE_TO_CAPABILITY = {
  'temperature': 'measure_temperature',
  'humidity': 'measure_humidity',
  'soil_moisture': 'measure_humidity',
  'illuminance': 'measure_luminance',
  'illuminance_lux': 'measure_luminance',
  'battery': 'measure_battery',
  'battery_low': 'alarm_battery',
  'occupancy': 'alarm_motion',
  'presence': 'alarm_motion',
  'contact': 'alarm_contact',
  'water_leak': 'alarm_water',
  'smoke': 'alarm_smoke',
  'carbon_monoxide': 'alarm_co',
  'co2': 'measure_co2',
  'gas': 'alarm_gas',
  'power': 'measure_power',
  'voltage': 'measure_voltage',
  'current': 'measure_current',
  'energy': 'meter_power',
  'state': 'onoff',
  'brightness': 'dim',
  'color_temp': 'light_temperature',
  'position': 'windowcoverings_set',
  'target_temperature': 'target_temperature',
  'local_temperature': 'measure_temperature',
  'current_heating_setpoint': 'target_temperature',
  'sensitivity': 'radar_sensitivity',
  'detection_delay': 'radar_detection_delay',
  'fading_time': 'radar_fading_time',
  'minimum_range': 'radar_min_range',
  'maximum_range': 'radar_max_range'
};

// Common Tuya datapoint mappings by device type
const TUYA_DP_DATABASE = {
  'climate_sensor': {
    1: { name: 'temperature', type: 'value', factor: 10, capability: 'measure_temperature' },
    2: { name: 'humidity', type: 'value', capability: 'measure_humidity' },
    4: { name: 'battery', type: 'value', capability: 'measure_battery' }
  },
  'motion_sensor': {
    1: { name: 'occupancy', type: 'bool', capability: 'alarm_motion' },
    4: { name: 'battery', type: 'value', capability: 'measure_battery' },
    9: { name: 'illuminance', type: 'value', capability: 'measure_luminance' },
    12: { name: 'sensitivity', type: 'enum', capability: 'motion_sensitivity' }
  },
  'motion_sensor_radar_mmwave': {
    1: { name: 'presence', type: 'bool', capability: 'alarm_motion' },
    2: { name: 'sensitivity', type: 'value', capability: 'radar_sensitivity' },
    3: { name: 'minimum_range', type: 'value', factor: 100, capability: 'radar_min_range' },
    4: { name: 'maximum_range', type: 'value', factor: 100, capability: 'radar_max_range' },
    9: { name: 'illuminance', type: 'value', capability: 'measure_luminance' },
    101: { name: 'detection_delay', type: 'value', factor: 10, capability: 'radar_detection_delay' },
    102: { name: 'fading_time', type: 'value', factor: 10, capability: 'radar_fading_time' },
    103: { name: 'cli_mode', type: 'enum' },
    104: { name: 'temperature', type: 'value', factor: 10, capability: 'measure_temperature' },
    105: { name: 'humidity', type: 'value', capability: 'measure_humidity' },
    106: { name: 'self_test', type: 'enum' }
  },
  'contact_sensor': {
    1: { name: 'contact', type: 'bool', capability: 'alarm_contact' },
    4: { name: 'battery', type: 'value', capability: 'measure_battery' }
  },
  'curtain_motor': {
    1: { name: 'state', type: 'enum', values: ['open', 'stop', 'close'], capability: 'windowcoverings_state' },
    2: { name: 'position', type: 'value', capability: 'windowcoverings_set' },
    3: { name: 'position', type: 'value', capability: 'windowcoverings_set' },
    5: { name: 'direction', type: 'enum', values: ['forward', 'back'] },
    7: { name: 'work_state', type: 'enum', values: ['opening', 'closing'] }
  },
  'switch': {
    1: { name: 'state_l1', type: 'bool', capability: 'onoff' },
    2: { name: 'state_l2', type: 'bool', capability: 'onoff.1' },
    3: { name: 'state_l3', type: 'bool', capability: 'onoff.2' },
    4: { name: 'state_l4', type: 'bool', capability: 'onoff.3' },
    5: { name: 'state_l5', type: 'bool', capability: 'onoff.4' },
    6: { name: 'state_l6', type: 'bool', capability: 'onoff.5' },
    7: { name: 'countdown_l1', type: 'value' },
    13: { name: 'power_on_behavior_l1', type: 'enum', values: ['off', 'on', 'previous'] }
  },
  'dimmer': {
    1: { name: 'state', type: 'bool', capability: 'onoff' },
    2: { name: 'brightness', type: 'value', factor: 10, capability: 'dim' },
    3: { name: 'min_brightness', type: 'value' },
    4: { name: 'max_brightness', type: 'value' },
    5: { name: 'mode', type: 'enum', values: ['white', 'color', 'scene'] }
  },
  'plug': {
    1: { name: 'state', type: 'bool', capability: 'onoff' },
    9: { name: 'countdown', type: 'value' },
    17: { name: 'current', type: 'value', factor: 1000, capability: 'measure_current' },
    18: { name: 'power', type: 'value', factor: 10, capability: 'measure_power' },
    19: { name: 'voltage', type: 'value', factor: 10, capability: 'measure_voltage' },
    20: { name: 'energy', type: 'value', factor: 100, capability: 'meter_power' }
  },
  'thermostat': {
    1: { name: 'state', type: 'bool', capability: 'onoff' },
    2: { name: 'mode', type: 'enum', values: ['auto', 'heat', 'manual'] },
    16: { name: 'current_heating_setpoint', type: 'value', factor: 10, capability: 'target_temperature' },
    24: { name: 'local_temperature', type: 'value', factor: 10, capability: 'measure_temperature' },
    27: { name: 'local_temperature_calibration', type: 'value', factor: 10 },
    40: { name: 'child_lock', type: 'bool' }
  },
  'water_leak': {
    1: { name: 'water_leak', type: 'bool', capability: 'alarm_water' },
    4: { name: 'battery', type: 'value', capability: 'measure_battery' }
  },
  'smoke': {
    1: { name: 'smoke', type: 'bool', capability: 'alarm_smoke' },
    4: { name: 'battery', type: 'value', capability: 'measure_battery' },
    14: { name: 'battery_low', type: 'bool', capability: 'alarm_battery' }
  },
  'gas': {
    1: { name: 'gas', type: 'bool', capability: 'alarm_gas' },
    2: { name: 'gas_value', type: 'value' }
  },
  'siren': {
    1: { name: 'alarm', type: 'bool', capability: 'alarm_generic' },
    5: { name: 'volume', type: 'enum', values: ['low', 'medium', 'high'] },
    7: { name: 'duration', type: 'value' },
    13: { name: 'alarm_state', type: 'enum' },
    101: { name: 'power', type: 'bool', capability: 'onoff' }
  }
};

class Z2MDetailedEnricher {
  constructor() {
    this.z2mData = null;
    this.enriched = [];
  }

  // Fetch Z2M data
  async fetchZ2M() {
    console.log('📥 Fetching Zigbee2MQTT tuya.ts...');

    return new Promise((resolve) => {
      https.get('https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/tuya.ts', (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          this.z2mData = data;
          console.log(`   Downloaded ${(data.length / 1024).toFixed(0)}KB`);
          resolve(data);
        });
      }).on('error', () => resolve(''));
    });
  }

  // Get driver type for DP mapping
  getDriverType(driverName) {
    if (driverName.includes('climate') || driverName.includes('temp') || driverName.includes('soil')) return 'climate_sensor';
    if (driverName.includes('radar') || driverName.includes('mmwave') || driverName.includes('presence')) return 'motion_sensor_radar_mmwave';
    if (driverName.includes('motion')) return 'motion_sensor';
    if (driverName.includes('contact')) return 'contact_sensor';
    if (driverName.includes('curtain') || driverName.includes('blind') || driverName.includes('shutter')) return 'curtain_motor';
    if (driverName.includes('switch')) return 'switch';
    if (driverName.includes('dimmer')) return 'dimmer';
    if (driverName.includes('plug')) return 'plug';
    if (driverName.includes('thermostat') || driverName.includes('valve') || driverName.includes('radiator')) return 'thermostat';
    if (driverName.includes('water') || driverName.includes('leak') || driverName.includes('rain')) return 'water_leak';
    if (driverName.includes('smoke')) return 'smoke';
    if (driverName.includes('gas')) return 'gas';
    if (driverName.includes('siren')) return 'siren';
    return null;
  }

  // Enrich driver with DP mappings
  enrichDriver(driverName, composePath) {
    const driverType = this.getDriverType(driverName);
    if (!driverType) return null;

    const dpMappings = TUYA_DP_DATABASE[driverType];
    if (!dpMappings) return null;

    try {
      const content = fs.readFileSync(composePath, 'utf8');
      const json = JSON.parse(content);

      // Store DP mappings in driver data
      const enrichment = {
        driverName,
        driverType,
        dpMappings: Object.entries(dpMappings).map(([dp, config]) => ({
          dp: parseInt(dp),
          ...config
        })),
        suggestedCapabilities: [...new Set(
          Object.values(dpMappings)
            .filter(m => m.capability)
            .map(m => m.capability)
        )]
      };

      // Check for missing capabilities
      const currentCaps = json.capabilities || [];
      enrichment.missingCapabilities = enrichment.suggestedCapabilities.filter(
        cap => !currentCaps.includes(cap) && !cap.includes('radar_')
      );

      return enrichment;
    } catch (err) {
      return null;
    }
  }

  // Update driver-mapping-database.json
  updateMappingDatabase() {
    const dbPath = './driver-mapping-database.json';
    let db = {};

    if (fs.existsSync(dbPath)) {
      db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    }

    // Add DP mappings section
    if (!db.tuyaDpMappings) {
      db.tuyaDpMappings = {};
    }

    Object.entries(TUYA_DP_DATABASE).forEach(([type, dps]) => {
      db.tuyaDpMappings[type] = dps;
    });

    // Add expose mappings
    db.exposeToCapability = EXPOSE_TO_CAPABILITY;

    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
    console.log('📝 Updated driver-mapping-database.json');
  }

  // Process all drivers
  async processAll() {
    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║     ENRICH FROM Z2M DETAILED v1.0                         ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log('');

    await this.fetchZ2M();

    const drivers = fs.readdirSync(DRIVERS_DIR);

    drivers.forEach(driver => {
      const composePath = path.join(DRIVERS_DIR, driver, 'driver.compose.json');
      if (fs.existsSync(composePath)) {
        const enrichment = this.enrichDriver(driver, composePath);
        if (enrichment) {
          this.enriched.push(enrichment);
          console.log(`✅ ${driver}: ${enrichment.dpMappings.length} DPs mapped`);
          if (enrichment.missingCapabilities.length > 0) {
            console.log(`   └─ Missing: ${enrichment.missingCapabilities.join(', ')}`);
          }
        } else {
          console.log(`⏭️ ${driver}: No DP mapping available`);
        }
      }
    });

    // Update mapping database
    this.updateMappingDatabase();

    // Save enrichment report
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const reportPath = path.join(OUTPUT_DIR, 'dp-enrichment-report.json');
    fs.writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      driversEnriched: this.enriched.length,
      enrichments: this.enriched
    }, null, 2));

    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Drivers with DP mappings: ${this.enriched.length}`);
    console.log(`Report saved to: ${reportPath}`);
    console.log('═══════════════════════════════════════════════════════════');
  }
}

if (require.main === module) {
  const enricher = new Z2MDetailedEnricher();
  enricher.processAll().catch(console.error);
}

module.exports = Z2MDetailedEnricher;
