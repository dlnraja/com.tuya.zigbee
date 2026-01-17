'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.581: CRITICAL FIX - Flow card run listeners were missing
 */
class WeatherStationOutdoorDriver extends ZigBeeDriver {

  async onInit() {
    this.log('WeatherStationOutdoorDriver v5.5.581 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // CONDITION: Outdoor temp above
    try {
      this.homey.flow.getConditionCard('weather_station_outdoor_outdoor_temp_above')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          const temp = args.device.getCapabilityValue('measure_temperature') || 0;
          return temp > (args.temperature || 20);
        });
      this.log('[FLOW] ✅ weather_station_outdoor_outdoor_temp_above');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // CONDITION: Outdoor temp below
    try {
      this.homey.flow.getConditionCard('weather_station_outdoor_outdoor_temp_below')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          const temp = args.device.getCapabilityValue('measure_temperature') || 0;
          return temp < (args.temperature || 5);
        });
      this.log('[FLOW] ✅ weather_station_outdoor_outdoor_temp_below');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // CONDITION: Pressure rising
    try {
      this.homey.flow.getConditionCard('weather_station_outdoor_pressure_rising')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          const trend = args.device.getStoreValue('pressure_trend') || 'stable';
          return trend === 'rising';
        });
      this.log('[FLOW] ✅ weather_station_outdoor_pressure_rising');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // CONDITION: Pressure falling
    try {
      this.homey.flow.getConditionCard('weather_station_outdoor_pressure_falling')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          const trend = args.device.getStoreValue('pressure_trend') || 'stable';
          return trend === 'falling';
        });
      this.log('[FLOW] ✅ weather_station_outdoor_pressure_falling');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    this.log('[FLOW] 🎉 Weather station flow cards registered');
  }
}

module.exports = WeatherStationOutdoorDriver;
