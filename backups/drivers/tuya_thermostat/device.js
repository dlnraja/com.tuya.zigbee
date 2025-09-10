const { ZigbeeDevice } = require('homey-zigbeedriver');
const { debug } = require('zigbee-clusters');

class Thermostat extends ZigbeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('Thermostat has been initialized');
  }

}

module.exports = Thermostat;
