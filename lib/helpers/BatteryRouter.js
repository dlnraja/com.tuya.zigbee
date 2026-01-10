'use strict';

/**
 * BATTERY ROUTER - Smart Battery Source Selection
 *
 * Determines the best battery reporting method for each device:
 * 1. ZCL genPowerCfg cluster (0x0001) - Standard Zigbee
 * 2. Tuya DP (4, 10, 14, 15, 101, 105) - Tuya proprietary
 * 3. Voltage DP (247) - USB/Mains devices with voltage monitoring
 *
 * Based on JohanBendz/com.tuya.zigbee analysis
 * Source: https://github.com/JohanBendz/com.tuya.zigbee
 *
 * v5.3.30 - Initial implementation
 */

const { CLUSTER } = require('zigbee-clusters');

// Battery-related DPs from Tuya devices
const TUYA_BATTERY_DPS = [4, 10, 14, 15, 101, 105];
const TUYA_VOLTAGE_DP = 247;

/**
 * Battery source types
 */
const BatterySource = {
  ZCL: 'zcl',           // Standard Zigbee genPowerCfg cluster
  TUYA_DP: 'tuya_dp',   // Tuya proprietary Data Points
  VOLTAGE: 'voltage',   // Voltage-based (USB/mains devices)
  NONE: 'none',         // No battery (mains-powered)
  UNKNOWN: 'unknown'    // Not yet determined
};

/**
 * Resolve the best battery source for a device
 *
 * @param {ZigBeeDevice} device - Homey ZigBee device instance
 * @returns {Promise<{source: string, method: string, dps?: number[]}>}
 */
async function resolveBatterySource(device) {
  const result = {
    source: BatterySource.UNKNOWN,
    method: 'none',
    dps: [],
    hasCapability: device.hasCapability('measure_battery')
  };

  if (!result.hasCapability) {
    device.log('[BATTERY-ROUTER] No measure_battery capability, skipping');
    result.source = BatterySource.NONE;
    return result;
  }

  const zclNode = device.zclNode;
  if (!zclNode) {
    device.log('[BATTERY-ROUTER] No zclNode available');
    return result;
  }

  // Check for standard ZCL genPowerCfg cluster
  const endpoint = zclNode.endpoints?.[1];
  const hasPowerCfg = !!(endpoint?.clusters?.genPowerCfg || endpoint?.clusters?.powerConfiguration);

  // Check for Tuya EF00 cluster
  const hasTuyaCluster = !!(
    endpoint?.clusters?.tuya ||
    endpoint?.clusters?.tuyaSpecific ||
    endpoint?.clusters?.manuSpecificTuya ||
    endpoint?.clusters?.[61184] ||
    endpoint?.clusters?.[0xEF00]
  );

  // Get device info
  const settings = device.getSettings?.() || {};
  const store = device.getStore?.() || {};
  const modelId = settings.zb_modelId || store.modelId || '';
  const manufacturer = settings.zb_manufacturerName || store.manufacturerName || '';

  // Detect if this is a Tuya DP device
  const isTuyaDP = modelId === 'TS0601' || manufacturer.startsWith('_TZE');

  device.log(`[BATTERY-ROUTER] Analysis: ZCL=${hasPowerCfg}, Tuya=${hasTuyaCluster}, isTuyaDP=${isTuyaDP}`);
  device.log(`[BATTERY-ROUTER] Device: ${manufacturer} / ${modelId}`);

  // Decision logic
  if (isTuyaDP) {
    // Tuya DP devices don't have standard ZCL clusters
    result.source = BatterySource.TUYA_DP;
    result.method = 'tuya_dp_listener';
    result.dps = TUYA_BATTERY_DPS;
    device.log('[BATTERY-ROUTER] ✅ Selected: Tuya DP battery (passive listening)');
  } else if (hasPowerCfg) {
    // Standard ZCL device with genPowerCfg
    result.source = BatterySource.ZCL;
    result.method = 'zcl_attribute_reporting';
    device.log('[BATTERY-ROUTER] ✅ Selected: ZCL genPowerCfg cluster');
  } else if (hasTuyaCluster) {
    // Has Tuya cluster but not TS0601 - try both
    result.source = BatterySource.TUYA_DP;
    result.method = 'tuya_dp_listener';
    result.dps = TUYA_BATTERY_DPS;
    device.log('[BATTERY-ROUTER] ✅ Selected: Tuya cluster (hybrid)');
  } else {
    // No known battery source - might be mains powered
    result.source = BatterySource.NONE;
    result.method = 'none';
    device.log('[BATTERY-ROUTER] ⚡ No battery cluster detected - likely mains powered');
  }

  // Always check for voltage capability (USB devices)
  if (device.hasCapability('measure_voltage')) {
    result.voltageDP = TUYA_VOLTAGE_DP;
    device.log('[BATTERY-ROUTER] ⚡ Voltage capability present (DP 247)');
  }

  return result;
}

/**
 * Configure battery reporting based on resolved source
 *
 * @param {ZigBeeDevice} device - Homey ZigBee device instance
 * @param {Object} batteryInfo - Result from resolveBatterySource
 */
async function configureBatteryReporting(device, batteryInfo) {
  device.log(`[BATTERY-ROUTER] Configuring ${batteryInfo.source} reporting...`);

  // Set default value immediately to avoid null KPI
  const currentBattery = device.getCapabilityValue?.('measure_battery');
  if (currentBattery === null || currentBattery === undefined) {
    await device.setCapabilityValue('measure_battery', 100).catch(() => { });
    device.log('[BATTERY-ROUTER] 📊 Set default battery = 100% (pending first report)');
  }

  switch (batteryInfo.source) {
  case BatterySource.ZCL:
    await _configureZCLBattery(device);
    break;

  case BatterySource.TUYA_DP:
    await _configureTuyaDPBattery(device, batteryInfo.dps);
    break;

  case BatterySource.VOLTAGE:
    await _configureVoltageBattery(device);
    break;

  case BatterySource.NONE:
    device.log('[BATTERY-ROUTER] ⚡ Mains powered - no battery reporting needed');
    // Optionally remove battery capability for mains devices
    break;

  default:
    device.log('[BATTERY-ROUTER] ⚠️ Unknown battery source');
  }
}

/**
 * Configure standard ZCL battery reporting
 */
async function _configureZCLBattery(device) {
  device.log('[BATTERY-ROUTER] Configuring ZCL battery reporting...');

  try {
    // Try to configure attribute reporting
    await device.configureAttributeReporting([{
      endpointId: 1,
      cluster: 'genPowerCfg',
      attributeName: 'batteryPercentageRemaining',
      minInterval: 600,      // 10 minutes minimum
      maxInterval: 43200,    // 12 hours maximum
      minChange: 2           // Report on 2% change
    }]);
    device.log('[BATTERY-ROUTER] ✅ ZCL battery reporting configured');
  } catch (err) {
    // This is common for sleepy devices
    device.log('[BATTERY-ROUTER] ℹ️ configureReporting failed (normal for battery devices):', err.message);
    device.log('[BATTERY-ROUTER] Will rely on device-initiated reports');
  }

  // Also register capability for attribute reports
  try {
    device.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
      get: 'batteryPercentageRemaining',
      getOpts: {
        getOnStart: true,
        pollInterval: 3600000 // Poll every hour as fallback
      },
      report: 'batteryPercentageRemaining',
      reportParser: (value) => {
        // ZCL reports 0-200 (half percentage), convert to 0-100
        return Math.round(value / 2);
      }
    });
    device.log('[BATTERY-ROUTER] ✅ ZCL battery capability registered');
  } catch (err) {
    device.log('[BATTERY-ROUTER] ℹ️ registerCapability error:', err.message);
  }
}

/**
 * Configure Tuya DP battery listening
 */
async function _configureTuyaDPBattery(device, dps) {
  device.log(`[BATTERY-ROUTER] Configuring Tuya DP battery (DPs: ${dps.join(', ')})...`);

  // Listen for battery DPs via TuyaEF00Manager
  if (device.tuyaEF00Manager) {
    for (const dp of dps) {
      device.tuyaEF00Manager.on(`dp-${dp}`, async (value) => {
        const batteryValue = Math.min(100, Math.max(0, Number(value) || 0));
        device.log(`[BATTERY-ROUTER] 🔋 Tuya DP${dp} battery: ${batteryValue}%`);
        await device.setCapabilityValue('measure_battery', parseFloat(batteryValue)).catch(() => { });
      });
    }
    device.log('[BATTERY-ROUTER] ✅ Tuya DP battery listeners registered');
  }

  // Also listen for generic dpReport event
  device.on('tuya_dp_battery', async (value) => {
    const batteryValue = Math.min(100, Math.max(0, Number(value) || 0));
    device.log(`[BATTERY-ROUTER] 🔋 tuya_dp_battery event: ${batteryValue}%`);
    await device.setCapabilityValue('measure_battery', parseFloat(batteryValue)).catch(() => { });
  });
}

/**
 * Configure voltage-based battery reporting
 */
async function _configureVoltageBattery(device) {
  device.log('[BATTERY-ROUTER] Configuring voltage-based battery...');

  // Listen for DP 247 voltage reports
  if (device.tuyaEF00Manager) {
    device.tuyaEF00Manager.on(`dp-${TUYA_VOLTAGE_DP}`, async (value) => {
      // Convert mV to V
      const voltage = Number(value) / 1000;
      device.log(`[BATTERY-ROUTER] ⚡ Voltage DP247: ${voltage}V`);

      if (device.hasCapability('measure_voltage')) {
        await device.setCapabilityValue('measure_voltage', parseFloat(voltage)).catch(() => { });
      }
    });
  }
}

/**
 * Get recommended battery type based on device characteristics
 */
function getRecommendedBatteryType(device) {
  const settings = device.getSettings?.() || {};
  const modelId = settings.zb_modelId || '';
  const driverName = device.driver?.id || '';

  // Common patterns from device database
  const batteryPatterns = {
    'CR2032': ['contact', 'button', 'remote', 'sensor_small'],
    'CR2450': ['motion', 'pir', 'presence'],
    'AAA': ['climate', 'temp_hum', 'weather'],
    'AA': ['siren', 'keypad', 'lock'],
    'CR123A': ['smoke', 'co', 'gas']
  };

  for (const [type, patterns] of Object.entries(batteryPatterns)) {
    if (patterns.some(p => driverName.includes(p) || modelId.toLowerCase().includes(p))) {
      return type;
    }
  }

  return 'CR2032'; // Safe default
}

module.exports = {
  BatterySource,
  resolveBatterySource,
  configureBatteryReporting,
  getRecommendedBatteryType,
  TUYA_BATTERY_DPS,
  TUYA_VOLTAGE_DP
};
