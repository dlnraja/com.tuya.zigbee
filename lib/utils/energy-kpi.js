'use strict';

/**
 * Energy KPI Collector - Rolling window metrics for energy monitoring
 * Inspired by: Homey SDK3 best practices & community apps
 * 
 * Stores energy samples in rolling windows for:
 * - Average power consumption
 * - Peak power detection
 * - Energy trends
 * - Voltage stability
 * - Current monitoring
 */

const KPI_KEY = 'device_energy_kpi_v1';
const WINDOW_SIZE = 12; // Last 12 samples (1 hour if polled every 5 min)

// WHY(P2960): Bastien 1.0.161 OOM (17-18/10, JsonStringify in the stack). Every power/voltage/current
// report did settings.get + settings.set of the WHOLE KPI map (all devices), i.e. a full JSON
// serialisation per attribute report, the map never forgot deleted devices and `...sample` let any
// extra field in. Now: one in-memory map per homey (write-behind, at most one persist per
// PERSIST_DEBOUNCE_MS), numeric whitelist per sample, device count capped (oldest evicted).
const MAX_DEVICES = 64;
const PERSIST_DEBOUNCE_MS = 60 * 1000;
const SAMPLE_FIELDS = ['power', 'voltage', 'current', 'energy'];
const _state = new WeakMap(); // homey -> { all, timer, loading }

function _num(v) {
  if (v === null || v === undefined || v === '') {return null;}
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function _sanitizeSample(sample) {
  const out = { ts: _num(sample && (sample.ts || sample.timestamp)) || Date.now() };
  for (const k of SAMPLE_FIELDS) {out[k] = _num(sample && sample[k]);}
  return out;
}

function _sanitizeAll(raw) {
  const all = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {return all;}
  for (const [id, arr] of Object.entries(raw)) {
    if (!Array.isArray(arr)) {continue;}
    all[id] = arr.slice(-WINDOW_SIZE).map(_sanitizeSample);
  }
  _capDevices(all);
  return all;
}

function _lastTs(arr) { return (arr && arr.length && arr[arr.length - 1].ts) || 0; }

function _capDevices(all) {
  const ids = Object.keys(all);
  if (ids.length <= MAX_DEVICES) {return;}
  ids.sort((a, b) => _lastTs(all[a]) - _lastTs(all[b]));
  for (const id of ids.slice(0, ids.length - MAX_DEVICES)) {delete all[id];}
}

async function _load(homey) {
  let st = _state.get(homey);
  if (st && st.all) {return st;}
  if (!st) { st = { all: null, timer: null }; _state.set(homey, st); }
  let raw = null;
  try { raw = await homey.settings.get(KPI_KEY); } catch (_e) { raw = null; }
  if (!st.all) {st.all = _sanitizeAll(raw);}
  return st;
}

async function flushKpi(homey) {
  const st = homey && _state.get(homey);
  if (!st || !st.all) {return;}
  if (st.timer) {
    try { (homey.clearTimeout || clearTimeout)(st.timer); } catch (_e) { /* soft */ }
    st.timer = null;
  }
  try { await homey.settings.set(KPI_KEY, st.all); } catch (e) { _getLogger(homey).error('[ENERGY-KPI] persist failed:', e.message); }
}

function _schedulePersist(homey) {
  const st = _state.get(homey);
  if (!st || st.timer) {return;}
  const set = typeof homey.setTimeout === 'function' ? homey.setTimeout.bind(homey) : setTimeout;
  st.timer = set(() => { st.timer = null; flushKpi(homey).catch(() => {}); }, PERSIST_DEBOUNCE_MS);
  if (st.timer && typeof st.timer.unref === 'function') {st.timer.unref();}
}

/**
 * Get a logger bound to homey context
 */
function _getLogger(homey) {
  const log = (homey && typeof homey.log === 'function') ? homey.log.bind(homey) : () => {};
  const error = (homey && typeof homey.error === 'function') ? homey.error.bind(homey) : () => {};
  return { log, error };
}

/**
 * Push new energy sample to rolling window
 * 
 * @param {Object} homey - Homey instance (from device.homey)
 * @param {string} deviceId - Device ID
 * @param {Object} sample - { power, voltage, current, timestamp }
 * @returns {Promise<void>}
 */
async function pushEnergySample(homey, deviceId, sample) {
  try {
    if (!homey || !homey.settings) {
      _getLogger(homey).error('[ENERGY-KPI] Invalid homey instance - cannot access settings');
      return;
    }

    const st = await _load(homey);
    const all = st.all;
    const id = String(deviceId);
    if (!all[id]) {all[id] = [];}
    all[id].push(_sanitizeSample(sample));
    if (all[id].length > WINDOW_SIZE) {all[id].splice(0, all[id].length - WINDOW_SIZE);}
    _capDevices(all);
    _schedulePersist(homey);

  } catch (e) {
    _getLogger(homey).error('[ENERGY-KPI] Failed to push sample:', e.message);
  }
}

/**
 * Compute KPI from stored samples
 * 
 * @param {Array} samples - Array of energy samples
 * @returns {Object|null} - { avgPower, maxPower, minPower, avgVoltage, avgCurrent, samplesCount, timespan }
 */
function computeKpi(samples) {
  if (!samples || samples.length === 0) {return null;}
  
  const powerSamples = samples.filter(s => s.power !== null && s.power !== undefined);
  const voltageSamples = samples.filter(s => s.voltage !== null && s.voltage !== undefined);
  const currentSamples = samples.filter(s => s.current !== null && s.current !== undefined);
  
  const kpi = {
    samplesCount: samples.length,
    timespan: null
  };
  
  // Power KPI
  if (powerSamples.length > 0) {
    const powers = powerSamples.map(s => s.power);
    kpi.avgPower = powers.reduce((sum, p) => sum + p, 0) / powers.length;
    kpi.maxPower = Math.max(...powers);
    kpi.minPower = Math.min(...powers);
    kpi.powerStdDev = standardDeviation(powers);
  }
  
  // Voltage KPI
  if (voltageSamples.length > 0) {
    const voltages = voltageSamples.map(s => s.voltage);
    kpi.avgVoltage = voltages.reduce((sum, v) => sum + v, 0) / voltages.length;
    kpi.maxVoltage = Math.max(...voltages);
    kpi.minVoltage = Math.min(...voltages);
    kpi.voltageStability = 100 - (kpi.maxVoltage - kpi.minVoltage) / kpi.avgVoltage * 100;
  }
  
  // Current KPI
  if (currentSamples.length > 0) {
    const currents = currentSamples.map(s => s.current);
    kpi.avgCurrent = currents.reduce((sum, c) => sum + c, 0) / currents.length;
    kpi.maxCurrent = Math.max(...currents);
  }
  
  // Timespan
  if (samples.length >= 2) {
    const timestamps = samples.map(s => s.ts);
    kpi.timespan = Math.max(...timestamps) - Math.min(...timestamps);
    kpi.timespanHours = (kpi.timespan / (1000 * 60 * 60)).toFixed(1);
  }
  
  return kpi;
}

/**
 * Get KPI for a device
 * 
 * @param {Object} homey - Homey instance (from device.homey)
 * @param {string} deviceId - Device ID
 * @returns {Promise<Object|null>} - Computed KPI
 */
async function getDeviceKpi(homey, deviceId) {
  try {
    if (!homey || !homey.settings) {
      _getLogger(homey).error('[ENERGY-KPI] Invalid homey instance - cannot access settings');
      return null;
    }

    const all = (await _load(homey)).all;
    const samples = all[String(deviceId)] || [];

    return computeKpi(samples);
  } catch (e) {
    _getLogger(homey).error('[ENERGY-KPI] Failed to get KPI:', e.message);
    return null;
  }
}

/**
 * Clear KPI data for a device
 * 
 * @param {Object} homey - Homey instance (from device.homey)
 * @param {string} deviceId - Device ID
 * @returns {Promise<void>}
 */
async function clearDeviceKpi(homey, deviceId) {
  try {
    if (!homey || !homey.settings) {
      _getLogger(homey).error('[ENERGY-KPI] Invalid homey instance - cannot access settings');
      return;
    }

    const all = (await _load(homey)).all;
    delete all[String(deviceId)];
    await flushKpi(homey);
  } catch (e) {
    _getLogger(homey).error('[ENERGY-KPI] Failed to clear KPI:', e.message);
  }
}

/**
 * Get all devices with KPI data
 * 
 * @param {Object} homey - Homey instance (from device.homey)
 * @returns {Promise<Object>} - { deviceId: kpi, ... }
 */
async function getAllKpi(homey) {
  try {
    if (!homey || !homey.settings) {
      _getLogger(homey).error('[ENERGY-KPI] Invalid homey instance - cannot access settings');
      return {};
    }

    const all = (await _load(homey)).all;

    const result = {};
    for (const [deviceId, samples] of Object.entries(all)) {
      result[deviceId] = computeKpi(samples);
    }

    return result;
  } catch (e) {
    _getLogger(homey).error('[ENERGY-KPI] Failed to get all KPI:', e.message);
    return {};
  }
}

/**
 * Calculate standard deviation
 * @param {Array<number>} values - Array of numbers
 * @returns {number} - Standard deviation
 */
function standardDeviation(values) {
  if (!values || values.length === 0) {return 0;}
  
  const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
  const squareDiffs = values.map(v => Math.pow(v - avg, 2));
  const avgSquareDiff = squareDiffs.reduce((sum, v) => sum + v, 0) / squareDiffs.length;
  
  return Math.sqrt(avgSquareDiff);
}

module.exports = {
  flushKpi,
  KPI_LIMITS: { WINDOW_SIZE, MAX_DEVICES, PERSIST_DEBOUNCE_MS },
  _sanitizeSample,
  pushEnergySample,
  computeKpi,
  getDeviceKpi,
  clearDeviceKpi,
  getAllKpi
};
