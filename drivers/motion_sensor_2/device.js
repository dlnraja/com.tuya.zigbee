'use strict';
const { safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');
const { ZigBeeDevice } = require('homey-zigbeedriver');

class MotionSensor2Device extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('Motion Sensor 2 v5.9.12 Ready');

    try {
      await this.configureAttributeReporting([
        {
          cluster: 'msOccupancySensing',
          attributeName: 'occupancy',
          minInterval: 0,
          maxInterval: 300,
          minChange: 1,
        }
      ]).catch(this.error.bind(this));
    } catch (err) {
      this.error('Config error:', err.message);
    }
  }
}

module.exports = MotionSensor2Device;
