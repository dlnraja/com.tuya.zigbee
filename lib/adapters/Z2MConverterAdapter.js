'use strict';
const CI = require('../utils/CaseInsensitiveMatcher');
const { safeDivide, safeMultiply } = require('../utils/MathUtils.js');

/**
 * Z2M Converter Adapter - v7.4.11
 * Parses zigbee2mqtt device definitions and converts them to Homey driver configurations.
 */

const fs = require('fs');
const path = require('path');
const { resolveFromZ2MExposes, classifyDeviceType, HOMEY_CAPABILITY_META, Z2M_EXPOSE_MAP } = require('./ZclToHomeyMap');

const Z2M_TUYA_URL = 'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/tuya.ts';
const Z2M_DEVICES_API = 'https://raw.githubusercontent.com/Koenkk/zigbee2mqtt.io/master/supported-devices.json';
const CACHE_DIR = path.join(__dirname, '..', '..', '.github', 'cache', 'z2m');

// =============================================================================
// PARSER: Extract device definitions from Z2M TypeScript source
// =============================================================================

function parseZ2MDeviceBlocks(tsSource) {
  const devices = [];
  const defRegex = /\{\s*(?:\/\/[^\n]*\n\s*)*zigbeeModel:\s*\[([^\]]*)\][^}]*?model:\s*'([^']+)'[^}]*?vendor:\s*'([^']+)'([\s\S]*?)\n\s*\}/g;
  let match;
  while ((match = defRegex.exec(tsSource)) !== null) {
    const [, zigbeeModels, model, vendor, body] = match;
    const modelIds = (zigbeeModels.match(/'([^']+)'/g) || []).map(m => m.replace(/'/g, ''));
    
    // Extract fingerprints
    const fpBlock = body.match(/fingerprint:\s*\[([\s\S]*?)\]/);
    const fingerprints = [];
    if (fpBlock) {
      const fpRegex = /manufacturerName:\s*'([^']+)'[\s\S]*?modelID:\s*'([^']+)'/g;
      let fpMatch;
      while ((fpMatch = fpRegex.exec(fpBlock[1])) !== null) {
        fingerprints.push({ manufacturerName: fpMatch[1], modelID: fpMatch[2] });
      }
    }

    // Extract exposes
    const exposes = [];
    const exposeMatches = body.match(/e\.(binary|numeric|enum|text|composite)\(['"]([^'"]+)/g) || [];
    for (const em of exposeMatches) {
      const p = em.match(/e\.(binary|numeric|enum|text|composite)\(['"]([^'"]+)/);
      if (p) exposes.push({ type: p[1], property: p[2] });
    }

    // Extract modern extends (tuya.*)
    const extendsMatches = body.match(/tuya\.\w+\([^)]*\)/g) || [];
    const tuyaExtends = extendsMatches.map(e => {
      const name = e.match(/tuya\.(\w+)/)?.[1];
      const dpMatch = e.match(/dp:\s*(\d+)/);
      return { name, dp: dpMatch ? parseInt(dpMatch[1]) : null };
    });

    // Extract DP mappings from fz/tz converters
    const dpMatches = [...new Set((body.match(/(?:dp|DP|datapoint)[:\s = ]*(\d+)/gi) || [])
      .map(m => parseInt(m.match(/\d+/)?.[0]))
      .filter(n => n > 0 && n < 256))];

    // Extract description
    const descMatch = body.match(/description:\s*'([^']+)'/);

    devices.push({
      zigbeeModels: modelIds,
      model,
      vendor,
      description: descMatch?.[1] || '',
      fingerprints,
      exposes,
      tuyaExtends,
      dps: dpMatches,
      rawBody: body.slice(0, 2000)
    });
  }
  return devices;
}

// =============================================================================
// CONVERTER: Z2M device -> Homey driver config
// =============================================================================

function convertToHomeyDriver(z2mDevice, existingDrivers = []) {
  const { capabilities, settings } = resolveFromZ2MExposes(z2mDevice.exposes);

  for (const ext of (z2mDevice.tuyaExtends || [])) {
    const extMap = {
      switch: ['onoff'], 
      light: ['onoff','dim'], 
      cover: ['windowcoverings_set','windowcoverings_state'],
      lock: ['locked'], 
      fan: ['onoff','fan_speed'],
      temperatureSensor: ['measure_temperature'], 
      humiditySensor: ['measure_humidity'],
      occupancySensor: ['alarm_motion'], 
      contactSensor: ['alarm_contact'],
      waterLeakSensor: ['alarm_water'], 
      smokeSensor: ['alarm_smoke'],
      vibrationsensor: ['alarm_vibration'], 
      illuminanceSensor: ['measure_luminance'],
      co2Sensor: ['measure_co2'], 
      pm25Sensor: ['measure_pm25'],
      vocSensor: ['measure_voc'], 
      formaldehydeSensor: ['measure_formaldehyde'],
      powerMeter: ['measure_power','meter_power'], 
      electricityMeter: ['measure_power','measure_voltage','measure_current','meter_power'],
      thermostat: ['target_temperature','measure_temperature','thermostat_mode']
    };
    if (ext.name && extMap[ext.name]) {
      extMap[ext.name].forEach(c => { 
        if (!capabilities.includes(c)) capabilities.push(c);
      });
    }
  }

  if (!capabilities.length) capabilities.push('onoff');

  const deviceType = classifyDeviceType(capabilities);
  const classMap = {
    switch: 'socket', dimmer: 'light', light: 'light', thermostat: 'thermostat',
    cover: 'windowcoverings', lock: 'lock', fan: 'fan', sensor: 'sensor',
    alarm: 'sensor', energy: 'sensor', other: 'other'
  };

  const manufacturerNames = [...new Set([
    ...z2mDevice.fingerprints.map(fp => fp.manufacturerName),
  ].filter(Boolean))];

  const productIds = [...new Set([
    ...z2mDevice.fingerprints.map(fp => fp.modelID),
    ...z2mDevice.zigbeeModels
  ].filter(Boolean))];

  const existingDriver = existingDrivers.find(d => {
    const dMfrs = d.zigbee?.manufacturerName || [];
    const dPids = d.zigbee?.productId || [];
    return manufacturerNames.some(m => CI.includesCI(dMfrs, m)) && 
           productIds.some(p => CI.includesCI(dPids, p));
  });

  const driverId = existingDriver?.id || generateDriverId(deviceType, capabilities, z2mDevice);
  const dpMappings = {};
  for (const ext of (z2mDevice.tuyaExtends || [])) {
    if (ext.dp && ext.name) {
      const capForExt = {
        switch: 'onoff', light: 'dim', cover: 'windowcoverings_set',
        thermostat: 'target_temperature', temperatureSensor: 'measure_temperature',
        humiditySensor: 'measure_humidity', occupancySensor: 'alarm_motion',
        contactSensor: 'alarm_contact', waterLeakSensor: 'alarm_water',
        co2Sensor: 'measure_co2', pm25Sensor: 'measure_pm25', vocSensor: 'measure_voc'
      };
      if (capForExt[ext.name]) {
        dpMappings[ext.dp] = { capability: capForExt[ext.name], type: 'bool' };
      }
    }
  }

  return {
    driverId,
    deviceType,
    class: classMap[deviceType] || 'other',
    capabilities,
    settings,
    zigbee: { manufacturerName: manufacturerNames, productId: productIds },
    dpMappings,
    z2mModel: z2mDevice.model,
    z2mVendor: z2mDevice.vendor,
    z2mDescription: z2mDevice.description,
    existingDriver: existingDriver?.id || null,
    isNew: !existingDriver
  };
}

function generateDriverId(deviceType, caps, z2mDev) {
  const gangCount = caps.filter(c => c === 'onoff').length || 1;
  const prefix = deviceType === 'switch' ? `switch_${gangCount}gang` :
    deviceType === 'dimmer' ? `dimmer_${gangCount}gang` :
      deviceType === 'sensor' ? determineSensorType(caps) :
        deviceType;
  return prefix.replace(/[^a-z0-9_]/g, '_');
}

function determineSensorType(caps) {
  if (caps.includes('alarm_motion')) return 'motion_sensor';
  if (caps.includes('alarm_contact')) return 'contact_sensor';
  if (caps.includes('alarm_water')) return 'water_sensor';
  if (caps.includes('alarm_smoke')) return 'smoke_sensor';
  if (caps.includes('measure_temperature') && caps.includes('measure_humidity')) return 'temp_humidity_sensor';
  if (caps.includes('measure_co2')) return 'air_quality_sensor';
  if (caps.includes('measure_power')) return 'power_meter';
  return 'sensor';
}

// =============================================================================
// SCAFFOLD GENERATOR: Generate Homey driver files from converted config
// =============================================================================

function generateDriverCompose(config) {
  return {
    name: { en: config.z2mDescription || `Tuya ${config.deviceType}` },
    class: config.class,
    capabilities: config.capabilities,
    energy: config.capabilities.includes('measure_battery') ? { batteries: ['OTHER'] } : undefined,
    zigbee: {
      manufacturerName: config.zigbee.manufacturerName,
      productId: config.zigbee.productId,
      endpoints: { 1: {} },
      learnmode: { instruction: { en: 'Press and hold the button for 5 seconds until the LED flashes.' } }
    },
    settings: [
      { type: 'group', label: { en: 'Zigbee' }, children: [
        { id: 'zb_model_id', type: 'label', label: { en: 'Model ID' }, value: '' },
        { id: 'zb_manufacturer_name', type: 'label', label: { en: 'Manufacturer' }, value: '' }
      ]}
    ]
  };
}

function generateDeviceJS(config) {
  const isTuyaEF00 = Object.keys(config.dpMappings || {}).length > 0;
  const baseClass = isTuyaEF00 ? 'TuyaZigbeeDevice' : 'ZigBeeDevice';
  const importPath = isTuyaEF00 ? '../../lib/tuya/TuyaZigbeeDevice' : 'homey-zigbeedriver';
  const importLine = isTuyaEF00
    ? `const TuyaZigbeeDevice = require('${importPath}');`
    : `const { ZigBeeDevice } = require('${importPath}');`;

  let dpMappingsStr = '';
  if (isTuyaEF00 && Object.keys(config.dpMappings).length) {
    const entries = Object.entries(config.dpMappings)
      .map(([dp, m]) => `      ${dp}: { capability: '${m.capability}', type: '${m.type}' }`)
      .join(',\n');
    dpMappingsStr = `\n  get dpMappings() {\n    return {\n${entries}\n    };\n  }\n`;
  }

  return `'use strict';

${importLine}

/**
 * ${config.z2mDescription || config.driverId}
 * Auto-generated from Z2M converter: ${config.z2mModel} (${config.z2mVendor})
 */
class Device extends ${baseClass} {
${dpMappingsStr}
  async onNodeInit({ zclNode }) {
    this.log('${config.driverId} initialized');
${config.capabilities.map(c => `    // TODO: register ${c}`).join('\n')}
  }
}

module.exports = Device;
`;
}

// =============================================================================
// BATCH PROCESSOR
// =============================================================================

function loadExistingDrivers(driversDir) {
  const drivers = [];
  if (!fs.existsSync(driversDir)) return drivers;
  for (const d of fs.readdirSync(driversDir)) {
    const cf = path.join(driversDir, d, 'driver.compose.json');
    if (!fs.existsSync(cf)) continue;
    try {
      const config = JSON.parse(fs.readFileSync(cf, 'utf8'));
      drivers.push({ id: d, ...config });
    } catch {}
  }
  return drivers;
}

function processZ2MSource(tsSource, driversDir) {
  const z2mDevices = parseZ2MDeviceBlocks(tsSource);
  const existingDrivers = loadExistingDrivers(driversDir);
  
  const results = { new: [], existing: [], enriched: [], errors: [] };

  for (const dev of z2mDevices) {
    try {
      const config = convertToHomeyDriver(dev, existingDrivers);
      if (config.isNew) {
        results.new.push(config);
      } else {
        const existing = existingDrivers.find(d => d.id === config.existingDriver);
        if (existing) {
          const newMfrs = config.zigbee.manufacturerName.filter(m => !CI.includesCI(existing.zigbee?.manufacturerName || [], m));
          const newPids = config.zigbee.productId.filter(p => !CI.includesCI(existing.zigbee?.productId || [], p));
          if (newMfrs.length || newPids.length) {
            results.enriched.push({ ...config, newMfrs, newPids });
          } else {
            results.existing.push(config);
          }
        }
      }
    } catch (err) {
      results.errors.push({ model: dev.model, error: err.message });
    }
  }

  return { z2mDevices, results };
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  parseZ2MDeviceBlocks,
  convertToHomeyDriver,
  generateDriverCompose,
  generateDeviceJS,
  loadExistingDrivers,
  processZ2MSource,
  Z2M_TUYA_URL,
  Z2M_DEVICES_API,
  CACHE_DIR
};
