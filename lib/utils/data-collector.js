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
            await device.setCapabilityValue('measure_battery', parseFloat(percent)).catch(() => { });
          }

          // Store for fallback
          await device.setStoreValue('last_battery_percent', percent).catch(() => { });

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
            await device.setCapabilityValue('measure_voltage', parseFloat(voltage)).catch(() => { });
          }

          // Convert to percentage
          const percent = voltageToPercent(voltage);
          if (device.hasCapability('measure_battery')) {
            await device.setCapabilityValue('measure_battery', parseFloat(percent)).catch(() => { });
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
            await device.setCapabilityValue('measure_power', parseFloat(value)).catch(() => { });
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
            await device.setCapabilityValue('measure_voltage', parseFloat(value)).catch(() => { });
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
            await device.setCapabilityValue('measure_current', parseFloat(current)).catch(() => { });
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
            await device.setCapabilityValue('measure_temperature', parseFloat(temp)).catch(() => { });
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
            await device.setCapabilityValue('measure_humidity', parseFloat(humidity)).catch(() => { });
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
            await device.setCapabilityValue('onoff', state).catch(() => { });
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
            await device.setCapabilityValue('dim', parseFloat(level)).catch(() => { });
          }

        } catch (err) {
          device.error('[DATA-COLLECTOR] Level report error:', err.message);
        }
      });
    }

    // v5.2.10: PATCH 6 - TUYA DP REPORTING
    // Register listeners for Tuya DP devices (cluster 0xEF00)
    if (device.tuyaEF00Manager || device.isTuyaDevice || device.usesTuyaDP) {
      device.log('[DATA-COLLECTOR] 📦 Registering Tuya DP listeners...');
      await registerTuyaDPListeners(device);
    }

    device.log('[DATA-COLLECTOR] ✅ Report listeners registered');

  } catch (err) {
    device.error('[DATA-COLLECTOR] ❌ Register listeners error:', err.message);
  }
}

/**
 * v5.2.10: PATCH 6 - Register Tuya DP report listeners for KPI
 * Handles data from Tuya TS0601 devices that don't use standard Zigbee clusters
 *
 * @param {Object} device - Homey device
 */
async function registerTuyaDPListeners(device) {
  try {
    const manager = device.tuyaEF00Manager;

    if (!manager) {
      device.log('[DATA-COLLECTOR] ⚠️ No tuyaEF00Manager available');
      return;
    }

    // Track what Tuya DP sources are available for KPI
    const tuyaDPSources = {
      battery: false,
      climate: false,
      power: false,
      motion: false
    };

    // Listen to dpReport for comprehensive data collection
    manager.on('dpReport', async ({ dpId, value, dpType }) => {
      try {
        device.log(`[DATA-COLLECTOR] 📦 Tuya DP${dpId}: ${JSON.stringify(value)} (type: ${dpType})`);

        // Store last data timestamp for KPI
        await device.setStoreValue('last_tuya_dp_received', Date.now()).catch(() => { });
        await device.setStoreValue(`tuya_dp_${dpId}`, value).catch(() => { });

        // Battery DPs (4, 14, 15, 33, 35)
        if ([4, 14, 15, 33, 35].includes(dpId)) {
          tuyaDPSources.battery = true;
          device.log('[DATA-COLLECTOR] 🔋 Tuya DP battery source enabled');
          await device.setStoreValue('kpi_battery_source', 'tuya_dp').catch(() => { });
        }

        // Temperature DPs (1, 3, 18)
        if ([1, 3, 18].includes(dpId) && typeof value === 'number' && value > -400 && value < 1000) {
          // Check if it looks like temperature (could be scaled by 10)
          const temp = value > 100 ? value / 10 : value;
          if (temp > -40 && temp < 100) {
            tuyaDPSources.climate = true;
            device.log('[DATA-COLLECTOR] 🌡️ Tuya DP climate source enabled (temperature)');
            await device.setStoreValue('kpi_climate_source', 'tuya_dp').catch(() => { });
          }
        }

        // Humidity DPs (2, 5, 19)
        if ([2, 5, 19].includes(dpId) && typeof value === 'number' && value >= 0 && value <= 1000) {
          tuyaDPSources.climate = true;
          device.log('[DATA-COLLECTOR] 💧 Tuya DP climate source enabled (humidity)');
          await device.setStoreValue('kpi_climate_source', 'tuya_dp').catch(() => { });
        }

        // Motion/Presence DPs (1, 101, 102)
        if (dpId === 1 && (value === true || value === false || value === 0 || value === 1)) {
          tuyaDPSources.motion = true;
          device.log('[DATA-COLLECTOR] 🚶 Tuya DP motion source enabled');
          await device.setStoreValue('kpi_motion_source', 'tuya_dp').catch(() => { });
        }

        // Power DPs (various depending on device)
        if ([6, 16, 17, 18].includes(dpId) && typeof value === 'number') {
          tuyaDPSources.power = true;
          device.log('[DATA-COLLECTOR] ⚡ Tuya DP power source enabled');
          await device.setStoreValue('kpi_power_source', 'tuya_dp').catch(() => { });
        }

        // Store active sources summary
        await device.setStoreValue('tuya_dp_sources', tuyaDPSources).catch(() => { });

      } catch (err) {
        device.error('[DATA-COLLECTOR] Tuya DP report error:', err.message);
      }
    });

    device.log('[DATA-COLLECTOR] ✅ Tuya DP listeners registered');
    await device.setStoreValue('tuya_dp_collector_active', true).catch(() => { });

  } catch (err) {
    device.error('[DATA-COLLECTOR] ❌ Tuya DP listener registration error:', err.message);
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
          await device.setCapabilityValue('measure_battery', parseFloat(batteryData.percent)).catch(() => { });
        }
      }

      // Poll energy (mains devices)
      const deviceData = device.getData();
      const powerSource = device.getStoreValue('powerSource') || 'unknown';

      if (powerSource === 'mains') {
        const energyData = await readEnergy(device, zclNode);

        if (energyData.power !== null && device.hasCapability('measure_power')) {
          await device.setCapabilityValue('measure_power', parseFloat(energyData.power)).catch(() => { });
        }

        if (energyData.voltage !== null && device.hasCapability('measure_voltage')) {
          await device.setCapabilityValue('measure_voltage', parseFloat(energyData.voltage)).catch(() => { });
        }

        if (energyData.current !== null && device.hasCapability('measure_current')) {
          await device.setCapabilityValue('measure_current', parseFloat(energyData.current)).catch(() => { });
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
  registerTuyaDPListeners,
  startPeriodicPolling,
  stopPeriodicPolling
};
