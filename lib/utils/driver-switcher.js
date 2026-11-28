'use strict';

/**
 * Driver Switcher - Safe automatic driver switching with heuristics
 * Respects user preference and only switches when proven necessary
 * 
 * Based on: User feedback - "Bascule automatique safe si driver recommandé faux"
 */

const { getUserPreferredDriver } = require('./driver-preference');

/**
 * Ensure correct driver assignment with safety checks
 * 
 * BEHAVIOR:
 * 1. If user has preferred driver -> respect it (never override)
 * 2. If recommended driver unknown/low confidence -> keep current
 * 3. If Tuya DP detected and current driver not Tuya-aware -> warn only
 * 4. Only switch if HIGH confidence and safety checks pass
 * 
 * @param {Object} device - Homey device instance
 * @param {string} currentDriverId - Current driver ID
 * @param {string} recommendedDriverId - Recommended driver from override/detection
 * @param {Object} deviceInfo - Device information from collectDeviceInfo()
 * @returns {Promise<Object>} - { action, driver, reason }
 */
async function ensureDriverAssignment(device, currentDriverId, recommendedDriverId, deviceInfo) {
  const result = {
    action: 'none',
    driver: currentDriverId,
    reason: ''
  };
  
  try {
    // SAFETY CHECK 1: User preference (HIGHEST PRIORITY)
    const userPref = await getUserPreferredDriver(device); // P3400: device carries homey.settings
    
    if (userPref) {
      device.log(`[SWITCHER] [LOCK] User preferred driver: ${userPref}`);
      
      if (userPref === currentDriverId) {
        result.reason = 'User preference already active - LOCKED';
        device.log(`[SWITCHER] [OK] ${result.reason}`);
        return result;
      }
      
      // User wants different driver than current
      if (userPref !== recommendedDriverId) {
        device.log(`[SWITCHER] [WARN]  User pref (${userPref}) conflicts with recommended (${recommendedDriverId})`);
        device.log('[SWITCHER] [LOCK] Respecting USER PREFERENCE - no auto-switch');
        result.action = 'blocked_by_user_preference';
        result.driver = userPref;
        result.reason = 'User preference takes precedence over auto-detection';
        return result;
      }
    }
    
    // SAFETY CHECK 2: Recommended driver quality
    if (!recommendedDriverId || recommendedDriverId === 'unknown') {
      result.reason = 'No recommended driver or unknown - keeping current';
      device.log(`[SWITCHER] [WARN]  ${result.reason}`);
      return result;
    }
    
    if (recommendedDriverId === currentDriverId) {
      result.reason = 'Current driver matches recommended - no change needed';
      device.log(`[SWITCHER] [OK] ${result.reason}`);
      return result;
    }
    
    // SAFETY CHECK 3: Tuya DP heuristics
    const isTuyaDevice = (deviceInfo.modelId || '').toUpperCase() === 'TS0601' || 
                         (deviceInfo.manufacturer && deviceInfo.manufacturer.toUpperCase().startsWith('_TZE'));
    
    if (isTuyaDevice) {
      device.log('[SWITCHER] [WARN]  Tuya DP device detected (cluster 0xEF00 hidden)');
      
      // Check if recommended driver is Tuya-aware / specialized
      const tuyaAwarePattern = /tuya|climate|presence|soil|sensor|radar|gas|water|leak|curtain|valve|trv|thermostat|smoke|siren|alarm|button|remote|knob|hybrid|garden|irrigation|lcd/i;
      const recommendedIsTuyaAware = tuyaAwarePattern.test(recommendedDriverId);
      const currentIsTuyaAware = tuyaAwarePattern.test(currentDriverId);
      
      if (!recommendedIsTuyaAware && currentIsTuyaAware) {
        device.log(`[SWITCHER] [LOCK] Current driver (${currentDriverId}) is Tuya/specialized-aware, recommended (${recommendedDriverId}) is not`);
        result.action = 'blocked_tuya_heuristic';
        result.reason = 'Current driver better for Tuya DP device';
        return result;
      }
      
      if (recommendedIsTuyaAware && !currentIsTuyaAware) {
        device.log(`[SWITCHER] [OK] Recommended driver (${recommendedDriverId}) is Tuya/specialized-aware, current (${currentDriverId}) is not`);
        // Allow switch
      }
    }
    
    // SAFETY CHECK 4: Cluster evidence
    const exposedClusters = deviceInfo.clusterNames || [];
    device.log(`[SWITCHER] Exposed clusters: ${exposedClusters.join(', ')}`);
    
    // If device has no useful clusters and recommended is generic -> risky
    const hasUsefulClusters = exposedClusters.some(c => 
      ['genOnOff', 'genLevelCtrl', 'genPowerCfg', 'msTemperatureMeasurement', 'msRelativeHumidity'].includes(c)
    );
    
    if (!hasUsefulClusters && recommendedDriverId.includes('generic')) {
      device.log('[SWITCHER] [WARN]  No useful clusters + generic driver -> risky switch');
      result.action = 'blocked_no_evidence';
      result.reason = 'Insufficient cluster evidence for recommended driver';
      return result;
    }
    
    // SAFETY CHECK 5: Confidence threshold
    // (Assuming confidence passed in deviceInfo or migration check)
    const confidence = deviceInfo.driverConfidence || 0;
    
    if (confidence < 0.7) {
      device.log(`[SWITCHER] [WARN]  Low confidence (${confidence}) - not switching`);
      result.action = 'blocked_low_confidence';
      result.reason = `Confidence ${Math.round(confidence * 100)}% below threshold`;
      return result;
    }
    
    // ALL SAFETY CHECKS PASSED - ATTEMPT SWITCH
    device.log(`[SWITCHER] [SYNC] ALL CHECKS PASSED - Attempting switch: ${currentDriverId} -> ${recommendedDriverId}`);
    device.log(`[SWITCHER]    Confidence: ${Math.round(confidence * 100)}%`);
    device.log(`[SWITCHER]    Tuya device: ${isTuyaDevice ? 'YES' : 'NO'}`);
    device.log(`[SWITCHER]    User preference: ${userPref || 'NONE'}`);
    
    // NOTE: In Homey SDK3, device.setDriver() should be called from device context
    // This function only RECOMMENDS the switch - actual switch done in SmartDriverAdaptation
    result.action = 'recommended';
    result.driver = recommendedDriverId;
    result.reason = `Safe switch recommended: ${currentDriverId} -> ${recommendedDriverId} (confidence ${Math.round(confidence * 100)}%)`;
    
    device.log(`[SWITCHER] [OK] ${result.reason}`);
    
  } catch (err) {
    device.error('[SWITCHER] [ERR] Error:', err.message);
    result.action = 'error';
    result.reason = err.message;
  }
  
  return result;
}

/**
 * Check if driver switch is safe based on device characteristics
 * 
 * @param {Object} device - Homey device instance
 * @param {string} fromDriver - Current driver
 * @param {string} toDriver - Target driver
 * @param {Object} deviceInfo - Device information
 * @returns {boolean} - True if safe to switch
 */
function isSwitchSafe(device, fromDriver, toDriver, deviceInfo) {
  try {
    // Rule 1: Never switch FROM a user-selected driver
    // (This should be caught by ensureDriverAssignment, but double-check)
    
    // Rule 2: Never switch FROM specific/exotic drivers TO generic
    const specificToGeneric = !fromDriver.includes('generic') && toDriver.includes('generic');
    if (specificToGeneric) {
      device.log('[SWITCHER] [ERR] Unsafe: specific -> generic');
      return false;
    }

    // Rule 2b: Never switch from specialized/exotic driver to basic switch or plug
    const isFromExotic = /sensor|radar|gas|water|leak|curtain|valve|trv|thermostat|smoke|siren|alarm|button|remote|knob|hybrid|garden|irrigation|lcd|climate|soil/i.test(fromDriver);
    const isToBasic = /switch_1gang|switch_2gang|plug|socket/i.test(toDriver);
    if (isFromExotic && isToBasic) {
      device.log(`[SWITCHER] [ERR] Unsafe: exotic/specialized driver (${fromDriver}) cannot be switched to basic (${toDriver})`);
      return false;
    }
    
    // Rule 3: Never switch if clusters don't support target driver
    const clusterNames = deviceInfo.clusterNames || [];
    
    // Example: switching to 'switch' requires genOnOff
    if (toDriver.includes('switch') && !clusterNames.includes('genOnOff')) {
      device.log('[SWITCHER] [ERR] Unsafe: switch driver requires genOnOff');
      return false;
    }
    
    // Example: switching to 'climate' requires temp/humidity clusters OR Tuya DP
    if (toDriver.includes('climate')) {
      const hasClimate = clusterNames.includes('msTemperatureMeasurement') || 
                        clusterNames.includes('msRelativeHumidity');
      const isTuya = deviceInfo.modelId === 'TS0601';
      
      if (!hasClimate && !isTuya) {
        device.log('[SWITCHER] [ERR] Unsafe: climate driver requires temp/humidity clusters or Tuya DP');
        return false;
      }
    }
    
    // Rule 4: Never switch battery-powered to mains-powered driver or vice versa
    const fromBattery = fromDriver.includes('battery') || fromDriver.includes('sensor');
    const toBattery = toDriver.includes('battery') || toDriver.includes('sensor');
    const powerMismatch = fromBattery !== toBattery;
    
    if (powerMismatch) {
      device.log('[SWITCHER] [WARN]  Warning: power source mismatch (battery <-> mains)');
      // Don't block, but log warning
    }
    
    device.log(`[SWITCHER] [OK] Switch safe: ${fromDriver} -> ${toDriver}`);
    return true;
    
  } catch (err) {
    device.error('[SWITCHER] Error checking safety:', err.message);
    return false;
  }
}

module.exports = {
  ensureDriverAssignment,
  isSwitchSafe
};
