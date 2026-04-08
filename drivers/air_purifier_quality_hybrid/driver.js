'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.584: CRITICAL FIX - Flow card run listeners were missing
 */
class AirQualityCO2Driver extends ZigBeeDriver {
  /**
   * v7.0.12: Defensive getDeviceById override to prevent crashes during deserialization.
   * If a device cannot be found (e.g. removed while flow is triggering), return null instead of throwing.
   */
  getDeviceById(id) {
    try {
      return super.getDeviceById(id);
    } catch (err) {
      this.error(`[CRASH-PREVENTION] Could not get device by id: ${id} - ${err.message}`);
      return null;
    }
  }


  async onInit() {
    this.log('AirQualityCO2Driver v5.5.584 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // CONDITION: CO2 above
    try {
      (() => { try { return this.homey.flow.getDeviceConditionCard('air_quality_co2_co2_above'); } catch(e) { return null; } })()
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          const co2 = args.device.getCapabilityValue('measure_co2') || 0;
          return co2 > (args.co2 || 1000);
        });
      this.log('[FLOW] ✅ air_quality_co2_co2_above');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // CONDITION: CO2 below
    try {
      (() => { try { return this.homey.flow.getDeviceConditionCard('air_quality_co2_co2_below'); } catch(e) { return null; } })()
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          const co2 = args.device.getCapabilityValue('measure_co2') || 0;
          return co2 < (args.co2 || 1000);
        });
      this.log('[FLOW] ✅ air_quality_co2_co2_below');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // CONDITION: Air quality good
    try {
      (() => { try { return this.homey.flow.getDeviceConditionCard('air_quality_co2_air_quality_good'); } catch(e) { return null; } })()
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          const co2 = args.device.getCapabilityValue('measure_co2') || 0;
          return co2 < 1000; // Good air quality threshold
        });
      this.log('[FLOW] ✅ air_quality_co2_air_quality_good');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    this.log('[FLOW]  Air quality CO2 flow cards registered');
  }
}

module.exports = AirQualityCO2Driver;
