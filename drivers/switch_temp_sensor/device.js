'use strict';
const { safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');
const { ZigBeeDevice } = require('homey-zigbeedriver');

class SwitchTempSensorDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('Switch Temp Sensor v5.9.12 Ready');

    const ep = zclNode.endpoints[1];
    if (ep && ep.clusters.msTemperatureMeasurement) {
      ep.clusters.msTemperatureMeasurement.on('attr.measuredValue', (value) => {
        const temp = value / 100;
        this.setCapabilityValue('measure_temperature', temp).catch(() => {});
      });
    }
  }
}

module.exports = SwitchTempSensorDevice;
