'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class TuyaComprehensiveAirMonitorDriver extends ZigBeeDriver {
  async onInit() {
    this.log('TuyaComprehensiveAirMonitorDriver v5.13.6 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    const conditionCards = [
      {
        id: 'air_quality_comprehensive_co2_above',
        fn: async (args) => {
          const co2 = args.device.getCapabilityValue('measure_co2');
          return co2 !== null && co2 > args.co2;
        }
      },
      {
        id: 'air_quality_comprehensive_temp_above',
        fn: async (args) => {
          const temp = args.device.getCapabilityValue('measure_temperature');
          return temp !== null && temp > args.temperature;
        }
      },
      {
        id: 'air_quality_comprehensive_humidity_above',
        fn: async (args) => {
          const hum = args.device.getCapabilityValue('measure_humidity');
          return hum !== null && hum > args.humidity;
        }
      }
    ];

    for (const { id, fn } of conditionCards) {
      try {
        const card = this.homey.flow.getConditionCard(id);
        if (card) {
          card.registerRunListener(async (args) => {
            if (!args.device) {return false;}
            return fn(args);
          });
        }
      } catch (err) {
        if (this.developerDebugMode) { this.error(`Condition card ${id} registration error: ${err.message}`); };
      }
    }
  }
}

module.exports = TuyaComprehensiveAirMonitorDriver;
