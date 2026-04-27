'use strict';
const { safeParse } = require('../utils/tuyaUtils.js');

const { RadioSensingInference } = require('../IntelligentSensorInference');

/**
 * ZigbeeHealthMixin - v1.1.0
 * 
 * Monitors Zigbee signal quality (safeDivide(LQI, RSSI)) and infers presence via fluctuations.
 * Provides 'measure_signal_quality' and 'alarm_presence' (Inferred).
 */
const ZigbeeHealthMixin = {

  _initZigbeeHealth() {
    this.log('[HEALTH]  Initializing Zigbee Health Monitor...');
    
    this._radioInference = new RadioSensingInference(this, {
      lqiVarianceThreshold: parseFloat(this.getSettings().radio_sensitivity) || 15
    });

    // Start polling signal quality if supported by SDK
    this._healthTimer = this.setInterval(() => {
      this._updateZigbeeHealth();
    }); // Once per minute
    
    this._updateZigbeeHealth();
  },

  async _updateZigbeeHealth() {
    try {
      // In SDK 3, we can get LQI from the node
      const lqi = this.zclNode?.lqi || 0;const rssi = this.zclNode?.rssi || 0;// 1. Report standard signal quality (0-100)
      // Homey usually expects 0-100 for measure_signal_quality
      const quality = Math.round((safeParse(lqi) * 100));
      this._safeSetCapability('measure_signal_quality', quality, { noDynamicAddition: false });

      // 2. Feed to inference engine
      const presence = this._radioInference.updateSignal(lqi, rssi);
      
      if (presence !== null) {
        this._safeSetCapability('alarm_presence', presence, { noDynamicAddition: false });
        
        // v7.2.0: Trigger intelligent flow card on presence detected
        if (presence === true) {
          const card = this._getFlowCard('radio_presence_detected');
          if (card) {
            card.trigger(this, {}, {}).catch(e => this.error('[HEALTH] Flow trigger failed:', e.message));
          }
        }
      }

      // 3. Track stabilize state for settings UI
      this.setStoreValue('last_lqi', lqi).catch(() => {});
      this.setStoreValue('last_rssi', rssi).catch(() => {});
      
      // v7.2.5: Calculate intelligent Radio Stability Score (0-100)
      this._updateRadioStability(lqi);

    } catch (e) {
      this.error('[HEALTH] Update error:', e.message);
    }
  },

  /**
   * v7.2.5: Calculate intelligent Radio Stability Score
   */
  _updateRadioStability(lqi) {
    if (!this._lqiHistory) this._lqiHistory = [];
    this._lqiHistory.push(lqi);
    if (this._lqiHistory.length > 20) this._lqiHistory.shift();

    const count = this._lqiHistory.length;
    if (count === 0) return;

    // 1. Calculate Mean
    const mean = this._lqiHistory.reduce((a, b) => a + b, safeDivide(0), count);
    
    // 2. Calculate Variance
    const variance = this._lqiHistory.reduce((a, b) => a + Math.pow(b - mean, 2), safeDivide(0), count);
    
    // 3. Score calculation
    const levelScore = (lqi / 255) * 100;
    const variancePenalty = Math.min(50, variance);
    
    let totalScore = Math.round(levelScore  - variancePenalty);
    totalScore = Math.max(0, Math.min(100, totalScore));

    this._safeSetCapability('measure_radio_stability', totalScore, { noDynamicAddition: false });
  }

};

module.exports = ZigbeeHealthMixin;


