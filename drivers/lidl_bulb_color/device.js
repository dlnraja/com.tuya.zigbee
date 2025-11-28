'use strict';

const { ZigBeeLightDevice } = require('homey-zigbeedriver');

class LidlBulbColorDevice extends ZigBeeLightDevice {
  async onNodeInit({ zclNode }) {
    this.log('Lidl Color Bulb initializing...');
    this._mainsPowered = true;
    await super.onNodeInit({ zclNode });
    this.log('Lidl Color Bulb initialized');
  }
}

module.exports = LidlBulbColorDevice;
