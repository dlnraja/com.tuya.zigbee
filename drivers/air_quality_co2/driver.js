'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.584: CRITICAL FIX - Flow card run listeners were missing
 */
class AirQualityCO2Driver extends ZigBeeDriver {

  async onInit() {
    this.log('AirQualityCO2Driver v5.5.584 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    const conditionCards = [
      {
        id: 'air_quality_co2_co2_above',
        fn: async (args) => {
          const co2 = args.device.getCapabilityValue('measure_co2') || 0;
          return co2 > (args.co2 || 1000);
        }
      },
      {
        id: 'air_quality_co2_co2_below',
        fn: async (args) => {
          const co2 = args.device.getCapabilityValue('measure_co2') || 0;
          return co2 < (args.co2 || 1000);
        }
      },
      {
        id: 'air_quality_co2_air_quality_good',
        fn: async (args) => {
          const co2 = args.device.getCapabilityValue('measure_co2') || 0;
          return co2 < 1000;
        }
      }
    ];

    for (const { id, fn } of conditionCards) {
      try {
        const card = this.homey.flow.getConditionCard(id);
        if (card) {
          card.registerRunListener(async (args) => {
            if (!args.device) return false;
            return fn(args);
          });
        }
      } catch (err) {
        this.error(`Condition card ${id} registration error: ${err.message}`);
      }
    }

    this.log('[FLOW] Air quality CO2 flow cards registered');
  }
}

module.exports = AirQualityCO2Driver;
