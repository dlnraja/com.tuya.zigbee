const BaseZigbeeDevice = require('../../../../common/BaseZigbeeDevice');
const { Cluster, CLUSTER } = require("zigbee-clusters");

class AirQualitySensor extends BaseZigbeeDevice {
  async registerCapabilities() {
    this.registerCapability('measure_co2', CLUSTER.AIR_QUALITY);
    this.registerCapability('measure_tvoc', CLUSTER.AIR_QUALITY);
  }

module.exports = AirQualitySensor;
