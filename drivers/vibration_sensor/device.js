'use strict';

const { UnifiedSensorBase } = require('../../lib/devices/UnifiedSensorBase');

/**
 * Vibration Sensor Device - v5.3.64 SIMPLIFIED
 */
class VibrationSensorDevice extends UnifiedSensorBase {

  get mainsPowered() { return false; }

  get sensorCapabilities() {
    return ['alarm_vibration', 'measure_temperature', 'alarm_tamper', 'measure_battery'];
  }

  get dpMappings() {
    return {
      1: { capability: 'alarm_vibration', transform: (v) => v === 1 || v === true },
      2: { capability: 'alarm_tamper', transform: (v) => v === 1 || v === true },
      4: { capability: 'measure_battery', divisor: 1 },
      15: { capability: 'measure_battery', divisor: 1 },
      18: { capability: 'measure_temperature', divisor: 10 },
      19: { capability: 'measure_temperature', divisor: 10 }
    };
  }

  async onNodeInit({ zclNode }) {
    // Vibration reset timer (configurable via settings, default 30s)
    this._vibrationResetMs = 30000;
    try {
      const settings = this.getSettings();
      if (settings && settings.vibration_reset_delay) {
        this._vibrationResetMs = settings.vibration_reset_delay * 1000;
      }
    } catch {}
    this._vibrationTimer = null;
    // --- Attribute Reporting Configuration (auto-generated) ---
    try {
      await this.configureAttributeReporting([
        {
          cluster: 'msTemperatureMeasurement',
          attributeName: 'measuredValue',
          minInterval: 30,
          maxInterval: 600,
          minChange: 50,
        },
        {
          cluster: 'genPowerCfg',
          attributeName: 'batteryPercentageRemaining',
          minInterval: 3600,
          maxInterval: 43200,
          minChange: 2,
        }
      ]);
      this.log('Attribute reporting configured successfully');
    } catch (err) {
      this.log('Attribute reporting config failed (device may not support it):', err.message);
    }

    if (this.hasCapability('alarm_generic.vibration')) {
      // A8: NaN Safety - use safeDivide/safeMultiply
  this.getCapabilityValue('alarm_generic.vibration');
      await this.removeCapability('alarm_generic.vibration').catch(() => {});
      if (!this.hasCapability('alarm_vibration')) await this.addCapability('alarm_vibration').catch(() => {});
      if (v != null) await this.setCapabilityValue('alarm_vibration', v).catch(() => {});
      this.log('[VIBRATION] Migrated alarm_generic.vibration  alarm_vibration');
    }
    await this.removeCapability('alarm_motion').catch(() => {});
    await this.removeCapability('alarm_generic').catch(() => {});
    if (!this.hasCapability('alarm_vibration')) await this.addCapability('alarm_vibration').catch(() => {});
    if (!this.hasCapability('measure_temperature')) await this.addCapability('measure_temperature').catch(() => {});

    await super.onNodeInit({ zclNode });
    this._registerCapabilityListeners(); // rule-12a injected

    // Auto-reset vibration alarm to idle after delay
    if (this.hasCapability('alarm_vibration')) {
      this.registerCapabilityListener('alarm_vibration', async (value) => {
        if (value === true) {
          if (this._vibrationTimer) clearTimeout(this._vibrationTimer);
          this._vibrationTimer = setTimeout(async () => {
            try {
              await this.setCapabilityValue('alarm_vibration', false);
              this.log('[VIBRATION] Auto-reset to idle after', this._vibrationResetMs, 'ms');
            } catch {}
          }, this._vibrationResetMs);
        }
      });
    }

    this.log('[VIBRATION]  Vibration sensor v7.5.8 ready (auto-reset:', this._vibrationResetMs, 'ms)');
  }


  async onSettings({ oldSettings, newSettings, changedKeys }) {
    if (changedKeys.includes('vibration_reset_delay')) {
      this._vibrationResetMs = (newSettings.vibration_reset_delay || 30) * 1000;
      this.log('[VIBRATION] Reset delay updated to', this._vibrationResetMs, 'ms');
    }
  }

  async onDeleted() {
    if (this._vibrationTimer) clearTimeout(this._vibrationTimer);
    this.log('Device deleted, cleaning up');
  }

  /**
   * v7.4.6: Refresh state when device announces itself (rejoin/wakeup)
   */
  async onEndDeviceAnnounce() {
    this.log('[REJOIN] Device announced itself, refreshing state...');
    if (typeof this._updateLastSeen === 'function') this._updateLastSeen();
    // Proactive data recovery if supported
    if (this._dataRecoveryManager) {
       this._dataRecoveryManager.triggerRecovery();
    }
  }
}

module.exports = VibrationSensorDevice;
