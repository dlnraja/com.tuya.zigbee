const BaseZigbeeDevice = require('../../../../common/BaseZigbeeDevice');
const { Cluster, CLUSTER } = require("zigbee-clusters");

class RGBBulb extends BaseZigbeeDevice {
  async registerCapabilities() {
    this.registerCapability('onoff', CLUSTER.ON_OFF);
    this.registerCapability('dim', CLUSTER.LEVEL_CONTROL);
    this.registerCapability('light_hue', CLUSTER.COLOR_CONTROL);
    this.registerCapability('light_saturation', CLUSTER.COLOR_CONTROL);
  }
}

module.exports = RGBBulb;
