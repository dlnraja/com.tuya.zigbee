'use strict';
const { safeDivide, safeMultiply, safeParse } = require('./tuyaUtils.js');
const { CLUSTERS } = require('../constants/ZigbeeConstants.js');
const { pushEnergySample } = require('./energy-kpi');
const { readBattery, readEnergy } = require('./battery-reader');

/**
 * Data Collector - Comprehensive data collection & storage
 */

async function registerReportListeners(device, zclNode) {
  device.log('[DATA-COLLECTOR] Registering attribute report listeners...');

  try {
    const endpoint = zclNode?.endpoints?.[1];
    if (!endpoint) {
      device.log('[DATA-COLLECTOR] No endpoint 1 available');
      return;
    }

    // BATTERY REPORTING
    if (endpoint.clusters.genPowerCfg) {
      device.log('[DATA-COLLECTOR] Registering battery listeners...');

      endpoint.clusters.genPowerCfg.on('attr.batteryPercentageRemaining', async (value) => {
        try {
          const percent = Math.round(safeParse(value));
          device.log(`[DATA-COLLECTOR] Battery report: ${percent}%`);

          if (device.hasCapability('measure_battery')) {
            await device.setCapabilityValue('measure_battery', parseFloat(percent)).catch(() => { });
          }
          await device.setStoreValue('last_battery_percent', percent).catch(() => { });
        } catch (err) {
          device.error('[DATA-COLLECTOR] Battery report error:', err.message);
        }
      });

      endpoint.clusters.genPowerCfg.on('attr.batteryVoltage', async (value) => {
        try {
          const voltage = safeDivide(safeParse(value), 10);
          device.log(`[DATA-COLLECTOR] Battery voltage report: ${voltage}V`);

          if (device.hasCapability('measure_voltage')) {
            await device.setCapabilityValue('measure_voltage', parseFloat(voltage)).catch(() => { });
          }
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
    const powerCluster = endpoint.clusters.haElectricalMeasurement || endpoint.clusters.electricalMeasurement;
    if (powerCluster) {
      device.log('[DATA-COLLECTOR] Registering power listeners...');

      powerCluster.on('attr.activePower', async (value) => {
        try {
          const power = safeParse(value);
          if (device.hasCapability('measure_power')) {
            await device.setCapabilityValue('measure_power', parseFloat(power)).catch(() => { });
          }
          await pushEnergySample(device.homey, device.getData().id, { power });
        } catch (err) {
          device.error('[DATA-COLLECTOR] Power report error:', err.message);
        }
      });
    }

    // TEMPERATURE REPORTING
    if (endpoint.clusters.msTemperatureMeasurement) {
      endpoint.clusters.msTemperatureMeasurement.on('attr.measuredValue', async (value) => {
        try {
          const temp = safeDivide(safeParse(value), 100);
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
      endpoint.clusters.msRelativeHumidity.on('attr.measuredValue', async (value) => {
        try {
          const humidity = safeDivide(safeParse(value), 100);
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
      endpoint.clusters.genOnOff.on('attr.onOff', async (value) => {
        try {
          const state = !!value;
          if (device.hasCapability('onoff')) {
            await device.setCapabilityValue('onoff', state).catch(() => { });
          }
        } catch (err) {
          device.error('[DATA-COLLECTOR] OnOff report error:', err.message);
        }
      });
    }

    // TUYA DP REPORTING
    if (device.tuyaEF00Manager || device.isTuyaDevice || device.usesTuyaDP) {
      await registerTuyaDPListeners(device);
    }

  } catch (err) {
    device.error('[DATA-COLLECTOR] Register listeners error:', err.message);
  }
}

async function registerTuyaDPListeners(device) {
  try {
    const manager = device.tuyaEF00Manager;
    if (!manager) return;

    manager.on('dpReport', async ({ dpId, value }) => {
      try {
        await device.setStoreValue(`tuya_dp_${dpId}`, value).catch(() => { });
        await device.setStoreValue('last_tuya_dp_received', Date.now()).catch(() => { });
      } catch (err) {
        device.error('[DATA-COLLECTOR] Tuya DP report error:', err.message);
      }
    });
  } catch (err) {}
}

function startPeriodicPolling(device, zclNode, intervalMs = 300000) {
  const pollData = async () => {
    try {
      const batteryData = await readBattery(device, zclNode);
      if (batteryData.percent !== null && device.hasCapability('measure_battery')) {
        await device.setCapabilityValue('measure_battery', parseFloat(batteryData.percent)).catch(() => { });
      }

      if ((device.getStoreValue('powerSource') || 'unknown') === 'mains') {
        const energyData = await readEnergy(device, zclNode);
        if (energyData.power !== null && device.hasCapability('measure_power')) {
          await device.setCapabilityValue('measure_power', parseFloat(energyData.power)).catch(() => { });
        }
      }
    } catch (err) {}
  };

  pollData();
  return setInterval(pollData, intervalMs);
}

function stopPeriodicPolling(interval) {
  if (interval) clearInterval(interval);
}

function voltageToPercent(voltage) {
  if (!voltage || voltage <= 0) return 0;
  const vMax = 3.0;
  const vMin = 2.0;
  return Math.min(100, Math.max(0, Math.round(safeDivide(voltage - vMin, vMax - vMin) * 100)));
}

module.exports = {
  registerReportListeners,
  registerTuyaDPListeners,
  startPeriodicPolling,
  stopPeriodicPolling
};
