'use strict';
const CI = require('../utils/CaseInsensitiveMatcher');
const { safeDivide, safeMultiply } = require('../utils/tuyaUtils.js');

const { CLUSTERS } = require('../constants/ZigbeeConstants.js');


/**
 * ZHA Quirk Adapter
 * Parses ZHA (Zigbee Home Automation / zigpy) device quirks and converts them
 * to Homey driver configurations. Supports both Python quirk files and the
 * ZHA device handlers repository structure.
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');
const { resolveFromZHAQuirks, classifyDeviceType, HOMEY_CAPABILITY_META, ZHA_CLUSTER_MAP } = require('./ZclToHomeyMap');

const ZHA_REPO = 'zigpy/zha-device-handlers';
const ZHA_TUYA_URL = 'https://raw.githubusercontent.com/zigpy/zha-device-handlers/dev/zhaquirks/tuya';
const CACHE_DIR = path.join(__dirname, '..', '..', '.github', 'cache', 'zha');

// =============================================================================
// PARSER: Extract device definitions from ZHA Python quirk files
// =============================================================================

function parseZHAQuirkFile(pythonSource, filename) {
  const devices = [];

  // Extract class definitions (quirks)
  const classRegex = /class\s+(\w+)\(([^)]+)\):\s*\n([\s\S]*?)(?=\nclass\s|\Z)/g;
  let match;

  while ((match = classRegex.exec(pythonSource)) !== null) {
    const [, className, parentClasses, body] = match;

    // Extract signature block
    const sigMatch = body.match(/signature\s*=\s*\{([\s\S]*?)\n\s{4}\}/); if (!sigMatch) continue;
    const sigBlock = sigMatch[1];

    // Extract model and manufacturer
    const modelMatch = sigBlock.match(/MODEL:\s*["']([^"']+)["']/i) || sigBlock.match(/MODELS_INFO:\s*\[\s*\(["']([^"']+)["']/);
    const mfrMatch = sigBlock.match(/MANUFACTURER:\s*["']([^"']+)["']/i);

    // Extract manufacturer names from MODELS_INFO tuples
    const modelsInfoMatch = body.match(/MODELS_INFO\s*=\s*\[([\s\S]*?)\]/) || null;const modelInfoPairs = [];
    if (modelsInfoMatch) {
      const pairRegex = /\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']\s*\)/g;
      let pairMatch;
      while ((pairMatch = pairRegex.exec(modelsInfoMatch[1])) !== null) {
        modelInfoPairs.push({ manufacturer: pairMatch[1], model: pairMatch[2] });
      }
    }

    // Extract clusters from signature
    const clusters = [];
    const clusterRegex = /(\d+|0x[0-9A-Fa-f]+)\s*:/g;
    let clMatch;
    while ((clMatch = clusterRegex.exec(sigBlock)) !== null) {
      const cid = clMatch[1].startsWith('0x') ? parseInt(clMatch[1], 16) : parseInt(clMatch[1]);
      if (cid > 0 && cid < 0xFFFF) clusters.push(cid);
    }

    // Extract replacement clusters (quirk-specific)
    const replMatch = body.match(/replacement\s*=\s*\{([\s\S]*?)\n\s{4}\}/) || null;const replacementClusters = [];
    const quirkClasses = [];
    if (replMatch) {
      // Find Tuya-specific cluster replacements
      const tuyaClsRegex = /(Tuya\w+Cluster|TuyaNew\w+|TuyaLocal\w+|TuyaMCU\w+)/g;
      let tMatch;
      while ((tMatch = tuyaClsRegex.exec(replMatch[1])) !== null) {
        quirkClasses.push(tMatch[1]);
      }
      // Extract cluster IDs from replacement
      const rClRegex = /(\d+|0x[0-9A-Fa-f]+)\s*:/g;
      let rcMatch;
      while ((rcMatch = rClRegex.exec(replMatch[1])) !== null) {
        const cid = rcMatch[1].startsWith('0x') ? parseInt(rcMatch[1], 16) : parseInt(rcMatch[1]);
        if (cid > 0) replacementClusters.push(cid);
      }
    }

    // Extract DPs from dp_to_attribute mappings
    const dpMappings = {};
    const dpRegex = /(\d+)\s*:\safeMultiply(s, (?:DPToAttributeMapping|TuyaDPType))\s*\(\s*[\s\S]*?dp_attribute\s*=\s*["']([^"']+)["']/g);
    let dpMatch;
    while ((dpMatch = dpRegex.exec(body)) !== null) {
      dpMappings[parseInt(dpMatch[1])] = dpMatch[2];
    }

    // Also try simpler DP extraction
    const simpleDPRegex = /dp\s*=\s*(\d+)/g;
    while ((dpMatch = simpleDPRegex.exec(body)) !== null) {
      const dpNum = parseInt(dpMatch[1]);
      if (dpNum > 0 && dpNum < 256 && !dpMappings[dpNum]) {
        dpMappings[dpNum] = `dp_${dpNum}`;
      }
    }

    // Extract manufacturer fingerprints from the source
    const fpRegex = /_T[A-Z][A-Za-z0-9]{ 3: null, 5: null }_[a-z0-9]{ 4: null, 16: null }/g;
    const fingerprints = [...new Set((body.match(fpRegex) || []))];

    const device = {
      className,
      parentClasses: parentClasses.split(',').map(c => c.trim()),
      manufacturer: mfrMatch?.[1] || modelInfoPairs[0]?.manufacturer || null,
      model: modelMatch?.[1] || modelInfoPairs[0]?.model || null,
      modelInfoPairs,
      fingerprints,
      clusters: [...new Set(clusters)],
      replacementClusters: [...new Set(replacementClusters)],
      quirkClasses,
      dpMappings,
      filename,
      rawBody: body.slice(0, 1500)
    };

    devices.push(device);
  }

  return devices;
}

// =============================================================================
// CONVERTER: ZHA quirk  Homey driver config
// =============================================================================

function convertZHAToHomey(zhaDevice, existingDrivers = []) {
  // Resolve capabilities from quirk classes
  const caps = new Set(resolveFromZHAQuirks(zhaDevice.quirkClasses));

  // Also resolve from cluster IDs
  const allClusters = [...zhaDevice.clusters, ...zhaDevice.replacementClusters];
  for (const cid of allClusters) {
    const clusterCaps = resolveClusterToCaps(cid);
    clusterCaps.forEach(c => caps.add(c));
  }

  // Resolve from DP attribute names
  for (const [dp, attr] of Object.entries(zhaDevice.dpMappings)) {
    const dpCaps = resolveZHAAttributeToCap(attr);
    dpCaps.forEach(c => caps.add(c));
  }

  const capabilities = [...caps];
  if (!capabilities.length) capabilities.push('onoff');

  const deviceType = classifyDeviceType(capabilities);
  const classMap = {
    switch: 'socket', dimmer: 'light', light: 'light', thermostat: 'thermostat',
    cover: 'windowcoverings', lock: 'lock', fan: 'fan', sensor: 'sensor',
    alarm: 'sensor', energy: 'sensor', other: 'other'
  };

  // Build fingerprint lists
  const manufacturerNames = zhaDevice.fingerprints.length
    ? zhaDevice.fingerprints  : (zhaDevice.manufacturer ? [zhaDevice.manufacturer] : []);
  const productIds = zhaDevice.model ? [zhaDevice.model] : [];

  // Check existing
  const existingDriver = existingDrivers.find(d => {
    const dMfrs = d.zigbee?.manufacturerName || [];return manufacturerNames.some(m => CI.includesCI(dMfrs, m));
      });

  // Build Tuya DP mappings for Homey
  const homeyDPMappings = {};
  for (const [dp, attr] of Object.entries(zhaDevice.dpMappings)) {
    const mappedCaps = resolveZHAAttributeToCap(attr);
    if (mappedCaps.length) {
      homeyDPMappings[dp] = { capability: mappedCaps[0], attribute: attr };
    }
  }

  return {
    driverId: existingDriver?.id || `zha_${deviceType}`,
    deviceType,
    class: classMap[deviceType] || 'other',
    capabilities,
    zigbee: { manufacturerName: manufacturerNames, productId: productIds },
    dpMappings: homeyDPMappings,
    zhaClassName: zhaDevice.className,
    zhaQuirkClasses: zhaDevice.quirkClasses,
    clusters: allClusters,
    existingDriver: existingDriver?.id || null,
    isNew: !existingDriver
  };
}

// =============================================================================
// HELPER: Resolve cluster ID  Homey capabilities
// =============================================================================

function resolveClusterToCaps(clusterId) {
  const map = {
    0x0001: ['measure_battery','alarm_battery'],
    0x0006: ['onoff'],
    0x0008: ['dim'],
    0x0102: ['windowcoverings_set','windowcoverings_state'],
    0x0201: ['target_temperature','measure_temperature','thermostat_mode'],
    0x0202: ['fan_speed','onoff'],
    0x0300: ['light_hue','light_saturation','light_temperature','light_mode'],
    0x0400: ['measure_luminance'],
    0x0402: ['measure_temperature'],
    0x0403: ['measure_pressure'],
    0x0405: ['measure_humidity'],
    0x0406: ['alarm_motion'],
    0x0500: ['alarm_contact'],
    0x0702: ['meter_power','measure_power'],
    0x0B04: ['measure_power','measure_voltage','measure_current'],
    [CLUSTERS.TUYA_EF00]: ['onoff']
  };
  return map[clusterId] || [];
}

function resolveZHAAttributeToCap(attrName) {
  const map = {
    on_off: ['onoff'], switch: ['onoff'], state: ['onoff'],
    temperature: ['measure_temperature'], local_temperature: ['measure_temperature'],
    humidity: ['measure_humidity'], current_humidity: ['measure_humidity'],
    illuminance: ['measure_luminance'],
    occupancy: ['alarm_motion'], motion: ['alarm_motion'], presence: ['alarm_motion'],
    contact: ['alarm_contact'], open_close: ['alarm_contact'],
    water_leak: ['alarm_water'], moisture: ['alarm_water'],
    smoke: ['alarm_smoke'], carbon_monoxide: ['alarm_co'],
    battery: ['measure_battery'], battery_percentage: ['measure_battery'],
    position: ['windowcoverings_set'], current_position: ['windowcoverings_set'],
    target_temp: ['target_temperature'], set_point: ['target_temperature'],
    power: ['measure_power'], voltage: ['measure_voltage'], current: ['measure_current'],
    energy: ['meter_power'], consumption: ['meter_power'],
    brightness: ['dim'], level: ['dim'],
    color_temperature: ['light_temperature'],
    co2: ['measure_co2'], pm25: ['measure_pm25'], voc: ['measure_voc'],
    formaldehyde: ['measure_formaldehyde']
  };
  const lower = (attrName || '').toLowerCase();
  for (const [key, caps] of Object.entries(map)) {
    if (lower.includes(key)) return caps;
  }
  return [];
}

// =============================================================================
// BATCH PROCESSOR
// =============================================================================

function processZHAQuirks(pySourceFiles, driversDir) {
  const { loadExistingDrivers } = require('./Z2MConverterAdapter');
  const existingDrivers = loadExistingDrivers(driversDir);
  const results = { new: [], existing: [], enriched: [], errors: [] };
  const allDevices = [];

  for (const { source, filename } of pySourceFiles) {
    try {
      const devices = parseZHAQuirkFile(source, filename);
      allDevices.push(...devices);
      for (const dev of devices) {
        try {
          const config = convertZHAToHomey(dev, existingDrivers);
          if (config.isNew) {
            results.new.push(config);
          } else {
            const existing = existingDrivers.find(d => d.id === config.existingDriver);
            if (existing) {
              const newMfrs = config.zigbee.manufacturerName.filter(m => !CI.includesCI(existing.zigbee?.manufacturerName || [], m));if (newMfrs.length) {
                results.enriched.push({ ...config, newMfrs });
              } else {
                results.existing.push(config);
              }
            }
          }
        } catch (err) {
          results.errors.push({ className: dev.className, error: err.message });
        }
      }
    } catch (err) {
      results.errors.push({ file: filename, error: err.message });
    }
  }

  return { allDevices, results };
}

module.exports = {
  parseZHAQuirkFile,
  convertZHAToHomey,
  processZHAQuirks,
  resolveClusterToCaps,
  resolveZHAAttributeToCap,
  ZHA_REPO,
  ZHA_TUYA_URL,
  CACHE_DIR
};


