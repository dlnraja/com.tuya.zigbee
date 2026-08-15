'use strict';

/**
 * v9.0.414 (P92.122): FallbackChains — every "unsupported" gets a working
 * alternative, and the working path is REMEMBERED.
 *
 * Philosophy (user directive): an unsupported ZCL operation must never be
 * a dead end. Each domain (battery, sensor read, reporting, onoff) has an
 * ordered chain of methods — ZCL standard → raw/numeric cluster → Tuya DP
 * → last-known store. The executor:
 *  1. tries the remembered working path first (positive cache, persisted
 *     per device in the store key `zcl_working_paths`);
 *  2. skips paths the UnsupportedRegistry already knows are unsupported;
 *  3. on an "unsupported" error, marks the path and cascades to the next;
 *  4. on a TRANSIENT error (sleepy device, timeout) stops without
 *     poisoning anything — the chain will be retried next cycle;
 *  5. on success, persists the winning path so subsequent calls go
 *     straight to what works on THIS device.
 */

const { getRegistry, isUnsupportedError, readAttributesSmart } = require('./UnsupportedRegistry');

const PATH_STORE = 'zcl_working_paths';

/**
 * Cluster name → numeric ZCL id, for the raw/numeric fallback path.
 * (Tuya firmwares often expose the cluster only under its numeric id.)
 */
const CLUSTER_NAME_TO_ID = {
  genBasic: 0x0000,
  genPowerCfg: 0x0001,
  powerConfiguration: 0x0001,
  genOnOff: 0x0006,
  onOff: 0x0006,
  genLevelCtrl: 0x0008,
  levelControl: 0x0008,
  msTemperatureMeasurement: 0x0402,
  temperatureMeasurement: 0x0402,
  msPressureMeasurement: 0x0403,
  msIlluminanceMeasurement: 0x0400,
  illuminanceMeasurement: 0x0400,
  msRelativeHumidity: 0x0405,
  relativeHumidity: 0x0405,
  msOccupancySensing: 0x0406,
  occupancySensing: 0x0406,
  msCO2: 0x040D,
  seMetering: 0x0702,
  metering: 0x0702,
  haElectricalMeasurement: 0x0B04,
  electricalMeasurement: 0x0B04,
  ssIasZone: 0x0500,
  iasZone: 0x0500,
  hvacThermostat: 0x0201,
  thermostat: 0x0201,
  closuresWindowCovering: 0x0102,
  windowCovering: 0x0102,
  lightingColorCtrl: 0x0300,
  colorControl: 0x0300,
};

function _paths(device) {
  try {
    if (typeof device.getStoreValue === 'function') {
      const v = device.getStoreValue(PATH_STORE);
      if (v && typeof v === 'object') { return { ...v }; }
    }
  } catch (_e) { /* no-op */ }
  return {};
}

function _rememberPath(device, domain, name) {
  const paths = _paths(device);
  if (paths[domain] === name) { return; }
  paths[domain] = name;
  try {
    if (typeof device.setStoreValue === 'function') {
      device.setStoreValue(PATH_STORE, paths).catch(() => {});
    }
    device.log(`[FALLBACK-CHAIN] ${domain} → working path: ${name}`);
  } catch (_e) { /* no-op */ }
}

/**
 * Execute an ordered chain of fallback methods for a domain.
 *
 * @param {Object} device
 * @param {string} domain - e.g. 'battery.read', 'sensor.temperature'
 * @param {Array<{name: string, run: Function}>} steps
 * @returns {Promise<{ok: boolean, via: string|null, result?: any, error?: Error, transient?: boolean}>}
 */
async function execChain(device, domain, steps) {
  if (!Array.isArray(steps) || steps.length === 0) {
    return { ok: false, via: null };
  }
  const registry = getRegistry(device);
  const preferred = _paths(device)[domain];
  const ordered = preferred
    ? [...steps.filter((s) => s.name === preferred), ...steps.filter((s) => s.name !== preferred)]
    : steps;

  let lastErr = null;
  for (const step of ordered) {
    if (!step || typeof step.run !== 'function') { continue; }
    if (registry.isKnown(domain, step.name)) { continue; } // dead path on this device
    try {
      // eslint-disable-next-line no-await-in-loop
      const result = await step.run();
      _rememberPath(device, domain, step.name);
      return { ok: true, via: step.name, result };
    } catch (err) {
      lastErr = err;
      if (isUnsupportedError(err)) {
        registry.mark(domain, step.name, 'next-fallback');
        continue;
      }
      // Transient failure: leave everything unmarked, retry next cycle.
      return { ok: false, via: null, error: err, transient: true };
    }
  }
  return { ok: false, via: null, error: lastErr };
}

/**
 * Find an alternative cluster instance by numeric id (raw path) on the
 * given endpoint, when the named cluster object is missing or dead.
 *
 * @param {Object} device
 * @param {string} clusterLabel - named cluster label
 * @param {number} [endpointId=1]
 * @returns {Object|null}
 */
function findRawCluster(device, clusterLabel, endpointId = 1) {
  const id = CLUSTER_NAME_TO_ID[clusterLabel];
  if (!id) { return null; }
  const ep = device && device.zclNode && device.zclNode.endpoints
    && device.zclNode.endpoints[endpointId];
  if (!ep || !ep.clusters) { return null; }
  return ep.clusters[id] || ep.clusters[String(id)] || null;
}

/**
 * Read a sensor attribute with the full fallback chain:
 * named cluster → raw/numeric cluster → (caller may add a DP step).
 *
 * @param {Object} device
 * @param {Object} namedCluster
 * @param {string} clusterLabel
 * @param {string} attribute
 * @param {Object} [opts]
 * @param {Function} [opts.dpFallback] - async (device) => value|undefined
 * @returns {Promise<{ok: boolean, value?: any, via: string|null}>}
 */
async function readSensorWithFallbacks(device, namedCluster, clusterLabel, attribute, opts = {}) {
  const steps = [];
  if (namedCluster) {
    steps.push({
      name: 'zcl-named',
      run: async () => {
        const data = await readAttributesSmart(device, namedCluster, clusterLabel, [attribute]);
        if (data && data[attribute] !== undefined) { return data[attribute]; }
        throw Object.assign(new Error('UNSUPPORTED_ATTRIBUTE'), { status: 0x86 });
      },
    });
  }
  steps.push({
    name: 'zcl-raw-numeric',
    run: async () => {
      const raw = findRawCluster(device, clusterLabel);
      if (!raw || raw === namedCluster || typeof raw.readAttributes !== 'function') {
        throw Object.assign(new Error('UNSUPPORTED_CLUSTER'), { status: 0x81 });
      }
      const data = await readAttributesSmart(device, raw, `${clusterLabel}#raw`, [attribute]);
      if (data && data[attribute] !== undefined) { return data[attribute]; }
      throw Object.assign(new Error('UNSUPPORTED_ATTRIBUTE'), { status: 0x86 });
    },
  });
  if (typeof opts.dpFallback === 'function') {
    steps.push({
      name: 'tuya-dp',
      run: async () => {
        const v = await opts.dpFallback(device);
        if (v !== undefined && v !== null) { return v; }
        throw new Error('dp-no-value');
      },
    });
  }

  const out = await execChain(device, `sensor.${clusterLabel}.${attribute}`, steps);
  return { ok: out.ok, value: out.result, via: out.via };
}

module.exports = {
  execChain,
  readSensorWithFallbacks,
  findRawCluster,
  CLUSTER_NAME_TO_ID,
  // Re-export command router so callers have one entry point
  writeCapabilityWithFallbacks: (...args) => require('./CapabilityCommandRouter').writeCapabilityWithFallbacks(...args),
  registerCapabilitySafe: (...args) => require('./CapabilityCommandRouter').registerCapabilitySafe(...args),
};
