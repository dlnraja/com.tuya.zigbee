'use strict';
const { safeParse } = require('../../lib/utils/tuyaUtils.js');

const ButtonDevice = require('../../lib/devices/ButtonDevice');

/**
 * v5.5.796: UNIVERSAL WIRELESS BUTTON DRIVER (Forum fix Cam)
 */
class UniversalWirelessButtonDevice extends ButtonDevice {

  async onNodeInit({ zclNode }) {
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
    } catch (err) {
      this.log('Attribute reporting config failed:', err.message);
    }

    this.log('[BUTTON-WIRELESS] Initializing...');

    this.buttonCount = await this._detectButtonCount(zclNode);
    if (!this.buttonCount || this.buttonCount < 1) {
      this.buttonCount = 1;
    }
    this.log(`[BUTTON-WIRELESS] Detected ${this.buttonCount} button(s)`);

    await super.onNodeInit({ zclNode });
    await this._forceInitialBatteryRead(zclNode);
  }

  async _forceInitialBatteryRead(zclNode) {
    try {
      const ep = zclNode?.endpoints?.[1];
      const powerCluster = ep?.clusters?.powerConfiguration || ep?.clusters?.genPowerCfg || ep?.clusters?.[1];
      
      if (powerCluster?.readAttributes) {
        this.log('[BUTTON-WIRELESS] Forcing initial battery read...');
        const attrs = await Promise.race([
          powerCluster.readAttributes(['batteryPercentageRemaining', 'batteryVoltage']),
          new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 2000))
        ]).catch(() => null);
        
        if (attrs?.batteryPercentageRemaining !== undefined && attrs.batteryPercentageRemaining !== 255) {
          const battery = Math.round(attrs.batteryPercentageRemaining);
          this.log(`[BUTTON-WIRELESS] Battery: ${battery}%`);
          if (this.hasCapability('measure_battery')) {
            await this._safeSetCapability('measure_battery', battery).catch(() => {});
          }
        }
      }
    } catch (e) {
      this.log(`[BUTTON-WIRELESS] Initial battery read failed: ${e.message}`);
    }
  }

  async _detectButtonCount(zclNode) {
    const settings = this.getSettings() || {};
    if (settings.button_count && settings.button_count !== 'auto') {
      return parseInt(settings.button_count);
    }

    let count = 0;
    for (let i = 1; i <= 8; i++) {
      const ep = zclNode.endpoints[i];
      if (ep?.clusters?.onOff || ep?.clusters?.scenes) {
        count++;
      }
    }
    return count || 1;
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    try {
      if (changedKeys.includes('button_count')) {
        this.buttonCount = newSettings.button_count === 'auto'
          ? await this._detectButtonCount(this.zclNode)
          : parseInt(newSettings.button_count);
      }
    } catch (err) {
      this.error('[BUTTON-WIRELESS] Failed to apply settings:', err.message);
    }
  }

  async onDeleted() {
    this.log('Device deleted');
  }

  async onEndDeviceAnnounce() {
    if (typeof this._updateLastSeen === 'function') this._updateLastSeen();
    if (this._dataRecoveryManager) this._dataRecoveryManager.triggerRecovery();
  }
}

module.exports = UniversalWirelessButtonDevice;
