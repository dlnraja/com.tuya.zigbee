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
    // METHOD 1: Standard powerConfiguration cluster
    try {
      if (zclNode && zclNode.endpoints && zclNode.endpoints[1]) {
        const endpoint = zclNode.endpoints[1];
        
        if (endpoint.clusters && endpoint.clusters.genPowerCfg) {
          device.log('[BATTERY-READER] Trying genPowerCfg cluster...');
          
          // Try batteryVoltage (0x0020)
          try {
            const voltage = await endpoint.clusters.genPowerCfg.readAttributes(['batteryVoltage']);
            if (voltage && typeof voltage.batteryVoltage === 'number') {
              result.voltage = voltage.batteryVoltage / 10; // Convert to V
              result.percent = voltageToPercent(result.voltage);
              result.source = 'genPowerCfg.batteryVoltage';
              device.log(`[BATTERY-READER] ✅ Battery from genPowerCfg: ${result.voltage}V (${result.percent}%)`);
              return result;
            }
          } catch (e) {
            device.log('[BATTERY-READER] batteryVoltage read failed:', e.message);
          }
          
          // Try batteryPercentageRemaining (0x0021)
          try {
            const percent = await endpoint.clusters.genPowerCfg.readAttributes(['batteryPercentageRemaining']);
            if (percent && typeof percent.batteryPercentageRemaining === 'number') {
              result.percent = Math.round(percent.batteryPercentageRemaining / 2); // 0-200 → 0-100
              result.source = 'genPowerCfg.batteryPercentageRemaining';
              device.log(`[BATTERY-READER] ✅ Battery from genPowerCfg: ${result.percent}%`);
              return result;
            }
          } catch (e) {
            device.log('[BATTERY-READER] batteryPercentageRemaining read failed:', e.message);
          }
        }
      }
    } catch (e) {
      device.log('[BATTERY-READER] genPowerCfg method failed:', e.message);
    }
    
    // METHOD 2: Voltage fallback (manufacturer-specific)
    try {
      if (zclNode && zclNode.endpoints && zclNode.endpoints[1]) {
        const endpoint = zclNode.endpoints[1];
        
        if (endpoint.clusters && endpoint.clusters.genBasic) {
          device.log('[BATTERY-READER] Trying genBasic voltage fallback...');
          
          // Some devices store voltage in manufacturer-specific attributes
          // Try to read attributes 0x0005 (modelId) just to check cluster is responsive
          try {
            const attrs = await endpoint.clusters.genBasic.readAttributes(['modelId']);
            if (attrs && attrs.modelId) {
              device.log('[BATTERY-READER] genBasic responsive, but no voltage attr found');
            }
          } catch (e) {
            // Silent
          }
        }
      }
    } catch (e) {
      device.log('[BATTERY-READER] Voltage fallback failed:', e.message);
    }
    
    // METHOD 3: Tuya DP protocol parsing
    try {
      device.log('[BATTERY-READER] Trying Tuya DP protocol...');
      
      // Check if device REALLY uses Tuya DP (cluster 0xEF00)
      const modelId = device.getData()?.productId || device.getData()?.modelId || '';
      const hasTuyaCluster = zclNode?.endpoints?.[1]?.clusters?.[0xEF00] 
                          || zclNode?.endpoints?.[1]?.clusters?.tuyaManufacturer
                          || zclNode?.endpoints?.[1]?.clusters?.tuyaSpecific;
      
      // Only treat as Tuya DP if:
      // 1. Model is TS0601 (definitive Tuya DP), OR
      // 2. Has cluster 0xEF00 (Tuya proprietary)
      // NOTE: _TZ3000_* devices are standard Zigbee, NOT Tuya DP!
      if (modelId === 'TS0601' || hasTuyaCluster) {
        device.log('[BATTERY-READER] ⚠️  Tuya DP device detected - cluster 0xEF00');
        
        // Tuya DP devices report battery via hidden cluster
        // TuyaEF00Manager will handle this via dataReport listeners
        result.source = 'tuya_dp_managed_by_ef00manager';
        device.log('[BATTERY-READER] ℹ️  Battery will be reported via TuyaEF00Manager (DP 4/14/15)');
        
        // Return early - TuyaEF00Manager will set capability values
        return result;
      } else {
        device.log('[BATTERY-READER] ℹ️  Not a Tuya DP device - standard Zigbee');
      }
    } catch (e) {
      device.log('[BATTERY-READER] Tuya DP check failed:', e.message);
    }
    
    // METHOD 4: Store value fallback
    try {
      const storedBattery = device.getStoreValue('last_battery_percent');
      if (storedBattery !== null && storedBattery !== undefined) {
        result.percent = storedBattery;
        result.source = 'stored_value';
        device.log(`[BATTERY-READER] ℹ️  Using stored battery value: ${result.percent}%`);
        return result;
      }
    } catch (e) {
      // Silent
    }
    
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
