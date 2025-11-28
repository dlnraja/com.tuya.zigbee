'use strict';
const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');
class Device extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.log('blitzwolf_smart_plug initializing...');
    if (this.hasCapability('onoff')) { this.registerCapability('onoff', CLUSTER.ON_OFF); }
    this.log('blitzwolf_smart_plug initialized');
  }
}
module.exports = Device;
