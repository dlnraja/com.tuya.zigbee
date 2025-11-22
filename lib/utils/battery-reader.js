'use strict';

/**
 * Battery Reader - Enhanced battery & voltage reading with fallbacks
 * Handles: standard clusters, voltage fallback, Tuya DP protocol
 *
 * Based on: User feedback - "Aucune data sur les batteries"
 */

/**
 * Read battery level from device with multiple fallback methods
 *
 * @param {Object} device - Homey device instance
 * @param {Object} zclNode - ZCL Node
 * @returns {Promise<Object>} - { voltage, percent, source }
 */
async function readBattery(device, zclNode) {
  const result = {
    voltage: null,
    percent: null,
    source: 'unknown'
  };

  try {
    // METHOD 1: Tuya DP battery (if device uses Tuya DP)
    if (device.usesTuyaDPBattery || device.usesTuyaDP) {
      device.log('[BATTERY-READER] 🔋 Device uses Tuya DP - battery managed by TuyaEF00Manager');
      // TuyaEF00Manager will handle battery via DP events (DP 4/14/15)
      // Don't try to read cluster 0x0001 on Tuya DP devices
      result.source = 'tuya_dp_managed';
      result.percent = null; // Will be set by DP events
      return result;
    }

    // METHOD 2: Standard powerConfiguration cluster (0x0001)
    const ep1 = zclNode && zclNode.endpoints && zclNode.endpoints[1];
    if (ep1 && ep1.clusters && ep1.clusters.genPowerCfg) {
      device.log('[BATTERY-READER] 📖 Reading cluster 0x0001 (powerConfiguration)...');

      // Try batteryPercentageRemaining (0x0021) FIRST
      try {
        const attrs = await ep1.clusters.genPowerCfg.readAttributes(['batteryPercentageRemaining']);
        if (attrs && typeof attrs.batteryPercentageRemaining === 'number') {
          result.percent = Math.round(attrs.batteryPercentageRemaining / 2); // 0-200 → 0-100
          result.source = 'cluster_0x0001_percent';
          device.log(`[BATTERY-READER] ✅ Read batteryPercentageRemaining: ${attrs.batteryPercentageRemaining} → ${result.percent}%`);
          return result;
        }
      } catch (err) {
        device.log('[BATTERY-READER] batteryPercentageRemaining read failed (device sleepy?):', err.message);
      }

      // Try batteryVoltage (0x0020) as fallback
      try {
        const attrs = await ep1.clusters.genPowerCfg.readAttributes(['batteryVoltage']);
        if (attrs && typeof attrs.batteryVoltage === 'number') {
          result.voltage = attrs.batteryVoltage / 10; // Zigbee: 0.1V units → V
          result.percent = voltageToPercent(result.voltage);
          result.source = 'cluster_0x0001_voltage';
          device.log(`[BATTERY-READER] ✅ Read batteryVoltage: ${attrs.batteryVoltage} → ${result.voltage}V (${result.percent}%)`);
          return result;
        }
      } catch (err) {
        device.log('[BATTERY-READER] batteryVoltage read failed (device sleepy?):', err.message);
      }

      // If reads failed but cluster exists, it's likely a sleepy device
      device.log('[BATTERY-READER] ⚠️  Cluster 0x0001 exists but reads timed out (sleepy device)');
      device.log('[BATTERY-READER] Battery will be updated via configureReporting listener');
    } else {
      device.log('[BATTERY-READER] ℹ️  No powerConfiguration cluster (0x0001)');
    }

    // METHOD 3: Stored value fallback (previous successful read)
    const storedBattery = device.getStoreValue('last_battery_percent');
    if (storedBattery !== null && storedBattery !== undefined && storedBattery > 0) {
      result.percent = storedBattery;
      result.source = 'stored_value';
      device.log(`[BATTERY-READER] ℹ️  Using stored battery value: ${result.percent}%`);
      return result;
    }

    // METHOD 4: New device assumption
    const firstSeen = device.getStoreValue('first_seen');
    if (!firstSeen) {
      // First time seeing this device - store timestamp
      device.setStoreValue('first_seen', Date.now()).catch(() => { });
      result.percent = 100;
      result.source = 'new_device_assumption';
      device.log('[BATTERY-READER] ℹ️  New device - assuming 100% battery');
      return result;
    }

    // METHOD 5: Final fallback
    device.log('[BATTERY-READER] ⚠️  All read methods failed - using fallback 100%');
    result.percent = 100;
    result.source = 'fallback_100';

  } catch (err) {
    device.error('[BATTERY-READER] ❌ Battery read error:', err.message);
  }

  return result;
}

/**
 * Convert voltage to battery percentage
 * Assumes CR2032 or similar (2.0V = 0%, 3.0V = 100%)
 *
 * @param {number} voltage - Voltage in V
 * @returns {number} - Percentage 0-100
 */
function voltageToPercent(voltage) {
  if (!voltage || voltage <= 0) return 0;

  // Standard CR2032 curve: 3.0V (full) to 2.0V (empty)
  const vMax = 3.0;
  const vMin = 2.0;

  const percent = Math.min(100, Math.max(0, Math.round((voltage - vMin) * 100 / (vMax - vMin))));
  return percent;
}

/**
 * Read energy measurements (power, voltage, current)
 *
 * @param {Object} device - Homey device instance
 * @param {Object} zclNode - ZCL Node
 * @returns {Promise<Object>} - { power, voltage, current, source }
 */
async function readEnergy(device, zclNode) {
  const result = {
    power: null,
    voltage: null,
    current: null,
    source: 'unknown'
  };

  try {
    if (zclNode && zclNode.endpoints && zclNode.endpoints[1]) {
      const endpoint = zclNode.endpoints[1];

      // Try haElectricalMeasurement cluster
      if (endpoint.clusters && endpoint.clusters.haElectricalMeasurement) {
        device.log('[ENERGY-READER] Trying haElectricalMeasurement...');

        try {
          const attrs = await endpoint.clusters.haElectricalMeasurement.readAttributes([
            'activePower',
            'rmsvoltage',
            'rmscurrent'
          ]);

          if (attrs) {
            if (typeof attrs.activePower === 'number') {
              result.power = attrs.activePower; // Watts
            }
            if (typeof attrs.rmsvoltage === 'number') {
              result.voltage = attrs.rmsvoltage; // Volts
            }
            if (typeof attrs.rmscurrent === 'number') {
              result.current = attrs.rmscurrent / 1000; // mA to A
            }
            result.source = 'haElectricalMeasurement';
            device.log(`[ENERGY-READER] ✅ Energy: ${result.power}W, ${result.voltage}V, ${result.current}A`);
          }
        } catch (e) {
          device.log('[ENERGY-READER] haElectricalMeasurement read failed:', e.message);
        }
      }

      // Try seMetering cluster
      if (endpoint.clusters && endpoint.clusters.seMetering) {
        device.log('[ENERGY-READER] Trying seMetering...');

        try {
          const attrs = await endpoint.clusters.seMetering.readAttributes([
            'instantaneousDemand',
            'currentSummDelivered'
          ]);

          if (attrs && typeof attrs.instantaneousDemand === 'number') {
            result.power = attrs.instantaneousDemand;
            result.source = 'seMetering';
            device.log(`[ENERGY-READER] ✅ Power: ${result.power}W`);
          }
        } catch (e) {
          device.log('[ENERGY-READER] seMetering read failed:', e.message);
        }
      }
    }
  } catch (err) {
    device.error('[ENERGY-READER] ❌ Energy read error:', err.message);
  }

  return result;
}

module.exports = {
  readBattery,
  readEnergy,
  voltageToPercent
};
