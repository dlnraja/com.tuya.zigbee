'use strict';
const { HybridSensorBase } = require('../../lib/devices');

class WeatherStationOutdoorDevice extends HybridSensorBase {
  get mainsPowered() { return false; }
  get sensorCapabilities() { return ['measure_temperature', 'measure_humidity', 'measure_battery']; }
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[WEATHER] ✅ Ready');
  }
}
module.exports = WeatherStationOutdoorDevice;
