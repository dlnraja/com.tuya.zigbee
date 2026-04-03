'use strict';
const { HybridSensorBase } = require('../../lib/devices/HybridSensorBase');

class WeatherStationOutdoorDevice extends HybridSensorBase {
  get mainsPowered() { return false; }
  get sensorCapabilities() { return ['measure_temperature', 'measure_humidity', 'measure_battery']; }
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[WEATHER] ✅ Weather Station Outdoor v5.8.31 Ready');
  }

  /**
   * v5.8.31: Override setCapabilityValue to fire flow trigger cards
   * Fixes: 4 trigger cards defined in compose but never fired
   */
  async setCapabilityValue(capability, value) {
    const prev = this.getCapabilityValue(capability);
    await super.setCapabilityValue(capability, value);
    if (prev === value) return;

    try {
      switch (capability) {
        case 'measure_temperature':
          this.homey.flow.getDeviceTriggerCard('weather_station_outdoor_outdoor_temperature_changed')
            .trigger(this, { temperature: value }, {}).catch(() => {});
          break;
        case 'measure_humidity':
          this.homey.flow.getDeviceTriggerCard('weather_station_outdoor_outdoor_humidity_changed')
            .trigger(this, { humidity: value }, {}).catch(() => {});
          break;
        case 'measure_pressure': {
          this.homey.flow.getDeviceTriggerCard('weather_station_outdoor_pressure_changed')
            .trigger(this, { pressure: value }, {}).catch(() => {});
          // Track pressure trend for condition cards
          if (prev != null && typeof prev === 'number') {
            const trend = value > prev ? 'rising' : value < prev ? 'falling' : 'stable';
            this.setStoreValue('pressure_trend', trend).catch(() => {});
          }
          break;
        }
        case 'measure_battery':
          if (value <= 15 && (prev === undefined || prev === null || prev > 15)) {
            this.homey.flow.getDeviceTriggerCard('weather_station_outdoor_weather_battery_low')
              .trigger(this, {}, {}).catch(() => {});
          }
          break;
      }
    } catch (e) { /* flow card may not exist */ }
  }
}
module.exports = WeatherStationOutdoorDevice;
