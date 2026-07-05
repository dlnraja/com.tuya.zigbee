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
let UnifiedBatteryHandler;
try {
  UnifiedBatteryHandler = require('../battery/UnifiedBatteryHandler');
} catch (_e) {
  UnifiedBatteryHandler = null;
}

// Battery-related DPs from Tuya devices
const TUYA_BATTERY_DPS = UnifiedBatteryHandler
  ? UnifiedBatteryHandler.getTuyaBatteryDPs({ includeProfileOnly: true })
  : [3, 4, 10, 14, 15, 21, 100, 101, 102, 104, 105, 121];
const TUYA_VOLTAGE_DPS = UnifiedBatteryHandler
  ? UnifiedBatteryHandler.getTuyaVoltageDPs()
  : [33, 35, 247];
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
    endpointId: 1,
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
  const powerEndpoint = _findEndpointByCluster(zclNode, ['genPowerCfg', 'powerConfiguration', 0x0001, '0x0001']);
  const tuyaEndpoint = _findEndpointByCluster(zclNode, ['tuya', 'tuyaSpecific', 'manuSpecificTuya', 61184, 0xEF00, '0xEF00']);
  const hasPowerCfg = !!powerEndpoint?.cluster;

  // Check for Tuya EF00 cluster
  const hasTuyaCluster = !!tuyaEndpoint?.cluster;

  // Get device info
  const settings = device.getSettings?.() || {};
  const store = device.getStore?.() || {};
  const modelId = settings.zb_model_id || settings.zb_modelId || store.modelId || '';
  const manufacturer = settings.zb_manufacturer_name || settings.zb_manufacturerName || store.manufacturerName || '';

  // Detect if this is a Tuya DP device
  const isTuyaDP = modelId.toUpperCase() === 'TS0601' || manufacturer.toUpperCase().startsWith('_TZE');

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
    result.endpointId = powerEndpoint?.endpointId || 1;
    device.log('[BATTERY-ROUTER] ✅ Selected: ZCL genPowerCfg cluster');
  } else if (hasTuyaCluster) {
    // Has Tuya cluster but not TS0601 - try both
    result.source = BatterySource.TUYA_DP;
    result.method = 'tuya_dp_listener';
    result.dps = TUYA_BATTERY_DPS;
    result.endpointId = tuyaEndpoint?.endpointId || 1;
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
    result.voltageDPs = TUYA_VOLTAGE_DPS;
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

  // Set a marked estimate only for devices with a plausible battery source.
  // Old versions wrote 100%, which hid real "unknown" battery bugs for sleepy devices.
  const currentBattery = device.getCapabilityValue?.('measure_battery');
  if (batteryInfo.source !== BatterySource.NONE && (currentBattery === null || currentBattery === undefined)) {
    await _setBatteryValue(device, 50, 'battery-router-estimated-default', true);
    device.log('[BATTERY-ROUTER] 📊 Set default battery = 50% estimate (pending first report)');
  }

  switch (batteryInfo.source) {
  case BatterySource.ZCL:
    await _configureZCLBattery(device, batteryInfo.endpointId || 1);
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
async function _configureZCLBattery(device, endpointId = 1) {
  device.log('[BATTERY-ROUTER] Configuring ZCL battery reporting...');

  try {
    // Try to configure attribute reporting
    await device.configureAttributeReporting([{
      endpointId,
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
        const percent = UnifiedBatteryHandler
          ? UnifiedBatteryHandler.normalizeZigbeeValue(value)
          : _normalizeBatteryValue(value > 100 ? value / 2 : value);
        return percent ?? device.getCapabilityValue?.('measure_battery') ?? 50;
      }
    });
    device.log('[BATTERY-ROUTER] ✅ ZCL battery capability registered');
  } catch (err) {
    device.log('[BATTERY-ROUTER] ℹ️ registerCapability error:', err.message);
  }
}

function _findEndpointByCluster(zclNode, clusterKeys) {
  const keys = Array.isArray(clusterKeys) ? clusterKeys : [clusterKeys];
  const endpoints = zclNode?.endpoints || {};
  for (const [endpointId, endpoint] of Object.entries(endpoints)) {
    const clusters = endpoint?.clusters || {};
    for (const key of keys) {
      const cluster = clusters[key] || clusters[Number(key)] || clusters[String(key)];
      if (cluster) {
        return { endpointId: Number(endpointId), endpoint, cluster };
      }
    }
  }
  return null;
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
        const batteryValue = _normalizeTuyaBatteryValue(device, dp, value);
        if (batteryValue === null) {
          device.log(`[BATTERY-ROUTER] Ignored invalid Tuya DP${dp} battery value: ${value}`);
          return;
        }
        device.log(`[BATTERY-ROUTER] 🔋 Tuya DP${dp} battery: ${batteryValue}%`);
        await _setBatteryValue(device, batteryValue, `battery-router-tuya-dp-${dp}`, false);
      });
    }
    device.log('[BATTERY-ROUTER] ✅ Tuya DP battery listeners registered');
  }

  // Also listen for generic dpReport event
  device.on('tuya_dp_battery', async (value) => {
    const batteryValue = _normalizeBatteryValue(value);
    if (batteryValue === null) {return;}
    device.log(`[BATTERY-ROUTER] 🔋 tuya_dp_battery event: ${batteryValue}%`);
    await _setBatteryValue(device, batteryValue, 'battery-router-tuya-dp-event', false);
  });
}

/**
 * Configure voltage-based battery reporting
 */
async function _configureVoltageBattery(device) {
  device.log('[BATTERY-ROUTER] Configuring voltage-based battery...');

  // Listen for voltage reports
  if (device.tuyaEF00Manager) {
    for (const dp of TUYA_VOLTAGE_DPS) {
      device.tuyaEF00Manager.on(`dp-${dp}`, async (value) => {
        const voltage = UnifiedBatteryHandler ? UnifiedBatteryHandler.normalizeVoltage(value) : Number(value) / 1000;
        if (voltage === null || !Number.isFinite(voltage)) {return;}
        device.log(`[BATTERY-ROUTER] ⚡ Voltage DP${dp}: ${voltage}V`);

        if (device.hasCapability('measure_voltage')) {
          await device.safeSetCapabilityValue('measure_voltage', parseFloat(voltage)).catch(() => { });
        }

        if (device.hasCapability('measure_battery') && UnifiedBatteryHandler) {
          const batteryValue = UnifiedBatteryHandler.calculateFromVoltage(voltage, getRecommendedBatteryType(device));
          await _setBatteryValue(device, batteryValue, `battery-router-voltage-dp-${dp}`, false);
        }
      });
    }
  }
}

async function _setBatteryValue(device, value, source, estimated) {
  const batteryValue = _normalizeBatteryValue(value);
  if (batteryValue === null) {return;}
  const setter = typeof device.safeSetCapabilityValue === 'function'
    ? device.safeSetCapabilityValue.bind(device)
    : device.setCapabilityValue?.bind(device);
  await setter?.('measure_battery', parseFloat(batteryValue)).catch(() => { });
  await device.setStoreValue?.('last_battery_percentage', Math.round(batteryValue)).catch(() => { });
  await device.setStoreValue?.('last_battery_time', Date.now()).catch(() => { });
  await device.setStoreValue?.('last_battery_source', source).catch(() => { });
  await device.setStoreValue?.('last_battery_estimated', estimated === true).catch(() => { });
}

function _normalizeBatteryValue(value) {
  if (UnifiedBatteryHandler) {
    return UnifiedBatteryHandler.normalizeStoredBattery(value);
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric === 255 || numeric === 0xFFFF || numeric < 0 || numeric > 200) {
    return null;
  }
  return numeric > 100 ? Math.round(numeric / 2) : Math.round(numeric);
}

function _normalizeTuyaBatteryValue(device, dp, value) {
  if (!UnifiedBatteryHandler) {
    return _normalizeBatteryValue(value);
  }
  const settings = device.getSettings?.() || {};
  const store = device.getStore?.() || {};
  const profile = UnifiedBatteryHandler.lookupBatteryProfile?.(
    settings.zb_manufacturer_name || settings.zb_manufacturerName || store.manufacturerName || '',
    settings.zb_model_id || settings.zb_modelId || store.modelId || ''
  );
  const normalized = UnifiedBatteryHandler.normalizeTuyaBatteryValue(dp, value, {
    profile,
    profileMatch: profile && (Number(profile.dpId) === Number(dp) || Number(profile.dpIdState) === Number(dp)),
    batteryType: profile?.chemistry || getRecommendedBatteryType(device),
    lastValue: device.getCapabilityValue?.('measure_battery'),
    temperature: device.getCapabilityValue?.('measure_temperature'),
  });
  if (normalized !== null) return normalized;

  const raw = UnifiedBatteryHandler.coerceNumericValue(value);
  const voltage = UnifiedBatteryHandler.normalizeVoltage(value);
  if (Number.isFinite(raw) && raw >= 800 && voltage !== null) {
    return UnifiedBatteryHandler.calculateFromVoltage(voltage, profile?.chemistry || getRecommendedBatteryType(device));
  }

  return null;
}

/**
 * Get recommended battery type based on device characteristics
 */
function getRecommendedBatteryType(device) {
  const settings = device.getSettings?.() || {};
  const modelId = settings.zb_model_id || settings.zb_modelId || '';
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
  TUYA_VOLTAGE_DP,
  TUYA_VOLTAGE_DPS
};
