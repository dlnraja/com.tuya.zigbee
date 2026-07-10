#!/usr/bin/env node
'use strict';

/**
 * Driver Generator Engine v1.0.0
 * ==========================================================================
 * Reads mfs_db.json and auto-generates driver files for uncovered Tuya Zigbee
 * devices. For each device in the database that has no existing driver:
 *   1. Generates driver.compose.json with fingerprints, capabilities, metadata
 *   2. Generates driver.js (ZigBee driver class with flow card registration)
 *   3. Generates device.js (BaseUnifiedDevice subclass with DP handling)
 *   4. Injects new capabilities into .homeycompose/app.json
 *
 * Modes:
 *   --dry-run          Show what would be generated without writing files
 *   --device=<mfrId>   Generate a single driver for a specific manufacturer ID
 *   --type=<type>      Filter by device type (switch, sensor, light, etc.)
 *   --min-confidence=0 Only generate for devices with >= this confidence
 *   --enrich=<driver>  Enrich an existing driver with new manufacturer IDs
 *   --report           Print summary report without generating anything
 *
 * Usage:
 *   node scripts/automation/driver-generator.js
 *   node scripts/automation/driver-generator.js --dry-run
 *   node scripts/automation/driver-generator.js --device=_TZE200_pay2byax
 *   node scripts/automation/driver-generator.js --type=sensor --min-confidence=0.3
 *   node scripts/automation/driver-generator.js --enrich=air_purifier
 *   node scripts/automation/driver-generator.js --report
 */

const fs = require('fs');
const path = require('path');

// ── Paths ───────────────────────────────────────────────────────────────────
const REPO_ROOT = path.resolve(__dirname, '../..');
const DATA_DIR = path.join(REPO_ROOT, 'data');
const DRIVERS_DIR = path.join(REPO_ROOT, 'drivers');
const MFS_DB_PATH = path.join(DATA_DIR, 'mfs_db.json');
const COMPOSE_PATH = path.join(REPO_ROOT, '.homeycompose', 'app.json');

// ── Colours ─────────────────────────────────────────────────────────────────
const C = {
  G: '\x1b[32m', Y: '\x1b[33m', R: '\x1b[31m', B: '\x1b[34m',
  M: '\x1b[35m', D: '\x1b[90m', W: '\x1b[37m', X: '\x1b[0m',
};
const log = (c, ...a) => console.log(`${c}${a.join(' ')}${C.X}`);

// ── CLI arguments ───────────────────────────────────────────────────────────
const ARGS = process.argv.slice(2);
const FLAG = (name) => ARGS.some(a => a === `--${name}` || a === `-${name}`);
const OPT = (name) => {
  const a = ARGS.find(x => x.startsWith(`--${name}=`));
  return a ? a.split('=').slice(1).join('=') : null;
};

const DRY_RUN = FLAG('dry-run');
const REPORT_ONLY = FLAG('report');
const SINGLE_DEVICE = OPT('device');
const TYPE_FILTER = OPT('type');
const MIN_CONFIDENCE = parseFloat(OPT('min-confidence') || '0');
const ENRICH_TARGET = OPT('enrich');

// ═══════════════════════════════════════════════════════════════════════════════
// DEVICE TYPE -> CLASS / CAPABILITIES MAPPING
// ═══════════════════════════════════════════════════════════════════════════════

const DEVICE_TYPE_MAP = {
  switch: {
    deviceClass: 'switch',
    baseClass: 'SwitchDevice',
    baseImport: '../../lib/devices/SwitchDevice',
    defaultCapabilities: ['onoff'],
    defaultDPs: { state: 1 },
    learnmode: 'Press and hold the pairing button for 5 seconds',
  },
  light: {
    deviceClass: 'light',
    baseClass: 'UnifiedLightBase',
    baseImport: '../../lib/devices/UnifiedLightBase',
    defaultCapabilities: ['onoff', 'dim', 'light_hue', 'light_saturation'],
    defaultDPs: { state: 1, brightness: 2, color_temp: 3, color: 5 },
    learnmode: 'Press and hold the pairing button for 5 seconds',
  },
  dimmer: {
    deviceClass: 'light',
    baseClass: 'UnifiedLightBase',
    baseImport: '../../lib/devices/UnifiedLightBase',
    defaultCapabilities: ['onoff', 'dim'],
    defaultDPs: { state: 1, brightness: 2 },
    learnmode: 'Press and hold the pairing button for 5 seconds',
  },
  sensor: {
    deviceClass: 'sensor',
    baseClass: 'SensorDevice',
    baseImport: '../../lib/devices/SensorDevice',
    defaultCapabilities: ['measure_temperature', 'measure_humidity', 'measure_battery', 'alarm_battery'],
    defaultDPs: { temperature: 1, humidity: 2, battery: 4 },
    learnmode: 'Press the pairing button once',
  },
  climate: {
    deviceClass: 'thermostat',
    baseClass: 'UnifiedThermostatBase',
    baseImport: '../../lib/devices/UnifiedThermostatBase',
    defaultCapabilities: ['measure_temperature', 'measure_humidity', 'thermostat_mode', 'target_temperature', 'measure_battery'],
    defaultDPs: { temperature: 1, humidity: 2, target_temp: 3, mode: 4, battery: 5 },
    learnmode: 'Press and hold the pairing button for 5 seconds',
  },
  thermostat: {
    deviceClass: 'thermostat',
    baseClass: 'UnifiedThermostatBase',
    baseImport: '../../lib/devices/UnifiedThermostatBase',
    defaultCapabilities: ['measure_temperature', 'thermostat_mode', 'target_temperature', 'measure_battery'],
    defaultDPs: { temperature: 1, target_temp: 2, mode: 3, battery: 4 },
    learnmode: 'Press and hold the pairing button for 5 seconds',
  },
  cover: {
    deviceClass: 'cover',
    baseClass: 'UnifiedCoverBase',
    baseImport: '../../lib/devices/UnifiedCoverBase',
    defaultCapabilities: ['windowcoverings_set', 'windowcoverings_state'],
    defaultDPs: { position: 2, state: 1 },
    learnmode: 'Press and hold the pairing button for 5 seconds',
  },
  fan: {
    deviceClass: 'fan',
    baseClass: 'SwitchDevice',
    baseImport: '../../lib/devices/SwitchDevice',
    defaultCapabilities: ['onoff', 'dim'],
    defaultDPs: { state: 1, speed: 2 },
    learnmode: 'Press and hold the pairing button for 5 seconds',
  },
  plug: {
    deviceClass: 'socket',
    baseClass: 'PlugDevice',
    baseImport: '../../lib/devices/PlugDevice',
    defaultCapabilities: ['onoff', 'measure_power', 'meter_power'],
    defaultDPs: { state: 1, power: 18, energy: 19 },
    learnmode: 'Press the pairing button once',
  },
  remote: {
    deviceClass: 'remote',
    baseClass: 'BaseUnifiedDevice',
    baseImport: '../../lib/devices/BaseUnifiedDevice',
    defaultCapabilities: ['button'],
    defaultDPs: {},
    learnmode: 'Press the pairing button once',
  },
  lock: {
    deviceClass: 'lock',
    baseClass: 'SwitchDevice',
    baseImport: '../../lib/devices/SwitchDevice',
    defaultCapabilities: ['lock'],
    defaultDPs: { state: 1 },
    learnmode: 'Press and hold the pairing button for 5 seconds',
  },
  siren: {
    deviceClass: 'alarm',
    baseClass: 'SwitchDevice',
    baseImport: '../../lib/devices/SwitchDevice',
    defaultCapabilities: ['onoff'],
    defaultDPs: { state: 1 },
    learnmode: 'Press the pairing button once',
  },
  unknown: {
    deviceClass: 'switch',
    baseClass: 'SwitchDevice',
    baseImport: '../../lib/devices/SwitchDevice',
    defaultCapabilities: ['onoff'],
    defaultDPs: { state: 1 },
    learnmode: 'Press the pairing button once',
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// EXISTING DRIVER SCANNER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Scan all existing drivers and build a Set of manufacturer IDs already covered.
 */
function scanExistingDrivers() {
  const covered = new Set();
  const driverList = [];

  if (!fs.existsSync(DRIVERS_DIR)) return { covered, driverList };

  const dirs = fs.readdirSync(DRIVERS_DIR);
  for (const driverId of dirs) {
    const composePath = path.join(DRIVERS_DIR, driverId, 'driver.compose.json');
    if (!fs.existsSync(composePath)) continue;

    try {
      const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      const mfrs = (compose.zigbee && compose.zigbee.manufacturerName) || [];
      const productIds = (compose.zigbee && compose.zigbee.productId) || [];

      for (const mfr of mfrs) {
        covered.add(mfr.toLowerCase());
      }

      driverList.push({
        id: driverId,
        path: path.join(DRIVERS_DIR, driverId),
        manufacturerNames: mfrs.map(m => m.toLowerCase()),
        productIds,
        capabilities: compose.capabilities || [],
        deviceClass: compose.class || 'unknown',
      });
    } catch {
      /* skip malformed */
    }
  }

  return { covered, driverList };
}

// ═══════════════════════════════════════════════════════════════════════════════
// GENERATOR: driver.compose.json
// ═══════════════════════════════════════════════════════════════════════════════

function generateCompose(mfsEntry, typeConfig) {
  const deviceType = mfsEntry.deviceType || 'unknown';
  const driverId = slugify(mfsEntry.manufacturerId);
  const manufacturerNames = [mfsEntry.manufacturerId];
  const productIds = mfsEntry.modelIds && mfsEntry.modelIds.length > 0
    ? mfsEntry.modelIds
    : ['TS0601'];

  const capabilities = mergeCapabilities(
    typeConfig.defaultCapabilities,
    mfsEntry.capabilities || []
  );

  const capabilitiesOptions = buildCapabilitiesOptions(capabilities);

  return {
    name: {
      en: humanize(deviceType) + ' (' + shortId(mfsEntry.manufacturerId) + ')',
      fr: humanizeFr(deviceType) + ' (' + shortId(mfsEntry.manufacturerId) + ')',
      nl: humanizeNl(deviceType) + ' (' + shortId(mfsEntry.manufacturerId) + ')',
      de: humanizeDe(deviceType) + ' (' + shortId(mfsEntry.manufacturerId) + ')',
    },
    class: typeConfig.deviceClass,
    capabilities,
    capabilitiesOptions,
    zigbee: {
      productId: productIds,
      endpoints: {
        '1': {
          clusters: [0],
        },
      },
      learnmode: {
        instruction: {
          en: typeConfig.learnmode,
          fr: typeConfig.learnmode,
        },
      },
      manufacturerName: manufacturerNames,
    },
    images: {
      small: `/drivers/${driverId}/assets/images/small.png`,
      large: `/drivers/${driverId}/assets/images/large.png`,
      xlarge: `/drivers/${driverId}/assets/images/xlarge.png`,
    },
    platforms: ['local'],
    connectivity: ['zigbee'],
    energy: {
      approximation: {
        usageOn: 50,
        usageOff: 1,
      },
    },
    maintenanceActions: [
      {
        id: 'ota_check',
        title: {
          en: 'Check Zigbee OTA Update',
          fr: 'Verifier Mise a Jour OTA',
        },
      },
    ],
    id: driverId,
    version: '1.0.0',
  };
}

function mergeCapabilities(defaults, suggested) {
  const caps = new Set(defaults);
  for (const cap of suggested) {
    if (typeof cap === 'string' && cap.length > 0) caps.add(cap);
  }
  return [...caps];
}

function buildCapabilitiesOptions(capabilities) {
  const opts = {};
  for (const cap of capabilities) {
    if (cap === 'dim') {
      opts.dim = {
        title: { en: 'Brightness', fr: 'Luminosite', nl: 'Helderheid' },
      };
    }
    if (cap === 'measure_pm25') {
      opts.measure_pm25 = {
        title: { en: 'PM2.5', fr: 'PM2.5' },
        units: 'ug/m3',
      };
    }
    if (cap === 'measure_temperature') {
      opts.measure_temperature = {
        title: { en: 'Temperature', fr: 'Temperature' },
        units: 'C',
      };
    }
    if (cap === 'measure_humidity') {
      opts.measure_humidity = {
        title: { en: 'Humidity', fr: 'Humidite' },
        units: '%',
      };
    }
    if (cap === 'target_temperature') {
      opts.target_temperature = {
        title: { en: 'Target Temperature', fr: 'Temperature Cible' },
        min: 5,
        max: 35,
        step: 0.5,
        units: 'C',
      };
    }
    if (cap === 'measure_power') {
      opts.measure_power = {
        title: { en: 'Power', fr: 'Puissance' },
        units: 'W',
      };
    }
    if (cap === 'meter_power') {
      opts.meter_power = {
        title: { en: 'Energy', fr: 'Energie' },
        units: 'kWh',
      };
    }
  }
  return opts;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GENERATOR: driver.js
// ═══════════════════════════════════════════════════════════════════════════════

function generateDriverJs(driverId, mfsEntry, _typeConfig) {
  const className = pascalCase(driverId) + 'Driver';
  const deviceType = mfsEntry.deviceType || 'unknown';
  const flowPrefix = driverId.replace(/-/g, '_');
  const triggers = [`${flowPrefix}_turned_on`, `${flowPrefix}_turned_off`];
  const actions = [`${flowPrefix}_turn_on`, `${flowPrefix}_turn_off`, `${flowPrefix}_toggle`];

  return `'use strict';
const { ZigBeeDriver } = require('homey-zigbeedriver');

class ${className} extends ZigBeeDriver {
  async onInit() {
    this.log('${humanize(deviceType)} driver initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // Register triggers
    const triggers = ${JSON.stringify(triggers)};
    for (const id of triggers) {
      try {
        this.homey.flow.getTriggerCard(id);
      } catch (e) {
        this.error('Trigger ' + id + ' registration error: ' + e.message);
      }
    }

    // Register actions
    const actions = [
      {
        id: '${actions[0]}',
        fn: async (args) => {
          await args.device.setCapabilityValue('onoff', true).catch(() => {});
          return true;
        }
      },
      {
        id: '${actions[1]}',
        fn: async (args) => {
          await args.device.setCapabilityValue('onoff', false).catch(() => {});
          return true;
        }
      },
      {
        id: '${actions[2]}',
        fn: async (args) => {
          const current = args.device.getCapabilityValue('onoff');
          await args.device.setCapabilityValue('onoff', !current).catch(() => {});
          return true;
        }
      }
    ];

    for (const { id, fn } of actions) {
      try {
        const card = this.homey.flow.getActionCard(id);
        if (card) {
          card.registerRunListener(async (args) => {
            if (!args.device) return false;
            return fn(args);
          });
        }
      } catch (e) {
        this.error('Action ' + id + ' registration error: ' + e.message);
      }
    }
  }
}

module.exports = ${className};
`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GENERATOR: device.js
// ═══════════════════════════════════════════════════════════════════════════════

function generateDeviceJs(driverId, mfsEntry, typeConfig) {
  const className = pascalCase(driverId) + 'Device';
  const baseClass = typeConfig.baseClass;
  const baseImport = typeConfig.baseImport;
  const deviceType = mfsEntry.deviceType || 'unknown';
  const dpEntries = Object.entries(typeConfig.defaultDPs);

  // Build DP constant
  const dpLines = dpEntries.map(([name, id]) => `  ${name}: ${id},`).join('\n');

  // Build switch cases for handleTuyaDataReport
  const switchCases = dpEntries.map(([name]) => {
    const capMap = {
      state: `await this.triggerCapabilityListener('onoff', Boolean(value));`,
      brightness: `const b = typeof value === 'number' ? value : parseInt(value); await this.triggerCapabilityListener('dim', Math.min(1, Math.max(0, b / 100)));`,
      color_temp: `this.log('[${className}] Color temp: ' + value);`,
      color: `this.log('[${className}] Color: ' + value);`,
      temperature: `const t = typeof value === 'number' ? value : parseFloat(value); await this.setCapabilityValue('measure_temperature', t);`,
      humidity: `const h = typeof value === 'number' ? value : parseInt(value); await this.setCapabilityValue('measure_humidity', h);`,
      target_temp: `const tt = typeof value === 'number' ? value : parseFloat(value); await this.setCapabilityValue('target_temperature', tt);`,
      mode: `this.log('[${className}] Mode: ' + value);`,
      battery: `const bat = typeof value === 'number' ? value : parseInt(value); await this.setCapabilityValue('measure_battery', bat);`,
      power: `const p = typeof value === 'number' ? value : parseFloat(value); await this.setCapabilityValue('measure_power', p);`,
      energy: `const e = typeof value === 'number' ? value : parseFloat(value); await this.setCapabilityValue('meter_power', e);`,
      position: `const pos = typeof value === 'number' ? value : parseInt(value); await this.setCapabilityValue('windowcoverings_set', Math.min(1, Math.max(0, pos / 100)));`,
      speed: `const spd = typeof value === 'number' ? value : parseInt(value); await this.triggerCapabilityListener('dim', Math.min(1, Math.max(0, spd / 100)));`,
    };
    return `      case DP.${name}: {
        ${capMap[name] || `this.log('[${className}] Unhandled DP ${name}:', value);`}
        break;
      }`;
  }).join('\n\n');

  // Build capability listeners
  const listeners = [];
  if (typeConfig.defaultCapabilities.includes('onoff')) {
    listeners.push(`
    this.registerCapabilityListener('onoff', async (value) => {
      this.log('[${className}] Setting state to: ' + value);
      return this.sendTuyaCommand(DP.state, value, 'bool');
    });`);
  }
  if (typeConfig.defaultCapabilities.includes('dim')) {
    const dp = typeConfig.defaultDPs.brightness ? 'brightness' : (typeConfig.defaultDPs.speed ? 'speed' : 'state');
    listeners.push(`
    this.registerCapabilityListener('dim', async (value) => {
      const v = Math.round(value * 100);
      this.log('[${className}] Setting dim to: ' + v);
      return this.sendTuyaCommand(DP.${dp}, v, 'value');
    });`);
  }
  if (typeConfig.defaultCapabilities.includes('target_temperature')) {
    listeners.push(`
    this.registerCapabilityListener('target_temperature', async (value) => {
      this.log('[${className}] Setting target temp to: ' + value);
      return this.sendTuyaCommand(DP.target_temp, value, 'value');
    });`);
  }
  if (typeConfig.defaultCapabilities.includes('windowcoverings_set')) {
    listeners.push(`
    this.registerCapabilityListener('windowcoverings_set', async (value) => {
      const pos = Math.round(value * 100);
      this.log('[${className}] Setting position to: ' + pos);
      return this.sendTuyaCommand(DP.position, pos, 'value');
    });`);
  }

  return `'use strict';

const ${baseClass} = require('${baseImport}');

const DP = {
${dpLines}
};

/**
 * ${className} - Auto-generated by driver-generator
 * Source: mfs_db.json
 * Manufacturer: ${mfsEntry.manufacturerId}
 * Device type: ${deviceType}
 */
class ${className} extends ${baseClass} {

  async onNodeInit({ zclNode }) {
    this.log('[${className}] Initializing...');
    await super.onNodeInit({ zclNode });
    ${listeners.join('\n')}
    this.log('[${className}] Ready');
  }

  /**
   * handleTuyaDataReport - DP Processing
   */
  async handleTuyaDataReport(data) {
    if (!data || data.dp === null || data.dp === undefined) return;

    const value = data.data ?? data.value;
    const dpId = data.dp;

    switch (dpId) {
${switchCases}

      default:
        this.log('[${className}] Unhandled DP ' + dpId + ':', value);
    }
  }

}

module.exports = ${className};
`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// APP.JSON INJECTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Read .homeycompose/app.json and inject a new driver's capabilities
 * into the relevant device entry. This keeps app.json in sync.
 */
function injectIntoComposeJson(driverId, compose) {
  if (!fs.existsSync(COMPOSE_PATH)) {
    log(C.Y, '  .homeycompose/app.json not found, skipping injection');
    return false;
  }

  try {
    const appJson = JSON.parse(fs.readFileSync(COMPOSE_PATH, 'utf8'));
    if (!appJson.drivers) appJson.drivers = [];

    const existing = appJson.drivers.find(d => d.id === driverId);
    if (existing) {
      log(C.D, `  Driver ${driverId} already in .homeycompose/app.json, updating...`);
      Object.assign(existing, compose);
    } else {
      appJson.drivers.push(compose);
      log(C.G, `  Added ${driverId} to .homeycompose/app.json`);
    }

    fs.writeFileSync(COMPOSE_PATH, JSON.stringify(appJson, null, 2), 'utf8');
    return true;
  } catch (e) {
    log(C.R, `  Failed to update .homeycompose/app.json: ${e.message}`);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function slugify(mfrId) {
  return mfrId
    .replace(/^_+/i, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/_$/, '')
    .toLowerCase();
}

function pascalCase(str) {
  return str
    .split(/[_\-]+/)
    .map(s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
    .join('');
}

function shortId(mfrId) {
  const parts = mfrId.split('_');
  return parts[parts.length - 1].slice(0, 8);
}

function humanize(type) {
  const map = {
    switch: 'Smart Switch',
    light: 'Smart Light',
    dimmer: 'Smart Dimmer',
    sensor: 'Smart Sensor',
    climate: 'Climate Sensor',
    thermostat: 'Smart Thermostat',
    cover: 'Smart Cover',
    fan: 'Smart Fan',
    plug: 'Smart Plug',
    remote: 'Remote Control',
    lock: 'Smart Lock',
    siren: 'Smart Siren',
    unknown: 'Tuya Device',
  };
  return map[type] || 'Tuya Device';
}

function humanizeFr(type) {
  const map = {
    switch: 'Interrupteur Connecte',
    light: 'Luminaire Connecte',
    dimmer: 'Varior Connecte',
    sensor: 'Capteur Connecte',
    climate: 'Capteur Climat',
    thermostat: 'Thermostat Connecte',
    cover: 'Store Connecte',
    fan: 'Ventilateur Connecte',
    plug: 'Prise Connectee',
    remote: 'Telecommande',
    lock: 'Serrure Connectee',
    siren: 'Sirene Connectee',
    unknown: 'Appareil Tuya',
  };
  return map[type] || 'Appareil Tuya';
}

function humanizeNl(type) {
  const map = {
    switch: 'Slimme Schakelaar',
    light: 'Slimme Lamp',
    dimmer: 'Slimme Dimmer',
    sensor: 'Slimme Sensor',
    climate: 'Klimaat Sensor',
    thermostat: 'Slimme Thermostaat',
    cover: 'Slimme Gordijn',
    fan: 'Slimme Ventilator',
    plug: 'Slimme Stopcontact',
    remote: 'Afstandsbediening',
    lock: 'Slim Slot',
    siren: 'Slimme Sirene',
    unknown: 'Tuya Apparaat',
  };
  return map[type] || 'Tuya Apparaat';
}

function humanizeDe(type) {
  const map = {
    switch: 'Smart Schalter',
    light: 'Smart Lampe',
    dimmer: 'Smart Dimmer',
    sensor: 'Smart Sensor',
    climate: 'Klimasensor',
    thermostat: 'Smart Thermostat',
    cover: 'Smart Jalousie',
    fan: 'Smart Ventilator',
    plug: 'Smart Steckdose',
    remote: 'Fernbedienung',
    lock: 'Smart Schloss',
    siren: 'Smart Sirene',
    unknown: 'Tuya Geraet',
  };
  return map[type] || 'Tuya Geraet';
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

function main() {
  console.log('');
  log(C.B, '====================================================================');
  log(C.G, '  Driver Generator Engine v1.0.0');
  log(C.G, '  Reads mfs_db.json and auto-generates driver files');
  log(C.B, '====================================================================');
  console.log('');

  // Load MFS database
  if (!fs.existsSync(MFS_DB_PATH)) {
    log(C.R, `  MFS database not found at: ${MFS_DB_PATH}`);
    log(C.Y, '  Run mfs-aggregator.js first to generate the database.');
    process.exit(1);
  }

  const db = JSON.parse(fs.readFileSync(MFS_DB_PATH, 'utf8'));
  const devices = db.devices || {};
  const deviceCount = Object.keys(devices).length;
  log(C.W, `  Loaded MFS database: ${deviceCount} devices\n`);

  // Scan existing drivers
  const { covered, driverList } = scanExistingDrivers();
  log(C.W, `  Existing drivers: ${driverList.length}`);
  log(C.W, `  Covered manufacturer IDs: ${covered.size}\n`);

  // ── Report mode ───────────────────────────────────────────────────────
  if (REPORT_ONLY) {
    log(C.W, '  Coverage Report:');
    console.log('');
    const uncovered = [];
    const coveredCount = { total: 0, types: {} };

    for (const [mfrId, entry] of Object.entries(devices)) {
      if (covered.has(mfrId)) {
        coveredCount.total++;
        const t = entry.deviceType || 'unknown';
        coveredCount.types[t] = (coveredCount.types[t] || 0) + 1;
      } else {
        uncovered.push({ mfrId, type: entry.deviceType, confidence: entry.confidence });
      }
    }

    log(C.G, `  Covered:   ${coveredCount.total}`);
    log(C.Y, `  Uncovered: ${uncovered.length}`);
    console.log('');
    log(C.W, '  By type (covered):');
    for (const [t, n] of Object.entries(coveredCount.types).sort((a, b) => b[1] - a[1])) {
      log(C.D, `    ${t}: ${n}`);
    }
    console.log('');
    log(C.W, '  Top uncovered (by confidence):');
    uncovered.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
    for (const u of uncovered.slice(0, 20)) {
      log(C.D, `    ${u.mfrId} [${u.type}] confidence=${u.confidence || 0}`);
    }
    console.log('');
    return;
  }

  // ── Enrich mode ───────────────────────────────────────────────────────
  if (ENRICH_TARGET) {
    const targetDriver = driverList.find(d => d.id === ENRICH_TARGET);
    if (!targetDriver) {
      log(C.R, `  Driver "${ENRICH_TARGET}" not found in drivers/`);
      process.exit(1);
    }

    const composePath = path.join(targetDriver.path, 'driver.compose.json');
    const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    let enriched = 0;

    for (const [mfrId, entry] of Object.entries(devices)) {
      if (covered.has(mfrId)) continue;
      if (entry.driverHint === ENRICH_TARGET
        || (entry.deviceType && targetDriver.deviceClass
          && DEVICE_TYPE_MAP[entry.deviceType]?.deviceClass === targetDriver.deviceClass)) {
        if (!compose.zigbee) compose.zigbee = {};
        if (!compose.zigbee.manufacturerName) compose.zigbee.manufacturerName = [];
        if (!compose.zigbee.manufacturerName.includes(mfrId)) {
          compose.zigbee.manufacturerName.push(mfrId);
          enriched++;
        }
      }
    }

    if (enriched > 0 && !DRY_RUN) {
      fs.writeFileSync(composePath, JSON.stringify(compose, null, 2), 'utf8');
      log(C.G, `  Enriched ${ENRICH_TARGET} with ${enriched} new manufacturer IDs`);
    } else if (DRY_RUN) {
      log(C.Y, `  [DRY RUN] Would enrich ${ENRICH_TARGET} with ${enriched} new manufacturer IDs`);
    } else {
      log(C.D, `  No new manufacturer IDs to add to ${ENRICH_TARGET}`);
    }
    console.log('');
    return;
  }

  // ── Generation mode ───────────────────────────────────────────────────
  log(C.W, '  Generating drivers...\n');

  const generated = [];
  const enriched = [];
  const skipped = [];

  for (const [mfrId, entry] of Object.entries(devices)) {
    // Single device filter
    if (SINGLE_DEVICE && mfrId.toLowerCase() !== SINGLE_DEVICE.toLowerCase()) continue;

    // Type filter
    if (TYPE_FILTER && entry.deviceType !== TYPE_FILTER) continue;

    // Confidence filter
    if ((entry.confidence || 0) < MIN_CONFIDENCE) continue;

    // Already covered?
    if (covered.has(mfrId)) {
      skipped.push(mfrId);
      continue;
    }

    const deviceType = entry.deviceType || 'unknown';
    const typeConfig = DEVICE_TYPE_MAP[deviceType] || DEVICE_TYPE_MAP.unknown;
    const driverId = slugify(mfrId);

    // Check if the driver directory already exists
    const driverDir = path.join(DRIVERS_DIR, driverId);
    if (fs.existsSync(driverDir)) {
      // Enrich existing instead
      const existingComposePath = path.join(driverDir, 'driver.compose.json');
      if (fs.existsSync(existingComposePath)) {
        try {
          const existingCompose = JSON.parse(fs.readFileSync(existingComposePath, 'utf8'));
          if (!existingCompose.zigbee) existingCompose.zigbee = {};
          if (!existingCompose.zigbee.manufacturerName) existingCompose.zigbee.manufacturerName = [];
          if (!existingCompose.zigbee.manufacturerName.includes(mfrId)) {
            existingCompose.zigbee.manufacturerName.push(mfrId);
            if (!DRY_RUN) {
              fs.writeFileSync(existingComposePath, JSON.stringify(existingCompose, null, 2), 'utf8');
            }
            enriched.push({ mfrId, driverId });
            log(C.G, `  [${DRY_RUN ? 'DRY' : 'OK'}] Enriched ${driverId} with ${mfrId}`);
          }
        } catch { /* skip */ }
      }
      continue;
    }

    // Generate the driver files
    const compose = generateCompose(entry, typeConfig);
    const driverJs = generateDriverJs(driverId, entry, typeConfig);
    const deviceJs = generateDeviceJs(driverId, entry, typeConfig);

    if (!DRY_RUN) {
      fs.mkdirSync(driverDir, { recursive: true });
      const imgDir = path.join(driverDir, 'assets', 'images');
      fs.mkdirSync(imgDir, { recursive: true });

      fs.writeFileSync(path.join(driverDir, 'driver.compose.json'), JSON.stringify(compose, null, 2), 'utf8');
      fs.writeFileSync(path.join(driverDir, 'driver.js'), driverJs, 'utf8');
      fs.writeFileSync(path.join(driverDir, 'device.js'), deviceJs, 'utf8');

      injectIntoComposeJson(driverId, compose);
    }

    generated.push({ mfrId, driverId, deviceType, typeConfig: typeConfig.deviceClass });
    log(C.G, `  [${DRY_RUN ? 'DRY' : 'OK'}] Generated: ${driverId} (${deviceType})`);
  }

  // ── Summary ───────────────────────────────────────────────────────────
  console.log('');
  log(C.B, '='.repeat(60));
  log(C.G, '  GENERATION COMPLETE');
  log(C.B, '='.repeat(60));
  console.log('');
  log(C.W, `  Generated: ${generated.length} new drivers`);
  log(C.W, `  Enriched:  ${enriched.length} existing drivers`);
  log(C.W, `  Skipped:   ${skipped.length} already covered`);
  if (DRY_RUN) log(C.Y, '  (DRY RUN - no files were written)');
  console.log('');

  if (generated.length > 0) {
    log(C.W, '  Generated Drivers:');
    for (const g of generated) {
      log(C.G, `    ${g.driverId} (${g.mfrId}) -> ${g.typeConfig}`);
    }
    console.log('');
  }

  if (enriched.length > 0) {
    log(C.W, '  Enriched Drivers:');
    for (const e of enriched) {
      log(C.Y, `    ${e.driverId} + ${e.mfrId}`);
    }
    console.log('');
  }
}

// ── Run ─────────────────────────────────────────────────────────────────────
main();
