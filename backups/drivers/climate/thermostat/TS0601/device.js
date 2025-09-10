const BaseZigbeeDevice = require('../../../../common/BaseZigbeeDevice');
const { CLUSTER } = require('zigbee-clusters');

class Thermostat extends BaseZigbeeDevice {
  async registerCapabilities() {
    this.registerCapability('target_temperature', CLUSTER.THERMOSTAT);
    this.registerCapability('measure_temperature', CLUSTER.TEMPERATURE_MEASUREMENT);
  }
}

module.exports = Thermostat;
