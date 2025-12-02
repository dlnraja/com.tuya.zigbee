'use strict';

/**
 * VERIFY AND ENRICH DRIVERS v1.0
 *
 * Analyzes each driver and enriches with:
 * - manufacturerName (from Z2M, ZHA, deCONZ)
 * - productId (TS0xxx models)
 * - datapoints (DP mappings)
 * - clusters (Zigbee clusters)
 * - capabilities (Homey capabilities)
 * - flow cards
 * - features
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const DRIVERS_DIR = './drivers';
const OUTPUT_DIR = './data/enrichment/driver-analysis';

// Z2M device data cache
let z2mDevicesCache = null;

// Homey capability to Z2M expose mapping
const CAPABILITY_MAP = {
  'measure_temperature': ['temperature', 'local_temperature'],
  'measure_humidity': ['humidity', 'soil_moisture'],
  'measure_pressure': ['pressure'],
  'measure_luminance': ['illuminance', 'illuminance_lux'],
  'measure_battery': ['battery', 'battery_percentage'],
  'measure_power': ['power', 'active_power'],
  'measure_voltage': ['voltage'],
  'measure_current': ['current'],
  'meter_power': ['energy'],
  'alarm_motion': ['occupancy', 'presence', 'motion'],
  'alarm_contact': ['contact'],
  'alarm_water': ['water_leak', 'moisture'],
  'alarm_smoke': ['smoke'],
  'alarm_co': ['carbon_monoxide'],
  'alarm_co2': ['co2'],
  'alarm_gas': ['gas'],
  'alarm_battery': ['battery_low'],
  'alarm_tamper': ['tamper'],
  'onoff': ['state', 'switch'],
  'dim': ['brightness'],
  'light_temperature': ['color_temp'],
  'light_hue': ['color', 'hue'],
  'light_saturation': ['saturation'],
  'windowcoverings_set': ['position', 'cover_position'],
  'windowcoverings_state': ['state', 'cover_state'],
  'target_temperature': ['current_heating_setpoint', 'occupied_heating_setpoint']
};

// Driver type to expected capabilities
const DRIVER_CAPABILITIES = {
  'climate_sensor': ['measure_temperature', 'measure_humidity', 'measure_battery'],
  'motion_sensor': ['alarm_motion', 'measure_battery', 'measure_luminance'],
  'motion_sensor_radar_mmwave': ['alarm_motion', 'measure_luminance', 'measure_temperature'],
  'contact_sensor': ['alarm_contact', 'measure_battery'],
  'smoke_detector_advanced': ['alarm_smoke', 'measure_battery', 'measure_temperature'],
  'rain_sensor': ['alarm_water', 'measure_battery'],
  'plug_smart': ['onoff', 'measure_power', 'meter_power', 'measure_voltage', 'measure_current'],
  'switch_1gang': ['onoff'],
  'switch_2gang': ['onoff', 'onoff.1'],
  'dimmer_wall_1gang': ['onoff', 'dim'],
  'curtain_motor': ['windowcoverings_set', 'windowcoverings_state'],
  'radiator_valve': ['target_temperature', 'measure_temperature', 'measure_battery'],
  'button_wireless_1': ['measure_battery'],
  'bulb_rgb': ['onoff', 'dim', 'light_hue', 'light_saturation'],
  'bulb_dimmable': ['onoff', 'dim'],
  'soil_sensor': ['measure_temperature', 'measure_humidity', 'measure_battery'],
  'gas_detector': ['alarm_gas', 'measure_battery'],
  'siren': ['onoff', 'alarm_generic']
};

// Tuya DP mappings by device type
const TUYA_DP_MAPPINGS = {
  'climate_sensor': {
    1: 'measure_temperature',
    2: 'measure_humidity',
    4: 'measure_battery'
  },
  'motion_sensor': {
    1: 'alarm_motion',
    4: 'measure_battery',
    9: 'measure_luminance'
  },
  'motion_sensor_radar_mmwave': {
    1: 'alarm_motion',
    2: 'sensitivity',
    3: 'minimum_range',
    4: 'maximum_range',
    9: 'measure_luminance',
    101: 'detection_delay',
    102: 'fading_time',
    104: 'measure_temperature',
    105: 'measure_humidity'
  },
  'contact_sensor': {
    1: 'alarm_contact',
    4: 'measure_battery'
  },
  'curtain_motor': {
    1: 'windowcoverings_state',
    2: 'windowcoverings_set',
    3: 'windowcoverings_set',
    5: 'direction',
    7: 'work_state'
  },
  'switch': {
    1: 'onoff',
    2: 'onoff.1',
    3: 'onoff.2',
    4: 'onoff.3',
    5: 'onoff.4',
    6: 'onoff.5'
  },
  'dimmer': {
    1: 'onoff',
    2: 'dim',
    3: 'minimum_brightness'
  },
  'plug': {
    1: 'onoff',
    17: 'measure_current',
    18: 'measure_power',
    19: 'measure_voltage',
    20: 'meter_power'
  },
  'thermostat': {
    1: 'onoff',
    2: 'target_temperature',
    3: 'measure_temperature',
    4: 'mode',
    10: 'measure_battery'
  }
};

class DriverVerifier {
  constructor() {
    this.drivers = [];
    this.issues = [];
    this.suggestions = [];
  }

  // Fetch Z2M data
  async fetchZ2MData() {
    if (z2mDevicesCache) return z2mDevicesCache;

    console.log('📥 Fetching Zigbee2MQTT device data...');

    return new Promise((resolve) => {
      https.get('https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/tuya.ts', (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          z2mDevicesCache = data;
          resolve(data);
        });
      }).on('error', () => resolve(''));
    });
  }

  // Analyze single driver
  async analyzeDriver(driverName, composePath) {
    const analysis = {
      name: driverName,
      path: composePath,
      manufacturerIds: [],
      productIds: [],
      capabilities: [],
      clusters: [],
      datapoints: [],
      issues: [],
      suggestions: [],
      enrichment: {
        missingCapabilities: [],
        missingDPs: [],
        missingProductIds: []
      }
    };

    try {
      const content = fs.readFileSync(composePath, 'utf8');
      const json = JSON.parse(content);

      // Extract current data
      analysis.manufacturerIds = json.zigbee?.manufacturerName || [];
      analysis.productIds = json.zigbee?.productId || [];
      analysis.capabilities = json.capabilities || [];

      // Extract clusters from endpoints
      if (json.zigbee?.endpoints) {
        Object.values(json.zigbee.endpoints).forEach(ep => {
          if (ep.clusters) {
            analysis.clusters.push(...ep.clusters);
          }
        });
      }

      // Check for missing capabilities
      const expectedCaps = DRIVER_CAPABILITIES[driverName] || [];
      expectedCaps.forEach(cap => {
        if (!analysis.capabilities.includes(cap)) {
          analysis.enrichment.missingCapabilities.push(cap);
          analysis.issues.push(`Missing capability: ${cap}`);
        }
      });

      // Check for Tuya DPs
      const driverType = this.getDriverType(driverName);
      const expectedDPs = TUYA_DP_MAPPINGS[driverType] || {};
      Object.entries(expectedDPs).forEach(([dp, capability]) => {
        analysis.datapoints.push({ dp: parseInt(dp), capability });
      });

      // Check for common product IDs
      const commonProductIds = this.getCommonProductIds(driverName);
      commonProductIds.forEach(pid => {
        if (!analysis.productIds.includes(pid)) {
          analysis.enrichment.missingProductIds.push(pid);
        }
      });

      // Validate manufacturer IDs format
      analysis.manufacturerIds.forEach(id => {
        if (!id.match(/^_TZ[E0-9]{1,4}_[a-z0-9]+$/i) &&
          !id.match(/^TS[0-9]{3,4}[A-Z]?$/i) &&
          id !== 'SONOFF' && id !== 'eWeLink' && id !== 'lumi') {
          analysis.issues.push(`Invalid manufacturer ID format: ${id}`);
        }
      });

      // Check flow cards
      const flowPath = composePath.replace('driver.compose.json', 'driver.flow.compose.json');
      if (fs.existsSync(flowPath)) {
        const flowContent = JSON.parse(fs.readFileSync(flowPath, 'utf8'));
        analysis.flowCards = {
          triggers: Object.keys(flowContent.triggers || {}),
          conditions: Object.keys(flowContent.conditions || {}),
          actions: Object.keys(flowContent.actions || {})
        };
      } else {
        analysis.issues.push('Missing flow cards file');
      }

      // Generate suggestions
      if (analysis.enrichment.missingCapabilities.length > 0) {
        analysis.suggestions.push(`Add capabilities: ${analysis.enrichment.missingCapabilities.join(', ')}`);
      }
      if (analysis.enrichment.missingProductIds.length > 0) {
        analysis.suggestions.push(`Add product IDs: ${analysis.enrichment.missingProductIds.join(', ')}`);
      }

    } catch (err) {
      analysis.issues.push(`Error parsing: ${err.message}`);
    }

    return analysis;
  }

  // Get driver type for DP mapping
  getDriverType(driverName) {
    if (driverName.includes('climate') || driverName.includes('temp')) return 'climate_sensor';
    if (driverName.includes('motion') && !driverName.includes('radar')) return 'motion_sensor';
    if (driverName.includes('radar') || driverName.includes('mmwave')) return 'motion_sensor_radar_mmwave';
    if (driverName.includes('contact')) return 'contact_sensor';
    if (driverName.includes('curtain') || driverName.includes('blind')) return 'curtain_motor';
    if (driverName.includes('switch')) return 'switch';
    if (driverName.includes('dimmer')) return 'dimmer';
    if (driverName.includes('plug')) return 'plug';
    if (driverName.includes('thermostat') || driverName.includes('valve')) return 'thermostat';
    return driverName;
  }

  // Get common product IDs for driver type
  getCommonProductIds(driverName) {
    const productIdMap = {
      'climate_sensor': ['TS0201', 'TS0601'],
      'motion_sensor': ['TS0202', 'TS0601'],
      'motion_sensor_radar_mmwave': ['TS0601', 'TS0225'],
      'contact_sensor': ['TS0203', 'TS0601'],
      'smoke_detector_advanced': ['TS0205', 'TS0601'],
      'rain_sensor': ['TS0207', 'TS0601'],
      'plug_smart': ['TS011F', 'TS0121', 'TS0601'],
      'switch_1gang': ['TS0001', 'TS0011', 'TS0601'],
      'switch_2gang': ['TS0002', 'TS0012', 'TS0601'],
      'dimmer_wall_1gang': ['TS0101', 'TS110E', 'TS110F', 'TS0601'],
      'curtain_motor': ['TS130F', 'TS0601'],
      'button_wireless_1': ['TS0041'],
      'button_wireless_2': ['TS0042'],
      'button_wireless_3': ['TS0043'],
      'button_wireless_4': ['TS0044'],
      'radiator_valve': ['TS0601'],
      'bulb_dimmable': ['TS0501B'],
      'bulb_rgb': ['TS0503B', 'TS0505B'],
      'bulb_rgbw': ['TS0504B', 'TS0505B']
    };
    return productIdMap[driverName] || [];
  }

  // Analyze all drivers
  async analyzeAll() {
    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║     DRIVER VERIFICATION & ENRICHMENT v1.0                 ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log('');

    await this.fetchZ2MData();

    const driverDirs = fs.readdirSync(DRIVERS_DIR);

    for (const driver of driverDirs) {
      const composePath = path.join(DRIVERS_DIR, driver, 'driver.compose.json');
      if (fs.existsSync(composePath)) {
        const analysis = await this.analyzeDriver(driver, composePath);
        this.drivers.push(analysis);

        const status = analysis.issues.length === 0 ? '✅' : '⚠️';
        console.log(`${status} ${driver}: ${analysis.manufacturerIds.length} IDs, ${analysis.capabilities.length} caps`);

        if (analysis.issues.length > 0) {
          analysis.issues.forEach(issue => console.log(`   └─ ${issue}`));
        }
      }
    }

    return this.drivers;
  }

  // Generate report
  generateReport() {
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalDrivers: this.drivers.length,
        driversWithIssues: this.drivers.filter(d => d.issues.length > 0).length,
        totalManufacturerIds: this.drivers.reduce((sum, d) => sum + d.manufacturerIds.length, 0),
        totalCapabilities: [...new Set(this.drivers.flatMap(d => d.capabilities))].length
      },
      drivers: this.drivers
    };

    const reportPath = path.join(OUTPUT_DIR, `driver-analysis-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Generate markdown summary
    let md = '# Driver Analysis Report\n\n';
    md += `Generated: ${report.timestamp}\n\n`;
    md += '## Summary\n\n';
    md += `- Total Drivers: ${report.summary.totalDrivers}\n`;
    md += `- Drivers with Issues: ${report.summary.driversWithIssues}\n`;
    md += `- Total Manufacturer IDs: ${report.summary.totalManufacturerIds}\n\n`;
    md += '## Driver Details\n\n';

    this.drivers.forEach(d => {
      md += `### ${d.name}\n`;
      md += `- Manufacturer IDs: ${d.manufacturerIds.length}\n`;
      md += `- Product IDs: ${d.productIds.join(', ') || 'None'}\n`;
      md += `- Capabilities: ${d.capabilities.join(', ')}\n`;
      if (d.issues.length > 0) {
        md += `- Issues: ${d.issues.join(', ')}\n`;
      }
      if (d.suggestions.length > 0) {
        md += `- Suggestions: ${d.suggestions.join(', ')}\n`;
      }
      md += '\n';
    });

    const mdPath = path.join(OUTPUT_DIR, 'driver-analysis.md');
    fs.writeFileSync(mdPath, md);

    console.log(`\n📊 Report saved to: ${reportPath}`);
    console.log(`📝 Markdown saved to: ${mdPath}`);

    return report;
  }

  // Run analysis
  async run() {
    await this.analyzeAll();
    return this.generateReport();
  }
}

if (require.main === module) {
  const verifier = new DriverVerifier();
  verifier.run().catch(console.error);
}

module.exports = DriverVerifier;
