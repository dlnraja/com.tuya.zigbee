'use strict';

/**
 * ADD MISSING DRIVERS v1.0
 *
 * Creates missing drivers based on the complete driver list
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = './drivers';

// Missing drivers to create based on the comprehensive list
const MISSING_DRIVERS = [
  // Scene switches
  {
    id: 'scene_switch_1',
    name: { en: 'Scene Switch 1-Gang', fr: 'Interrupteur Scène 1 Bouton' },
    class: 'button',
    capabilities: ['button', 'measure_battery'],
    manufacturerName: ['_TZ3000_bi6lpsew', '_TZ3000_dfgbtub0', '_TZ3000_gjrubzje'],
    productId: ['TS0041'],
    clusters: [0, 1, 6],
    icon: 'button',
    color: '#607D8B'
  },
  {
    id: 'scene_switch_2',
    name: { en: 'Scene Switch 2-Gang', fr: 'Interrupteur Scène 2 Boutons' },
    class: 'button',
    capabilities: ['button.1', 'button.2', 'measure_battery'],
    manufacturerName: ['_TZ3000_4fjiwweb', '_TZ3000_owgcnkrh', '_TZ3000_dfgbtub0'],
    productId: ['TS0042'],
    clusters: [0, 1, 6],
    icon: 'remote',
    color: '#607D8B'
  },
  {
    id: 'scene_switch_3',
    name: { en: 'Scene Switch 3-Gang', fr: 'Interrupteur Scène 3 Boutons' },
    class: 'button',
    capabilities: ['button.1', 'button.2', 'button.3', 'measure_battery'],
    manufacturerName: ['_TZ3000_gbm10jnj', '_TZ3000_qzjcsmar', '_TZ3000_rrjr1q0u'],
    productId: ['TS0043'],
    clusters: [0, 1, 6],
    icon: 'remote',
    color: '#607D8B'
  },
  {
    id: 'scene_switch_4',
    name: { en: 'Scene Switch 4-Gang', fr: 'Interrupteur Scène 4 Boutons' },
    class: 'button',
    capabilities: ['button.1', 'button.2', 'button.3', 'button.4', 'measure_battery'],
    manufacturerName: ['_TZ3000_vp6clf9d', '_TZ3000_xabckq1v', '_TZ3000_ee8nrt2l'],
    productId: ['TS0044'],
    clusters: [0, 1, 6],
    icon: 'remote',
    color: '#607D8B'
  },
  {
    id: 'scene_switch_6',
    name: { en: 'Scene Switch 6-Gang', fr: 'Interrupteur Scène 6 Boutons' },
    class: 'button',
    capabilities: ['button.1', 'button.2', 'button.3', 'button.4', 'button.5', 'button.6', 'measure_battery'],
    manufacturerName: ['_TZ3000_msl6wxk9', '_TZ3000_u3oupgdy'],
    productId: ['TS0046'],
    clusters: [0, 1, 6],
    icon: 'remote',
    color: '#607D8B'
  },

  // Smart plugs with variants
  {
    id: 'switch_plug_1',
    name: { en: 'Smart Plug 1-Gang', fr: 'Prise Connectée 1 Gang' },
    class: 'socket',
    capabilities: ['onoff', 'measure_power', 'meter_power'],
    manufacturerName: ['_TZ3000_gjnozsaz', '_TZ3000_3ooaz3ng', '_TZ3000_w0qqde0g'],
    productId: ['TS011F', 'TS0121'],
    clusters: [0, 6, 2820, 1794],
    icon: 'plug_smart',
    color: '#8BC34A'
  },
  {
    id: 'switch_plug_2',
    name: { en: 'Smart Plug 2-Gang', fr: 'Prise Connectée 2 Gangs' },
    class: 'socket',
    capabilities: ['onoff.1', 'onoff.2', 'measure_power', 'meter_power'],
    manufacturerName: ['_TZ3000_txpirhfq', '_TZ3000_1hwjutgo'],
    productId: ['TS011F'],
    clusters: [0, 6, 2820, 1794],
    icon: 'plug_smart',
    color: '#8BC34A'
  },

  // Valve controllers
  {
    id: 'valve_1',
    name: { en: 'Smart Valve 1-Way', fr: 'Vanne Connectée 1 Voie' },
    class: 'other',
    capabilities: ['onoff', 'valve_position'],
    manufacturerName: ['_TZ3000_tvuarksa', '_TZ3000_o4cjetlm'],
    productId: ['TS000A', 'TS0001'],
    clusters: [0, 6, 8],
    icon: 'water_leak',
    color: '#00BCD4'
  },
  {
    id: 'valve_4',
    name: { en: 'Smart Valve 4-Way', fr: 'Vanne Connectée 4 Voies' },
    class: 'other',
    capabilities: ['valve_position.1', 'valve_position.2', 'valve_position.3', 'valve_position.4'],
    manufacturerName: ['_TZ3000_kdi2o9m6'],
    productId: ['TS0601'],
    clusters: [0, 61184],
    icon: 'water_leak',
    color: '#00BCD4'
  },

  // CO sensor
  {
    id: 'co_sensor',
    name: { en: 'CO Sensor', fr: 'Capteur CO' },
    class: 'sensor',
    capabilities: ['alarm_co', 'measure_battery'],
    manufacturerName: ['_TZ3000_nbm3pjii', '_TZ3000_xr3htd96'],
    productId: ['TS0203', 'TS0601'],
    clusters: [0, 1, 1280],
    icon: 'gas_detector',
    color: '#FF9800'
  },

  // Vibration sensor
  {
    id: 'vibration_sensor',
    name: { en: 'Vibration Sensor', fr: 'Capteur de Vibration' },
    class: 'sensor',
    capabilities: ['alarm_vibration', 'measure_battery'],
    manufacturerName: ['_TZ3000_bmg14ax2', '_TZ3000_rcuyhwe3'],
    productId: ['TS0209', 'TS0210'],
    clusters: [0, 1, 257, 1280],
    icon: 'motion_sensor',
    color: '#2196F3'
  },

  // Multi-thermostat
  {
    id: 'thermostat_4ch',
    name: { en: 'Thermostat 4-Channel', fr: 'Thermostat 4 Canaux' },
    class: 'thermostat',
    capabilities: ['target_temperature.1', 'target_temperature.2', 'target_temperature.3', 'target_temperature.4',
      'measure_temperature.1', 'measure_temperature.2', 'measure_temperature.3', 'measure_temperature.4',
      'thermostat_mode'],
    manufacturerName: ['_TZE200_mudxchsu', '_TZE200_zion52ef'],
    productId: ['TS0601'],
    clusters: [0, 61184],
    icon: 'thermostat',
    color: '#F44336'
  },

  // Smart heater
  {
    id: 'smart_heater',
    name: { en: 'Smart Heater', fr: 'Chauffage Connecté' },
    class: 'heater',
    capabilities: ['onoff', 'target_temperature', 'thermostat_mode', 'measure_temperature'],
    manufacturerName: ['_TZE200_aoclfnxz', '_TZE200_2ekuz3dz'],
    productId: ['TS0601'],
    clusters: [0, 61184],
    icon: 'thermostat',
    color: '#F44336'
  },

  // Power meter standalone
  {
    id: 'power_meter',
    name: { en: 'Power Meter', fr: 'Compteur Électrique' },
    class: 'sensor',
    capabilities: ['measure_power', 'meter_power', 'measure_voltage', 'measure_current'],
    manufacturerName: ['_TZ3000_byfdwktr', '_TZ3000_qeuvnohg'],
    productId: ['TS011F', 'TS0121'],
    clusters: [0, 6, 2820, 1794],
    icon: 'plug_smart',
    color: '#8BC34A'
  },

  // LED controllers
  {
    id: 'led_controller_rgb',
    name: { en: 'LED Controller RGB', fr: 'Contrôleur LED RGB' },
    class: 'light',
    capabilities: ['onoff', 'dim', 'light_hue', 'light_saturation', 'light_temperature', 'light_mode'],
    manufacturerName: ['_TZ3000_gznh2xla', '_TZ3000_dbou1ap4'],
    productId: ['TS0503', 'TS0504'],
    clusters: [0, 6, 8, 768],
    icon: 'led_strip',
    color: '#FF9800'
  },
  {
    id: 'led_controller_cct',
    name: { en: 'LED Controller CCT', fr: 'Contrôleur LED CCT' },
    class: 'light',
    capabilities: ['onoff', 'dim', 'light_temperature', 'light_mode'],
    manufacturerName: ['_TZ3000_9hpxg80k', '_TZ3000_obacbukl'],
    productId: ['TS0502'],
    clusters: [0, 6, 8, 768],
    icon: 'led_strip',
    color: '#FF9800'
  },

  // Smart RCBO (circuit breaker)
  {
    id: 'smart_rcbo',
    name: { en: 'Smart RCBO', fr: 'Disjoncteur Différentiel Connecté' },
    class: 'other',
    capabilities: ['onoff', 'alarm_generic', 'measure_power', 'meter_power', 'measure_current', 'measure_voltage'],
    manufacturerName: ['_TZE200_hkdl5fmv', '_TZE204_hkdl5fmv'],
    productId: ['TS0601'],
    clusters: [0, 61184],
    icon: 'switch_1gang',
    color: '#4CAF50'
  },

  // Energy meter 3-phase
  {
    id: 'energy_meter_3phase',
    name: { en: 'Energy Meter 3-Phase', fr: 'Compteur Triphasé' },
    class: 'sensor',
    capabilities: ['measure_power', 'meter_power', 'measure_voltage', 'measure_current',
      'measure_power.phase1', 'measure_power.phase2', 'measure_power.phase3'],
    manufacturerName: ['_TZE200_nslr42tt', '_TZE204_nslr42tt'],
    productId: ['TS0601'],
    clusters: [0, 61184, 2820, 1794],
    icon: 'plug_smart',
    color: '#8BC34A'
  },

  // Curtain motor 2 (with tilt)
  {
    id: 'curtain_motor_tilt',
    name: { en: 'Curtain Motor with Tilt', fr: 'Moteur Volet avec Inclinaison' },
    class: 'windowcoverings',
    capabilities: ['windowcoverings_state', 'windowcoverings_set', 'windowcoverings_tilt_set', 'alarm_motor'],
    manufacturerName: ['_TZE200_cowvfni3', '_TZE200_wmcdj3aq'],
    productId: ['TS0601'],
    clusters: [0, 258, 61184],
    icon: 'curtain_motor',
    color: '#9C27B0'
  }
];

// SVG icon paths
const ICON_PATHS = {
  button: `<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="12" r="4" fill="currentColor"/>`,
  remote: `<rect x="7" y="2" width="10" height="20" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="7" r="2" fill="currentColor"/><rect x="9" y="11" width="6" height="2" rx="0.5" fill="currentColor"/><rect x="9" y="15" width="6" height="2" rx="0.5" fill="currentColor"/>`,
  plug_smart: `<rect x="6" y="3" width="12" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="9" cy="9" r="1.5" fill="currentColor"/><circle cx="15" cy="9" r="1.5" fill="currentColor"/><path d="M9 14h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,
  water_leak: `<path d="M12 2C8 6 6 10 6 13c0 3.3 2.7 6 6 6s6-2.7 6-6c0-3-2-7-6-11z" fill="none" stroke="currentColor" stroke-width="1.5"/>`,
  gas_detector: `<rect x="4" y="4" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.5"/>`,
  motion_sensor: `<circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M6 20c0-4 2.5-6 6-6s6 2 6 6" fill="none" stroke="currentColor" stroke-width="1.5"/>`,
  thermostat: `<circle cx="12" cy="14" r="7" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M12 4v4M12 11v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="14" r="3" fill="currentColor"/>`,
  led_strip: `<rect x="2" y="8" width="20" height="8" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="6" cy="12" r="1.5" fill="currentColor"/><circle cx="10" cy="12" r="1.5" fill="currentColor"/><circle cx="14" cy="12" r="1.5" fill="currentColor"/><circle cx="18" cy="12" r="1.5" fill="currentColor"/>`,
  switch_1gang: `<rect x="4" y="2" width="16" height="20" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="8" y="6" width="8" height="12" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="10" r="2" fill="currentColor"/>`,
  curtain_motor: `<rect x="2" y="2" width="20" height="4" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M4 6v14c0 1 1 2 4 2M20 6v14c0 1-1 2-4 2" stroke="currentColor" stroke-width="1.5"/>`
};

function createDriver(config) {
  const driverDir = path.join(DRIVERS_DIR, config.id);
  const assetsDir = path.join(driverDir, 'assets');
  const imagesDir = path.join(assetsDir, 'images');

  // Create directories
  [driverDir, assetsDir, imagesDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // Create driver.compose.json
  const compose = {
    name: config.name,
    class: config.class,
    capabilities: config.capabilities,
    energy: config.class === 'sensor' ? { batteries: ['AAA', 'AAA'] } : undefined,
    zigbee: {
      manufacturerName: config.manufacturerName,
      productId: config.productId,
      endpoints: {
        1: {
          clusters: config.clusters
        }
      }
    },
    images: {
      small: `drivers/${config.id}/assets/images/small.png`,
      large: `drivers/${config.id}/assets/images/large.png`,
      xlarge: `drivers/${config.id}/assets/images/xlarge.png`
    },
    id: config.id,
    platforms: ['local'],
    connectivity: ['zigbee']
  };

  fs.writeFileSync(
    path.join(driverDir, 'driver.compose.json'),
    JSON.stringify(compose, null, 2)
  );

  // Create device.js
  const deviceJs = `'use strict';

const BaseHybridDevice = require('../../lib/devices/BaseHybridDevice');

class ${config.id.split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('')}Device extends BaseHybridDevice {
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('${config.name.en} initialized');
  }
}

module.exports = ${config.id.split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('')}Device;
`;

  fs.writeFileSync(path.join(driverDir, 'device.js'), deviceJs);

  // Create driver.js
  const driverJs = `'use strict';

const Homey = require('homey');

class ${config.id.split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('')}Driver extends Homey.Driver {
  async onInit() {
    this.log('${config.name.en} Driver initialized');
  }
}

module.exports = ${config.id.split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('')}Driver;
`;

  fs.writeFileSync(path.join(driverDir, 'driver.js'), driverJs);

  // Create icon.svg
  const iconPath = ICON_PATHS[config.icon] || ICON_PATHS.button;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" style="color: ${config.color}">
  ${iconPath}
</svg>`;

  fs.writeFileSync(path.join(assetsDir, 'icon.svg'), svg);

  return config.id;
}

function run() {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════════════╗');
  console.log('║     ADD MISSING DRIVERS v1.0                                      ║');
  console.log('╚═══════════════════════════════════════════════════════════════════╝');
  console.log('');

  const existing = fs.readdirSync(DRIVERS_DIR).filter(d =>
    fs.existsSync(path.join(DRIVERS_DIR, d, 'driver.compose.json'))
  );

  console.log(`Existing drivers: ${existing.length}`);

  let created = 0;
  let skipped = 0;

  MISSING_DRIVERS.forEach(config => {
    if (existing.includes(config.id)) {
      console.log(`⏭️ ${config.id}: Already exists`);
      skipped++;
    } else {
      createDriver(config);
      console.log(`✅ ${config.id}: Created`);
      created++;
    }
  });

  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log(`Created: ${created}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Total drivers: ${existing.length + created}`);
  console.log('═══════════════════════════════════════════════════════════════════');
}

if (require.main === module) {
  run();
}

module.exports = { run, MISSING_DRIVERS };
