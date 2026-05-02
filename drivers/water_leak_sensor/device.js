'use strict';
const { safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');
const { ZigBeeDevice } = require('homey-zigbeedriver');

class WaterLeakSensorDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('Water Leak Sensor v5.9.12 Ready');

    const ep = zclNode.endpoints[1];
    if (ep && ep.clusters.ssIasZone) {
      ep.clusters.ssIasZone.on('attr.zoneStatus', (value) => {
        const alarm = (value & 1) === 1;
        this.setCapabilityValue('alarm_water', alarm).catch(() => {});
      });
    }
  }
}

module.exports = WaterLeakSensorDevice;
