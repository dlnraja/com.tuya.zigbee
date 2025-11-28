'use strict';
const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');
class Device extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.log('moes_smart_knob initializing...');
    if (this.hasCapability('onoff')) { this.registerCapability('onoff', CLUSTER.ON_OFF); }
    this.log('moes_smart_knob initialized');
  }
}
module.exports = Device;
