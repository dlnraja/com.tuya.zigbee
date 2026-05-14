'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class TuyaComprehensiveAirMonitorDriver extends ZigBeeDriver {
  async onInit() {
    this.log('TuyaComprehensiveAirMonitorDriver v5.13.6 initialized');
    
    // v5.13.6: Register condition cards to fix "getDeviceConditionCard is not a function" crash
    // Pattern from weather_station_outdoor, sensor_climate_contact, etc.
    
    // Condition: CO2 above
    (() => { try { return this.homey.flow.getConditionCard('air_quality_comprehensive_co2_above'); } catch(e) { return null; } })()?.registerRunListener(async (args) => {
      if (!args.device) return false;
      try {
        const co2 = await args.device.getCapabilityValue('measure_co2');
        return co2 !== null && co2 > args.co2;
      } catch (e) {
        this.log('[Condition] co2_above error:', e.message);
        return false;
      }
    });
    
    // Condition: Temperature above
    (() => { try { return this.homey.flow.getConditionCard('air_quality_comprehensive_temp_above'); } catch(e) { return null; } })()?.registerRunListener(async (args) => {
      if (!args.device) return false;
      try {
        const temp = await args.device.getCapabilityValue('measure_temperature');
        return temp !== null && temp > args.temperature;
      } catch (e) {
        this.log('[Condition] temp_above error:', e.message);
        return false;
      }
    });
    
    // Condition: Humidity above
    (() => { try { return this.homey.flow.getConditionCard('air_quality_comprehensive_humidity_above'); } catch(e) { return null; } })()?.registerRunListener(async (args) => {
      if (!args.device) return false;
      try {
        const hum = await args.device.getCapabilityValue('measure_humidity');
        return hum !== null && hum > args.humidity;
      } catch (e) {
        this.log('[Condition] humidity_above error:', e.message);
        return false;
      }
    });
  }
}

module.exports = TuyaComprehensiveAirMonitorDriver;
