'use strict';
// A8: NaN Safety - use safeDivide/safeMultiply
  require('./CaseInsensitiveMatcher');
const { safeMultiply, safeParse } = require('./tuyaUtils.js');


const { CLUSTERS } = require('../constants/ZigbeeConstants.js');


// v5.2.77: Use centralized Tuya detection
const { isTuyaDpDevice, logTuyaDetection } = require('./tuyaUtils');

/**
 * Cluster Configurator - Configure attribute reporting & bindings
 * Based on: Homey SDK3 docs, athombv apps, JohanBendz apps
 *
 * Configures clusters to automatically report attribute changes:
 * - Battery level reporting
 * - Power / voltage/current reporting
 * - Temperature / humidity reporting
 * - OnOff state reporting
 * - Level control reporting
 *
 * References:
 * - https://apps.developer.homey.app / the-basics / zigbee/pairing
 * - athombv / com.ikea.tradfri
 * - JohanBendz / com.philips.hue.zigbee
 */

/**
 * Configure battery reporting
 * Inspired by: IKEA Tradfri, Philips Hue apps
 *
 * @param {Object} endpoint - ZCL endpoint
 * @param {Object} options - { minInterval, maxInterval, minChange }
 * @returns {Promise<void>}
 */
async function configureBatteryReporting(endpoint, options = {}) {
  const {
    minInterval = 3600,      // 1 hour
    maxInterval = 86400,     // 24 hours
    minChange = 5            // 5% change
  } = options;

  try {
    if (!endpoint.clusters.genPowerCfg) {
      console.log('[CLUSTER-CONFIG] genPowerCfg cluster not available');
      return;
    }

    console.log('[CLUSTER-CONFIG] Configuring battery reporting...');
    console.log(`   minInterval: ${minInterval}s (${minInterval/60}min)`);
    console.log(`   maxInterval: ${maxInterval}s (${maxInterval/3600}h)`);
    console.log(`   minChange: ${minChange}%`);

    // Configure batteryPercentageRemaining (0x0021)
    // Value is 0-200 (0-100% in 0.5% steps)
    try {
      await endpoint.clusters.genPowerCfg.configureReporting({
        attributes: [{
          attributeName: 'batteryPercentageRemaining',
          minimumReportInterval: minInterval,
          maximumReportInterval: maxInterval,
          reportableChange:safeMultiply(minChange, 2)  // Convert % to 0.5% steps
        }]
      });
      console.log('[CLUSTER-CONFIG]  Battery percentage reporting configured');
    } catch (e) {
      console.error('[CLUSTER-CONFIG]   Battery percentage config failed:', e.message);
    }

    // Configure batteryVoltage (0x0020) as fallback
    try {
      await endpoint.clusters.genPowerCfg.configureReporting({
        attributes: [{
          attributeName: 'batteryVoltage',
          minimumReportInterval: minInterval,
          maximumReportInterval: maxInterval,
          reportableChange: 1  // 0.1V change
        }]
      });
      console.log('[CLUSTER-CONFIG]  Battery voltage reporting configured');
    } catch (e) {
      console.error('[CLUSTER-CONFIG]   Battery voltage config failed:', e.message);
    }

  } catch (err) {
    console.error('[CLUSTER-CONFIG]  Battery reporting config error:', err.message);
  }
}

/**
 * Configure power / energy reporting
 * Inspired by: Smart plug apps (Innr, IKEA, Philips)
 *
 * @param {Object} endpoint - ZCL endpoint
 * @param {Object} options - { minInterval, maxInterval, minChange }
 * @returns {Promise<void>}
 */
async function configurePowerReporting(endpoint, options = {}) {
  const {
    minInterval = 10,        // 10 seconds
    maxInterval = 300,       // 5 minutes
    minChangePower = 5,      // 5W change
    minChangeVoltage = 5,    // 5V change
    minChangeCurrent = 100   // 100mA change
  } = options;

  try {
    console.log('[CLUSTER-CONFIG] Configuring power reporting...');

    // haElectricalMeasurement cluster
    if (endpoint.clusters.haElectricalMeasurement) {
      console.log('[CLUSTER-CONFIG] Configuring haElectricalMeasurement...');

      // Active power (0x050B)
      try {
        await endpoint.clusters.haElectricalMeasurement.configureReporting({
          attributes: [{
            attributeName: 'activePower',
            minimumReportInterval: minInterval,
            maximumReportInterval: maxInterval,
            reportableChange: minChangePower
          }]
        });
        console.log('[CLUSTER-CONFIG]  Active power reporting configured');
      } catch (e) {
        console.error('[CLUSTER-CONFIG]   Active power config failed:', e.message);
      }

      // RMS voltage (0x0505)
      try {
        await endpoint.clusters.haElectricalMeasurement.configureReporting({
          attributes: [{
            attributeName: 'rmsvoltage',
            minimumReportInterval: minInterval,
            maximumReportInterval: maxInterval,
            reportableChange: minChangeVoltage
          }]
        });
        console.log('[CLUSTER-CONFIG]  RMS voltage reporting configured');
      } catch (e) {
        console.error('[CLUSTER-CONFIG]   RMS voltage config failed:', e.message);
      }

      // RMS current (0x0508)
      try {
        await endpoint.clusters.haElectricalMeasurement.configureReporting({
          attributes: [{
            attributeName: 'rmscurrent',
            minimumReportInterval: minInterval,
            maximumReportInterval: maxInterval,
            reportableChange: minChangeCurrent
          }]
        });
        console.log('[CLUSTER-CONFIG]  RMS current reporting configured');
      } catch (e) {
        console.error('[CLUSTER-CONFIG]   RMS current config failed:', e.message);
      }
    }

    // seMetering cluster (alternative for some devices)
    if (endpoint.clusters.seMetering) {
      console.log('[CLUSTER-CONFIG] Configuring seMetering...');

      try {
        await endpoint.clusters.seMetering.configureReporting({
          attributes: [{
            attributeName: 'instantaneousDemand',
            minimumReportInterval: minInterval,
            maximumReportInterval: maxInterval,
            reportableChange: minChangePower
          }]
        });
        console.log('[CLUSTER-CONFIG]  Instantaneous demand reporting configured');
      } catch (e) {
        console.error('[CLUSTER-CONFIG]   Instantaneous demand config failed:', e.message);
      }
    }

  } catch (err) {
    console.error('[CLUSTER-CONFIG]  Power reporting config error:', err.message);
  }
}

/**
 * Configure temperature / humidity reporting
 * Inspired by: Aqara, Xiaomi, Tuya sensor apps
 *
 * @param {Object} endpoint - ZCL endpoint
 * @param {Object} options - { minInterval, maxInterval, minChange }
 * @returns {Promise<void>}
 */
async function configureClimateReporting(endpoint, options = {}) {
  const {
    minInterval = 60,        // 1 minute
    maxInterval = 3600,      // 1 hour
    minChangeTemp = 50,      // 0.5Â°C (value is in 0.01Â°C)
    minChangeHumidity = 100  // 1% (value is in 0.01%)
  } = options;

  try {
    console.log('[CLUSTER-CONFIG] Configuring climate reporting...');

    // Temperature reporting
    if (endpoint.clusters.msTemperatureMeasurement) {
      console.log('[CLUSTER-CONFIG] Configuring temperature reporting...');

      try {
        await endpoint.clusters.msTemperatureMeasurement.configureReporting({
          attributes: [{
            attributeName: 'measuredValue',
            minimumReportInterval: minInterval,
            maximumReportInterval: maxInterval,
            reportableChange: minChangeTemp
          }]
        });
        console.log('[CLUSTER-CONFIG]  Temperature reporting configured');
      } catch (e) {
        console.error('[CLUSTER-CONFIG]   Temperature config failed:', e.message);
      }
    }

    // Humidity reporting
    if (endpoint.clusters.msRelativeHumidity) {
      console.log('[CLUSTER-CONFIG] Configuring humidity reporting...');

      try {
        await endpoint.clusters.msRelativeHumidity.configureReporting({
          attributes: [{
            attributeName: 'measuredValue',
            minimumReportInterval: minInterval,
            maximumReportInterval: maxInterval,
            reportableChange: minChangeHumidity
          }]
        });
        console.log('[CLUSTER-CONFIG]  Humidity reporting configured');
      } catch (e) {
        console.error('[CLUSTER-CONFIG]   Humidity config failed:', e.message);
      }
    }

  } catch (err) {
    console.error('[CLUSTER-CONFIG]  Climate reporting config error:', err.message);
  }
}

/**
 * Configure OnOff reporting
 * Inspired by: All switch / outlet apps
 *
 * @param {Object} endpoint - ZCL endpoint
 * @param {Object} options - { minInterval, maxInterval }
 * @returns {Promise<void>}
 */
async function configureOnOffReporting(endpoint, options = {}) {
  const {
    minInterval = 1,      // 1 second (immediate)
    maxInterval = 3600    // 1 hour
  } = options;

  try {
    if (!endpoint.clusters.genOnOff) {
      console.log('[CLUSTER-CONFIG] genOnOff cluster not available');
      return;
    }

    console.log('[CLUSTER-CONFIG] Configuring OnOff reporting...');

    await endpoint.clusters.genOnOff.configureReporting({
      attributes: [{
        attributeName: 'onOff',
        minimumReportInterval: minInterval,
        maximumReportInterval: maxInterval
        // No reportableChange for boolean
      }]
    });

    console.log('[CLUSTER-CONFIG]  OnOff reporting configured');

  } catch (err) {
    console.error('[CLUSTER-CONFIG]  OnOff reporting config error:', err.message);
  }
}

/**
 * Configure level control reporting (dimmers, blinds)
 * Inspired by: IKEA bulbs, Philips Hue
 *
 * @param {Object} endpoint - ZCL endpoint
 * @param {Object} options - { minInterval, maxInterval, minChange }
 * @returns {Promise<void>}
 */
async function configureLevelReporting(endpoint, options = {}) {
  const {
    minInterval = 1,       // 1 second
    maxInterval = 3600,    // 1 hour
    minChange = 5          // 5 units (out of 254)
  } = options;

  try {
    if (!endpoint.clusters.genLevelCtrl) {
      console.log('[CLUSTER-CONFIG] genLevelCtrl cluster not available');
      return;
    }

    console.log('[CLUSTER-CONFIG] Configuring level control reporting...');

    await endpoint.clusters.genLevelCtrl.configureReporting({
      attributes: [{
        attributeName: 'currentLevel',
        minimumReportInterval: minInterval,
        maximumReportInterval: maxInterval,
        reportableChange: minChange
      }]
    });

    console.log('[CLUSTER-CONFIG]  Level control reporting configured');

  } catch (err) {
    console.error('[CLUSTER-CONFIG]  Level control reporting config error:', err.message);
  }
}

/**
 * Auto-configure all relevant reporting for a device
 * CRITICAL: Based on CAPABILITIES, not cluster detection
 * This ensures we configure reporting for what the device SHOULD do,
 * not what clusters we randomly detect
 *
 * @param {Object} device - Homey device
 * @param {Object} zclNode - ZCL node
 * @returns {Promise<Object>} - { battery, power, climate, onoff, level }
 */
async function autoConfigureReporting(device, zclNode) {
  device.log('[CLUSTER-CONFIG]  Auto-configuring based on device capabilities...');

  const results = {
    battery: false,
    power: false,
    climate: false,
    onoff: false,
    level: false
  };

  try {
    // Get first endpoint with clusters
    const endpoint = zclNode?.endpoints?.[1] || zclNode?.endpoints?.[Object.keys(zclNode?.endpoints || {})[0]];
    if (!endpoint) {
      device.log('[CLUSTER-CONFIG]   No endpoint found - skipping');
      return results;
    }

    // v5.2.77: CRITICAL FIX - Use centralized Tuya detection
    // Previous code had inconsistent detection causing:
    // - [isTuyaDP]   Standard Zigbee
    // - [BATTERY-READER] Tuya DP device
    const isTuyaDP = isTuyaDpDevice(device);
    const modelId = device.getSetting?.('zb_model_id') || device.getData?.()?.modelId || '';

    if (isTuyaDP) {
      logTuyaDetection(device, device.log.bind(device));
      device.log('[CLUSTER-CONFIG]  Tuya DP device - capabilities will be fed by DP events, not ZCL clusters');
    }

    // CRITICAL FIX v5.0.4: Detect button / remote/wireless switches
    // These devices SEND commands but DON'T RECEIVE state updates
    // Attempting to configure attribute reporting causes timeouts and breaks flows!
    const driverName = device.driver?.manifest?.id || device.constructor.name || '';
    const isButtonDevice = driverName.includes('wireless')
      || driverName.includes('button')
      || driverName.includes('remote')
      || driverName.includes('scene_switch')
      || driverName.includes('dimmer_switch')
      || modelId.startsWith('TS004') // 1-4 gang wireless
      || modelId.startsWith('TS003') // 3 gang wireless
      || modelId.startsWith('TS002') // 2 gang wireless
      || modelId.startsWith('TS001') // 1 gang wireless
      || CI.equalsCI(modelId, 'TS0044') // 4 button wireless
      || CI.equalsCI(modelId, 'TS0043') // 3 button wireless
      || CI.equalsCI(modelId, 'TS0042') // 2 button wireless
      || CI.equalsCI(modelId, 'TS0041'); // 1 button wireless

    if (isButtonDevice) {
      device.log('[CLUSTER-CONFIG]   Button/Remote device detected');
      device.log('[CLUSTER-CONFIG]   Will SKIP onOff/level reporting (buttons send commands, not receive)');
    }

    // Detect what the device wants based on capabilities
    const wantsBattery = device.hasCapability('measure_battery');
    const wantsPower = device.hasCapability('measure_power') || device.hasCapability('meter_power');
    const wantsClimate = device.hasCapability('measure_temperature')
      || device.hasCapability('measure_humidity')
      || device.hasCapability('measure_humidity.soil');
    const wantsOnOff = device.hasCapability('onoff')
      || device.hasCapability('onoff.l1')
      || device.hasCapability('onoff.l2')
      || device.hasCapability('onoff.l3');
    const wantsLevel = device.hasCapability('dim') || device.hasCapability('windowcoverings_set');

    device.log('[CLUSTER-CONFIG]  Capabilities detected:');
    device.log(`   battery: ${wantsBattery}`);
    device.log(`   power: ${wantsPower}`);
    device.log(`   climate: ${wantsClimate}`);
    device.log(`   onoff: ${wantsOnOff}`);
    device.log(`   level: ${wantsLevel}`);

    // Battery devices - mark as battery if capability exists
    if (wantsBattery) {
      results.battery = true; //  ALWAYS mark true if capability exists

      if (endpoint.clusters.genPowerCfg) {
        device.log('[CLUSTER-CONFIG]   Configuring battery reporting (capability + cluster present)...');
        await configureBatteryReporting(endpoint);
      } else {
        device.log('[CLUSTER-CONFIG]   Battery capability but no genPowerCfg cluster (Tuya DP or wireless button)');
        device.log('[CLUSTER-CONFIG]   Battery updates via DP events or new_device_assumption');
      }
    }

    // Power monitoring devices
    if (wantsPower) {
      if (endpoint.clusters.haElectricalMeasurement || endpoint.clusters.seMetering) {
        device.log('[CLUSTER-CONFIG]   Configuring power reporting (ZCL clusters)...');
        await configurePowerReporting(endpoint);
        results.power = true;
      } else if (isTuyaDP) {
        // Tuya DP devices use CLUSTERS.TUYA_EF00 for power data
        device.log('[CLUSTER-CONFIG]   Power via Tuya DP (no ZCL power clusters)');
        device.log('[CLUSTER-CONFIG]   Power updates via DP events');
        results.power = true; //  MARK TRUE - data comes via Tuya DP events
      }
    }

    // Climate sensors
    if (wantsClimate) {
      if (endpoint.clusters.msTemperatureMeasurement || endpoint.clusters.msRelativeHumidity) {
        device.log('[CLUSTER-CONFIG]   Configuring climate reporting (ZCL clusters)...');
        await configureClimateReporting(endpoint);
        results.climate = true;
      } else if (isTuyaDP) {
        // Tuya DP devices use CLUSTERS.TUYA_EF00 for climate data, not standard ZCL clusters
        device.log('[CLUSTER-CONFIG]   Climate via Tuya DP (no ZCL climate clusters)');
        device.log('[CLUSTER-CONFIG]   Climate updates via DP events (temp/humidity DPs)');
        results.climate = true; //  MARK TRUE - data comes via Tuya DP events
      } else {
        device.log('[CLUSTER-CONFIG]   Climate capability but no cluster available');
      }
    }

    // Switches / outlets
    if (wantsOnOff && endpoint.clusters.genOnOff && !isButtonDevice) {
      device.log('[CLUSTER-CONFIG]   Configuring onOff reporting...');
      await configureOnOffReporting(endpoint);
      results.onoff = true;
    } else if (isButtonDevice && endpoint.clusters.genOnOff) {
      device.log('[CLUSTER-CONFIG]   Skipping onOff reporting (button device - sends commands only)');
    }

    // Dimmers / blinds
    if (wantsLevel && endpoint.clusters.genLevelCtrl && !isButtonDevice) {
      device.log('[CLUSTER-CONFIG]   Configuring level reporting...');
      await configureLevelReporting(endpoint);
      results.level = true;
    } else if (isButtonDevice && endpoint.clusters.genLevelCtrl) {
      device.log('[CLUSTER-CONFIG]   Skipping level reporting (button device - sends commands only)');
    }

    device.log('[CLUSTER-CONFIG]  Auto-configuration complete:', results);

  } catch (err) {
    device.error('[CLUSTER-CONFIG]  Auto-configuration error:', err.message);
  }

  return results;
}

module.exports = {
  configureBatteryReporting,
  configurePowerReporting,
  configureClimateReporting,
  configureOnOffReporting,
  configureLevelReporting,
  autoConfigureReporting
};



