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
      console.error('[ENERGY-KPI] Invalid homey instance - cannot access settings');
      return;
    }
    
    const all = await homey.settings.get(KPI_KEY) || {};
    
    // Initialize device array if not exists
    if (!all[deviceId]) {
      all[deviceId] = [];
    }
    
    // Add timestamp if not provided
    const timestampedSample = {
      ts: Date.now(),
      power: sample.power || null,
      voltage: sample.voltage || null,
      current: sample.current || null,
      ...sample
    };
    
    // Push to array
    all[deviceId].push(timestampedSample);
    
    // Keep only last WINDOW_SIZE samples
    if (all[deviceId].length > WINDOW_SIZE) {
      all[deviceId] = all[deviceId].slice(-WINDOW_SIZE);
    }
    
    // Save back
    await homey.settings.set(KPI_KEY, all);
    
    console.log(`[ENERGY-KPI] Sample pushed for ${deviceId}: ${JSON.stringify(timestampedSample)}`);
    
  } catch (e) {
    console.error('[ENERGY-KPI] Failed to push sample:', e.message);
  }
}

/**
 * Compute KPI from stored samples
 * 
 * @param {Array} samples - Array of energy samples
 * @returns {Object|null} - { avgPower, maxPower, minPower, avgVoltage, avgCurrent, samplesCount, timespan }
 */
function computeKpi(samples) {
  if (!samples || samples.length === 0) return null;
  
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
      console.error('[ENERGY-KPI] Invalid homey instance - cannot access settings');
      return null;
    }
    
    const all = await homey.settings.get(KPI_KEY) || {};
    const samples = all[deviceId] || [];
    
    return computeKpi(samples);
  } catch (e) {
    console.error('[ENERGY-KPI] Failed to get KPI:', e.message);
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
      console.error('[ENERGY-KPI] Invalid homey instance - cannot access settings');
      return;
    }
    
    const all = await homey.settings.get(KPI_KEY) || {};
    delete all[deviceId];
    await homey.settings.set(KPI_KEY, all);
    console.log(`[ENERGY-KPI] KPI cleared for ${deviceId}`);
  } catch (e) {
    console.error('[ENERGY-KPI] Failed to clear KPI:', e.message);
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
      console.error('[ENERGY-KPI] Invalid homey instance - cannot access settings');
      return {};
    }
    
    const all = await homey.settings.get(KPI_KEY) || {};
    
    const result = {};
    for (const [deviceId, samples] of Object.entries(all)) {
      result[deviceId] = computeKpi(samples);
    }
    
    return result;
  } catch (e) {
    console.error('[ENERGY-KPI] Failed to get all KPI:', e.message);
    return {};
  }
}

/**
 * Calculate standard deviation
 * @param {Array<number>} values - Array of numbers
 * @returns {number} - Standard deviation
 */
function standardDeviation(values) {
  if (!values || values.length === 0) return 0;
  
  const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
  const squareDiffs = values.map(v => Math.pow(v - avg, 2));
  const avgSquareDiff = squareDiffs.reduce((sum, v) => sum + v, 0) / squareDiffs.length;
  
  return Math.sqrt(avgSquareDiff);
}

module.exports = {
  pushEnergySample,
  computeKpi,
  getDeviceKpi,
  clearDeviceKpi,
  getAllKpi
};
