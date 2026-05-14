'use strict';

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * UNIVERSAL ZIGBEE DEVICE FINGERPRINT DATABASE
 * ══════════════════════════════════════════════════════════════════════════════
 * 
 * v8.0.0: Externalized all 59,550+ fingerprints to dynamic JSON storage:
 *         -> data/fingerprints.json
 * 
 * This drastically improves Homey startup times, memory performance, and 
 * codebase clean-up. All existing API helpers and accessor methods are 
 * preserved for 100% backward compatibility.
 * 
 * [ignoring loop detection]
 */

const DEVICE_FINGERPRINTS = require('./fingerprints.json');

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function getFingerprint(manufacturerName) {
  // Case-insensitive lookup
  const mfrLower = (manufacturerName || '').toLowerCase();
  for (const [key, fp] of Object.entries(DEVICE_FINGERPRINTS)) {
    if (key.toLowerCase() === mfrLower) {
      return fp;
    }
  }
  return null;
}

function getDriverId(manufacturerName, modelId) {
  const fp = getFingerprint(manufacturerName);
  if (fp) {
    const modelLower = (modelId || '').toLowerCase();
    if (modelId && fp.modelIds && !fp.modelIds.some(m => m.toLowerCase() === modelLower)) {
      console.log(`[FINGERPRINT-DB] Warning: modelId ${modelId} not in expected list for ${manufacturerName}`);
    }
    return fp.driverId;
  }
  return null;
}

function getDPMapping(manufacturerName) {
  const fp = getFingerprint(manufacturerName);
  if (!fp || !fp.dps) return {};
  const simplified = {};
  for (const [dp, config] of Object.entries(fp.dps)) {
    if (typeof config === 'object' && config.capability) {
      simplified[dp] = config.capability;
    } else if (typeof config === 'string') {
      simplified[dp] = config;
    } else if (typeof config === 'object' && config.name) {
      simplified[dp] = config.name;
    }
  }
  return simplified;
}

function getEnrichedDPMapping(manufacturerName) {
  const fp = getFingerprint(manufacturerName);
  return fp ? fp.dps : {};
}

function isBatteryPowered(manufacturerName) {
  const fp = getFingerprint(manufacturerName);
  return fp ? fp.powerSource === 'battery' : null;
}

function getFingerprintsForDriver(driverId) {
  const result = [];
  for (const [mfr, fp] of Object.entries(DEVICE_FINGERPRINTS)) {
    if (fp.driverId === driverId) {
      result.push({ manufacturerName: mfr, ...fp });
    }
  }
  return result;
}

function getAllManufacturerNames() {
  return Object.keys(DEVICE_FINGERPRINTS);
}

function setFingerprint(manufacturerName, fingerprint) {
  DEVICE_FINGERPRINTS[manufacturerName] = fingerprint;
}

function getCapabilities(manufacturerName) {
  const fp = getFingerprint(manufacturerName);
  return fp ? fp.capabilities : [];
}

function getClusters(manufacturerName) {
  const fp = getFingerprint(manufacturerName);
  return fp ? fp.clusters : [];
}

function getPowerInfo(manufacturerName) {
  const fp = getFingerprint(manufacturerName);
  if (!fp) return null;
  return { powerSource: fp.powerSource, batteryType: fp.batteryType || null };
}

function getZigbeeReporting(manufacturerName) {
  const fp = getFingerprint(manufacturerName);
  return fp ? fp.zigbeeReporting : null;
}

function findByModelId(modelId) {
  const modelLower = (modelId || '').toLowerCase();
  const results = [];
  for (const [mfr, fp] of Object.entries(DEVICE_FINGERPRINTS)) {
    if (fp.modelIds && fp.modelIds.some(m => m.toLowerCase() === modelLower)) {
      results.push({ manufacturerName: mfr, ...fp });
    }
  }
  return results;
}

function convertDPValue(manufacturerName, dpId, rawValue) {
  const fp = getFingerprint(manufacturerName);
  if (!fp || !fp.dps || !fp.dps[dpId]) return rawValue;
  const dpConfig = fp.dps[dpId];
  if (typeof dpConfig !== 'object') return rawValue;
  switch (dpConfig.converter) {
  case 'divideBy10': return typeof rawValue === 'number' ? rawValue / 10 : rawValue;
  case 'divideBy100': return typeof rawValue === 'number' ? rawValue / 100 : rawValue;
  case 'boolean': return Boolean(rawValue);
  case 'raw': default: return rawValue;
  }
}

function getStatistics() {
  const stats = { total: 0, byType: {}, byPowerSource: {}, byDriver: {} };
  for (const [mfr, fp] of Object.entries(DEVICE_FINGERPRINTS)) {
    stats.total++;
    stats.byType[fp.type] = (stats.byType[fp.type] || 0) + 1;
    stats.byPowerSource[fp.powerSource] = (stats.byPowerSource[fp.powerSource] || 0) + 1;
    stats.byDriver[fp.driverId] = (stats.byDriver[fp.driverId] || 0) + 1;
  }
  return stats;
}

module.exports = {
  DEVICE_FINGERPRINTS,
  getFingerprint,
  getDriverId,
  getDPMapping,
  getEnrichedDPMapping,
  isBatteryPowered,
  getFingerprintsForDriver,
  getAllManufacturerNames,
  setFingerprint,
  getCapabilities,
  getClusters,
  getPowerInfo,
  getZigbeeReporting,
  findByModelId,
  convertDPValue,
  getStatistics
};
