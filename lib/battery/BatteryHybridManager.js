'use strict';
const { safeMultiply, safeParse } = require('../utils/tuyaUtils.js');


/**
 * 
 *             BATTERY HYBRID MANAGER - v5.5.42                                  
 * 
 *                                                                               
 *   Gestion intelligente des batteries avec auto-apprentissage                  
 *                                                                               
 *   STRATÃ‰GIE:                                                                  
 *   1. Consulte BatteryProfileDatabase pour devices connus                      
 *   2. Si inconnu  Ã©coute TOUTES les sources (Tuya DP + ZCL)                   
 *   3. Track les donnÃ©es reÃ§ues par source                                      
 *   4. AprÃ¨s 15 min  choisit la meilleure source + algorithme                  
 *   5. Affine le calcul de pourcentage basÃ© sur les valeurs observÃ©es           
 *                                                                               
 *   SOURCES SUPPORTÃ‰ES:                                                         
 *   - Tuya DP (DP4, DP15, DP101, etc.)                                          
 *   - Tuya battery_state enum (low/medium/high)                                 
 *   - ZCL powerConfiguration.batteryPercentageRemaining                         
 *   - ZCL powerConfiguration.batteryVoltage                                     
 *                                                                               
 * 
 */

const {
  BATTERY_CHEMISTRY,
  BATTERY_SOURCE,
  VOLTAGE_ALGO,
  lookupBatteryProfile,
  calculateBatteryPercent,
  batteryStateToPercent,
} = require('./BatteryProfileDatabase');

// Auto-optimization timeout (15 minutes)
const BATTERY_OPTIMIZATION_DELAY =safeMultiply(15, 60) * 1000;

class BatteryHybridManager {

  constructor(device) {
    this.device = device;

    // Known profile from database
    this._knownProfile = null;

    // Source stats tracking
    this._sourceStats = {
      tuya_dp: {
        received: 0,
        lastValue, lastTime: null, enabled: true,
        values: [],      // Store recent values for analysis
      },
      tuya_state: {
        received: 0,
        lastValue, lastTime: null, enabled: true,
        values: [],
      },
      zcl_percent: {
        received: 0,
        lastValue, lastTime: null, enabled: true,
        values: [],
      },
      zcl_voltage: {
        received: 0,
        lastValue, lastTime: null, enabled: true,
        values: [],
      },
    };

    // Learned parameters
    this._learnedParams = {
      preferredSource,
      algorithm,
      multiplier: 1,
      voltageMin,
      voltageMax,
      decided: false,
    };

    // Optimization timer
    this._optimizationTimer = null;
  }

  /**
   * Initialize battery manager
   */
  async initialize(manufacturerName, productId) {
    this.device.log('[BATTERY] ');
    this.device.log('[BATTERY] v5.5.42 HYBRID BATTERY MANAGER');
    this.device.log('[BATTERY] ');

    // Step 1: Check known battery profiles
    this._knownProfile = lookupBatteryProfile(manufacturerName, productId);

    if (this._knownProfile) {
      this.device.log(`[BATTERY]  KNOWN PROFILE (source: ${this._knownProfile.source})`);
      this.device.log(`[BATTERY] Chemistry: ${this._knownProfile.chemistry || 'unknown'}`);
      this.device.log(`[BATTERY] Data source: ${this._knownProfile.source}`);
      this.device.log(`[BATTERY] Algorithm: ${this._knownProfile.algorithm || 'auto'}`);

      // Pre-configure based on known profile
      this._configureFromProfile();
    } else {
      this.device.log('[BATTERY]  UNKNOWN DEVICE - All battery sources active');
    }

    // Step 2: Schedule optimization after 15 minutes
    this._scheduleOptimization();
  }

  /**
   * Configure sources based on known profile
   */
  _configureFromProfile() {
    const profile = this._knownProfile;
    if (!profile) return;

    // Set preferred source
    this._learnedParams.preferredSource = profile.source;
    this._learnedParams.algorithm = profile.algorithm;

    if (profile.voltageMin) this._learnedParams.voltageMin = profile.voltageMin;
    if (profile.voltageMax) this._learnedParams.voltageMax = profile.voltageMax;

    // Disable unused sources for known devices
    if (profile.source === BATTERY_SOURCE.TUYA_DP) {
      this._sourceStats.zcl_percent.enabled = false;
      this._sourceStats.zcl_voltage.enabled = false;
      this.device.log('[BATTERY]  Pre-configured: Tuya DP only');
    } else if (profile.source === BATTERY_SOURCE.ZCL_POWER_CFG) {
      this._sourceStats.tuya_dp.enabled = false;
      this._sourceStats.tuya_state.enabled = false;
      this.device.log('[BATTERY]  Pre-configured: ZCL only');
    } else if (profile.source === BATTERY_SOURCE.NONE) {
      // No battery - disable all
      for (const stats of Object.values(this._sourceStats)) {
        stats.enabled = false;
      }
      this._learnedParams.decided = true;
      this.device.log('[BATTERY]  No battery (mains/USB powered)');
    }

    // Check if ZCL polling should be skipped
    if (profile.skipZclPolling) {
      this._sourceStats.zcl_percent.enabled = false;
      this._sourceStats.zcl_voltage.enabled = false;
      this.device.log('[BATTERY]  ZCL polling disabled (known timeout issues)');
    }
  }

  /**
   * Schedule optimization after 15 minutes
   */
  _scheduleOptimization() {
    if (this._optimizationTimer) {
      this.device.homey.clearTimeout(this._optimizationTimer);
    }

    this._optimizationTimer = this.device.homey.setTimeout(() => {
      this._optimizeBattery();
    }, BATTERY_OPTIMIZATION_DELAY);

    this.device.log('[BATTERY]  Battery optimization scheduled in 15 minutes');
  }

  /**
   * Track battery data from Tuya DP
   */
  trackTuyaDP(dpId, value) {
    if (!this._sourceStats.tuya_dp.enabled) return null;

    this._sourceStats.tuya_dp.received++;
    this._sourceStats.tuya_dp.lastValue = value;
    this._sourceStats.tuya_dp.lastTime = Date.now();
    this._sourceStats.tuya_dp.values.push({ dpId, value, time: Date.now() });

    // Keep only last 10 values
    if (this._sourceStats.tuya_dp.values.length > 10) {
      this._sourceStats.tuya_dp.values.shift();
    }

    this.device.log(`[BATTERY]  Tuya DP${dpId} = ${value}`);

    return this._calculatePercent(value, 'tuya_dp');
  }

  /**
   * Track battery state from Tuya (low/medium/high)
   */
  trackTuyaState(state) {
    if (!this._sourceStats.tuya_state.enabled) return null;

    this._sourceStats.tuya_state.received++;
    this._sourceStats.tuya_state.lastValue = state;
    this._sourceStats.tuya_state.lastTime = Date.now();
    this._sourceStats.tuya_state.values.push({ state, time: Date.now() });

    if (this._sourceStats.tuya_state.values.length > 10) {
      this._sourceStats.tuya_state.values.shift();
    }

    const percent = batteryStateToPercent(state);
    this.device.log(`[BATTERY]  Tuya state = ${state}  ${percent}%`);

    return percent;
  }

  /**
   * Track battery from ZCL percentage
   */
  trackZclPercent(value) {
    if (!this._sourceStats.zcl_percent.enabled) return null;

    this._sourceStats.zcl_percent.received++;
    this._sourceStats.zcl_percent.lastValue = value;
    this._sourceStats.zcl_percent.lastTime = Date.now();
    this._sourceStats.zcl_percent.values.push({ value, time: Date.now() });

    if (this._sourceStats.zcl_percent.values.length > 10) {
      this._sourceStats.zcl_percent.values.shift();
    }

    // ZCL reports 0-200 (0.5% steps), convert to 0-100
    const percent = Math.round(safeParse(value));
    this.device.log(`[BATTERY]  ZCL percent = ${value}  ${percent}%`);

    return Math.min(100, Math.max(0, percent));
  }

  /**
   * Track battery from ZCL voltage
   */
  trackZclVoltage(voltage) {
    if (!this._sourceStats.zcl_voltage.enabled) return null;

    // ZCL reports in 100mV units
    const volts = safeParse(voltage, 10);

    this._sourceStats.zcl_voltage.received++;
    this._sourceStats.zcl_voltage.lastValue = volts;
    this._sourceStats.zcl_voltage.lastTime = Date.now();
    this._sourceStats.zcl_voltage.values.push({ voltage: volts, time: Date.now() });

    if (this._sourceStats.zcl_voltage.values.length > 10) {
      this._sourceStats.zcl_voltage.values.shift();
    }

    this.device.log(`[BATTERY]  ZCL voltage = ${volts}V`);

    return this._calculatePercent(volts, 'zcl_voltage');
  }

  /**
   * Calculate percentage based on learned parameters
   */
  _calculatePercent(value, source) {
    const params = this._learnedParams;
    const profile = this._knownProfile;

    // Use profile algorithm if available
    let algorithm = params.algorithm || profile?.algorithm || VOLTAGE_ALGO.DIRECT_PERCENT;let voltageMin = params.voltageMin || profile?.voltageMin || 2.5;let voltageMax = params.voltageMax || profile?.voltageMax || 3.0;// For voltage source, use curve-based calculation
    if (source === 'zcl_voltage') {
      algorithm = profile?.algorithm || VOLTAGE_ALGO.LINEAR;return calculateBatteryPercent(value, algorithm, voltageMin, voltageMax);
    }

    // For direct percentage sources
    return calculateBatteryPercent(value, algorithm, voltageMin, voltageMax);
  }

  /**
   * Optimize battery handling after 15 minutes
   */
  _optimizeBattery() {
    this.device.log('[BATTERY] ');
    this.device.log('[BATTERY]  BATTERY OPTIMIZATION (15 min elapsed)');
    this.device.log('[BATTERY] ');

    // Analyze which sources received data
    const sourcesWithData = [];
    const sourcesWithoutData = [];

    for (const [name, stats] of Object.entries(this._sourceStats)) {
      if (!stats.enabled) continue;

      if (stats.received > 0) {
        sourcesWithData.push({
          name,
          count: stats.received,
          lastValue: stats.lastValue,
          values: stats.values,
        });
      } else {
        stats.enabled = false;
        sourcesWithoutData.push(name);
      }
    }

    this.device.log(`[BATTERY]  Active sources: ${sourcesWithData.map(s => `${s.name}(${s.count})`).join(', ') || 'none'}`);
    this.device.log(`[BATTERY]  Disabled: ${sourcesWithoutData.join(', ') || 'none'}`);

    // Choose preferred source
    if (sourcesWithData.length > 0) {
      // Prefer Tuya DP over ZCL (more reliable for Tuya devices)
      const tuyaSource = sourcesWithData.find(s => s.name.startsWith('tuya'));
      const zclSource = sourcesWithData.find(s => s.name.startsWith('zcl'));

      if (tuyaSource) {
        this._learnedParams.preferredSource = tuyaSource.name;
        this.device.log(`[BATTERY]  Preferred source: ${tuyaSource.name}`);

        // Analyze values to determine multiplier
        this._analyzeValues(tuyaSource);
      } else if (zclSource) {
        this._learnedParams.preferredSource = zclSource.name;
        this.device.log(`[BATTERY]  Preferred source: ${zclSource.name}`);
      }

      this._learnedParams.decided = true;
    } else {
      this.device.log('[BATTERY]  No battery data received - keeping all sources active');
      for (const stats of Object.values(this._sourceStats)) {
        stats.enabled = true;
      }
    }

    // Store learned parameters
    this.device.setStoreValue('battery_learned', this._learnedParams).catch(() => { });
  }

  /**
   * Analyze received values to determine algorithm
   */
  _analyzeValues(source) {
    const values = source.values.map(v => v.value || v.voltage || v.state);

    if (values.length < 2) return;

    const max = Math.max(...values);
    const min = Math.min(...values);

    this.device.log(`[BATTERY]  Value range: ${min} - ${max}`);

    // Detect if values need multiplier
    if (max <= 50 && max > 0) {
      // Values seem to be half of actual percentage
      this._learnedParams.algorithm = VOLTAGE_ALGO.MULTIPLY_2;
      this.device.log('[BATTERY]  Detected: values need *2 multiplier');
    } else if (max > 100 && max <= 200) {
      // Values are doubled (like ZCL)
      this._learnedParams.algorithm = VOLTAGE_ALGO.DIVIDE_2;
      this.device.log('[BATTERY]  Detected: values need/2 divider');
    } else if (max <= 100) {
      // Direct percentage
      this._learnedParams.algorithm = VOLTAGE_ALGO.DIRECT_PERCENT;
      this.device.log('[BATTERY]  Detected: direct percentage');
    }
  }

  /**
   * Get best battery percentage (uses preferred source)
   */
  getBestPercent() {
    const preferred = this._learnedParams.preferredSource;

    if (preferred && this._sourceStats[preferred]) {
      const stats = this._sourceStats[preferred];
      if (stats.lastValue !== null) {
        return this._calculatePercent(stats.lastValue, preferred);
      }
    }

    // Fallback: return first available value
    for (const [name, stats] of Object.entries(this._sourceStats)) {
      if (stats.enabled && stats.lastValue !== null) {
        return this._calculatePercent(stats.lastValue, name);
      }
    }

    return null;
  }

  /**
   * Check if ZCL polling should be skipped
   */
  shouldSkipZclPolling() {
    if (this._knownProfile?.skipZclPolling) return true;
    if (!this._sourceStats.zcl_percent.enabled && !this._sourceStats.zcl_voltage.enabled) return true;
    return false;
  }

  /**
   * Get battery stats summary
   */
  getStats() {
    return {
      knownProfile: this._knownProfile,
      learnedParams: this._learnedParams,
      sourceStats: this._sourceStats,
    };
  }

  /**
   * Cleanup
   */
  cleanup() {
    if (this._optimizationTimer) {
      this.device.homey.clearTimeout(this._optimizationTimer);
      this._optimizationTimer = null;
    }
    this.device.log('[BATTERY]  Cleanup complete');
  }
}

module.exports = BatteryHybridManager;


