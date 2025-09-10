const BaseZigbeeDevice = require('../../../../common/BaseZigbeeDevice');
const { CLUSTER } = require('zigbee-clusters');

class SimpleSwitch extends BaseZigbeeDevice {
  async registerCapabilities() {
    this.registerCapability('onoff', CLUSTER.ON_OFF);
  }
}

module.exports = SimpleSwitch;
