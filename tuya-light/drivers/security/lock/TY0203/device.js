const BaseZigbeeDevice = require('../../../../common/BaseZigbeeDevice');
const { Cluster, CLUSTER } = require("zigbee-clusters");

class SmartLock extends BaseZigbeeDevice {
  async registerCapabilities() {
    this.registerCapability('lock_state', CLUSTER.DOOR_LOCK);
  }
}

module.exports = SmartLock;
