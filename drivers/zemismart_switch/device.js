'use strict';
const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');
class Device extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.log('zemismart_switch initializing...');
    if (this.hasCapability('onoff')) { this.registerCapability('onoff', CLUSTER.ON_OFF); }
    this.log('zemismart_switch initialized');
  }
}
module.exports = Device;
