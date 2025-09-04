const { ZigbeeDevice } = require('homey-zigbeedriver');
const { debug } = require('zigbee-clusters');

class WaterSensor extends ZigbeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('Water Sensor has been initialized');
  }

}

module.exports = WaterSensor;
