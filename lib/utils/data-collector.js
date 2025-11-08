'use strict';

/**
 * Data Collector - Comprehensive data collection & storage
 * Inspired by: Homey SDK3 best practices, community apps
 * 
 * Collects data from:
 * - Standard Zigbee clusters (battery, power, climate, etc.)
 * - Tuya DP protocol (hidden cluster 0xEF00)
 * - Attribute reports (configured via cluster-configurator)
 * - Periodic polling (fallback when reports fail)
 * 
 * Stores data for:
 * - Real-time device state
 * - Historical KPI (via energy-kpi.js)
 * - Debugging & diagnostics
 */

const { pushEnergySample } = require('./energy-kpi');
const { readBattery, readEnergy } = require('./battery-reader');

/**
 * Register attribute report listeners
 * Based on: SDK3 docs, IKEA/Philips apps
 * 
 * @param {Object} device - Homey device
 * @param {Object} zclNode - ZCL node
 * @returns {Promise<void>}
 */
async function registerReportListeners(device, zclNode) {
  device.log('[DATA-COLLECTOR] 📡 Registering attribute report listeners...');
  
  try {
    if (!zclNode || !zclNode.endpoints || !zclNode.endpoints[1]) {
      device.log('[DATA-COLLECTOR] ⚠️  No endpoint 1 available');
      return;
    }
    
    const endpoint = zclNode.endpoints[1];
    
    // BATTERY REPORTING
    if (endpoint.clusters.genPowerCfg) {
      device.log('[DATA-COLLECTOR] Registering battery listeners...');
      
      // Battery percentage (most common)
      endpoint.clusters.genPowerCfg.on('attr.batteryPercentageRemaining', async (value) => {
        try {
          const percent = Math.round(value / 2); // 0-200 → 0-100
          device.log(`[DATA-COLLECTOR] 🔋 Battery report: ${percent}%`);
          
          if (device.hasCapability('measure_battery')) {
            await device.setCapabilityValue('measure_battery', percent).catch(() => {});
          }
          
          // Store for fallback
          await device.setStoreValue('last_battery_percent', percent).catch(() => {});
          
        } catch (err) {
          device.error('[DATA-COLLECTOR] Battery report error:', err.message);
        }
      });
      
      // Battery voltage (fallback)
      endpoint.clusters.genPowerCfg.on('attr.batteryVoltage', async (value) => {
        try {
          const voltage = value / 10; // Convert to V
          device.log(`[DATA-COLLECTOR] 🔋 Battery voltage report: ${voltage}V`);
          
          if (device.hasCapability('measure_voltage')) {
            await device.setCapabilityValue('measure_voltage', voltage).catch(() => {});
          }
          
          // Convert to percentage
          const percent = voltageToPercent(voltage);
          if (device.hasCapability('measure_battery')) {
            await device.setCapabilityValue('measure_battery', percent).catch(() => {});
          }
          
        } catch (err) {
          device.error('[DATA-COLLECTOR] Battery voltage report error:', err.message);
        }
      });
    }
    
    // POWER/ENERGY REPORTING
    if (endpoint.clusters.haElectricalMeasurement) {
      device.log('[DATA-COLLECTOR] Registering power listeners...');
      
      // Active power
      endpoint.clusters.haElectricalMeasurement.on('attr.activePower', async (value) => {
        try {
          device.log(`[DATA-COLLECTOR] ⚡ Power report: ${value}W`);
          
          if (device.hasCapability('measure_power')) {
            await device.setCapabilityValue('measure_power', value).catch(() => {});
          }
          
          // Push to KPI
          await pushEnergySample(device.homey, device.getData().id, { power: value });
          
        } catch (err) {
          device.error('[DATA-COLLECTOR] Power report error:', err.message);
        }
      });
      
      // RMS voltage
      endpoint.clusters.haElectricalMeasurement.on('attr.rmsvoltage', async (value) => {
        try {
          device.log(`[DATA-COLLECTOR] ⚡ Voltage report: ${value}V`);
          
          if (device.hasCapability('measure_voltage')) {
            await device.setCapabilityValue('measure_voltage', value).catch(() => {});
          }
          
          // Push to KPI
          await pushEnergySample(device.homey, device.getData().id, { voltage: value });
          
        } catch (err) {
          device.error('[DATA-COLLECTOR] Voltage report error:', err.message);
        }
      });
      
      // RMS current
      endpoint.clusters.haElectricalMeasurement.on('attr.rmscurrent', async (value) => {
        try {
          const current = value / 1000; // mA to A
          device.log(`[DATA-COLLECTOR] ⚡ Current report: ${current}A`);
          
          if (device.hasCapability('measure_current')) {
            await device.setCapabilityValue('measure_current', current).catch(() => {});
          }
          
          // Push to KPI
          await pushEnergySample(device.homey, device.getData().id, { current });
          
        } catch (err) {
          device.error('[DATA-COLLECTOR] Current report error:', err.message);
        }
      });
    }
    
    // TEMPERATURE REPORTING
    if (endpoint.clusters.msTemperatureMeasurement) {
      device.log('[DATA-COLLECTOR] Registering temperature listener...');
      
      endpoint.clusters.msTemperatureMeasurement.on('attr.measuredValue', async (value) => {
        try {
          const temp = value / 100; // Convert to °C
          device.log(`[DATA-COLLECTOR] 🌡️  Temperature report: ${temp}°C`);
          
          if (device.hasCapability('measure_temperature')) {
            await device.setCapabilityValue('measure_temperature', temp).catch(() => {});
          }
          
        } catch (err) {
          device.error('[DATA-COLLECTOR] Temperature report error:', err.message);
        }
      });
    }
    
    // HUMIDITY REPORTING
    if (endpoint.clusters.msRelativeHumidity) {
      device.log('[DATA-COLLECTOR] Registering humidity listener...');
      
      endpoint.clusters.msRelativeHumidity.on('attr.measuredValue', async (value) => {
        try {
          const humidity = value / 100; // Convert to %
          device.log(`[DATA-COLLECTOR] 💧 Humidity report: ${humidity}%`);
          
          if (device.hasCapability('measure_humidity')) {
            await device.setCapabilityValue('measure_humidity', humidity).catch(() => {});
          }
          
        } catch (err) {
          device.error('[DATA-COLLECTOR] Humidity report error:', err.message);
        }
      });
    }
    
    // ONOFF REPORTING
    if (endpoint.clusters.genOnOff) {
      device.log('[DATA-COLLECTOR] Registering OnOff listener...');
      
      endpoint.clusters.genOnOff.on('attr.onOff', async (value) => {
        try {
          const state = Boolean(value);
          device.log(`[DATA-COLLECTOR] 💡 OnOff report: ${state ? 'ON' : 'OFF'}`);
          
          if (device.hasCapability('onoff')) {
            await device.setCapabilityValue('onoff', state).catch(() => {});
          }
          
        } catch (err) {
          device.error('[DATA-COLLECTOR] OnOff report error:', err.message);
        }
      });
    }
    
    // LEVEL CONTROL REPORTING
    if (endpoint.clusters.genLevelCtrl) {
      device.log('[DATA-COLLECTOR] Registering level listener...');
      
      endpoint.clusters.genLevelCtrl.on('attr.currentLevel', async (value) => {
        try {
          const level = value / 254; // 0-254 → 0-1
          device.log(`[DATA-COLLECTOR] 🎚️  Level report: ${Math.round(level * 100)}%`);
          
          if (device.hasCapability('dim')) {
            await device.setCapabilityValue('dim', level).catch(() => {});
          }
          
        } catch (err) {
          device.error('[DATA-COLLECTOR] Level report error:', err.message);
        }
      });
    }
    
    device.log('[DATA-COLLECTOR] ✅ Report listeners registered');
    
  } catch (err) {
    device.error('[DATA-COLLECTOR] ❌ Register listeners error:', err.message);
  }
}

/**
 * Start periodic data polling (fallback when reports fail)
 * 
 * @param {Object} device - Homey device
 * @param {Object} zclNode - ZCL node
 * @param {number} intervalMs - Poll interval in milliseconds
 * @returns {Object} - Interval handle
 */
function startPeriodicPolling(device, zclNode, intervalMs = 300000) {
  device.log(`[DATA-COLLECTOR] 🔄 Starting periodic polling (${intervalMs / 1000}s)...`);
  
  const pollData = async () => {
    try {
      device.log('[DATA-COLLECTOR] 📊 Polling data...');
      
      // Poll battery
      const batteryData = await readBattery(device, zclNode);
      if (batteryData.percent !== null) {
        if (device.hasCapability('measure_battery')) {
          await device.setCapabilityValue('measure_battery', batteryData.percent).catch(() => {});
        }
      }
      
      // Poll energy (mains devices)
      const deviceData = device.getData();
      const powerSource = device.getStoreValue('powerSource') || 'unknown';
      
      if (powerSource === 'mains') {
        const energyData = await readEnergy(device, zclNode);
        
        if (energyData.power !== null && device.hasCapability('measure_power')) {
          await device.setCapabilityValue('measure_power', energyData.power).catch(() => {});
        }
        
        if (energyData.voltage !== null && device.hasCapability('measure_voltage')) {
          await device.setCapabilityValue('measure_voltage', energyData.voltage).catch(() => {});
        }
        
        if (energyData.current !== null && device.hasCapability('measure_current')) {
          await device.setCapabilityValue('measure_current', energyData.current).catch(() => {});
        }
        
        // Push to KPI
        if (energyData.power !== null || energyData.voltage !== null || energyData.current !== null) {
          await pushEnergySample(device.homey, deviceData.id, energyData);
        }
      }
      
      device.log('[DATA-COLLECTOR] ✅ Polling complete');
      
    } catch (err) {
      device.error('[DATA-COLLECTOR] ❌ Polling error:', err.message);
    }
  };
  
  // Initial poll
  pollData();
  
  // Start interval
  const interval = setInterval(pollData, intervalMs);
  
  return interval;
}

/**
 * Stop periodic polling
 * 
 * @param {Object} interval - Interval handle
 */
function stopPeriodicPolling(interval) {
  if (interval) {
    clearInterval(interval);
    console.log('[DATA-COLLECTOR] 🛑 Periodic polling stopped');
  }
}

/**
 * Voltage to percentage conversion (CR2032 curve)
 * @param {number} voltage - Voltage in V
 * @returns {number} - Percentage 0-100
 */
function voltageToPercent(voltage) {
  if (!voltage || voltage <= 0) return 0;
  const vMax = 3.0;
  const vMin = 2.0;
  return Math.min(100, Math.max(0, Math.round((voltage - vMin) * 100 / (vMax - vMin))));
}

module.exports = {
  registerReportListeners,
  startPeriodicPolling,
  stopPeriodicPolling
};
