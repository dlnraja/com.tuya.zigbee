'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class TuyaComprehensiveAirMonitorDriver extends ZigBeeDriver {

  async onInit() {
    this.log('TuyaComprehensiveAirMonitorDriver initialized');
    try {
    this.homey.flow.getConditionCard('air_quality_comprehensive_co2_above').registerRunListener(async (args) => {
      return (args.device.getCapabilityValue('measure_co2') || 0) > args.co2;
    });
    this.homey.flow.getConditionCard('air_quality_comprehensive_temp_above').registerRunListener(async (args) => {
      return (args.device.getCapabilityValue('measure_temperature') || 0) > args.temperature;
    });
    this.homey.flow.getConditionCard('air_quality_comprehensive_humidity_above').registerRunListener(async (args) => {
      return (args.device.getCapabilityValue('measure_humidity') || 0) > args.humidity;
    });
    } catch (e) { this.log('Flow cards unavailable:', e.message); }
  }
}

module.exports = TuyaComprehensiveAirMonitorDriver;
