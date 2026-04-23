// A8: NaN Safety - use safeDivide/safeMultiplyconst CI = require('../utils/CaseInsensitiveMatcher');
/**
 * TS0601 EMERGENCY FIX
 *
 * Force TuyaEF00Manager initialization for specific TS0601 sensors
 * that are not reporting data.
 *
 * Affected devices:
 * - Climate Monitor (_TZE284_vvmbj46n)
 * - Presence Radar (_TZE200_rhgsbacq)
 * - Soil Tester (_TZE284_oitavov2)
 */

'use strict';
const { safeParse } = require('../utils/tuyaUtils.js');


const { CLUSTERS } = require('../constants/ZigbeeConstants.js');


const { getModelId, getManufacturer, isTuyaDPDevice } = require('../helpers/DeviceDataHelper');

// Known TS0601 manufacturers that need special handling
const TS0601_MANUFACTURERS = [
  '_TZE284_vvmbj46n',  // Climate Monitor
  '_TZE200_rhgsbacq',  // Presence Radar
  '_TZE284_oitavov2',  // Soil Tester
  '_TZE200_3towulqd',  // ZG-204ZV Multi-sensor
  '_TZE200_ppuj1vem',  // ZG-204ZL PIR
  '_TZE200_7hfcudw5',  // ZG-204ZM mmWave
  '_TZE204_mvtclclq',  // BSEED USB Outlet
  '_TZE200_ikvncluo',  // mmWave Radar Motion
  '_TZE204_sxm7l9xa',  // mmWave Presence Advanced
  '_TZE200_9yapgbuv',  // ZTH01 Climate Sensor
  '_TZE200_',          // All TZE200 variants
  '_TZE284_',          // All TZE284 variants
  '_TZE204_',          // All TZE204 variants
];

// DP mappings for these specific devices
const DEVICE_DP_MAPPINGS = {
  // Climate Monitor (_TZE284_vvmbj46n)
  '_TZE284_vvmbj46n': {
    1: { capability: 'measure_temperature', parser: (v) => safeParse(v, 10) },
    2: { capability: 'measure_humidity', parser: (v) => safeParse(v, 10) },
    15: { capability: 'measure_battery', parser: (v) => v },
  },

  // Presence Radar (_TZE200_rhgsbacq)
  '_TZE200_rhgsbacq': {
    1: { capability: 'alarm_motion', parser: (v) => Boolean(v) },
    9: { capability: 'target_distance', parser: (v) => safeParse(v, 100) },
    101: { capability: 'radar_sensitivity', parser: (v) => v },
    102: { capability: 'illuminance_threshold', parser: (v) => v },
    15: { capability: 'measure_battery', parser: (v) => v },
  },

  // Soil Tester (_TZE284_oitavov2)
  '_TZE284_oitavov2': {
    1: { capability: 'measure_temperature', parser: (v) => safeParse(v, 10) },
    2: { capability: 'measure_humidity', parser: (v) => safeParse(v, 10) },
    3: { capability: 'measure_temperature.soil', parser: (v) => safeParse(v, 10) },
    5: { capability: 'measure_humidity.soil', parser: (v) => v },
    15: { capability: 'measure_battery', parser: (v) => v },
  },

  // ZG-204ZV Multi-sensor (_TZE200_3towulqd)
  '_TZE200_3towulqd': {
    1: { capability: 'alarm_motion', parser: (v) => Boolean(v) },
    3: { capability: 'measure_temperature', parser: (v) => safeParse(v, 10) },
    4: { capability: 'measure_humidity', parser: (v) => v },
    9: { capability: 'measure_luminance', parser: (v) => v },
    15: { capability: 'measure_battery', parser: (v) => v },
  },

  // ZTH01 Climate Sensor (_TZE200_9yapgbuv)
  '_TZE200_9yapgbuv': {
    1: { capability: 'measure_temperature', parser: (v) => safeParse(v, 10) },
    2: { capability: 'measure_humidity', parser: (v) => safeParse(v, 10) },
    4: { capability: 'measure_battery', parser: (v) => v },
  },

  // BSEED USB Outlet (_TZE204_mvtclclq)
  '_TZE204_mvtclclq': {
    1: { capability: 'onoff', parser: (v) => Boolean(v) },
    2: { capability: 'onoff.gang2', parser: (v) => Boolean(v) },
    3: { capability: 'onoff.usb', parser: (v) => Boolean(v) },
  },
};

/**
 * Emergency fix for TS0601 sensors
 * Call this in BaseUnifiedDevice.onNodeInit() BEFORE TuyaEF00Manager.initialize()
 */
async function applyTS0601EmergencyFix(device, zclNode) {
  try {
    // Use unified helper for consistent data access
    const modelId = getModelId(device);
    const manufacturer = getManufacturer(device);

    device.log(' [TS0601 FIX] Checking if emergency fix needed...');
    device.log(`   Model: ${modelId}`);
    device.log(`   Manufacturer: ${manufacturer}`);

    // Check if this is a TS0601 that needs fixing
    if (!CI.equalsCI(modelId, 'TS0601')) {
      device.log('     Not a TS0601 - fix not needed');
      return false;
    }

    const needsFix = CI.startsWithCI(manufacturer, TS0601_MANUFACTURERS);
    if (!needsFix) {
      device.log('     Manufacturer not in fix list - fix not needed');
      return false;
    }

    device.log('    EMERGENCY FIX ACTIVATED!');

    // Force detect cluster CLUSTERS.TUYA_EF00
    const endpoint = zclNode?.endpoints?.[1];
    if (!endpoint) {
      device.log('    No endpoint 1 found!');
      return false;
    }

    device.log('    Searching for Tuya cluster...');

    // Try all possible cluster names
    const tuyaCluster = endpoint.clusters?.[CLUSTERS.TUYA_EF00]
      || endpoint.clusters?.tuyaManufacturer
      || endpoint.clusters?.tuyaSpecific
      || endpoint.clusters?.manuSpecificTuya;

    if (!tuyaCluster) {
      device.log('    Tuya cluster CLUSTERS.TUYA_EF00 NOT FOUND!');
      device.log('   Available clusters:', Object.keys(endpoint.clusters || {}));
      return false;
    }

    device.log('    Tuya cluster CLUSTERS.TUYA_EF00 FOUND!');

    // Get device-specific DP mappings
    const dpMappings = DEVICE_DP_MAPPINGS[manufacturer] || {};
    const dpList = Object.keys(dpMappings);

    device.log(`    DP mappings for this device: ${dpList.join(', ')}`);

    // Setup emergency listener
    device.log('    Setting up EMERGENCY dataReport listener...');

    let receivedDataReports = 0;

    tuyaCluster.on('dataReport', async (data) => {
      receivedDataReports++;
      device.log(`    [EMERGENCY] dataReport #${receivedDataReports} received:`, JSON.stringify(data));

      const dp = data.dpId || data.dp;
      const value = data.dpValue || data.data;

      const mapping = dpMappings[dp];
      if (mapping) {
        const { capability, parser } = mapping;
        const parsedValue = parser(value);

        device.log(`    [EMERGENCY] DP ${dp}  ${capability} = ${parsedValue}`);

        // Add capability if missing
        if (!device.hasCapability(capability)) {
          device.log(`    Adding missing capability: ${capability}`);
          try {
            await device.addCapability(capability);
          } catch (err) {
            device.log(`     Could not add ${capability}: ${err.message}`);
          }
        }

        // Set value
        try {
          await device.setCapabilityValue(capability, parsedValue);
          device.log('    [EMERGENCY] Value set successfully!');
        } catch (err) {
          device.error(`    Failed to set ${capability}:`, err.message);
        }
      } else {
        device.log(`     [EMERGENCY] Unknown DP ${dp}, value: ${JSON.stringify(value)}`);
      }
    });

    device.log('    Emergency listener configured!');

    // Request critical DPs immediately
    device.log('    Requesting critical DPs...');

    for (const dp of dpList) {
      try {
        device.log(`    Requesting DP ${dp}...`);

        await tuyaCluster.sendCommand('dataRequest', {
          dp: parseInt(dp),
          fn: 0,
          data: Buffer.from([])
        }, {
          expectResponse: true,
          disableDefaultResponse: true,
          timeout: 5000
        });

        device.log(`    DP ${dp} request sent`);

        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (err) {
        device.log(`     DP ${dp} request failed: ${err.message}`);
      }
    }

    device.log('    All DP requests sent!');
    device.log('    Waiting for dataReport responses...');

    // Wait 5 seconds to see if we get any dataReports
    await new Promise(resolve => setTimeout(resolve, 5000));

    if (receivedDataReports > 0) {
      device.log(`    SUCCESS! Received ${receivedDataReports} dataReports!`);
    } else {
      device.log('     WARNING: No dataReports received yet. Device may need time to respond.');
    }

    return true;

  } catch (err) {
    device.error(' [TS0601 FIX] FAILED:', err.message);
    return false;
  }
}

module.exports = {
  applyTS0601EmergencyFix,
  TS0601_MANUFACTURERS,
  DEVICE_DP_MAPPINGS
};


