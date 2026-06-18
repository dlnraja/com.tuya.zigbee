'use strict';
const { safeParse } = require('../utils/tuyaUtils.js');

const { RadioSensingInference } = require('../IntelligentSensorInference');

/**
 * ZigbeeHealthMixin - v1.2.0
 *
 * Monitors Zigbee signal quality (LQI, RSSI) and infers presence via fluctuations.
 * Provides 'measure_signal_quality' and 'alarm_presence' (Inferred).
 * v1.2.0: Fixed _destroyed guards, safeDivide usage, timer management
 */
const ZigbeeHealthMixin = {

  _initZigbeeHealth() {
    this.log('[HEALTH] Initializing Zigbee Health Monitor...');

    this._radioInference = new RadioSensingInference(this, {
      lqiVarianceThreshold: parseFloat(this.getSettings().radio_sensitivity) || 15
    });

    // Start polling signal quality - use this.homey.setInterval for proper cleanup
    this._healthTimer = this.homey.setInterval(() => {
      if (this._destroyed) return;
      this._updateZigbeeHealth();
    }, 60000); // Once per minute

    this._updateZigbeeHealth();
  },

  async _updateZigbeeHealth() {
    if (this._destroyed) return;

    try {
      // In SDK 3, we can get LQI from the node
      const lqi = this.zclNode?.lqi || 0;
      const rssi = this.zclNode?.rssi || 0;

      // 1. Report standard signal quality (0-100)
      // Homey usually expects 0-100 for measure_signal_quality
      const quality = Math.round(safeParse(lqi) * 100);
      await this.safeSetCapabilityValue('measure_signal_quality', quality);

      // 2. Feed to inference engine
      const presence = this._radioInference.updateSignal(lqi, rssi);

      if (presence !== null) {
        await this.safeSetCapabilityValue('alarm_presence', presence);

        // v7.2.0: Trigger intelligent flow card on presence detected
        if (presence === true) {
          const card = this._getFlowCard('radio_presence_detected');
          if (card) {
            card.trigger(this, {}, {}).catch(e => this.error('[HEALTH] Flow trigger failed:', e.message));
          }
        }
      }

      // 3. Track stabilize state for settings UI
      await this.setStoreValue('last_lqi', lqi).catch(() => {});
      await this.setStoreValue('last_rssi', rssi).catch(() => {});

      // v7.2.5: Calculate intelligent Radio Stability Score (0-100)
      this._updateRadioStability(lqi);

    } catch (e) {
      this.error('[HEALTH] Update error:', e.message);
    }
  },

  /**
   * v7.2.5: Calculate intelligent Radio Stability Score
   * v1.2.0: Fixed safeDivide usage, added _destroyed guard
   */
  _updateRadioStability(lqi) {
    if (this._destroyed) return;

    if (!this._lqiHistory) this._lqiHistory = [];
    this._lqiHistory.push(lqi);
    if (this._lqiHistory.length > 20) this._lqiHistory.shift();

    const count = this._lqiHistory.length;
    if (count === 0) return;

    // 1. Calculate Mean
    const mean = this._lqiHistory.reduce((a, b) => a + b, 0) / count;

    // 2. Calculate Variance
    const variance = this._lqiHistory.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / count;

    // 3. Score calculation
    const levelScore = (lqi / 255) * 100;
    const variancePenalty = Math.min(50, variance);

    let totalScore = Math.round(levelScore - variancePenalty);
    totalScore = Math.max(0, Math.min(100, totalScore));

    this.safeSetCapabilityValue('measure_radio_stability', totalScore).catch(() => {});
  },

  /**
   * Cleanup health monitor resources
   */
  _destroyZigbeeHealth() {
    if (this._healthTimer) {
      this.homey.clearInterval(this._healthTimer);
      this._healthTimer = null;
    }
    this._lqiHistory = null;
    this._radioInference = null;
  }

};

module.exports = ZigbeeHealthMixin;


