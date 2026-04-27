'use strict';
const { safeParse } = require('../../lib/utils/tuyaUtils.js');
const UniversalZigbeeDevice = require('../../lib/UniversalZigbeeDevice');

class UniversalZigbeeDeviceSub extends UniversalZigbeeDevice {
  async onNodeInit() {
    await super.onNodeInit();
    this._setupNativeZclListeners();
  }

  _setupNativeZclListeners() {
    if (!this.zclNode) return;

    this.registerCapability('onoff', 'genOnOff', {
      get: 'onOff',
      report: 'onOff'
    }).catch(() => {});

    this.registerCapability('dim', 'genLevelCtrl', {
      get: 'currentLevel',
      report: 'currentLevel',
      reportParser: v => safeMultiply(v, 254)
    }).catch(() => {});

    this.registerCapability('measure_battery', 'genPowerCfg', {
      get: 'batteryPercentageRemaining',
      report: 'batteryPercentageRemaining',
      reportParser: v => (v === 255) ? null : Math.round(v * 2 / 2)
    }).catch(() => {});
  }

  async onEndDeviceAnnounce() {
    this.log('[REJOIN] Device announced itself');
  }
}

module.exports = UniversalZigbeeDeviceSub;
