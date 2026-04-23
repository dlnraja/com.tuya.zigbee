'use strict';
const { safeParse } = require('../../lib/utils/tuyaUtils.js');
const { ZigBeeDevice } = require('homey-zigbeedriver');
const { ensureManufacturerSettings } = require('../../lib/helpers/ManufacturerNameHelper');

class WaterValveGardenDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    // --- Attribute Reporting Configuration (auto-generated) ---
    try {
      await this.configureAttributeReporting([
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

    this.log('[VALVE-GARDEN] v5.9.21 init');
    ensureManufacturerSettings(this);
    const ep = zclNode?.endpoints?.[1];
    const onOff = ep?.clusters?.onOff;
    if (onOff) {
      onOff.on('attr.onOff', (v) => {
        this.log('[VALVE-GARDEN] onOff report: ' + v);
        this.setCapabilityValue('onoff', !!v).catch(this.error);
      });
    }
    this.registerCapabilityListener('onoff', async (value) => {
      this.log('[VALVE-GARDEN] Set valve: ' + value);
      if (onOff) { await (value ? onOff.setOn() : onOff.setOff()); }
    });
    const pwrCfg = ep?.clusters?.powerConfiguration;
    if (pwrCfg) {
      pwrCfg.on('attr.batteryPercentageRemaining', (v) => {
        const pct = Math.min(100, Math.round(v);
        this.log('[VALVE-GARDEN] battery: ' + pct + '%');
        this.setCapabilityValue('measure_battery', pct).catch(this.error);
      });
    }
    this.log('[VALVE-GARDEN] Ready');
  }


  async onDeleted() {
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
module.exports = WaterValveGardenDevice;

