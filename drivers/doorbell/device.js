'use strict';
const { UnifiedSensorBase } = require('../../lib/devices/UnifiedSensorBase');
const { boolean } = require('../../lib/converters/ValueConverterRegistry');

class DoorbellDevice extends UnifiedSensorBase {
  get mainsPowered() { return false; }
  get sensorCapabilities() { return ['alarm_generic', 'measure_battery', 'alarm_tamper']; }
  get dpMappings() {
    return {
      1: { capability: 'alarm_generic', transform: boolean() },
      4: { capability: 'alarm_tamper', transform: boolean() },
      15: { capability: 'measure_battery', divisor: 1 }
    };
  }
  async onNodeInit({ zclNode }) {
    // --- Attribute Reporting Configuration (auto-generated) ---
    try {
      await this.configureAttributeReporting([
        {
          cluster: 'ssIasZone',
          attributeName: 'zoneStatus',
          minInterval: 0,
          maxInterval: 3600,
          minChange: 1,
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

    await super.onNodeInit({ zclNode });
    this._registerCapabilityListeners(); // rule-12a injected

    // v9.0.88: Register doorbell button trigger flow card
    this.registerCapabilityListener('alarm_generic', async (value) => {
      if (value) {
        try {
          const card = this.homey.flow.getDeviceTriggerCard('doorbell_button_pressed');
          if (card) await card.trigger(this, {}).catch(() => {});
        } catch {}
      }
    });

    this.log('[DOORBELL]  Ready');
  }


  async onDeleted() {
    this._destroyed = true;
    await super.onDeleted();
    this.log('Device deleted, cleaning up');
  }

  /**
   * v7.4.6: Refresh state when device announces itself (rejoin/wakeup)
   */
  async onEndDeviceAnnounce() {
    this.log('[REJOIN] Device announced itself, refreshing state...');
    if (typeof this._updateLastSeen === 'function') {this._updateLastSeen();}
    // Proactive data recovery if supported
    if (this._dataRecoveryManager) {
       this._dataRecoveryManager?.forceRecovery?.();
    }
  }
}
module.exports = DoorbellDevice;
